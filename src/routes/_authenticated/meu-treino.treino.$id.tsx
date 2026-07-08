import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { X, Clock, Check, Play, ChevronDown, ChevronLeft, MessageSquare, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { applyPrimaryColor } from "@/routes/_authenticated/perfil";

export const Route = createFileRoute("/_authenticated/meu-treino/treino/$id")({
  head: () => ({
    meta: [{ title: "Treino · cactusfitness" }],
  }),
  component: TreinoPage,
});

type ExerciseRow = {
  id: string;
  position: number;
  sets: number;
  reps: number | null;
  load: number | null;
  rest_seconds: number | null;
  notes: string | null;
  block_label: string | null;
  session_label: string | null;
  exercise: {
    id: string;
    name: string;
    image_path: string | null;
    video_url: string | null;
    muscles_primary: string[] | null;
    equipment: string[] | null;
  } | null;
};

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function TreinoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { profile } = useCurrentUser();

  const [workoutName, setWorkoutName] = useState<string>("Treino");
  const [blockLabel, setBlockLabel] = useState<string>("Força");
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  // set completion tracking: key = `${exerciseRowId}:${setIdx}`
  const [doneSets, setDoneSets] = useState<Set<string>>(new Set());
  const [loads, setLoads] = useState<Record<string, string>>({});
  const [timer, setTimer] = useState(0);

  // aplica cor principal do personal
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data: link } = await supabase
        .from("alunos")
        .select("personal_id")
        .eq("aluno_user_id", profile.id)
        .maybeSingle();
      if (!link?.personal_id) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("primary_color")
        .eq("id", link.personal_id)
        .maybeSingle();
      if (p?.primary_color) applyPrimaryColor(p.primary_color);
    })();
  }, [profile?.id]);

  // load workout + exercises
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: sw } = await supabase
        .from("student_workouts")
        .select("id, name, template_id")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (sw?.name) setWorkoutName(sw.name);
      if (!sw?.template_id) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: exs } = await supabase
        .from("workout_template_exercises")
        .select(
          "id, position, sets, reps, load, rest_seconds, notes, block_label, session_label, exercise:exercises(id, name, image_path, video_url, muscles_primary, equipment)"
        )
        .eq("template_id", sw.template_id)
        .order("position", { ascending: true });
      if (cancelled) return;
      const list = (exs ?? []) as any as ExerciseRow[];
      setRows(list);
      if (list[0]?.block_label) setBlockLabel(list[0].block_label);
      if (list[0]) setOpenIds(new Set([list[0].id]));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // timer ticks
  useEffect(() => {
    const t = setInterval(() => setTimer((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const totalSets = useMemo(() => rows.reduce((acc, r) => acc + (r.sets ?? 0), 0), [rows]);
  const completedSets = doneSets.size;
  const pct = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;

  const toggleOpen = (rid: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      return next;
    });

  const toggleSet = (rid: string, idx: number) => {
    const key = `${rid}:${idx}`;
    setDoneSets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const finish = async () => {
    await supabase.from("student_workouts").update({ status: "concluido" }).eq("id", id);
    navigate({ to: "/meu-treino" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/meu-treino" })}
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-base font-bold leading-tight">{workoutName}</h1>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {formatTimer(timer)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">{pct}%</span>
            <button
              onClick={finish}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground transition hover:brightness-110"
            >
              <Check className="h-4 w-4" strokeWidth={3} /> Concluir
            </button>
          </div>
        </div>
        <div className="h-1 w-full bg-border/50">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-[76px] pb-28">
        {/* Bloco label */}
        <div className="my-4 rounded-2xl border border-border bg-card px-5 py-4">
          <div className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="font-display text-sm font-bold text-primary">{blockLabel}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Bloco 1 de 1 · {rows.length} exercícios</p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Carregando exercícios...
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Este treino ainda não possui exercícios.
          </div>
        )}

        <div className="space-y-4">
          {rows.map((r, idx) => {
            const isOpen = openIds.has(r.id);
            const hasLoadCol = (r.load ?? 0) > 0 || (r.exercise?.equipment?.length ?? 0) > 0;
            const setsArr = Array.from({ length: r.sets || 0 }, (_, i) => i);
            const doneCount = setsArr.filter((i) => doneSets.has(`${r.id}:${i}`)).length;
            const restLabel = r.rest_seconds ? `${Math.round(r.rest_seconds / 60)}min` : "1min";
            const muscle = r.exercise?.muscles_primary?.[0] ?? "Geral";
            return (
              <section key={r.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <button
                  onClick={() => toggleOpen(r.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <div className="relative">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                      {r.exercise?.image_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.exercise.image_path} alt={r.exercise.name} className="h-full w-full object-cover" />
                      ) : (
                        <Play className="h-6 w-6 text-muted-foreground" />
                      )}
                      <span className="pointer-events-none absolute inset-0 grid place-items-center">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/90 text-primary-foreground">
                          <Play className="h-4 w-4" fill="currentColor" />
                        </span>
                      </span>
                    </div>
                    <span className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold">{r.exercise?.name ?? "Exercício"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {doneCount}/{r.sets} séries · <span className="capitalize">{muscle}</span>
                    </p>
                  </div>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-border/60 px-4 py-4">
                    {/* Header row */}
                    <div
                      className={`grid items-center gap-2 pb-3 text-[10px] uppercase tracking-widest text-muted-foreground ${
                        hasLoadCol ? "grid-cols-[36px_1fr_1fr_1fr_88px]" : "grid-cols-[36px_1fr_1fr_88px]"
                      }`}
                    >
                      <span className="text-center">Serie</span>
                      {hasLoadCol && <span className="text-center">Carga (kg)</span>}
                      <span className="text-center">Alvo</span>
                      <span className="text-center">Desc.</span>
                      <span />
                    </div>

                    {setsArr.map((i) => {
                      const key = `${r.id}:${i}`;
                      const done = doneSets.has(key);
                      const loadKey = `${r.id}:${i}:load`;
                      return (
                        <div
                          key={i}
                          className={`grid items-center gap-2 py-2 ${
                            hasLoadCol ? "grid-cols-[36px_1fr_1fr_1fr_88px]" : "grid-cols-[36px_1fr_1fr_88px]"
                          }`}
                        >
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-sm font-semibold">
                            {i + 1}
                          </div>
                          {hasLoadCol && (
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="?"
                              value={loads[loadKey] ?? (r.load ? String(r.load) : "")}
                              onChange={(e) => setLoads((p) => ({ ...p, [loadKey]: e.target.value }))}
                              className="h-9 rounded-md border border-primary/60 bg-transparent text-center text-sm font-semibold outline-none focus:border-primary"
                            />
                          )}
                          <div className="grid h-9 place-items-center rounded-md bg-muted/40 text-sm font-semibold">
                            <span>
                              {r.reps ?? 12} <span className="ml-1 text-[10px] uppercase tracking-widest text-muted-foreground">reps</span>
                            </span>
                          </div>
                          <div className="grid h-9 place-items-center rounded-md bg-muted/40 text-sm font-semibold">
                            {restLabel}
                          </div>
                          <button
                            onClick={() => toggleSet(r.id, i)}
                            className={`grid h-9 place-items-center rounded-md text-xs font-bold uppercase tracking-widest transition ${
                              done
                                ? "bg-primary/20 text-primary"
                                : "bg-primary text-primary-foreground hover:brightness-110"
                            }`}
                          >
                            {done ? (
                              <span className="inline-flex items-center gap-1">
                                <Check className="h-3.5 w-3.5" strokeWidth={3} /> feito
                              </span>
                            ) : (
                              "iniciar"
                            )}
                          </button>
                        </div>
                      );
                    })}

                    <button className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                      <MessageSquare className="h-3.5 w-3.5" /> Observações
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate({ to: "/meu-treino" })}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={finish}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-orange-500/60 py-3 font-display text-sm font-bold text-orange-500 hover:bg-orange-500/10"
          >
            <AlertTriangle className="h-4 w-4" /> Finalizar mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}
