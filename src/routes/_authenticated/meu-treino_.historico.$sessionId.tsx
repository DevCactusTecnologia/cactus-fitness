import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Dumbbell, Trophy, Check } from "lucide-react";
import { AlunoShell } from "@/components/AlunoShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/meu-treino_/historico/$sessionId")({
  head: () => ({
    meta: [
      { title: "Detalhes do treino · cactusfitness" },
      { name: "description", content: "Detalhes da sessão de treino concluída." },
    ],
  }),
  component: HistoricoPage,
});

type SetRow = {
  id: string;
  exercise_id: number | null;
  template_exercise_id: string | null;
  set_index: number;
  reps: string | null;
  load: string | null;
  rpe: number | null;
  completed_at: string | null;
};

type ExerciseGroup = {
  key: string;
  name: string;
  sets: SetRow[];
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

function HistoricoPage() {
  const { sessionId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [workoutName, setWorkoutName] = useState<string>("Treino");
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: sess } = await supabase
        .from("workout_sessions")
        .select("id, student_workout_id, started_at, finished_at, duration_seconds, status, notes, rpe")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled || !sess) { setLoading(false); return; }
      setSession(sess);
      const { data: sw } = await supabase
        .from("student_workouts")
        .select("name, template_id")
        .eq("id", sess.student_workout_id)
        .maybeSingle();
      if (sw?.name) setWorkoutName(sw.name);
      const { data: logs } = await supabase
        .from("set_logs")
        .select("id, exercise_id, template_exercise_id, set_index, reps, load, rpe, completed_at")
        .eq("session_id", sessionId)
        .order("set_index", { ascending: true });
      const list = (logs ?? []) as SetRow[];
      const exIds = Array.from(new Set(list.map((l) => l.exercise_id).filter(Boolean))) as number[];
      const nameById: Record<number, string> = {};
      if (exIds.length) {
        const { data: exs } = await supabase.from("exercises").select("id, name").in("id", exIds);
        (exs ?? []).forEach((e: any) => { nameById[e.id] = e.name; });
      }
      const map = new Map<string, ExerciseGroup>();
      for (const l of list) {
        const key = String(l.template_exercise_id ?? l.exercise_id ?? l.id);
        const name = l.exercise_id ? (nameById[l.exercise_id] ?? "Exercício") : "Exercício";
        const g = map.get(key) ?? { key, name, sets: [] };
        g.sets.push(l);
        map.set(key, g);
      }
      if (!cancelled) { setGroups(Array.from(map.values())); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const durationMin = session?.duration_seconds ? Math.round(session.duration_seconds / 60) : null;
  const totalSets = groups.reduce((acc, g) => acc + g.sets.length, 0);

  return (
    <AlunoShell>
      <main className="p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-3">
            <Link
              to="/treinos"
              className="grid h-9 w-9 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-2"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-bold">Detalhes do treino</h1>
            </div>
          </div>

          {/* Resumo */}
          <section className="rounded-xl border border-border bg-surface-1 p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-bold">{workoutName}</h2>
                <p className="mt-0.5 text-xs text-fg-muted">{formatDate(session?.finished_at ?? session?.started_at ?? null)}</p>
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green-500/10">
                <Trophy className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">
                <Check className="h-3.5 w-3.5 text-green-500" /> Concluído
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">
                <Dumbbell className="h-3.5 w-3.5" /> {totalSets} série{totalSets === 1 ? "" : "s"}
              </span>
              {durationMin != null && (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">
                  <Clock className="h-3.5 w-3.5" /> {durationMin} min
                </span>
              )}
            </div>
          </section>

          {/* Exercícios */}
          <div>
            <h3 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">Exercícios</h3>
            {loading ? (
              <div className="rounded-xl border border-border bg-surface-1 p-6 text-center text-sm text-fg-muted">Carregando...</div>
            ) : groups.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface-1 p-6 text-center text-sm text-fg-muted">
                Nenhum exercício registrado nesta sessão.
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.key} className="rounded-xl border border-border bg-surface-1 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="truncate text-sm font-bold">{g.name}</h4>
                      <span className="shrink-0 text-xs text-fg-muted">{g.sets.length} série{g.sets.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="space-y-1.5">
                      {g.sets.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 rounded-lg bg-surface-2/50 px-3 py-2 text-xs">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-3 font-semibold text-foreground">
                            {s.set_index + 1}
                          </span>
                          <span className="flex-1 truncate text-fg-muted">
                            {s.reps ? `${s.reps} reps` : "—"}
                            {s.load ? ` · ${s.load}` : ""}
                            {s.rpe != null ? ` · RPE ${s.rpe}` : ""}
                          </span>
                          {s.completed_at && <Check className="h-3.5 w-3.5 shrink-0 text-green-500" strokeWidth={3} />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </AlunoShell>
  );
}
