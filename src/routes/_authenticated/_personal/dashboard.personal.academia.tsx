import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Trash2, Loader2, Check, Shield, Crown, Users, Dumbbell, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/academia")({
  head: () => ({
    meta: [
      { title: "Minha Academia · cactusfitness" },
      { name: "description", content: "Gerencie sua academia e membros." },
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

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

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
  const [me, setMe] = useState<string | null>(null);
  const [alunosByPersonal, setAlunosByPersonal] = useState<Record<string, number>>({});
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [alunosAtivos, setAlunosAtivos] = useState(0);

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

    const { data: alunos } = await supabase
      .from("alunos")
      .select("id, personal_id, is_active")
      .eq("organization_id", mine.organization_id);
    const list = alunos ?? [];
    setTotalAlunos(list.length);
    setAlunosAtivos(list.filter((a: any) => a.is_active).length);
    const counts: Record<string, number> = {};
    list.forEach((a: any) => {
      counts[a.personal_id] = (counts[a.personal_id] ?? 0) + 1;
    });
    setAlunosByPersonal(counts);

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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
              <p className="text-xs text-muted-foreground">Membros e papéis</p>
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

              <section className="mt-6 grid gap-3 sm:grid-cols-3">
                <StatCard
                  icon={<Shield className="h-4 w-4" />}
                  label="Personais"
                  value={members.filter((m) => m.role === "owner" || m.role === "personal").length}
                />
                <StatCard
                  icon={<Users className="h-4 w-4" />}
                  label="Alunos"
                  value={totalAlunos}
                  hint={`${alunosAtivos} ativos`}
                />
                <StatCard
                  icon={<Dumbbell className="h-4 w-4" />}
                  label="Equipe"
                  value={members.filter((m) => m.role === "staff").length}
                />
              </section>

              <section className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link
                  to="/dashboard/personal/alunos"
                  className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 hover:bg-accent/40"
                >
                  <div>
                    <div className="text-sm font-semibold">Ver todos os alunos</div>
                    <div className="text-[11px] text-muted-foreground">Cadastros, contatos e treinos</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </Link>
                <Link
                  to="/dashboard/personal/treinos"
                  className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 hover:bg-accent/40"
                >
                  <div>
                    <div className="text-sm font-semibold">Modelos de treino</div>
                    <div className="text-[11px] text-muted-foreground">Biblioteca da academia</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </Link>
              </section>

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
                          {(m.role === "owner" || m.role === "personal") && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                              <Users className="h-3 w-3" /> {alunosByPersonal[m.user_id] ?? 0} aluno(s)
                            </span>
                          )}
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
