import { createFileRoute } from "@tanstack/react-router";
import { FinanceiroPage } from "@/components/domain/FinanceiroPage";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro · cactusfitness" },
      { name: "description", content: "Painel financeiro da academia: saldo, receitas, despesas." },
    ],
  }),
  component: () => <FinanceiroPage scope="academia" />,
});
