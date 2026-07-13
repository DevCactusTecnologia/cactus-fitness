import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Shield, Building2, Users, TrendingUp, CreditCard,
  Loader2, Trash2, Ban, Play, Search, KeyRound, LogOut,
  Crown, UserMinus, UserPlus,
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

function StatCard({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="font-display text-2xl font-bold tracking-tight">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "metrics"],
    queryFn: () => superAdminMetrics(),
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Building2 className="h-4 w-4" />} label="Academias" value={data.totalOrgs} hint={`${data.activeOrgs} ativas`} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Novas no mês" value={data.newOrgsThisMonth} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Usuários" value={data.totalUsers} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Alunos" value={data.totalAlunos} hint={`${data.alunosAtivos} ativos`} />
        <StatCard icon={<Crown className="h-4 w-4" />} label="Personais" value={data.totalPersonais} />
        <StatCard icon={<Shield className="h-4 w-4" />} label="Equipe" value={data.totalStaff} />
        <StatCard icon={<Ban className="h-4 w-4" />} label="Suspensas" value={data.suspendedOrgs} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-bold">Distribuição por plano</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {Object.entries(PLAN_LABEL).map(([id, label]) => (
            <div key={id} className="rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="font-display text-xl font-bold">{data.byPlan[id] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------ ORGANIZAÇÕES ------------------------ */

function OrgsTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "orgs"],
    queryFn: () => listAllOrganizations(),
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const s = q.trim().toLowerCase();
    return list.filter(
      (o: any) =>
        o.name?.toLowerCase().includes(s) ||
        o.slug?.toLowerCase().includes(s) ||
        o.owner_name?.toLowerCase().includes(s),
    );
  }, [data, q]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, slug ou dono…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} academia(s)</div>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <div>Academia</div>
            <div>Plano</div>
            <div>Status</div>
            <div>Alunos</div>
            <div>Membros</div>
            <div />
          </div>
          <ul>
            {filtered.map((o: any) => {
              const suspended = !!o.suspended_at;
              return (
                <li key={o.id} className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{o.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {o.owner_name ?? "—"} · desde {new Date(o.created_at).toLocaleDateString("pt-BR")}
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
                  <select
                    value={o.subscription_status}
                    onChange={(e) => updateMut.mutate({ orgId: o.id, subscription_status: e.target.value as any })}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {Object.entries(STATUS_LABEL).map(([id, l]) => (
                      <option key={id} value={id}>{l}</option>
                    ))}
                  </select>
                  <div className="text-sm">
                    {o.aluno_ativos}
                    <span className="text-muted-foreground">/{o.aluno_count}</span>
                    {o.max_alunos != null && (
                      <span className="text-[11px] text-muted-foreground"> · lim {o.max_alunos}</span>
                    )}
                  </div>
                  <div className="text-sm">{o.member_count}</div>
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
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma academia encontrada.</li>
            )}
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

function UsersTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "users"],
    queryFn: () => listAllUsers(),
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const s = q.trim().toLowerCase();
    return list.filter(
      (u: any) => u.email?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s),
    );
  }, [data, q]);

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
    if (pw.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    try {
      await resetUserPassword({ data: { userId, newPassword: pw } });
      toast.success("Senha redefinida.");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por email ou nome…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} usuário(s)</div>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul>
            {filtered.map((u: any) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{u.full_name ?? "—"}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {u.email ?? "—"} · último acesso: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR") : "nunca"}
                    {!u.email_confirmed_at && <span className="ml-2 text-amber-500">(email não verificado)</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(["super_admin", "owner", "personal", "staff", "aluno"] as const).map((r) => {
                    const has = u.roles.includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => roleMut.mutate({ userId: u.id, role: r, grant: !has })}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                          has
                            ? r === "super_admin"
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/15 text-primary"
                            : "border border-border text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {has ? <UserMinus className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                        {ROLE_LABEL[r]}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onResetPassword(u.id, u.email)}
                    title="Redefinir senha"
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(u.id, u.email)}
                    title="Excluir usuário"
                    className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------ PLANOS ------------------------ */

function PlansTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "orgs"],
    queryFn: () => listAllOrganizations(),
  });

  const updateMut = useMutation({
    mutationFn: (v: any) => updateOrganization({ data: v }),
    onSuccess: () => {
      toast.success("Limite atualizado.");
      qc.invalidateQueries({ queryKey: ["super-admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Spinner />;
  const list = data ?? [];

  const grouped: Record<string, any[]> = {};
  list.forEach((o: any) => {
    (grouped[o.plan] ??= []).push(o);
  });

  return (
    <div className="space-y-6">
      {Object.entries(PLAN_LABEL).map(([planId, label]) => {
        const rows = grouped[planId] ?? [];
        return (
          <section key={planId} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold">Plano {label}</h2>
                <div className="text-xs text-muted-foreground">{rows.length} academia(s)</div>
              </div>
            </div>
            {rows.length > 0 && (
              <ul className="mt-3 divide-y divide-border/60">
                {rows.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{o.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {o.aluno_ativos}/{o.aluno_count} alunos ativos · {STATUS_LABEL[o.subscription_status] ?? o.subscription_status}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Limite alunos:
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
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
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
