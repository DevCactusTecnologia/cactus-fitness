import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/")({
  head: () => ({
    meta: [
      { title: "Painel da Academia · cactusfitness" },
      { name: "description", content: "Visão geral da sua academia." },
    ],
  }),
  component: AcademiaHome,
});

function AcademiaHome() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Painel da Academia
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Em breve: KPIs, alunos, personais, financeiro consolidado.
        </p>
      </div>
    </div>
  );
}
