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
import { useCurrentUser, useSignOut, initialsFromName, firstName } from "@/lib/auth";

export function UserAvatarMenu() {
  const { profile } = useCurrentUser();
  const signOut = useSignOut();

  const initials = initialsFromName(profile?.full_name, profile?.email);
  const displayName = firstName(profile?.full_name, profile?.email);
  const email = profile?.email ?? undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu do usuário"
          className="relative grid h-9 w-9 place-items-center rounded-full text-xs font-bold font-display cursor-pointer transition outline-none ring-2 ring-primary/70 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-primary"
          style={{ backgroundColor: "rgb(244, 63, 94)", color: "#fff" }}
        >
          <span className="pointer-events-none">{initials}</span>
          <span aria-hidden className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-sidebar" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={8} className="z-[60] w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-semibold">{displayName}</span>
          {email && <span className="text-xs font-normal text-muted-foreground">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil" className="flex items-center gap-2 cursor-pointer">
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
          onSelect={(e) => { e.preventDefault(); signOut(); }}
          className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
