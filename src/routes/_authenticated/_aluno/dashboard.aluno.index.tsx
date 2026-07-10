import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_aluno/dashboard/aluno/")({
  head: () => ({
    meta: [
      { title: "Meu painel · cactusfitness" },
      { name: "description", content: "Seus treinos, avaliações e desafios." },
    ],
  }),
  component: AlunoHome,
});

function AlunoHome() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Meu painel
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Acesse seus treinos e acompanhe sua evolução.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to="/meu-treino"
            className="rounded-lg border border-border bg-bg-elevated p-4 hover:border-border-strong"
          >
            <div className="font-semibold">Meus treinos</div>
            <div className="text-xs text-fg-muted">Plano atual</div>
          </Link>
          <Link
            to="/perfil"
            className="rounded-lg border border-border bg-bg-elevated p-4 hover:border-border-strong"
          >
            <div className="font-semibold">Perfil</div>
            <div className="text-xs text-fg-muted">Seus dados</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
