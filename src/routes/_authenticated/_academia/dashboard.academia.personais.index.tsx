import { createFileRoute } from "@tanstack/react-router";
import { PersonaisPage } from "@/components/domain/PersonaisPage";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/personais/")({
  head: () => ({
    meta: [
      { title: "Personais · cactusfitness" },
      { name: "description", content: "Equipe de personal trainers da academia." },
    ],
  }),
  component: () => <PersonaisPage scope="academia" />,
});
