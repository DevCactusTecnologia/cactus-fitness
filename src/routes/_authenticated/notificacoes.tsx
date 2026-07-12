import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { AlunoShell } from "@/components/AlunoShell";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações | Cactus Fitness" },
      { name: "description", content: "Veja suas notificações mais recentes." },
    ],
  }),
  component: NotificacoesPage,
});

function NotificacoesPage() {
  return (
    <AlunoShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
        <header className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              Fique por dentro das novidades e avisos importantes.
            </p>
          </div>
        </header>

        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Nenhuma notificação por aqui</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Quando houver novidades, elas aparecerão nesta tela.
          </p>
        </div>
      </div>
    </AlunoShell>
  );
}
