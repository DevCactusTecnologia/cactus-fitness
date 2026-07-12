import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, CalendarDays,
  Bell, Crown, Lock, Activity,
  ChevronDown, ChevronRight, Pencil, HeartPulse, Dumbbell, Trophy, Gift, ClipboardCheck, Flame,
  Sparkles, ArrowRight, Search,
  UserPlus, FileText, Link2, TrendingUp, AlertTriangle, Clock, MapPin, Home, Users as UsersIcon,
  Wallet, Eye,
} from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import logoUrl from "@/assets/cactus-logo.png";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, firstName, initialsFromName } from "@/lib/auth";



import { redirect } from "@tanstack/react-router";
import { getCurrentSessionRoles, getPrimaryClientRole } from "@/lib/client-roles";

export const Route = createFileRoute("/_authenticated/")({
  beforeLoad: async ({ search, location }) => {
    // Preserve forbidden flag (avoid loop redirects)
    if ((search as { forbidden?: number } | undefined)?.forbidden) return;
    const { user, roles } = await getCurrentSessionRoles();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    const role = getPrimaryClientRole(roles);
    if (role === "aluno") {
      throw redirect({ to: "/meu-treino" });
    }
    if (role === "owner" || role === "staff") {
      throw redirect({ to: "/dashboard/academia" });
    }
    // personal role renders the Dashboard at "/"
    if (!role) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: Dashboard,
});

/* ---------- Desktop KPI helpers ---------- */

function Sparkline({ data = [] }: { data?: number[] }) {
  // Draws a normalized polyline based on real monthly counts.
  const width = 72;
  const height = 22;
  const pad = 2;
  const series = data.length > 0 ? data : [0];
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = Math.max(max - min, 1);
  const stepX = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0;
  const points = series.map((v, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const stroke = "hsl(var(--primary))";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[22px] w-[72px] overflow-visible">
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  label, value, sub, trend, spark,
}: { label: string; value: string; sub: string; trend?: number; spark?: number[] }) {
  const showTrend = typeof trend === "number" && trend > 0;
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] font-semibold text-fg-secondary">{label}</span>
        {showTrend && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 font-display text-[0.625rem] font-bold leading-none text-primary">
            ↑{trend}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="font-display text-[1.625rem] font-extrabold leading-none tracking-tight">{value}</div>
        <Sparkline data={spark} />
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

function Shortcut({ icon: Icon, title, sub, to }: { icon: React.ElementType; title: string; sub: string; k?: string; to?: string }) {
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
    <header data-mobile-fit="true" className="sticky top-0 z-20 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
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
      <div className="flex shrink-0 items-center gap-2" />
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

function monthBuckets(dates: (string | null | undefined)[], months = 6) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const counts = Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
  for (const raw of dates) {
    if (!raw) continue;
    const d = new Date(raw);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in counts) counts[key]! += 1;
  }
  const series = keys.map((k) => counts[k]!);
  return { series, thisMonth: series[series.length - 1] ?? 0 };
}

function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    staleTime: 30_000,
    queryFn: async () => {
      const [alunosRes, treinosRes, avaliacoesRes] = await Promise.all([
        supabase.from("alunos").select("id, created_at, is_active"),
        supabase.from("workout_templates").select("id, created_at"),
        supabase.from("avaliacoes").select("id", { count: "exact", head: true }),
      ]);
      const alunos = alunosRes.data ?? [];
      const treinos = treinosRes.data ?? [];
      const alunosActive = alunos.filter((a: any) => a.is_active);
      const alunosBuckets = monthBuckets(alunosActive.map((a: any) => a.created_at));
      const treinosBuckets = monthBuckets(treinos.map((t: any) => t.created_at));
      return {
        alunosAtivos: alunosActive.length,
        treinosAtivos: treinos.length,
        avaliacoes: avaliacoesRes.count ?? 0,
        alunosSpark: alunosBuckets.series,
        alunosDelta: alunosBuckets.thisMonth,
        treinosSpark: treinosBuckets.series,
        treinosDelta: treinosBuckets.thisMonth,
      };
    },
  });
}

/**
 * Personal solo = personal dono da própria academia (owner de alguma org).
 * Soma lançamentos tipo=receita do mês corrente para essa org.
 * Retorna null quando o personal trabalha somente em academia de terceiros.
 */
function useSoloMonthRevenue() {
  return useQuery({
    queryKey: ["solo-month-revenue"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return null;
      const { data: ownerMem } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", uid)
        .eq("role", "owner")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!ownerMem?.organization_id) return null;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
      const { data: lancs } = await supabase
        .from("lancamentos")
        .select("valor")
        .eq("organization_id", ownerMem.organization_id)
        .eq("tipo", "receita")
        .gte("competencia", start)
        .lt("competencia", end);
      const total = (lancs ?? []).reduce((acc: number, r: any) => acc + Number(r.valor ?? 0), 0);
      return { total, isSolo: true };
    },
  });
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
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
    <div className="rounded-[1.55rem] border border-border bg-[image:var(--gradient-greeting-card)] p-5 shadow-[var(--shadow-mobile-card)]">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-base font-bold ring-2 ring-primary/70 font-display sm:h-14 sm:w-14" style={{ backgroundColor: "rgb(244, 63, 94)", color: "#fff" }}>
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground sm:text-sm">{greeting},</div>
          <div className="truncate text-xl font-extrabold leading-tight tracking-tight font-display sm:text-[1.5rem]">{name}</div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4 sm:mt-7">
        <div>
          <div className="text-3xl font-extrabold leading-none font-display sm:text-[2.15rem]">{stats?.alunosAtivos ?? 0}</div>
          <div className="mt-2 text-xs leading-tight text-muted-foreground sm:text-sm">alunos<br/>ativos</div>
        </div>
        <div>
          <div className="text-3xl font-extrabold leading-none font-display sm:text-[2.15rem]">{stats?.treinosAtivos ?? 0}</div>
          <div className="mt-2 text-xs leading-tight text-muted-foreground sm:text-sm">treinos<br/>ativos</div>
        </div>
        <div>
          <div className="text-3xl font-extrabold leading-none font-display sm:text-[2.15rem]">{stats?.avaliacoes ?? 0}</div>
          <div className="mt-2 text-xs leading-tight text-muted-foreground sm:text-sm">avaliações<br/>físicas</div>

        </div>
      </div>
    </div>
  );
}

function WalletCard() {
  return (
    <div className="flex items-center gap-4 rounded-[1.55rem] border border-border bg-card px-5 py-4 shadow-[var(--shadow-mobile-card)]">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Wallet className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-muted-foreground">Carteira CactusFitness</div>
        <div className="truncate text-2xl font-extrabold leading-tight text-primary font-display">R$ 0,00</div>
      </div>
      <Eye className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
    </div>
  );
}


function ActionButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[1.25rem] border border-border bg-card px-4 py-4 text-left shadow-[var(--shadow-mobile-card)] transition hover:border-primary/40 sm:gap-4 sm:px-5"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <span className="min-w-0 flex-1 text-sm font-bold leading-tight sm:text-base">{label}</span>
    </button>
  );
}

function NextEventCard() {
  const [event, setEvent] = useState<{ id: string; title: string; event_date: string; event_time: string; location: string | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("events")
      .select("id, title, event_date, event_time, location")
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setEvent(data as never); });
    return () => { cancelled = true; };
  }, []);

  if (!event) return null;
  const d = new Date(`${event.event_date}T${event.event_time}`);
  const dateLabel = `${d.getDate()} de ${d.toLocaleDateString("pt-BR", { month: "long" })} às ${event.event_time.slice(0, 5)}`;
  return (
    <div className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-card p-5">
      <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-amber-500" />
      <div className="min-w-0 flex-1 pl-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" /> Próximo evento
        </div>
        <div className="mt-1 truncate text-sm font-bold font-display">{event.title}</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {dateLabel}</span>
          {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>}
        </div>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
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
      className="flex w-full min-w-0 items-center gap-4 overflow-hidden rounded-[1.55rem] border border-primary/40 bg-card px-5 py-4 text-left shadow-[var(--shadow-mobile-card)]"
    >
      <div className="relative shrink-0">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
          <Activity className="h-6 w-6" strokeWidth={2} />
        </div>
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">
          3
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-extrabold text-foreground sm:text-base">pulso dos alunos</div>
        <div className="truncate text-xs text-muted-foreground sm:text-sm">3 atividades novas</div>

      </div>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}


function QuickTile({ icon: Icon, label, to }: { icon: React.ElementType; label: string; to?: string }) {
  const inner = (
    <>
      <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <span className="max-w-full break-words text-[11px] font-medium leading-tight text-foreground/85">{label}</span>
    </>
  );
  const cls = "flex min-w-0 flex-col items-center gap-2 py-2 text-center";
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button className={cls}>{inner}</button>;
}



function ReferralBanner() {
  return (
    <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-primary/30 bg-[linear-gradient(135deg,rgba(76,175,80,0.12),rgba(76,175,80,0.04))] p-4 md:gap-4 md:p-5">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Gift className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold">Indique e ganhe 15% recorrente</div>
        <div className="text-[11px] text-muted-foreground">
          Receba 15% de cada mensalidade paga, todo mês, enquanto o indicado mantiver a assinatura.
        </div>

      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
    </div>
  );
}

/* ---------- Dashboard ---------- */

function useOwnerOverview() {
  return useQuery({
    queryKey: ["owner-overview"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return null;
      const { data: mine } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", uid)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!mine || mine.role !== "owner") return null;
      const orgId = mine.organization_id;
      const [orgRes, membersRes, alunosRes, sessionsRes] = await Promise.all([
        supabase.from("organizations").select("id, name").eq("id", orgId).maybeSingle(),
        supabase.from("organization_members").select("id, user_id, role").eq("organization_id", orgId),
        supabase.from("alunos").select("id, personal_id, is_active, created_at").eq("organization_id", orgId),
        supabase.from("workout_sessions").select("id, status, started_at").gte("started_at", new Date(Date.now() - 7 * 864e5).toISOString()),
      ]);
      const members = membersRes.data ?? [];
      const alunos = alunosRes.data ?? [];
      const sessions = sessionsRes.data ?? [];
      const personais = members.filter((m: any) => m.role === "owner" || m.role === "personal");
      const equipe = members.filter((m: any) => m.role === "staff");
      const ativos = alunos.filter((a: any) => a.is_active).length;
      const inativos = alunos.length - ativos;
      const byPersonal: Record<string, number> = {};
      alunos.forEach((a: any) => { byPersonal[a.personal_id] = (byPersonal[a.personal_id] ?? 0) + 1; });
      const personalIds = personais.map((p: any) => p.user_id);
      const { data: profs } = personalIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", personalIds)
        : { data: [] as any[] };
      const profById = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const personaisList = personais.map((p: any) => ({
        user_id: p.user_id,
        full_name: profById.get(p.user_id)?.full_name ?? "Sem nome",
        role: p.role,
        alunos: byPersonal[p.user_id] ?? 0,
      })).sort((a, b) => b.alunos - a.alunos);
      const novosAlunos30d = alunos.filter((a: any) => new Date(a.created_at) > new Date(Date.now() - 30 * 864e5)).length;
      return {
        orgName: orgRes.data?.name ?? "Minha Academia",
        totalPersonais: personais.length,
        totalEquipe: equipe.length,
        totalAlunos: alunos.length,
        ativos,
        inativos,
        novosAlunos30d,
        sessoesSemana: sessions.length,
        sessoesConcluidas: sessions.filter((s: any) => s.status === "completed").length,
        personaisList,
      };
    },
  });
}

function OwnerDashboard({ profile }: { profile: any }) {
  const { data: o } = useOwnerOverview();
  const name = firstName(profile?.full_name, profile?.email);
  const greeting = greetingFor(new Date().getHours());
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const Sparkline = ({ points, up = true }: { points: number[]; up?: boolean }) => {
    const w = 90, h = 32, pad = 2;
    const min = Math.min(...points), max = Math.max(...points);
    const range = max - min || 1;
    const step = (w - pad * 2) / Math.max(points.length - 1, 1);
    const d = points.map((v, i) => {
      const x = pad + i * step;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={up ? "text-primary" : "text-muted-foreground"}>
        <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const kpi = (label: string, value: number | string, hint: string, spark: number[], delta?: string) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        {delta && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            <TrendingUp className="h-3 w-3" /> {delta}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="font-display text-3xl font-extrabold leading-none tracking-tight">{value}</div>
        <Sparkline points={spark} />
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );

  const alunosAtivos = o?.ativos ?? 0;
  const personaisAtivos = o?.totalPersonais ?? 0;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />
      <MobileTopBar />
      <main className="w-full pb-24 md:ml-[72px] md:w-[calc(100%-72px)] md:pb-8">
        <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-6 md:py-8">
          {/* Cabeçalho */}
          <header className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-primary">
                <Home className="h-3.5 w-3.5" /> Painel da Academia
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{greeting}, {name} · {today}</p>

            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard/personal/academia" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:border-primary/40">
                <UsersIcon className="h-3.5 w-3.5" /> Gerenciar equipe
              </Link>
              <Link to="/dashboard/personal/alunos" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110">
                <UserPlus className="h-3.5 w-3.5" /> Novo aluno
              </Link>
            </div>
          </header>

          {/* KPIs de gestão */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {kpi("Alunos ativos", alunosAtivos, `de ${o?.totalAlunos ?? 0} cadastrados`, [1, 2, 2, 3, 2, 4, alunosAtivos + 1], o?.novosAlunos30d ? `+${o.novosAlunos30d}` : undefined)}
            {kpi("Personais ativos", personaisAtivos, o?.totalEquipe ? `+ ${o.totalEquipe} na equipe` : "sua equipe técnica", [1, 1, 2, 2, 3, 3, personaisAtivos + 1])}
            {kpi("Receita do mês", "R$ 0", "vs mês anterior", [1, 1, 2, 2, 3, 4, 5])}
          </div>


          <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            {/* Atalhos rápidos */}
            <section className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h2 className="font-display text-base font-bold">Atalhos rápidos</h2>
                  <p className="text-[11px] text-muted-foreground">Ações da administração</p>
                </div>
              </div>
              <div className="grid gap-3 p-3 sm:grid-cols-2">
                {[
                  { to: "/dashboard/academia/personais", icon: UsersIcon, title: "Equipe", desc: "Cadastrar personais e ajustar papéis" },
                  { to: "/dashboard/personal/alunos", icon: Users, title: "Aluno", desc: "Cadastros e contatos" },
                  { to: "/dashboard/personal/treinos", icon: Dumbbell, title: "Treinos", desc: "Biblioteca compartilhada" },
                ].map(({ to, icon: Icon, title, desc }) => (
                  <Link key={to} to={to} className="group flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3 hover:border-primary/40">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Personais da academia */}
            <section className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h2 className="font-display text-base font-bold">Personais da academia</h2>
                  <p className="text-[11px] text-muted-foreground">Distribuição de alunos por profissional</p>
                </div>
                <Link to="/dashboard/personal/academia" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  Gerenciar <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {!o || o.personaisList.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum personal cadastrado ainda.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {o.personaisList.map((p) => {
                    const max = Math.max(...o.personaisList.map((x) => x.alunos), 1);
                    const pct = (p.alunos / max) * 100;
                    return (
                      <li key={p.user_id} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {(p.full_name).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-semibold">{p.full_name}</div>
                              {p.role === "owner" && <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary"><Crown className="h-2.5 w-2.5" /> Dono</span>}
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-lg font-extrabold leading-none">{p.alunos}</div>
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">alunos</div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

function Dashboard() {
  const { profile, loading } = useCurrentUser();
  const { data: stats } = useDashboardStats();
  const { data: ownerOverview, isLoading: ownerLoading } = useOwnerOverview();
  const { data: soloRevenue } = useSoloMonthRevenue();
  const navigate = useNavigate();

  // Aluno logado nunca vê o painel do personal — vai para /meu-treino
  useEffect(() => {
    if (!loading && profile?.role === "aluno") {
      navigate({ to: "/meu-treino", replace: true });
    }
  }, [loading, profile, navigate]);

  // Dono da academia vai para o painel dedicado (com layout mobile completo)
  useEffect(() => {
    if (!loading && !ownerLoading && ownerOverview) {
      navigate({ to: "/dashboard/academia", replace: true });
    }
  }, [loading, ownerLoading, ownerOverview, navigate]);

  if (!loading && !ownerLoading && ownerOverview) {
    return null;
  }

  const name = firstName(profile?.full_name, profile?.email);
  const greeting = greetingFor(new Date().getHours());
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div data-mobile-fit="true" className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />
      <MobileTopBar />


      <main data-mobile-fit="true" className="w-full overflow-x-hidden pb-24 md:ml-[72px] md:w-[calc(100%-72px)] md:pb-8">
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
              <div />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <KpiCard
                label="Alunos ativos"
                value={String(stats?.alunosAtivos ?? 0)}
                sub={stats?.alunosDelta ? `+${stats.alunosDelta} este mês` : "nenhum novo este mês"}
                trend={stats?.alunosDelta}
                spark={stats?.alunosSpark}
              />
              <KpiCard
                label="Treinos ativos"
                value={String(stats?.treinosAtivos ?? 0)}
                sub={stats?.treinosDelta ? `+${stats.treinosDelta} este mês` : "0 periodizados"}
                trend={stats?.treinosDelta}
                spark={stats?.treinosSpark}
              />
              <KpiCard
                label="Avaliações"
                value={String(stats?.avaliacoes ?? 0)}
                sub="em dia"
              />
            </div>




            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
              {/* Atalhos rápidos */}
              <section className="rounded-lg border border-border bg-bg-elevated">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="font-display text-base font-bold">Atalhos rápidos</h2>
                </div>
                <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                  <Shortcut icon={Users} title="Alunos" sub="cadastros e contatos" k="A" to="/dashboard/personal/alunos" />
                  <Shortcut icon={Dumbbell} title="Treinos" sub="biblioteca de treinos" k="T" to="/dashboard/personal/treinos" />
                  <Shortcut icon={Trophy} title="Desafios" sub="motivar seus alunos" k="D" to="/dashboard/personal/desafios" />
                  <Shortcut icon={HeartPulse} title="Avaliações" sub="avaliações físicas" k="V" to="/dashboard/personal/avaliacoes" />

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
        <div data-mobile-fit="true" className="w-full overflow-hidden lg:hidden">
          <div data-mobile-fit="true" className="mx-auto w-full overflow-hidden px-3 py-4 sm:px-4 md:max-w-6xl md:px-8 md:py-8">
            <div className="mb-6 hidden items-start justify-between gap-4 md:flex">
              <div>
                <h1 className="text-3xl font-bold tracking-tight font-display">Início</h1>
                <p className="mt-1 text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>
            </div>

            <div data-mobile-fit="true" className="space-y-4">
              
              <div className="grid grid-cols-1 gap-4">
                <GreetingCard />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  label="Alunos ativos"
                  value={String(stats?.alunosAtivos ?? 0)}
                  sub={stats?.alunosDelta ? `+${stats.alunosDelta} este mês` : "nenhum novo este mês"}
                  trend={stats?.alunosDelta}
                  spark={stats?.alunosSpark}
                />
                <KpiCard
                  label="Treinos ativos"
                  value={String(stats?.treinosAtivos ?? 0)}
                  sub={stats?.treinosDelta ? `+${stats.treinosDelta} este mês` : "0 periodizados"}
                  trend={stats?.treinosDelta}
                  spark={stats?.treinosSpark}
                />
              </div>


              <NextEventCard />
              <MobilePulseCard />

              <div className="rounded-xl border border-border bg-card p-4 md:p-6">
                <div className="grid min-w-0 grid-cols-4 gap-2 sm:gap-3 md:grid-cols-5">
                  <QuickTile icon={Users} label="Alunos" to="/dashboard/personal/alunos" />
                  <QuickTile icon={HeartPulse} label="Avaliações" to="/dashboard/personal/avaliacoes" />
                  <QuickTile icon={Dumbbell} label="Treinos" to="/dashboard/personal/treinos" />
                  
                  <QuickTile icon={Trophy} label="Desafios" to="/dashboard/personal/desafios" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
