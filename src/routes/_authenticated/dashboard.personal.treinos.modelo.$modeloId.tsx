import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Pencil,
  Trash2,
  Dumbbell,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { formatRest } from "@/lib/plano";

export const Route = createFileRoute(
  "/_authenticated/dashboard/personal/treinos/modelo/$modeloId",
)({
  head: () => ({
    meta: [
      { title: "Modelo de Treino · cactusfitness" },
      { name: "description", content: "Detalhes do modelo de treino." },
    ],
  }),
  component: ModeloDetailPage,
});

type ExerciseRow = {
  id: string;
  position: number;
  session_position: number;
  session_label: string | null;
  sets: number | null;
  reps: string | null;
  load: string | null;
  rest_seconds: number | null;
  notes: string | null;
  exercises: { id: number; name: string; image_path: string | null } | null;
};

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  kind: string | null;
  created_at: string;
  workout_template_exercises: ExerciseRow[];
};

type Session = {
  id: string;
  name: string;
  exercises: ExerciseRow[];
};

const WEEKLY_RE = /^\s*Treino\s+[A-Z]\b/i;

function ModeloDetailPage() {
  const { modeloId } = Route.useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["modelo-detail", modeloId],
    queryFn: async () => {
      const selectStr =
        "id, name, description, kind, created_at, workout_template_exercises ( id, position, session_position, session_label, sets, reps, load, rest_seconds, notes, exercises ( id, name, image_path ) )";

      const base = await supabase
        .from("workout_templates")
        .select(selectStr)
        .eq("id", modeloId)
        .maybeSingle();
      if (base.error) throw base.error;
      if (!base.data) return null;
      const primary = base.data as unknown as TemplateRow;

      // Detect weekly grouping: same created_at second + weekly name pattern
      let group: TemplateRow[] = [primary];
      let isGroup = false;
      if (primary.kind !== "plan" && WEEKLY_RE.test(primary.name)) {
        const secBucket = new Date(primary.created_at).toISOString().slice(0, 19);
        const fromIso = `${secBucket}.000Z`;
        const toIso = `${secBucket}.999Z`;
        const siblings = await supabase
          .from("workout_templates")
          .select(selectStr)
          .gte("created_at", fromIso)
          .lte("created_at", toIso);
        if (siblings.error) throw siblings.error;
        const list = ((siblings.data ?? []) as unknown as TemplateRow[]).filter(
          (t) => WEEKLY_RE.test(t.name),
        );
        if (list.length >= 2) {
          isGroup = true;
          group = list.sort((a, b) => a.name.localeCompare(b.name));
        }
      }

      // Build sessions
      const sessions: Session[] = [];
      if (isGroup) {
        for (const t of group) {
          const exs = [...(t.workout_template_exercises ?? [])].sort(
            (a, b) => a.position - b.position,
          );
          sessions.push({ id: t.id, name: t.name, exercises: exs });
        }
      } else {
        const exs = [...(primary.workout_template_exercises ?? [])].sort(
          (a, b) => a.position - b.position || a.session_position - b.session_position,
        );
        const bySession = new Map<number, ExerciseRow[]>();
        for (const e of exs) {
          const key = e.session_position ?? 0;
          const arr = bySession.get(key) ?? [];
          arr.push(e);
          bySession.set(key, arr);
        }
        const keys = [...bySession.keys()].sort((a, b) => a - b);
        if (keys.length <= 1) {
          sessions.push({ id: primary.id, name: primary.name, exercises: exs });
        } else {
          for (const k of keys) {
            const arr = bySession.get(k) ?? [];
            const label = arr[0]?.session_label ?? `Sessão ${k + 1}`;
            sessions.push({ id: `${primary.id}:${k}`, name: label, exercises: arr });
          }
        }
      }

      const title = isGroup ? "Treino Semanal" : primary.name;
      const description =
        (isGroup
          ? group.map((g) => g.name.replace(/^\s*Treino\s+/i, "")).join(" · ")
          : primary.description) ?? null;

      return {
        title,
        description,
        isGroup,
        sessions,
        totalExercises: sessions.reduce((s, x) => s + x.exercises.length, 0),
      };
    },
  });

  return (
    <div className="relative flex min-h-screen bg-background">
      <IconRail />
      <div className="flex-1 min-w-0 pb-20 md:pb-0 md:pl-[72px] bg-background">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 p-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 md:p-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-2 flex items-center gap-3">
              <button
                onClick={() => navigate({ to: "/dashboard/personal/treinos" })}
                className="p-1 text-fg-muted hover:text-foreground"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-lg font-bold md:text-xl">
                    {data?.title ?? (isLoading ? "Carregando…" : "Modelo de Treino")}
                  </h1>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[oklch(0.55_0.22_300)]/30 bg-[oklch(0.55_0.22_300)]/15 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-[oklch(0.75_0.18_300)]">
                    <Layers className="h-3 w-3" />
                    Plano Simples
                  </span>
                </div>
                {data?.description ? (
                  <p className="mt-0.5 truncate text-xs text-fg-muted">{data.description}</p>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <div className="mx-auto max-w-6xl space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
            <div className="space-y-6 lg:col-span-2">
              {isLoading ? (
                <div className="rounded-xl border border-border bg-surface-1 p-8 text-center text-sm text-fg-muted">
                  Carregando modelo…
                </div>
              ) : error || !data ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
                  Não foi possível carregar o modelo.
                </div>
              ) : (
                <>
                  <StatsCard
                    sessions={data.sessions.length}
                    exercises={data.totalExercises}
                  />
                  <SessionsList sessions={data.sessions} />
                </>
              )}
            </div>

            <ActionsSidebar />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

function StatsCard({ sessions, exercises }: { sessions: number; exercises: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
      <div className="grid grid-cols-2 divide-x divide-border">
        <Stat value={String(sessions)} label={sessions === 1 ? "sessão" : "sessões"} />
        <Stat value={String(exercises)} label={exercises === 1 ? "exercício" : "exercícios"} />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-3 text-center">
      <span className="font-display text-lg font-bold leading-none text-foreground md:text-xl">
        {value}
      </span>
      <span className="mt-1 text-[0.625rem] uppercase tracking-wider text-fg-muted md:text-xs">
        {label}
      </span>
    </div>
  );
}

function SessionsList({ sessions }: { sessions: Session[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-muted">
        Sessões de Treino
      </h2>
      <div className="space-y-2">
        {sessions.map((s, idx) => (
          <SessionCard key={s.id} idx={idx} session={s} defaultOpen={idx === 0} />
        ))}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  idx,
  defaultOpen,
}: {
  session: Session;
  idx: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const exercises = session.exercises;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2/50"
        aria-expanded={open}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <span className="text-xs font-bold text-primary">{idx + 1}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{session.name}</p>
          <p className="text-xs text-fg-muted">
            {exercises.length} exercício{exercises.length === 1 ? "" : "s"}
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-fg-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" />
        )}
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border p-4">
          {exercises.length === 0 ? (
            <p className="text-xs text-fg-muted">Nenhum exercício cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <ExerciseRow key={ex.id} ex={ex} idx={i} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ExerciseRow({ ex, idx }: { ex: ExerciseRow; idx: number }) {
  const rest = formatRest(ex.rest_seconds);
  const setsReps = [ex.sets ? String(ex.sets) : null, ex.reps ?? null].filter(Boolean).join("×");
  return (
    <div className="flex h-[72px] w-full items-center gap-2.5 rounded-lg bg-surface-2/20 p-3">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <span className="text-[0.625rem] font-bold text-primary">{idx + 1}</span>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-3 text-fg-muted">
        <Dumbbell className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
        <p className="truncate text-sm font-medium">{ex.exercises?.name ?? "Exercício removido"}</p>
        <div className="flex items-center gap-1.5 text-xs text-fg-muted">
          {setsReps ? <span className="tabular-nums">{setsReps}</span> : null}
          {ex.load && ex.load.trim() ? (
            <>
              <span className="text-fg-muted/40">·</span>
              <span className="tabular-nums">{ex.load}</span>
            </>
          ) : null}
          {rest ? (
            <>
              <span className="text-fg-muted/40">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" />
                {rest}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const ACTIONS = [
  { icon: Pencil, label: "Editar" },
  { icon: Copy, label: "Duplicar" },
  { icon: Trash2, label: "Excluir", destructive: true },
];

function ActionsSidebar() {
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="h-px w-full bg-border lg:hidden" />
      <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-fg-muted lg:mt-0">
        Ações
      </h2>
      <div className="flex flex-col gap-2">
        {ACTIONS.map(({ icon: Icon, label, destructive }) => (
          <button
            key={label}
            type="button"
            className={`inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-transparent px-6 py-2.5 text-sm font-semibold transition-all hover:border-primary hover:shadow-[0_0_20px_var(--primary-glow,transparent)] hover:text-primary active:scale-[0.97] ${destructive ? "text-destructive hover:border-destructive hover:text-destructive" : "text-foreground"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}
