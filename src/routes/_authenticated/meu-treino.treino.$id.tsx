import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Clock, Check, Play, ChevronDown, ChevronLeft, MessageSquare,
  AlertTriangle, Timer, Plus, FileDown, Gauge,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { applyPrimaryColor } from "@/routes/_authenticated/perfil";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/_authenticated/meu-treino/treino/$id")({
  head: () => ({ meta: [{ title: "Treino · cactusfitness" }] }),
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
    id: number;
    name: string;
    image_path: string | null;
    video_url: string | null;
    muscles_primary: string[] | null;
    equipment: string[] | null;
  } | null;
};

type Perms = {
  allow_rpe: boolean;
  allow_add_sets: boolean;
  track_set_time: boolean;
  allow_pdf: boolean;
};

const DEFAULT_PERMS: Perms = {
  allow_rpe: false,
  allow_add_sets: true,
  track_set_time: false,
  allow_pdf: true,
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

  const [workoutName, setWorkoutName] = useState("Treino");
  const [blockLabel, setBlockLabel] = useState("Força");
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [perms, setPerms] = useState<Perms>(DEFAULT_PERMS);
  const [loading, setLoading] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [doneSets, setDoneSets] = useState<Set<string>>(new Set());
  const [loads, setLoads] = useState<Record<string, string>>({});
  const [reps, setReps] = useState<Record<string, string>>({});
  const [rpes, setRpes] = useState<Record<string, number>>({});
  const [extraSets, setExtraSets] = useState<Record<string, number>>({}); // rowId -> extra count
  const [runningSet, setRunningSet] = useState<{ rowId: string; index: number; startedAt: number } | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [timer, setTimer] = useState(0);
  const [rest, setRest] = useState<{ total: number; left: number } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rpePrompt, setRpePrompt] = useState<{ row: ExerciseRow; idx: number } | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  // Cor principal do personal
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

  // Carrega treino, permissões, cria/resume sessão, hidrata logs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: sw } = await supabase
        .from("student_workouts")
        .select("id, name, template_id, aluno_id")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (sw?.name) setWorkoutName(sw.name);
      if (!sw?.template_id) { setRows([]); setLoading(false); return; }

      const [{ data: tpl }, { data: exs }] = await Promise.all([
        supabase
          .from("workout_templates")
          .select("allow_rpe, allow_add_sets, track_set_time, allow_pdf")
          .eq("id", sw.template_id)
          .maybeSingle(),
        supabase
          .from("workout_template_exercises")
          .select("id, position, sets, reps, load, rest_seconds, notes, block_label, session_label, exercise:exercises(id, name, image_path, video_url, muscles_primary, equipment)")
          .eq("template_id", sw.template_id)
          .order("position", { ascending: true }),
      ]);
      if (cancelled) return;
      if (tpl) {
        setPerms({
          allow_rpe: (tpl as any).allow_rpe ?? false,
          allow_add_sets: (tpl as any).allow_add_sets ?? true,
          track_set_time: (tpl as any).track_set_time ?? false,
          allow_pdf: (tpl as any).allow_pdf ?? true,
        });
      }
      const list = (exs ?? []) as any as ExerciseRow[];
      setRows(list);
      if (list[0]?.block_label) setBlockLabel(list[0].block_label);
      if (list[0]) setOpenIds(new Set([list[0].id]));

      // Sessão
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (uid) {
        const { data: existing } = await supabase
          .from("workout_sessions")
          .select("id, started_at")
          .eq("student_workout_id", id)
          .eq("aluno_user_id", uid)
          .eq("status", "em_andamento")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        let sid = existing?.id ?? null;
        if (!sid) {
          const { data: created } = await supabase
            .from("workout_sessions")
            .insert({ student_workout_id: id, aluno_user_id: uid })
            .select("id, started_at")
            .single();
          sid = created?.id ?? null;
          if (created?.started_at) startedAtRef.current = new Date(created.started_at).getTime();
        } else if (existing?.started_at) {
          startedAtRef.current = new Date(existing.started_at).getTime();
        }
        if (sid) {
          setSessionId(sid);
          const { data: logs } = await supabase
            .from("set_logs")
            .select("template_exercise_id, set_index, reps, load, rpe, is_extra")
            .eq("session_id", sid);
          const done = new Set<string>();
          const l: Record<string, string> = {};
          const r: Record<string, string> = {};
          const rp: Record<string, number> = {};
          const extras: Record<string, number> = {};
          (logs ?? []).forEach((row: any) => {
            const key = `${row.template_exercise_id}:${row.set_index}`;
            done.add(key);
            if (row.load != null) l[`${key}:load`] = String(row.load);
            if (row.reps != null) r[`${key}:reps`] = String(row.reps);
            if (row.rpe != null) rp[key] = Number(row.rpe);
            if (row.is_extra) {
              const base = list.find((x) => x.id === row.template_exercise_id)?.sets ?? 0;
              if (row.set_index >= base) {
                extras[row.template_exercise_id] = Math.max(
                  extras[row.template_exercise_id] ?? 0,
                  row.set_index - base + 1,
                );
              }
            }
          });
          setDoneSets(done);
          setLoads(l);
          setReps(r);
          setRpes(rp);
          setExtraSets(extras);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Timer geral
  useEffect(() => {
    const t = setInterval(() => {
      setTimer(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Timer de descanso
  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) { setRest(null); return; }
    const t = setInterval(() => {
      setRest((prev) => prev ? { ...prev, left: prev.left - 1 } : null);
    }, 1000);
    return () => clearInterval(t);
  }, [rest]);

  // Tick para exibir cronômetro da série ativa
  useEffect(() => {
    if (!runningSet) return;
    const t = setInterval(() => setNowTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [runningSet]);

  const totalSets = useMemo(
    () => rows.reduce((acc, r) => acc + (r.sets ?? 0) + (extraSets[r.id] ?? 0), 0),
    [rows, extraSets],
  );
  const completedSets = doneSets.size;
  const pct = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;

  const toggleOpen = (rid: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid); else next.add(rid);
      return next;
    });

  async function saveSetLog(row: ExerciseRow, idx: number, opts?: { rpe?: number; startedAt?: number | null; duration?: number | null; isExtra?: boolean }) {
    if (!sessionId) return;
    const key = `${row.id}:${idx}`;
    const loadStr = loads[`${key}:load`] ?? (row.load ? String(row.load) : "");
    const repsStr = reps[`${key}:reps`] ?? (row.reps ? String(row.reps) : "");
    const loadNum = loadStr ? Number(loadStr.replace(",", ".")) : null;
    const repsNum = repsStr ? parseInt(repsStr, 10) : null;
    const payload: any = {
      session_id: sessionId,
      template_exercise_id: row.id,
      exercise_id: row.exercise?.id ?? null,
      set_index: idx,
      reps: repsNum,
      load: loadNum,
      rest_seconds: row.rest_seconds ?? null,
    };
    if (opts?.rpe != null) payload.rpe = opts.rpe;
    if (opts?.startedAt != null) payload.started_at = new Date(opts.startedAt).toISOString();
    if (opts?.duration != null) payload.duration_seconds = opts.duration;
    if (opts?.isExtra) payload.is_extra = true;
    const { error } = await supabase.from("set_logs").upsert(payload, {
      onConflict: "session_id,template_exercise_id,set_index",
    });
    if (error) { toast.error("Erro ao salvar série"); return false; }
    return true;
  }

  async function finalizeSet(row: ExerciseRow, idx: number, extra: { startedAt: number | null; duration: number | null }) {
    const base = row.sets;
    const isExtra = idx >= base;
    const key = `${row.id}:${idx}`;
    const ok = await saveSetLog(row, idx, { startedAt: extra.startedAt, duration: extra.duration, isExtra });
    if (!ok) return;
    setDoneSets((prev) => new Set(prev).add(key));
    const restSec = row.rest_seconds ?? 60;
    if (restSec > 0) setRest({ total: restSec, left: restSec });
    if (perms.allow_rpe) setRpePrompt({ row, idx });
  }

  async function handleSetClick(row: ExerciseRow, idx: number) {
    if (!sessionId) return;
    const key = `${row.id}:${idx}`;
    const wasDone = doneSets.has(key);

    // Desfaz
    if (wasDone) {
      const next = new Set(doneSets); next.delete(key); setDoneSets(next);
      await supabase.from("set_logs").delete()
        .eq("session_id", sessionId)
        .eq("template_exercise_id", row.id)
        .eq("set_index", idx);
      return;
    }

    // Com rastreamento de tempo: dois cliques (iniciar/concluir)
    if (perms.track_set_time) {
      if (runningSet && runningSet.rowId === row.id && runningSet.index === idx) {
        const duration = Math.floor((Date.now() - runningSet.startedAt) / 1000);
        const startedAt = runningSet.startedAt;
        setRunningSet(null);
        await finalizeSet(row, idx, { startedAt, duration });
      } else {
        setRunningSet({ rowId: row.id, index: idx, startedAt: Date.now() });
      }
      return;
    }

    // Sem rastreamento: um clique conclui direto
    await finalizeSet(row, idx, { startedAt: null, duration: null });
  }

  async function confirmRpe(value: number) {
    if (!rpePrompt) return;
    const { row, idx } = rpePrompt;
    await saveSetLog(row, idx, { rpe: value });
    setRpes((prev) => ({ ...prev, [`${row.id}:${idx}`]: value }));
    setRpePrompt(null);
  }

  function addExtraSet(rowId: string) {
    if (!perms.allow_add_sets) return;
    setExtraSets((prev) => ({ ...prev, [rowId]: (prev[rowId] ?? 0) + 1 }));
  }

  async function finish() {
    if (sessionId) {
      const dur = Math.floor((Date.now() - startedAtRef.current) / 1000);
      await supabase.from("workout_sessions").update({
        status: "concluido",
        finished_at: new Date().toISOString(),
        duration_seconds: dur,
      }).eq("id", sessionId);
    }
    await supabase.from("student_workouts").update({ status: "concluido" }).eq("id", id);
    toast.success("Treino concluído!");
    navigate({ to: "/meu-treino" });
  }

  function downloadPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    let y = 60;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(workoutName, marginX, y);
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(new Date().toLocaleDateString("pt-BR"), marginX, y);
    doc.setTextColor(0);
    y += 24;

    rows.forEach((r, idx) => {
      if (y > 780) { doc.addPage(); y = 60; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${idx + 1}. ${r.exercise?.name ?? "Exercício"}`, marginX, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const base = r.sets ?? 0;
      const extra = extraSets[r.id] ?? 0;
      const total = base + extra;
      const parts: string[] = [];
      parts.push(`${total} série${total !== 1 ? "s" : ""}`);
      if (r.reps) parts.push(`${r.reps} reps`);
      if (r.load) parts.push(`${r.load} kg`);
      if (r.rest_seconds) parts.push(`descanso ${Math.round(r.rest_seconds / 60)} min`);
      doc.text(parts.join("  ·  "), marginX, y);
      y += 14;
      if (r.notes) {
        const lines = doc.splitTextToSize(r.notes, 515);
        doc.setTextColor(120);
        doc.text(lines, marginX, y);
        y += lines.length * 12;
        doc.setTextColor(0);
      }
      y += 12;
    });

    doc.save(`${workoutName.replace(/\s+/g, "_")}.pdf`);
  }

  const runningElapsed = runningSet ? Math.floor((Date.now() - runningSet.startedAt) / 1000) : 0;
  // usa nowTick para forçar re-render
  void nowTick;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 inset-x-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate({ to: "/meu-treino" })} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-base font-bold leading-tight">{workoutName}</h1>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {formatTimer(timer)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {perms.allow_pdf && (
              <button
                onClick={downloadPdf}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label="Baixar PDF"
              >
                <FileDown className="h-4 w-4" /> PDF
              </button>
            )}
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">{pct}%</span>
            <button onClick={finish} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground transition hover:brightness-110">
              <Check className="h-4 w-4" strokeWidth={3} /> Concluir
            </button>
          </div>
        </div>
        <div className="h-1 w-full bg-border/50">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      {rest && (
        <div className="fixed left-1/2 top-16 z-40 -translate-x-1/2 rounded-full bg-primary/95 px-5 py-2.5 text-primary-foreground shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <Timer className="h-4 w-4" />
            <span className="font-display text-lg font-bold tabular-nums">{formatTimer(rest.left)}</span>
            <button
              onClick={() => setRest(null)}
              className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest hover:bg-white/30"
            >
              pular
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 pt-[76px] pb-28">
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
            const totalCount = (r.sets || 0) + (extraSets[r.id] ?? 0);
            const setsArr = Array.from({ length: totalCount }, (_, i) => i);
            const doneCount = setsArr.filter((i) => doneSets.has(`${r.id}:${i}`)).length;
            const restLabel = r.rest_seconds ? `${Math.round(r.rest_seconds / 60)}min` : "1min";
            const muscle = r.exercise?.muscles_primary?.[0] ?? "Geral";
            return (
              <section key={r.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <button onClick={() => toggleOpen(r.id)} className="flex w-full items-center gap-3 p-3 text-left">
                  <div className="relative">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                      {r.exercise?.image_path ? (
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
                      {doneCount}/{totalCount} séries · <span className="capitalize">{muscle}</span>
                    </p>
                  </div>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-border/60 px-4 py-4">
                    <div className={`grid items-center gap-2 pb-3 text-[10px] uppercase tracking-widest text-muted-foreground ${hasLoadCol ? "grid-cols-[36px_1fr_1fr_1fr_88px]" : "grid-cols-[36px_1fr_1fr_88px]"}`}>
                      <span className="text-center">Serie</span>
                      {hasLoadCol && <span className="text-center">Carga (kg)</span>}
                      <span className="text-center">Reps</span>
                      <span className="text-center">Desc.</span>
                      <span />
                    </div>

                    {setsArr.map((i) => {
                      const key = `${r.id}:${i}`;
                      const done = doneSets.has(key);
                      const isExtra = i >= r.sets;
                      const isRunning = runningSet?.rowId === r.id && runningSet.index === i;
                      const loadKey = `${key}:load`;
                      const repsKey = `${key}:reps`;
                      const rpeVal = rpes[key];
                      return (
                        <div key={i} className={`grid items-center gap-2 py-2 ${hasLoadCol ? "grid-cols-[36px_1fr_1fr_1fr_88px]" : "grid-cols-[36px_1fr_1fr_88px]"}`}>
                          <div className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${isExtra ? "bg-primary/15 text-primary" : "bg-muted"}`}>
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
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={String(r.reps ?? 12)}
                            value={reps[repsKey] ?? (r.reps ? String(r.reps) : "")}
                            onChange={(e) => setReps((p) => ({ ...p, [repsKey]: e.target.value }))}
                            className="h-9 rounded-md border border-primary/40 bg-transparent text-center text-sm font-semibold outline-none focus:border-primary"
                          />
                          <div className="grid h-9 place-items-center rounded-md bg-muted/40 text-sm font-semibold">
                            {restLabel}
                          </div>
                          <button
                            onClick={() => handleSetClick(r, i)}
                            className={`grid h-9 place-items-center rounded-md text-xs font-bold uppercase tracking-widest transition ${
                              done
                                ? "bg-primary/20 text-primary"
                                : isRunning
                                  ? "bg-orange-500 text-white"
                                  : "bg-primary text-primary-foreground hover:brightness-110"
                            }`}
                          >
                            {done ? (
                              <span className="inline-flex items-center gap-1">
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                {perms.allow_rpe && rpeVal != null ? `RPE ${rpeVal}` : "feito"}
                              </span>
                            ) : isRunning ? (
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Timer className="h-3.5 w-3.5" /> {formatTimer(runningElapsed)}
                              </span>
                            ) : perms.track_set_time ? (
                              "iniciar"
                            ) : (
                              "concluir"
                            )}
                          </button>
                        </div>
                      );
                    })}

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                        <MessageSquare className="h-3.5 w-3.5" /> Observações
                      </button>
                      {perms.allow_add_sets && (
                        <button
                          onClick={() => addExtraSet(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/50 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar série
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate({ to: "/meu-treino" })} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent" aria-label="Voltar">
            <ChevronLeft className="h-5 w-5" />
          </button>
          {perms.allow_pdf && (
            <button
              onClick={downloadPdf}
              className="sm:hidden inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              aria-label="Baixar PDF"
            >
              <FileDown className="h-4 w-4" /> PDF
            </button>
          )}
          <button onClick={finish} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-orange-500/60 py-3 font-display text-sm font-bold text-orange-500 hover:bg-orange-500/10">
            <AlertTriangle className="h-4 w-4" /> Finalizar mesmo assim
          </button>
        </div>
      </div>

      {/* Prompt de RPE */}
      <Dialog open={!!rpePrompt} onOpenChange={(o) => { if (!o) setRpePrompt(null); }}>
        <DialogContent className="max-w-sm gap-0 p-0">
          <DialogHeader className="p-5">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              <DialogTitle className="font-display text-lg">Como foi o esforço?</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              Selecione o RPE (1 = muito leve, 10 = falha total) da série que acabou.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-2 px-5 pb-5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
              <button
                key={v}
                onClick={() => confirmRpe(v)}
                className="h-12 rounded-lg border border-border bg-card text-sm font-bold hover:border-primary hover:bg-primary/10 hover:text-primary"
              >
                {v}
              </button>
            ))}
          </div>
          <div className="border-t border-border px-5 py-3 text-right">
            <button
              onClick={() => setRpePrompt(null)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Pular
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
