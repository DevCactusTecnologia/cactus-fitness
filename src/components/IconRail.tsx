import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Flame,
  HeartPulse,
  Trophy,
  Shield,
  Wallet,
  Building2,
} from "lucide-react";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import logoUrl from "@/assets/cactus-logo.png";

type Scope = "personal" | "academia" | "aluno";

type NavItem = {
  icon: React.ElementType;
  label: string;
  to: string;
  match: (path: string) => boolean;
};

const NAV_BY_SCOPE: Record<Scope, NavItem[]> = {
  personal: [
    { icon: LayoutDashboard, label: "Início", to: "/", match: (p) => p === "/" },
    { icon: Users, label: "Alunos", to: "/dashboard/personal/alunos", match: (p) => p.startsWith("/dashboard/personal/alunos") },
    { icon: Shield, label: "Personais", to: "/dashboard/personal/personais", match: (p) => p.startsWith("/dashboard/personal/personais") },
    { icon: Dumbbell, label: "Treinos", to: "/dashboard/personal/treinos", match: (p) => p.startsWith("/dashboard/personal/treinos") },
    { icon: Flame, label: "Exercícios", to: "/dashboard/personal/exercicios", match: (p) => p.startsWith("/dashboard/personal/exercicios") },
    { icon: HeartPulse, label: "Avaliações", to: "/dashboard/personal/avaliacoes", match: (p) => p.startsWith("/dashboard/personal/avaliacoes") },
    { icon: Trophy, label: "Desafios", to: "/dashboard/personal/desafios", match: (p) => p.startsWith("/dashboard/personal/desafios") },
    { icon: Wallet, label: "Financeiro", to: "/dashboard/personal/financeiro", match: (p) => p.startsWith("/dashboard/personal/financeiro") },
  ],
  academia: [
    { icon: LayoutDashboard, label: "Painel", to: "/dashboard/academia", match: (p) => p === "/dashboard/academia" },
    { icon: Users, label: "Alunos", to: "/dashboard/academia/alunos" as string, match: (p) => p.startsWith("/dashboard/academia/alunos") },
    { icon: Shield, label: "Personais", to: "/dashboard/academia/personais" as string, match: (p) => p.startsWith("/dashboard/academia/personais") },
    { icon: Dumbbell, label: "Treinos", to: "/dashboard/academia/treinos" as string, match: (p) => p.startsWith("/dashboard/academia/treinos") },
    { icon: Wallet, label: "Financeiro", to: "/dashboard/academia/financeiro" as string, match: (p) => p.startsWith("/dashboard/academia/financeiro") },
    { icon: Building2, label: "Configurações", to: "/dashboard/academia/configuracoes" as string, match: (p) => p.startsWith("/dashboard/academia/configuracoes") },
  ],
  aluno: [
    { icon: LayoutDashboard, label: "Início", to: "/dashboard/aluno", match: (p) => p === "/dashboard/aluno" },
    { icon: Dumbbell, label: "Treinos", to: "/meu-treino", match: (p) => p.startsWith("/meu-treino") },
    { icon: HeartPulse, label: "Avaliações", to: "/avaliacoes", match: (p) => p.startsWith("/avaliacoes") },
    { icon: Trophy, label: "Desafios", to: "/desafios", match: (p) => p.startsWith("/desafios") },
  ],
};

function detectScope(pathname: string): Scope {
  if (pathname.startsWith("/dashboard/academia")) return "academia";
  if (pathname.startsWith("/dashboard/aluno")) return "aluno";
  return "personal";
}

function SidebarIconBtn({
  icon: Icon,
  active,
  badge,
  to,
  label,
  onClick,
}: {
  icon: React.ElementType;
  active?: boolean;
  badge?: string;
  to?: string;
  label?: string;
  onClick?: () => void;
}) {
  const base = "group relative grid h-11 w-11 place-items-center rounded-[10px] transition";
  const styles = active
    ? "bg-primary/20 text-primary"
    : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground";
  const inner = (
    <>
      {active && <span className="absolute -left-3.5 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
      <Icon className="h-5 w-5" strokeWidth={1.75} />
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
      {label && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-border opacity-0 group-hover:opacity-100 transition">
          {label}
        </span>
      )}
    </>
  );
  if (to) return <Link to={to} title={label} className={`${base} ${styles}`}>{inner}</Link>;
  return <button onClick={onClick} title={label} className={`${base} ${styles}`}>{inner}</button>;
}

export function IconRail({ scope: scopeProp }: { scope?: Scope } = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const scope = scopeProp ?? detectScope(pathname);
  const items = NAV_BY_SCOPE[scope];
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[72px] flex-col items-center gap-2 border-r border-border bg-sidebar py-4 md:flex">
      <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl">
        <span
          aria-label="CactusFitness"
          role="img"
          className="block h-8 w-8 bg-primary"
          style={{
            WebkitMaskImage: `url(${logoUrl})`,
            maskImage: `url(${logoUrl})`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
      </div>
      {items.map((n) => (
        <SidebarIconBtn key={n.label} icon={n.icon} to={n.to} label={n.label} active={n.match(pathname)} />
      ))}
      <div className="mt-auto flex flex-col items-center gap-2">
        <UserAvatarMenu />
      </div>
    </aside>
  );
}
