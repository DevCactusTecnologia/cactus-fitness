import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  X,
  Target,
  Flame,
  Wrench,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { formatRest } from "@/lib/plano";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  block_position: number;
  block_label: string | null;
  sets: number | null;
  reps: string | null;
  load: string | null;
  rest_seconds: number | null;
  notes: string | null;
  exercises: { id: number; name: string; image_path: string | null } | null;
};

type TemplateRow = {
  id: string;
  slug: string | null;
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ModeloDetailPage() {
  const { modeloId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["modelo-detail", modeloId],
    queryFn: async () => {
      const selectStr =
        "id, slug, name, description, kind, created_at, workout_template_exercises ( id, position, session_position, session_label, block_position, block_label, sets, reps, load, rest_seconds, notes, exercises ( id, name, image_path ) )";

      const query = supabase.from("workout_templates").select(selectStr);
      const base = UUID_RE.test(modeloId)
        ? await query.eq("id", modeloId).maybeSingle()
        : await query.eq("slug", modeloId).maybeSingle();
      if (base.error) throw base.error;
      if (!base.data) return null;
      const primary = base.data as unknown as TemplateRow;

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
      const sessions: Session[] = [];
      if (keys.length <= 1) {
        sessions.push({ id: primary.id, name: primary.name, exercises: exs });
      } else {
        for (const k of keys) {
          const arr = bySession.get(k) ?? [];
          const label = arr[0]?.session_label ?? `Sessão ${k + 1}`;
          sessions.push({ id: `${primary.id}:${k}`, name: label, exercises: arr });
        }
      }

      return {
        id: primary.id,
        slug: primary.slug ?? primary.id,
        title: primary.name,
        description: primary.description ?? null,
        kind: primary.kind ?? "template",
        isPlan: primary.kind === "plan" || keys.length > 1,
        sessions,
        totalExercises: sessions.reduce((s, x) => s + x.exercises.length, 0),
      };
    },
  });

  const duplicateMut = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("Modelo não carregado");
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Sessão expirada");

      const { data: src, error: srcErr } = await supabase
        .from("workout_templates")
        .select("name, description, kind, category, duration_min, level, goal, periodize")
        .eq("id", data.id)
        .single();
      if (srcErr) throw srcErr;

      const { data: created, error: insErr } = await supabase
        .from("workout_templates")
        .insert({
          personal_id: userRes.user.id,
          name: `${src.name} (cópia)`,
          description: src.description,
          kind: src.kind,
          category: src.category,
          duration_min: src.duration_min,
          level: src.level,
          goal: src.goal,
          periodize: src.periodize,
        })
        .select("id, slug")
        .single();
      if (insErr || !created) throw insErr ?? new Error("Falha ao duplicar");

      const { data: exRows, error: exErr } = await supabase
        .from("workout_template_exercises")
        .select("exercise_id, sets, reps, load, rest_seconds, notes, position, block_position, session_position, block_label, session_label")
        .eq("template_id", data.id);
      if (exErr) throw exErr;
      if (exRows && exRows.length > 0) {
        const { error } = await supabase
          .from("workout_template_exercises")
          .insert(exRows.map((r) => ({ ...r, template_id: created.id })));
        if (error) throw error;
      }
      return created;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["workout_templates"] });
      toast.success("Modelo duplicado");
      navigate({
        to: "/dashboard/personal/treinos/modelo/$modeloId",
        params: { modeloId: created.slug ?? created.id },
      });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao duplicar"),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("Modelo não carregado");
      const { error } = await supabase.from("workout_templates").delete().eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout_templates"] });
      toast.success("Modelo excluído");
      navigate({ to: "/dashboard/personal/treinos" });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao excluir"),
  });

  const handleEdit = () => {
    if (!data) return;
    navigate({
      to: "/dashboard/personal/treinos/editar/$slug",
      params: { slug: data.slug },
    });
  };

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
                  {data ? (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider ${
                        data.isPlan
                          ? "border-[oklch(0.55_0.22_300)]/30 bg-[oklch(0.55_0.22_300)]/15 text-[oklch(0.75_0.18_300)]"
                          : "border-primary/30 bg-primary/10 text-primary"
                      }`}
                    >
                      <Layers className="h-3 w-3" />
                      {data.isPlan ? "Plano" : "Simples"}
                    </span>
                  ) : null}
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

            <ActionsSidebar
              onEdit={handleEdit}
              onDuplicate={() => duplicateMut.mutate()}
              onDelete={() => setConfirmDelete(true)}
              duplicating={duplicateMut.isPending}
              disabled={!data}
            />
          </div>
        </main>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              O modelo <span className="font-semibold text-foreground">{data?.title}</span> e todos
              os exercícios cadastrados serão removidos permanentemente. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMut.mutate();
              }}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <ExerciseRowItem key={ex.id} ex={ex} idx={i} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ExerciseRowItem({ ex, idx }: { ex: ExerciseRow; idx: number }) {
  const [open, setOpen] = useState(false);
  const rest = formatRest(ex.rest_seconds);
  const setsReps = [ex.sets ? String(ex.sets) : null, ex.reps ?? null]
    .filter(Boolean)
    .join("×");
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
          <p className="truncate text-sm font-medium">
            {ex.exercises?.name ?? "Exercício removido"}
          </p>
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
  templateEx: ExerciseRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    enabled: open,
    queryKey: ["exercise-detail", exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select(
          "id, name, description, instructions, difficulty, equipment, objective, muscles_primary, muscles_secondary, image_path, video_url, video_path",
        )
        .eq("id", exerciseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const rest = formatRest(templateEx.rest_seconds);
  const setsReps = [templateEx.sets ? String(templateEx.sets) : null, templateEx.reps ?? null]
    .filter(Boolean)
    .join("×");

  const videoSrc = data?.video_url ?? data?.video_path ?? null;
  const isYouTube = videoSrc ? /youtu\.?be/.test(videoSrc) : false;
  const youtubeEmbed = isYouTube && videoSrc
    ? videoSrc.replace(/watch\?v=/, "embed/").replace(/youtu\.be\//, "youtube.com/embed/")
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] gap-0 overflow-hidden border-border bg-background p-0">
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

        <div className="max-h-[calc(90vh-90px)] overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-sm text-fg-muted">Carregando…</p>
          ) : !data ? (
            <p className="text-sm text-fg-muted">Detalhes não disponíveis.</p>
          ) : (
            <div className="space-y-5 text-sm">
              {/* Media */}
              {youtubeEmbed ? (
                <div className="aspect-video overflow-hidden rounded-lg border border-border bg-black">
                  <iframe
                    src={youtubeEmbed}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={data.name}
                  />
                </div>
              ) : videoSrc ? (
                <div className="aspect-video overflow-hidden rounded-lg border border-border bg-black">
                  <video
                    src={videoSrc}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : data.image_path ? (
                <div className="overflow-hidden rounded-lg border border-border bg-surface-2">
                  <img
                    src={data.image_path}
                    alt={data.name}
                    className="h-auto w-full object-cover"
                  />
                </div>
              ) : null}

              {data.description ? (
                <Section title="Descrição">
                  <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                    {data.description}
                  </p>
                </Section>
              ) : null}

              {data.instructions ? (
                <Section title="Instruções">
                  <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                    {data.instructions}
                  </p>
                </Section>
              ) : null}

              {(data.difficulty || data.objective || data.equipment) ? (
                <Section title="Detalhes">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.difficulty ? (
                      <DetailRow icon={Flame} label="Nível" value={data.difficulty} />
                    ) : null}
                    {data.objective ? (
                      <DetailRow icon={Target} label="Objetivo" value={data.objective} />
                    ) : null}
                    {data.equipment ? (
                      <DetailRow icon={Wrench} label="Equipamentos" value={data.equipment} />
                    ) : null}
                  </div>
                </Section>
              ) : null}

              {(data.muscles_primary?.length || data.muscles_secondary?.length) ? (
                <Section title="Grupos Musculares">
                  {data.muscles_primary?.length ? (
                    <div className="mb-2">
                      <p className="mb-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted">
                        Primários
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.muscles_primary.map((m) => (
                          <span
                            key={m}
                            className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {data.muscles_secondary?.length ? (
                    <div>
                      <p className="mb-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted">
                        Secundários
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.muscles_secondary.map((m) => (
                          <span
                            key={m}
                            className="rounded-full border border-border bg-surface-2/60 px-2.5 py-1 text-xs text-foreground/80"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Section>
              ) : null}

              {templateEx.notes ? (
                <Section title="Notas do treino">
                  <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                    {templateEx.notes}
                  </p>
                </Section>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/40 px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-fg-muted" />
      <div className="min-w-0">
        <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted">
          {label}
        </p>
        <p className="truncate text-sm text-foreground/90">{value}</p>
      </div>
    </div>
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

function ActionsSidebar({
  onEdit,
  onDuplicate,
  onDelete,
  duplicating,
  disabled,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  duplicating: boolean;
  disabled: boolean;
}) {
  const actions = [
    { icon: Pencil, label: "Editar", onClick: onEdit, loading: false },
    {
      icon: duplicating ? Loader2 : Copy,
      label: duplicating ? "Duplicando…" : "Duplicar",
      onClick: onDuplicate,
      loading: duplicating,
    },
    {
      icon: Trash2,
      label: "Excluir",
      onClick: onDelete,
      loading: false,
      destructive: true as const,
    },
  ];

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="h-px w-full bg-border lg:hidden" />
      <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-fg-muted lg:mt-0">
        Ações
      </h2>
      <div className="flex flex-col gap-2">
        {actions.map(({ icon: Icon, label, onClick, loading, destructive }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            className={`inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-transparent px-6 py-2.5 text-sm font-semibold transition-all hover:border-primary hover:text-primary active:scale-[0.97] disabled:opacity-50 ${
              destructive ? "text-destructive hover:border-destructive hover:text-destructive" : "text-foreground"
            }`}
          >
            <Icon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}
