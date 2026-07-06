import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Home, Users, Dumbbell, ClipboardCheck, Wallet, Bell, Plus,
  Link2, Search, LayoutGrid, SlidersHorizontal, ArrowLeft,
  ChevronRight, ChevronDown, Calendar, ArrowUpDown,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/personal/alunos/")({
  head: () => ({
    meta: [
      { title: "Alunos · cactusfitness" },
      { name: "description", content: "Gerencie seus alunos ativos, convidados e desativados." },
    ],
  }),
  component: AlunosPage,
});

function SidebarIcon({
  icon: Icon, active, badge, to,
}: { icon: React.ElementType; active?: boolean; badge?: string; to?: string }) {
  const cls = `relative grid h-10 w-10 place-items-center rounded-xl transition ${
    active ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
  }`;
  const content = (
    <>
      <Icon className="h-5 w-5" />
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
    </>
  );
  if (to) return <Link to={to} className={cls}>{content}</Link>;
  return <button className={cls}>{content}</button>;
}

function InfoCard({
  title, desc, icon: Icon,
}: { title: string; desc: string; icon: React.ElementType }) {
  return (
    <button className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/40 hover:bg-accent">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" />
    </button>
  );
}

function Tab({ label, count, active }: { label: string; count?: number; active?: boolean }) {
  return (
    <button
      className={`rounded-full px-4 py-1.5 text-sm transition ${
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

function AlunosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-16 flex-col items-center gap-2 border-r border-border bg-sidebar py-4">
        <Link to="/" className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2c-3 4-3 8 0 12 3-4 3-8 0-12zm-7 10c4 3 8 3 12 0-4-3-8-3-12 0zm7 10c-3-4-3-8 0-12 3 4 3 8 0 12z"/></svg>
        </Link>
        <SidebarIcon icon={Home} to="/" />
        <SidebarIcon icon={Users} active />
        <SidebarIcon icon={Dumbbell} />
        <SidebarIcon icon={ClipboardCheck} />
        <SidebarIcon icon={Wallet} />
        <div className="mt-auto flex flex-col items-center gap-2">
          <SidebarIcon icon={Plus} />
          <SidebarIcon icon={Bell} badge="1" />
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/90 text-sm font-semibold text-white">ML</div>
        </div>
      </aside>

      <main className="ml-16 px-8 py-8">
        <div className="mx-auto max-w-7xl">
          {/* Back + title */}
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> voltar
          </Link>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Alunos</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
                <Link2 className="h-4 w-4" /> Link de cadastro
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" /> Novo Aluno
              </button>
            </div>
          </div>

          {/* Search + category tools */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="buscar alunos…"
                className="w-full bg-transparent placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
              <LayoutGrid className="h-4 w-4" /> Categorias
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
              <SlidersHorizontal className="h-4 w-4" /> Filtrar por categoria
            </button>
          </div>

          {/* Info cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoCard
              icon={ArrowUpDown}
              title="Rotinas de treino"
              desc="Veja quem treinou e quantas vezes em qualquer período."
            />
            <InfoCard
              icon={Calendar}
              title="Vencimento dos treinos"
              desc="Veja quando o treino de cada aluno termina e quem precisa renovar."
            />
          </div>

          {/* Tabs + sort */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1">
              <Tab label="Todos" count={1} active />
              <Tab label="Ativos" />
              <Tab label="Convidados" count={1} />
              <Tab label="Desativados" />
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
              <ArrowUpDown className="h-4 w-4" /> Mais recentes
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">1 aluno encontrado</p>

          {/* Table */}
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-4 border-b border-border px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
              <div>Nome</div>
              <div>Status</div>
              <div>Último Acesso</div>
              <div className="w-8" />
            </div>
            <Link
              to="/alunos/$alunoId"
              params={{ alunoId: "aluno_rEq1kmNL0O" }}
              className="grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-4 px-5 py-4 hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-fuchsia-600 text-sm font-semibold text-white">ML</div>
                <div className="min-w-0">
                  <div className="truncate font-medium">marcos_Lisboa</div>
                  <div className="truncate text-xs text-muted-foreground">marcosalan.bcc@gmail.com</div>
                </div>
              </div>
              <div>
                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs text-amber-400">
                  Convidado
                </span>
              </div>
              <div className="text-sm">
                <div>Nunca acessou</div>
                <div className="text-xs text-muted-foreground">Convidado</div>
              </div>
              <span className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
