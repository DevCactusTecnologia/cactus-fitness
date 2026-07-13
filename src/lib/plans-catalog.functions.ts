import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlanRow = {
  slug: string;
  name: string;
  tagline: string;
  price_cents: number;
  max_alunos: number | null;
  features: string[];
  icon: string;
  accent: string;
  is_active: boolean;
  sort_order: number;
};

const PlanInput = z.object({
  slug: z.string().min(2).max(40).regex(/^[a-z0-9_-]+$/, "Use apenas letras minúsculas, números, _ ou -"),
  name: z.string().min(1).max(60),
  tagline: z.string().max(120).default(""),
  price_cents: z.number().int().min(0),
  max_alunos: z.number().int().min(1).nullable(),
  features: z.array(z.string().max(120)).max(20).default([]),
  icon: z.enum(["sparkles", "zap", "crown", "shield"]).default("sparkles"),
  accent: z.enum(["muted", "sky", "primary", "amber", "emerald", "rose"]).default("muted"),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const listPlansCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as PlanRow[];
  });

export const createPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => PlanInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: isSuperAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isSuperAdmin) throw new Error("Acesso negado.");

    const { data: row, error } = await context.supabase.from("plans").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row as PlanRow;
  });

export const updatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => PlanInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: isSuperAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isSuperAdmin) throw new Error("Acesso negado.");

    const { slug, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("plans")
      .update(rest)
      .eq("slug", slug)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as PlanRow;
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ slug: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: isSuperAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isSuperAdmin) throw new Error("Acesso negado.");

    const { count, error: cErr } = await context.supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("plan", data.slug);
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) {
      throw new Error(`Não é possível excluir: ${count} organização(ões) usam este plano.`);
    }

    const { error } = await context.supabase.from("plans").delete().eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
