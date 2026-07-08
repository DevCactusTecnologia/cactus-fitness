import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartPulse, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/avaliacoes")({
  head: () => ({ meta: [{ title: "Avaliações · cactusfitness" }] }),
  component: AvaliacoesPage,
});

function AvaliacoesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl p-6">
        <Link to="/meu-treino" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> voltar
        </Link>
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <HeartPulse className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold">Avaliações</h1>
          <p className="mt-2 text-sm text-muted-foreground">Em breve você verá suas avaliações físicas aqui.</p>
        </div>
      </main>
    </div>
  );
}
