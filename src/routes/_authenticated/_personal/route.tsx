import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyRoles } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/_personal")({
  beforeLoad: async () => {
    const { roles } = await getMyRoles();
    if (roles.length === 0) {
      throw redirect({ to: "/onboarding" });
    }
    const allowed = roles.some((r) => r === "personal");
    if (!allowed) {
      // Dono/staff da academia caem no dashboard da academia
      if (roles.some((r) => r === "owner" || r === "staff")) {
        throw redirect({ to: "/dashboard/academia" });
      }
      throw redirect({ to: "/", search: { forbidden: 1 } as never });
    }
    return { activeScope: "personal" as const, roles };
  },
  component: () => <Outlet />,
});
