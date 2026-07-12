import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type AlunoNotification = {
  id: string;
  title: string;
  description: string;
  time: string;
  read?: boolean;
};

// Mock (substituir por dados reais quando integrar backend)
const MOCK_NOTIFICATIONS: AlunoNotification[] = [
  {
    id: "1",
    title: "Treino atualizado 💪",
    description: 'Seu personal atualizou o plano "Plano de marcos 3d". Confira as novidades!',
    time: "há 1 dia",
  },
  {
    id: "2",
    title: "Treino atualizado 💪",
    description: 'Seu personal atualizou o plano "Plano de marcos 3d". Confira as novidades!',
    time: "há 1 dia",
  },
  {
    id: "3",
    title: "Treino atualizado 💪",
    description: 'Seu personal atualizou o plano "Plano de marcos 3d". Confira as novidades!',
    time: "há 1 dia",
  },
  {
    id: "4",
    title: "❤️ Seu personal reagiu",
    description: "Treino: Treino A",
    time: "há 5 dias",
  },
];

export function NotificationsButton() {
  const [items, setItems] = useState(MOCK_NOTIFICATIONS);
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notificações"
          className="group relative grid h-11 w-11 place-items-center rounded-[10px] text-sidebar-foreground/70 transition hover:bg-white/5 hover:text-sidebar-foreground"
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={12}
        className="w-[340px] rounded-2xl border-border bg-popover p-0 shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Notificações</h3>
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Marcar todas como lidas
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className="flex gap-3 border-t border-border/60 px-4 py-3"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.read ? "bg-transparent" : "bg-primary"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {n.description}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    {n.time}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border/60 p-2">
          <Link
            to="/notificacoes"
            className="block rounded-xl py-2 text-center text-sm font-semibold text-primary hover:bg-primary/10"
          >
            Ver todas
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
