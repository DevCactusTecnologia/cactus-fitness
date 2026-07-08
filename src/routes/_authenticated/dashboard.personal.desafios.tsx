import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Play } from "lucide-react";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/_authenticated/dashboard/personal/desafios")({
  head: () => ({
    meta: [
      { title: "Desafios · cactusfitness" },
      { name: "description", content: "Crie desafios para motivar seus alunos a competirem entre si." },
    ],
  }),
  component: DesafiosPage,
});

function DesafiosPage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />

      <main className="pb-24 md:ml-[72px] md:pb-0">
        <div className="px-4 pt-5 sm:px-8 sm:pt-6">
          <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">
            Desafios
          </h1>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-2.5 text-left transition hover:bg-card sm:p-3"
          >
            <div className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/60 sm:h-14 sm:w-20">
              <Play className="h-4 w-4 fill-primary text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Tutorial em vídeo
              </div>
              <div className="mt-0.5 truncate text-xs font-semibold sm:text-sm">
                Como criar um desafio no cactusfitness
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
