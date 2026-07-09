import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const onboardingSchema = z.object({
  role: z.enum(["personal", "aluno"]),
  fullName: z.string().trim().min(2).max(100),
  academyName: z.string().trim().min(2).max(120).optional(),
});

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

    // Garante role
    const { error: roleErr } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (roleErr && !roleErr.message.includes("duplicate")) {
      throw new Error(roleErr.message);
    }

    // Se personal (ou dono), cria a org solo dele
    if (data.role === "personal") {
      // Já existe uma org onde ele é owner?
      const { data: existing } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const name =
          data.academyName?.trim() ||
          `Academia de ${data.fullName.split(" ")[0]}`;
        const { data: org, error: orgErr } = await supabase
          .from("organizations")
          .insert({ name, created_by: userId })
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
