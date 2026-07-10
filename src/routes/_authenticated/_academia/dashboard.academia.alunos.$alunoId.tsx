import { createFileRoute, redirect } from "@tanstack/react-router";

// TODO(lote 5): portar o detail de aluno com scope. Por enquanto redireciona
// para a tela existente do personal — mesma view, dados scoping por RLS.
export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/alunos/$alunoId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/dashboard/personal/alunos/$alunoId",
      params: { alunoId: params.alunoId },
      replace: true,
    });
  },
});
