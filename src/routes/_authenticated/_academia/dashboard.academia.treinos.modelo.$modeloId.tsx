import { createFileRoute } from "@tanstack/react-router";
import { TreinoModeloPage } from "@/components/domain/TreinoModeloPage";

export const Route = createFileRoute(
  "/_authenticated/_academia/dashboard/academia/treinos/modelo/$modeloId",
)({
  head: () => ({
    meta: [
      { title: "Modelo de Treino · cactusfitness" },
      { name: "description", content: "Detalhes do modelo de treino." },
    ],
  }),
  component: () => <TreinoModeloPage scope="academia" />,
});
