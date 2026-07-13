import { redirect } from "@tanstack/react-router";
import { getCurrentSessionRoles, getPrimaryClientRole, type AppRole } from "@/lib/client-roles";

const ROLE_HOME: Record<AppRole, string> = {
  super_admin: "/super-admin",
  aluno: "/meu-treino",
  owner: "/dashboard/academia",
  staff: "/dashboard/academia",
  personal: "/dashboard/personal",
};

/**
 * Guard used by aluno-facing routes that live outside the `_aluno` pathless
 * layout (e.g. `/meu-treino`, `/meu-plano`, `/meu-progresso`, `/avaliacoes`,
 * `/desafios`). Any authenticated user who does not carry the `aluno` role
 * gets bounced back to their own role home — an owner logging in must never
 * see the student panel, even by pasting the URL.
 */
export async function requireAlunoRole(location: { href: string }) {
  const { user, roles } = await getCurrentSessionRoles();
  if (!user) {
    throw redirect({ to: "/login", search: { redirect: location.href } });
  }
  if (roles.includes("aluno")) return;
  const primary = getPrimaryClientRole(roles);
  if (primary && ROLE_HOME[primary]) {
    throw redirect({ to: ROLE_HOME[primary] });
  }
  throw redirect({ to: "/onboarding" });
}
