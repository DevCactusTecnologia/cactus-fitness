import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Home, Calendar, GraduationCap, SlidersHorizontal, Plus, Bell, Users,
  Dumbbell, ClipboardCheck, Trophy, Search, ChevronRight, Image as ImageIcon,
  Video, Loader2,
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

function ExerciciosPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<number | "all">("all");

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

  const counts = useMemo(() => {
    const m = new Map<number, number>();
    exercises.forEach((x) => m.set(x.group_id, (m.get(x.group_id) ?? 0) + 1));
    return m;
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((x) => {
      if (activeGroup !== "all" && x.group_id !== activeGroup) return false;
      if (q && !x.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, query, activeGroup]);

  const byGroup = useMemo(() => {
    const m = new Map<number, Exercise[]>();
    filtered.forEach((x) => {
      const arr = m.get(x.group_id) ?? [];
      arr.push(x);
      m.set(x.group_id, arr);
    });
    return m;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail />

      <main className="pb-24 md:ml-[72px] md:pb-0">
        {/* Header translúcido */}
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-display sm:text-3xl">Exercícios</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {loading ? "Carregando..." : `${exercises.length} exercícios em ${groups.length} grupos`}
              </p>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110">
              <Plus className="h-4 w-4" /> Novo Exercício
            </button>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 md:px-8">
          {/* Busca */}
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar exercício..."
                className="w-full bg-transparent placeholder:text-muted-foreground focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-xs text-muted-foreground hover:text-foreground">
                  limpar
                </button>
              )}
            </div>

            {/* Chips de grupos */}
            <div className="mt-4 flex flex-wrap gap-2">
              <GroupChip
                label="Todos"
                count={exercises.length}
                active={activeGroup === "all"}
                onClick={() => setActiveGroup("all")}
              />
              {groups.map((g) => (
                <GroupChip
                  key={g.id}
                  label={g.name}
                  count={counts.get(g.id) ?? 0}
                  active={activeGroup === g.id}
                  onClick={() => setActiveGroup(g.id)}
                />
              ))}
            </div>

            {/* Lista */}
            {loading ? (
              <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando exercícios...
              </div>
            ) : (
              <div className="mt-6 space-y-8">
                {groups
                  .filter((g) => activeGroup === "all" || g.id === activeGroup)
                  .map((g) => {
                    const items = byGroup.get(g.id) ?? [];
                    if (items.length === 0) return null;
                    return (
                      <section key={g.id}>
                        <div className="mb-3 flex items-baseline justify-between">
                          <h2 className="text-lg font-bold font-display">{g.name}</h2>
                          <span className="text-xs text-muted-foreground">{items.length} exercícios</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {items.map((x) => (
                            <ExerciseCard key={x.id} ex={x} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                {filtered.length === 0 && (
                  <div className="mt-10 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Nenhum exercício encontrado.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

function GroupChip({
  label, count, active, onClick,
}: { label: string; count: number; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
      }`}
    >
      {label}
      <span className={active ? "opacity-90" : "opacity-60"}>({count})</span>
    </button>
  );
}

function ExerciseCard({ ex }: { ex: Exercise }) {
  return (
    <button className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition hover:border-primary/40">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Dumbbell className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{ex.name}</div>
        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" /> foto</span>
          <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" /> vídeo</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
    </button>
  );
}
