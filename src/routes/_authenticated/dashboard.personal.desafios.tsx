import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Play, Trophy, Plus } from "lucide-react";
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
        {/* Top-left page title */}
        <div className="px-4 pt-6 sm:px-8 sm:pt-8">
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Desafios
          </h1>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
          {/* Tutorial card */}
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 text-left transition hover:bg-card sm:gap-4 sm:p-4"
          >
            <div className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-black/60 sm:h-16 sm:w-24">
              <Play className="h-5 w-5 fill-primary text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary sm:text-xs">
                Tutorial em vídeo
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold sm:text-base">
                Como criar um desafio no cactusfitness
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>

          {/* Empty state */}
          <div className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-10 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Trophy className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <h3 className="mb-2 font-display text-lg font-bold">Nenhum desafio criado</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Crie um desafio para motivar seus alunos a competirem entre si!
            </p>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] transition hover:brightness-110 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" /> Criar primeiro desafio
            </button>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
