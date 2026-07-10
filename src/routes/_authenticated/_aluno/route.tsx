import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyRoles } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/_aluno")({
  beforeLoad: async () => {
    const { roles } = await getMyRoles();
    if (roles.length === 0) {
      throw redirect({ to: "/onboarding" });
    }
    const allowed = roles.some((r) => r === "aluno");
    if (!allowed) {
      throw redirect({ to: "/", search: { forbidden: 1 } as never });
    }
    return { activeScope: "aluno" as const, roles };
  },
  component: () => <Outlet />,
});
