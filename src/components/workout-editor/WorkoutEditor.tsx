import { useEffect, useMemo, useReducer, useRef, useState, useDeferredValue } from "react";
import { useNavigate, useBlocker } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, ChevronUp, Copy, GripVertical, Loader2, MoreHorizontal, CheckSquare,
  Play, Plus, Save, Search, Settings, Trash2, X, Dumbbell, Pencil, Check, Filter, ChevronLeft, ChevronRight, Clock, BarChart3, Hash, AlertCircle, AlertTriangle, Info, Sparkles, FileText, LayoutTemplate,
  CalendarDays, AtSign, CheckCircle2, Archive, FileDown,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/lib/scope";
import { duplicatePlan, duplicateTemplateAsPlan, saveAsTemplate } from "@/lib/workout-templates.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export type EditorKind = "plan" | "template";

type SetType =
  | "normal"
  | "aquecimento"
  | "ativacao"
  | "drop"
  | "falha";

const SET_TYPE_OPTIONS: {
  key: SetType;
  label: string;
  badge: string;
  description: string;
  fg: string;
  bg: string;
}[] = [
  { key: "normal", label: "Normal", badge: "1", description: "Série padrão de trabalho com carga efetiva.", fg: "hsl(var(--foreground))", bg: "hsl(var(--muted))" },
  { key: "aquecimento", label: "Aquecimento", badge: "Aquec.", description: "Série leve para preparar os músculos. Use carga baixa e foque no movimento.", fg: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.15)" },
  { key: "ativacao", label: "Ativação", badge: "Ativ.", description: "Série intermediária para ativar o músculo antes das séries efetivas.", fg: "hsl(199 89% 55%)", bg: "hsl(199 89% 55% / 0.15)" },
  { key: "drop", label: "Drop Set", badge: "Drop", description: "Ao completar as reps, reduza a carga sem descanso e continue.", fg: "rgb(168, 85, 247)", bg: "rgba(168, 85, 247, 0.15)" },
  { key: "falha", label: "Até a Falha", badge: "Falha", description: "Faça o máximo de reps que conseguir com boa forma. Pare quando não conseguir mais.", fg: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.15)" },
];

function setTypeMeta(k: SetType | undefined) {
  return SET_TYPE_OPTIONS.find((o) => o.key === (k ?? "normal")) ?? SET_TYPE_OPTIONS[0];
}

type ExerciseItem = {
  id: string; // client id
  exercise_id: number | null;
  name: string;
  sets: number | null;
  reps: string;
  rest_seconds: number | null;
  load: string; // carga sugerida
  use_load: boolean; // "Usar carga"
  notes: string;
  set_types?: SetType[];
  reps_by_set?: string[];
  rest_by_set?: number[];
  load_by_set?: string[];
  count_by_set?: string[];
  muscles_primary?: string[];
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
  duration_weeks: number | null;
  start_date: string | null; // ISO YYYY-MM-DD
  sessions: Session[]; // for template kind, always exactly one session
};

const uid = () => Math.random().toString(36).slice(2, 10);

const emptyBlock = (idx: number): Block => ({
  id: uid(),
  label: "",
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
  | { type: "REPLACE_SESSIONS"; sessions: Session[] }

  | { type: "ADD_SESSION" }
  | { type: "REMOVE_SESSION"; sessionId: string }
  | { type: "MOVE_SESSION"; sessionId: string; dir: -1 | 1 }
  | { type: "DUPLICATE_SESSION"; sessionId: string }
  | { type: "RENAME_SESSION"; sessionId: string; label: string }
  | { type: "ADD_BLOCK"; sessionId: string; preset?: BlockPreset }
  | { type: "REMOVE_BLOCK"; sessionId: string; blockId: string }
  | { type: "MOVE_BLOCK"; sessionId: string; blockId: string; dir: -1 | 1 }
  | { type: "RENAME_BLOCK"; sessionId: string; blockId: string; label: string }
  | { type: "ADD_EXERCISE"; sessionId: string; blockId: string; exercise: { id: number | null; name: string; muscles_primary?: string[] } }
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
    case "REPLACE_SESSIONS":
      return { ...state, sessions: action.sessions };

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
                      sets: 3, reps: "10", rest_seconds: 60, load: "", use_load: true, notes: "",
                      muscles_primary: action.exercise.muscles_primary,
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

export function WorkoutEditor({
  kind,
  editSlug,
  alunoId,
}: {
  kind: EditorKind;
  editSlug?: string;
  alunoId?: string | null;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const scope = useScope();
  const scopeBase = scope === "academia" ? "/dashboard/academia/treinos" : "/dashboard/personal/treinos";
  const isEdit = Boolean(editSlug);

  const initial: State = useMemo(() => ({
    name: "",
    description: "",
    level: "",
    goal: "",
    periodize: false,
    duration_weeks: null,
    start_date: null,
    sessions: kind === "plan"
      ? [emptySession(0)]
      : [{ id: uid(), label: "__single__", blocks: [emptyBlock(0)] }],
  }), [kind]);

  const [state, rawDispatch] = useReducer(reducer, initial);
  const [activeTarget, setActiveTarget] = useState<{ sessionId: string; blockId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const hydratedRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suppressDirtyRef = useRef(true);
  const [touched, setTouched] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const dispatch = useMemo<React.Dispatch<Action>>(() => (action) => {
    if (!suppressDirtyRef.current) setTouched(true);
    rawDispatch(action);
  }, []);

  useEffect(() => {
    if (loadingEdit) return;
    const id = setTimeout(() => { suppressDirtyRef.current = false; }, 0);
    return () => clearTimeout(id);
  }, [loadingEdit]);

  const backHref = kind === "plan"
    ? (alunoId ? `/dashboard/${scope === "academia" ? "academia" : "personal"}/alunos/${alunoId}` : scopeBase)
    : scopeBase;

  const isDirty = touched && !saving;

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    withResolver: true,
    enableBeforeUnload: () => isDirty,
  });

  useEffect(() => {
    if (blocker.status === "blocked") setLeaveOpen(true);
  }, [blocker.status]);

  const handleBack = () => {
    navigate({ to: backHref });
  };

  useEffect(() => {
    if (!editSlug || hydratedRef.current) return;
    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      try {
        const { data: tpl, error } = await supabase
          .from("workout_templates")
          .select(
            "id, name, description, kind, level, goal, periodize, duration_weeks, start_date, workout_template_exercises ( id, exercise_id, sets, reps, load, rest_seconds, notes, position, block_position, session_position, block_label, session_label, per_set, exercises ( name, muscles_primary ) )",
          )
          .eq("slug", editSlug)
          .maybeSingle();
        if (error) throw error;
        if (!tpl || cancelled) return;

        const exs = [...((tpl as any).workout_template_exercises ?? [])].sort(
          (a: any, b: any) => a.position - b.position,
        );
        const sessionMap = new Map<number, Map<number, { label: string; exercises: ExerciseItem[] }>>();
        const sessionLabels = new Map<number, string>();
        for (const e of exs) {
          const sPos = e.session_position ?? 0;
          const bPos = e.block_position ?? 0;
          if (!sessionMap.has(sPos)) sessionMap.set(sPos, new Map());
          const blocks = sessionMap.get(sPos)!;
          if (!blocks.has(bPos)) blocks.set(bPos, { label: e.block_label ?? "", exercises: [] });
          const blk = blocks.get(bPos)!;
          const ps = (e as any).per_set as
            | { types?: string[]; reps?: string[]; rest?: number[]; load?: string[] }
            | null
            | undefined;
          blk.exercises.push({
            id: uid(),
            exercise_id: e.exercise_id,
            name: (e as any).exercises?.name ?? "Exercício",
            sets: e.sets,
            reps: e.reps ?? "",
            rest_seconds: e.rest_seconds,
            load: e.load ?? "",
            notes: e.notes ?? "",
            set_types: Array.isArray(ps?.types) ? (ps!.types as SetType[]) : undefined,
            reps_by_set: Array.isArray(ps?.reps) ? ps!.reps : undefined,
            rest_by_set: Array.isArray(ps?.rest) ? ps!.rest : undefined,
            load_by_set: Array.isArray(ps?.load) ? ps!.load : undefined,
            count_by_set: Array.isArray((ps as any)?.counts) ? (ps as any).counts : undefined,
            muscles_primary: Array.isArray((e as any).exercises?.muscles_primary) ? (e as any).exercises.muscles_primary : undefined,
          });
          if (e.session_label) sessionLabels.set(sPos, e.session_label);
        }

        const sessions: Session[] = [];
        const sKeys = [...sessionMap.keys()].sort((a, b) => a - b);
        if (sKeys.length === 0) {
          sessions.push(
            kind === "plan"
              ? emptySession(0)
              : { id: uid(), label: "__single__", blocks: [emptyBlock(0)] },
          );
        } else {
          for (const sPos of sKeys) {
            const bMap = sessionMap.get(sPos)!;
            const bKeys = [...bMap.keys()].sort((a, b) => a - b);
            sessions.push({
              id: uid(),
              label:
                tpl.kind === "plan"
                  ? sessionLabels.get(sPos) ?? `Treino ${String.fromCharCode(65 + sPos)}`
                  : "__single__",
              blocks: bKeys.map((bPos) => {
                const b = bMap.get(bPos)!;
                return { id: uid(), label: b.label, exercises: b.exercises };
              }),
            });
          }
        }

        dispatch({
          type: "SET_META",
          patch: {
            name: tpl.name ?? "",
            description: tpl.description ?? "",
            level: tpl.level ?? "",
            goal: tpl.goal ?? "",
            periodize: Boolean(tpl.periodize),
            duration_weeks: (tpl as any).duration_weeks ?? null,
            start_date: (tpl as any).start_date ?? null,
          },
        });
        // Replace sessions by dispatching a full swap: use dispatch pattern below
        // Since reducer doesn't have SET_SESSIONS, do it via a hack: we set state via
        // multiple actions. Easier: use a dedicated action.
        dispatch({ type: "REPLACE_SESSIONS", sessions } as unknown as Action);
        setTemplateId(tpl.id);
        hydratedRef.current = true;
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar o modelo para edição");
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editSlug, kind]);

  const title = isEdit
    ? kind === "plan"
      ? "Editar modelo de plano"
      : "Editar modelo de treino"
    : kind === "plan"
      ? "Criar modelo de plano"
      : "Criar modelo de treino";
  const nameLabel = kind === "plan" ? "Nome do plano" : "Nome do treino";

  const canSave = state.name.trim().length > 0 && !saving && !loadingEdit;

  async function handleSave(opts: { skipNavigate?: boolean } = {}): Promise<boolean> {
    if (!canSave) return false;

    // Bloqueia salvar se alguma sessão está sem exercícios
    const emptySession = state.sessions.find(
      (s) => s.blocks.every((b) => b.exercises.length === 0),
    );
    if (emptySession) {
      const label =
        kind === "plan"
          ? emptySession.label && emptySession.label !== "__single__"
            ? emptySession.label
            : "Treino"
          : state.name.trim() || "Treino";
      toast.warning("Sessão sem exercícios", {
        description: `Adicione exercícios ou remova: ${label}.`,
      });
      return false;
    }

    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Sessão expirada");

      let workingTemplateId = templateId;

      if (isEdit && workingTemplateId) {
        const { error: uErr } = await supabase
          .from("workout_templates")
          .update({
            name: state.name.trim(),
            description: state.description.trim() || null,
            periodize: state.periodize,
            level: state.level || null,
            goal: state.goal || null,
            duration_weeks: state.duration_weeks ?? null,
            start_date: state.start_date ?? null,
          } as never)
          .eq("id", workingTemplateId);
        if (uErr) throw uErr;
        const { error: dErr } = await supabase
          .from("workout_template_exercises")
          .delete()
          .eq("template_id", workingTemplateId);
        if (dErr) throw dErr;
      } else {
        const { data: tpl, error: tErr } = await supabase
          .from("workout_templates")
          .insert({
            name: state.name.trim(),
            description: state.description.trim() || null,
            kind,
            periodize: state.periodize,
            level: state.level || null,
            goal: state.goal || null,
            duration_weeks: state.duration_weeks ?? null,
            start_date: state.start_date ?? null,
            personal_id: userRes.user.id,
            aluno_id: alunoId ?? null,
          } as never)
          .select("id")
          .single();
        if (tErr || !tpl) throw tErr ?? new Error("Falha ao criar modelo");
        workingTemplateId = tpl.id;
      }

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
        per_set: {
          types?: SetType[];
          reps?: string[];
          rest?: number[];
          load?: string[];
        } | null;
      }> = [];

      let flat = 0;
      state.sessions.forEach((s, si) => {
        s.blocks.forEach((b, bi) => {
          b.exercises.forEach((e) => {
            const perSet: {
              types?: SetType[];
              reps?: string[];
              rest?: number[];
              load?: string[];
              counts?: string[];
            } = {};
            if (Array.isArray(e.set_types) && e.set_types.length > 0) perSet.types = e.set_types;
            if (Array.isArray(e.reps_by_set) && e.reps_by_set.length > 0) perSet.reps = e.reps_by_set;
            if (Array.isArray(e.rest_by_set) && e.rest_by_set.length > 0) perSet.rest = e.rest_by_set;
            if (Array.isArray(e.load_by_set) && e.load_by_set.length > 0) perSet.load = e.load_by_set;
            if (Array.isArray(e.count_by_set) && e.count_by_set.length > 0) perSet.counts = e.count_by_set;
            rows.push({
              template_id: workingTemplateId!,
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
              per_set: Object.keys(perSet).length > 0 ? perSet : null,
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

      if (alunoId && !isEdit && workingTemplateId) {
        const { error: swErr } = await supabase.from("student_workouts").insert({
          personal_id: userRes.user.id,
          aluno_id: alunoId,
          template_id: workingTemplateId,
          name: state.name.trim(),
        } as never);
        if (swErr) throw swErr;
      }

      await qc.invalidateQueries({ queryKey: ["workout_templates"] });
      await qc.invalidateQueries({ queryKey: ["modelo-detail"] });
      if (alunoId) {
        await qc.invalidateQueries({ queryKey: ["aluno-student-workouts", alunoId] });
      }
      toast.success(isEdit ? "Modelo atualizado" : alunoId ? "Plano criado para o aluno" : "Modelo salvo");
      if (!opts.skipNavigate) {
        const alunoBase = scope === "academia" ? "/dashboard/academia/alunos/$alunoId" : "/dashboard/personal/alunos/$alunoId";
        if (alunoId) {
          navigate({ to: alunoBase, params: { alunoId } });
        } else {
          navigate({ to: scopeBase });
        }
      }
      return true;
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
      return false;
    } finally {
      setSaving(false);
    }
  }



  const [pickerOpen, setPickerOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Fluxo "Partir de um modelo" — só faz sentido criando plano novo pra aluno
  const canStartFromTemplate = kind === "plan" && !isEdit && !touched && !!alunoId;

  const templatesQuery = useQuery({
    queryKey: ["workout_templates", "picker", "template"],
    enabled: templatePickerOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("id, slug, name, description, level, goal, workout_template_exercises(count)")
        .eq("kind", "template")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const duplicateFn = useServerFn(duplicateTemplateAsPlan);
  const duplicateMut = useMutation({
    mutationFn: (sourceSlug: string) =>
      duplicateFn({ data: { sourceSlug, alunoId: alunoId! } }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["workout_templates"] });
      if (alunoId) qc.invalidateQueries({ queryKey: ["aluno-student-workouts", alunoId] });
      toast.success("Plano criado a partir do modelo");
      setTemplatePickerOpen(false);
      suppressDirtyRef.current = true; // bypass unsaved-changes blocker
      navigate({
        to: `${scopeBase}/editar/$slug` as "/dashboard/personal/treinos/editar/$slug",
        params: { slug: created.slug },
      });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao copiar modelo"),
  });

  const saveAsTemplateFn = useServerFn(saveAsTemplate);
  const saveAsTemplateMut = useMutation({
    mutationFn: () => {
      if (!editSlug) throw new Error("Salve o plano antes de convertê-lo em modelo");
      return saveAsTemplateFn({ data: { sourceSlug: editSlug } });
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["workout_templates"] });
      toast.success("Modelo criado", {
        description: "Disponível na biblioteca de modelos da academia.",
        action: {
          label: "Ver modelo",
          onClick: () =>
            navigate({
              to: `${scopeBase}/modelo/$modeloId` as "/dashboard/personal/treinos/modelo/$modeloId",
              params: { modeloId: created.slug },
            }),
        },
      });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao salvar como modelo"),
  });

  const canSaveAsTemplate = kind === "plan" && isEdit && !isDirty;

  // Header meta (nome do aluno + status do plano)
  const planHeaderQuery = useQuery({
    queryKey: ["plan-header", editSlug, alunoId, templateId],
    enabled: isEdit && kind === "plan" && !!alunoId && !!templateId,
    queryFn: async () => {
      const [alunoRes, swRes] = await Promise.all([
        supabase.from("alunos").select("id, full_name").eq("id", alunoId!).maybeSingle(),
        supabase.from("student_workouts").select("archived_at").eq("template_id", templateId!),
      ]);
      if (alunoRes.error) throw alunoRes.error;
      if (swRes.error) throw swRes.error;
      const rows = swRes.data ?? [];
      return {
        alunoNome: alunoRes.data?.full_name ?? null,
        isActive: rows.length === 0 ? true : rows.some((r: any) => !r.archived_at),
        hasSessions: rows.length > 0,
      };
    },
  });

  // Agregados de volume do plano (soma total de séries + grupos primários)
  const planVolume = useMemo(() => {
    const perMuscle = new Map<string, number>();
    let totalSets = 0;
    for (const s of state.sessions) {
      for (const b of s.blocks) {
        for (const e of b.exercises) {
          const sets = e.sets ?? 0;
          totalSets += sets;
          const muscles = (e.muscles_primary ?? []).filter(Boolean);
          if (muscles.length === 0) continue;
          for (const m of muscles) {
            perMuscle.set(m, (perMuscle.get(m) ?? 0) + sets);
          }
        }
      }
    }
    const groups = [...perMuscle.entries()]
      .map(([muscle, sets]) => ({ muscle, sets }))
      .sort((a, b) => b.sets - a.sets);
    const sessionsCount = state.sessions.filter(
      (s) => s.blocks.some((b) => b.exercises.length > 0),
    ).length || 1;
    return {
      totalSets,
      groupsCount: groups.length,
      perSession: Math.round(totalSets / sessionsCount),
      groups,
      max: groups[0]?.sets ?? 0,
    };
  }, [state.sessions]);

  const alunoProfileHref =
    alunoId
      ? scope === "academia"
        ? `/dashboard/academia/alunos/${alunoId}`
        : `/dashboard/personal/alunos/${alunoId}`
      : null;

  const formattedStartDate = state.start_date
    ? new Date(`${state.start_date}T12:00:00`).toLocaleDateString("pt-BR")
    : null;
  // Plan-only sidebar actions
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const duplicatePlanFn = useServerFn(duplicatePlan);
  const duplicatePlanMut = useMutation({
    mutationFn: () => {
      if (!editSlug) throw new Error("Salve o plano antes de duplicar");
      return duplicatePlanFn({ data: { sourceSlug: editSlug } });
    },
    onSuccess: (res) => {
      if (alunoId) qc.invalidateQueries({ queryKey: ["aluno-student-workouts", alunoId] });
      toast.success("Plano duplicado", { description: "Uma cópia editável foi criada." });
      navigate({
        to: `${scopeBase}/plano/$slug` as "/dashboard/personal/treinos/plano/$slug",
        params: { slug: res.slug },
      });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao duplicar plano"),
  });
  const archiveMut = useMutation({
    mutationFn: async () => {
      if (!alunoId || !templateId) throw new Error("Plano sem aluno vinculado");
      const { error } = await supabase
        .from("student_workouts")
        .update({ archived_at: new Date().toISOString() })
        .eq("aluno_id", alunoId)
        .eq("template_id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano arquivado");
      qc.invalidateQueries({ queryKey: ["plan-header"] });
      if (alunoId) {
        qc.invalidateQueries({ queryKey: ["aluno-student-workouts", alunoId] });
        navigate({
          to: (scope === "academia"
            ? "/dashboard/academia/alunos/$alunoId"
            : "/dashboard/personal/alunos/$alunoId") as "/dashboard/personal/alunos/$alunoId",
          params: { alunoId },
        });
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao arquivar"),
  });
  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!alunoId || !templateId) throw new Error("Plano sem aluno vinculado");
      const { error } = await supabase
        .from("student_workouts")
        .delete()
        .eq("aluno_id", alunoId)
        .eq("template_id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano excluído");
      if (alunoId) {
        qc.invalidateQueries({ queryKey: ["aluno-student-workouts", alunoId] });
        navigate({
          to: (scope === "academia"
            ? "/dashboard/academia/alunos/$alunoId"
            : "/dashboard/personal/alunos/$alunoId") as "/dashboard/personal/alunos/$alunoId",
          params: { alunoId },
        });
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao excluir"),
  });
  const handleExportPdf = () => { if (typeof window !== "undefined") window.print(); };

  return (

    <div className="min-h-screen bg-background text-foreground">
      <IconRail />
      <div className="pb-24 md:pl-[72px] md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronUp className="h-4 w-4 -rotate-90" />
                Voltar
              </button>
              <h1 className="truncate text-sm font-semibold md:text-base">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              {!state.name.trim() && !isEdit && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[oklch(0.75_0.18_60)]">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Adicione um nome
                </span>
              )}
              <button
                onClick={() => handleSave()}
                disabled={!canSave}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[oklch(0.92_0.19_115)] px-4 text-sm font-semibold text-[oklch(0.2_0.05_115)] hover:brightness-105 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted"
              >
                <CheckSquare className="h-4 w-4" />
                Selecionar exercícios
              </button>
              {kind === "plan" && isEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Mais ações"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onSelect={(e) => { e.preventDefault(); duplicatePlanMut.mutate(); }}
                      disabled={duplicatePlanMut.isPending || !editSlug}
                    >
                      {duplicatePlanMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => { e.preventDefault(); saveAsTemplateMut.mutate(); }}
                      disabled={!canSaveAsTemplate || saveAsTemplateMut.isPending}
                    >
                      {saveAsTemplateMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LayoutTemplate className="mr-2 h-4 w-4" />}
                      Salvar como Template
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleExportPdf(); }}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Exportar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => { e.preventDefault(); setArchiveConfirmOpen(true); }}
                      disabled={!alunoId || !templateId}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Arquivar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => { e.preventDefault(); setDeleteConfirmOpen(true); }}
                      disabled={!alunoId || !templateId}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </header>

        {/* Exercise picker sheet (controlled, triggered from sidebar or block "Adicionar exercício") */}
        <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
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
                  const sess = state.sessions.find((s) => s.id === target.sessionId);
                  const sessLabel = sess && sess.label && sess.label !== "__single__" ? sess.label : "treino";
                  toast.success(
                    `${list.length} ${list.length === 1 ? "exercício adicionado" : "exercícios adicionados"}`,
                    { description: `Em ${sessLabel}` },
                  );
                  setPickerOpen(false);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>


        <main className="px-3 py-4 sm:px-4 sm:py-5 md:px-6">
          <div className="w-full space-y-6">

            <div className="space-y-4">


          {canStartFromTemplate && (
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">Como você quer começar?</div>
                  <div className="text-xs text-muted-foreground">
                    Copie um modelo pronto e ajuste pro aluno, ou monte do zero.
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplatePickerOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
                >
                  <Copy className="h-4 w-4" />
                  Partir de um modelo
                </button>
              </div>
            </div>
          )}
          {/* Name / description */}
          {kind === "plan" ? (
            <div className="space-y-1">
              <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
                <div className="group relative flex-1 rounded-lg border border-border/50 bg-card/40 px-4 py-3 transition hover:border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40">
                  <Input
                    ref={nameInputRef}
                    value={state.name}
                    onChange={(e) => dispatch({ type: "SET_META", patch: { name: e.target.value } })}
                    placeholder={nameLabel}
                    className="h-auto border-0 bg-transparent p-0 pr-8 text-xl font-semibold tracking-tight text-foreground caret-primary placeholder:text-foreground/60 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Pencil className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 opacity-0 transition group-hover:opacity-100" />
                </div>

                {/* Metadata chips — mesma linha do nome */}
                <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                  {isEdit && alunoId && (
                    <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        disabled={loadingEdit}
                        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2.5 text-[11px] font-medium text-foreground hover:bg-muted"
                      >
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {state.duration_weeks
                          ? `${state.duration_weeks} ${state.duration_weeks === 1 ? "semana" : "semanas"}`
                          : "Definir duração"}
                        <Pencil className="h-3 w-3 text-muted-foreground/70" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56 space-y-3 p-3">
                      <div>
                        <Label className="text-xs">Duração (semanas)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={52}
                          value={state.duration_weeks ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const n = raw === "" ? null : Math.max(1, Math.min(52, parseInt(raw, 10) || 1));
                            dispatch({ type: "SET_META", patch: { duration_weeks: n } });
                          }}
                          className="mt-1 h-9"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[2, 4, 6, 8, 12].map((n) => (
                          <button
                            key={n}
                            onClick={() => dispatch({ type: "SET_META", patch: { duration_weeks: n } })}
                            className={`h-7 rounded-full border px-2.5 text-xs ${
                              state.duration_weeks === n
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      {state.duration_weeks !== null && (
                        <button
                          onClick={() => dispatch({ type: "SET_META", patch: { duration_weeks: null } })}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Limpar
                        </button>
                      )}
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        disabled={loadingEdit}
                        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2.5 text-[11px] font-medium text-foreground hover:bg-muted"
                      >
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {formattedStartDate ? `Início: ${formattedStartDate}` : "Definir início"}
                        <Pencil className="h-3 w-3 text-muted-foreground/70" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={state.start_date ? new Date(`${state.start_date}T12:00:00`) : undefined}
                        onSelect={(d) => {
                          if (!d) return;
                          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                          dispatch({ type: "SET_META", patch: { start_date: iso } });
                        }}
                        className="pointer-events-auto p-3"
                      />
                      {state.start_date && (
                        <div className="border-t border-border p-2">
                          <button
                            onClick={() => dispatch({ type: "SET_META", patch: { start_date: null } })}
                            className="w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            Limpar data
                          </button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                    </>
                  )}


                  <Sheet open={configOpen} onOpenChange={setConfigOpen}>
                    <SheetTrigger asChild>
                      <button className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2.5 text-[11px] font-medium text-foreground hover:bg-muted">
                        <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                        Configurações
                      </button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                      <SheetHeader><SheetTitle>Configurações</SheetTitle></SheetHeader>
                      <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div>
                            <div className="text-sm font-medium">Periodizar</div>
                            <div className="text-xs text-muted-foreground">Variação de estímulos por semana</div>
                          </div>
                          <Switch checked={state.periodize} onCheckedChange={(v) => dispatch({ type: "SET_META", patch: { periodize: v } })} />
                        </div>
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

                  {alunoProfileHref && planHeaderQuery.data?.alunoNome && (
                    <a
                      href={alunoProfileHref}
                      className="inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2.5 text-[11px] font-medium text-foreground hover:bg-muted"
                      title={`Ver perfil de ${planHeaderQuery.data.alunoNome}`}
                    >
                      <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{planHeaderQuery.data.alunoNome}</span>
                    </a>
                  )}

                  {isEdit && alunoId && planHeaderQuery.data && (
                    planHeaderQuery.data.isActive ? (
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[oklch(0.75_0.15_150)]/40 bg-[oklch(0.75_0.15_150)]/10 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-[oklch(0.75_0.15_150)]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <Archive className="h-3.5 w-3.5" />
                        Arquivado
                      </span>
                    )
                  )}
                </div>
              </div>

              <Textarea
                value={state.description}
                onChange={(e) => dispatch({ type: "SET_META", patch: { description: e.target.value } })}
                placeholder="Adicionar descrição"
                className="min-h-[36px] resize-none border-0 bg-transparent px-4 py-1 text-base text-muted-foreground placeholder:text-muted-foreground/70 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

          ) : (
            <>
              <div className="space-y-1">
                <Input
                  ref={kind === "template" ? nameInputRef : undefined}
                  value={state.name}
                  onChange={(e) => dispatch({ type: "SET_META", patch: { name: e.target.value } })}
                  placeholder="Nome do modelo (ex: Peito e Triceps — Hipertrofia)"
                  className="h-auto border-0 bg-transparent p-0 text-xl font-semibold tracking-tight text-foreground placeholder:text-muted-foreground/70 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Textarea
                  value={state.description}
                  onChange={(e) => dispatch({ type: "SET_META", patch: { description: e.target.value } })}
                  placeholder="Adicionar descrição"
                  className="min-h-[32px] resize-none border-0 bg-transparent p-0 text-base text-muted-foreground placeholder:text-muted-foreground/70 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Sheet open={configOpen} onOpenChange={setConfigOpen}>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader><SheetTitle>Configurações</SheetTitle></SheetHeader>
                  <div className="mt-4 space-y-4">
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
            </>
          )}

          {/* Periodizar chip + Volume */}
          {kind === "plan" && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-y border-border/50 py-3">
              <button
                onClick={() => dispatch({ type: "SET_META", patch: { periodize: !state.periodize } })}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm ${state.periodize ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Plus className="h-4 w-4" /> Periodizar
              </button>

              {planVolume.totalSets > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2.5 text-[11px] font-medium text-foreground hover:bg-muted">
                      <BarChart3 className="h-3.5 w-3.5 text-primary/80" />
                      <span className="font-semibold">{planVolume.totalSets}</span>
                      <span className="text-muted-foreground">séries · {planVolume.groupsCount} {planVolume.groupsCount === 1 ? "grupo" : "grupos"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-0">
                    <div className="border-b border-border px-4 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Volume do plano
                      </div>
                      <div className="mt-2 flex items-baseline gap-3 text-sm">
                        <span className="text-2xl font-bold text-foreground">{planVolume.totalSets}</span>
                        <span className="text-xs text-muted-foreground">séries</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-2xl font-bold text-foreground">{planVolume.groupsCount}</span>
                        <span className="text-xs text-muted-foreground">grupamentos</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-lg font-bold text-foreground">~{planVolume.perSession}</span>
                        <span className="text-xs text-muted-foreground">/sessão</span>
                      </div>
                    </div>
                    <div className="max-h-[300px] space-y-2 overflow-y-auto px-4 py-3">
                      {planVolume.groups.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Adicione exercícios com grupamento definido para ver o detalhamento.
                        </p>
                      )}
                      {planVolume.groups.map((g) => {
                        const pct = planVolume.totalSets > 0 ? Math.round((g.sets / planVolume.totalSets) * 100) : 0;
                        return (
                          <div key={g.muscle} className="space-y-1">
                            <div className="flex items-baseline justify-between text-xs">
                              <span className="font-medium capitalize text-foreground">{g.muscle}</span>
                              <span className="text-muted-foreground">
                                {pct}% <span className="ml-1 font-semibold text-foreground">{g.sets}</span>
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${planVolume.max > 0 ? Math.max(6, Math.round((g.sets / planVolume.max) * 100)) : 0}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
                      Conta apenas grupamentos <strong className="text-foreground">primários</strong> de cada exercício.
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}



          {/* Sessions row */}
          {kind === "plan" ? (
            <div className="sessions-scroll mt-4 flex items-start gap-3 overflow-x-auto overflow-y-visible pb-3 -mx-1 px-1 sm:flex-nowrap sm:min-h-[calc(100dvh-240px)]">
              {state.sessions.map((s, i) => (
                <div key={s.id} className="w-full sm:w-auto sm:flex-none">
                  <SessionCard
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
                </div>
              ))}
              <button
                onClick={() => dispatch({ type: "ADD_SESSION" })}
                className="inline-flex h-11 w-full sm:w-auto sm:flex-none min-w-0 sm:min-w-[220px] items-center justify-center gap-2 rounded-full border border-dashed border-border/70 px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                <Plus className="h-4 w-4" /> Adicionar sessão
              </button>
            </div>
          ) : (
            <div className="mt-5 max-w-md">
              <TemplateBlocksCard
                sessionId={state.sessions[0].id}
                blocks={state.sessions[0].blocks}
                dispatch={dispatch}
                onPickTarget={(blockId) => {
                  setActiveTarget({ sessionId: state.sessions[0].id, blockId });
                  setPickerOpen(true);
                }}
                activeBlockId={activeTarget?.blockId ?? null}
              />
            </div>
          )}
            </div>

          </div>
        </main>

      </div>
      <MobileBottomNav />

      <AlertDialog
        open={leaveOpen}
        onOpenChange={(next) => {
          if (!next) {
            setLeaveOpen(false);
            if (blocker.status === "blocked") blocker.reset();
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[oklch(0.85_0.18_75)]/15 text-[oklch(0.85_0.18_75)]">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-left">
                <AlertDialogTitle className="text-lg font-bold">
                  Alterações não salvas
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Suas mudanças neste {kind === "plan" ? "plano" : "modelo"} ainda não foram salvas.
                  {canSave ? " O que você quer fazer?" : ""}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {!canSave && (
            <div className="mt-1 flex items-start gap-2 rounded-lg border border-[oklch(0.75_0.18_60)]/40 bg-[oklch(0.75_0.18_60)]/10 px-3 py-2 text-xs text-[oklch(0.85_0.18_75)]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Adicione um <strong className="font-semibold">nome</strong> no topo do {kind === "plan" ? "plano" : "modelo"} antes de salvar. Sem nome, só é possível descartar.
              </span>
            </div>
          )}

          <AlertDialogFooter className="mt-2 flex-row justify-end gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setLeaveOpen(false);
                if (blocker.status === "blocked") blocker.reset();
                if (!canSave) {
                  setTimeout(() => nameInputRef.current?.focus(), 50);
                }
              }}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Continuar editando
            </button>
            <button
              type="button"
              onClick={async () => {
                // Turn off dirty so blocker won't intercept the follow-up nav
                suppressDirtyRef.current = true;
                setTouched(false);
                setLeaveOpen(false);
                if (blocker.status === "blocked") {
                  blocker.proceed();
                } else {
                  setTimeout(() => navigate({ to: backHref }), 0);
                }
              }}
              className="inline-flex h-10 items-center justify-center rounded-full border border-destructive/60 bg-transparent px-5 text-sm font-semibold text-destructive hover:bg-destructive/10"
            >
              Descartar
            </button>
            {canSave && (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  const ok = await handleSave({ skipNavigate: true });
                  if (!ok) return;
                  suppressDirtyRef.current = true;
                  setTouched(false);
                  setLeaveOpen(false);
                  if (blocker.status === "blocked") {
                    blocker.proceed();
                  } else {
                    setTimeout(() => navigate({ to: backHref }), 0);
                  }
                }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[oklch(0.92_0.19_115)] px-5 text-sm font-semibold text-[oklch(0.2_0.05_115)] hover:brightness-105 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar e sair
              </button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Partir de um modelo — dialog */}
      <Dialog open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-primary" />
              Partir de um modelo
            </DialogTitle>
            <DialogDescription>
              Copiamos todas as sessões e exercícios pro plano deste aluno. Depois é
              só ajustar. O modelo original não é afetado.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 max-h-[60vh] overflow-y-auto">
            {templatesQuery.isLoading ? (
              <div className="grid place-items-center py-10 text-sm text-muted-foreground">
                <Loader2 className="mb-2 h-5 w-5 animate-spin" />
                Carregando modelos…
              </div>
            ) : (templatesQuery.data ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum modelo pronto disponível ainda.<br />
                Crie um modelo em Treinos › Novo modelo.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {(templatesQuery.data ?? []).map((t: any) => {
                  const count = Array.isArray(t.workout_template_exercises)
                    ? (t.workout_template_exercises[0]?.count ?? 0)
                    : 0;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={duplicateMut.isPending}
                        onClick={() => duplicateMut.mutate(t.slug ?? t.id)}
                        className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-muted disabled:opacity-50"
                      >
                        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">{t.name}</div>
                          {t.description ? (
                            <div className="truncate text-xs text-muted-foreground">{t.description}</div>
                          ) : null}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            {t.level ? <span className="rounded-full bg-muted px-2 py-0.5">{t.level}</span> : null}
                            {t.goal ? <span className="rounded-full bg-muted px-2 py-0.5">{t.goal}</span> : null}
                            <span className="inline-flex items-center gap-1">
                              <Dumbbell className="h-3 w-3" /> {count} {count === 1 ? "exercício" : "exercícios"}
                            </span>
                          </div>
                        </div>
                        {duplicateMut.isPending && duplicateMut.variables === (t.slug ?? t.id) ? (
                          <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-primary" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar plano?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{state.name || "Este plano"}</span> será desativado e não aparecerá mais no painel do aluno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setArchiveConfirmOpen(false)}
              disabled={archiveMut.isPending}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => { archiveMut.mutate(); setArchiveConfirmOpen(false); }}
              disabled={archiveMut.isPending}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[oklch(0.92_0.19_115)] px-5 text-sm font-semibold text-[oklch(0.2_0.05_115)] hover:brightness-105 disabled:opacity-50"
            >
              {archiveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Arquivar plano
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as sessões deste plano serão removidas do aluno e não poderão ser recuperadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteMut.isPending}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => { deleteMut.mutate(); setDeleteConfirmOpen(false); }}
              disabled={deleteMut.isPending}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-destructive/60 bg-destructive/10 px-5 text-sm font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Excluir definitivamente
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
}

function TemplateBlocksCard({
  sessionId, blocks, dispatch, onPickTarget, activeBlockId,
}: {
  sessionId: string;
  blocks: Block[];
  dispatch: React.Dispatch<Action>;
  onPickTarget: (blockId: string) => void;
  activeBlockId: string | null;
}) {
  const soleBlock = blocks[0];
  const isEmptyDefault =
    blocks.length === 1 &&
    !soleBlock?.color &&
    !soleBlock?.description &&
    soleBlock?.exercises.length === 0;

  if (isEmptyDefault && soleBlock) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 p-2.5">
        <button
          onClick={() => onPickTarget(soleBlock.id)}
          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border/70 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary hover:bg-muted"
        >
          <Plus className="h-4 w-4" /> Adicionar exercício
        </button>
        <div className="mt-1.5">
          <AddBlockButton sessionId={sessionId} dispatch={dispatch} size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((b, bi) => (
        <BlockCard
          key={b.id}
          sessionId={sessionId}
          index={bi}
          total={blocks.length}
          block={b}
          dispatch={dispatch}
          onPickTarget={() => onPickTarget(b.id)}
          isActive={activeBlockId === b.id}
        />
      ))}
      <AddBlockButton sessionId={sessionId} dispatch={dispatch} size="lg" />
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

  const totalSets = session.blocks.reduce(
    (sum, b) => sum + b.exercises.reduce((s, e) => s + (e.sets ?? 0), 0),
    0,
  );
  const groupsCount = session.blocks.filter((b) => b.color || b.exercises.length > 0).length || 1;

  return (
    <div className="w-full sm:w-[360px] overflow-hidden rounded-xl border border-border/60 bg-card/60">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[oklch(0.92_0.19_115)]/15 text-[11px] font-bold text-[oklch(0.92_0.19_115)]">
          {letter}
        </span>
        {editing ? (
          <input
            ref={inputRef}
            value={displayName}
            onChange={(e) => dispatch({ type: "RENAME_SESSION", sessionId: session.id, label: e.target.value })}
            onBlur={() => { if (!session.label.trim()) dispatch({ type: "RENAME_SESSION", sessionId: session.id, label: "Treino" }); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{displayName || "Sem nome"}</span>
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

      {totalSets > 0 && (
        <button
          type="button"
          className="group flex w-full items-center justify-between gap-2 border-b border-border/60 bg-background/30 px-3 py-2 text-xs transition-colors hover:bg-muted/40"
          aria-label="Ver volume detalhado por grupamento muscular"
        >
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-primary/70" />
            <span className="font-medium text-foreground">{totalSets} {totalSets === 1 ? "série" : "séries"}</span>
            <span>·</span>
            <span>{groupsCount} {groupsCount === 1 ? "grupo" : "grupos"}</span>
          </span>
          <span className="text-[10px] text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">Ver detalhes</span>
        </button>
      )}


      <div className="space-y-2 p-3">
        {(() => {
          const visibleBlocks = session.blocks.filter((b) => b.color || b.exercises.length > 0);
          return (
            <>
              {visibleBlocks.length === 0 && (
                <button
                  onClick={() => onPickTargetBlock(session.blocks[0].id)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/30 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary hover:bg-muted"
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
  const blockLabel = block.label.trim();
  const isAutoBlockLabel = /^bloco\s+[a-z]$/i.test(blockLabel);
  const isExplicitBlock = Boolean(block.color || block.description || (blockLabel && !isAutoBlockLabel));
  const hasExercises = block.exercises.length > 0;
  const exCount = block.exercises.length;
  const totalSeconds = block.exercises.reduce((sum, e) => {
    const sets = e.sets ?? 0;
    const rest = e.rest_seconds ?? 60;
    const workPerSet = 45; // seconds estimate per set
    return sum + sets * (workPerSet + rest);
  }, 0);
  const totalMin = Math.max(1, Math.round(totalSeconds / 60));
  return (
    <div
      className={`overflow-hidden rounded-lg border border-border/60 ${isActive ? "ring-1 ring-primary/40" : ""}`}
      style={{
        backgroundColor: isExplicitBlock ? `color-mix(in oklab, ${color} 6%, hsl(var(--card)))` : "transparent",
      }}
    >

      {isExplicitBlock && (
        <div
          className="flex items-center gap-2 px-3 pt-2.5 pb-2"
          style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)` }}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <span
            className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider"
            style={{ color }}
          >
            {block.label}
          </span>
          {hasExercises && (
            <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="text-muted-foreground/60">·</span>
              <span>{exCount} {exCount === 1 ? "ex" : "exs"}</span>
              <span className="text-muted-foreground/60">·</span>
              <span>~{totalMin} min</span>
            </span>
          )}
          {!hasExercises && <span className="flex-1" />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
      )}
      {isExplicitBlock && block.description && (
        <p
          className="border-b border-border/60 px-3 pb-2 pt-1 text-xs text-muted-foreground"
          style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)` }}
        >
          {block.description}
        </p>
      )}


      <div className="space-y-2 p-3">



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
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary hover:bg-muted"
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
  const [open, setOpen] = useState(false);
  const reps = (item.reps ?? "").toString().trim();
  const summary = item.sets && reps ? `${item.sets}×${reps}` : item.sets ? `${item.sets} séries` : reps ? reps : "—";
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
        className="group relative flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2 py-1.5 text-sm transition-colors hover:bg-muted"
      >
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="-m-1 shrink-0 cursor-grab p-1 text-muted-foreground/40 group-hover:text-muted-foreground active:cursor-grabbing"
          aria-label="Arrastar exercício"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
          <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-primary shadow-sm">
            <Play className="ml-px h-2 w-2 fill-primary-foreground text-primary-foreground" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 break-words text-[13px] font-medium leading-snug text-foreground" title={item.name}>
            {item.name}
          </div>
          <div className="text-[10px] text-muted-foreground">{summary}</div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onRemove}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remover exercício"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <ExerciseDetailSheet
        open={open}
        onOpenChange={setOpen}
        item={item}
        onChange={onChange}
        onRemove={onRemove}
      />
    </>
  );
}

function ExerciseDetailSheet({
  open, onOpenChange, item, onChange, onRemove,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: ExerciseItem;
  onChange: (patch: Partial<ExerciseItem>) => void;
  onRemove: () => void;
}) {
  const { data: meta } = useQuery({
    queryKey: ["exercise-meta", item.exercise_id],
    enabled: open && item.exercise_id != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("difficulty, muscles_primary, muscles_secondary, exercise_groups(name)")
        .eq("id", item.exercise_id!)
        .maybeSingle();
      if (error) throw error;
      type GroupRef = { name: string | null } | { name: string | null }[] | null;
      const g = data?.exercise_groups as GroupRef;
      const groupName = Array.isArray(g) ? (g[0]?.name ?? null) : (g?.name ?? null);
      return {
        difficulty: (data?.difficulty as string | null) ?? null,
        group: groupName,
        muscles_primary: (data?.muscles_primary as string[] | null) ?? [],
        muscles_secondary: (data?.muscles_secondary as string[] | null) ?? [],
      };
    },
  });

  const diff = difficultyStyle(meta?.difficulty);
  const setsCount = Math.max(item.sets ?? 0, 0);
  const rows = Array.from({ length: setsCount }, (_, i) => i);
  const [dragSetIdx, setDragSetIdx] = useState<number | null>(null);
  const [dragOverSetIdx, setDragOverSetIdx] = useState<number | null>(null);
  const reorderSet = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= setsCount || to >= setsCount) return;
    const move = <T,>(arr: T[] | undefined, fill: T): T[] => {
      const a = [...(arr ?? [])];
      while (a.length < setsCount) a.push(fill);
      const [x] = a.splice(from, 1);
      a.splice(to, 0, x);
      return a.slice(0, setsCount);
    };
    onChange({
      set_types: move(item.set_types, "normal" as SetType),
      reps_by_set: move(item.reps_by_set, item.reps),
      rest_by_set: move(item.rest_by_set, item.rest_seconds ?? 60),
      load_by_set: move(item.load_by_set, item.load ?? ""),
      count_by_set: move(item.count_by_set, "1"),
    });
  };
  const addSet = () => onChange({ sets: (item.sets ?? 0) + 1 });
  const removeSet = () => onChange({ sets: Math.max(0, (item.sets ?? 0) - 1) });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px] lg:max-w-[640px] [&>button.absolute]:hidden">
        <SheetHeader className="shrink-0 space-y-0 border-b border-border px-3 pb-3 pt-3 text-left">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-ml-2 flex shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden text-sm font-medium sm:inline">Voltar</span>
            </button>
            <div className="min-w-0 flex-1 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Exercício</div>
              <SheetTitle className="truncate text-sm font-semibold text-foreground sm:text-base">
                {item.name}
              </SheetTitle>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remover exercício"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {/* Video placeholder */}
          <div className="flex justify-center">
            <div className="relative block aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary shadow-lg">
                  <Play className="ml-0.5 h-5 w-5 fill-primary-foreground text-primary-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Difficulty + group */}
          {meta && (
            <div className="space-y-3 px-1">
              <div className="flex flex-wrap items-center gap-2">
                {meta.difficulty && (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${diff.text} border-current/40`}>
                    {diff.label}
                  </span>
                )}
                {meta.group && (
                  <span className="text-[11px] text-muted-foreground">{meta.group}</span>
                )}
              </div>
              {(meta.muscles_primary.length > 0 || meta.muscles_secondary.length > 0) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {meta.muscles_primary.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Principais</p>
                      {meta.muscles_primary.map((m, i) => (
                        <span key={`p-${i}`} className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                  {meta.muscles_secondary.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Auxiliares</p>
                      {meta.muscles_secondary.map((m, i) => (
                        <span key={`s-${i}`} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Per-series config */}
          <div className="space-y-2">
            <h4 className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Configuração de cada série</h4>
            <div className="-mx-1 overflow-x-auto px-1">
              <div className="min-w-[540px] space-y-1">
                <div className="grid grid-cols-[20px_150px_64px_minmax(48px,1fr)_100px_80px_32px] gap-2 px-1 pb-0.5">
              <span />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Série</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Alvo</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Carga</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Descanso</span>
              <span />
            </div>
            <div className="space-y-1">
              {rows.map((i) => {
                const currentType = (item.set_types?.[i] ?? "normal") as SetType;
                const perReps = item.reps_by_set?.[i] ?? item.reps;
                const perRest = item.rest_by_set?.[i] ?? (item.rest_seconds ?? 60);
                const perLoad = item.load_by_set?.[i] ?? item.load ?? "";
                const perCount = item.count_by_set?.[i] ?? "1";
                const setCount = (v: string) => {
                  const clean = v.replace(/\D/g, "");
                  const arr = [...(item.count_by_set ?? [])];
                  while (arr.length < setsCount) arr.push("1");
                  arr[i] = clean;
                  onChange({ count_by_set: arr.slice(0, setsCount) });
                };
                const setType = (t: SetType) => {
                  const arr = [...(item.set_types ?? [])];
                  while (arr.length < setsCount) arr.push("normal");
                  arr[i] = t;
                  onChange({ set_types: arr.slice(0, setsCount) });
                };
                const setReps = (v: string) => {
                  const arr = [...(item.reps_by_set ?? [])];
                  while (arr.length < setsCount) arr.push(item.reps);
                  arr[i] = v;
                  onChange({ reps_by_set: arr.slice(0, setsCount) });
                };
                const setRest = (s: number) => {
                  const arr = [...(item.rest_by_set ?? [])];
                  while (arr.length < setsCount) arr.push(item.rest_seconds ?? 60);
                  arr[i] = s;
                  onChange({ rest_by_set: arr.slice(0, setsCount) });
                };
                const setLoad = (v: string) => {
                  const arr = [...(item.load_by_set ?? [])];
                  while (arr.length < setsCount) arr.push(item.load ?? "");
                  arr[i] = v;
                  onChange({ load_by_set: arr.slice(0, setsCount) });
                };
                const removeThisSet = () => {
                  const types = [...(item.set_types ?? [])];
                  const reps = [...(item.reps_by_set ?? [])];
                  const rests = [...(item.rest_by_set ?? [])];
                  const loads = [...(item.load_by_set ?? [])];
                  const counts = [...(item.count_by_set ?? [])];
                  types.splice(i, 1);
                  reps.splice(i, 1);
                  rests.splice(i, 1);
                  loads.splice(i, 1);
                  counts.splice(i, 1);
                  onChange({
                    sets: Math.max(0, (item.sets ?? 0) - 1),
                    set_types: types,
                    reps_by_set: reps,
                    rest_by_set: rests,
                    load_by_set: loads,
                    count_by_set: counts,
                  });
                };
                return (
                  <div
                    key={i}
                    draggable
                    onDragStart={(e) => {
                      setDragSetIdx(i);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverSetIdx !== i) setDragOverSetIdx(i);
                    }}
                    onDragLeave={() => {
                      if (dragOverSetIdx === i) setDragOverSetIdx(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragSetIdx !== null) reorderSet(dragSetIdx, i);
                      setDragSetIdx(null);
                      setDragOverSetIdx(null);
                    }}
                    onDragEnd={() => {
                      setDragSetIdx(null);
                      setDragOverSetIdx(null);
                    }}
                    className={`grid grid-cols-[20px_150px_64px_minmax(48px,1fr)_100px_80px_32px] items-center gap-2 rounded-lg py-1 transition-colors ${
                      dragOverSetIdx === i && dragSetIdx !== null && dragSetIdx !== i
                        ? "bg-primary/10 ring-1 ring-primary/40"
                        : ""
                    } ${dragSetIdx === i ? "opacity-50" : ""}`}
                  >
                    <div
                      className="grid h-8 w-5 cursor-grab place-items-center text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
                      aria-label="Arrastar série"
                      title="Arrastar para reordenar"
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <SetTypePickerButton
                      index={i}
                      currentType={currentType}
                      onSelect={setType}
                      onRemoveSet={removeThisSet}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={perCount}
                      onChange={(e) => setCount(e.target.value)}
                      aria-label={`Número da série ${i + 1}`}
                      className="h-10 w-full rounded-lg bg-surface-2 px-2 text-center text-sm font-semibold tabular-nums text-foreground caret-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <AlvoPickerButton
                      index={i}
                      value={perReps}
                      onSave={setReps}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={perLoad}
                      onChange={(e) => setLoad(e.target.value)}
                      placeholder="—"
                      aria-label={`Carga da série ${i + 1}`}
                      className="h-10 w-full rounded-lg border border-border bg-background px-2 text-center text-sm text-foreground caret-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {currentType === "drop" ? (
                      <div
                        aria-label="Sem descanso em Drop Set"
                        title="Drop Set não usa descanso"
                        className="grid h-10 w-full place-items-center rounded-lg border border-dashed border-border bg-surface-2/40 text-sm text-muted-foreground"
                      >
                        —
                      </div>
                    ) : (
                      <DescansoPickerButton
                        index={i}
                        seconds={perRest}
                        onSave={setRest}
                      />
                    )}
                    <button
                      type="button"
                      onClick={removeThisSet}
                      aria-label="Remover série"
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
              </div>
            </div>
            <button
              type="button"
              onClick={addSet}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Adicionar série
            </button>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Observações
              <Textarea
                value={item.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="Notas técnicas, dicas, cadência…"
                className="min-h-[60px] text-xs"
              />
            </label>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SetTypePickerButton({
  index, currentType, onSelect, onRemoveSet,
}: {
  index: number;
  currentType: SetType;
  onSelect: (t: SetType) => void;
  onRemoveSet: () => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = setTypeMeta(currentType);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-border bg-muted pl-1.5 pr-2 transition-colors hover:border-foreground/30"
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[10px] font-bold"
          style={{ color: meta.fg, backgroundColor: meta.bg }}
        >
          {currentType === "normal" ? index + 1 : meta.badge}
        </span>
        <span className="flex-1 truncate text-left text-sm font-semibold">{meta.label}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-0 rounded-2xl border border-border bg-surface-1 p-5 shadow-2xl">
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="pb-1 pr-8 font-display text-base font-bold">Tipo de Série</DialogTitle>
            <DialogDescription className="mb-4 text-xs text-fg-muted">Série {index + 1}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            {SET_TYPE_OPTIONS.map((opt) => {
              const active = opt.key === currentType;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => { onSelect(opt.key); setOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all active:scale-[0.98] ${
                    active
                      ? "border-2 border-primary bg-primary/10"
                      : "border border-border hover:border-border-strong hover:bg-surface-hover"
                  }`}
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display font-bold ${
                      opt.key === "normal" ? "text-base" : "text-[0.5625rem]"
                    }`}
                    style={{ color: opt.fg, backgroundColor: opt.bg }}
                  >
                    {opt.key === "normal" ? index + 1 : opt.badge}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-body text-sm font-semibold text-foreground">{opt.label}</div>
                    <div className="mt-0.5 line-clamp-2 text-[0.6875rem] text-fg-muted">{opt.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => { onRemoveSet(); setOpen(false); }}
              className="flex w-full items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-semibold text-destructive transition-all hover:bg-destructive/10 active:scale-[0.98]"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/15">
                <X className="h-4 w-4" />
              </div>
              <span>Remover Série</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}

function AlvoPickerButton({
  index, value, onSave,
}: {
  index: number;
  value: string;
  onSave: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // detect mode from value
  const detectMode = (v: string): "rep" | "faixa" | "tempo" => {
    if (/s$/i.test(v.trim())) return "tempo";
    if (v.includes("-")) return "faixa";
    return "rep";
  };
  const [mode, setMode] = useState<"rep" | "faixa" | "tempo">(detectMode(value || "12"));
  const parseReps = (v: string) => {
    const parts = (v || "12").split("/").map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : ["12"];
  };
  const [reps, setReps] = useState<string[]>(() => (mode === "rep" ? parseReps(value) : ["12"]));
  const [faixaMin, setFaixaMin] = useState<string>(() => {
    if (mode === "faixa") {
      const [a] = value.split("-");
      return a?.trim() || "8";
    }
    return "8";
  });
  const [faixaMax, setFaixaMax] = useState<string>(() => {
    if (mode === "faixa") {
      const [, b] = value.split("-");
      return b?.trim() || "12";
    }
    return "12";
  });
  const [tempoMin, setTempoMin] = useState<number>(() => {
    if (mode === "tempo") {
      const n = parseInt(value.replace(/s$/i, "").trim() || "30", 10) || 0;
      return Math.floor(n / 60);
    }
    return 0;
  });
  const [tempoSeg, setTempoSeg] = useState<number>(() => {
    if (mode === "tempo") {
      const n = parseInt(value.replace(/s$/i, "").trim() || "30", 10) || 0;
      return n % 60;
    }
    return 30;
  });

  const openDialog = () => {
    const m = detectMode(value || "12");
    setMode(m);
    if (m === "rep") setReps(parseReps(value));
    else if (m === "faixa") {
      const [a, b] = (value || "8-12").split("-");
      setFaixaMin(a?.trim() || "8");
      setFaixaMax(b?.trim() || "12");
    } else {
      const n = parseInt((value || "30s").replace(/s$/i, "").trim() || "30", 10) || 0;
      setTempoMin(Math.floor(n / 60));
      setTempoSeg(n % 60);
    }
    setOpen(true);
  };

  const confirm = () => {
    if (mode === "rep") {
      const cleaned = reps.map((r) => r.trim()).filter(Boolean);
      onSave(cleaned.length > 0 ? cleaned.join("/") : "0");
    } else if (mode === "faixa") onSave(`${faixaMin.trim() || "0"}-${faixaMax.trim() || "0"}`);
    else onSave(`${tempoMin * 60 + tempoSeg}s`);
    setOpen(false);
  };


  const formatTempo = (raw: string) => {
    const n = parseInt(raw.replace(/s$/i, "").trim() || "0", 10) || 0;
    if (n < 60) return `${n}s`;
    const m = Math.floor(n / 60);
    const s = n % 60;
    return s === 0 ? `${m}min` : `${m}min ${s}s`;
  };
  const formatReps = (v: string) => {
    const parts = v.split("/").map((s) => s.trim()).filter(Boolean);
    if (parts.length <= 1) return `${v} reps`;
    return `${parts.join("/ ")} reps`;
  };
  const label = value
    ? (detectMode(value) === "tempo" ? formatTempo(value) : formatReps(value))
    : "— reps";

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex h-10 items-center justify-center rounded-full border border-border bg-muted px-4 text-sm font-semibold transition-colors hover:border-foreground/30"
      >
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm gap-0 rounded-2xl border border-border bg-surface-1 p-5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(215,242,5,0.06)] sm:p-6">
          <div className="flex flex-col items-center gap-2.5 pt-1">
            <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 shadow-glow">
              {mode === "tempo" ? (
                <Clock className="size-5 text-primary" strokeWidth={2.5} />
              ) : (
                <Hash className="size-5 text-primary" strokeWidth={2.5} />
              )}
            </div>
            <DialogTitle className="text-center font-display text-base font-bold leading-tight">Série {index + 1}</DialogTitle>
            <DialogDescription className="sr-only">Configurar alvo da série</DialogDescription>
          </div>
          <div className="mt-5 flex gap-1 rounded-full bg-surface-2 p-1">
            {(["rep", "faixa", "tempo"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`h-9 flex-1 rounded-full font-body text-sm font-semibold transition-all ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-fg-muted hover:bg-surface-3/60 hover:text-foreground"
                }`}
              >
                {m === "rep" ? "Rep" : m === "faixa" ? "Faixa" : "Tempo"}
              </button>
            ))}
          </div>
          <div className="mb-5 mt-4">
            {mode === "rep" && (
              <div className="flex flex-col gap-2 py-2">
                {reps.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      value={r}
                      onChange={(e) => {
                        const next = [...reps];
                        next[idx] = e.target.value;
                        setReps(next);
                      }}
                      className="w-24 rounded-xl border border-border bg-surface-2 px-3 py-2 text-center font-mono text-2xl font-bold tabular-nums outline-none [appearance:textfield] focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-sm font-medium text-fg-muted">reps</span>
                    {reps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setReps(reps.filter((_, i) => i !== idx))}
                        aria-label="Remover"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setReps([...reps, reps[reps.length - 1] || "12"])}
                  className="mx-auto mt-1 inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus className="size-3.5" /> Adicionar rep
                </button>
              </div>
            )}
            {mode === "faixa" && (
              <div className="flex items-center justify-center gap-3 py-4">
                <div className="max-w-[120px] flex-1">
                  <p className="mb-2 text-center text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted">mínimo</p>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={faixaMin}
                    onChange={(e) => setFaixaMin(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-2 px-2 py-3 text-center font-mono text-2xl font-bold tabular-nums outline-none [appearance:textfield] focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
                <span className="pt-6 text-lg font-medium text-fg-muted">—</span>
                <div className="max-w-[120px] flex-1">
                  <p className="mb-2 text-center text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted">máximo</p>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={faixaMax}
                    onChange={(e) => setFaixaMax(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-2 px-2 py-3 text-center font-mono text-2xl font-bold tabular-nums outline-none [appearance:textfield] focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>
            )}
            {mode === "tempo" && (
              <div className="flex select-none flex-col items-center gap-1.5 py-2">
                <div className="flex items-center justify-center gap-2">
                  <WheelPicker key={`amm-${open}`} value={tempoMin} onChange={setTempoMin} max={60} label="min" />
                  <WheelPicker key={`ass-${open}`} value={tempoSeg} onChange={setTempoSeg} max={60} label="seg" />
                </div>
                <p className="mt-1 text-center text-[0.625rem] text-fg-muted">
                  Arraste pra escolher · toque no número central pra digitar
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 flex-1 rounded-full border border-border bg-surface-2 font-body text-sm font-semibold text-foreground transition-all hover:border-border-strong hover:bg-surface-3 active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirm}
              className="h-11 flex-[1.6] rounded-full bg-primary font-body text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Confirmar
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}

function WheelPicker({
  value, onChange, max, label,
}: {
  value: number;
  onChange: (v: number) => void;
  max: number; // exclusive
  label: string;
}) {
  const ITEM = 48;
  const ref = useRef<HTMLDivElement | null>(null);
  const suppressRef = useRef(false);
  // scroll to value on open/change externally
  const scrollToValue = (v: number) => {
    const el = ref.current;
    if (!el) return;
    suppressRef.current = true;
    el.scrollTop = v * ITEM;
    window.setTimeout(() => { suppressRef.current = false; }, 50);
  };
  // sync on mount / when value changes from outside
  useMemo(() => { requestAnimationFrame(() => scrollToValue(value)); return null; }, []);
  const onScroll = () => {
    if (suppressRef.current) return;
    const el = ref.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM);
    if (idx !== value && idx >= 0 && idx < max) onChange(idx);
  };
  return (
    <div className="flex select-none flex-col items-center gap-1.5">
      <div className="relative w-[96px]" style={{ height: 144 }}>
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-lg bg-primary/[0.10]"
          style={{ height: ITEM }}
        />
        <div
          ref={ref}
          onScroll={onScroll}
          className="h-full cursor-ns-resize touch-pan-y overflow-y-scroll [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "y mandatory", paddingTop: ITEM, paddingBottom: ITEM }}
        >
          {Array.from({ length: max }, (_, i) => {
            const dist = Math.abs(i - value);
            const isActive = dist === 0;
            const opacity = isActive ? 1 : dist === 1 ? 0.55 : 0.25;
            return (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                onClick={() => { scrollToValue(i); onChange(i); }}
                className={`block w-full cursor-pointer text-center font-mono tabular-nums leading-none focus:outline-none ${
                  isActive ? "font-bold text-foreground" : "font-medium text-fg-muted hover:text-foreground/70"
                }`}
                style={{
                  height: ITEM,
                  scrollSnapAlign: "center",
                  fontSize: isActive ? 32 : 20,
                  opacity,
                  transition: "opacity 150ms, font-size 150ms",
                }}
              >
                {i.toString().padStart(2, "0")}
              </button>
            );
          })}
        </div>
      </div>
      <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-foreground/60">{label}</span>
    </div>
  );
}


function DescansoPickerButton({
  index, seconds, onSave,
}: {
  index: number;
  seconds: number;
  onSave: (s: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mm, setMm] = useState(Math.floor(seconds / 60));
  const [ss, setSs] = useState(seconds % 60);

  const openDialog = () => {
    setMm(Math.floor((seconds || 0) / 60));
    setSs((seconds || 0) % 60);
    setOpen(true);
  };
  const confirm = () => {
    onSave(mm * 60 + ss);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label="Descanso após esta série"
        className="flex h-10 min-w-[64px] items-center justify-center gap-1 rounded-full border border-border bg-muted px-3 text-xs font-semibold tabular-nums transition-colors hover:border-foreground/30"
      >
        <Clock className="h-3.5 w-3.5" />
        {seconds}s
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm gap-0 rounded-2xl border border-border bg-surface-1 p-5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(215,242,5,0.06)] sm:p-6">
          <div className="flex flex-col items-center gap-2.5 pt-1">
            <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 shadow-glow">
              <Clock className="size-5 text-primary" strokeWidth={2.5} />
            </div>
            <DialogTitle className="text-center font-display text-base font-bold leading-tight">Descanso após série {index + 1}</DialogTitle>
            <DialogDescription className="sr-only">Escolha o tempo de descanso</DialogDescription>
          </div>
          <div className="mb-5 mt-4">
            <div className="flex select-none flex-col items-center gap-1.5 py-2">
              <div className="flex items-center justify-center gap-2">
                <WheelPicker key={`mm-${open}`} value={mm} onChange={setMm} max={60} label="min" />
                <WheelPicker key={`ss-${open}`} value={ss} onChange={setSs} max={60} label="seg" />
              </div>
              <p className="mt-1 text-center text-[0.625rem] text-fg-muted">
                Arraste pra escolher · toque no número central pra digitar
              </p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 flex-1 rounded-full border border-border bg-surface-2 font-body text-sm font-semibold text-foreground transition-all hover:border-border-strong hover:bg-surface-3 active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirm}
              className="h-11 flex-[1.6] rounded-full bg-primary font-body text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Confirmar
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </>
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
              const sess = state.sessions.find((s) => s.id === target.sessionId);
              const sessLabel = sess && sess.label && sess.label !== "__single__" ? sess.label : "treino";
              toast.success(
                `${list.length} ${list.length === 1 ? "exercício adicionado" : "exercícios adicionados"}`,
                { description: `Em ${sessLabel}` },
              );
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
  onCommit: (list: { id: number | null; name: string; muscles_primary?: string[] }[]) => void;
}) {
  const [q, setQ] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [customPicks, setCustomPicks] = useState<{ id: null; name: string }[]>([]);
  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ["exercises-catalog"],
    queryFn: async (): Promise<ExerciseCatalog[]> => {
      const pageSize = 1000;
      const rows: any[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("exercises")
          .select("id, name, difficulty, image_path, muscles_primary, muscles_secondary, exercise_groups(name)")
          .order("name", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
      }
      return rows.map((r) => {
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
    return catalog.filter((e) => {
      if (s && !(e.name.toLowerCase().includes(s) || (e.group ?? "").toLowerCase().includes(s))) return false;
      if (difficultyFilter) {
        const k = (e.difficulty ?? "").toLowerCase();
        if (difficultyFilter === "inici" && !k.startsWith("inici")) return false;
        if (difficultyFilter === "inter" && !k.startsWith("inter")) return false;
        if (difficultyFilter === "avan"  && !k.startsWith("avan"))  return false;
      }
      return true;
    });
  }, [q, catalog, difficultyFilter]);


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
    const picks: { id: number | null; name: string; muscles_primary?: string[] }[] = [];
    catalog.forEach((e) => {
      if (selectedIds.has(e.id)) picks.push({ id: e.id, name: e.name, muscles_primary: e.muscles_primary });
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
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Filtros"
              className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors ${
                difficultyFilter
                  ? "border-primary/60 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              <Filter className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-1.5">
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dificuldade</div>
            {[
              { key: null,     label: "Todas",        dot: "bg-muted-foreground" },
              { key: "inici",  label: "Iniciante",    dot: "bg-emerald-400" },
              { key: "inter",  label: "Intermediário",dot: "bg-amber-400" },
              { key: "avan",   label: "Avançado",     dot: "bg-rose-400" },
            ].map((o) => (
              <button
                key={String(o.key)}
                onClick={() => setDifficultyFilter(o.key)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted ${
                  difficultyFilter === o.key ? "bg-muted font-medium" : ""
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} />
                {o.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
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
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary shadow-sm">
                      <Play className="ml-px h-3 w-3 fill-primary-foreground text-primary-foreground" />
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
      {totalSelected > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-3 py-3">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-left transition-opacity hover:bg-muted/40 active:opacity-70"
                aria-label="Ver lista de selecionados"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary/15 text-sm font-bold tabular-nums text-primary">
                  {totalSelected}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-semibold text-foreground">exercícios selecionados</span>
                  <span className="block truncate text-[11px] text-primary">Ver lista</span>
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
              <SheetHeader className="shrink-0 space-y-1 border-b border-border px-5 pb-3 pt-3 text-left">
                <SheetTitle className="text-base font-semibold text-foreground">
                  {totalSelected} {totalSelected === 1 ? "exercício selecionado" : "exercícios selecionados"}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Revise antes de confirmar. Toque em <X className="inline h-3 w-3" aria-hidden /> pra remover.
                </p>
              </SheetHeader>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {catalog.filter((e) => selectedIds.has(e.id)).map((e) => {
                  const diff = difficultyStyle(e.difficulty);
                  const muscles = [...(e.muscles_primary ?? []), ...(e.muscles_secondary ?? [])].slice(0, 3).join(" • ");
                  return (
                    <div key={`sel-${e.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                      <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary shadow-sm">
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
                          {muscles && (
                            <span className="truncate text-muted-foreground">· {muscles}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(e.id)}
                        aria-label={`Remover ${e.name} da seleção`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
                {customPicks.map((c, i) => (
                  <div key={`csel-${i}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-primary shadow-sm">
                        <Play className="ml-px h-2.5 w-2.5 fill-primary-foreground text-primary-foreground" />
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">Exercício livre</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomPicks((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={`Remover ${c.name} da seleção`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-card px-4 py-3">
                <span className="text-xs text-muted-foreground">{totalSelected} no total</span>
                <button
                  onClick={handleCommit}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_-4px_hsl(var(--primary)/0.6)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.97]"
                >
                  Adicionar
                </button>
              </div>
            </SheetContent>
          </Sheet>
          <button
            onClick={handleCommit}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_-4px_hsl(var(--primary)/0.6)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.97]"
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
    ? "inline-flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-border/70 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary hover:bg-muted"
    : "inline-flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-border/70 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary hover:bg-muted";
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
