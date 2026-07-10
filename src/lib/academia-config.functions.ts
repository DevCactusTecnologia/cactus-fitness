import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrgRole = "owner" | "staff" | "personal";

async function resolveOwnerOrg(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .in("role", ["owner", "staff"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nenhuma academia encontrada.");
  return { orgId: data.organization_id as string, myRole: data.role as OrgRole };
}

export const getAcademiaConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { orgId, myRole } = await resolveOwnerOrg(supabase, userId);

    const [orgRes, membersRes, invitesRes] = await Promise.all([
      supabase.from("organizations").select("id, name, slug, logo_url, created_at").eq("id", orgId).single(),
      supabase
        .from("organization_members")
        .select("user_id, role, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true }),
      supabase
        .from("organization_invites")
        .select("id, email, role, token, expires_at, accepted_at, created_at")
        .eq("organization_id", orgId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false }),
    ]);
    if (orgRes.error) throw new Error(orgRes.error.message);
    if (membersRes.error) throw new Error(membersRes.error.message);
    if (invitesRes.error) throw new Error(invitesRes.error.message);

    const userIds = (membersRes.data ?? []).map((m: any) => m.user_id);
    let profilesById: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      profilesById = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }
    const members = (membersRes.data ?? []).map((m: any) => ({
      ...m,
      profile: profilesById[m.user_id] ?? null,
    }));

    return {
      myRole,
      org: orgRes.data,
      members,
      invites: (invitesRes.data ?? []).filter((i: any) => new Date(i.expires_at) > new Date()),
    };
  });

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const updateAcademiaName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { orgId, myRole } = await resolveOwnerOrg(supabase, userId);
    if (myRole !== "owner") throw new Error("Apenas o dono pode alterar o nome.");
    const { error } = await supabase.from("organizations").update({ name: data.name }).eq("id", orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["staff", "personal"]),
});

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inviteSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { orgId, myRole } = await resolveOwnerOrg(supabase, userId);
    if (myRole !== "owner") throw new Error("Apenas o dono pode enviar convites.");

    const token = randomToken();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error } = await supabase
      .from("organization_invites")
      .insert({
        organization_id: orgId,
        email: data.email,
        role: data.role,
        invited_by: userId,
        token,
        expires_at,
      })
      .select("id, token")
      .single();
    if (error) throw new Error(error.message);
    return { id: invite.id, token: invite.token };
  });

const revokeSchema = z.object({ id: z.string().uuid() });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => revokeSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { orgId, myRole } = await resolveOwnerOrg(supabase, userId);
    if (myRole !== "owner") throw new Error("Apenas o dono pode revogar convites.");
    const { error } = await supabase
      .from("organization_invites")
      .delete()
      .eq("id", data.id)
      .eq("organization_id", orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const removeMemberSchema = z.object({ userId: z.string().uuid() });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => removeMemberSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { orgId, myRole } = await resolveOwnerOrg(supabase, userId);
    if (myRole !== "owner") throw new Error("Apenas o dono pode remover membros.");
    if (data.userId === userId) throw new Error("Você não pode remover a si mesmo.");
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", data.userId)
      .neq("role", "owner");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
