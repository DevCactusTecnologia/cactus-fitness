import { createFileRoute } from "@tanstack/react-router";
import { WorkoutEditor } from "@/components/workout-editor/WorkoutEditor";

export const Route = createFileRoute("/_authenticated/dashboard/personal/treinos/novo-template")({
  head: () => ({
    meta: [
      { title: "Criar modelo de treino · cactusfitness" },
      { name: "description", content: "Crie um template de treino único e reutilizável." },
    ],
  }),
  component: () => <WorkoutEditor kind="template" />,
});
