import { createFileRoute } from "@tanstack/react-router";
import { FinanceiroPage } from "@/components/domain/FinanceiroPage";

export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro · cactusfitness" },
      { name: "description", content: "Gerencie planos, links de cobrança, extrato e saques da sua carteira." },
    ],
  }),
  component: () => <FinanceiroPage scope="personal" />,
});
