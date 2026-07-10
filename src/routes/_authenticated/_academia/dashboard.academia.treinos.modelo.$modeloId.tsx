import { createFileRoute, redirect } from "@tanstack/react-router";

// TODO(lote 2b): portar plano/modelo/editar com scope. Por enquanto redireciona
// para as telas existentes do personal — mesma view, dados scoping por RLS.
export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/treinos/modelo/$modeloId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/dashboard/personal/treinos/modelo/$modeloId",
      params: { modeloId: params.modeloId },
      replace: true,
    });
  },
});
