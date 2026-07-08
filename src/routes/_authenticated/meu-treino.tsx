import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Home, MessageSquare, MessageCircle, TrendingUp, Trophy, Users, Utensils, Calendar,
  Folder, ClipboardList, FileText, User as UserIcon, Settings, HeadphonesIcon,
  Droplet, Sun, Camera, Check, Flame, Play, ChevronRight, Zap, Dumbbell, Activity,
  Edit3, StickyNote, Bell, Receipt, MessageSquareText, Menu as MenuIcon, ChevronDown, Shield,
  LayoutDashboard, HeartPulse,
} from "lucide-react";
import { useCurrentUser, useSignOut, firstName, initialsFromName } from "@/lib/auth";
import { colorForId } from "@/lib/avatar-color";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import logoUrl from "@/assets/cactus-logo.png";

export const Route = createFileRoute("/_authenticated/meu-treino")({
  head: () => ({
    meta: [
      { title: "Início · cactusfitness" },
      { name: "description", content: "Seu painel de treinos, progresso e comunidade." },
    ],
  }),
  component: MeuTreinoPage,
});

const RAIL_ITEMS = [
  { icon: LayoutDashboard, label: "Início", active: true },
  { icon: Dumbbell, label: "Treinos" },
  { icon: Trophy, label: "Desafios" },
  { icon: HeartPulse, label: "Avaliações" },
];



const MENU_ITEMS: { icon: any; label: string }[] = [
  { icon: Dumbbell, label: "Treinos" },
  { icon: Activity, label: "Atividades" },
  { icon: TrendingUp, label: "Progresso" },
  { icon: ClipboardList, label: "Avaliações" },
  { icon: Edit3, label: "Formulários" },
  { icon: StickyNote, label: "Anotações" },
  { icon: Users, label: "Comunidade" },
  { icon: Trophy, label: "Desafios" },
  { icon: Utensils, label: "Dieta" },
  { icon: Folder, label: "Arquivos" },
];

const WEEK_DAYS_PT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function MeuTreinoPage() {
  const navigate = useNavigate();
  const { profile, loading } = useCurrentUser();
  const signOut = useSignOut();

  useEffect(() => {
    if (!loading && profile && profile.role === "personal") {
      navigate({ to: "/", replace: true });
    }
  }, [loading, profile, navigate]);

  const name = firstName(profile?.full_name, profile?.email);
  const initials = initialsFromName(profile?.full_name, profile?.email);
  const av = colorForId(profile?.id ?? "aluno");

  const now = new Date();
  const jsDay = now.getDay(); // 0=dom .. 6=sab
  const todayIdx = (jsDay + 6) % 7; // 0=seg .. 6=dom
  // segunda desta semana
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const fullDate = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Rail lateral (desktop) — mesmo estilo do painel do personal */}
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
        {RAIL_ITEMS.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            type="button"
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
          </button>
        ))}
        <div className="mt-auto flex flex-col items-center gap-2">
          <UserAvatarMenu />
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="md:ml-[72px] pt-[76px] pb-24 md:pb-8">
        {/* Header fixo no topo */}
        <header className="fixed top-0 right-0 left-0 md:left-[72px] z-30 bg-background/70 px-4 py-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">

            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold leading-tight">Início</h1>

              <p className="text-sm text-muted-foreground first-letter:uppercase">{fullDate}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-primary hover:bg-accent" aria-label="Hidratação">
                <Droplet className="h-4 w-4" fill="currentColor" />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-foreground hover:bg-accent" aria-label="Tema">
                <Sun className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
          {/* Saudação + Bronze */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full font-display text-lg font-bold ring-2 ring-primary/60 shadow-md"
                style={{ backgroundColor: "rgb(244, 63, 94)", color: "#fff" }}
              >
                {initials}
              </div>
              <button
                className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground"
                aria-label="Trocar foto"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-bold leading-tight">Olá, {name}!</h2>
              <button className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-500">
                <Shield className="h-3.5 w-3.5" fill="currentColor" />
                Bronze
              </button>
            </div>
          </div>

          {/* Calendário da semana */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">calendário da semana</p>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDates.map((d, i) => {
                const isToday = i === todayIdx;
                const isPast = i < todayIdx;
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <span className={`text-[11px] uppercase tracking-wider ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
                      {WEEK_DAYS_PT[i]}
                    </span>
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold transition ${
                        isToday
                          ? "border-primary bg-primary/10 text-primary shadow-[0_0_18px_rgba(215,242,5,0.35)]"
                          : isPast
                          ? "border-primary/60 bg-primary/5 text-primary"
                          : "border-border/60 bg-background/40 text-muted-foreground"
                      }`}
                    >
                      {isPast ? <Check className="h-4 w-4" strokeWidth={3} /> : d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Flame className="h-4 w-4 text-orange-500" fill="currentColor" />
                <span><span className="font-semibold text-foreground">1 semana</span> de ofensiva</span>
              </p>
            </div>
          </section>

          {/* Próximo treino */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">próximo treino</p>
              <p className="text-[11px] text-muted-foreground">seg · sem. 1/4</p>
            </div>
            <h3 className="font-display text-2xl font-bold">Treino A</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              3 exercícios · <span className="text-primary">Fase 1</span>
            </p>
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-base font-bold text-primary-foreground shadow-[0_0_30px_rgba(215,242,5,0.35)] transition hover:brightness-110 active:scale-[0.98]"
            >
              <Play className="h-5 w-5" fill="currentColor" /> Iniciar treino
            </button>
          </section>

          {/* Ranking + Check-in */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <button className="flex w-full items-center justify-between gap-3 p-4 hover:bg-accent/40">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-500">
                  <Shield className="h-5 w-5" fill="currentColor" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">seu ranking</p>
                  <p className="font-display text-lg font-bold text-amber-600 dark:text-amber-500">Bronze</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                ver ranking <ChevronRight className="h-4 w-4" />
              </span>
            </button>
            <button className="flex w-full items-center justify-center gap-2 border-t border-border/60 py-3 text-sm font-semibold text-primary hover:bg-primary/5">
              <Zap className="h-4 w-4" fill="currentColor" /> fazer check-in de hoje (+5 pts)
            </button>
          </section>

          {/* Grid de menu */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MENU_ITEMS.map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/60 hover:bg-accent/40"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <span className="font-display text-base font-semibold">{label}</span>
              </button>
            ))}
          </section>
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="grid grid-cols-5">
          {[
            { icon: Home, label: "Início", active: true },
            { icon: Bell, label: "Notificações", badge: 1 },
            { icon: Receipt, label: "Faturas" },
            { icon: MessageSquareText, label: "Chat" },
            { icon: MenuIcon, label: "Menu" },
          ].map(({ icon: Icon, label, active, badge }) => (
            <button
              key={label}
              type="button"
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              {label}
              {badge && (
                <span className="absolute right-1/2 top-1 translate-x-3 grid h-4 w-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
