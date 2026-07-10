import { createFileRoute } from "@tanstack/react-router";
import { PersonalDetailPage } from "@/components/domain/PersonalDetailPage";

export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/personais/$personalId")({
  head: () => ({
    meta: [
      { title: "Perfil do Personal · cactusfitness" },
      { name: "description", content: "Detalhes do personal, alunos vinculados e informações profissionais." },
    ],
  }),
  component: () => <PersonalDetailPage scope="personal" />,
});
