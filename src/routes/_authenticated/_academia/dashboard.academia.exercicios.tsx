import { createFileRoute, redirect } from "@tanstack/react-router";

// Exercícios ainda não estão no rail da academia (lote 3 apenas Personais).
// Rota gêmea preparada para futuro; por enquanto redireciona ao personal.
export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/exercicios")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/personal/exercicios", replace: true });
  },
});
