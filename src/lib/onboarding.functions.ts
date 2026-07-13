import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const onboardingSchema = z
  .object({
    role: z.enum(["owner", "personal", "aluno"]),
    fullName: z.string().trim().min(2).max(100),
    academyName: z.string().trim().min(2).max(120).optional(),
  })
  .refine(
    (v) => v.role !== "owner" || (v.academyName && v.academyName.length >= 2),
    { message: "Informe o nome da academia.", path: ["academyName"] },
  );

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => onboardingSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Atualiza nome no perfil
    await supabase
      .from("profiles")
      .update({ full_name: data.fullName })
      .eq("id", userId);

    // Garante role base (personal/aluno). Para owner, o trigger sync_org_member_role
    // insere a role 'owner' automaticamente ao adicionar como membro da org.
    if (data.role !== "owner") {
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: data.role });
      if (roleErr && !roleErr.message.includes("duplicate")) {
        throw new Error(roleErr.message);
      }
    }

    // Cria organização para owner (academia) OU personal (studio solo).
    // Personal solo é um tenant como qualquer academia: tem plano, limite,
    // assinatura e aparece no Super Admin (organizations.type = 'personal_solo').
    if (data.role === "owner" || data.role === "personal") {
      const { data: existing } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const isSolo = data.role === "personal";
        const displayName = data.fullName.trim();
        const name = isSolo
          ? `Studio de ${displayName}`
          : data.academyName!.trim();

        const { data: org, error: orgErr } = await supabase
          .from("organizations")
          .insert({
            name,
            created_by: userId,
            type: isSolo ? "personal_solo" : "academia",
          } as any)
          .select("id")
          .single();
        if (orgErr) throw new Error(orgErr.message);

        const { error: memErr } = await supabase
          .from("organization_members")
          .insert({
            organization_id: org.id,
            user_id: userId,
            role: "owner",
          });
        if (memErr) throw new Error(memErr.message);
      }
    }

    return { ok: true, role: data.role };
  });
