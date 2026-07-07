import { Link } from "@tanstack/react-router";
import { LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  initials?: string;
  name?: string;
  email?: string;
  onLogout?: () => void;
};

export function UserAvatarMenu({
  initials = "ML",
  name = "Meu perfil",
  email,
  onLogout,
}: Props) {
  const handleLogout = () => {
    if (onLogout) return onLogout();
    if (typeof window !== "undefined") {
      localStorage.removeItem("personal_id"); localStorage.removeItem("aluno_id"); localStorage.removeItem("user_role");
      window.location.href = "/login";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu do usuário"
          className="relative grid h-8 w-8 place-items-center rounded-lg bg-destructive text-xs font-bold text-white ring-1 ring-border font-display cursor-pointer transition outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="pointer-events-none">{initials}</span>
          <span aria-hidden className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-sidebar" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={8} className="z-[60] w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-semibold">{name}</span>
          {email && <span className="text-xs font-normal text-muted-foreground">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            <span>Perfil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            <span>Configurações</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleLogout}
          className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
