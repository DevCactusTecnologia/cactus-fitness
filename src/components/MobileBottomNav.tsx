import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Menu as MenuIcon,
  Dumbbell,
  Bell,
  UserCircle2,
  Settings,
  LogOut,
  ChevronRight,
  ClipboardList,
  Trophy,
  CreditCard,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSignOut } from "@/lib/auth";

type Scope = "personal" | "academia" | "aluno";

type Item = {
  icon: React.ElementType;
  label: string;
  to?: string;
  match?: (path: string) => boolean;
  badge?: string;
};

const ITEMS_BY_SCOPE: Record<Scope, Item[]> = {
  personal: [
    { icon: LayoutDashboard, label: "Início", to: "/", match: (p) => p === "/" },
    { icon: Users, label: "Alunos", to: "/dashboard/personal/alunos", match: (p) => p.startsWith("/dashboard/personal/alunos") },
    { icon: Dumbbell, label: "Treinos", to: "/dashboard/personal/treinos", match: (p) => p.startsWith("/dashboard/personal/treinos") },
  ],
  academia: [
    { icon: LayoutDashboard, label: "Painel", to: "/dashboard/academia", match: (p) => p === "/dashboard/academia" },
    { icon: Users, label: "Alunos", to: "/dashboard/academia/alunos", match: (p) => p.startsWith("/dashboard/academia/alunos") },
    { icon: Dumbbell, label: "Treinos", to: "/dashboard/academia/treinos", match: (p) => p.startsWith("/dashboard/academia/treinos") },
  ],
  aluno: [
    { icon: LayoutDashboard, label: "Início", to: "/meu-treino", match: (p) => p === "/meu-treino" },
    { icon: Dumbbell, label: "Treinos", to: "/treinos", match: (p) => p.startsWith("/treinos") || p.startsWith("/meu-treino/") },
    { icon: ClipboardList, label: "Avaliações", to: "/avaliacoes", match: (p) => p.startsWith("/avaliacoes") },
    { icon: Trophy, label: "Desafios", to: "/desafios", match: (p) => p.startsWith("/desafios") },
    { icon: CreditCard, label: "Plano", to: "/meu-plano", match: (p) => p.startsWith("/meu-plano") },
  ],

};

function detectScope(pathname: string): Scope {
  if (pathname.startsWith("/dashboard/academia")) return "academia";
  if (pathname.startsWith("/dashboard/aluno")) return "aluno";
  return "personal";
}

type MenuLink = {
  icon: React.ElementType;
  label: string;
  description: string;
  to: string;
};

const MENU_LINKS: MenuLink[] = [
  { icon: UserCircle2, label: "Perfil", description: "Gerencie suas informações pessoais", to: "/perfil" },
];

export function MobileBottomNav({ scope: scopeProp }: { scope?: Scope } = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const signOut = useSignOut();
  const scope = scopeProp ?? detectScope(pathname);
  const items = ITEMS_BY_SCOPE[scope];

  const linkClass = (active: boolean) =>
    `relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 text-[9px] sm:text-[10px] ${
      active ? "text-primary" : "text-muted-foreground"
    }`;


  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex w-full max-w-full items-stretch justify-around overflow-hidden border-t border-border bg-background/95 px-1.5 py-2 backdrop-blur md:hidden">
      {items.map((i: Item) => {
        const active = i.match ? i.match(pathname) : false;
        return (
          <Link key={i.label} to={i.to!} className={linkClass(active)}>
            <span className="relative">
              <i.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {i.badge && (
                <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {i.badge}
                </span>
              )}
            </span>
            <span className="max-w-full truncate px-0.5">{i.label}</span>
          </Link>
        );
      })}

      <Sheet>
        <SheetTrigger asChild>
          <button type="button" className={linkClass(false)}>
            <MenuIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="max-w-full truncate px-0.5">Menu</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conta
            </SheetTitle>
          </SheetHeader>

          <div className="mt-3 flex flex-col gap-2">
            {MENU_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3 hover:bg-muted"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-muted">
                  <l.icon className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{l.label}</span>
                  <span className="block text-xs text-muted-foreground">{l.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}

            <div className="my-2 h-px bg-border" />

            <button
              type="button"
              onClick={() => signOut()}
              className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3 text-left hover:bg-destructive/10"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-muted">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Sair</span>
                <span className="block text-xs text-muted-foreground">Encerrar sessão</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
