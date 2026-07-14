import { createFileRoute } from "@tanstack/react-router";
import { RotinasTreinoPage } from "@/components/domain/RotinasTreinoPage";

export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/alunos/rotinas")({
  head: () => ({
    meta: [
      { title: "Rotinas de Treino · cactusfitness" },
      { name: "description", content: "Quem treinou no período e com que frequência." },
    ],
  }),
  component: () => <RotinasTreinoPage scope="personal" />,
});
