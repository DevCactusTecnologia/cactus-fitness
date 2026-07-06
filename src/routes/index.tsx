import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Home, Users, Dumbbell, ClipboardCheck, Wallet, Bell, Search, Sparkles,
  Plus, Calendar, Activity, UserPlus, FileText, Link2, HeartPulse,
  ArrowUpRight, TrendingUp, AlertTriangle, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Sparkline({ up = true }: { up?: boolean }) {
  const d = up
    ? "M2 22 L14 18 L26 20 L38 12 L50 14 L62 6"
    : "M2 10 L14 12 L26 8 L38 14 L50 11 L62 18";
  return (
    <svg viewBox="0 0 64 28" className="h-7 w-24 overflow-visible">
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  label, value, sub, trend, sparkUp = true,
}: { label: string; value: string; sub: string; trend?: string; sparkUp?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="lowercase tracking-wide">{label}</span>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
            <ArrowUpRight className="h-3 w-3" /> {trend}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-4xl font-semibold tracking-tight">{value}</div>
        <Sparkline up={sparkUp} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function SectionCard({
  title, hint, children, footer,
}: { title: string; hint?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 pt-5">
        <h3 className="text-sm font-medium">{title}</h3>
        {hint && <span className="text-xs lowercase text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex-1 px-5 py-4">{children}</div>
      {footer && <div className="border-t border-border px-5 py-3 text-sm">{footer}</div>}
    </div>
  );
}

function SidebarIcon({ icon: Icon, active, badge }: { icon: React.ElementType; active?: boolean; badge?: string }) {
  return (
    <button
      className={`relative grid h-10 w-10 place-items-center rounded-xl transition ${
        active ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}

function Shortcut({ icon: Icon, title, sub, k }: { icon: React.ElementType; title: string; sub: string; k: string }) {
  return (
    <button className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-accent">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="truncate text-xs lowercase text-muted-foreground">{sub}</div>
      </div>
      <kbd className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">{k}</kbd>
    </button>
  );
}

function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Left sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-16 flex-col items-center gap-2 border-r border-border bg-sidebar py-4">
        <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2c-3 4-3 8 0 12 3-4 3-8 0-12zm-7 10c4 3 8 3 12 0-4-3-8-3-12 0zm7 10c-3-4-3-8 0-12 3 4 3 8 0 12z"/></svg>
        </div>
        <SidebarIcon icon={Home} active />
        <SidebarIcon icon={Users} />
        <SidebarIcon icon={Dumbbell} />
        <SidebarIcon icon={ClipboardCheck} />
        <SidebarIcon icon={Wallet} />
        <div className="mt-auto flex flex-col items-center gap-2">
          <SidebarIcon icon={Plus} />
          <SidebarIcon icon={Bell} badge="1" />
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/90 text-sm font-semibold text-white">ML</div>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-16 px-8 py-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Boa tarde, <span className="text-primary">Marcos</span>
              </h1>
              <p className="mt-1 text-sm lowercase text-muted-foreground">segunda-feira, 6 de julho</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground w-[320px]">
                <Search className="h-4 w-4" />
                <span className="flex-1">Buscar aluno, plano, exercício…</span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]">⌘K</kbd>
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/15">
                <Sparkles className="h-4 w-4" /> IA
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="alunos ativos" value="0" sub="+1 este mês" trend="1" />
            <KpiCard label="treinos ativos" value="0" sub="0 periodizados" />
            <KpiCard label="receita do mês" value="R$ 0" sub="vs mês anterior" sparkUp={false} />
            <KpiCard label="avaliações" value="0" sub="em dia" />
          </div>

          {/* Row: Hoje / Pulso */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard
              title="Hoje"
              hint="nenhuma sessão agendada"
              footer={
                <a className="inline-flex items-center gap-1 text-primary hover:underline" href="#">
                  Agenda completa <ChevronRight className="h-4 w-4" />
                </a>
              }
            >
              <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">Sem sessões agendadas pra hoje.</p>
                <a href="#" className="text-sm text-primary hover:underline">Agendar nova sessão →</a>
              </div>
            </SectionCard>

            <SectionCard
              title="Pulso"
              hint="sem atividades recentes"
              footer={
                <a className="inline-flex items-center gap-1 text-primary hover:underline" href="#">
                  Ver todos os pulsos <ChevronRight className="h-4 w-4" />
                </a>
              }
            >
              <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <Activity className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhuma atividade no momento.</p>
              </div>
            </SectionCard>
          </div>

          {/* Atalhos rápidos */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Atalhos rápidos</h3>
              <span className="text-xs lowercase text-muted-foreground">use as teclas</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Shortcut icon={UserPlus} title="Novo aluno" sub="cadastrar ou convidar" k="N" />
              <Shortcut icon={FileText} title="Modelo de plano" sub="criar plano reutilizável" k="P" />
              <Shortcut icon={Link2} title="Link de cadastro" sub="página pública de alunos" k="L" />
              <Shortcut icon={HeartPulse} title="Avaliação física" sub="iniciar nova avaliação" k="A" />
            </div>
          </div>

          {/* A acompanhar */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">A acompanhar</h3>
              <span className="text-xs lowercase text-muted-foreground">snapshot financeiro</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="h-4 w-4 text-primary" /> Carteira
                </div>
                <div className="mt-2 text-2xl font-semibold">R$ 0,00</div>
                <div className="mt-1 text-xs text-muted-foreground">disponível para saque</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-primary" /> Renovações vencendo
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  nenhuma <span className="text-sm font-normal text-muted-foreground">nos próximos 7 dias</span>
                </div>
                <div className="mt-1 text-xs text-primary">ok</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" /> Próximo recebimento
                </div>
                <div className="mt-2 text-2xl font-semibold">—</div>
                <div className="mt-1 text-xs text-muted-foreground">sem agendamentos</div>
              </div>
            </div>
            <div className="mt-4">
              <a href="#" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Ir para financeiro <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
