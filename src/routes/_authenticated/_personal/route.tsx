import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentSessionRoles } from "@/lib/client-roles";

export const Route = createFileRoute("/_authenticated/_personal")({
  beforeLoad: async ({ location }) => {
    const { user, roles } = await getCurrentSessionRoles();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
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
