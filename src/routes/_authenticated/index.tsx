import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, CalendarDays,
  Bell, Crown, Lock, Activity,
  ChevronDown, ChevronRight, Pencil, HeartPulse, Dumbbell, Trophy, Gift, ClipboardCheck, Flame,
  Lightbulb, Sparkles, ArrowRight, Search,
  UserPlus, FileText, Link2, TrendingUp, AlertTriangle, Clock, MapPin, Home, Users as UsersIcon,
} from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import logoUrl from "@/assets/cactus-logo.png";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, firstName, initialsFromName } from "@/lib/auth";



export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

/* ---------- Desktop KPI helpers ---------- */

function Sparkline({ magnitude = 0 }: { magnitude?: number }) {
  // magnitude: 0 = flat line at zero; 1 = full rise.
  const m = Math.max(0, Math.min(1, magnitude));
  const baseY = 20;
  const points = [
    [0, baseY],
    [10, baseY - 1 * m],
    [20, baseY - 1 * m],
    [30, baseY - 2 * m],
    [40, baseY - 3 * m],
    [50, baseY - 5 * m],
    [60, baseY - 9 * m],
    [72, baseY - 18 * m],
  ];
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const stroke = "hsl(var(--primary))";
  return (
    <svg viewBox="0 0 72 22" className="h-[22px] w-[72px] overflow-visible">
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  label, value, sub, trend,
}: { label: string; value: string; sub: string; trend?: string }) {
  const numeric = Number(String(value).replace(/[^\d.-]/g, "")) || 0;
  // Scale: small counts stay subtle, larger counts approach a full rise.
  const magnitude = numeric <= 0 ? 0 : Math.min(1, Math.log10(numeric + 1) / 2);
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] font-semibold text-fg-secondary">{label}</span>
        {trend && numeric > 0 && (
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-display text-[0.625rem] font-bold leading-none text-primary">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="font-display text-[1.625rem] font-extrabold leading-none tracking-tight">{value}</div>
        <Sparkline magnitude={magnitude} />
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

import { IconRail } from "@/components/IconRail";


/* ---------- Mobile top / bottom bars ---------- */


function MobileTopBar() {
  return (
    <header className="sticky top-0 z-20 grid w-full max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-label="CactusFitness"
          role="img"
          className="block h-7 w-7 shrink-0 bg-primary"
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
        <span className="min-w-0 truncate text-base font-semibold tracking-tight font-display">
          Cactus<span className="italic font-normal">Fitness</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 md:p-5">
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

function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    staleTime: 30_000,
    queryFn: async () => {
      const [alunosRes, treinosRes] = await Promise.all([
        supabase.from("alunos").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("workout_templates").select("id", { count: "exact", head: true }),
      ]);
      return {
        alunosAtivos: alunosRes.count ?? 0,
        treinosAtivos: treinosRes.count ?? 0,
        avaliacoes: 0,
      };
    },
  });
}

function greetingFor(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function GreetingCard() {
  const { profile } = useCurrentUser();
  const { data: stats } = useDashboardStats();
  const name = firstName(profile?.full_name, profile?.email);
  const initials = initialsFromName(profile?.full_name, profile?.email);
  const greeting = greetingFor(new Date().getHours());
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-semibold font-display" style={{ backgroundColor: "rgb(244, 63, 94)", color: "#fff" }}>
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{greeting},</div>
          <div className="text-xl font-bold tracking-tight font-display">{name}</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4">
        <div>
          <div className="text-3xl font-bold font-display">{stats?.alunosAtivos ?? 0}</div>
          <div className="mt-1 text-xs leading-tight text-muted-foreground">alunos<br/>ativos</div>
        </div>
        <div>
          <div className="text-3xl font-bold font-display">{stats?.treinosAtivos ?? 0}</div>
          <div className="mt-1 text-xs leading-tight text-muted-foreground">treinos<br/>ativos</div>
        </div>
        <div>
          <div className="text-3xl font-bold font-display">{stats?.avaliacoes ?? 0}</div>
          <div className="mt-1 text-xs leading-tight text-muted-foreground">avaliações<br/>físicas</div>
        </div>
      </div>
    </div>
  );
}


function ActionButton({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-4 py-4 text-left transition hover:border-primary/40">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/60 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <span className="min-w-0 flex-1 text-sm font-semibold leading-tight sm:text-base">{label}</span>
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
      className="relative flex items-start gap-3 overflow-hidden rounded-lg border border-border bg-card p-5"
    >
      <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-amber-500" />
      <div className="min-w-0 flex-1 pl-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" /> Próximo evento
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
    <div className="px-1 py-2 text-sm text-muted-foreground">
      Nenhuma atividade no momento
    </div>
  );
}

function MobilePulseCard() {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-lg border border-primary/40 bg-[#0d0f0d] px-4 py-3 text-left"
    >
      <div className="relative shrink-0">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-primary">
          <Activity className="h-5 w-5" strokeWidth={2} />
        </div>
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-black">
          3
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-foreground">pulso dos alunos</div>
        <div className="text-xs text-muted-foreground">3 atividades novas</div>
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
    <div className="flex items-center gap-4 rounded-lg border border-primary/30 bg-[linear-gradient(135deg,rgba(76,175,80,0.12),rgba(76,175,80,0.04))] p-4 md:p-5">
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
  const { profile } = useCurrentUser();
  const { data: stats } = useDashboardStats();
  const name = firstName(profile?.full_name, profile?.email);
  const greeting = greetingFor(new Date().getHours());
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />
      <MobileTopBar />


      <main className="w-full max-w-full overflow-x-hidden pb-24 md:ml-[72px] md:w-[calc(100%-72px)] md:pb-8">
        {/* ==================== DESKTOP (lg+) ==================== */}
        <div className="hidden lg:block">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 pb-12 pt-4">
            {/* Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
              <div>
                <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
                  {greeting}, {name}
                </h1>
                <p className="mt-1 text-[0.8125rem] text-fg-muted">{today}</p>
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
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <KpiCard label="Alunos ativos" value={String(stats?.alunosAtivos ?? 0)} sub="ativos agora" />
              <KpiCard label="Treinos ativos" value={String(stats?.treinosAtivos ?? 0)} sub="modelos criados" />
              <KpiCard label="Avaliações" value={String(stats?.avaliacoes ?? 0)} sub="em dia" />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
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

              {/* Pulso dos alunos */}
              <section className="rounded-lg border border-border bg-bg-elevated">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="font-display text-base font-bold">Pulso</h2>
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="p-3">
                  <PulseRow />
                </div>
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
              
              <div className="grid grid-cols-1 gap-4">
                <GreetingCard />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ActionButton icon={Lock} label="Adicionar Aluno" />
                <ActionButton icon={Lock} label="Link de Cadastro" />
              </div>
              <NextEventCard />
              <MobilePulseCard />

              <div className="flex justify-end">
                <button className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-4 py-1.5 text-sm text-primary hover:bg-primary/10">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 md:p-6">
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
