import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Home, Calendar, GraduationCap, SlidersHorizontal, Plus, Bell, Users,
  Dumbbell, ClipboardCheck, Trophy, Search, ChevronLeft, Play,
  SlidersHorizontal as FilterIcon, Loader2, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/dashboard/personal/exercicios")({
  head: () => ({
    meta: [
      { title: "Exercícios · cactusfitness" },
      { name: "description", content: "Biblioteca completa de exercícios organizados por grupo muscular." },
    ],
  }),
  component: ExerciciosPage,
});

type Group = { id: number; name: string; slug: string; sort_order: number };
type Exercise = { id: number; name: string; group_id: number; is_active: boolean };

/* ---------- Sidebar ---------- */

function SidebarIconBtn({
  icon: Icon, active, badge, to, onClick, variant = "ghost", label,
}: {
  icon: React.ElementType; active?: boolean; badge?: string; to?: string;
  onClick?: () => void; variant?: "ghost" | "primary"; label?: string;
}) {
  const base = "group relative grid h-11 w-11 place-items-center rounded-[10px] transition";
  const styles =
    variant === "primary"
      ? "h-8 w-8 bg-primary text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110"
      : active
      ? "bg-primary/20 text-primary"
      : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground";
  const inner = (
    <>
      {active && <span className="absolute -left-3.5 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
      <Icon className={variant === "primary" ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.75} />
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

function IconRail() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center gap-2 border-r border-border bg-sidebar py-4 md:flex">
      <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl">
        <svg viewBox="0 0 32 32" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8 L10 24 L16 14 L22 24 L28 8" />
        </svg>
      </div>
      <SidebarIconBtn icon={Home} to="/" label="Início" />
      <SidebarIconBtn icon={Users} to="/dashboard/personal/alunos" label="Alunos" />
      <SidebarIconBtn icon={Dumbbell} active label="Exercícios" />
      <SidebarIconBtn icon={ClipboardCheck} to="/" label="Avaliações" />
      <SidebarIconBtn icon={Trophy} to="/" label="Desafios" />
      <SidebarIconBtn icon={Calendar} to="/dashboard/personal/agenda" label="Agenda" />
      <SidebarIconBtn icon={GraduationCap} to="/" label="Tutoriais" />
      <SidebarIconBtn icon={SlidersHorizontal} to="/" label="Configurações" />
      <div className="mt-auto flex flex-col items-center gap-2">
        <SidebarIconBtn icon={Plus} variant="primary" />
        <SidebarIconBtn icon={Bell} badge="3" />
        <div className="relative">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-destructive text-xs font-bold text-white ring-1 ring-border font-display">
            ML
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-sidebar" />
        </div>
      </div>
    </aside>
  );
}

/* ---------- Page ---------- */

const PAGE_SIZE = 20;
const TABS = [
  { id: "all", label: "Todos" },
  { id: "app", label: "Do App" },
  { id: "mine", label: "Meus" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function ExerciciosPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<number | "all">("all");
  const [tab, setTab] = useState<TabId>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const pageSize = 1000;
      const fetchAllExercises = async () => {
        const all: Exercise[] = [];
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await supabase
            .from("exercises")
            .select("id,name,group_id,is_active")
            .order("name")
            .range(from, from + pageSize - 1);
          if (error || !data) break;
          all.push(...(data as Exercise[]));
          if (data.length < pageSize) break;
        }
        return all;
      };
      const [g, e] = await Promise.all([
        supabase.from("exercise_groups").select("*").order("sort_order"),
        fetchAllExercises(),
      ]);
      setGroups((g.data ?? []) as Group[]);
      setExercises(e);
      setLoading(false);
    })();
  }, []);

  const groupById = useMemo(() => {
    const m = new Map<number, Group>();
    groups.forEach((g) => m.set(g.id, g));
    return m;
  }, [groups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((x) => {
      if (tab === "mine") return false; // sem exercícios do usuário ainda
      if (activeGroup !== "all" && x.group_id !== activeGroup) return false;
      if (q && !x.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, query, activeGroup, tab]);

  // Reset paginação ao mudar filtros
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, activeGroup, tab]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0">
      <IconRail />

      <main className="md:ml-[72px]">
        {/* Header sticky */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              className="md:hidden grid h-8 w-8 place-items-center rounded-full text-muted-foreground active:scale-90 transition"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="truncate text-xl font-bold font-display md:text-2xl">Exercícios</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Buscar"
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground transition"
            >
              <Search className="h-4 w-4" />
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110 md:text-sm">
              <Plus className="h-4 w-4" /> Novo
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-4xl mx-auto">

          {/* Aviso amarelo */}
          <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 mb-4 text-xs text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Ainda estamos gravando os vídeos dos exercícios que estão faltando.</span>
          </div>

          {/* Busca */}
          <div className="mb-3 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar exercício..."
              className="w-full bg-transparent placeholder:text-muted-foreground focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                limpar
              </button>
            )}
          </div>

          {/* Tabs + Filtros */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center rounded-full bg-card border border-border p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                    tab === t.id
                      ? "bg-primary text-primary-foreground shadow-[0_0_16px_rgba(76,175,80,0.35)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                showFilters || activeGroup !== "all"
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <FilterIcon className="h-3.5 w-3.5" />
              Filtros
              {activeGroup !== "all" && (
                <span className="ml-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary/25 px-1 text-[10px]">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Chips (filtros) */}
          {showFilters && (
            <div className="mb-4 flex flex-wrap gap-2">
              <GroupChip
                label="Todos"
                active={activeGroup === "all"}
                onClick={() => setActiveGroup("all")}
              />
              {groups.map((g) => (
                <GroupChip
                  key={g.id}
                  label={g.name}
                  active={activeGroup === g.id}
                  onClick={() => setActiveGroup(g.id)}
                />
              ))}
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando exercícios...
            </div>
          ) : (
            <>
              <div className="mb-3 text-xs text-muted-foreground">
                Mostrando {shown.length} de {filtered.length}
              </div>
              <div className="space-y-3 pb-6">
                {shown.map((x) => (
                  <ExerciseRow
                    key={x.id}
                    ex={x}
                    groupName={groupById.get(x.group_id)?.name ?? ""}
                  />
                ))}
                {filtered.length === 0 && (
                  <div className="mt-10 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Nenhum exercício encontrado.
                  </div>
                )}
              </div>
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando mais...
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

function GroupChip({
  label, active, onClick,
}: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function ExerciseRow({ ex, groupName }: { ex: Exercise; groupName: string }) {
  return (
    <button className="w-full bg-card rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-card/70 border border-border/50 hover:border-primary/30 transition text-left">
      <div className="relative w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 to-primary/5" />
        <div className="relative w-5 h-5 rounded-full bg-primary/95 flex items-center justify-center">
          <Play className="h-2.5 w-2.5 text-primary-foreground ml-0.5" fill="currentColor" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium truncate text-sm">{ex.name}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground bg-muted">
            {groupName}
          </span>
        </div>
      </div>
    </button>
  );
}

