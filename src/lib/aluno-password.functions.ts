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

    const { data: aluno, error: alunoErr } = await context.supabase
      .from("alunos")
      .select("id, personal_id, aluno_user_id, email, full_name")
      .eq("id", alunoId)
      .maybeSingle();

    if (alunoErr) throw new Error(alunoErr.message);
    if (!aluno) throw new Error("Aluno não encontrado");
    if (aluno.personal_id !== context.userId) throw new Error("Sem permissão");
    if (!aluno.email || !aluno.email.trim()) {
      throw new Error("Cadastre um e-mail para o aluno antes de definir a senha.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = aluno.email.trim().toLowerCase();

    // Case 1: já tem conta vinculada — apenas atualiza senha (e sincroniza e-mail)
    if (aluno.aluno_user_id) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(aluno.aluno_user_id, {
        password: newPassword,
        email,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
      return { ok: true, created: false };
    }

    // Case 2: não tem conta ainda — verificar se já existe usuário com este email
    let existingUserId: string | null = null;
    // listUsers pagina; buscamos até achar
    for (let page = 1; page <= 20; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const found = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (found) { existingUserId = found.id; break; }
      if (list.users.length < 200) break;
    }

    let authUserId: string;
    if (existingUserId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existingUserId, {
        password: newPassword,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
      authUserId = existingUserId;
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          full_name: aluno.full_name,
          role: "aluno",
        },
      });
      if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar conta");
      authUserId = created.user.id;
    }

    // Garante papel "aluno"
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: authUserId, role: "aluno" }, { onConflict: "user_id,role" });

    // Vincula ao aluno
    const { error: linkErr } = await supabaseAdmin
      .from("alunos")
      .update({ aluno_user_id: authUserId })
      .eq("id", alunoId);
    if (linkErr) throw new Error(linkErr.message);

    return { ok: true, created: !existingUserId };
  });
