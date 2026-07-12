import { requireAlunoRole } from "@/lib/route-guards";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { AlunoShell } from "@/components/AlunoShell";

export const Route = createFileRoute("/_authenticated/desafios")({
  beforeLoad: ({ location }) => requireAlunoRole(location),
  head: () => ({ meta: [{ title: "Desafios · cactusfitness" }] }),
  component: DesafiosPage,
});

function DesafiosPage() {
  return (
    <AlunoShell>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl md:left-[72px]">
        <div className="flex items-center px-4 py-4 md:px-6">
          <h1 className="font-display text-xl font-bold">Desafios</h1>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4 pt-[76px] md:p-6 md:pt-[84px]">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Trophy className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-bold">Desafios</h2>
          <p className="mt-2 text-sm text-muted-foreground">Em breve você poderá participar dos desafios do seu personal.</p>
        </div>
      </main>
    </AlunoShell>
  );
}

