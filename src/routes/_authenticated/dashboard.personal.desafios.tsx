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
        {/* Header: title left, "+ Novo Desafio" right */}
        <div className="flex items-center justify-between gap-3 px-4 pt-5 sm:px-8 sm:pt-6">
          <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">
            Desafios
          </h1>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Desafio
          </button>
        </div>

        <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
          {/* Tutorial card */}
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

          {/* Empty state — no card border, centered */}
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Trophy className="h-6 w-6" strokeWidth={2} />
            </div>
            <h3 className="mb-1.5 font-display text-base font-bold">Nenhum desafio criado</h3>
            <p className="mb-5 max-w-sm text-xs text-muted-foreground">
              Crie um desafio para motivar seus alunos a competirem entre si!
            </p>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.97]"
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
