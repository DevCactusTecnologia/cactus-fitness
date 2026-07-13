import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Shield, Building2, Users, TrendingUp, TrendingDown, CreditCard,
  Loader2, Trash2, Ban, Play, Search, KeyRound, LogOut,
  Crown, UserMinus, UserPlus, AlertTriangle, Sparkles, ArrowUpRight,
  Activity, Zap, Target, Calendar, MoreHorizontal, Copy, CheckCircle2,
  Clock, XCircle, Filter, LayoutGrid, List as ListIcon, ChevronDown, Mail,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import {
  superAdminMetrics,
  listAllOrganizations,
  updateOrganization,
  deleteOrganization,
  listAllUsers,
  toggleUserRole,
  deleteUserAccount,
  resetUserPassword,
} from "@/lib/super-admin.functions";

type Tab = "overview" | "orgs" | "users" | "plans";

export const Route = createFileRoute("/_authenticated/_super-admin/super-admin/")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => {
    const tab = search.tab;
    if (tab === "overview" || tab === "orgs" || tab === "users" || tab === "plans") return { tab };
    return {};
  },
  head: () => ({
    meta: [
      { title: "Super Admin · cactusfitness" },
      { name: "description", content: "Painel Super Admin do SaaS." },
    ],
  }),
  component: SuperAdminPage,
});


const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Trial",
  past_due: "Vencida",
  canceled: "Cancelada",
};

function SuperAdminPage() {
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground md:pl-[72px]">
      <IconRail scope="super_admin" />
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-tight">Super Admin</div>
              <div className="text-[11px] text-muted-foreground">Painel do SaaS · cactusfitness</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>



      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {tab === "overview" && <OverviewTab />}
        {tab === "orgs" && <OrgsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "plans" && <PlansTab />}
      </main>
    </div>
  );
}

/* ------------------------ OVERVIEW ------------------------ */

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function deltaPct(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function Delta({ current, previous, suffix = "vs mês anterior" }: { current: number; previous: number; suffix?: string }) {
  const pct = deltaPct(current, previous);
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        up ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
      }`}
    >
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}
      {pct}% <span className="font-normal opacity-70">{suffix}</span>
    </span>
  );
}

function Sparkline({ values, color = "hsl(var(--primary))" }: { values: number[]; color?: string }) {
  const w = 120;
  const h = 36;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polygon points={area} fill={color} opacity={0.12} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={h - (v / max) * (h - 4) - 2} r={i === values.length - 1 ? 3 : 0} fill={color} />
      ))}
    </svg>
  );
}

function KpiCard({
  label,
  value,
  icon,
  trend,
  sub,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: React.ReactNode;
  sub?: React.ReactNode;
  accent?: "primary" | "emerald" | "amber" | "sky";
}) {
  const accents = {
    primary: "from-primary/20 to-primary/5 text-primary",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-500",
    sky: "from-sky-500/20 to-sky-500/5 text-sky-500",
  } as const;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${accents[accent]} blur-xl opacity-60`} />
      <div className="relative flex items-start justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${accents[accent]}`}>{icon}</div>
        {trend}
      </div>
      <div className="relative mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-3xl font-bold tracking-tight">{value}</div>
        {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted-foreground/60",
  starter: "bg-sky-500",
  pro: "bg-primary",
  enterprise: "bg-amber-500",
};

function OverviewTab() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "metrics"],
    queryFn: () => superAdminMetrics(),
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  const alunoOccupancy = data.totalAlunos > 0 ? Math.round((data.alunosAtivos / data.totalAlunos) * 100) : 0;
  const orgSeries = data.series.map((s: any) => s.orgs);
  const alunoSeries = data.series.map((s: any) => s.alunos);
  const arr = data.mrr * 12;
  const arpo = data.activeOrgs > 0 ? Math.round(data.mrr / data.activeOrgs) : 0;

  const alertsTotal =
    (data.alerts?.pastDue ?? 0) +
    (data.alerts?.nearLimit ?? 0) +
    (data.alerts?.suspended ?? 0);

  return (
    <div className="space-y-5">
      {/* Hero: MRR e insights */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6 lg:col-span-2">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-primary/80">
              <Sparkles className="h-3.5 w-3.5" /> Receita recorrente
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-4">
              <div>
                <div className="font-display text-5xl font-bold tracking-tight">{formatBRL(data.mrr)}</div>
                <div className="text-xs text-muted-foreground">MRR estimado · ARR {formatBRL(arr)}</div>
              </div>
              <Delta current={data.newOrgsThisMonth} previous={data.newOrgsPrevMonth} suffix="novas academias" />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Target className="h-3 w-3" /> ARPO
                </div>
                <div className="mt-1 font-display text-xl font-bold">{formatBRL(arpo)}</div>
                <div className="text-[10px] text-muted-foreground">Receita média por academia</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Activity className="h-3 w-3" /> Conversão
                </div>
                <div className="mt-1 font-display text-xl font-bold">
                  {data.totalOrgs > 0 ? Math.round((data.activeOrgs / data.totalOrgs) * 100) : 0}%
                </div>
                <div className="text-[10px] text-muted-foreground">{data.activeOrgs} de {data.totalOrgs} academias ativas</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Zap className="h-3 w-3" /> Engajamento
                </div>
                <div className="mt-1 font-display text-xl font-bold">{alunoOccupancy}%</div>
                <div className="text-[10px] text-muted-foreground">{data.alunosAtivos} alunos ativos de {data.totalAlunos}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas acionáveis */}
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${alertsTotal > 0 ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500"}`}>
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <div className="font-display text-sm font-bold">Requer atenção</div>
                <div className="text-[11px] text-muted-foreground">{alertsTotal} item(ns) para agir</div>
              </div>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            <button
              onClick={() => navigate({ to: "/super-admin", search: { tab: "orgs" } })}
              className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-left transition hover:border-rose-500/50 hover:bg-rose-500/5"
            >
              <div>
                <div className="text-xs font-semibold">Pagamentos vencidos</div>
                <div className="text-[10px] text-muted-foreground">Cobranças em atraso</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`font-display text-lg font-bold ${data.alerts.pastDue > 0 ? "text-rose-500" : "text-muted-foreground"}`}>
                  {data.alerts.pastDue}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>
            <button
              onClick={() => navigate({ to: "/super-admin", search: { tab: "plans" } })}
              className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-left transition hover:border-amber-500/50 hover:bg-amber-500/5"
            >
              <div>
                <div className="text-xs font-semibold">Perto do limite de alunos</div>
                <div className="text-[10px] text-muted-foreground">≥ 85% da capacidade · upsell</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`font-display text-lg font-bold ${data.alerts.nearLimit > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
                  {data.alerts.nearLimit}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>
            <button
              onClick={() => navigate({ to: "/super-admin", search: { tab: "orgs" } })}
              className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-left transition hover:border-sky-500/50 hover:bg-sky-500/5"
            >
              <div>
                <div className="text-xs font-semibold">Em trial</div>
                <div className="text-[10px] text-muted-foreground">Oportunidades de conversão</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`font-display text-lg font-bold ${data.alerts.trialing > 0 ? "text-sky-500" : "text-muted-foreground"}`}>
                  {data.alerts.trialing}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>
            <button
              onClick={() => navigate({ to: "/super-admin", search: { tab: "orgs" } })}
              className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-left transition hover:border-border"
            >
              <div>
                <div className="text-xs font-semibold">Suspensas</div>
                <div className="text-[10px] text-muted-foreground">Acesso bloqueado</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-lg font-bold text-muted-foreground">{data.alerts.suspended}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>
          </ul>
        </div>
      </div>

      {/* KPIs com sparklines */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Tenants"
          value={data.totalOrgs}
          icon={<Building2 className="h-4 w-4" />}
          trend={<Delta current={data.newOrgsThisMonth} previous={data.newOrgsPrevMonth} suffix="" />}
          sub={
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{data.totalAcademias ?? 0} academias · {data.totalPersonalSolo ?? 0} personais solo</span>
              </div>
              <Sparkline values={orgSeries} />
            </div>
          }
          accent="primary"
        />
        <KpiCard
          label="Alunos na plataforma"
          value={data.totalAlunos}
          icon={<Users className="h-4 w-4" />}
          trend={<Delta current={data.newAlunosThisMonth} previous={data.newAlunosPrevMonth} suffix="" />}
          sub={<div className="mt-2"><Sparkline values={alunoSeries} color="rgb(16 185 129)" /></div>}
          accent="emerald"
        />
        <KpiCard
          label="Profissionais"
          value={data.totalPersonais + data.totalStaff}
          icon={<Crown className="h-4 w-4" />}
          sub={`${data.totalPersonais} personais · ${data.totalStaff} equipe`}
          accent="sky"
        />
        <KpiCard
          label="Contas totais"
          value={data.totalUsers}
          icon={<Shield className="h-4 w-4" />}
          sub={`${data.suspendedOrgs} academia(s) suspensa(s)`}
          accent="amber"
        />
      </div>

      {/* Distribuição por plano + Top academias */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold">Mix de planos</h2>
              <div className="text-[11px] text-muted-foreground">Distribuição e receita mensal por plano</div>
            </div>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          {(() => {
            const total = Object.values(data.byPlan).reduce((a: number, b: any) => a + (b as number), 0) as number;
            const order = ["enterprise", "pro", "starter", "free"];
            return (
              <>
                <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-muted">
                  {order.map((id) => {
                    const c = (data.byPlan[id] ?? 0) as number;
                    if (!c) return null;
                    const pct = total > 0 ? (c / total) * 100 : 0;
                    return <div key={id} className={PLAN_COLORS[id]} style={{ width: `${pct}%` }} />;
                  })}
                </div>
                <ul className="mt-4 space-y-2.5">
                  {order.map((id) => {
                    const c = (data.byPlan[id] ?? 0) as number;
                    const price = data.planPricing[id] ?? 0;
                    const revenue = c * price;
                    const pct = total > 0 ? Math.round((c / total) * 100) : 0;
                    return (
                      <li key={id} className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${PLAN_COLORS[id]}`} />
                        <span className="flex-1 text-sm font-semibold capitalize">{PLAN_LABEL[id]}</span>
                        <span className="text-[11px] text-muted-foreground">{pct}%</span>
                        <span className="w-10 text-right font-display text-sm font-bold">{c}</span>
                        <span className="w-20 text-right text-[11px] text-muted-foreground">
                          {price > 0 ? formatBRL(revenue) : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            );
          })()}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold">Top academias por engajamento</h2>
              <div className="text-[11px] text-muted-foreground">Ranking por alunos ativos</div>
            </div>
            <button
              onClick={() => navigate({ to: "/super-admin", search: { tab: "orgs" } })}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          {data.topOrgs.length === 0 ? (
            <div className="mt-6 text-center text-sm text-muted-foreground">Nenhuma academia com alunos ainda.</div>
          ) : (
            <ol className="mt-4 space-y-2">
              {data.topOrgs.map((o: any, i: number) => {
                const maxAtivos = data.topOrgs[0]?.ativos || 1;
                const pct = (o.ativos / maxAtivos) * 100;
                return (
                  <li key={o.id} className="group rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 font-display text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{o.name}</div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Plano {PLAN_LABEL[o.plan] ?? o.plan}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-sm font-bold">{o.ativos}</div>
                        <div className="text-[10px] text-muted-foreground">de {o.alunos}</div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Tendência 6 meses */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold">Crescimento nos últimos 6 meses</h2>
            <div className="text-[11px] text-muted-foreground">Aquisição mensal de academias e alunos</div>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Academias</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Alunos</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-6 gap-3">
          {data.series.map((s: any, i: number) => {
            const maxOrgs = Math.max(1, ...data.series.map((x: any) => x.orgs));
            const maxAl = Math.max(1, ...data.series.map((x: any) => x.alunos));
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="flex h-32 w-full items-end justify-center gap-1">
                  <div
                    className="w-3 rounded-t bg-primary/80 transition-all"
                    style={{ height: `${(s.orgs / maxOrgs) * 100}%`, minHeight: s.orgs ? "4px" : "2px" }}
                    title={`${s.orgs} academias`}
                  />
                  <div
                    className="w-3 rounded-t bg-emerald-500/80 transition-all"
                    style={{ height: `${(s.alunos / maxAl) * 100}%`, minHeight: s.alunos ? "4px" : "2px" }}
                    title={`${s.alunos} alunos`}
                  />
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.month}</div>
                <div className="text-[10px] text-muted-foreground">
                  <span className="text-primary">{s.orgs}</span> · <span className="text-emerald-500">{s.alunos}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/* ------------------------ ORGANIZAÇÕES ------------------------ */

type OrgFilter = "all" | "active" | "trialing" | "past_due" | "suspended" | "near_limit";
type OrgView = "grid" | "table";

const STATUS_BADGE: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  active: {
    label: "Ativa",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  trialing: {
    label: "Trial",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  },
  past_due: {
    label: "Vencida",
    icon: <AlertTriangle className="h-3 w-3" />,
    className: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  },
  canceled: {
    label: "Cancelada",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-muted text-muted-foreground border-border",
  },
};

function orgInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

type TenantTypeFilter = "all" | "academia" | "personal_solo";

function OrgsTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<OrgFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TenantTypeFilter>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [view, setView] = useState<OrgView>("grid");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "orgs"],
    queryFn: () => listAllOrganizations(),
  });

  const list = data ?? [];

  const counts = useMemo(() => {
    const c = { all: list.length, active: 0, trialing: 0, past_due: 0, suspended: 0, near_limit: 0 };
    list.forEach((o: any) => {
      if (o.suspended_at) c.suspended++;
      else if (o.subscription_status === "active") c.active++;
      else if (o.subscription_status === "trialing") c.trialing++;
      else if (o.subscription_status === "past_due") c.past_due++;
      if (!o.suspended_at && o.max_alunos && o.aluno_ativos / o.max_alunos >= 0.85) c.near_limit++;
    });
    return c;
  }, [list]);

  const filtered = useMemo(() => {
    let arr = list;
    if (filter !== "all") {
      arr = arr.filter((o: any) => {
        if (filter === "suspended") return !!o.suspended_at;
        if (filter === "near_limit") return !o.suspended_at && o.max_alunos && o.aluno_ativos / o.max_alunos >= 0.85;
        return !o.suspended_at && o.subscription_status === filter;
      });
    }
    if (planFilter !== "all") arr = arr.filter((o: any) => o.plan === planFilter);
    if (typeFilter !== "all") arr = arr.filter((o: any) => (o.type ?? "academia") === typeFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter(
        (o: any) =>
          o.name?.toLowerCase().includes(s) ||
          o.slug?.toLowerCase().includes(s) ||
          o.owner_name?.toLowerCase().includes(s),
      );
    }
    return arr;
  }, [list, filter, planFilter, typeFilter, q]);

  const typeCounts = useMemo(() => {
    const c = { academia: 0, personal_solo: 0 };
    list.forEach((o: any) => {
      if (o.type === "personal_solo") c.personal_solo++;
      else c.academia++;
    });
    return c;
  }, [list]);

  const totalRevenue = useMemo(
    () =>
      list
        .filter((o: any) => !o.suspended_at && (o.subscription_status === "active" || o.subscription_status === "trialing"))
        .reduce((sum: number, o: any) => {
          const pricing: Record<string, number> = { free: 0, starter: 49, pro: 149, enterprise: 399 };
          return sum + (pricing[o.plan] ?? 0);
        }, 0),
    [list],
  );

  const updateMut = useMutation({
    mutationFn: (v: any) => updateOrganization({ data: v }),
    onSuccess: () => {
      toast.success("Academia atualizada.");
      qc.invalidateQueries({ queryKey: ["super-admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (orgId: string) => deleteOrganization({ data: { orgId } }),
    onSuccess: () => {
      toast.success("Academia excluída.");
      qc.invalidateQueries({ queryKey: ["super-admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function onDelete(orgId: string, name: string) {
    const ok = await confirmDialog({
      title: "Excluir academia?",
      description: `A academia "${name}" e todos os vínculos serão removidos. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (ok) deleteMut.mutate(orgId);
  }

  async function copySlug(slug: string) {
    try {
      await navigator.clipboard.writeText(slug);
      toast.success("Slug copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  const filterChips: { id: OrgFilter; label: string; count: number; className: string }[] = [
    { id: "all", label: "Todas", count: counts.all, className: "data-[on=true]:bg-foreground data-[on=true]:text-background" },
    { id: "active", label: "Ativas", count: counts.active, className: "data-[on=true]:bg-emerald-500 data-[on=true]:text-white" },
    { id: "trialing", label: "Trial", count: counts.trialing, className: "data-[on=true]:bg-sky-500 data-[on=true]:text-white" },
    { id: "past_due", label: "Vencidas", count: counts.past_due, className: "data-[on=true]:bg-rose-500 data-[on=true]:text-white" },
    { id: "near_limit", label: "No limite", count: counts.near_limit, className: "data-[on=true]:bg-amber-500 data-[on=true]:text-white" },
    { id: "suspended", label: "Suspensas", count: counts.suspended, className: "data-[on=true]:bg-muted-foreground data-[on=true]:text-background" },
  ];

  return (
    <div className="space-y-5">
      {/* Header + stats resumo */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-primary/80">
              <Building2 className="h-3.5 w-3.5" /> Tenants do SaaS
            </div>
            <div className="mt-1 font-display text-3xl font-bold tracking-tight">
              {list.length} <span className="text-base font-medium text-muted-foreground">organizações</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                <Building2 className="h-2.5 w-2.5" /> {typeCounts.academia} academias
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-500">
                <Crown className="h-2.5 w-2.5" /> {typeCounts.personal_solo} personais solo
              </span>
              <span>· {counts.active} ativas · {counts.trialing} em trial · {counts.past_due} vencidas</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:min-w-[420px]">
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Receita
              </div>
              <div className="mt-1 font-display text-lg font-bold">{formatBRL(totalRevenue)}</div>
              <div className="text-[10px] text-muted-foreground">MRR estimado</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <AlertTriangle className="h-3 w-3" /> Atenção
              </div>
              <div className="mt-1 font-display text-lg font-bold text-amber-500">
                {counts.past_due + counts.near_limit}
              </div>
              <div className="text-[10px] text-muted-foreground">vencidas + no limite</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" /> Saudáveis
              </div>
              <div className="mt-1 font-display text-lg font-bold text-emerald-500">{counts.active}</div>
              <div className="text-[10px] text-muted-foreground">assinatura ativa</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              data-on={filter === chip.id}
              onClick={() => setFilter(chip.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-foreground/30 ${chip.className}`}
            >
              {chip.label}
              <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-bold data-[on=true]:bg-white/20">
                {chip.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmentado por tipo */}
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
            {([
              { id: "all" as const, label: "Todos", count: list.length },
              { id: "academia" as const, label: "Academias", count: typeCounts.academia },
              { id: "personal_solo" as const, label: "Personais solo", count: typeCounts.personal_solo },
            ]).map((t) => {
              const on = typeFilter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
                    on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 text-[10px] ${on ? "bg-white/25" : "bg-muted"}`}>{t.count}</span>
                </button>
              );
            })}
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, slug ou dono…"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-background py-2 pl-8 pr-8 text-xs font-semibold"
            >
              <option value="all">Todos os planos</option>
              {Object.entries(PLAN_LABEL).map(([id, l]) => (
                <option key={id} value={id}>{l}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setView("grid")}
              className={`grid h-7 w-8 place-items-center rounded-md text-xs transition ${
                view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
              title="Grade"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`grid h-7 w-8 place-items-center rounded-md text-xs transition ${
                view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
              title="Lista"
            >
              <ListIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">{filtered.length} resultado(s)</div>
        </div>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <div className="mt-3 text-sm font-semibold">Nenhuma academia encontrada</div>
          <div className="text-xs text-muted-foreground">Ajuste os filtros ou a busca.</div>
        </div>
      )}

      {/* GRID VIEW */}
      {!isLoading && view === "grid" && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o: any) => {
            const suspended = !!o.suspended_at;
            const status = suspended ? "canceled" : (o.subscription_status ?? "active");
            const badge = STATUS_BADGE[status] ?? STATUS_BADGE.canceled;
            const occ = o.max_alunos ? Math.min(100, Math.round((o.aluno_ativos / o.max_alunos) * 100)) : null;
            const occColor = occ == null ? "" : occ >= 90 ? "bg-rose-500" : occ >= 75 ? "bg-amber-500" : "bg-emerald-500";
            const menuOpen = openMenuId === o.id;
            return (
              <div
                key={o.id}
                className={`group relative overflow-hidden rounded-2xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-lg ${
                  suspended ? "border-border/60 opacity-70" : "border-border"
                }`}
              >
                {suspended && (
                  <div className="absolute right-3 top-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Suspensa
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-sm font-bold ${
                    o.type === "personal_solo"
                      ? "bg-gradient-to-br from-violet-500/30 to-violet-500/5 text-violet-500"
                      : "bg-gradient-to-br from-primary/25 to-primary/5 text-primary"
                  }`}>
                    {o.type === "personal_solo" ? <Crown className="h-5 w-5" /> : orgInitials(o.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-base font-bold">{o.name}</div>
                    <button
                      onClick={() => copySlug(o.slug)}
                      className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground transition hover:text-foreground"
                      title="Copiar slug"
                    >
                      /{o.slug} <Copy className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(menuOpen ? null : o.id)}
                      className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                          <button
                            onClick={() => { setOpenMenuId(null); updateMut.mutate({ orgId: o.id, suspended: !suspended }); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-accent"
                          >
                            {suspended ? <Play className="h-3.5 w-3.5 text-emerald-500" /> : <Ban className="h-3.5 w-3.5 text-amber-500" />}
                            {suspended ? "Reativar academia" : "Suspender acesso"}
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); copySlug(o.slug); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-accent"
                          >
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Copiar slug
                          </button>
                          <div className="border-t border-border" />
                          <button
                            onClick={() => { setOpenMenuId(null); onDelete(o.id, o.name); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir academia
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    o.type === "personal_solo"
                      ? "border-violet-500/30 bg-violet-500/10 text-violet-500"
                      : "border-primary/30 bg-primary/10 text-primary"
                  }`}>
                    {o.type === "personal_solo" ? <Crown className="h-2.5 w-2.5" /> : <Building2 className="h-2.5 w-2.5" />}
                    {o.type === "personal_solo" ? "Personal solo" : "Academia"}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                    {badge.icon} {badge.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    o.plan === "enterprise" ? "bg-amber-500/15 text-amber-500" :
                    o.plan === "pro" ? "bg-primary/15 text-primary" :
                    o.plan === "starter" ? "bg-sky-500/15 text-sky-500" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    <CreditCard className="h-2.5 w-2.5" /> {PLAN_LABEL[o.plan] ?? o.plan}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-background/60 py-2">
                    <div className="font-display text-lg font-bold text-emerald-500">{o.aluno_ativos}</div>
                    <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Ativos</div>
                  </div>
                  <div className="rounded-lg bg-background/60 py-2">
                    <div className="font-display text-lg font-bold">{o.aluno_count}</div>
                    <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Alunos</div>
                  </div>
                  <div className="rounded-lg bg-background/60 py-2">
                    <div className="font-display text-lg font-bold">{o.member_count}</div>
                    <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Equipe</div>
                  </div>
                </div>

                {occ != null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      <span>Ocupação</span>
                      <span className={occ >= 90 ? "text-rose-500" : occ >= 75 ? "text-amber-500" : "text-muted-foreground"}>
                        {occ}% · {o.aluno_ativos}/{o.max_alunos}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${occColor}`} style={{ width: `${occ}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Crown className="h-3 w-3 shrink-0" />
                      <span className="truncate">{o.owner_name ?? "Sem dono"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(o.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                    </div>
                  </div>
                  {o.owner_email && (
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Mail className="h-3 w-3 shrink-0" />
                      <a
                        href={`mailto:${o.owner_email}`}
                        className="truncate hover:text-foreground hover:underline"
                        title={o.owner_email}
                      >
                        {o.owner_email}
                      </a>
                    </div>
                  )}
                </div>


                <div className="mt-3 grid grid-cols-2 gap-2">
                  <select
                    value={o.plan}
                    onChange={(e) => updateMut.mutate({ orgId: o.id, plan: e.target.value as any })}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-semibold"
                  >
                    {Object.entries(PLAN_LABEL).map(([id, l]) => (
                      <option key={id} value={id}>Plano: {l}</option>
                    ))}
                  </select>
                  <select
                    value={o.subscription_status}
                    onChange={(e) => updateMut.mutate({ orgId: o.id, subscription_status: e.target.value as any })}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-semibold"
                  >
                    {Object.entries(STATUS_LABEL).map(([id, l]) => (
                      <option key={id} value={id}>Status: {l}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {!isLoading && view === "table" && filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1.2fr_0.8fr_auto] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <div>Academia</div>
            <div>Plano</div>
            <div>Status</div>
            <div>Ocupação</div>
            <div>Equipe</div>
            <div />
          </div>
          <ul>
            {filtered.map((o: any) => {
              const suspended = !!o.suspended_at;
              const status = suspended ? "canceled" : (o.subscription_status ?? "active");
              const badge = STATUS_BADGE[status] ?? STATUS_BADGE.canceled;
              const occ = o.max_alunos ? Math.min(100, Math.round((o.aluno_ativos / o.max_alunos) * 100)) : null;
              const occColor = occ == null ? "bg-muted-foreground/40" : occ >= 90 ? "bg-rose-500" : occ >= 75 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <li key={o.id} className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1.2fr_0.8fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 hover:bg-accent/30">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 font-display text-[11px] font-bold text-primary">
                      {orgInitials(o.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{o.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {o.owner_name ?? "—"} · desde {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </div>
                  <select
                    value={o.plan}
                    onChange={(e) => updateMut.mutate({ orgId: o.id, plan: e.target.value as any })}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {Object.entries(PLAN_LABEL).map(([id, l]) => (
                      <option key={id} value={id}>{l}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                      {badge.icon} {badge.label}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs">
                      <span className="font-semibold">{o.aluno_ativos}</span>
                      <span className="text-muted-foreground">/{o.aluno_count}</span>
                      {o.max_alunos != null && <span className="text-[10px] text-muted-foreground"> · lim {o.max_alunos}</span>}
                    </div>
                    {occ != null && (
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div className={`h-full ${occColor}`} style={{ width: `${occ}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="text-xs">{o.member_count}</div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateMut.mutate({ orgId: o.id, suspended: !suspended })}
                      title={suspended ? "Reativar" : "Suspender"}
                      className={`grid h-8 w-8 place-items-center rounded-md ${
                        suspended ? "text-emerald-500 hover:bg-emerald-500/10" : "text-amber-500 hover:bg-amber-500/10"
                      }`}
                    >
                      {suspended ? <Play className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => onDelete(o.id, o.name)}
                      title="Excluir"
                      className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------ USUÁRIOS ------------------------ */

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  owner: "Dono",
  staff: "Equipe",
  personal: "Personal",
  aluno: "Aluno",
};

const ROLE_STYLE: Record<string, { chip: string; dot: string; icon: React.ReactNode }> = {
  super_admin: { chip: "bg-primary text-primary-foreground", dot: "bg-primary", icon: <Shield className="h-3 w-3" /> },
  owner:       { chip: "bg-amber-500/15 text-amber-500 border border-amber-500/30", dot: "bg-amber-500", icon: <Crown className="h-3 w-3" /> },
  staff:       { chip: "bg-sky-500/15 text-sky-500 border border-sky-500/30", dot: "bg-sky-500", icon: <Users className="h-3 w-3" /> },
  personal:    { chip: "bg-violet-500/15 text-violet-500 border border-violet-500/30", dot: "bg-violet-500", icon: <Activity className="h-3 w-3" /> },
  aluno:       { chip: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30", dot: "bg-emerald-500", icon: <UserPlus className="h-3 w-3" /> },
};

const ROLE_ORDER = ["super_admin", "owner", "personal", "staff", "aluno"] as const;

type UserFilter = "all" | "super_admin" | "owner" | "personal" | "staff" | "aluno" | "no_role" | "unverified" | "inactive";
type UserSort = "recent" | "oldest" | "last_sign" | "name";

function userInitials(name: string | null, email: string | null) {
  const base = (name && name.trim()) || (email ? email.split("@")[0] : "");
  if (!base) return "?";
  return base
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || base[0].toUpperCase();
}

function avatarHue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

function timeAgo(iso: string | null) {
  if (!iso) return "nunca";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const day = 86400000;
  if (diff < 60_000) return "agora";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}min`;
  if (diff < day) return `${Math.floor(diff / 3600_000)}h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}sem`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}mês`;
  return `${Math.floor(diff / (365 * day))}a`;
}

function UsersTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [sort, setSort] = useState<UserSort>("recent");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "users"],
    queryFn: () => listAllUsers(),
  });

  const list = data ?? [];

  const stats = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    let verified = 0, unverified = 0, active7 = 0, never = 0, noRole = 0;
    const roleCounts: Record<string, number> = {};
    list.forEach((u: any) => {
      if (u.email_confirmed_at) verified++; else unverified++;
      if (u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() <= 7 * day) active7++;
      if (!u.last_sign_in_at) never++;
      if (!u.roles?.length) noRole++;
      (u.roles ?? []).forEach((r: string) => { roleCounts[r] = (roleCounts[r] ?? 0) + 1; });
    });
    return { total: list.length, verified, unverified, active7, never, noRole, roleCounts };
  }, [list]);

  const filtered = useMemo(() => {
    let arr = list;
    if (filter !== "all") {
      arr = arr.filter((u: any) => {
        if (filter === "no_role") return !u.roles?.length;
        if (filter === "unverified") return !u.email_confirmed_at;
        if (filter === "inactive") return !u.last_sign_in_at;
        return u.roles?.includes(filter);
      });
    }
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter((u: any) => u.email?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s));
    }
    const sorted = [...arr];
    sorted.sort((a: any, b: any) => {
      if (sort === "name") return (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? "");
      if (sort === "last_sign") return (b.last_sign_in_at ?? "") > (a.last_sign_in_at ?? "") ? 1 : -1;
      if (sort === "oldest") return a.created_at > b.created_at ? 1 : -1;
      return a.created_at < b.created_at ? 1 : -1; // recent
    });
    return sorted;
  }, [list, filter, q, sort]);

  const roleMut = useMutation({
    mutationFn: (v: any) => toggleUserRole({ data: v }),
    onSuccess: () => {
      toast.success("Papel atualizado.");
      qc.invalidateQueries({ queryKey: ["super-admin", "users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) => deleteUserAccount({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuário excluído.");
      qc.invalidateQueries({ queryKey: ["super-admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function onDelete(userId: string, email: string | null) {
    const ok = await confirmDialog({
      title: "Excluir usuário?",
      description: `A conta ${email ?? userId} e todos os dados vinculados serão removidos.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (ok) deleteMut.mutate(userId);
  }

  async function onResetPassword(userId: string, email: string | null) {
    const pw = window.prompt(`Nova senha para ${email ?? userId} (mín. 8 caracteres):`, "");
    if (!pw) return;
    if (pw.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres."); return; }
    try {
      await resetUserPassword({ data: { userId, newPassword: pw } });
      toast.success("Senha redefinida.");
    } catch (e: any) { toast.error(e.message); }
  }

  async function copyEmail(email: string | null) {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copiado.");
    } catch { toast.error("Não foi possível copiar."); }
  }

  const filterChips: { id: UserFilter; label: string; count: number }[] = [
    { id: "all", label: "Todos", count: stats.total },
    { id: "super_admin", label: "Super Admin", count: stats.roleCounts.super_admin ?? 0 },
    { id: "owner", label: "Donos", count: stats.roleCounts.owner ?? 0 },
    { id: "personal", label: "Personais", count: stats.roleCounts.personal ?? 0 },
    { id: "staff", label: "Equipe", count: stats.roleCounts.staff ?? 0 },
    { id: "aluno", label: "Alunos", count: stats.roleCounts.aluno ?? 0 },
    { id: "no_role", label: "Sem papel", count: stats.noRole },
    { id: "unverified", label: "Não verificados", count: stats.unverified },
    { id: "inactive", label: "Nunca acessou", count: stats.never },
  ];

  return (
    <div className="space-y-5">
      {/* Header enxuto */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Usuários globais
          </div>
          <div className="mt-1 font-display text-2xl font-bold tracking-tight">
            {stats.total} <span className="text-sm font-medium text-muted-foreground">contas</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span><b className="text-emerald-500">{stats.verified}</b> verificadas</span>
          <span><b className="text-amber-500">{stats.unverified}</b> pendentes</span>
          <span><b className="text-primary">{stats.active7}</b> ativas 7d</span>
          <span><b className="text-rose-500">{stats.noRole}</b> sem papel</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {filterChips.map((chip) => {
            const on = filter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setFilter(chip.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-foreground/30"
                }`}
              >
                {chip.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${on ? "bg-white/25" : "bg-muted"}`}>{chip.count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por email ou nome…"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as UserSort)}
              className="appearance-none rounded-lg border border-border bg-background py-2 pl-8 pr-8 text-xs font-semibold"
            >
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="last_sign">Último acesso</option>
              <option value="name">Nome (A–Z)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">{filtered.length} resultado(s)</div>
        </div>

      </div>

      {isLoading && <Spinner />}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <div className="mt-3 text-sm font-semibold">Nenhum usuário encontrado</div>
          <div className="text-xs text-muted-foreground">Ajuste os filtros ou a busca.</div>
        </div>
      )}

      {/* Lista */}
      {!isLoading && filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span>Usuário</span>
            <span className="ml-auto hidden sm:inline">Papéis</span>
          </div>
          <ul>
            {filtered.map((u: any) => {
              const menuOpen = openMenuId === u.id;
              const isSelf = false; // super admin cannot delete self anyway
              const hue = avatarHue(u.id);
              const roles: string[] = u.roles ?? [];
              return (
                <li
                  key={u.id}
                  className="group flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3 transition hover:bg-accent/30"
                >
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-xs font-bold text-white"
                    style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))` }}
                  >
                    {userInitials(u.full_name, u.email)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{u.full_name ?? u.email?.split("@")[0] ?? "—"}</span>
                      {!u.email_confirmed_at && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-500">
                          <AlertTriangle className="h-2.5 w-2.5" /> Não verificado
                        </span>
                      )}
                      {!roles.length && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-500">
                          Sem papel
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <button
                        onClick={() => copyEmail(u.email)}
                        className="inline-flex items-center gap-1 truncate hover:text-foreground"
                        title="Copiar email"
                      >
                        {u.email ?? "—"} <Copy className="h-2.5 w-2.5" />
                      </button>
                      <span className="hidden sm:inline">·</span>
                      <span className="inline-flex items-center gap-1" title={u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "nunca"}>
                        <Clock className="h-2.5 w-2.5" /> {timeAgo(u.last_sign_in_at)}
                      </span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline">criado {timeAgo(u.created_at)} atrás</span>
                    </div>
                  </div>

                  {/* Role badges resumidos */}
                  <div className="hidden flex-wrap items-center gap-1 md:flex">
                    {roles.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    ) : (
                      roles.map((r) => {
                        const st = ROLE_STYLE[r] ?? ROLE_STYLE.aluno;
                        return (
                          <span key={r} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.chip}`}>
                            {st.icon} {ROLE_LABEL[r]}
                          </span>
                        );
                      })
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(menuOpen ? null : u.id)}
                      className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-9 z-20 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                          <div className="border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Alternar papéis
                          </div>
                          <div className="flex flex-wrap gap-1 p-2">
                            {ROLE_ORDER.map((r) => {
                              const has = roles.includes(r);
                              const st = ROLE_STYLE[r];
                              return (
                                <button
                                  key={r}
                                  onClick={() => roleMut.mutate({ userId: u.id, role: r, grant: !has })}
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                                    has ? st.chip : "border border-border text-muted-foreground hover:bg-accent"
                                  }`}
                                >
                                  {has ? <UserMinus className="h-2.5 w-2.5" /> : <UserPlus className="h-2.5 w-2.5" />}
                                  {ROLE_LABEL[r]}
                                </button>
                              );
                            })}
                          </div>
                          <div className="border-t border-border" />
                          <button
                            onClick={() => { setOpenMenuId(null); copyEmail(u.email); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-accent"
                          >
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Copiar email
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onResetPassword(u.id, u.email); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-accent"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> Redefinir senha
                          </button>
                          <div className="border-t border-border" />
                          <button
                            disabled={isSelf}
                            onClick={() => { setOpenMenuId(null); onDelete(u.id, u.email); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir usuário
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------ PLANOS ------------------------ */

const PLAN_PRICING_LOCAL: Record<string, number> = { free: 0, starter: 49, pro: 149, enterprise: 399 };

const PLAN_META: Record<string, {
  tagline: string;
  gradient: string;
  border: string;
  text: string;
  chip: string;
  icon: React.ReactNode;
  features: string[];
  defaultLimit: number | null;
}> = {
  free: {
    tagline: "Onboarding e testes",
    gradient: "from-muted-foreground/15 to-transparent",
    border: "border-border",
    text: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    icon: <Sparkles className="h-4 w-4" />,
    features: ["Até 10 alunos", "1 profissional", "Suporte por email"],
    defaultLimit: 10,
  },
  starter: {
    tagline: "Personais e microacademias",
    gradient: "from-sky-500/20 to-transparent",
    border: "border-sky-500/30",
    text: "text-sky-500",
    chip: "bg-sky-500/15 text-sky-500",
    icon: <Zap className="h-4 w-4" />,
    features: ["Até 50 alunos", "3 profissionais", "Financeiro básico"],
    defaultLimit: 50,
  },
  pro: {
    tagline: "Academias em crescimento",
    gradient: "from-primary/25 to-transparent",
    border: "border-primary/40",
    text: "text-primary",
    chip: "bg-primary/15 text-primary",
    icon: <Crown className="h-4 w-4" />,
    features: ["Até 250 alunos", "Equipe ilimitada", "Avaliações + IA"],
    defaultLimit: 250,
  },
  enterprise: {
    tagline: "Redes e franquias",
    gradient: "from-amber-500/25 to-transparent",
    border: "border-amber-500/40",
    text: "text-amber-500",
    chip: "bg-amber-500/15 text-amber-500",
    icon: <Shield className="h-4 w-4" />,
    features: ["Alunos ilimitados", "SLA dedicado", "Onboarding assistido"],
    defaultLimit: null,
  },
};

type PlanBuckets = Record<string, {
  orgs: any[];
  active: number;
  trialing: number;
  pastDue: number;
  suspended: number;
  totalAlunos: number;
  alunosAtivos: number;
  nearLimit: number;
  revenue: number;
}>;

function PlansTab() {
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "orgs"],
    queryFn: () => listAllOrganizations(),
  });

  const updateMut = useMutation({
    mutationFn: (v: any) => updateOrganization({ data: v }),
    onSuccess: () => {
      toast.success("Academia atualizada.");
      qc.invalidateQueries({ queryKey: ["super-admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const list = data ?? [];

  const buckets: PlanBuckets = useMemo(() => {
    const b: PlanBuckets = {};
    Object.keys(PLAN_LABEL).forEach((p) => {
      b[p] = { orgs: [], active: 0, trialing: 0, pastDue: 0, suspended: 0, totalAlunos: 0, alunosAtivos: 0, nearLimit: 0, revenue: 0 };
    });
    list.forEach((o: any) => {
      const bucket = b[o.plan] ?? b.free;
      bucket.orgs.push(o);
      bucket.totalAlunos += o.aluno_count ?? 0;
      bucket.alunosAtivos += o.aluno_ativos ?? 0;
      if (o.suspended_at) bucket.suspended++;
      else if (o.subscription_status === "active") { bucket.active++; bucket.revenue += PLAN_PRICING_LOCAL[o.plan] ?? 0; }
      else if (o.subscription_status === "trialing") { bucket.trialing++; bucket.revenue += PLAN_PRICING_LOCAL[o.plan] ?? 0; }
      else if (o.subscription_status === "past_due") bucket.pastDue++;
      if (!o.suspended_at && o.max_alunos && (o.aluno_ativos / o.max_alunos) >= 0.85) bucket.nearLimit++;
    });
    return b;
  }, [list]);

  const totalMRR = useMemo(() => Object.values(buckets).reduce((s, b) => s + b.revenue, 0), [buckets]);
  const totalPaying = useMemo(() => Object.values(buckets).reduce((s, b) => s + b.active + b.trialing, 0), [buckets]);
  const totalOrgs = list.length;

  const selectedBucket = buckets[selectedPlan] ?? { orgs: [] as any[], revenue: 0, active: 0, trialing: 0, pastDue: 0, suspended: 0, totalAlunos: 0, alunosAtivos: 0, nearLimit: 0 };
  const selectedMeta = PLAN_META[selectedPlan];
  const selectedRows = useMemo(() => {
    if (!q.trim()) return selectedBucket.orgs;
    const s = q.trim().toLowerCase();
    return selectedBucket.orgs.filter((o: any) =>
      o.name?.toLowerCase().includes(s) || o.slug?.toLowerCase().includes(s) || o.owner_name?.toLowerCase().includes(s),
    );
  }, [selectedBucket, q]);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* Hero de receita */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6 lg:col-span-2">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-primary/80">
              <CreditCard className="h-3.5 w-3.5" /> Assinaturas & receita
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-6">
              <div>
                <div className="font-display text-5xl font-bold tracking-tight">{formatBRL(totalMRR)}</div>
                <div className="text-xs text-muted-foreground">MRR estimado · {formatBRL(totalMRR * 12)} ARR</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold">{totalPaying}<span className="text-muted-foreground">/{totalOrgs}</span></div>
                <div className="text-xs text-muted-foreground">academias pagantes</div>
              </div>
            </div>

            {/* Barra de distribuição por plano */}
            <div className="mt-6">
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                {(["enterprise", "pro", "starter", "free"] as const).map((id) => {
                  const c = buckets[id]?.orgs.length ?? 0;
                  if (!c || totalOrgs === 0) return null;
                  return <div key={id} className={PLAN_COLORS[id]} style={{ width: `${(c / totalOrgs) * 100}%` }} title={`${PLAN_LABEL[id]}: ${c}`} />;
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                {(["enterprise", "pro", "starter", "free"] as const).map((id) => (
                  <span key={id} className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full ${PLAN_COLORS[id]}`} /> {PLAN_LABEL[id]} · {buckets[id]?.orgs.length ?? 0}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <Target className="h-4 w-4" />
            </span>
            <div>
              <div className="font-display text-sm font-bold">Oportunidades de upsell</div>
              <div className="text-[11px] text-muted-foreground">Academias no limite ou em plano free</div>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {(["free", "starter", "pro"] as const).map((p) => {
              const nl = buckets[p]?.nearLimit ?? 0;
              const meta = PLAN_META[p];
              return (
                <li key={p} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-6 w-6 place-items-center rounded-md ${meta.chip}`}>{meta.icon}</span>
                    <div>
                      <div className="text-xs font-semibold">{PLAN_LABEL[p]}</div>
                      <div className="text-[10px] text-muted-foreground">no limite (≥85%)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-display text-lg font-bold ${nl > 0 ? "text-amber-500" : "text-muted-foreground"}`}>{nl}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Cards de plano (comparativo) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(PLAN_LABEL) as (keyof typeof PLAN_LABEL)[]).map((planId) => {
          const meta = PLAN_META[planId];
          const b = buckets[planId];
          const price = PLAN_PRICING_LOCAL[planId] ?? 0;
          const share = totalOrgs > 0 ? Math.round((b.orgs.length / totalOrgs) * 100) : 0;
          const isSelected = selectedPlan === planId;
          return (
            <button
              key={planId}
              onClick={() => setSelectedPlan(planId)}
              className={`group relative overflow-hidden rounded-2xl border bg-card p-5 text-left transition hover:shadow-lg ${
                isSelected ? `${meta.border} shadow-lg ring-1 ring-current ${meta.text}` : "border-border hover:border-foreground/30"
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${meta.gradient} opacity-80`} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${meta.chip}`}>
                    {meta.icon} {PLAN_LABEL[planId]}
                  </span>
                  {isSelected && <span className={`text-[10px] font-bold ${meta.text}`}>SELECIONADO</span>}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">{meta.tagline}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold tracking-tight">
                    {price === 0 ? "Grátis" : formatBRL(price)}
                  </span>
                  {price > 0 && <span className="text-[11px] text-muted-foreground">/mês</span>}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-background/60 py-2">
                    <div className="font-display text-lg font-bold">{b.orgs.length}</div>
                    <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Academias</div>
                  </div>
                  <div className="rounded-lg bg-background/60 py-2">
                    <div className={`font-display text-lg font-bold ${meta.text}`}>{formatBRL(b.revenue)}</div>
                    <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">MRR</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <span>Fatia</span><span>{share}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${PLAN_COLORS[planId]}`} style={{ width: `${share}%` }} />
                  </div>
                </div>

                <ul className="mt-4 space-y-1.5">
                  {meta.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <CheckCircle2 className={`h-3 w-3 shrink-0 ${meta.text}`} /> {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center gap-2 text-[10px]">
                  {b.active > 0 && <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-500">{b.active} ativas</span>}
                  {b.trialing > 0 && <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 font-bold text-sky-500">{b.trialing} trial</span>}
                  {b.pastDue > 0 && <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 font-bold text-rose-500">{b.pastDue} vencidas</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalhe do plano selecionado */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${selectedMeta.chip}`}>
              {selectedMeta.icon}
            </span>
            <div>
              <h2 className="font-display text-base font-bold">
                Academias no plano {PLAN_LABEL[selectedPlan]}
              </h2>
              <div className="text-[11px] text-muted-foreground">
                {selectedBucket.orgs.length} academia(s) · {selectedBucket.alunosAtivos}/{selectedBucket.totalAlunos} alunos ativos · {formatBRL(selectedBucket.revenue)} MRR
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar academia…"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </div>
          </div>
        </div>

        {selectedRows.length === 0 ? (
          <div className="py-14 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <div className="mt-2 text-sm font-semibold">Nenhuma academia neste plano</div>
            <div className="text-xs text-muted-foreground">Assim que uma academia migrar para {PLAN_LABEL[selectedPlan]}, ela aparecerá aqui.</div>
          </div>
        ) : (
          <ul>
            {selectedRows.map((o: any) => {
              const suspended = !!o.suspended_at;
              const status = suspended ? "canceled" : (o.subscription_status ?? "active");
              const badge = STATUS_BADGE[status] ?? STATUS_BADGE.canceled;
              const occ = o.max_alunos ? Math.min(100, Math.round((o.aluno_ativos / o.max_alunos) * 100)) : null;
              const occColor = occ == null ? "bg-muted-foreground/40" : occ >= 90 ? "bg-rose-500" : occ >= 75 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <li key={o.id} className="flex flex-wrap items-center gap-4 border-b border-border/60 px-5 py-3 hover:bg-accent/30">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 font-display text-xs font-bold text-primary">
                    {orgInitials(o.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">{o.name}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {o.owner_name ?? "—"} · desde {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>

                  <div className="min-w-[180px]">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      <span>Ocupação</span>
                      <span className={occ == null ? "" : occ >= 90 ? "text-rose-500" : occ >= 75 ? "text-amber-500" : "text-muted-foreground"}>
                        {o.aluno_ativos}/{o.max_alunos ?? "∞"} {occ != null && `· ${occ}%`}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${occColor}`} style={{ width: `${occ ?? 0}%` }} />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="uppercase tracking-widest">Limite</span>
                    <input
                      type="number"
                      min={0}
                      defaultValue={o.max_alunos ?? ""}
                      placeholder="∞"
                      onBlur={(e) => {
                        const raw = e.currentTarget.value.trim();
                        const val = raw === "" ? null : Math.max(0, parseInt(raw, 10) || 0);
                        if (val === o.max_alunos) return;
                        updateMut.mutate({ orgId: o.id, max_alunos: val });
                      }}
                      className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
                    />
                  </label>

                  <select
                    value={o.plan}
                    onChange={(e) => updateMut.mutate({ orgId: o.id, plan: e.target.value as any })}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold"
                    title="Mudar plano"
                  >
                    {Object.entries(PLAN_LABEL).map(([id, l]) => (
                      <option key={id} value={id}>Mover → {l}</option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        )}

        {selectedMeta.defaultLimit !== null && selectedBucket.orgs.some((o: any) => o.max_alunos == null) && (
          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3 text-[11px] text-muted-foreground">
            <span>Algumas academias estão sem limite definido. Aplicar padrão do plano ({selectedMeta.defaultLimit} alunos)?</span>
            <button
              onClick={() => {
                selectedBucket.orgs.forEach((o: any) => {
                  if (o.max_alunos == null) updateMut.mutate({ orgId: o.id, max_alunos: selectedMeta.defaultLimit });
                });
              }}
              className="rounded-md border border-border bg-background px-2.5 py-1 font-semibold hover:bg-accent"
            >
              Aplicar padrão
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );
}
