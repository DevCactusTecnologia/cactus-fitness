import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dumbbell, FolderPlus, Plus,
  ChevronDown, Layers, FileText,
  ArrowLeft, Search, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/cactus-logo.png";

import { MobileBottomNav } from "@/components/MobileBottomNav";
import { IconRail } from "@/components/IconRail";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function NovoModeloMenu({ trigger }: { trigger: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl p-2">
        <DropdownMenuItem asChild className="gap-3 rounded-lg p-3 focus:bg-muted">
          <Link to="/dashboard/personal/treinos/novo-plano" className="flex items-start">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[oklch(0.55_0.22_300)]/15 text-[oklch(0.75_0.18_300)]">
              <Layers className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">Modelo de Plano</span>
              <span className="text-xs text-muted-foreground">Agrupa vários treinos em uma rotina semanal</span>
            </span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-3 rounded-lg p-3 focus:bg-muted">
          <Link to="/dashboard/personal/treinos/novo-template" className="flex items-start">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[oklch(0.6_0.18_240)]/15 text-[oklch(0.75_0.15_240)]">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">Template de Treino</span>
              <span className="text-xs text-muted-foreground">Treino único reutilizável (ex: Peito/Tríceps)</span>
            </span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const Route = createFileRoute("/_authenticated/dashboard/personal/treinos/")({
  head: () => ({
    meta: [
      { title: "Treinos · cactusfitness" },
      { name: "description", content: "Modelos prontos de treino e planos reutilizáveis." },
    ],
  }),
  component: TreinosPage,
});


/* ---------- Page ---------- */
type Modelo = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: string; // "plan" | "template"
  created_at: string;
  sessionCount: number;
  exerciseCount: number;
};

type FilterKind = "todos" | "plan" | "template";

function TreinosPage() {
  const [filter, setFilter] = useState<FilterKind>("todos");
  const [query, setQuery] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["workout_templates", "list"],
    queryFn: async (): Promise<Modelo[]> => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("id, slug, name, description, kind, created_at, workout_template_exercises ( session_position )")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => {
        const exs: { session_position: number }[] = t.workout_template_exercises ?? [];
        const sessions = new Set(exs.map((e) => e.session_position));
        return {
          id: t.id,
          slug: t.slug ?? t.id,
          name: t.name,
          description: t.description,
          kind: t.kind ?? "template",
          created_at: t.created_at,
          sessionCount: Math.max(sessions.size, exs.length > 0 ? 1 : 0),
          exerciseCount: exs.length,
        };
      });
    },
  });

  const total = items.length;

  const totalPlans = items.filter((m) => m.kind === "plan").length;
  const totalTemplates = items.filter((m) => m.kind === "template").length;

  const visible = useMemo(() => {
    return items.filter((m) => {
      if (filter === "plan" && m.kind !== "plan") return false;
      if (filter === "template" && m.kind !== "template") return false;
      if (query.trim() && !m.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [items, filter, query]);


  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail />
      <main className="pb-24 md:ml-[72px] md:pb-8">
        <div className="flex min-h-[84px] items-center border-b border-border bg-background/80 px-4 backdrop-blur md:px-5">
          {/* Mobile header */}
          <div className="flex w-full items-center justify-between gap-2 md:hidden">
            <button
              onClick={() => window.history.back()}
              className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span
                aria-label="CactusFitness"
                role="img"
                className="block h-6 w-6 bg-primary"
                style={{
                  WebkitMaskImage: `url(${logoUrl})`,
                  maskImage: `url(${logoUrl})`,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
              <span className="text-base font-semibold tracking-tight font-display">
                Cactus<span className="italic font-normal">Fitness</span>
              </span>
            </div>
            <NovoModeloMenu
              trigger={
                <button className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.25)] hover:brightness-110">
                  <Plus className="h-4 w-4" />
                  Modelo
                </button>
              }
            />
          </div>

          {/* Desktop header */}
          <div className="hidden w-full flex-wrap items-center justify-between gap-3 md:flex">
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Modelos Prontos</h1>
            <div className="flex items-center gap-4">
              <button className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <FolderPlus className="h-4 w-4" />
                Nova pasta
              </button>
              <NovoModeloMenu
                trigger={
                  <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.25)] hover:brightness-110">
                    <Plus className="h-4 w-4" />
                    Modelo de Treino
                  </button>
                }
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-5 md:px-8 lg:max-w-7xl">

          {/* Info card */}
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Modelos prontos são gabaritos reutilizáveis. Um <span className="font-semibold text-foreground">Modelo de Plano</span> agrupa vários treinos em uma rotina semanal (ex: A/B/C em seg/qua/sex). Um <span className="font-semibold text-foreground">Template de Treino</span> é um treino único e independente (ex: Peito/Tríceps).
            </p>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-3 md:gap-4">
            <StatCard icon={FileText} value={total} label="Total de modelos" tone="green" />
            <StatCard icon={Layers} value={totalPlans} label="Modelos de Plano" tone="purple" />
            <StatCard icon={Dumbbell} value={totalTemplates} label="Templates de Treino" tone="blue" />
          </div>

          {/* Search + Filters */}
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative md:max-w-md md:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar modelos..."
                className="h-11 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
              <FilterSelect
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "todos", label: "Todos os tipos" },
                  { value: "plan", label: "Modelos de Plano" },
                  { value: "template", label: "Templates de Treino" },
                ]}
              />
              <button className="inline-flex items-center justify-between gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-muted">
                Mais recentes
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {visible.length === 0 ? (
              items.length === 0 ? <EmptyState /> : (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
                  Nenhum modelo encontrado.
                </div>
              )
            ) : (
              visible.map((m) => <ModeloRow key={m.id} modelo={m} />)
            )}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

type Tone = "green" | "purple" | "blue";
const TONE_ICON: Record<Tone, string> = {
  green: "text-primary",
  purple: "text-[oklch(0.75_0.18_300)]",
  blue: "text-[oklch(0.75_0.15_240)]",
};
const TONE_BG: Record<Tone, string> = {
  green: "lg:bg-primary/10",
  purple: "lg:bg-[oklch(0.55_0.22_300)]/10",
  blue: "lg:bg-[oklch(0.6_0.18_240)]/10",
};

function StatCard({
  icon: Icon, value, label, tone = "green",
}: { icon: React.ElementType; value: number; label: string; tone?: Tone }) {
  return (
    <div className="rounded-xl bg-card/50 p-3 text-center lg:flex lg:items-center lg:gap-3 lg:p-4 lg:text-left">
      <div className={`lg:flex lg:h-10 lg:w-10 lg:shrink-0 lg:items-center lg:justify-center lg:rounded-lg ${TONE_BG[tone]}`}>
        <Icon className={`mx-auto mb-1 h-5 w-5 lg:mx-0 lg:mb-0 ${TONE_ICON[tone]}`} />
      </div>
      <div className="lg:min-w-0">
        <p className="font-display text-lg font-bold lg:text-2xl lg:leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground lg:mt-1 lg:text-xs">{label}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div>
      <div className="mb-20 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-primary/20">
          <FileText className="h-7 w-7 text-primary" />
        </div>
        <h3 className="mb-1 font-display text-lg font-bold text-foreground">Crie seu primeiro modelo</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Modelos são gabaritos reutilizáveis. Crie uma vez e use em vários alunos.
        </p>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comece por aqui</p>
        <Link
          to="/dashboard/personal/treinos/novo-plano"
          className="flex w-full items-center gap-4 rounded-xl border border-primary/40 bg-primary/5 p-4 text-left transition-all hover:bg-primary/10 active:scale-[0.98]"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[oklch(0.55_0.22_300)]/15 text-[oklch(0.75_0.18_300)]">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Modelo de Plano</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Agrupa vários treinos em uma rotina semanal (ex: A/B/C, seg/qua/sex)
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-[10px] font-semibold text-primary">
            Recomendado
          </span>
        </Link>
        <Link
          to="/dashboard/personal/treinos/novo-template"
          className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-muted/60 active:scale-[0.98]"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[oklch(0.6_0.18_240)]/15 text-[oklch(0.75_0.15_240)]">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Template de Treino</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Treino único reutilizável (ex: Peito/Tríceps) — ideal para aulas avulsas
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function FilterSelect<T extends string>({
  value, onChange, options,
}: {
  value: T; onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-full border border-border bg-card px-4 py-2 pr-8 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card text-foreground">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function ModeloRow({ modelo }: { modelo: Modelo }) {
  const isPlan = modelo.kind === "plan";
  const Icon = isPlan ? Layers : FileText;

  return (
    <Link
      to="/dashboard/personal/treinos/modelo/$modeloId"
      params={{ modeloId: modelo.slug }}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/40 hover:bg-muted/50 lg:p-4"
    >

      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${
          isPlan
            ? "bg-[oklch(0.55_0.22_300)]/15 text-[oklch(0.75_0.18_300)]"
            : "bg-primary/15 text-primary"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{modelo.name}</p>
          <span
            className={`shrink-0 rounded-full border px-2 py-0 text-[0.625rem] font-semibold uppercase tracking-wider ${
              isPlan
                ? "border-[oklch(0.55_0.22_300)]/30 bg-[oklch(0.55_0.22_300)]/10 text-[oklch(0.75_0.18_300)]"
                : "border-primary/30 bg-primary/10 text-primary"
            }`}
          >
            {isPlan ? "Plano de treino" : "Treino único"}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Layers className="h-3 w-3" />
            <span className="font-semibold text-foreground/80">{modelo.sessionCount}</span>
            <span>{modelo.sessionCount === 1 ? "sessão" : "sessões"}</span>
          </span>
          {modelo.exerciseCount > 0 ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Dumbbell className="h-3 w-3" />
              <span className="font-semibold text-foreground/80">{modelo.exerciseCount}</span>
              <span>{modelo.exerciseCount === 1 ? "exercício" : "exercícios"}</span>
            </span>
          ) : null}
          {modelo.description ? (
            <span className="max-w-xs truncate">{modelo.description}</span>
          ) : null}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </Link>
  );
}

