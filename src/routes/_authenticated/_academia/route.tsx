import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentSessionRoles } from "@/lib/client-roles";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_academia")({
  beforeLoad: async ({ location }) => {
    const { user, roles } = await getCurrentSessionRoles();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (roles.length === 0) {
      throw redirect({ to: "/onboarding" });
    }
    const allowed = roles.some((r) => r === "owner" || r === "staff");
    if (!allowed) {
      throw redirect({ to: "/", search: { forbidden: 1 } as never });
    }
    // Personal-solo tem role global "owner" mas só é dono de uma org type=personal_solo.
    // O painel da academia exige vínculo com uma organização type=academia.
    const { data: mems } = await supabase
      .from("organization_members")
      .select("role, organizations!inner(type)")
      .eq("user_id", user.id);
    const hasAcademia = (mems ?? []).some((m: any) => m.organizations?.type === "academia");
    if (!hasAcademia) {
      throw redirect({ to: "/" });
    }
    return { activeScope: "academia" as const, roles };
  },
  component: () => <Outlet />,
});
