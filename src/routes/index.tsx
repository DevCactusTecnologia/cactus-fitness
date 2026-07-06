import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home, Users, MessageCircle, Calendar, GraduationCap, SlidersHorizontal,
  Plus, Bell, PanelLeftClose, PanelLeftOpen, Crown, Wallet, Lock, Activity,
  ChevronDown, ChevronRight, Pencil, HeartPulse, Dumbbell, Trophy, Gift,
  Lightbulb, Sparkles, Eye, ArrowRight, Menu as MenuIcon, Search,
  UserPlus, FileText, Link2, ArrowUpRight, TrendingUp, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

/* ---------- Desktop KPI helpers ---------- */

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
        <span>{label}</span>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
            <ArrowUpRight className="h-3 w-3" /> {trend}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-4xl font-bold tracking-tight font-display">{value}</div>
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

function Shortcut({ icon: Icon, title, sub, k, to }: { icon: React.ElementType; title: string; sub: string; k: string; to?: string }) {
  const cls = "group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-accent";
  const inner = (
    <>
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="truncate text-xs lowercase text-muted-foreground">{sub}</div>
      </div>
      <kbd className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">{k}</kbd>
    </>
  );
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button className={cls}>{inner}</button>;
}

function MiniStat({
  icon: Icon, label, value, sub, hint,
}: { icon: React.ElementType; label: string; value: string; sub: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold font-display">
        {value} {sub && <span className="text-sm font-normal text-muted-foreground">{sub}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-primary">{hint}</div>}
    </div>
  );
}

function ListRow({
  icon: Icon, label, sub, value, valueClass,
}: { icon: React.ElementType; label: string; sub: string; value: string; valueClass?: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      {value && (
        <div className={valueClass ?? "text-sm font-semibold text-primary"}>{value}</div>
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
          <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive text-sm font-semibold text-white">
            ML
          </div>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-sidebar" />
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
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:block lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-16 z-40 w-64 flex-col border-r border-border bg-sidebar p-4 lg:flex ${
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

        <button className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left transition hover:border-primary/40">
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
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 md:p-5">
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
    <div className="rounded-2xl border border-border bg-card p-5">
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
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
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
    <button className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left transition hover:border-primary/40">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/60 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <span className="text-base font-semibold">{label}</span>
    </button>
  );
}

function PulseRow() {
  return (
    <button className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition hover:border-primary/40">
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
    <div className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-[linear-gradient(135deg,rgba(76,175,80,0.12),rgba(76,175,80,0.04))] p-4 md:p-5">
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

      <main className="pb-24 md:ml-16 md:pb-8 lg:ml-[320px]">
        {/* ==================== DESKTOP (lg+) ==================== */}
        <div className="hidden lg:block">
          <div className="mx-auto max-w-5xl px-8 py-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight font-display">
                  Boa tarde, Marcos
                </h1>
                <p className="mt-1 text-sm lowercase text-muted-foreground">segunda-feira, 6 de julho</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground w-[320px]">
                  <Search className="h-4 w-4" />
                  <span className="flex-1 truncate">Buscar aluno, plano, exercício…</span>
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]">⌘K</kbd>
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 px-4 py-2 text-sm text-primary hover:bg-primary/10">
                  <Sparkles className="h-4 w-4" /> IA
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Alunos ativos" value="1" sub="+1 este mês" trend="1" />
              <KpiCard label="Treinos ativos" value="0" sub="0 periodizados" />
              <KpiCard label="Receita do mês" value="R$ 0" sub="vs mês anterior" sparkUp={false} />
              <KpiCard label="Avaliações" value="0" sub="em dia" />
            </div>

            {/* Hoje / Pulso */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard
                title="Hoje"
                hint="nenhuma sessão agendada"
                footer={
                  <a className="inline-flex items-center gap-1 text-primary hover:underline" href="#">
                    Agenda completa <ChevronRight className="h-4 w-4" />
                  </a>
                }
              >
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-muted-foreground">Sem sessões agendadas pra hoje.</p>
                  <a href="#" className="text-sm text-primary hover:underline">Agendar nova sessão →</a>
                </div>
              </SectionCard>

              <SectionCard title="Pulso" hint="sem atividades recentes"
                footer={
                  <a className="inline-flex items-center gap-1 text-primary hover:underline" href="#">
                    Ver todos os pulsos <ChevronRight className="h-4 w-4" />
                  </a>
                }
              >
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <Activity className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhuma atividade no momento.</p>
                </div>
              </SectionCard>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Atalhos rápidos */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Atalhos rápidos</h3>
                  <span className="text-xs lowercase text-muted-foreground">use as teclas</span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Shortcut icon={UserPlus} title="Novo aluno" sub="cadastrar ou convidar" k="N" to="/dashboard/personal/alunos" />
                  <Shortcut icon={FileText} title="Modelo de plano" sub="criar plano reutilizável" k="P" />
                  <Shortcut icon={Link2} title="Link de cadastro" sub="página pública de alunos" k="L" />
                  <Shortcut icon={HeartPulse} title="Avaliação física" sub="iniciar nova avaliação" k="A" />
                </div>
              </div>

              {/* A acompanhar */}
              <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">A acompanhar</h3>
                  <span className="text-xs lowercase text-muted-foreground">snapshot financeiro</span>
                </div>
                <ul className="mt-4 flex flex-col gap-3">
                  <ListRow icon={Wallet} label="Carteira" sub="disponível para saque" value="R$ 0,00" />
                  <ListRow icon={AlertTriangle} label="Renovações vencendo" sub="nenhuma nos próximos 7 dias" value="ok" valueClass="text-primary uppercase text-xs font-semibold" />
                  <ListRow icon={TrendingUp} label="Próximo recebimento" sub="sem agendamentos" value="" />
                </ul>
                <a href="#" className="mt-4 inline-flex items-center gap-1 self-center text-sm text-primary hover:underline">
                  Ir para financeiro <ChevronRight className="h-4 w-4" />
                </a>
              </div>
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
              <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
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
