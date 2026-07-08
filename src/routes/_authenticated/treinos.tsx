import { createFileRoute } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";
import { AlunoShell } from "@/components/AlunoShell";

export const Route = createFileRoute("/_authenticated/treinos")({
  head: () => ({ meta: [{ title: "Treinos · cactusfitness" }] }),
  component: TreinosPage,
});

function TreinosPage() {
  return (
    <AlunoShell>
      <main className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Dumbbell className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold">Treinos</h1>
          <p className="mt-2 text-sm text-muted-foreground">Em breve você verá aqui todos os seus treinos.</p>
        </div>
      </main>
    </AlunoShell>
  );
}
