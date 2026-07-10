import { useRouterState } from "@tanstack/react-router";

export type Scope = "personal" | "academia" | "aluno";

export function detectScope(pathname: string): Scope {
  if (pathname.startsWith("/dashboard/academia")) return "academia";
  if (pathname.startsWith("/dashboard/aluno")) return "aluno";
  return "personal";
}

export function useScope(): Scope {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return detectScope(pathname);
}
