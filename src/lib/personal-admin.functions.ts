import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  return { orgId: data.organization_id as string, myRole: data.role as string };
}

const updateSchema = z.object({
  personalId: z.string().uuid(),
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).nullable().optional(),
  cref: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(255).optional(),
});

export const updatePersonalProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { orgId, myRole } = await resolveOwnerOrg(supabase, userId);
    if (myRole !== "owner") throw new Error("Apenas o dono pode editar o perfil.");

    const { data: member } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("user_id", data.personalId)
      .maybeSingle();
    if (!member) throw new Error("Personal não encontrado nesta academia.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone ?? null,
        cref: data.cref ?? null,
      })
      .eq("id", data.personalId);
    if (error) throw new Error(error.message);

    if (data.email) {
      const { data: current } = await supabaseAdmin.auth.admin.getUserById(data.personalId);
      if (current.user?.email !== data.email) {
        const { error: emailErr } = await supabaseAdmin.auth.admin.updateUserById(data.personalId, {
          email: data.email,
          email_confirm: true,
        });
        if (emailErr) throw new Error(emailErr.message);
      }
    }
    return { ok: true };
  });

export const getPersonalEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ personalId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { orgId } = await resolveOwnerOrg(supabase, userId);
    const { data: member } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("user_id", data.personalId)
      .maybeSingle();
    if (!member) throw new Error("Personal não encontrado nesta academia.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(data.personalId);
    if (error) throw new Error(error.message);
    return { email: u.user?.email ?? null };
  });

const toggleSchema = z.object({
  personalId: z.string().uuid(),
  is_active: z.boolean(),
});

export const togglePersonalActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => toggleSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { orgId, myRole } = await resolveOwnerOrg(supabase, userId);
    if (myRole !== "owner") throw new Error("Apenas o dono pode alterar o status.");
    if (data.personalId === userId) throw new Error("Você não pode desativar a si mesmo.");

    const { error } = await supabase
      .from("organization_members")
      .update({ is_active: data.is_active })
      .eq("organization_id", orgId)
      .eq("user_id", data.personalId)
      .neq("role", "owner");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const passSchema = z.object({
  personalId: z.string().uuid(),
  newPassword: z.string().min(8, "A senha deve ter no mínimo 8 caracteres").max(72),
});

export const changePersonalPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => passSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { orgId, myRole } = await resolveOwnerOrg(supabase, userId);
    if (myRole !== "owner") throw new Error("Apenas o dono pode alterar a senha.");

    const { data: member } = await supabase
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", orgId)
      .eq("user_id", data.personalId)
      .maybeSingle();
    if (!member) throw new Error("Personal não encontrado.");
    if (member.role === "owner") throw new Error("Não é possível alterar a senha do dono.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.personalId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
