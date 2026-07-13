import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "owner" | "staff" | "personal" | "aluno";

const ROLE_PRIORITY: Record<AppRole, number> = {
  super_admin: 0,
  owner: 1,
  staff: 2,
  personal: 3,
  aluno: 4,
};

export async function getCurrentSessionRoles() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const user = sessionData.session?.user ?? null;
  if (sessionError || !user) return { user: null, roles: [] as AppRole[] };

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) throw error;
  return { user, roles: (data ?? []).map((r) => r.role as AppRole) };
}

export function getPrimaryClientRole(roles: AppRole[]) {
  if (roles.length === 0) return null;
  return [...roles].sort((a, b) => (ROLE_PRIORITY[a] ?? 99) - (ROLE_PRIORITY[b] ?? 99))[0];
}
