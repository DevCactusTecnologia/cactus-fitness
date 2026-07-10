import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/treinos/editar/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/dashboard/personal/treinos/editar/$slug",
      params: { slug: params.slug },
      replace: true,
    });
  },
});
