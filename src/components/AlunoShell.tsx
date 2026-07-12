import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Home, Dumbbell, TrendingUp, ClipboardList, Trophy, CreditCard } from "lucide-react";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import { NotificationsButton } from "@/components/NotificationsButton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import logoUrl from "@/assets/cactus-logo.png";
import { usePersonalCustomization, isNavItemVisible } from "@/hooks/usePersonalCustomization";

export const ALUNO_NAV = [
  { icon: House, label: "Início", to: "/meu-treino" as const },
  { icon: Dumbbell, label: "Meus Treinos", to: "/treinos" as const },
  { icon: TrendingUp, label: "Meu Progresso", to: "/meu-progresso" as const },
  { icon: ClipboardList, label: "Avaliações", to: "/avaliacoes" as const },
  { icon: Trophy, label: "Desafios", to: "/desafios" as const },
  { icon: CreditCard, label: "Meu Plano", to: "/meu-plano" as const },
];


export function AlunoShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => pathname === to || (to === "/meu-treino" && pathname.startsWith("/meu-treino"));
  const custom = usePersonalCustomization();
  const nav = ALUNO_NAV.filter((n) => isNavItemVisible(n.label, custom.visibleSections));
  const brandLogo = custom.brandLogoUrl;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Rail lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center gap-2 border-r border-border bg-sidebar py-4 md:flex">
        <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={custom.brandTitle || "Logo"}
              className="h-8 w-8 object-contain"
            />
          ) : (
            <span
              aria-label={custom.brandTitle || "CactusFitness"}
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
          )}
        </div>
        {nav.map(({ icon: Icon, label, to }) => {
          const active = isActive(to);
          return (
            <Link
              key={label}
              to={to}
              title={label}
              className={`group relative grid h-11 w-11 place-items-center rounded-[10px] transition ${
                active
                  ? "bg-primary/20 text-primary"
                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
              }`}
            >
              {active && (
                <span className="absolute -left-3.5 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-border opacity-0 group-hover:opacity-100 transition">
                {label}
              </span>
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col items-center gap-2">
          <NotificationsButton />
          <UserAvatarMenu />
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="md:ml-[72px] pb-24 md:pb-0">{children}</div>

      {/* Bottom nav (mobile) — componente compartilhado */}
      <MobileBottomNav scope="aluno" />
    </div>
  );
}
