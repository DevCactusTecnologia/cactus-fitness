import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyRoles } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/_academia")({
  beforeLoad: async () => {
    const { roles } = await getMyRoles();
    if (roles.length === 0) {
      throw redirect({ to: "/onboarding" });
    }
    const allowed = roles.some((r) => r === "owner" || r === "staff");
    if (!allowed) {
      throw redirect({ to: "/", search: { forbidden: 1 } as never });
    }
    return { activeScope: "academia" as const, roles };
  },
  component: () => <Outlet />,
});
