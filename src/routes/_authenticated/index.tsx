import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Home, Users, Calendar,
  Bell, Crown, Wallet, Lock, Activity,
  ChevronDown, ChevronRight, Pencil, HeartPulse, Dumbbell, Trophy, Gift, ClipboardCheck, ClipboardList,
  Lightbulb, Sparkles, Eye, ArrowRight, Search,
  UserPlus, FileText, Link2, TrendingUp, AlertTriangle, Clock, MapPin,
} from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, firstName, initialsFromName } from "@/lib/auth";



export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

/* ---------- Desktop KPI helpers ---------- */

function Sparkline({ up = true }: { up?: boolean }) {
  const d = up
    ? "M 0 18 L 10 17 L 20 17 L 30 16 L 40 15 L 50 13 L 60 9 L 72 2"
    : "M 0 15 L 10 15 L 20 15 L 30 15 L 40 15 L 50 15 L 60 15 L 72 15";
  return (
    <svg viewBox="0 0 72 22" className="h-[22px] w-[72px] overflow-visible">
      <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
  icon: Icon, active, badge, onClick, to, variant = "ghost", label,
}: {
  icon: React.ElementType; active?: boolean; badge?: string;
  onClick?: () => void; to?: string; variant?: "ghost" | "primary"; label?: string;
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


const NAV_ITEMS: { icon: React.ElementType; label: string; to: string; active?: boolean }[] = [
  { icon: Home, label: "Início", to: "/", active: true },
  { icon: Users, label: "Alunos", to: "/dashboard/personal/alunos" },
  { icon: ClipboardList, label: "Treinos", to: "/dashboard/personal/treinos" },
  { icon: Dumbbell, label: "Exercícios", to: "/dashboard/personal/exercicios" },
  { icon: ClipboardCheck, label: "Avaliações", to: "/" },
  { icon: Trophy, label: "Desafios", to: "/" },
  { icon: Calendar, label: "Agenda", to: "/dashboard/personal/agenda" },
];


function IconRail() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center gap-2 border-r border-border bg-sidebar py-4 md:flex">
      <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl">
        <svg viewBox="0 0 32 32" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8 L10 24 L16 14 L22 24 L28 8" />
        </svg>
      </div>
      {NAV_ITEMS.map((n) => (
        <SidebarIconBtn key={n.label} icon={n.icon} active={n.active} to={n.to} label={n.label} />
      ))}

      <div className="mt-auto flex flex-col items-center gap-2">
        
        <SidebarIconBtn icon={Bell} badge="2" />
        <UserAvatarMenu />
      </div>
    </aside>

  );
}

/* ---------- Mobile top / bottom bars ---------- */


function MobileTopBar() {
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
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)]">
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
      <span className="text-sm font-semibold leading-tight sm:text-base">{label}</span>
    </button>
  );
}

function NextEventCard() {
  const [event, setEvent] = useState<{ id: string; title: string; event_date: string; event_time: string; location: string | null } | null>(null);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("events")
      .select("id, title, event_date, event_time, location")
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setEvent(data as never));
  }, []);
  if (!event) return null;
  const d = new Date(`${event.event_date}T${event.event_time}`);
  const dateLabel = `${d.getDate()} de ${d.toLocaleDateString("pt-BR", { month: "long" })} às ${event.event_time.slice(0, 5)}`;
  return (
    <Link
      to="/dashboard/personal/agenda"
      className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-card p-5"
    >
      <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-amber-500" />
      <div className="min-w-0 flex-1 pl-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> Próximo evento
        </div>
        <div className="mt-1 truncate text-base font-bold font-display">{event.title}</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {dateLabel}</span>
          {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>}
        </div>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
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
  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail />
      <MobileTopBar />


      <main className="pb-24 md:ml-[72px] md:pb-8">
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
              <section className="rounded-lg border border-border bg-bg-elevated">
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
              <section className="rounded-lg border border-border bg-bg-elevated">
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
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.3fr_1fr]">
                <GreetingCard />
                <WalletCard />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ActionButton icon={Lock} label="Adicionar Aluno" />
                <ActionButton icon={Lock} label="Link de Cadastro" />
              </div>
              <NextEventCard />
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
