import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home, Calendar, GraduationCap, SlidersHorizontal, Bell, Users,
  Dumbbell, ClipboardCheck, Trophy, ClipboardList, FolderPlus, Plus,
  Info, ChevronDown, LayoutGrid, Layers, FileText, MoreHorizontal,
  ArrowLeft, Search,
} from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";

export const Route = createFileRoute("/dashboard/personal/treinos")({
  head: () => ({
    meta: [
      { title: "Treinos · cactusfitness" },
      { name: "description", content: "Modelos prontos de treino e planos reutilizáveis." },
    ],
  }),
  component: TreinosPage,
});

/* ---------- Sidebar ---------- */
function SidebarIconBtn({
  icon: Icon, active, badge, to, label,
}: {
  icon: React.ElementType; active?: boolean; badge?: string; to?: string; label?: string;
}) {
  const base = "group relative grid h-11 w-11 place-items-center rounded-[10px] transition";
  const styles = active
    ? "bg-primary/20 text-primary"
    : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground";
  const inner = (
    <>
      {active && <span className="absolute -left-3.5 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
      <Icon className="h-5 w-5" strokeWidth={1.75} />
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
      {label && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-border opacity-0 group-hover:opacity-100 transition">
          {label}
        </span>
      )}
    </>
  );
  if (to) return <Link to={to} title={label} className={`${base} ${styles}`}>{inner}</Link>;
  return <button title={label} className={`${base} ${styles}`}>{inner}</button>;
}

function IconRail() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center gap-2 border-r border-border bg-sidebar py-4 md:flex">
      <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl">
        <svg viewBox="0 0 32 32" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8 L10 24 L16 14 L22 24 L28 8" />
        </svg>
      </div>
      <SidebarIconBtn icon={Home} to="/" label="Início" />
      <SidebarIconBtn icon={Users} to="/dashboard/personal/alunos" label="Alunos" />
      <SidebarIconBtn icon={ClipboardList} active label="Treinos" />
      <SidebarIconBtn icon={Dumbbell} to="/dashboard/personal/exercicios" label="Exercícios" />
      <SidebarIconBtn icon={ClipboardCheck} to="/" label="Avaliações" />
      <SidebarIconBtn icon={Trophy} to="/" label="Desafios" />
      <SidebarIconBtn icon={Calendar} to="/dashboard/personal/agenda" label="Agenda" />
      <SidebarIconBtn icon={GraduationCap} to="/" label="Tutoriais" />
      <SidebarIconBtn icon={SlidersHorizontal} to="/" label="Configurações" />
      <div className="mt-auto flex flex-col items-center gap-2">
        <SidebarIconBtn icon={Bell} badge="3" />
        <UserAvatarMenu initials="ML" name="Meu perfil" />
      </div>
    </aside>
  );
}

/* ---------- Page ---------- */
type Kind = "plano" | "template";
type Modelo = { id: string; name: string; kind: Kind; sessions: number; tag: string };

const SEED: Modelo[] = [
  { id: "1", name: "teste", kind: "plano", sessions: 1, tag: "Simples" },
];

function TreinosPage() {
  const [items] = useState<Modelo[]>(SEED);
  const [filter, setFilter] = useState<"todos" | "plano" | "template">("todos");

  const total = items.length;
  const planos = items.filter((m) => m.kind === "plano").length;
  const templates = items.filter((m) => m.kind === "template").length;

  const visible = items.filter((m) => filter === "todos" || m.kind === filter);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail />

      <main className="pb-24 md:pl-[72px] md:pb-8">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          {/* Mobile header */}
          <div className="mb-4 flex items-center justify-between gap-2 md:hidden">
            <button
              onClick={() => window.history.back()}
              className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 32 32" className="h-6 w-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8 L10 24 L16 14 L22 24 L28 8" />
              </svg>
              <span className="text-lg font-bold tracking-tight">
                well<span className="italic font-light">trainer</span>
              </span>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Nova pasta">
              <FolderPlus className="h-5 w-5" />
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.25)] hover:brightness-110">
              <Plus className="h-4 w-4" />
              Modelo de Treino
            </button>
          </div>

          {/* Desktop header */}
          <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Modelos Prontos</h1>
            <div className="flex items-center gap-4">
              <button className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <FolderPlus className="h-4 w-4" />
                Nova pasta
              </button>
              <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.25)] hover:brightness-110">
                <Plus className="h-4 w-4" />
                Modelo de Treino
              </button>
            </div>
          </div>

          {/* Info banner */}
          <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground md:p-5">
            <div className="flex gap-3 md:block">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary md:hidden" />
              <div className="space-y-1 md:space-y-0">
                <p className="md:inline">
                  <span className="font-semibold text-foreground">Modelos prontos</span> são gabaritos reutilizáveis.{" "}
                </p>
                <p className="md:inline">
                  Um <span className="font-semibold text-foreground">Modelo de Plano</span> agrupa vários treinos em uma rotina semanal (ex: A/B/C em seg/qua/sex).{" "}
                </p>
                <p className="md:inline">
                  Um <span className="font-semibold text-foreground">Template de Treino</span> é um treino único e independente (ex: Peito/Tríceps).
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3 md:gap-4">
            <StatCard icon={FileText} value={total} label="Total de modelos" />
            <StatCard icon={Layers} value={planos} label="Modelos de Plano" />
            <StatCard icon={Dumbbell} value={templates} label="Templates de Treino" />
          </div>

          {/* Search + Filters */}
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative md:max-w-md md:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
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
                  { value: "plano", label: "Modelos de Plano" },
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
          <div className="mt-4 space-y-2">
            {visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Nenhum modelo encontrado.
              </div>
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

function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
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
  const kindLabel = modelo.kind === "plano" ? "Modelo de Plano" : "Template de Treino";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          {modelo.kind === "plano" ? <Layers className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
        <div>
          <div className="font-semibold">{modelo.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{kindLabel}</span>
            <span>•</span>
            <span className="rounded-full bg-muted px-2 py-0.5">{modelo.tag}</span>
            <span>•</span>
            <span>{modelo.sessions} {modelo.sessions === 1 ? "sessão" : "sessões"}</span>
          </div>
        </div>
      </div>
      <button className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
