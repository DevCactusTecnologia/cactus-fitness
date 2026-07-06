import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Dumbbell, Bell, Menu as MenuIcon, Calendar } from "lucide-react";

type Item = {
  icon: React.ElementType;
  label: string;
  to?: string;
  match?: (path: string) => boolean;
  badge?: string;
};

const ITEMS: Item[] = [
  { icon: Home, label: "Início", to: "/", match: (p) => p === "/" },
  { icon: Users, label: "Alunos", to: "/dashboard/personal/alunos", match: (p) => p.startsWith("/dashboard/personal/alunos") },
  { icon: Dumbbell, label: "Exercícios", to: "/dashboard/personal/exercicios", match: (p) => p.startsWith("/dashboard/personal/exercicios") },
  { icon: Calendar, label: "Agenda", to: "/dashboard/personal/agenda", match: (p) => p.startsWith("/dashboard/personal/agenda") },
  { icon: Bell, label: "Notificações", badge: "2" },
  { icon: MenuIcon, label: "Menu" },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-background/95 px-2 py-2 backdrop-blur md:hidden">
      {ITEMS.map((i) => {
        const active = i.match ? i.match(pathname) : false;
        const cls = `relative flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] ${
          active ? "text-primary" : "text-muted-foreground"
        }`;
        const inner = (
          <>
            <span className="relative">
              <i.icon className="h-5 w-5" strokeWidth={1.75} />
              {i.badge && (
                <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {i.badge}
                </span>
              )}
            </span>
            <span>{i.label}</span>
          </>
        );
        if (i.to) {
          return (
            <Link key={i.label} to={i.to} className={cls}>
              {inner}
            </Link>
          );
        }
        return (
          <button key={i.label} className={cls}>
            {inner}
          </button>
        );
      })}
    </nav>
  );
}
