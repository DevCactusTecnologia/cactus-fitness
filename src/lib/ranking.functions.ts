import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RankingPlayer = {
  userId: string | null;
  alunoId: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  isYou: boolean;
};

export type RankingResult = {
  players: RankingPlayer[];
  weekStart: string;
  weekEnd: string;
  totalInGroup: number;
  youRank: number | null;
  youPoints: number;
  scope: "academia" | "personal" | "none";
  orgName: string | null;
};

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getWeekRange(ref = new Date()) {
  const jsDay = ref.getDay();
  const todayIdx = (jsDay + 6) % 7; // 0 = seg
  const monday = new Date(ref);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(ref.getDate() - todayIdx);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

const POINTS_TREINO = 30;
const POINTS_CHECKIN = 5;
const MIN_DURATION_SECONDS = 30 * 60;

export const getMyRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RankingResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Descobre o vínculo do aluno logado (organization_id + personal_id)
    const { data: meAluno } = await supabaseAdmin
      .from("alunos")
      .select("id, organization_id, personal_id")
      .eq("aluno_user_id", userId)
      .maybeSingle();

    const { monday, sunday } = getWeekRange();
    const weekStart = isoDate(monday);
    const weekEnd = isoDate(sunday);

    if (!meAluno?.organization_id) {
      return {
        players: [],
        weekStart,
        weekEnd,
        totalInGroup: 0,
        youRank: null,
        youPoints: 0,
        scope: "none",
        orgName: null,
      };
    }

    // Nome da organização
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", meAluno.organization_id)
      .maybeSingle();

    // Lista alunos ativos da organização (limite de 20 do grupo)
    const { data: alunos } = await supabaseAdmin
      .from("alunos")
      .select("id, aluno_user_id, full_name")
      .eq("organization_id", meAluno.organization_id)
      .eq("is_active", true)
      .not("aluno_user_id", "is", null);

    const list = alunos ?? [];
    const userIds = list.map((a) => a.aluno_user_id).filter(Boolean) as string[];

    // Profiles p/ avatar
    const { data: profiles } = userIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, avatar_url, full_name")
          .in("id", userIds)
      : { data: [] as any[] };
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    // Sessões concluídas na semana (>= 30min)
    const { data: sessions } = userIds.length
      ? await supabaseAdmin
          .from("workout_sessions")
          .select("aluno_user_id, duration_seconds, finished_at, status")
          .in("aluno_user_id", userIds)
          .eq("status", "concluido")
          .gte("finished_at", monday.toISOString())
          .lte("finished_at", sunday.toISOString())
      : { data: [] as any[] };

    const sessionPoints = new Map<string, number>();
    for (const s of sessions ?? []) {
      if ((s.duration_seconds ?? 0) < MIN_DURATION_SECONDS) continue;
      const uid = s.aluno_user_id as string;
      sessionPoints.set(uid, (sessionPoints.get(uid) ?? 0) + POINTS_TREINO);
    }

    // Check-ins da semana
    const { data: checkins } = userIds.length
      ? await supabaseAdmin
          .from("aluno_check_ins")
          .select("user_id, check_in_date")
          .in("user_id", userIds)
          .gte("check_in_date", weekStart)
          .lte("check_in_date", weekEnd)
      : { data: [] as any[] };

    const checkInPoints = new Map<string, number>();
    for (const c of checkins ?? []) {
      const uid = c.user_id as string;
      checkInPoints.set(uid, (checkInPoints.get(uid) ?? 0) + POINTS_CHECKIN);
    }

    // Monta jogadores
    const players: RankingPlayer[] = list.map((a) => {
      const uid = a.aluno_user_id as string;
      const profile = profileMap.get(uid) as any;
      const points = (sessionPoints.get(uid) ?? 0) + (checkInPoints.get(uid) ?? 0);
      return {
        userId: uid,
        alunoId: a.id,
        name: profile?.full_name || a.full_name || "Aluno",
        avatarUrl: profile?.avatar_url ?? null,
        points,
        isYou: uid === userId,
      };
    });

    // Ordena por pontos desc, depois nome asc
    players.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name, "pt-BR");
    });

    const limited = players.slice(0, 20);
    const youIndex = limited.findIndex((p) => p.isYou);
    const youRank = youIndex >= 0 ? youIndex + 1 : null;
    const youPoints = limited[youIndex]?.points ?? 0;

    return {
      players: limited,
      weekStart,
      weekEnd,
      totalInGroup: limited.length,
      youRank,
      youPoints,
      scope: "academia",
      orgName: org?.name ?? null,
    };
  });
