import { createFileRoute } from "@tanstack/react-router";
import { AlunoDetailPage } from "@/components/domain/AlunoDetailPage";

export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/alunos/$alunoId")({
  head: () => ({
    meta: [
      { title: "Perfil do Aluno · cactusfitness" },
      { name: "description", content: "Detalhes, contato e histórico do aluno." },
    ],
  }),
  component: () => <AlunoDetailPage scope="personal" />,
});
