import { createFileRoute } from "@tanstack/react-router";
import { WorkoutEditor } from "@/components/workout-editor/WorkoutEditor";

export const Route = createFileRoute("/_authenticated/dashboard/personal/treinos/novo-plano")({
  head: () => ({
    meta: [
      { title: "Criar modelo de plano · cactusfitness" },
      { name: "description", content: "Monte uma rotina semanal agrupando vários treinos em sessões." },
    ],
  }),
  component: () => <WorkoutEditor kind="plan" />,
});
