import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
