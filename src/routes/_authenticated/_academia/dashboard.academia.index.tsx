import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Shield, Dumbbell, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/")({
  head: () => ({
    meta: [
      { title: "Painel da Academia · cactusfitness" },
      { name: "description", content: "Visão geral da sua academia." },
    ],
  }),
  component: AcademiaHome,
});

type Stats = { alunos: number; personais: number; templates: number };

function AcademiaHome() {
  const { data } = useQuery({
    queryKey: ["academia-stats"],
    queryFn: async (): Promise<Stats> => {
      const [alunosRes, membersRes, tplRes] = await Promise.all([
        supabase.from("alunos").select("id", { count: "exact", head: true }),
        supabase.from("organization_members").select("user_id", { count: "exact", head: true }),
        supabase.from("workout_templates").select("id", { count: "exact", head: true }).is("aluno_id", null),
      ]);
      return {
        alunos: alunosRes.count ?? 0,
        personais: membersRes.count ?? 0,
        templates: tplRes.count ?? 0,
      };
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail scope="academia" />
      <main className="pb-24 md:ml-[72px] md:pb-8">
        <div className="border-b border-border bg-background/80 px-4 py-6 backdrop-blur md:px-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Painel da Academia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão consolidada de alunos, personais, treinos e financeiro.
          </p>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <KpiLink to="/dashboard/academia/alunos" icon={Users} label="Alunos" value={data?.alunos ?? "—"} />
            <KpiLink to="/dashboard/academia/personais" icon={Shield} label="Personais" value={data?.personais ?? "—"} />
            <KpiLink to="/dashboard/academia/treinos" icon={Dumbbell} label="Modelos de treino" value={data?.templates ?? "—"} />
            <KpiLink to="/dashboard/academia/financeiro" icon={Wallet} label="Financeiro" value="→" />
          </div>

          <div className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
            Em breve: KPIs de receita, ocupação por personal, retenção, gráficos por período.
          </div>
        </div>
      </main>
      <MobileBottomNav scope="academia" />
    </div>
  );
}

function KpiLink({
  to, icon: Icon, label, value,
}: {
  to: "/dashboard/academia/alunos" | "/dashboard/academia/personais" | "/dashboard/academia/treinos" | "/dashboard/academia/financeiro";
  icon: React.ElementType;
  label: string;
  value: number | string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/50"
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-xl font-bold leading-none">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </div>
    </Link>
  );
}
