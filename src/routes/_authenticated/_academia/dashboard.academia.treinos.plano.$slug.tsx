import { createFileRoute } from "@tanstack/react-router";
import { TreinoPlanoPage } from "@/components/domain/TreinoPlanoPage";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/treinos/plano/$slug")({
  head: () => ({
    meta: [
      { title: "Plano de Treino · cactusfitness" },
      { name: "description", content: "Detalhes do plano de treino do aluno." },
    ],
  }),
  component: () => <TreinoPlanoPage scope="academia" />,
});
