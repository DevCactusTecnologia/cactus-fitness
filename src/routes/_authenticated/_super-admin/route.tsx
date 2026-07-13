import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentSessionRoles } from "@/lib/client-roles";

export const Route = createFileRoute("/_authenticated/_super-admin")({
  beforeLoad: async ({ location }) => {
    const { user, roles } = await getCurrentSessionRoles();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (!roles.includes("super_admin")) {
      throw redirect({ to: "/", search: { forbidden: 1 } as never });
    }
    return { activeScope: "super_admin" as const };
  },
  component: () => <Outlet />,
});
