import { createFileRoute } from "@tanstack/react-router";
import { TreinoPlanoPage } from "@/components/domain/TreinoPlanoPage";

export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/treinos/plano/$planoId")({
  head: () => ({
    meta: [
      { title: "Plano de Treino · cactusfitness" },
      { name: "description", content: "Detalhes do plano de treino do aluno." },
    ],
  }),
  component: () => <TreinoPlanoPage scope="personal" />,
});
