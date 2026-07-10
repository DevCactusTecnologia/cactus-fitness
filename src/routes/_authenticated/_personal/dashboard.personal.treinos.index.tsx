import { createFileRoute } from "@tanstack/react-router";
import { TreinosPage } from "@/components/domain/TreinosPage";

export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/treinos/")({
  head: () => ({
    meta: [
      { title: "Treinos · cactusfitness" },
      { name: "description", content: "Modelos prontos de treino e planos reutilizáveis." },
    ],
  }),
  component: () => <TreinosPage scope="personal" />,
});
