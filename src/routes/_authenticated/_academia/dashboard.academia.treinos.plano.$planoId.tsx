import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/treinos/plano/$planoId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/dashboard/personal/treinos/plano/$planoId",
      params: { planoId: params.planoId },
      replace: true,
    });
  },
});
