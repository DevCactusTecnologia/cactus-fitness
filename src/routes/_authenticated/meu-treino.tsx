import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Dumbbell, Trophy, HeartPulse, Calendar, ClipboardCheck, User as UserIcon, LogOut } from "lucide-react";
import { useCurrentUser, useSignOut, firstName } from "@/lib/auth";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/_authenticated/meu-treino")({
  head: () => ({
    meta: [
      { title: "Meu Treino · cactusfitness" },
      { name: "description", content: "Seus treinos, avaliações e progresso." },
    ],
  }),
  component: MeuTreinoPage,
});

function MeuTreinoPage() {
  const navigate = useNavigate();
  const { profile, loading } = useCurrentUser();
  const signOut = useSignOut();

  // Personal caiu aqui por engano → volta ao painel
  useEffect(() => {
    if (!loading && profile && profile.role === "personal") {
      navigate({ to: "/", replace: true });
    }
  }, [loading, profile, navigate]);

  const name = firstName(profile?.full_name, profile?.email);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Bem-vindo</p>
            <h1 className="truncate font-display text-xl font-bold sm:text-2xl">Olá, {name}</h1>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4 pb-28 sm:p-6">
        <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/20 text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Seu plano de hoje</p>
              <p className="font-display text-lg font-bold">Nenhum treino programado</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Assim que seu personal liberar um treino, ele aparece aqui.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickCard icon={ClipboardCheck} label="Treinos" />
          <QuickCard icon={HeartPulse} label="Avaliações" />
          <QuickCard icon={Trophy} label="Desafios" />
          <QuickCard icon={Calendar} label="Agenda" />
        </div>

        <Link
          to="/perfil"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-accent"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Meu perfil</p>
              <p className="text-xs text-muted-foreground">Dados pessoais e preferências</p>
            </div>
          </div>
          <span className="text-sm font-medium text-primary">Abrir →</span>
        </Link>
      </main>

      <MobileBottomNav />
    </div>
  );
}

function QuickCard({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold">{label}</p>
    </div>
  );
}
