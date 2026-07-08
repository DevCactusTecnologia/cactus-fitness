import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Mail, Copy, Trash2, UserPlus, Loader2, Check, Shield, Crown, Users, Dumbbell, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/_authenticated/dashboard/personal/academia")({
  head: () => ({
    meta: [
      { title: "Minha Academia · cactusfitness" },
      { name: "description", content: "Gerencie sua academia, membros e convites." },
    ],
  }),
  component: AcademiaPage,
});

type OrgRow = { id: string; name: string; created_by: string };
type MemberRow = {
  id: string;
  user_id: string;
  role: "owner" | "personal" | "staff";
  created_at: string;
  profile?: { full_name: string | null; email?: string | null } | null;
};
type InviteRow = {
  id: string;
  email: string;
  role: "owner" | "personal" | "staff";
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; icon: any; cls: string }> = {
    owner: { label: "Dono", icon: Crown, cls: "bg-primary/15 text-primary" },
    personal: { label: "Personal", icon: Shield, cls: "bg-blue-500/15 text-blue-400" },
    staff: { label: "Equipe", icon: Shield, cls: "bg-muted text-muted-foreground" },
  };
  const it = map[role] ?? map.staff;
  const Icon = it.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${it.cls}`}>
      <Icon className="h-3 w-3" /> {it.label}
    </span>
  );
}

function AcademiaPage() {
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [me, setMe] = useState<string | null>(null);

  // Invite form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"personal" | "staff">("personal");
  const [inviting, setInviting] = useState(false);

  // Rename org
  const [orgName, setOrgName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const isOwner = useMemo(
    () => !!me && !!members.find((m) => m.user_id === me && m.role === "owner"),
    [me, members],
  );

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setMe(uid);

    const { data: mine } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", uid ?? "")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!mine?.organization_id) {
      setLoading(false);
      return;
    }
    const { data: o } = await supabase
      .from("organizations")
      .select("id, name, created_by")
      .eq("id", mine.organization_id)
      .maybeSingle();
    if (o) {
      setOrg(o as OrgRow);
      setOrgName(o.name);
    }
    const { data: mems } = await supabase
      .from("organization_members")
      .select("id, user_id, role, created_at")
      .eq("organization_id", mine.organization_id)
      .order("created_at", { ascending: true });
    const memList = (mems ?? []) as MemberRow[];
    // Fetch profile names for members
    const ids = memList.map((m) => m.user_id);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      memList.forEach((m) => {
        m.profile = { full_name: byId.get(m.user_id)?.full_name ?? null };
      });
    }
    setMembers(memList);

    const { data: invs } = await supabase
      .from("organization_invites")
      .select("id, email, role, token, created_at, expires_at, accepted_at")
      .eq("organization_id", mine.organization_id)
      .order("created_at", { ascending: false });
    setInvites((invs ?? []) as InviteRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function invite() {
    if (!org || !email.trim()) return;
    setInviting(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setInviting(false); return; }
    const { error } = await supabase.from("organization_invites").insert({
      organization_id: org.id,
      email: email.trim().toLowerCase(),
      role,
      invited_by: uid,
    });
    setInviting(false);
    if (error) { toast.error(error.message); return; }
    setEmail("");
    toast.success("Convite criado. Copie o link e envie ao convidado.");
    load();
  }

  async function revokeInvite(id: string) {
    const { error } = await supabase.from("organization_invites").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Convite removido.");
    load();
  }

  async function removeMember(id: string, userId: string) {
    if (userId === me) { toast.error("Você não pode remover a si mesmo."); return; }
    const { error } = await supabase.from("organization_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Membro removido.");
    load();
  }

  async function saveName() {
    if (!org || !orgName.trim()) return;
    setSavingName(true);
    const { error } = await supabase.from("organizations").update({ name: orgName.trim() }).eq("id", org.id);
    setSavingName(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Academia atualizada.");
    load();
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/academia/convite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />
      <main className="pb-24 md:ml-[72px] md:pb-0">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Minha Academia</h1>
              <p className="text-xs text-muted-foreground">Membros, papéis e convites</p>
            </div>
          </div>

          {loading && (
            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          )}

          {!loading && !org && (
            <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Você ainda não pertence a uma academia.
            </div>
          )}

          {!loading && org && (
            <>
              {/* Nome da academia */}
              <section className="mt-6 rounded-2xl border border-border bg-card p-5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nome da academia</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={!isOwner}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
                  />
                  {isOwner && (
                    <button
                      onClick={saveName}
                      disabled={savingName || orgName.trim() === org.name}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
                    </button>
                  )}
                </div>
              </section>

              {/* Convidar */}
              {isOwner && (
                <section className="mt-6 rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-display text-base font-bold">Convidar personal</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gere um link de convite e envie ao personal. Ele precisa criar conta e abrir o link.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                    <input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="personal">Personal</option>
                      <option value="staff">Equipe</option>
                    </select>
                    <button
                      onClick={invite}
                      disabled={inviting || !email.trim()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Convidar
                    </button>
                  </div>
                </section>
              )}

              {/* Convites pendentes */}
              {isOwner && invites.filter((i) => !i.accepted_at).length > 0 && (
                <section className="mt-6 rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-display text-base font-bold">Convites pendentes</h2>
                  <ul className="mt-3 space-y-2">
                    {invites.filter((i) => !i.accepted_at).map((inv) => {
                      const expired = new Date(inv.expires_at) < new Date();
                      return (
                        <li key={inv.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{inv.email}</span>
                          <RoleBadge role={inv.role} />
                          {expired && (
                            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                              expirado
                            </span>
                          )}
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              onClick={() => copyInviteLink(inv.token)}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                              title="Copiar link do convite"
                            >
                              <Copy className="h-3 w-3" /> Link
                            </button>
                            <button
                              onClick={() => revokeInvite(inv.id)}
                              className="grid h-7 w-7 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                              title="Remover convite"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Membros */}
              <section className="mt-6 rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-base font-bold">Membros ({members.length})</h2>
                <ul className="mt-3 space-y-2">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                        {(m.profile?.full_name ?? "??").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {m.profile?.full_name ?? "Sem nome"}
                          {m.user_id === me && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          entrou em {new Date(m.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <RoleBadge role={m.role} />
                      {isOwner && m.role !== "owner" && (
                        <button
                          onClick={() => removeMember(m.id, m.user_id)}
                          className="grid h-7 w-7 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
