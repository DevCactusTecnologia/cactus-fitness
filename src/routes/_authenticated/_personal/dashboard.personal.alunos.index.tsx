import { createFileRoute } from "@tanstack/react-router";
import { AlunosPage } from "@/components/domain/AlunosPage";

export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/alunos/")({
  validateSearch: (search: Record<string, unknown>): { new?: boolean } => ({
    new: search.new === true || search.new === "1" || search.new === "true",
  }),
  head: () => ({
    meta: [
      { title: "Alunos · cactusfitness" },
      { name: "description", content: "Gerencie seus alunos ativos, convidados e desativados." },
    ],
  }),
  component: () => <AlunosPage scope="personal" />,
});
