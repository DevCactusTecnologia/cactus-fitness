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

    const [orgRes, membersRes] = await Promise.all([
      supabase.from("organizations").select("id, name, slug, logo_url, created_at").eq("id", orgId).single(),
      supabase
        .from("organization_members")
        .select("user_id, role, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true }),
    ]);
    if (orgRes.error) throw new Error(orgRes.error.message);
    if (membersRes.error) throw new Error(membersRes.error.message);

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

const createPersonalSchema = z.object({
  full_name: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres").max(72),
});

export const createPersonal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createPersonalSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { orgId, myRole } = await resolveOwnerOrg(supabase, userId);
    if (myRole !== "owner") throw new Error("Apenas o dono pode cadastrar personais.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createErr || !created?.user) {
      throw new Error(createErr?.message ?? "Não foi possível criar o usuário.");
    }

    const newUserId = created.user.id;

    // Garante nome no profile (o trigger cria com fallback; aqui reforçamos)
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: newUserId, full_name: data.full_name }, { onConflict: "id" });

    const { error: memErr } = await supabaseAdmin
      .from("organization_members")
      .insert({ organization_id: orgId, user_id: newUserId, role: "personal" });
    if (memErr) {
      // rollback: apaga usuário para não deixar órfão
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(memErr.message);
    }

    return { ok: true, user_id: newUserId };
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
