import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Pencil,
  FileDown,
  Archive,
  Trash2,
  Save,
  Dumbbell,
  X,
  Target,
  Flame,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildPlano,
  PLANO_SELECT,
  WEEKDAYS,
  formatRest,
  formatScheduled,
  type Plano,
  type StudentWorkoutRow,
  type TemplateExerciseRow,
} from "@/lib/plano";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard/personal/treinos/plano/$planoId")({
  head: () => ({
    meta: [
      { title: "Plano de Treino · cactusfitness" },
      { name: "description", content: "Detalhes do plano de treino do aluno." },
    ],
  }),
  component: PlanoDetailPage,
});

function PlanoDetailPage() {
  const { planoId } = Route.useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["plano-detail", planoId],
    queryFn: async () => {
      const [alunoRes, workoutsRes] = await Promise.all([
        supabase.from("alunos").select("id, full_name").eq("id", planoId).maybeSingle(),
        supabase
          .from("student_workouts")
          .select(PLANO_SELECT)
          .eq("aluno_id", planoId)
          .order("scheduled_for", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);
      if (alunoRes.error) throw alunoRes.error;
      if (workoutsRes.error) throw workoutsRes.error;
      if (!alunoRes.data) return null;
      const plano = buildPlano(alunoRes.data, (workoutsRes.data ?? []) as unknown as StudentWorkoutRow[]);
      return { aluno: alunoRes.data, plano };
    },
  });

  const backToAluno = () => navigate({
    to: "/dashboard/personal/alunos/$alunoId",
    params: { alunoId: planoId },
  });

  return (
    <div className="relative flex min-h-screen bg-background [background-image:none]">
      <IconRail />
      <div className="flex-1 min-w-0 pb-20 md:pb-0 md:pl-[72px] bg-background">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 p-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 md:p-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-2 flex items-center gap-3">
              <button
                onClick={backToAluno}
                className="p-1 text-fg-muted hover:text-foreground"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-lg font-bold md:text-xl">
                    {data?.plano?.name ?? (isLoading ? "Carregando…" : "Plano de Treino")}
                  </h1>
                  {data?.plano?.isActive ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">
                      Ativo
                    </span>
                  ) : null}
                </div>
                {data?.aluno ? (
                  <p className="mt-0.5 text-xs text-fg-muted">Aluno: {data.aluno.full_name}</p>
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
                  Carregando plano…
                </div>
              ) : error || !data ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
                  Não foi possível carregar o plano.
                </div>
              ) : !data.plano ? (
                <div className="rounded-xl border border-dashed border-border bg-surface-2/20 p-8 text-center text-sm text-fg-muted">
                  Nenhuma sessão neste plano ainda.
                </div>
              ) : (
                <>
                  <StatsCard plano={data.plano} />
                  <SessionsList plano={data.plano} />
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

function StatsCard({ plano }: { plano: Plano }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
      <div className="grid grid-cols-2 divide-x divide-border">
        <Stat value={String(plano.sessionsCount)} label="sessões" />
        <Stat value={plano.startNumeric ?? "--"} label="início" />
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

function SessionsList({ plano }: { plano: Plano }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-muted">
        Sessões de Treino
      </h2>
      <div className="space-y-2">
        {plano.sessions.map((s, idx) => (
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
  session: StudentWorkoutRow;
  idx: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sched = formatScheduled(session.scheduled_for);
  const exercises = [...(session.workout_templates?.workout_template_exercises ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const label = sched?.weekday ?? session.name;

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
          <p className="truncate text-sm font-medium">{label}</p>
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
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 pt-1">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider"
                    style={{ color: "hsl(var(--primary))", backgroundColor: "color-mix(in oklab, hsl(var(--primary)) 12%, transparent)" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />
                    Força
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ backgroundColor: "color-mix(in oklab, hsl(var(--primary)) 15%, transparent)" }}
                  />
                </div>
                <div className="space-y-2">
                  {exercises.map((ex, i) => (
                    <ExerciseRow key={ex.id} ex={ex} idx={i} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ExerciseRow({ ex, idx }: { ex: TemplateExerciseRow; idx: number }) {
  const [open, setOpen] = useState(false);
  const rest = formatRest(ex.rest_seconds);
  const setsReps = [ex.sets ? String(ex.sets) : null, ex.reps ?? null].filter(Boolean).join("×");
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[72px] w-full cursor-pointer items-center gap-2.5 rounded-lg bg-surface-2/20 p-3 text-left transition-all hover:bg-surface-2/40 active:scale-[0.98]"
      >
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
      </button>
      {ex.exercises?.id ? (
        <ExerciseDetailDialog
          exerciseId={ex.exercises.id}
          templateEx={ex}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}

function ExerciseDetailDialog({
  exerciseId,
  templateEx,
  open,
  onOpenChange,
}: {
  exerciseId: number;
  templateEx: TemplateExerciseRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    enabled: open,
    queryKey: ["exercise-detail", exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, description, instructions, difficulty, equipment, objective, muscles_primary, muscles_secondary, image_path, video_url")
        .eq("id", exerciseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const rest = formatRest(templateEx.rest_seconds);
  const setsReps = [templateEx.sets ? String(templateEx.sets) : null, templateEx.reps ?? null].filter(Boolean).join("×");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden border-border bg-surface-1 p-0">
        <DialogHeader className="border-b border-border bg-surface-2/40 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-left font-display text-base font-bold md:text-lg">
                {data?.name ?? templateEx.exercises?.name ?? "Exercício"}
              </DialogTitle>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
                {setsReps ? <span className="tabular-nums">{setsReps}</span> : null}
                {templateEx.load?.trim() ? (
                  <>
                    <span className="text-fg-muted/40">·</span>
                    <span className="tabular-nums">{templateEx.load}</span>
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
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-sm text-fg-muted">Carregando…</p>
          ) : !data ? (
            <p className="text-sm text-fg-muted">Detalhes não disponíveis.</p>
          ) : (
            <div className="space-y-4 text-sm">
              {data.image_path ? (
                <div className="overflow-hidden rounded-lg border border-border bg-surface-2">
                  <img src={data.image_path} alt={data.name} className="h-auto w-full object-cover" />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {data.difficulty ? <Chip icon={Flame} label={data.difficulty} /> : null}
                {data.equipment ? <Chip icon={Wrench} label={data.equipment} /> : null}
                {data.objective ? <Chip icon={Target} label={data.objective} /> : null}
              </div>

              {data.muscles_primary?.length ? (
                <Section title="Músculos primários">
                  <div className="flex flex-wrap gap-1.5">
                    {data.muscles_primary.map((m) => (
                      <span key={m} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {m}
                      </span>
                    ))}
                  </div>
                </Section>
              ) : null}

              {data.muscles_secondary?.length ? (
                <Section title="Músculos secundários">
                  <div className="flex flex-wrap gap-1.5">
                    {data.muscles_secondary.map((m) => (
                      <span key={m} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">
                        {m}
                      </span>
                    ))}
                  </div>
                </Section>
              ) : null}

              {data.description ? (
                <Section title="Descrição">
                  <p className="whitespace-pre-line leading-relaxed text-foreground/90">{data.description}</p>
                </Section>
              ) : null}

              {data.instructions ? (
                <Section title="Instruções">
                  <p className="whitespace-pre-line leading-relaxed text-foreground/90">{data.instructions}</p>
                </Section>
              ) : null}

              {templateEx.notes ? (
                <Section title="Notas do treino">
                  <p className="whitespace-pre-line leading-relaxed text-foreground/90">{templateEx.notes}</p>
                </Section>
              ) : null}

              {data.video_url ? (
                <a
                  href={data.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  Ver vídeo demonstrativo
                </a>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Flame; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/60 px-2.5 py-1 text-xs text-foreground/80">
      <Icon className="h-3 w-3 text-fg-muted" />
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[0.625rem] font-bold uppercase tracking-wider text-fg-muted">{title}</h3>
      {children}
    </div>
  );
}

const ACTIONS = [
  { icon: Pencil, label: "Editar" },
  { icon: Copy, label: "Duplicar" },
  { icon: Save, label: "Salvar como Template" },
  { icon: FileDown, label: "Exportar PDF" },
  { icon: Archive, label: "Arquivar" },
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
