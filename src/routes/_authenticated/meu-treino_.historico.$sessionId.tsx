import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Dumbbell, Clock } from "lucide-react";
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

type SetLog = {
  id: string;
  exercise_id: number | null;
  template_exercise_id: string | null;
  set_index: number;
  reps: string | null;
  load: string | null;
  rpe: number | null;
  is_extra: boolean | null;
  completed_at: string | null;
};

type TemplateExercise = {
  id: string;
  position: number;
  sets: number;
  session_position: number | null;
  session_label: string | null;
  exercise: { id: number; name: string } | null;
};

type ExerciseBlock = {
  key: string;
  name: string;
  plannedSets: number;
  doneSets: number;
  rows: { idx: number; reps: string; load: string; done: boolean }[];
};

const WEEKDAY = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

function pad(n: number) { return n.toString().padStart(2, "0"); }
function fmtWeekdayDay(iso: string | null) {
  if (!iso) return { wd: "—", dm: "--/--" };
  const d = new Date(iso);
  return { wd: WEEKDAY[d.getDay()], dm: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` };
}
function isoWeekNum(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diff - ((firstThursday.getUTCDay() + 6) % 7) + 3) / 7);
}

function HistoricoPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [workoutName, setWorkoutName] = useState<string>("Treino");
  const [planName, setPlanName] = useState<string>("");
  const [sessionLabel, setSessionLabel] = useState<string>("");
  const [weekLabel] = useState<string>("Sem. 1");
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [totals, setTotals] = useState<{ plannedSets: number; doneSets: number; reps: number; volume: number | null }>({
    plannedSets: 0, doneSets: 0, reps: 0, volume: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: sess } = await supabase
        .from("workout_sessions")
        .select("id, student_workout_id, started_at, finished_at, duration_seconds, status")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled || !sess) { setLoading(false); return; }
      setSession(sess);

      const { data: sw } = await supabase
        .from("student_workouts")
        .select("name, template_id")
        .eq("id", sess.student_workout_id)
        .maybeSingle();
      if (sw?.name) {
        setWorkoutName(sw.name);
        setPlanName(String(sw.name).split(" - ")[0] || "");
      }

      const { data: logs } = await supabase
        .from("set_logs")
        .select("id, exercise_id, template_exercise_id, set_index, reps, load, rpe, is_extra, completed_at")
        .eq("session_id", sessionId)
        .order("set_index", { ascending: true });
      const logList = (logs ?? []) as SetLog[];

      let tExs: TemplateExercise[] = [];
      if (sw?.template_id) {
        const { data: exs } = await supabase
          .from("workout_template_exercises")
          .select("id, position, sets, session_position, session_label, exercise:exercises(id, name)")
          .eq("template_id", sw.template_id)
          .order("position", { ascending: true });
        tExs = (exs ?? []) as any as TemplateExercise[];
      }

      // Descobrir a sessão (session_position) mais usada nesta workout session
      const teIds = new Set(logList.map((l) => l.template_exercise_id).filter(Boolean) as string[]);
      const teById: Record<string, TemplateExercise> = {};
      tExs.forEach((t) => { teById[t.id] = t; });
      let sp: number | null = null;
      for (const id of teIds) {
        const t = teById[id];
        if (t?.session_position != null) { sp = t.session_position; break; }
      }
      const filtered = sp != null
        ? tExs.filter((t) => (t.session_position ?? 0) === sp)
        : tExs.filter((t) => teIds.has(t.id));
      if (sp != null) {
        const label = tExs.find((t) => t.session_position === sp && t.session_label)?.session_label ?? "";
        if (label) setSessionLabel(label);
      }

      // Exercícios sem template mas com logs
      const orphanIds = Array.from(teIds).filter((id) => !teById[id]);
      const extraNameById: Record<number, string> = {};
      const orphanExerciseIds = Array.from(new Set(
        logList.filter((l) => !l.template_exercise_id && l.exercise_id).map((l) => l.exercise_id as number)
      ));
      if (orphanExerciseIds.length) {
        const { data: exs } = await supabase.from("exercises").select("id, name").in("id", orphanExerciseIds);
        (exs ?? []).forEach((e: any) => { extraNameById[e.id] = e.name; });
      }

      const built: ExerciseBlock[] = [];
      let totalPlanned = 0, totalDone = 0, totalReps = 0, totalVolume = 0, volumeHasValue = false;

      for (const t of filtered) {
        const exLogs = logList.filter((l) => l.template_exercise_id === t.id);
        const planned = t.sets ?? 0;
        const maxIdx = Math.max(planned, ...exLogs.map((l) => l.set_index + 1));
        const rows: ExerciseBlock["rows"] = [];
        let done = 0;
        for (let i = 0; i < maxIdx; i++) {
          const log = exLogs.find((l) => l.set_index === i);
          const reps = log?.reps ?? "";
          const load = log?.load ?? "";
          const isDone = !!log;
          if (isDone) {
            done += 1;
            const r = Number(log?.reps ?? 0);
            const l = Number(log?.load ?? 0);
            if (!isNaN(r)) totalReps += r;
            if (!isNaN(l) && l > 0 && !isNaN(r)) { totalVolume += l * r; volumeHasValue = true; }
          }
          rows.push({ idx: i + 1, reps: reps || "-", load: load || "-", done: isDone });
        }
        totalPlanned += Math.max(planned, done);
        totalDone += done;
        built.push({
          key: t.id,
          name: t.exercise?.name ?? "Exercício",
          plannedSets: Math.max(planned, done),
          doneSets: done,
          rows,
        });
      }

      // Orphans (log sem template_exercise correspondente)
      const grouped: Record<string, SetLog[]> = {};
      logList.filter((l) => !teById[l.template_exercise_id ?? ""]).forEach((l) => {
        const k = l.template_exercise_id ?? `ex_${l.exercise_id}`;
        (grouped[k] ??= []).push(l);
      });
      Object.entries(grouped).forEach(([k, arr]) => {
        const name = arr[0]?.exercise_id ? (extraNameById[arr[0].exercise_id] ?? "Exercício") : "Exercício";
        const done = arr.length;
        const rows = arr.sort((a, b) => a.set_index - b.set_index).map((l) => {
          const r = Number(l.reps ?? 0);
          const ld = Number(l.load ?? 0);
          if (!isNaN(r)) totalReps += r;
          if (!isNaN(ld) && ld > 0 && !isNaN(r)) { totalVolume += ld * r; volumeHasValue = true; }
          return { idx: l.set_index + 1, reps: l.reps || "-", load: l.load || "-", done: true };
        });
        totalPlanned += done; totalDone += done;
        built.push({ key: k, name, plannedSets: done, doneSets: done, rows });
      });

      // Se não deu para inferir por template, use ids únicos dos logs
      void orphanIds;

      if (!cancelled) {
        setBlocks(built);
        setTotals({
          plannedSets: totalPlanned,
          doneSets: totalDone,
          reps: totalReps,
          volume: volumeHasValue ? totalVolume : null,
        });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const { wd, dm } = fmtWeekdayDay(session?.finished_at ?? session?.started_at ?? null);
  const durationMin = session?.duration_seconds ? Math.round(session.duration_seconds / 60) : null;
  const exCount = blocks.length;
  const displayName = sessionLabel || workoutName;

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-background/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/treinos" })}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-2"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted">Detalhes do treino</p>
            <h1 className="truncate font-display text-base font-bold">{displayName}</h1>
          </div>
          <div className="h-9 w-9" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-8">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-lg border border-border bg-surface-1">
            <div className="flex w-full items-center gap-3 p-3 text-left">
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-surface-2/40">
                <span className="text-[0.625rem] font-medium uppercase leading-none text-fg-muted">{wd}</span>
                <span className="text-sm font-bold leading-tight text-foreground/80">{dm}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <Check className="h-3.5 w-3.5 shrink-0 text-green-500" strokeWidth={3} />
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-fg-muted">
                  {planName && <span className="truncate">{planName}</span>}
                  {planName && sessionLabel && <span className="text-border">·</span>}
                  {sessionLabel && <span className="truncate">Fase: {sessionLabel}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    {exCount} exerc.
                  </span>
                  <span className="tabular-nums">{totals.doneSets}/{totals.plannedSets} series</span>
                  {durationMin != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {durationMin}min
                    </span>
                  )}
                  <span>{weekLabel}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 px-3 pb-3 pt-1">
              <div className="rounded-md bg-surface-2/30 px-2.5 py-1.5">
                <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted">Séries</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{totals.doneSets}/{totals.plannedSets}</p>
              </div>
              <div className="rounded-md bg-surface-2/30 px-2.5 py-1.5">
                <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted">Reps totais</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{totals.reps || "—"}</p>
              </div>
              <div className="rounded-md bg-surface-2/30 px-2.5 py-1.5">
                <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted">Volume</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{totals.volume != null ? totals.volume : "—"}</p>
              </div>
            </div>

            <div className="border-t border-border">
              <div className="space-y-2 p-3">
                {loading ? (
                  <div className="p-4 text-center text-sm text-fg-muted">Carregando...</div>
                ) : blocks.length === 0 ? (
                  <div className="p-4 text-center text-sm text-fg-muted">Nenhum exercício registrado.</div>
                ) : (
                  blocks.map((b) => (
                    <div key={b.key} className="rounded-lg bg-surface-2/20 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <p className="flex-1 truncate text-sm font-medium">{b.name}</p>
                        <span className="shrink-0 text-xs text-fg-muted">{b.doneSets}/{b.plannedSets}</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 px-1 text-[0.625rem] font-medium uppercase tracking-wider text-fg-muted">
                          <div className="w-6 text-center">#</div>
                          <div className="text-center">Reps</div>
                          <div className="text-center">Carga</div>
                          <div className="w-5" />
                        </div>
                        {b.rows.map((r) => (
                          <div key={r.idx} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 rounded px-1 py-1 text-xs">
                            <div className="w-6 text-center text-fg-muted">{r.idx}</div>
                            <div className="text-center font-medium">{r.reps}</div>
                            <div className="text-center">{r.load}</div>
                            <div className="flex w-5 items-center justify-center">
                              {r.done && <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={3} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
