import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { WorkoutEditor } from "@/components/workout-editor/WorkoutEditor";

const searchSchema = z.object({
  alunoId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/treinos/novo-plano")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Criar plano · cactusfitness" },
      { name: "description", content: "Monte um plano de treino." },
    ],
  }),
  component: NovoPlanoPage,
});

function NovoPlanoPage() {
  const { alunoId } = Route.useSearch();
  return <WorkoutEditor kind="plan" alunoId={alunoId ?? null} />;
}
