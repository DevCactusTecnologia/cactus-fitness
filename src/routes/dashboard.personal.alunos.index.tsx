import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Home, Calendar, Plus, Bell, Users,
  Link2, Search, LayoutGrid, ChevronRight, ChevronDown, Play, Filter,
  Activity, CalendarDays, ArrowUpDown, Dumbbell, ClipboardCheck, Trophy, ClipboardList,
} from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";

export const Route = createFileRoute("/dashboard/personal/alunos/")({
  head: () => ({
    meta: [
      { title: "Alunos · cactusfitness" },
      { name: "description", content: "Gerencie seus alunos ativos, convidados e desativados." },
    ],
  }),
  component: AlunosPage,
});

/* ---------- Sidebar (mesmo padrão do Início / Agenda) ---------- */

const NAV = [
  { icon: Home, label: "Início", to: "/" as const },
  { icon: Calendar, label: "Agenda", to: "/dashboard/personal/agenda" as const },
];

function SidebarIconBtn({
  icon: Icon, active, badge, to, onClick, variant = "ghost", label,
}: {
  icon: React.ElementType; active?: boolean; badge?: string; to?: string;
  onClick?: () => void; variant?: "ghost" | "primary"; label?: string;
}) {
  const base = "group relative grid h-11 w-11 place-items-center rounded-[10px] transition";
  const styles =
    variant === "primary"
      ? "h-8 w-8 bg-primary text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110"
      : active
      ? "bg-primary/20 text-primary"
      : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground";
  const inner = (
    <>
      {active && <span className="absolute -left-3.5 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
      <Icon className={variant === "primary" ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.75} />
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
  return <button onClick={onClick} title={label} className={`${base} ${styles}`}>{inner}</button>;
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
      <SidebarIconBtn icon={Users} active label="Alunos" />
      <SidebarIconBtn icon={ClipboardList} to="/dashboard/personal/treinos" label="Treinos" />
      <SidebarIconBtn icon={Dumbbell} to="/dashboard/personal/exercicios" label="Exercícios" />
      <SidebarIconBtn icon={ClipboardCheck} to="/" label="Avaliações" />
      <SidebarIconBtn icon={Trophy} to="/" label="Desafios" />
      <SidebarIconBtn icon={Calendar} to="/dashboard/personal/agenda" label="Agenda" />
      <div className="mt-auto flex flex-col items-center gap-2">
        <SidebarIconBtn icon={Plus} variant="primary" />
        <SidebarIconBtn icon={Bell} badge="3" />
        <UserAvatarMenu initials="ML" name="Meu perfil" />
      </div>
    </aside>
  );
}

/* ---------- Info card ---------- */

function InfoCard({
  title, desc, icon: Icon,
}: { title: string; desc: string; icon: React.ElementType }) {
  return (
    <button className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition hover:border-border-strong">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:text-foreground" />
    </button>
  );
}

/* ---------- Tab ---------- */

function Tab({ label, count, active }: { label: string; count?: number; active?: boolean }) {
  return (
    <button
      className={`rounded-full px-3.5 py-1.5 text-sm transition ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-1 opacity-70">({count})</span>}
    </button>
  );
}

/* ---------- Page ---------- */

function AlunosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail />

      <main className="pb-24 md:ml-[72px] md:pb-0">
        {/* Header translúcido */}
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-bold tracking-tight font-display sm:text-3xl">Alunos</h1>
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-2 text-sm hover:bg-accent">
                <Link2 className="h-4 w-4" /> <span className="hidden sm:inline">Link de cadastro</span><span className="sm:hidden">Link</span>
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110">
                <Plus className="h-4 w-4" /> Novo Aluno
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-3xl">



        {/* Search + tools */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="buscar alunos..."
              className="w-full bg-transparent placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm hover:bg-accent">
            <LayoutGrid className="h-4 w-4" /> Gerenciar Categorias
          </button>
        </div>

        <div className="mt-3">
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
            <Filter className="h-3.5 w-3.5" /> Filtrar por categoria
          </button>
        </div>

        {/* Info cards */}
        <div className="mt-4 flex flex-col gap-3">
          <InfoCard
            icon={Activity}
            title="Rotinas de treino"
            desc="Veja quem treinou e quantas vezes em qualquer período."
          />
          <InfoCard
            icon={CalendarDays}
            title="Vencimento dos treinos"
            desc="Veja quando o treino de cada aluno termina e quem precisa renovar."
          />
        </div>

        {/* Tabs + sort */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1">
            <Tab label="Todos" count={1} active />
            <Tab label="Ativos" count={1} />
            <Tab label="Convidados" />
            <Tab label="Desativados" />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent">
            <ArrowUpDown className="h-4 w-4" /> Mais recentes
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">1 aluno encontrado</p>

        {/* Table */}
        <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[1.6fr_1fr_1fr_auto] items-center gap-4 border-b border-border px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div>Nome</div>
            <div>Status</div>
            <div>Último Acesso</div>
            <div className="w-8" />
          </div>
          <Link
            to="/dashboard/personal/alunos/$alunoId"
            params={{ alunoId: "aluno_rEq1kmNL0O" }}
            className="grid grid-cols-[1.6fr_1fr_1fr_auto] items-center gap-4 px-5 py-4 transition hover:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 text-sm font-bold text-white font-display ring-2 ring-border">
                ML
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">marcos Lisboa</div>
                <div className="truncate text-xs text-muted-foreground">marcosalan.bcc@gmail.com</div>
              </div>
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Ativo
              </span>
            </div>
            <div className="text-sm">
              <div>Hoje</div>
              <div className="text-xs text-muted-foreground">Ativo</div>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground">
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
        </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>

  );
}
