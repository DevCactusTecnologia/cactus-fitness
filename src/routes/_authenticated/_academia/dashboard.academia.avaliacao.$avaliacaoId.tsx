import { createFileRoute } from "@tanstack/react-router";
import { AvaliacaoPage } from "../_personal/dashboard.personal.avaliacao.$avaliacaoId";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/avaliacao/$avaliacaoId")({
  head: () => ({
    meta: [
      { title: "Avaliação Física · cactusfitness" },
      { name: "description", content: "Formulário completo de avaliação física." },
    ],
  }),
  component: AvaliacaoPage,
});
