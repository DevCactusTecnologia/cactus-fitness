import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * A "personal solo" owns only his own org (organization.created_by = self).
 * A personal "vinculado a academia" is a member of an org he did NOT create,
 * OR has role 'personal'/'staff' in an org owned by someone else.
 */
export function useIsPersonalInAcademia() {
  return useQuery({
    queryKey: ["is-personal-in-academia"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return false;
      const { data: mems } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations!inner(created_by)")
        .eq("user_id", uid);
      if (!mems?.length) return false;
      return mems.some((m: any) => m.organizations?.created_by !== uid);
    },
    staleTime: 60_000,
  });
}
