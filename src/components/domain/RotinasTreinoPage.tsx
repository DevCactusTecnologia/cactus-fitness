import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Calendar, Clock, CheckCircle2, X, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { initialsFromName } from "@/lib/auth";
import { colorForId } from "@/lib/avatar-color";
import type { Scope } from "@/lib/scope";

type PeriodKey = "hoje" | "7dias" | "30dias" | "custom";

type SessionRow = {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  status: string;
  aluno_id: string;
  aluno_name: string;
  sw_name: string | null;
  template_name: string | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmtDateBr(d: Date) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fmtDateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function fmtDuration(sec: number | null) {
  if (!sec || sec <= 0) return "0s";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RotinasTreinoPage({ scope }: { scope: Scope }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>("7dias");
  const today = startOfDay(new Date());
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 6);
  const [customFrom, setCustomFrom] = useState<string>(fmtDateInput(defaultFrom));
  const [customTo, setCustomTo] = useState<string>(fmtDateInput(today));
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (period === "hoje") return { from: startOfDay(now), to: endOfDay(now) };
    if (period === "7dias") {
      const f = startOfDay(now);
      f.setDate(f.getDate() - 6);
      return { from: f, to: endOfDay(now) };
    }
    if (period === "30dias") {
      const f = startOfDay(now);
      f.setDate(f.getDate() - 29);
      return { from: f, to: endOfDay(now) };
    }
    return {
      from: startOfDay(new Date(customFrom + "T00:00:00")),
      to: endOfDay(new Date(customTo + "T00:00:00")),
    };
  }, [period, customFrom, customTo]);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["rotinas-treino", scope, from.toISOString(), to.toISOString()],
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          "id, started_at, duration_seconds, status, student_workouts!inner(name, aluno_id, workout_templates(name), alunos!inner(id, full_name))",
        )
        .eq("status", "concluido")
        .gte("started_at", from.toISOString())
        .lte("started_at", to.toISOString())
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        started_at: r.started_at,
        duration_seconds: r.duration_seconds,
        status: r.status,
        aluno_id: r.student_workouts?.alunos?.id,
        aluno_name: r.student_workouts?.alunos?.full_name ?? "Aluno",
        sw_name: r.student_workouts?.name ?? null,
        template_name: r.student_workouts?.workout_templates?.name ?? null,
      })).filter((r) => r.aluno_id) as SessionRow[];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { aluno_id: string; aluno_name: string; count: number }>();
    for (const s of sessions) {
      const existing = map.get(s.aluno_id);
      if (existing) existing.count += 1;
      else map.set(s.aluno_id, { aluno_id: s.aluno_id, aluno_name: s.aluno_name, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [sessions]);

  const selectedSessions = useMemo(
    () => sessions.filter((s) => s.aluno_id === selectedAlunoId),
    [sessions, selectedAlunoId],
  );
  const selectedAluno = grouped.find((a) => a.aluno_id === selectedAlunoId) ?? null;

  const backTo = scope === "academia" ? "/dashboard/academia/alunos" : "/dashboard/personal/alunos";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail scope={scope} />
      <main className="pb-24 md:ml-[72px] md:pb-0">
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate({ to: backTo })}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Voltar</span>
              </button>
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  Rotinas de Treino
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Quem treinou no período e com que frequência
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 md:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["hoje", "Hoje"],
                  ["7dias", "7 dias"],
                  ["30dias", "30 dias"],
                  ["custom", "Personalizado"],
                ] as [PeriodKey, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPeriod(k)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${
                    period === k
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {period === "custom" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                />
                <span className="text-sm text-muted-foreground">até</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Período</span>
                <span className="font-medium">
                  {fmtDateBr(from)} – {fmtDateBr(to)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums">{sessions.length}</span>
                <span className="text-sm text-muted-foreground">
                  {sessions.length === 1 ? "treino executado" : "treinos executados"}
                </span>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div>Aluno</div>
                <div>Treinos</div>
              </div>
              {isLoading ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </div>
              ) : grouped.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <Activity className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Nenhum treino executado no período.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {grouped.map((a) => {
                    const initials = initialsFromName(a.aluno_name);
                    const color = colorForId(a.aluno_id);
                    return (
                      <li key={a.aluno_id}>
                        <button
                          type="button"
                          onClick={() => setSelectedAlunoId(a.aluno_id)}
                          className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 text-left transition hover:bg-accent"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: color }}
                            >
                              {initials}
                            </div>
                            <span className="truncate text-sm font-medium">{a.aluno_name}</span>
                          </div>
                          <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary tabular-nums">
                            {a.count}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>

      {selectedAluno && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setSelectedAlunoId(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-11 w-11 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: colorForId(selectedAluno.aluno_id) }}
                >
                  {initialsFromName(selectedAluno.aluno_name)}
                </div>
                <div>
                  <div className="font-semibold">{selectedAluno.aluno_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedAluno.count} {selectedAluno.count === 1 ? "treino" : "treinos"} no período
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlunoId(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {selectedSessions.map((s) => (
                <li key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{s.sw_name ?? "Treino"}</div>
                      {s.template_name && (
                        <div className="truncate text-xs text-muted-foreground">
                          {s.template_name}
                        </div>
                      )}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" /> concluído
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {fmtDateTime(s.started_at)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {fmtDuration(s.duration_seconds)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <MobileBottomNav scope={scope} />
    </div>
  );
}
