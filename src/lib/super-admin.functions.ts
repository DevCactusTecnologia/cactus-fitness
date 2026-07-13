import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado.");
}

export const superAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [orgs, members, alunos, users] = await Promise.all([
      supabaseAdmin.from("organizations").select("id, plan, subscription_status, suspended_at, created_at"),
      supabaseAdmin.from("organization_members").select("id, role"),
      supabaseAdmin.from("alunos").select("id, is_active"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    ]);

    const orgList = orgs.data ?? [];
    const memberList = members.data ?? [];
    const alunoList = alunos.data ?? [];

    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newOrgsThisMonth = orgList.filter((o: any) => new Date(o.created_at) >= startMonth).length;

    const byPlan: Record<string, number> = {};
    orgList.forEach((o: any) => {
      const p = o.plan || "free";
      byPlan[p] = (byPlan[p] ?? 0) + 1;
    });

    return {
      totalOrgs: orgList.length,
      activeOrgs: orgList.filter((o: any) => !o.suspended_at && o.subscription_status === "active").length,
      suspendedOrgs: orgList.filter((o: any) => !!o.suspended_at).length,
      newOrgsThisMonth,
      totalPersonais: memberList.filter((m: any) => m.role === "owner" || m.role === "personal").length,
      totalStaff: memberList.filter((m: any) => m.role === "staff").length,
      totalAlunos: alunoList.length,
      alunosAtivos: alunoList.filter((a: any) => a.is_active).length,
      totalUsers: (users.data as any)?.total ?? 0,
      byPlan,
    };
  });

export const listAllOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orgs, error } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug, plan, subscription_status, max_alunos, suspended_at, created_at, created_by")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const list = orgs ?? [];
    const ownerIds = Array.from(new Set(list.map((o: any) => o.created_by).filter(Boolean)));
    const [profiles, allMembers, allAlunos] = await Promise.all([
      ownerIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name").in("id", ownerIds)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin.from("organization_members").select("organization_id, role"),
      supabaseAdmin.from("alunos").select("organization_id, is_active"),
    ]);
    const profileMap = new Map((profiles.data ?? []).map((p: any) => [p.id, p.full_name]));
    const memberCounts: Record<string, number> = {};
    (allMembers.data ?? []).forEach((m: any) => {
      memberCounts[m.organization_id] = (memberCounts[m.organization_id] ?? 0) + 1;
    });
    const alunoCounts: Record<string, { total: number; ativos: number }> = {};
    (allAlunos.data ?? []).forEach((a: any) => {
      const b = alunoCounts[a.organization_id] ?? { total: 0, ativos: 0 };
      b.total += 1;
      if (a.is_active) b.ativos += 1;
      alunoCounts[a.organization_id] = b;
    });

    return list.map((o: any) => ({
      ...o,
      owner_name: profileMap.get(o.created_by) ?? null,
      member_count: memberCounts[o.id] ?? 0,
      aluno_count: alunoCounts[o.id]?.total ?? 0,
      aluno_ativos: alunoCounts[o.id]?.ativos ?? 0,
    }));
  });

const updateOrgSchema = z.object({
  orgId: z.string().uuid(),
  plan: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
  subscription_status: z.enum(["active", "past_due", "canceled", "trialing"]).optional(),
  max_alunos: z.number().int().nonnegative().nullable().optional(),
  suspended: z.boolean().optional(),
  name: z.string().trim().min(2).max(120).optional(),
});

export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateOrgSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, any> = {};
    if (data.plan !== undefined) patch.plan = data.plan;
    if (data.subscription_status !== undefined) patch.subscription_status = data.subscription_status;
    if (data.max_alunos !== undefined) patch.max_alunos = data.max_alunos;
    if (data.name !== undefined) patch.name = data.name;
    if (data.suspended !== undefined) patch.suspended_at = data.suspended ? new Date().toISOString() : null;

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin.from("organizations").update(patch).eq("id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orgId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("organizations").delete().eq("id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const all: any[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const users = (data as any)?.users ?? [];
      all.push(...users);
      if (users.length < 200) break;
      page++;
      if (page > 25) break;
    }

    const ids = all.map((u) => u.id);
    const [profiles, roles] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("profiles").select("id, full_name").in("id", ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const profileMap = new Map((profiles.data ?? []).map((p: any) => [p.id, p.full_name]));
    const rolesMap: Record<string, string[]> = {};
    (roles.data ?? []).forEach((r: any) => {
      (rolesMap[r.user_id] ??= []).push(r.role);
    });

    return all
      .map((u) => ({
        id: u.id as string,
        email: (u.email as string) ?? null,
        created_at: u.created_at as string,
        last_sign_in_at: (u.last_sign_in_at as string) ?? null,
        email_confirmed_at: (u.email_confirmed_at as string) ?? null,
        full_name: profileMap.get(u.id) ?? null,
        roles: rolesMap[u.id] ?? [],
      }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  });

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["super_admin", "owner", "staff", "personal", "aluno"]),
  grant: z.boolean(),
});

export const toggleUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => roleSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && data.role === "super_admin" && !data.grant) {
      throw new Error("Você não pode remover seu próprio papel de Super Admin.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode excluir sua própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const resetPassSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(8).max(72),
});

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => resetPassSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
