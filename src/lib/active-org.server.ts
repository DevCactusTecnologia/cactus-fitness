import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Server-side resolver for the "active org" of the authenticated user.
 * Priority:
 *   1. Header `X-Active-Org` sent by the client, IF the user is a member
 *      of that org with an allowed role.
 *   2. Otherwise, the oldest membership matching the allowed roles.
 *
 * `allowedRoles` filters what counts as a valid scope. For example, the
 * academia config screen requires ['owner','staff']; the personal panel
 * accepts ['owner','staff','personal'].
 */
export async function resolveActiveOrg(
  supabase: any,
  userId: string,
  opts?: { allowedRoles?: string[]; requiredType?: "academia" | "personal_solo" },
) {
  const allowed = opts?.allowedRoles ?? ["owner", "staff", "personal"];

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, created_at, organizations!inner(id, type)")
    .eq("user_id", userId)
    .in("role", allowed)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const list = (memberships ?? []) as Array<{
    organization_id: string;
    role: string;
    organizations: { id: string; type: string };
  }>;
  if (!list.length) throw new Error("Nenhuma organização encontrada para este usuário.");

  const filtered = opts?.requiredType
    ? list.filter((m) => m.organizations?.type === opts.requiredType)
    : list;
  if (!filtered.length) {
    throw new Error(
      `Nenhuma organização do tipo ${opts?.requiredType} encontrada para este usuário.`,
    );
  }

  let headerOrg: string | null = null;
  try {
    headerOrg = getRequestHeader("x-active-org") ?? null;
  } catch {
    headerOrg = null;
  }

  if (headerOrg) {
    const match = filtered.find((m) => m.organization_id === headerOrg);
    if (match) {
      return {
        orgId: match.organization_id,
        myRole: match.role,
        orgType: match.organizations?.type ?? "academia",
        source: "header" as const,
      };
    }
  }

  const first = filtered[0];
  return {
    orgId: first.organization_id,
    myRole: first.role,
    orgType: first.organizations?.type ?? "academia",
    source: "default" as const,
  };
}
