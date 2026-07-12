import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Clock, Check, Play, ChevronDown, ChevronLeft, MessageSquare,
  AlertTriangle, Timer, Plus, Gauge, CheckCheck, Trophy, Flame, Layers3, Dumbbell, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { applyPrimaryColor } from "@/routes/_authenticated/perfil";
import { toast } from "@/components/ui/sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/_authenticated/meu-treino_/treino/$id")({
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
  const [rest, setRest] = useState<{ total: number; left: number; nextName: string | null } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rpePrompt, setRpePrompt] = useState<{ row: ExerciseRow; idx: number } | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [finalRpe, setFinalRpe] = useState<number | null>(null);
  const [finalNotes, setFinalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [noteModal, setNoteModal] = useState<{ rowId: string; name: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
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
        .select("id, name, template_id, aluno_id, aluno:alunos(personal_id, organization_id)")
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
          let orgId: string | null = (sw as any)?.aluno?.organization_id ?? null;
          if (!orgId) {
            const personalId = (sw as any)?.aluno?.personal_id ?? null;
            if (personalId) {
              const { data: om } = await supabase
                .from("organization_members")
                .select("organization_id")
                .eq("user_id", personalId)
                .limit(1)
                .maybeSingle();
              orgId = om?.organization_id ?? null;
            }
          }
          if (!orgId) {
            const { data: om2 } = await supabase
              .from("organization_members")
              .select("organization_id")
              .eq("user_id", uid)
              .limit(1)
              .maybeSingle();
            orgId = om2?.organization_id ?? null;
          }
          const insertPayload: any = { student_workout_id: id, aluno_user_id: uid };
          if (orgId) insertPayload.organization_id = orgId;
          const { data: created, error: createErr } = await supabase
            .from("workout_sessions")
            .insert(insertPayload)
            .select("id, started_at")
            .single();
          if (createErr) toast.error("Erro ao iniciar sessão: " + createErr.message);
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

          const { data: notes } = await supabase
            .from("session_exercise_notes")
            .select("template_exercise_id, note")
            .eq("session_id", sid);
          const nmap: Record<string, string> = {};
          (notes ?? []).forEach((n: any) => { nmap[n.template_exercise_id] = n.note; });
          setExerciseNotes(nmap);
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
    if (restSec > 0) {
      const rowIdx = rows.findIndex((r) => r.id === row.id);
      const nextName = rows[rowIdx + 1]?.exercise?.name ?? null;
      setRest({ total: restSec, left: restSec, nextName });
    }
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

  async function completeAll(row: ExerciseRow) {
    const total = (row.sets || 0) + (extraSets[row.id] ?? 0);
    for (let i = 0; i < total; i++) {
      const key = `${row.id}:${i}`;
      if (doneSets.has(key)) continue;
      const isExtra = i >= row.sets;
      const ok = await saveSetLog(row, i, { isExtra });
      if (!ok) return;
      setDoneSets((prev) => new Set(prev).add(key));
    }
  }

  async function saveExerciseNote() {
    if (!noteModal || !sessionId || savingNote) return;
    const trimmed = noteDraft.trim();
    setSavingNote(true);
    try {
      if (!trimmed) {
        await supabase.from("session_exercise_notes").delete()
          .eq("session_id", sessionId)
          .eq("template_exercise_id", noteModal.rowId);
        setExerciseNotes((p) => { const n = { ...p }; delete n[noteModal.rowId]; return n; });
      } else {
        const { error } = await supabase.from("session_exercise_notes").upsert(
          { session_id: sessionId, template_exercise_id: noteModal.rowId, note: trimmed },
          { onConflict: "session_id,template_exercise_id" },
        );
        if (error) { toast.error("Erro ao salvar observação: " + error.message); return; }
        setExerciseNotes((p) => ({ ...p, [noteModal.rowId]: trimmed }));
      }
      setNoteModal(null);
    } finally {
      setSavingNote(false);
    }
  }

  const pendingRows = useMemo(() => {
    return rows
      .map((r) => {
        const total = (r.sets || 0) + (extraSets[r.id] ?? 0);
        let done = 0;
        for (let i = 0; i < total; i++) if (doneSets.has(`${r.id}:${i}`)) done++;
        return { row: r, total, pending: total - done };
      })
      .filter((x) => x.pending > 0);
  }, [rows, extraSets, doneSets]);

  const finishStats = useMemo(() => {
    let series = 0;
    let reps_total = 0;
    let volume = 0;
    for (const r of rows) {
      const total = (r.sets || 0) + (extraSets[r.id] ?? 0);
      for (let i = 0; i < total; i++) {
        const key = `${r.id}:${i}`;
        if (!doneSets.has(key)) continue;
        series += 1;
        const repVal = Number(reps[key] ?? r.reps ?? 0) || 0;
        const loadVal = Number(loads[key] ?? r.load ?? 0) || 0;
        reps_total += repVal;
        volume += repVal * loadVal;
      }
    }
    const minutes = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 60000));
    return { minutes, volume: Math.round(volume), series, reps_total };
    // nowTick keeps this fresh while modal is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, extraSets, doneSets, reps, loads, nowTick]);

  function doFinish() {
    setCompletedOpen(true);
  }

  async function saveFinal() {
    if (saving) return;
    setSaving(true);
    try {
      if (sessionId) {
        const dur = Math.floor((Date.now() - startedAtRef.current) / 1000);
        const { error } = await supabase.from("workout_sessions").update({
          status: "concluido",
          finished_at: new Date().toISOString(),
          duration_seconds: dur,
          rpe: finalRpe,
          notes: finalNotes.trim() ? finalNotes.trim() : null,
        }).eq("id", sessionId);
        if (error) {
          toast.error("Erro ao salvar feedback: " + error.message);
          setSaving(false);
          return;
        }
      }
      await supabase.from("student_workouts").update({ status: "concluido" }).eq("id", id);
      toast.success("Treino salvo!");
      navigate({ to: "/meu-treino" });
    } finally {
      setSaving(false);
    }
  }

  async function discardFinal() {
    if (saving) return;
    setSaving(true);
    try {
      if (sessionId) {
        await supabase.from("workout_sessions").delete().eq("id", sessionId);
      }
      toast.success("Treino descartado");
      navigate({ to: "/meu-treino" });
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    if (pendingRows.length > 0) {
      setPendingOpen(true);
      return;
    }
    doFinish();
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
  void nowTick; void runningElapsed;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 inset-x-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button onClick={() => navigate({ to: "/meu-treino" })} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent sm:h-9 sm:w-9" aria-label="Fechar">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-sm font-bold leading-tight sm:text-base">{workoutName}</h1>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
                <Clock className="h-3 w-3" /> {formatTimer(timer)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground tabular-nums sm:text-sm">{pct}%</span>
            <button onClick={finish} className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 font-display text-[11px] font-bold text-primary-foreground transition hover:brightness-110 sm:px-3 sm:py-1.5 sm:text-xs">
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Concluir
            </button>
          </div>
        </div>
        <div className="h-1 w-full bg-border/50">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      {rest && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-3 sm:gap-4 sm:px-6">
            <button
              onClick={() => setRest((p) => p ? { ...p, left: Math.max(0, p.left - 15) } : null)}
              className="shrink-0 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-foreground/80 hover:bg-muted"
            >
              -15s
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-10 w-10 shrink-0">
                <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="16" fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${(rest.left / rest.total) * 100} 100`}
                    pathLength={100}
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descanso</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-lg font-bold tabular-nums leading-none">{formatTimer(rest.left)}</span>
                  {rest.nextName && (
                    <span className="truncate text-xs text-muted-foreground">
                      próx. {rest.nextName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setRest(null)}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm font-semibold text-foreground/90 hover:bg-muted"
            >
              <Play className="h-4 w-4" fill="currentColor" /> Pular descanso
            </button>

            <button
              onClick={() => setRest((p) => p ? { ...p, left: p.left + 15 } : null)}
              className="shrink-0 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-foreground/80 hover:bg-muted"
            >
              +15s
            </button>
          </div>
          <button
            onClick={() => setRest(null)}
            className="flex w-full items-center justify-center gap-2 border-t border-border bg-muted/20 py-2 text-sm font-semibold text-foreground/90 hover:bg-muted/40 sm:hidden"
          >
            <Play className="h-4 w-4" fill="currentColor" /> Pular descanso
          </button>
        </div>
      )}

      <main className="mx-auto max-w-md px-4 pt-[76px] pb-28">
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Carregando exercícios...
          </div>
        )}


        <div className="my-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-5 py-4">
          <div className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px] shadow-primary" />
            <span className="font-display text-sm font-bold text-primary">{blockLabel}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Bloco 1 de 1 · {rows.length} exercícios</p>
        </div>

        {!loading && rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Este treino ainda não possui exercícios.
          </div>
        )}

        <div className="space-y-4">
          {rows.map((r, idx) => {
            const isOpen = openIds.has(r.id);
            const hasLoadCol = (r.load ?? 0) > 0;
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
                    <p className="truncate font-display text-sm font-semibold leading-snug">{r.exercise?.name ?? "Exercício"}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="tabular-nums">{doneCount}/{totalCount} séries</span>
                      <span className="opacity-50"> · </span>
                      <span className="capitalize">{muscle}</span>
                    </p>
                  </div>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-border/60 px-3 py-3">
                    <div className="mb-1 flex items-center justify-evenly">
                      <span className="w-8 text-center text-[10px] font-semibold uppercase tracking-wide text-foreground/70">Serie</span>
                      {hasLoadCol && (
                        <span className="w-24 text-center text-[10px] font-semibold uppercase tracking-wide text-foreground/70">Carga</span>
                      )}
                      <span className="w-24 text-center text-[10px] font-semibold uppercase tracking-wide text-foreground/70">Alvo</span>
                      <span className="w-14 text-center text-[10px] font-semibold uppercase tracking-wide text-foreground/70">Desc.</span>
                      <span className="w-10" aria-hidden />
                    </div>

                    {setsArr.map((i) => {
                      const key = `${r.id}:${i}`;
                      const done = doneSets.has(key);
                      const isExtra = i >= r.sets;
                      const isRunning = runningSet?.rowId === r.id && runningSet.index === i;
                      const loadKey = `${key}:load`;
                      const repsKey = `${key}:reps`;
                      return (
                        <div
                          key={i}
                          className={`-mx-3 flex items-center justify-evenly px-3 py-1.5 transition-colors ${
                            done ? "bg-[hsl(var(--success)/0.10)]" : ""
                          }`}
                        >
                          <div className="w-8 flex justify-center">
                            {isExtra && !done ? (
                              <button
                                type="button"
                                onClick={() => setExtraSets((p) => ({ ...p, [r.id]: Math.max(0, (p[r.id] ?? 0) - 1) }))}
                                aria-label="Remover série extra"
                                className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span
                                className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold font-display leading-none ${
                                  done
                                    ? "bg-muted text-[hsl(var(--success))]"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                {i + 1}
                              </span>
                            )}
                          </div>
                          {hasLoadCol && (
                            <div className={`flex h-10 w-24 items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-primary ${done ? "border-[hsl(var(--success))]" : "border-border"}`}>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder={r.load ? String(r.load) : "0"}
                                value={loads[loadKey] ?? ""}
                                onChange={(e) => setLoads((p) => ({ ...p, [loadKey]: e.target.value }))}
                                className={`h-full min-w-0 flex-1 bg-transparent px-1 text-center text-sm font-semibold tabular-nums outline-none placeholder:text-foreground/40 ${done ? "text-[hsl(var(--success))]" : ""}`}
                              />
                              <span className={`pr-2 text-[10px] font-semibold uppercase tracking-wide ${done ? "text-[hsl(var(--success))]" : "text-foreground/60"}`}>kg</span>
                            </div>
                          )}
                          <div className={`flex h-10 w-24 items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-primary ${done ? "border-[hsl(var(--success))]" : "border-border"}`}>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder={String(r.reps ?? 12)}
                              value={reps[repsKey] ?? ""}
                              onChange={(e) => setReps((p) => ({ ...p, [repsKey]: e.target.value }))}
                              className={`h-full min-w-0 flex-1 bg-transparent px-1 text-center text-sm font-semibold tabular-nums outline-none placeholder:text-foreground/40 ${done ? "text-[hsl(var(--success))]" : ""}`}
                            />
                            <span className={`pr-2 text-[10px] font-semibold uppercase tracking-wide ${done ? "text-[hsl(var(--success))]" : "text-foreground/60"}`}>reps</span>
                          </div>
                          <div
                            title={`Descansar ${restLabel} após esta série`}
                            className={`grid h-10 w-14 place-items-center rounded-md border text-xs font-semibold tabular-nums ${done ? "border-[hsl(var(--success))] text-[hsl(var(--success))] bg-background" : "border-border bg-muted/40 text-foreground/90"}`}
                          >
                            {restLabel}
                          </div>
                          <div className="flex w-10 justify-center">
                            <button
                              type="button"
                              onClick={() => handleSetClick(r, i)}
                              aria-pressed={done}
                              aria-label={done ? "Desmarcar série" : "Marcar série como concluída"}
                              className={`grid h-10 w-10 place-items-center rounded-md transition-all active:scale-95 ${
                                done
                                  ? "bg-[hsl(var(--success))] text-white shadow-sm shadow-[hsl(var(--success)/0.4)] hover:brightness-110"
                                  : isRunning
                                    ? "bg-orange-500 text-white"
                                    : "bg-muted text-foreground hover:bg-muted/70"
                              }`}
                            >
                              {isRunning ? <Timer className="h-4 w-4" /> : <Check className="h-4 w-4" strokeWidth={3} />}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {perms.allow_add_sets && (
                      <button
                        onClick={() => addExtraSet(r.id)}
                        className="mt-1 flex w-full items-center justify-center gap-1.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar série
                      </button>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                      <button
                        onClick={() => completeAll(r)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:brightness-110"
                      >
                        <CheckCheck className="h-3.5 w-3.5" /> Completar tudo
                      </button>
                      {exerciseNotes[r.id] ? (
                        <button
                          onClick={() => {
                            setNoteDraft(exerciseNotes[r.id] ?? "");
                            setNoteModal({ rowId: r.id, name: r.exercise?.name ?? "Exercício" });
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--success))] hover:brightness-110"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Observação adicionada
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setNoteDraft("");
                            setNoteModal({ rowId: r.id, name: r.exercise?.name ?? "Exercício" });
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Adicionar observação
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
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button onClick={() => navigate({ to: "/meu-treino" })} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent" aria-label="Voltar">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={finish} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-orange-500/60 py-3 font-display text-sm font-bold text-orange-500 hover:bg-orange-500/10">
            <AlertTriangle className="h-4 w-4" /> Finalizar mesmo assim
          </button>
        </div>
      </div>

      {/* Tela: Treino Concluído */}
      {completedOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mx-auto max-w-lg pt-8">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-primary/10">
                  <Trophy className="h-12 w-12 text-primary" />
                </div>
                <h1 className="mb-1 font-display text-2xl font-bold">Treino Concluído!</h1>
                <p className="text-sm text-muted-foreground">Excelente trabalho, continue assim!</p>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Clock className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p className="text-2xl font-bold tabular-nums">{finishStats.minutes}</p>
                  <p className="text-xs text-muted-foreground">Minutos</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Flame className="mx-auto mb-2 h-5 w-5 text-orange-500" />
                  <p className="text-2xl font-bold tabular-nums">{finishStats.volume}</p>
                  <p className="text-xs text-muted-foreground">Volume (kg)</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Layers3 className="mx-auto mb-2 h-5 w-5 text-blue-500" />
                  <p className="text-2xl font-bold tabular-nums">{finishStats.series}</p>
                  <p className="text-xs text-muted-foreground">Séries</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Dumbbell className="mx-auto mb-2 h-5 w-5 text-green-500" />
                  <p className="text-2xl font-bold tabular-nums">{finishStats.reps_total}</p>
                  <p className="text-xs text-muted-foreground">Repetições</p>
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-border bg-card p-4">
                <h3 className="mb-1 text-sm font-semibold">Como foi o treino? (RPE)</h3>
                <p className="mb-3 text-xs text-muted-foreground">Selecione sua percepção de esforço</p>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { v: 1, e: "😴", c: "rgb(16, 185, 129)" },
                    { v: 2, e: "😌", c: "rgb(16, 185, 129)" },
                    { v: 3, e: "🙂", c: "rgb(52, 211, 153)" },
                    { v: 4, e: "🙂", c: "rgb(163, 230, 53)" },
                    { v: 5, e: "😐", c: "rgb(250, 204, 21)" },
                    { v: 6, e: "😤", c: "rgb(250, 204, 21)" },
                    { v: 7, e: "😰", c: "rgb(251, 146, 60)" },
                    { v: 8, e: "😫", c: "rgb(249, 115, 22)" },
                    { v: 9, e: "🥵", c: "rgb(239, 68, 68)" },
                    { v: 10, e: "💀", c: "rgb(220, 38, 38)" },
                  ]).map(({ v, e, c }) => {
                    const selected = finalRpe === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setFinalRpe(v)}
                        className={`flex min-h-[56px] flex-col items-center gap-1 rounded-lg border p-2 transition-all ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-accent/30"}`}
                      >
                        <span className="text-base leading-none">{e}</span>
                        <span className="text-xs font-bold" style={{ color: c }}>{v}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold">Observações gerais</h3>
                <textarea
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  placeholder="Como você se sentiu? Algo a melhorar?"
                  className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <footer className="shrink-0 border-t border-border p-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
            <div className="mx-auto max-w-lg space-y-2">
              <button
                onClick={saveFinal}
                disabled={saving}
                className="relative inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-lg font-bold text-primary-foreground shadow-lg transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
              >
                <Check className="h-5 w-5" strokeWidth={3} /> Salvar Treino
              </button>
              <button
                onClick={() => setDiscardOpen(true)}
                disabled={saving}
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-transparent px-6 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-50"
              >
                Descartar treino
              </button>
            </div>
          </footer>

          {discardOpen && (
            <div
              className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-6"
              onClick={() => !saving && setDiscardOpen(false)}
            >
              <div
                className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 shrink-0 text-destructive" />
                  <h3 className="text-lg font-bold">Descartar treino?</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Todo o progresso deste treino será perdido. Tem certeza que deseja sair?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDiscardOpen(false)}
                    disabled={saving}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-border bg-transparent px-6 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    Continuar
                  </button>
                  <button
                    onClick={() => { setDiscardOpen(false); void discardFinal(); }}
                    disabled={saving}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-destructive px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alerta: itens não concluídos */}
      {pendingOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-6"
          onClick={() => setPendingOpen(false)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
              <h3 className="text-lg font-bold">Itens não concluídos</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Há {pendingRows.length} {pendingRows.length === 1 ? "item pendente" : "itens pendentes"} no treino:
            </p>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {pendingRows.map(({ row, total, pending }) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setPendingOpen(false);
                    setOpenIds((prev) => new Set(prev).add(row.id));
                    setTimeout(() => {
                      document.getElementById(`ex-${row.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 50);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="truncate text-sm font-medium">{row.exercise?.name ?? "Exercício"}</span>
                  <span className="ml-2 shrink-0 text-xs text-amber-500">{pending}/{total} pendentes</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setPendingOpen(false); void doFinish(); }}
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[hsl(var(--success))] px-6 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Finalizar mesmo assim
              </button>
              <button
                onClick={() => setPendingOpen(false)}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-transparent px-6 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                Voltar e completar
              </button>
            </div>
          </div>
        </div>
      )}

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
