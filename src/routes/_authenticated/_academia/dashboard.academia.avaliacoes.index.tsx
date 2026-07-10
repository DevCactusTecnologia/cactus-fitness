import { createFileRoute } from "@tanstack/react-router";
import { HeartPulse } from "lucide-react";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/avaliacoes/")({
  head: () => ({
    meta: [
      { title: "Avaliações · Academia · cactusfitness" },
      { name: "description", content: "Avaliações físicas da academia." },
    ],
  }),
  component: AvaliacoesAcademia,
});

function AvaliacoesAcademia() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail scope="academia" />
      <main className="pb-24 md:ml-[72px] md:pb-8">
        <header className="border-b border-border bg-background/80 px-4 py-6 backdrop-blur md:px-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Avaliações
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consolidado de avaliações físicas da academia.
          </p>
        </header>
        <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
            <HeartPulse className="h-8 w-8 text-primary" />
            <p>Em breve: relatório consolidado de avaliações por aluno e por personal.</p>
          </div>
        </div>
      </main>
      <MobileBottomNav scope="academia" />
    </div>
  );
}
