import { createFileRoute } from "@tanstack/react-router";
import { AlunosPage } from "@/components/domain/AlunosPage";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/alunos/")({
  validateSearch: (search: Record<string, unknown>): { new?: boolean } => ({
    new: search.new === true || search.new === "1" || search.new === "true",
  }),
  head: () => ({
    meta: [
      { title: "Alunos · cactusfitness" },
      { name: "description", content: "Gerencie todos os alunos da academia." },
    ],
  }),
  component: () => <AlunosPage scope="academia" />,
});
