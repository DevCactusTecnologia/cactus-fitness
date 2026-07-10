import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_aluno/dashboard/aluno/")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
