import { createFileRoute } from "@tanstack/react-router";
import { PersonaisPage } from "@/components/domain/PersonaisPage";

export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/personais/")({
  head: () => ({
    meta: [
      { title: "Personais · cactusfitness" },
      { name: "description", content: "Equipe de personal trainers da sua academia." },
    ],
  }),
  component: () => <PersonaisPage scope="personal" />,
});
