import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Users,
  Menu as MenuIcon,
  Calendar,
  Dumbbell,
  Bell,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  { icon: Calendar, label: "Agenda", to: "/dashboard/personal/agenda", match: (p) => p.startsWith("/dashboard/personal/agenda") },
];

const MENU_LINKS: { icon: React.ElementType; label: string; to: string }[] = [
  { icon: Dumbbell, label: "Exercícios", to: "/dashboard/personal/exercicios" },
  { icon: Bell, label: "Notificações", to: "/" },
  { icon: User, label: "Perfil", to: "/" },
  { icon: Settings, label: "Configurações", to: "/" },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("personal_id");
      window.location.href = "/";
    }
  };

  const linkClass = (active: boolean) =>
    `relative flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] ${
      active ? "text-primary" : "text-muted-foreground"
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-background/95 px-2 py-2 backdrop-blur md:hidden">
      {ITEMS.map((i) => {
        const active = i.match ? i.match(pathname) : false;
        return (
          <Link key={i.label} to={i.to!} className={linkClass(active)}>
            <span className="relative">
              <i.icon className="h-5 w-5" strokeWidth={1.75} />
              {i.badge && (
                <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {i.badge}
                </span>
              )}
            </span>
            <span>{i.label}</span>
          </Link>
        );
      })}

      <Sheet>
        <SheetTrigger asChild>
          <button type="button" className={linkClass(false)}>
            <MenuIcon className="h-5 w-5" strokeWidth={1.75} />
            <span>Menu</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-1">
            {MENU_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-muted"
              >
                <l.icon className="h-4 w-4" />
                <span>{l.label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
