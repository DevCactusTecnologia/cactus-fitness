import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Trash2, Loader2, Check, Shield, Crown, Users, Dumbbell, ArrowRight, Sparkles, Power, PowerOff, Pencil } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { getMySoloStatus, activateSoloStudio, deactivateSoloStudio, renameSoloStudio } from "@/lib/personal-solo.functions";


export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/academia")({
  beforeLoad: async () => {
    const { redirect } = await import("@tanstack/react-router");
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const { data: mems } = await supabase
      .from("organization_members")
      .select("organization_id, organizations!inner(created_by)")
      .eq("user_id", uid);
    const inAcademia = (mems ?? []).some((m: any) => m.organizations?.created_by !== uid);
    if (!inAcademia) throw redirect({ to: "/" });
  },
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
                    <div className="text-sm font-semibold">Treinos</div>
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

              <SoloStudioSection />
            </>
          )}

        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

function SoloStudioSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-solo-status"],
    queryFn: () => getMySoloStatus(),
    staleTime: 30_000,
  });

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmingOff, setConfirmingOff] = useState(false);

  const activateMut = useMutation({
    mutationFn: () => activateSoloStudio({ data: {} }),
    onSuccess: () => {
      toast.success("Studio pessoal ativado!");
      qc.invalidateQueries({ queryKey: ["my-solo-status"] });
      qc.invalidateQueries({ queryKey: ["is-personal-in-academia"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao ativar."),
  });

  const deactivateMut = useMutation({
    mutationFn: () => deactivateSoloStudio(),
    onSuccess: (r: any) => {
      if (r?.removed) toast.success("Studio pessoal desativado.");
      setConfirmingOff(false);
      qc.invalidateQueries({ queryKey: ["my-solo-status"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao desativar."),
  });

  const renameMut = useMutation({
    mutationFn: (name: string) => renameSoloStudio({ data: { name } }),
    onSuccess: () => {
      toast.success("Nome atualizado.");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["my-solo-status"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao renomear."),
  });

  if (isLoading || !data || !("eligible" in data) || !data.eligible) return null;

  // Personal solo puro (sem academia): não mostra nada — o studio já é o único tenant dele.
  if (data.active && !data.in_academia) return null;

  return (
    <section className="mt-6 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-card to-card p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold">Meu Studio pessoal</h2>
            {data.active && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ativo
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.active
              ? "Você atende alunos particulares fora da academia — isolados no seu Studio."
              : "Ative para atender alunos particulares (fora da academia) com plano, financeiro e agenda próprios."}
          </p>

          {!data.active && (
            <div className="mt-4">
              <button
                onClick={() => activateMut.mutate()}
                disabled={activateMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
              >
                {activateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                Ativar Studio pessoal
              </button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Você continua atendendo os alunos da academia normalmente.
              </p>
            </div>
          )}

          {data.active && data.solo && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => renameMut.mutate(nameDraft)}
                      disabled={renameMut.isPending || nameDraft.trim().length < 2}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {renameMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Salvar
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Nome do Studio</div>
                      <div className="mt-0.5 truncate text-sm font-semibold">{data.solo.name}</div>
                    </div>
                    <button
                      onClick={() => { setNameDraft(data.solo!.name); setEditing(true); }}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Renomear"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Alunos", v: data.usage.alunos },
                  { label: "Lanç.", v: data.usage.lancamentos },
                  { label: "Treinos", v: data.usage.templates },
                  { label: "Exerc.", v: data.usage.exercicios },
                ].map((s) => (
                  <div key={s.label} className="rounded-md border border-border/60 bg-background/40 p-2">
                    <div className="font-display text-sm font-bold">{s.v}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              {confirmingOff ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                  <div className="text-xs font-semibold text-destructive">Desativar Studio pessoal?</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    O tenant será removido. Só é possível porque está vazio.
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => deactivateMut.mutate()}
                      disabled={deactivateMut.isPending}
                      className="inline-flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
                    >
                      {deactivateMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />} Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmingOff(false)}
                      className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingOff(true)}
                  disabled={!data.can_deactivate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
                  title={data.can_deactivate ? "Desativar Studio" : "Studio tem dados — não pode ser desativado"}
                >
                  <PowerOff className="h-3.5 w-3.5" /> Desativar Studio
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

