import { createFileRoute } from "@tanstack/react-router";
import { TreinosPage } from "@/components/domain/TreinosPage";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/treinos/")({
  head: () => ({
    meta: [
      { title: "Treinos · cactusfitness" },
      { name: "description", content: "Modelos prontos de treino e planos reutilizáveis da academia." },
    ],
  }),
  component: () => <TreinosPage scope="academia" />,
});
