import { createFileRoute } from "@tanstack/react-router";
import { ExerciciosPage } from "@/components/domain/ExerciciosPage";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/exercicios")({
  head: () => ({
    meta: [
      { title: "Exercícios · cactusfitness" },
      { name: "description", content: "Biblioteca completa de exercícios organizados por grupo muscular." },
    ],
  }),
  component: () => <ExerciciosPage scope="academia" />,
});
