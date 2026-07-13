import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Lista todos os tenants em que o usuário atual é membro, com role e tipo. */
export const listMyOrgs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("organization_members")
      .select("role, created_at, organizations!inner(id, name, type, created_by)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((m: any) => ({
      id: m.organizations.id as string,
      name: m.organizations.name as string,
      type: (m.organizations.type ?? "academia") as "academia" | "personal_solo",
      role: m.role as string,
      is_owner: m.organizations.created_by === userId,
    }));
  });



/**
 * Personal-solo tenants:
 * - Um "Studio pessoal" é uma organização type='personal_solo' cujo owner é o próprio personal.
 * - Um personal pode ter simultaneamente vínculo com uma academia (role personal/staff)
 *   e um Studio pessoal (role owner do próprio tenant solo).
 * - Ativar é opcional; feito sob demanda quando o personal decide atender particulares.
 * - Desativar só é permitido quando o Studio está totalmente vazio.
 */

async function findMySoloOrg(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, created_at, type")
    .eq("created_by", userId)
    .eq("type", "personal_solo")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: string; name: string; created_at: string; type: string } | null;
}

async function hasAcademiaMembership(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations!inner(type, created_by)")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).some(
    (m: any) => m.organizations?.type === "academia" && m.organizations?.created_by !== userId,
  );
}

async function isSoloEmpty(supabase: any, orgId: string) {
  const [alunos, lanc, tpl, exs] = await Promise.all([
    supabase.from("alunos").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("lancamentos").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_espelho", false),
    supabase.from("workout_templates").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("exercises").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);
  const total =
    (alunos.count ?? 0) + (lanc.count ?? 0) + (tpl.count ?? 0) + (exs.count ?? 0);
  return { empty: total === 0, alunos: alunos.count ?? 0, lancamentos: lanc.count ?? 0, templates: tpl.count ?? 0, exercicios: exs.count ?? 0 };
}

/** Retorna o status atual do Studio pessoal do usuário. */
export const getMySoloStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Só personais podem ter Studio pessoal.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isPersonal = (roles ?? []).some((r: any) => r.role === "personal" || r.role === "owner");
    if (!isPersonal) {
      return { eligible: false as const };
    }

    const solo = await findMySoloOrg(supabase, userId);
    const inAcademia = await hasAcademiaMembership(supabase, userId);

    if (!solo) {
      return {
        eligible: true as const,
        active: false as const,
        in_academia: inAcademia,
      };
    }

    const usage = await isSoloEmpty(supabase, solo.id);
    return {
      eligible: true as const,
      active: true as const,
      in_academia: inAcademia,
      solo: {
        id: solo.id,
        name: solo.name,
        created_at: solo.created_at,
      },
      usage,
      can_deactivate: usage.empty,
    };
  });

/** Ativa (cria) o Studio pessoal para o personal autenticado. Idempotente. */
export const activateSoloStudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(2).max(120).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Valida: precisa ser personal (por role global).
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isPersonal = (roles ?? []).some((r: any) => r.role === "personal" || r.role === "owner");
    if (!isPersonal) throw new Error("Apenas personais podem ativar um Studio pessoal.");

    // Idempotente: se já existe, retorna.
    const existing = await findMySoloOrg(supabase, userId);
    if (existing) return { ok: true, orgId: existing.id, already: true };

    // Nome padrão: "Studio de {full_name}"
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const displayName = (data.name ?? "").trim() || `Studio de ${profile?.full_name ?? "Personal"}`;

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name: displayName,
        created_by: userId,
        type: "personal_solo",
      } as any)
      .select("id")
      .single();
    if (orgErr) throw new Error(orgErr.message);

    const { error: memErr } = await supabase
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: userId, role: "owner" });
    if (memErr) throw new Error(memErr.message);

    return { ok: true, orgId: org.id, already: false };
  });

/** Desativa (remove) o Studio pessoal — apenas se estiver totalmente vazio. */
export const deactivateSoloStudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const solo = await findMySoloOrg(supabase, userId);
    if (!solo) return { ok: true, removed: false };

    const usage = await isSoloEmpty(supabase, solo.id);
    if (!usage.empty) {
      throw new Error(
        `Studio pessoal contém dados (alunos: ${usage.alunos}, lançamentos: ${usage.lancamentos}, treinos: ${usage.templates}, exercícios: ${usage.exercicios}). Remova os dados antes de desativar.`,
      );
    }

    const { error } = await supabase.from("organizations").delete().eq("id", solo.id);
    if (error) throw new Error(error.message);
    return { ok: true, removed: true };
  });

/** Renomeia o Studio pessoal. */
export const renameSoloStudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(2).max(120) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const solo = await findMySoloOrg(supabase, userId);
    if (!solo) throw new Error("Você ainda não tem um Studio pessoal ativo.");
    const { error } = await supabase
      .from("organizations")
      .update({ name: data.name.trim() })
      .eq("id", solo.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
