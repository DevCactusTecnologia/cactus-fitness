import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import {
  Building2, Users, Trash2, Loader2, Crown, Shield, Dumbbell, Check,
} from "lucide-react";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import {
  getAcademiaConfig,
  updateAcademiaName,
  removeMember,
} from "@/lib/academia-config.functions";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da Academia · cactusfitness" },
      { name: "description", content: "Gerencie o nome da academia e a equipe." },
    ],
  }),
  component: ConfiguracoesPage,
});

type RoleT = "owner" | "staff" | "personal";

const ROLE_LABEL: Record<RoleT, string> = {
  owner: "Dono",
  staff: "Recepção",
  personal: "Personal",
};
const ROLE_ICON: Record<RoleT, React.ElementType> = {
  owner: Crown,
  staff: Shield,
  personal: Dumbbell,
};

function ConfiguracoesPage() {
  const fetchCfg = useServerFn(getAcademiaConfig);
  const { data, isLoading, error } = useQuery({
    queryKey: ["academia-config"],
    queryFn: () => fetchCfg(),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail scope="academia" />
      <main className="pb-24 md:ml-[72px] md:pb-8">
        <header className="border-b border-border bg-background/80 px-4 py-6 backdrop-blur md:px-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Configurações da Academia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nome e equipe.
          </p>
        </header>

        <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8">
          {isLoading && (
            <div className="grid place-items-center py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {(error as Error).message}
            </div>
          )}
          {data && (
            <>
              <OrgCard org={data.org} canEdit={data.myRole === "owner"} />
              <MembersCard members={data.members} canManage={data.myRole === "owner"} />
            </>
          )}
        </div>
      </main>
      <MobileBottomNav scope="academia" />
    </div>
  );
}

function Card({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function OrgCard({ org, canEdit }: { org: any; canEdit: boolean }) {
  const qc = useQueryClient();
  const runUpdate = useServerFn(updateAcademiaName);
  const [name, setName] = useState(org.name);
  const mut = useMutation({
    mutationFn: (n: string) => runUpdate({ data: { name: n } }),
    onSuccess: () => {
      toast.success("Nome atualizado");
      qc.invalidateQueries({ queryKey: ["academia-config"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const dirty = name.trim() !== org.name && name.trim().length >= 2;

  return (
    <Card icon={Building2} title="Identidade" subtitle="Como sua academia aparece no sistema.">
      <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Nome
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit || mut.isPending}
          className="h-11 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
        />
        <button
          type="button"
          disabled={!canEdit || !dirty || mut.isPending}
          onClick={() => mut.mutate(name.trim())}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-glow transition disabled:opacity-50"
        >
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
        </button>
      </div>
      {!canEdit && (
        <p className="mt-2 text-xs text-muted-foreground">Somente o dono pode alterar.</p>
      )}
    </Card>
  );
}

function MembersCard({ members, canManage }: { members: any[]; canManage: boolean }) {
  const qc = useQueryClient();
  const runRemove = useServerFn(removeMember);
  const removeMut = useMutation({
    mutationFn: (userId: string) => runRemove({ data: { userId } }),
    onSuccess: () => {
      toast.success("Membro removido");
      qc.invalidateQueries({ queryKey: ["academia-config"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card icon={Users} title="Equipe" subtitle="Membros ativos da academia.">
      <ul className="divide-y divide-border">
        {members.map((m: any) => {
          const r = m.role as RoleT;
          const Icon = ROLE_ICON[r] ?? Dumbbell;
          const name = m.profile?.full_name ?? "Sem nome";
          return (
            <li key={m.user_id} className="flex items-center gap-3 py-3">
              <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                {m.profile?.avatar_url ? (
                  <img src={m.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon className="h-3 w-3" /> {ROLE_LABEL[r] ?? r}
                </div>
              </div>
              {r === "owner" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  <Check className="h-3 w-3" /> Dono
                </span>
              )}
              {canManage && r !== "owner" && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remover ${name} da academia?`)) removeMut.mutate(m.user_id);
                  }}
                  disabled={removeMut.isPending}
                  title="Remover"
                  className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
