import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  alunoId: z.string().uuid(),
  newPassword: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

export const changeAlunoPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { alunoId, newPassword } = data;

    // Verify the aluno belongs to this personal
    const { data: aluno, error: alunoErr } = await context.supabase
      .from("alunos")
      .select("id, personal_id, aluno_user_id, email")
      .eq("id", alunoId)
      .maybeSingle();

    if (alunoErr) throw new Error(alunoErr.message);
    if (!aluno) throw new Error("Aluno não encontrado");
    if (aluno.personal_id !== context.userId) throw new Error("Sem permissão");
    if (!aluno.aluno_user_id) {
      throw new Error("Este aluno ainda não possui uma conta de acesso.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(aluno.aluno_user_id, {
      password: newPassword,
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });
