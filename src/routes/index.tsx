import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home, Users, MessageCircle, Calendar, GraduationCap, SlidersHorizontal,
  Plus, Bell, PanelLeftClose, PanelLeftOpen, Crown, Wallet, Lock, Activity,
  ChevronDown, ChevronRight, Pencil, HeartPulse, Dumbbell, Trophy, Gift,
  Lightbulb, Sparkles, Eye, ArrowRight, Menu as MenuIcon, Search,
  UserPlus, FileText, Link2, TrendingUp, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

/* ---------- Desktop KPI helpers ---------- */

function Sparkline({ up = true }: { up?: boolean }) {
  const d = up
    ? "M 0 21 L 12 21 L 24 21 L 36 21 L 48 21 L 60 21 L 72 1"
    : "M 0 21 L 12 21 L 24 21 L 36 21 L 48 21 L 60 21 L 72 21";
  return (
    <svg viewBox="0 0 72 22" className="h-[22px] w-[72px] overflow-visible">
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  label, value, sub, trend, sparkUp = true,
}: { label: string; value: string; sub: string; trend?: string; sparkUp?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] font-semibold text-fg-secondary">{label}</span>
        {trend && (
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-display text-[0.625rem] font-bold leading-none text-primary">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="font-display text-[1.625rem] font-extrabold leading-none tracking-tight">{value}</div>
        <Sparkline up={sparkUp} />
      </div>
      <div className="mt-1.5 truncate text-[0.6875rem] text-fg-muted">{sub}</div>
    </div>
  );
}

function SectionCard({
  title, hint, children, headerAction, footer,
}: { title: string; hint?: string; children: React.ReactNode; headerAction?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-lg border border-border bg-bg-elevated">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="font-display text-base font-bold">{title}</h2>
          {hint && <p className="text-[0.6875rem] text-fg-muted">{hint}</p>}
        </div>
        {headerAction}
      </div>
      <div className="flex-1">{children}</div>
      {footer}
    </section>
  );
}

function Shortcut({ icon: Icon, title, sub, k, to }: { icon: React.ElementType; title: string; sub: string; k: string; to?: string }) {
  const cls = "group flex items-center gap-3 rounded-md border border-border bg-surface-2 p-3 text-left transition-colors hover:border-border-strong hover:bg-surface-3";
  const inner = (
    <>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[0.75rem] font-semibold">{title}</div>
        <div className="truncate text-[0.625rem] lowercase text-fg-muted">{sub}</div>
      </div>
      <kbd className="rounded border border-border bg-surface-3 px-1.5 py-0.5 font-mono text-[0.625rem] text-fg-secondary">{k}</kbd>
    </>
  );
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button className={cls}>{inner}</button>;
}

function ListRow({
  icon: Icon, label, sub, value, valueClass,
}: { icon: React.ElementType; label: string; sub: string; value: string; valueClass?: string }) {
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-3 text-fg-secondary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[0.75rem] font-semibold">{label}</div>
        <div className="mt-0.5 truncate text-[0.6875rem] text-fg-muted">{sub}</div>
      </div>
      {value && (
        <div className={valueClass ?? "font-display text-sm font-extrabold tracking-tight"}>{value}</div>
      )}
    </li>
  );
}

/* ---------- Sidebar ---------- */

function SidebarIconBtn({
  icon: Icon, active, badge, onClick, variant = "ghost",
}: {
  icon: React.ElementType; active?: boolean; badge?: string;
  onClick?: () => void; variant?: "ghost" | "primary";
}) {
  const base = "relative grid h-10 w-10 place-items-center rounded-xl transition";
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110"
      : active
      ? "bg-primary/15 text-primary"
      : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground";
  return (
    <button onClick={onClick} className={`${base} ${styles}`}>
      <Icon className="h-5 w-5" strokeWidth={1.75} />
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

const NAV_ITEMS = [
  { icon: Home, label: "Início", to: "/", active: true },
  { icon: MessageCircle, label: "Mensagens", to: "/" },
  { icon: Calendar, label: "Agenda", to: "/" },
  { icon: GraduationCap, label: "Tutoriais", to: "/" },
  { icon: SlidersHorizontal, label: "Configurações", to: "/" },
];

const SUBMENU_ITEMS = [
  { icon: Home, label: "Início", to: "/", active: true },
  { icon: Users, label: "Alunos", to: "/dashboard/personal/alunos" },
  { icon: MessageCircle, label: "Mensagens", to: "/" },
  { icon: Calendar, label: "Agenda", to: "/" },
  { icon: GraduationCap, label: "Tutoriais", to: "/" },
];

function IconRail({ onToggleMenu, menuOpen }: { onToggleMenu: () => void; menuOpen: boolean }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-center gap-2 border-r border-border bg-sidebar py-4 md:flex">
      <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl">
        <svg viewBox="0 0 32 32" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8 L10 24 L16 14 L22 24 L28 8" />
        </svg>
      </div>
      {NAV_ITEMS.map((n) => (
        <SidebarIconBtn key={n.label} icon={n.icon} active={n.active} />
      ))}

      <div className="mt-auto flex flex-col items-center gap-2">
        <SidebarIconBtn icon={Plus} variant="primary" />
        <SidebarIconBtn icon={Bell} badge="2" />
        <SidebarIconBtn
          icon={menuOpen ? PanelLeftClose : PanelLeftOpen}
          onClick={onToggleMenu}
        />
        <div className="relative">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-destructive text-sm font-bold text-white ring-1 ring-border hover:ring-border-strong font-display">
            ML
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-sidebar" />
        </div>
      </div>
    </aside>
  );
}

/* ---------- Submenu (expandable panel) ---------- */

function ExpandedMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Persistent on lg+, overlay on md when toggled open
  const overlayVisible = open;
  return (
    <>
      {overlayVisible && (
        <button
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:block"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-16 z-40 w-64 flex-col border-r border-border bg-sidebar p-4 ${
          overlayVisible ? "flex" : "hidden"
        }`}
      >
        <div className="mb-4 flex items-center gap-2 px-2 pt-1">
          <svg viewBox="0 0 32 32" className="h-6 w-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8 L10 24 L16 14 L22 24 L28 8" />
          </svg>
          <span className="text-lg font-semibold tracking-tight font-display">
            well<span className="italic font-normal">trainer</span>
          </span>
        </div>

        <button className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition hover:border-primary/40">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-[10px] font-semibold uppercase text-muted-foreground">
            FREE
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Plano Grátis</div>
            <div className="truncate text-xs text-muted-foreground">conheça os planos pagos</div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Navegação
        </div>
        <nav className="flex flex-col gap-1">
          {SUBMENU_ITEMS.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                n.active
                  ? "bg-primary/15 text-primary"
                  : "text-sidebar-foreground/85 hover:bg-white/5 hover:text-sidebar-foreground"
              }`}
            >
              <n.icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="font-medium">{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mb-2 mt-6 px-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Recentes
        </div>
        <div className="flex flex-col gap-1">
          {[
            { icon: Home, label: "Início", when: "3min" },
            { icon: Users, label: "Alunos", when: "39min" },
          ].map((r) => (
            <button
              key={r.label}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-white/5"
            >
              <r.icon className="h-4 w-4" strokeWidth={1.75} />
              <span className="flex-1 text-left">{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.when}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}

/* ---------- Mobile top / bottom bars ---------- */

function MobileTopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 32 32" className="h-6 w-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8 L10 24 L16 14 L22 24 L28 8" />
        </svg>
        <span className="text-base font-semibold tracking-tight font-display">
          well<span className="italic font-normal">trainer</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>IA</span>
          <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const items = [
    { icon: Home, label: "Início", active: true },
    { icon: Users, label: "Alunos" },
    { icon: Dumbbell, label: "Treinos" },
    { icon: Bell, label: "Notificações", badge: "2" },
    { icon: MenuIcon, label: "Menu" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-border bg-background/95 px-2 py-2 backdrop-blur md:hidden">
      {items.map((i) => (
        <button
          key={i.label}
          className={`relative flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] ${
            i.active ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <span className="relative">
            <i.icon className="h-5 w-5" strokeWidth={1.75} />
            {i.badge && (
              <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                {i.badge}
              </span>
            )}
          </span>
          <span>{i.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ---------- Content blocks ---------- */

function PlanBanner() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Crown className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold">Plano grátis — 1 aluno</div>
        <div className="text-sm text-muted-foreground">Faça upgrade para gerenciar mais alunos</div>
      </div>
      <button className="shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.3)] hover:brightness-110">
        Upgrade
      </button>
    </div>
  );
}

function GreetingCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-destructive text-sm font-semibold text-white">
          ML
        </div>
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">Boa tarde,</div>
          <div className="text-xl font-bold tracking-tight font-display">Marcos</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4">
        <div>
          <div className="text-3xl font-bold font-display">1</div>
          <div className="mt-1 text-xs leading-tight text-muted-foreground">alunos<br/>ativos</div>
          <div className="mt-1 text-xs font-semibold text-primary">↑ 1 este mês</div>
        </div>
        <div>
          <div className="text-3xl font-bold font-display">0</div>
          <div className="mt-1 text-xs leading-tight text-muted-foreground">treinos<br/>ativos</div>
        </div>
        <div>
          <div className="text-3xl font-bold font-display">0</div>
          <div className="mt-1 text-xs leading-tight text-muted-foreground">avaliações<br/>físicas</div>
        </div>
      </div>
    </div>
  );
}

function WalletCard() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Wallet className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm text-muted-foreground">Carteira Welltrainer</div>
      <div className="text-2xl font-bold text-primary font-display">R$ 0,00</div>
      <div className="mt-auto flex items-center justify-end gap-2 pt-4">
        <button className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-white/5">
          <Eye className="h-4 w-4" />
        </button>
        <button className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-white/5">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 text-left transition hover:border-primary/40">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/60 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <span className="text-base font-semibold">{label}</span>
    </button>
  );
}

function PulseRow() {
  return (
    <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition hover:border-primary/40">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-muted-foreground">
        <Activity className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">pulso dos alunos</div>
        <div className="truncate text-xs text-muted-foreground">Tudo tranquilo · sem novidades</div>
      </div>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function QuickTile({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button className="flex flex-col items-center gap-2 py-2 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <span className="text-xs font-medium text-foreground/85">{label}</span>
    </button>
  );
}

function ReferralBanner() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-primary/30 bg-[linear-gradient(135deg,rgba(76,175,80,0.12),rgba(76,175,80,0.04))] p-4 md:p-5">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Gift className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">Indique e ganhe 15% recorrente</div>
        <div className="text-xs text-muted-foreground">
          Receba 15% de cada mensalidade paga, todo mês, enquanto o indicado mantiver a assinatura.
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
    </div>
  );
}

/* ---------- Dashboard ---------- */

function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail onToggleMenu={() => setMenuOpen((v) => !v)} menuOpen={menuOpen} />
      <ExpandedMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <MobileTopBar onOpenMenu={() => setMenuOpen(true)} />

      <main className="pb-24 md:ml-16 md:pb-8">
        {/* ==================== DESKTOP (lg+) ==================== */}
        <div className="hidden lg:block">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 pb-12 pt-4">
            {/* Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
              <div>
                <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
                  Boa tarde, Marcos
                </h1>
                <p className="mt-1 text-[0.8125rem] text-fg-muted">segunda-feira, 6 de julho</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden h-9 min-w-[280px] items-center gap-2 rounded-full border border-border bg-surface-1 px-3.5 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg md:inline-flex">
                  <Search className="h-3.5 w-3.5" />
                  <span className="flex-1 truncate">Buscar aluno, plano, exercício…</span>
                  <kbd className="rounded border border-border bg-surface-3 px-1.5 py-0.5 font-mono text-[0.625rem] text-fg-secondary">⌘K</kbd>
                </div>
                <button className="inline-flex h-9 items-center gap-2 rounded-full border border-primary/30 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/10">
                  <Sparkles className="h-3.5 w-3.5" /> IA
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary-glow-strong)]" />
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard label="Alunos ativos" value="1" sub="+1 este mês" trend="1" />
              <KpiCard label="Treinos ativos" value="0" sub="0 periodizados" />
              <KpiCard label="Receita do mês" value="R$ 0" sub="vs mês anterior" sparkUp={false} />
              <KpiCard label="Avaliações" value="0" sub="em dia" />
            </div>

            {/* Hoje / Pulso */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.55fr_1fr]">
              <SectionCard
                title="Hoje"
                hint="nenhuma sessão agendada"
                headerAction={
                  <a className="inline-flex items-center gap-1 text-[0.6875rem] font-bold text-primary hover:underline" href="#">
                    Agenda completa <ArrowRight className="h-3 w-3" />
                  </a>
                }
              >
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                  <Calendar className="h-8 w-8 text-fg-dim" />
                  <p className="text-sm text-fg-muted">Sem sessões agendadas pra hoje.</p>
                  <a href="#" className="text-[0.75rem] font-semibold text-primary hover:underline">Agendar nova sessão →</a>
                </div>
              </SectionCard>

              <SectionCard title="Pulso" hint="sem atividades recentes"
                footer={
                  <a className="flex items-center justify-center gap-1 border-t border-border px-4 py-2.5 text-[0.6875rem] font-bold text-primary transition-colors hover:bg-primary/10" href="#">
                    Ver todos os pulsos <ArrowRight className="h-3 w-3" />
                  </a>
                }
              >
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                  <Activity className="h-8 w-8 text-fg-dim" />
                  <p className="text-sm text-fg-muted">Nenhuma atividade no momento.</p>
                </div>
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.55fr_1fr]">
              {/* Atalhos rápidos */}
              <section className="rounded-xl border border-border bg-bg-elevated">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="font-display text-base font-bold">Atalhos rápidos</h2>
                  <span className="font-mono text-[0.625rem] text-fg-muted">use as teclas</span>
                </div>
                <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                  <Shortcut icon={UserPlus} title="Novo aluno" sub="cadastrar ou convidar" k="N" to="/dashboard/personal/alunos" />
                  <Shortcut icon={FileText} title="Modelo de plano" sub="criar plano reutilizável" k="P" />
                  <Shortcut icon={Link2} title="Link de cadastro" sub="página pública de alunos" k="L" />
                  <Shortcut icon={HeartPulse} title="Avaliação física" sub="iniciar nova avaliação" k="A" />
                </div>
              </section>

              {/* A acompanhar */}
              <section className="rounded-xl border border-border bg-bg-elevated">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="font-display text-base font-bold">A acompanhar</h2>
                  <p className="text-[0.6875rem] text-fg-muted">snapshot financeiro</p>
                </div>
                <ul className="divide-y divide-border-subtle">
                  <ListRow icon={Wallet} label="Carteira" sub="disponível para saque" value="R$ 0,00" />
                  <ListRow icon={AlertTriangle} label="Renovações vencendo" sub="nenhuma nos próximos 7 dias" value="OK" valueClass="rounded-full bg-surface-3 px-2 py-1 text-[0.625rem] font-bold text-fg-muted" />
                  <ListRow icon={TrendingUp} label="Próximo recebimento" sub="sem agendamentos" value="" />
                </ul>
                <a href="#" className="flex items-center justify-center gap-1 border-t border-border px-4 py-2.5 text-[0.6875rem] font-bold text-primary transition-colors hover:bg-primary/10">
                  Ir para financeiro <ArrowRight className="h-3 w-3" />
                </a>
              </section>
            </div>
          </div>
        </div>

        {/* ==================== TABLET / MOBILE (<lg) ==================== */}
        <div className="lg:hidden">
          <div className="mx-auto max-w-6xl px-4 py-4 md:px-8 md:py-8">
            <div className="mb-6 hidden items-start justify-between gap-4 md:flex">
              <div>
                <h1 className="text-3xl font-bold tracking-tight font-display">Início</h1>
                <p className="mt-1 text-sm text-muted-foreground">segunda-feira, 6 de julho</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground hover:bg-white/5">
                  <Lightbulb className="h-4 w-4" />
                </button>
                <button className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-white/5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>IA</span>
                  <span className="ml-0.5 h-2 w-2 rounded-full bg-primary" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <PlanBanner />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
                <GreetingCard />
                <WalletCard />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ActionButton icon={Lock} label="Adicionar Aluno" />
                <ActionButton icon={Lock} label="Link de Cadastro" />
              </div>
              <PulseRow />
              <div className="flex justify-end">
                <button className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-4 py-1.5 text-sm text-primary hover:bg-primary/10">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 md:p-6">
                <div className="grid grid-cols-4 gap-3 md:grid-cols-5">
                  <QuickTile icon={Users} label="Alunos" />
                  <QuickTile icon={HeartPulse} label="Avaliações" />
                  <QuickTile icon={Dumbbell} label="Treinos" />
                  <QuickTile icon={Dumbbell} label="Exercícios" />
                  <QuickTile icon={Trophy} label="Desafios" />
                </div>
              </div>
              <ReferralBanner />
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
