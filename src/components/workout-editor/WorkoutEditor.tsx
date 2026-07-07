import { useMemo, useReducer, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, ChevronUp, Copy, GripVertical, Loader2, MoreHorizontal, CheckSquare,
  Play, Plus, Save, Search, Settings, Trash2, X, Dumbbell, Pencil, Check, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export type EditorKind = "plan" | "template";

type ExerciseItem = {
  id: string; // client id
  exercise_id: number | null;
  name: string;
  sets: number | null;
  reps: string;
  rest_seconds: number | null;
  load: string;
  notes: string;
};

type Block = {
  id: string;
  label: string;
  description?: string;
  color?: string; // oklch/hex/tailwind color
  exercises: ExerciseItem[];
};

export type BlockPreset = {
  key: string;
  label: string;
  description: string;
  color: string; // css color
};

export const BLOCK_PRESETS: BlockPreset[] = [
  { key: "mobilidade",  label: "Mobilidade",   description: "Alongamentos e flexibilidade",         color: "#a855f7" },
  { key: "aquecimento", label: "Aquecimento",  description: "Preparação física inicial",            color: "#f97316" },
  { key: "ativacao",    label: "Ativação",     description: "Ativar musculatura alvo",              color: "#22c55e" },
  { key: "forca",       label: "Força",        description: "Séries pesadas, hipertrofia",          color: "#eab308" },
  { key: "metabolico",  label: "Metabólico",   description: "Cardio em alta intensidade",           color: "#06b6d4" },
  { key: "amrap",       label: "AMRAP",        description: "As Many Rounds As Possible",           color: "#3b82f6" },
  { key: "emom",        label: "EMOM",         description: "Every Minute On the Minute",           color: "#f59e0b" },
  { key: "fortime",     label: "For Time",     description: "Concluir o mais rápido possível",      color: "#ec4899" },
  { key: "tabata",      label: "Tabata",       description: "Intervalos de alta intensidade (20s/10s, 8 rounds)", color: "#f43f5e" },
  { key: "volta",       label: "Volta à Calma", description: "Recuperação ativa",                    color: "#14b8a6" },
];

type Session = {
  id: string;
  label: string;
  blocks: Block[];
};

type State = {
  name: string;
  description: string;
  level: string;
  goal: string;
  periodize: boolean;
  sessions: Session[]; // for template kind, always exactly one session
};

const uid = () => Math.random().toString(36).slice(2, 10);

const emptyBlock = (idx: number): Block => ({
  id: uid(),
  label: `Bloco ${String.fromCharCode(65 + idx)}`,
  exercises: [],
});

const blockFromPreset = (p: BlockPreset): Block => ({
  id: uid(),
  label: p.label,
  description: p.description,
  color: p.color,
  exercises: [],
});

const emptySession = (idx: number): Session => ({
  id: uid(),
  label: `Treino ${String.fromCharCode(65 + idx)}`,
  blocks: [emptyBlock(0)],
});

type Action =
  | { type: "SET_META"; patch: Partial<Omit<State, "sessions">> }
  | { type: "ADD_SESSION" }
  | { type: "REMOVE_SESSION"; sessionId: string }
  | { type: "MOVE_SESSION"; sessionId: string; dir: -1 | 1 }
  | { type: "DUPLICATE_SESSION"; sessionId: string }
  | { type: "RENAME_SESSION"; sessionId: string; label: string }
  | { type: "ADD_BLOCK"; sessionId: string; preset?: BlockPreset }
  | { type: "REMOVE_BLOCK"; sessionId: string; blockId: string }
  | { type: "MOVE_BLOCK"; sessionId: string; blockId: string; dir: -1 | 1 }
  | { type: "RENAME_BLOCK"; sessionId: string; blockId: string; label: string }
  | { type: "ADD_EXERCISE"; sessionId: string; blockId: string; exercise: { id: number | null; name: string } }
  | { type: "REMOVE_EXERCISE"; sessionId: string; blockId: string; exerciseId: string }
  | { type: "MOVE_EXERCISE"; sessionId: string; blockId: string; exerciseId: string; dir: -1 | 1 }
  | { type: "UPDATE_EXERCISE"; sessionId: string; blockId: string; exerciseId: string; patch: Partial<ExerciseItem> };

function move<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const j = idx + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = arr.slice();
  [copy[idx], copy[j]] = [copy[j], copy[idx]];
  return copy;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_META":
      return { ...state, ...action.patch };
    case "ADD_SESSION":
      return { ...state, sessions: [...state.sessions, emptySession(state.sessions.length)] };
    case "REMOVE_SESSION":
      return { ...state, sessions: state.sessions.filter(s => s.id !== action.sessionId) };
    case "MOVE_SESSION": {
      const idx = state.sessions.findIndex(s => s.id === action.sessionId);
      return { ...state, sessions: move(state.sessions, idx, action.dir) };
    }
    case "DUPLICATE_SESSION": {
      const idx = state.sessions.findIndex(s => s.id === action.sessionId);
      if (idx < 0) return state;
      const src = state.sessions[idx];
      const copy: Session = {
        id: uid(),
        label: src.label,
        blocks: src.blocks.map(b => ({
          id: uid(),
          label: b.label,
          description: b.description,
          color: b.color,
          exercises: b.exercises.map(e => ({ ...e, id: uid() })),
        })),
      };
      const next = state.sessions.slice();
      next.splice(idx + 1, 0, copy);
      return { ...state, sessions: next };
    }
    case "RENAME_SESSION":
      return { ...state, sessions: state.sessions.map(s => s.id === action.sessionId ? { ...s, label: action.label } : s) };
    case "ADD_BLOCK":
      return {
        ...state,
        sessions: state.sessions.map(s => s.id === action.sessionId
          ? { ...s, blocks: [...s.blocks, action.preset ? blockFromPreset(action.preset) : emptyBlock(s.blocks.length)] }
          : s),
      };
    case "REMOVE_BLOCK":
      return {
        ...state,
        sessions: state.sessions.map(s => s.id === action.sessionId
          ? { ...s, blocks: s.blocks.filter(b => b.id !== action.blockId) }
          : s),
      };
    case "MOVE_BLOCK":
      return {
        ...state,
        sessions: state.sessions.map(s => {
          if (s.id !== action.sessionId) return s;
          const idx = s.blocks.findIndex(b => b.id === action.blockId);
          return { ...s, blocks: move(s.blocks, idx, action.dir) };
        }),
      };
    case "RENAME_BLOCK":
      return {
        ...state,
        sessions: state.sessions.map(s => s.id === action.sessionId
          ? { ...s, blocks: s.blocks.map(b => b.id === action.blockId ? { ...b, label: action.label } : b) }
          : s),
      };
    case "ADD_EXERCISE":
      return {
        ...state,
        sessions: state.sessions.map(s => s.id === action.sessionId
          ? {
              ...s,
              blocks: s.blocks.map(b => b.id === action.blockId
                ? {
                    ...b,
                    exercises: [...b.exercises, {
                      id: uid(),
                      exercise_id: action.exercise.id,
                      name: action.exercise.name,
                      sets: 3, reps: "10", rest_seconds: 60, load: "", notes: "",
                    }],
                  }
                : b),
            }
          : s),
      };
    case "REMOVE_EXERCISE":
      return {
        ...state,
        sessions: state.sessions.map(s => s.id === action.sessionId
          ? { ...s, blocks: s.blocks.map(b => b.id === action.blockId
              ? { ...b, exercises: b.exercises.filter(e => e.id !== action.exerciseId) }
              : b) }
          : s),
      };
    case "MOVE_EXERCISE":
      return {
        ...state,
        sessions: state.sessions.map(s => s.id === action.sessionId
          ? { ...s, blocks: s.blocks.map(b => {
              if (b.id !== action.blockId) return b;
              const idx = b.exercises.findIndex(e => e.id === action.exerciseId);
              return { ...b, exercises: move(b.exercises, idx, action.dir) };
            }) }
          : s),
      };
    case "UPDATE_EXERCISE":
      return {
        ...state,
        sessions: state.sessions.map(s => s.id === action.sessionId
          ? { ...s, blocks: s.blocks.map(b => b.id === action.blockId
              ? { ...b, exercises: b.exercises.map(e => e.id === action.exerciseId ? { ...e, ...action.patch } : e) }
              : b) }
          : s),
      };
  }
}

export function WorkoutEditor({ kind }: { kind: EditorKind }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const initial: State = useMemo(() => ({
    name: "",
    description: "",
    level: "",
    goal: "",
    periodize: false,
    sessions: kind === "plan"
      ? [emptySession(0)]
      : [{ id: uid(), label: "__single__", blocks: [emptyBlock(0)] }],
  }), [kind]);

  const [state, dispatch] = useReducer(reducer, initial);
  const [activeTarget, setActiveTarget] = useState<{ sessionId: string; blockId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const title = kind === "plan" ? "Criar modelo de plano" : "Criar modelo de treino";
  const nameLabel = kind === "plan" ? "Nome do plano" : "Nome do treino";

  const canSave = state.name.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Sessão expirada");

      const { data: tpl, error: tErr } = await supabase
        .from("workout_templates")
        .insert({
          name: state.name.trim(),
          description: state.description.trim() || null,
          kind,
          periodize: state.periodize,
          level: state.level || null,
          goal: state.goal || null,
          personal_id: userRes.user.id,
        })
        .select("id")
        .single();
      if (tErr || !tpl) throw tErr ?? new Error("Falha ao criar modelo");

      const rows: Array<{
        template_id: string;
        exercise_id: number | null;
        sets: number | null;
        reps: string | null;
        rest_seconds: number | null;
        load: string | null;
        notes: string | null;
        position: number;
        block_position: number;
        session_position: number;
        block_label: string | null;
        session_label: string | null;
      }> = [];

      let flat = 0;
      state.sessions.forEach((s, si) => {
        s.blocks.forEach((b, bi) => {
          b.exercises.forEach((e) => {
            rows.push({
              template_id: tpl.id,
              exercise_id: e.exercise_id,
              sets: e.sets,
              reps: e.reps || null,
              rest_seconds: e.rest_seconds,
              load: e.load || null,
              notes: e.notes || null,
              position: flat++,
              block_position: bi,
              session_position: si,
              block_label: b.label,
              session_label: kind === "plan" ? s.label : null,
            });
          });
        });
      });

      if (rows.length > 0) {
        const { error: exErr } = await supabase
          .from("workout_template_exercises")
          .insert(rows);
        if (exErr) throw exErr;
      }

      await qc.invalidateQueries({ queryKey: ["workout_templates"] });
      toast.success("Modelo salvo");
      navigate({ to: "/dashboard/personal/treinos" });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const [pickerOpen, setPickerOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail />
      <div className="pb-24 md:pl-[72px] md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => navigate({ to: "/dashboard/personal/treinos" })}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronUp className="h-4 w-4 -rotate-90" />
                Voltar
              </button>
              <h1 className="truncate text-sm font-semibold md:text-base">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[oklch(0.92_0.19_115)] px-4 text-sm font-semibold text-[oklch(0.2_0.05_115)] hover:brightness-105 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </button>
              <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
                <SheetTrigger asChild>
                  <button className="hidden md:inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted">
                    <CheckSquare className="h-4 w-4" />
                    Selecionar exercícios
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[440px]">
                  <SheetHeader className="shrink-0 border-b border-border px-5 py-3 text-left">
                    <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
                      <Dumbbell className="h-5 w-5 text-primary" />
                      Biblioteca de exercícios
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex min-h-0 flex-1 flex-col">
                    <ExercisePicker
                      state={state}
                      activeTarget={activeTarget}
                      onCommit={(list) => {
                        const target = resolveTarget(state, activeTarget);
                        if (!target) { toast("Selecione um bloco antes de adicionar exercícios."); return; }
                        list.forEach((ex) => {
                          dispatch({ type: "ADD_EXERCISE", sessionId: target.sessionId, blockId: target.blockId, exercise: ex });
                        });
                        setPickerOpen(false);
                      }}
                    />
                  </div>
                </SheetContent>

              </Sheet>
              <button className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted" aria-label="Mais">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 md:px-8">
          {/* Name / description / Configurações */}
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-1">
              <div className="group relative rounded-lg border border-border/50 bg-card/40 px-4 py-3 transition hover:border-border">
                <Input
                  value={state.name}
                  onChange={(e) => dispatch({ type: "SET_META", patch: { name: e.target.value } })}
                  placeholder={nameLabel}
                  className="h-auto border-0 bg-transparent p-0 text-xl font-semibold tracking-tight text-foreground placeholder:text-foreground/60 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Pencil className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 opacity-0 transition group-hover:opacity-100" />
              </div>
              <Textarea
                value={state.description}
                onChange={(e) => dispatch({ type: "SET_META", patch: { description: e.target.value } })}
                placeholder="Adicionar descrição"
                className="min-h-[36px] resize-none border-0 bg-transparent px-4 py-1 text-base text-muted-foreground placeholder:text-muted-foreground/70 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Sheet open={configOpen} onOpenChange={setConfigOpen}>
              <SheetTrigger asChild>
                <button className="mt-1 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted">
                  <Settings className="h-4 w-4" />
                  Configurações
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader><SheetTitle>Configurações</SheetTitle></SheetHeader>
                <div className="mt-4 space-y-4">
                  {kind === "plan" && (
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <div className="text-sm font-medium">Periodizar</div>
                        <div className="text-xs text-muted-foreground">Variação de estímulos por semana</div>
                      </div>
                      <Switch checked={state.periodize} onCheckedChange={(v) => dispatch({ type: "SET_META", patch: { periodize: v } })} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="wt-level">Nível</Label>
                    <Input id="wt-level" value={state.level} onChange={(e) => dispatch({ type: "SET_META", patch: { level: e.target.value } })} placeholder="Iniciante, Intermediário, Avançado" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wt-goal">Objetivo</Label>
                    <Input id="wt-goal" value={state.goal} onChange={(e) => dispatch({ type: "SET_META", patch: { goal: e.target.value } })} placeholder="Hipertrofia, força, resistência..." />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Periodizar chip */}
          {kind === "plan" && (
            <div className="mt-5 border-y border-border/50 py-3">
              <button
                onClick={() => dispatch({ type: "SET_META", patch: { periodize: !state.periodize } })}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm ${state.periodize ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Plus className="h-4 w-4" /> Periodizar
              </button>
            </div>
          )}

          {/* Sessions row */}
          {kind === "plan" ? (
            <div className="mt-4 flex flex-wrap items-start gap-3">
              {state.sessions.map((s, i) => (
                <SessionCard
                  key={s.id}
                  index={i}
                  total={state.sessions.length}
                  session={s}
                  dispatch={dispatch}
                  onPickTargetBlock={(blockId) => {
                    setActiveTarget({ sessionId: s.id, blockId });
                    setPickerOpen(true);
                  }}
                  activeBlockId={activeTarget?.sessionId === s.id ? activeTarget.blockId : null}
                />
              ))}
              <button
                onClick={() => dispatch({ type: "ADD_SESSION" })}
                className="inline-flex h-11 min-w-[220px] items-center justify-center gap-2 rounded-full border border-dashed border-border/70 px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                <Plus className="h-4 w-4" /> Adicionar sessão
              </button>
            </div>
          ) : (
            <div className="mt-4 max-w-md space-y-3">
              {state.sessions[0].blocks.map((b, bi) => (
                <BlockCard
                  key={b.id}
                  sessionId={state.sessions[0].id}
                  index={bi}
                  total={state.sessions[0].blocks.length}
                  block={b}
                  dispatch={dispatch}
                  onPickTarget={() => {
                    setActiveTarget({ sessionId: state.sessions[0].id, blockId: b.id });
                    setPickerOpen(true);
                  }}
                  isActive={activeTarget?.blockId === b.id}
                />
              ))}
              <AddBlockButton
                sessionId={state.sessions[0].id}
                dispatch={dispatch}
                size="lg"
              />
            </div>
          )}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

function SessionCard({
  session, index, total, dispatch, onPickTargetBlock, activeBlockId,
}: {
  session: Session; index: number; total: number;
  dispatch: React.Dispatch<Action>;
  onPickTargetBlock: (blockId: string) => void;
  activeBlockId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const displayName = session.label;
  const letter = (displayName.replace(/^Treino\s+/i, "").trim()[0] ?? displayName.trim()[0] ?? "?").toUpperCase();
  void index; void total;

  function startEdit() {
    setEditing(true);
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
  }

  return (
    <div className="w-[360px] rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[oklch(0.92_0.19_115)]/15 text-xs font-bold text-[oklch(0.92_0.19_115)]">
          {letter}
        </span>
        {editing ? (
          <input
            ref={inputRef}
            value={displayName}
            onChange={(e) => dispatch({ type: "RENAME_SESSION", sessionId: session.id, label: e.target.value })}
            onBlur={() => { if (!session.label.trim()) dispatch({ type: "RENAME_SESSION", sessionId: session.id, label: "Treino" }); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-foreground outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">{displayName || "Sem nome"}</span>
        )}
        <button
          onClick={startEdit}
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground/70 hover:bg-muted hover:text-foreground"
          aria-label="Editar nome"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => dispatch({ type: "DUPLICATE_SESSION", sessionId: session.id })}
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground/70 hover:bg-muted hover:text-foreground"
          aria-label="Duplicar sessão"
          title="Duplicar sessão"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={() => dispatch({ type: "REMOVE_SESSION", sessionId: session.id })}
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground/70 hover:bg-muted hover:text-destructive"
          aria-label="Remover sessão"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>


      <div className="mt-4 space-y-2">
        {(() => {
          const visibleBlocks = session.blocks.filter((b) => b.color || b.exercises.length > 0);
          return (
            <>
              {visibleBlocks.length === 0 && (
                <button
                  onClick={() => onPickTargetBlock(session.blocks[0].id)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/30 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  <Plus className="h-4 w-4" /> Adicionar exercício
                </button>
              )}

              {visibleBlocks.map((b, bi, arr) => (
                <BlockCard
                  key={b.id}
                  sessionId={session.id}
                  index={bi}
                  total={arr.length}
                  block={b}
                  dispatch={dispatch}
                  onPickTarget={() => onPickTargetBlock(b.id)}
                  isActive={activeBlockId === b.id}
                />
              ))}

              <AddBlockButton sessionId={session.id} dispatch={dispatch} size="lg" />
            </>
          );
        })()}
      </div>



    </div>
  );
}

function BlockCard({
  block, sessionId, index, total, dispatch, onPickTarget, isActive,
}: {
  block: Block; sessionId: string; index: number; total: number;
  dispatch: React.Dispatch<Action>;
  onPickTarget: () => void;
  isActive: boolean;
}) {
  const color = block.color ?? "hsl(var(--muted-foreground))";
  const hasExercises = block.exercises.length > 0;
  return (
    <div
      className={`overflow-hidden rounded-lg border ${isActive ? "ring-1 ring-primary/40" : ""} bg-background/40`}
      style={{ borderColor: isActive ? undefined : `${color}55` }}
    >
      <div
        className="px-3 pt-3 pb-2"
        style={{ backgroundColor: `${color}14` }}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span
            className="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wide"
            style={{ color }}
          >
            {block.label}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {block.exercises.length} {block.exercises.length === 1 ? "ex" : "exs"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Ações do bloco"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => dispatch({ type: "REMOVE_BLOCK", sessionId, blockId: block.id })}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remover bloco
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
        {block.description && !hasExercises && (
          <p className="mt-1 pl-6 text-xs text-muted-foreground">{block.description}</p>
        )}
      </div>

      <div className="space-y-2 border-t border-border/50 p-3">

        {block.exercises.map((e, ei) => (
          <ExerciseRow
            key={e.id}
            item={e}
            index={ei}
            total={block.exercises.length}
            onChange={(patch) => dispatch({ type: "UPDATE_EXERCISE", sessionId, blockId: block.id, exerciseId: e.id, patch })}
            onRemove={() => dispatch({ type: "REMOVE_EXERCISE", sessionId, blockId: block.id, exerciseId: e.id })}
            onUp={() => dispatch({ type: "MOVE_EXERCISE", sessionId, blockId: block.id, exerciseId: e.id, dir: -1 })}
            onDown={() => dispatch({ type: "MOVE_EXERCISE", sessionId, blockId: block.id, exerciseId: e.id, dir: 1 })}
          />
        ))}
        <button
          onClick={onPickTarget}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Adicionar exercício
        </button>
      </div>
    </div>
  );
}


function ExerciseRow({
  item, index, total, onChange, onRemove, onUp, onDown,
}: {
  item: ExerciseItem; index: number; total: number;
  onChange: (patch: Partial<ExerciseItem>) => void;
  onRemove: () => void;
  onUp: () => void; onDown: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
          <Dumbbell className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 truncate text-sm font-medium">{item.name}</span>
        <ReorderButtons onUp={onUp} onDown={onDown} canUp={index > 0} canDown={index < total - 1} small />
        <button
          onClick={onRemove}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
          aria-label="Remover exercício"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <NumField label="Séries" value={item.sets} onChange={(v) => onChange({ sets: v })} />
        <TextField label="Reps" value={item.reps} onChange={(v) => onChange({ reps: v })} placeholder="10" />
        <NumField label="Descanso (s)" value={item.rest_seconds} onChange={(v) => onChange({ rest_seconds: v })} />
        <TextField label="Carga" value={item.load} onChange={(v) => onChange({ load: v })} placeholder="—" />
      </div>
      <Textarea
        value={item.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Observações (opcional)"
        className="mt-2 min-h-[36px] text-xs"
      />
    </div>
  );
}

function ReorderButtons({ onUp, onDown, canUp, canDown, small = false }: {
  onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean; small?: boolean;
}) {
  const sz = small ? "h-6 w-6" : "h-7 w-7";
  return (
    <div className="flex items-center">
      <button onClick={onUp} disabled={!canUp}
        className={`grid ${sz} place-items-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30`}
        aria-label="Mover para cima">
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDown} disabled={!canDown}
        className={`grid ${sz} place-items-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30`}
        aria-label="Mover para baixo">
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
      <Input
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="h-8 text-sm"
      />
    </label>
  );
}
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
    </label>
  );
}

/* ---------- Side panel ---------- */

type ExerciseCatalog = {
  id: number;
  name: string;
  group: string | null;
  difficulty: string | null;
  image_path: string | null;
  muscles_primary: string[];
  muscles_secondary: string[];
};

function SidePanel({
  kind, state, dispatch, activeTarget, onPicked,
}: {
  kind: EditorKind;
  state: State;
  dispatch: React.Dispatch<Action>;
  activeTarget: { sessionId: string; blockId: string } | null;
  onPicked?: () => void;
}) {
  const [tab, setTab] = useState<"exercicios" | "config">("exercicios");
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "exercicios" | "config")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="exercicios">Selecionar exercícios</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="exercicios" className="mt-3">
          <ExercisePicker
            state={state}
            activeTarget={activeTarget}
            onCommit={(list) => {
              const target = resolveTarget(state, activeTarget);
              if (!target) {
                toast("Selecione um bloco antes de adicionar exercícios.");
                return;
              }
              list.forEach((ex) => {
                dispatch({ type: "ADD_EXERCISE", sessionId: target.sessionId, blockId: target.blockId, exercise: ex });
              });
              onPicked?.();
            }}
          />
        </TabsContent>

        <TabsContent value="config" className="mt-3 space-y-4">
          {kind === "plan" && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">Periodizar</div>
                <div className="text-xs text-muted-foreground">Variação de estímulos por semana</div>
              </div>
              <Switch checked={state.periodize} onCheckedChange={(v) => dispatch({ type: "SET_META", patch: { periodize: v } })} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="wt-level">Nível</Label>
            <Input id="wt-level" value={state.level} onChange={(e) => dispatch({ type: "SET_META", patch: { level: e.target.value } })} placeholder="Iniciante, Intermediário, Avançado" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wt-goal">Objetivo</Label>
            <Input id="wt-goal" value={state.goal} onChange={(e) => dispatch({ type: "SET_META", patch: { goal: e.target.value } })} placeholder="Hipertrofia, força, resistência..." />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function resolveTarget(state: State, active: { sessionId: string; blockId: string } | null) {
  if (active) {
    const s = state.sessions.find(x => x.id === active.sessionId);
    const b = s?.blocks.find(x => x.id === active.blockId);
    if (s && b) return { sessionId: s.id, blockId: b.id };
  }
  const s = state.sessions[0];
  const b = s?.blocks[0];
  if (s && b) return { sessionId: s.id, blockId: b.id };
  return null;
}

function difficultyStyle(d: string | null | undefined) {
  const k = (d ?? "").toLowerCase();
  if (k.startsWith("inici")) return { dot: "bg-emerald-400", text: "text-emerald-400", label: "Iniciante" };
  if (k.startsWith("inter")) return { dot: "bg-amber-400",   text: "text-amber-400",   label: "Intermediário" };
  if (k.startsWith("avan"))  return { dot: "bg-rose-400",    text: "text-rose-400",    label: "Avançado" };
  return { dot: "bg-muted-foreground", text: "text-muted-foreground", label: d ?? "—" };
}


function ExercisePicker({
  state, activeTarget, onCommit,
}: {
  state: State;
  activeTarget: { sessionId: string; blockId: string } | null;
  onCommit: (list: { id: number | null; name: string }[]) => void;
}) {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [customPicks, setCustomPicks] = useState<{ id: null; name: string }[]>([]);
  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ["exercises-catalog"],
    queryFn: async (): Promise<ExerciseCatalog[]> => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, difficulty, image_path, muscles_primary, muscles_secondary, exercise_groups(name)")
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((r) => {
        type GroupRef = { name: string | null } | { name: string | null }[] | null;
        const g = r.exercise_groups as GroupRef;
        const name = Array.isArray(g) ? (g[0]?.name ?? null) : (g?.name ?? null);
        return {
          id: r.id as number,
          name: r.name as string,
          group: name,
          difficulty: (r.difficulty as string | null) ?? null,
          image_path: (r.image_path as string | null) ?? null,
          muscles_primary: (r.muscles_primary as string[] | null) ?? [],
          muscles_secondary: (r.muscles_secondary as string[] | null) ?? [],
        };
      });
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return catalog;
    return catalog.filter(e => e.name.toLowerCase().includes(s) || (e.group ?? "").toLowerCase().includes(s));
  }, [q, catalog]);

  const target = resolveTarget(state, activeTarget);
  const targetLabel = target
    ? (() => {
        const s = state.sessions.find(x => x.id === target.sessionId)!;
        const b = s.blocks.find(x => x.id === target.blockId)!;
        return s.label === "__single__" ? b.label : `${s.label} · ${b.label}`;
      })()
    : "—";

  const totalSelected = selectedIds.size + customPicks.length;

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCommit = () => {
    if (totalSelected === 0) return;
    const picks: { id: number | null; name: string }[] = [];
    catalog.forEach((e) => {
      if (selectedIds.has(e.id)) picks.push({ id: e.id, name: e.name });
    });
    customPicks.forEach((c) => picks.push(c));
    onCommit(picks);
    setSelectedIds(new Set());
    setCustomPicks([]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-5 mt-3 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
        <span>Adicionando em <strong className="font-semibold text-foreground">{targetLabel}</strong></span>
      </div>
      <div className="flex shrink-0 items-center gap-2 px-5 pb-2.5 pt-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar exercício…"
            className="h-10 pl-9 pr-3"
          />
        </div>
        <button
          type="button"
          aria-label="Filtros"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>
      <div className="border-t border-border" />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="grid place-items-center py-8"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="mx-2 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Nenhum exercício encontrado. Cadastre em Exercícios ou digite abaixo.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => {
              const diff = difficultyStyle(e.difficulty);
              const groups = [e.group, ...e.muscles_secondary].filter(Boolean) as string[];
              const isSelected = selectedIds.has(e.id);
              return (
                <button
                  key={e.id}
                  onClick={() => toggle(e.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.99] ${
                    isSelected
                      ? "border-primary/60 bg-primary/5"
                      : "border-border bg-card hover:border-foreground/30 hover:bg-muted/60"
                  }`}
                >
                  <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                    {e.image_path ? (
                      <img src={e.image_path} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <Dumbbell className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="pointer-events-none absolute left-1/2 top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-card bg-primary shadow-sm">
                      <Play className="ml-px h-2.5 w-2.5 fill-primary-foreground text-primary-foreground" />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="truncate text-sm font-medium text-foreground">{e.name}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className={`inline-flex items-center gap-1 font-medium ${diff.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${diff.dot}`} />
                        {diff.label}
                      </span>
                      {groups.slice(0, 3).map((g, i) => (
                        <span key={`${g}-${i}`} className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="text-muted-foreground/50">·</span>
                          <span className={i === 0 ? "" : "italic"}>{g}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-transparent text-transparent"
                    }`}
                    aria-hidden
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-border">
        <CustomExerciseInput onAdd={(name) => setCustomPicks((prev) => [...prev, { id: null, name }])} />
      </div>
      {totalSelected > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-primary/60 text-sm font-bold text-primary">
              {totalSelected}
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-foreground">exercícios selecionados</div>
              <button
                type="button"
                onClick={() => { setSelectedIds(new Set()); setCustomPicks([]); }}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Limpar seleção
              </button>
            </div>
          </div>
          <button
            onClick={handleCommit}
            className="inline-flex h-10 items-center gap-1 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
}




function CustomExerciseInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Adicionar exercício livre"
        className="h-9"
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) { onAdd(name.trim()); setName(""); }
        }}
      />
      <button
        onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(""); } }}
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-110"
      >
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </div>
  );
}

function AddBlockButton({
  sessionId, dispatch, size = "sm",
}: {
  sessionId: string;
  dispatch: React.Dispatch<Action>;
  size?: "sm" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const cls = size === "lg"
    ? "inline-flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-border/70 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
    : "inline-flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-border/70 py-2 text-xs font-medium text-muted-foreground hover:bg-muted";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cls}>
          <Plus className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} /> Adicionar bloco
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" sideOffset={8} collisionPadding={16} className="w-[320px] p-2 overflow-y-auto" style={{ maxHeight: "var(--radix-popover-content-available-height)" }}>
        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Escolher tipo de bloco
        </div>
        <div className="space-y-0.5">
          {BLOCK_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                dispatch({ type: "ADD_BLOCK", sessionId, preset: p });
                setOpen(false);
              }}
              className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold" style={{ color: p.color }}>{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.description}</div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
