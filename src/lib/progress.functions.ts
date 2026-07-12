import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WeekPoint = { week: string; value: number };
export type MuscleRow = { name: string; primary: number; secondary: number };
export type HistorySet = { n: number; reps: number; load: string };
export type HistoryExercise = {
  name: string;
  done: number;
  total: number;
  sets: HistorySet[];
};
export type HistoryItem = {
  id: string;
  weekday: string;
  date: string;
  name: string;
  personal: string;
  fase: string;
  exercises: number;
  seriesDone: number;
  seriesTotal: number;
  minutes: number;
  week: number;
  totalReps: number;
  volume: string;
  reaction: string | null;
  exerciseList: HistoryExercise[];
};

export type ProgressResult = {
  volume: WeekPoint[];
  frequency: WeekPoint[];
  muscles: MuscleRow[];
  history: HistoryItem[];
};

function isoWeek(d: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round((diff - ((firstThursday.getUTCDay() + 6) % 7) + 3) / 7);
  return { year: target.getUTCFullYear(), week };
}

function weekKey(y: number, w: number) {
  return `${y}-${String(w).padStart(2, "0")}`;
}

function weekdayShortPt(d: Date) {
  const arr = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
  return arr[d.getDay()];
}

function ddmm(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const getMyProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProgressResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Build last 5 ISO week buckets ending on the current week
    const now = new Date();
    const buckets: { key: string; label: string; year: number; week: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const ref = new Date(now);
      ref.setDate(now.getDate() - i * 7);
      const { year, week } = isoWeek(ref);
      buckets.push({ key: weekKey(year, week), label: `S${week}`, year, week });
    }
    const oldest = new Date(now);
    oldest.setDate(now.getDate() - 4 * 7 - 6);
    oldest.setHours(0, 0, 0, 0);

    // Sessions in the last 5 weeks (for volume + frequency + history head)
    const { data: sessions } = await supabaseAdmin
      .from("workout_sessions")
      .select("id, student_workout_id, finished_at, duration_seconds, status")
      .eq("aluno_user_id", userId)
      .eq("status", "concluido")
      .gte("finished_at", oldest.toISOString())
      .order("finished_at", { ascending: false });

    const sessionList = sessions ?? [];
    const sessionIds = sessionList.map((s) => s.id);

    // Set logs for those sessions (volume + muscles + history detail)
    const { data: setLogs } = sessionIds.length
      ? await supabaseAdmin
          .from("set_logs")
          .select("id, session_id, exercise_id, template_exercise_id, set_index, reps, load, completed_at")
          .in("session_id", sessionIds)
      : { data: [] as any[] };

    const logs = setLogs ?? [];

    // Bucket volume + frequency per week key
    const volMap = new Map<string, number>();
    const freqMap = new Map<string, Set<string>>();
    for (const b of buckets) {
      volMap.set(b.key, 0);
      freqMap.set(b.key, new Set());
    }
    for (const s of sessionList) {
      if (!s.finished_at) continue;
      const { year, week } = isoWeek(new Date(s.finished_at));
      const k = weekKey(year, week);
      if (!freqMap.has(k)) continue;
      freqMap.get(k)!.add(s.id);
    }
    for (const l of logs) {
      const s = sessionList.find((x) => x.id === l.session_id);
      if (!s?.finished_at) continue;
      const { year, week } = isoWeek(new Date(s.finished_at));
      const k = weekKey(year, week);
      if (!volMap.has(k)) continue;
      const load = Number(l.load ?? 0);
      const reps = Number(l.reps ?? 0);
      if (load > 0 && reps > 0 && l.completed_at) {
        volMap.set(k, (volMap.get(k) ?? 0) + load * reps);
      }
    }
    const volume: WeekPoint[] = buckets.map((b) => ({ week: b.label, value: Math.round(volMap.get(b.key) ?? 0) }));
    const frequency: WeekPoint[] = buckets.map((b) => ({ week: b.label, value: freqMap.get(b.key)?.size ?? 0 }));

    // Exercises (for muscles + names)
    const exerciseIds = Array.from(new Set(logs.map((l) => l.exercise_id).filter((v) => v != null))) as number[];
    const { data: exercises } = exerciseIds.length
      ? await supabaseAdmin
          .from("exercises")
          .select("id, name, muscles_primary, muscles_secondary")
          .in("id", exerciseIds)
      : { data: [] as any[] };
    const exMap = new Map<number, any>((exercises ?? []).map((e: any) => [e.id, e]));

    // Muscle aggregation — count completed sets per muscle
    const muscleAgg = new Map<string, { primary: number; secondary: number }>();
    for (const l of logs) {
      if (!l.completed_at) continue;
      const ex = exMap.get(l.exercise_id as number);
      if (!ex) continue;
      for (const m of (ex.muscles_primary ?? []) as string[]) {
        const cur = muscleAgg.get(m) ?? { primary: 0, secondary: 0 };
        cur.primary += 1;
        muscleAgg.set(m, cur);
      }
      for (const m of (ex.muscles_secondary ?? []) as string[]) {
        const cur = muscleAgg.get(m) ?? { primary: 0, secondary: 0 };
        cur.secondary += 1;
        muscleAgg.set(m, cur);
      }
    }
    const muscles: MuscleRow[] = Array.from(muscleAgg.entries())
      .map(([name, v]) => ({ name, primary: v.primary, secondary: v.secondary }))
      .sort((a, b) => b.primary + b.secondary - (a.primary + a.secondary));

    // Student workouts + templates for names/plans
    const swIds = Array.from(new Set(sessionList.map((s) => s.student_workout_id).filter(Boolean))) as string[];
    const { data: sws } = swIds.length
      ? await supabaseAdmin
          .from("student_workouts")
          .select("id, name, template_id")
          .in("id", swIds)
      : { data: [] as any[] };
    const swMap = new Map<string, any>((sws ?? []).map((s: any) => [s.id, s]));
    const templateIds = Array.from(new Set((sws ?? []).map((s: any) => s.template_id).filter(Boolean))) as string[];
    const { data: templates } = templateIds.length
      ? await supabaseAdmin.from("workout_templates").select("id, name").in("id", templateIds)
      : { data: [] as any[] };
    const tplMap = new Map<string, any>((templates ?? []).map((t: any) => [t.id, t]));

    // Prescribed sets by template for seriesTotal
    const { data: tplExs } = templateIds.length
      ? await supabaseAdmin
          .from("workout_template_exercises")
          .select("id, template_id, exercise_id, sets, session_position")
          .in("template_id", templateIds)
      : { data: [] as any[] };
    const tplExList = tplExs ?? [];

    // Group logs per session
    const logsBySession = new Map<string, any[]>();
    for (const l of logs) {
      const arr = logsBySession.get(l.session_id as string) ?? [];
      arr.push(l);
      logsBySession.set(l.session_id as string, arr);
    }

    const history: HistoryItem[] = sessionList.slice(0, 20).map((s) => {
      const sw = s.student_workout_id ? swMap.get(s.student_workout_id) : null;
      const tpl = sw?.template_id ? tplMap.get(sw.template_id) : null;
      const finished = s.finished_at ? new Date(s.finished_at) : new Date();
      const sLogs = logsBySession.get(s.id) ?? [];

      // Group logs by exercise (keep first occurrence order)
      const perEx = new Map<number, any[]>();
      const exOrder: number[] = [];
      for (const l of sLogs) {
        const eid = l.exercise_id as number;
        if (eid == null) continue;
        if (!perEx.has(eid)) {
          perEx.set(eid, []);
          exOrder.push(eid);
        }
        perEx.get(eid)!.push(l);
      }

      const exerciseList: HistoryExercise[] = exOrder.map((eid) => {
        const setsForEx = (perEx.get(eid) ?? []).sort(
          (a, b) => (a.set_index ?? 0) - (b.set_index ?? 0),
        );
        const done = setsForEx.filter((x) => x.completed_at).length;
        // total prescribed from first matching template exercise row
        const firstLog = setsForEx[0];
        let total = setsForEx.length;
        if (firstLog?.template_exercise_id) {
          const tRow = tplExList.find((t: any) => t.id === firstLog.template_exercise_id);
          if (tRow?.sets) total = tRow.sets;
        }
        const ex = exMap.get(eid);
        return {
          name: ex?.name ?? "Exercício",
          done,
          total,
          sets: setsForEx.map((x, i) => ({
            n: (x.set_index ?? i) + (x.set_index != null ? 0 : 1),
            reps: Number(x.reps ?? 0),
            load: x.load != null ? String(x.load) : "-",
          })),
        };
      });

      const seriesDone = sLogs.filter((l) => l.completed_at).length;
      const seriesTotal = exerciseList.reduce((sum, e) => sum + e.total, 0) || seriesDone;
      const totalReps = sLogs.reduce(
        (sum, l) => sum + (l.completed_at ? Number(l.reps ?? 0) : 0),
        0,
      );
      const volumeKg = sLogs.reduce((sum, l) => {
        const load = Number(l.load ?? 0);
        const reps = Number(l.reps ?? 0);
        return l.completed_at && load > 0 && reps > 0 ? sum + load * reps : sum;
      }, 0);
      const minutes = Math.max(0, Math.round((s.duration_seconds ?? 0) / 60));
      const { week } = isoWeek(finished);

      return {
        id: s.id,
        weekday: weekdayShortPt(finished),
        date: ddmm(finished),
        name: sw?.name ?? "Treino",
        personal: tpl?.name ?? "—",
        fase: "—",
        exercises: exerciseList.length,
        seriesDone,
        seriesTotal,
        minutes,
        week,
        totalReps,
        volume: volumeKg > 0 ? `${Math.round(volumeKg)} kg` : "—",
        reaction: null,
        exerciseList,
      };
    });

    return { volume, frequency, muscles, history };
  });
