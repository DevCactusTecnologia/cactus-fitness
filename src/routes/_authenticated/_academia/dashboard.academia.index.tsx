import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
