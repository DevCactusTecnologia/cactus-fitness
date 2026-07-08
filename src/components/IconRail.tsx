import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Flame,
  HeartPulse,
  Trophy,
  CalendarDays,
  Bell,
} from "lucide-react";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import logoUrl from "@/assets/cactus-logo.png";

type NavItem = {
  icon: React.ElementType;
  label: string;
  to: string;
  match: (path: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Início", to: "/", match: (p) => p === "/" },
  { icon: Users, label: "Alunos", to: "/dashboard/personal/alunos", match: (p) => p.startsWith("/dashboard/personal/alunos") },
  { icon: Dumbbell, label: "Treinos", to: "/dashboard/personal/treinos", match: (p) => p.startsWith("/dashboard/personal/treinos") },
  { icon: Flame, label: "Exercícios", to: "/dashboard/personal/exercicios", match: (p) => p.startsWith("/dashboard/personal/exercicios") },
  { icon: HeartPulse, label: "Avaliações", to: "/dashboard/personal/avaliacoes", match: (p) => p.startsWith("/dashboard/personal/avaliacoes") },
  { icon: Trophy, label: "Desafios", to: "/dashboard/personal/desafios", match: (p) => p.startsWith("/dashboard/personal/desafios") },
  { icon: CalendarDays, label: "Agenda", to: "/dashboard/personal/agenda", match: (p) => p.startsWith("/dashboard/personal/agenda") },
];

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

export function IconRail() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center gap-2 border-r border-border bg-sidebar py-4 md:flex">
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
      {NAV_ITEMS.map((n) => (
        <SidebarIconBtn key={n.label} icon={n.icon} to={n.to} label={n.label} active={n.match(pathname)} />
      ))}
      <div className="mt-auto flex flex-col items-center gap-2">
        <SidebarIconBtn icon={Bell} label="Notificações" badge="2" />
        <UserAvatarMenu />
      </div>
    </aside>
  );
}
