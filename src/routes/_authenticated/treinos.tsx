import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dumbbell, Check, ChevronRight, FileDown, Clock, Trophy } from "lucide-react";
import { AlunoShell } from "@/components/AlunoShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/treinos")({
  head: () => ({
    meta: [
      { title: "Meus Treinos · cactusfitness" },
      { name: "description", content: "Seus treinos da semana e evolução do plano." },
    ],
  }),
  component: TreinosPage,
});

type WorkoutItem = {
  id: string;
  name: string;
  status: string | null;
  exercises: number;
};

type HistoryItem = {
  id: string;
  workout_name: string;
  date: string;
  sets_count: number;
  duration_min: number | null;
  week_label: string;
};

function TreinosPage() {
  const { profile } = useCurrentUser();
  const [planName, setPlanName] = useState<string>("Meu plano");
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<number>(1);
  const [perWeek, setPerWeek] = useState<number>(0);
  const [currentWeek, setCurrentWeek] = useState<number>(1);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: link } = await supabase
        .from("alunos")
        .select("id")
        .eq("aluno_user_id", profile.id)
        .maybeSingle();
      if (cancelled || !link?.id) { setItems([]); setHistory([]); setLoading(false); return; }
      const { data: sws } = await supabase
        .from("student_workouts")
        .select("id, name, status, template_id, scheduled_for, created_at")
        .eq("aluno_id", link.id)
        .is("archived_at", null)
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const list = sws ?? [];
      if (list.length > 0 && list[0].name) setPlanName(String(list[0].name).split(" - ")[0]);
      const templateIds = Array.from(new Set(list.map((s: any) => s.template_id).filter(Boolean)));
      const countByTpl: Record<string, number> = {};
      if (templateIds.length) {
        const { data: exs } = await supabase
          .from("workout_template_exercises")
          .select("template_id")
          .in("template_id", templateIds);
        (exs ?? []).forEach((e: any) => {
          countByTpl[e.template_id] = (countByTpl[e.template_id] ?? 0) + 1;
        });
      }
      const mapped: WorkoutItem[] = list.map((s: any) => ({
        id: s.id,
        name: s.name ?? "Treino",
        status: s.status ?? null,
        exercises: s.template_id ? (countByTpl[s.template_id] ?? 0) : 0,
      }));
      if (!cancelled) setItems(mapped);

      // Histórico recente: últimas sessões finalizadas
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("id, student_workout_id, started_at, finished_at, duration_seconds, status")
        .eq("aluno_user_id", profile.id)
        .eq("status", "concluido")
        .order("finished_at", { ascending: false, nullsFirst: false })
        .limit(5);
      if (cancelled) return;
      const sessList = sessions ?? [];
      const swMap: Record<string, string> = {};
      list.forEach((s: any) => { swMap[s.id] = s.name ?? "Treino"; });
      const sessIds = sessList.map((s: any) => s.id);
      const setsCount: Record<string, number> = {};
      if (sessIds.length) {
        const { data: logs } = await supabase
          .from("set_logs")
          .select("session_id")
          .in("session_id", sessIds);
        (logs ?? []).forEach((l: any) => {
          setsCount[l.session_id] = (setsCount[l.session_id] ?? 0) + 1;
        });
      }
      const hist: HistoryItem[] = sessList.map((s: any) => {
        const dt = s.finished_at ? new Date(s.finished_at) : new Date(s.started_at);
        const date = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
        return {
          id: s.id,
          workout_name: swMap[s.student_workout_id] ?? "Treino",
          date,
          sets_count: setsCount[s.id] ?? 0,
          duration_min: s.duration_seconds ? Math.round(s.duration_seconds / 60) : null,
          week_label: "Sem. 1",
        };
      });
      if (!cancelled) { setHistory(hist); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const totalDone = items.filter((i) => i.status === "concluido").length;
  const total = items.length;
  const nextIdx = items.findIndex((i) => i.status !== "concluido");
  const progress = total ? Math.round((totalDone / total) * 100) : 0;

  return (
    <AlunoShell>
      <main className="p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Plano */}
          <section className="rounded-xl border border-border bg-surface-1 p-5">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="font-display text-lg font-bold">{planName}</h2>
              <button
                type="button"
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-fg-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <FileDown className="h-4 w-4" /> Exportar PDF
              </button>
            </div>
            <div className="pointer-events-none mb-4 flex select-none flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">Simples</span>
              <span className="inline-flex items-center rounded-md bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">
                {total} treino{total === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center rounded-md bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">
                {totalDone} concluído{totalDone === 1 ? "" : "s"}
              </span>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-fg-muted">Progresso do plano</span>
                <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[0.625rem] font-medium" style={{ color: "rgb(59, 130, 246)" }}>Fase 1</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </section>

          {/* Treinos da semana */}
          <div>
            <h3 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">Treinos da semana</h3>
            {loading ? (
              <div className="rounded-xl border border-border bg-surface-1 p-6 text-center text-sm text-fg-muted">
                Carregando...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface-1 p-6 text-center text-sm text-fg-muted">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Dumbbell className="h-6 w-6" />
                </div>
                Nenhum treino atribuído ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it, idx) => {
                  const done = it.status === "concluido";
                  const isNext = idx === nextIdx;
                  const cardClasses = done
                    ? "border border-green-500/25 bg-surface-1"
                    : isNext
                      ? "border-l-[4px] border-l-primary border-t border-r border-b border-t-primary/20 border-r-primary/20 border-b-primary/20 bg-primary/[0.04]"
                      : "border border-border bg-surface-1 opacity-70";
                  return (
                    <Link
                      key={it.id}
                      to="/meu-treino/treino/$id"
                      params={{ id: it.id }}
                      className={`block w-full rounded-xl p-4 text-left transition-colors active:bg-surface-2/30 ${cardClasses}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex w-5 shrink-0 items-center justify-center">
                          {done ? (
                            <Check className="h-[18px] w-[18px] text-green-500" strokeWidth={3} />
                          ) : (
                            <span className={`h-2.5 w-2.5 rounded-full ${isNext ? "bg-primary" : "bg-surface-3"}`} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className={`truncate text-sm font-bold ${done ? "text-green-400" : "text-foreground"}`}>
                            {it.name}
                          </h4>
                          <div className="mt-1.5 flex items-center gap-3">
                            <span className="flex items-center gap-1 text-xs text-fg-muted/70">
                              <Dumbbell className="h-3.5 w-3.5" />
                              {it.exercises} exercício{it.exercises === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className={`text-xs font-medium ${
                              done ? "text-green-500" : isNext ? "text-primary" : "text-fg-muted/50"
                            }`}>
                              {done ? "Concluído" : isNext ? "Próximo" : "Pendente"}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted/50" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Histórico recente */}
          {history.length > 0 && (
            <div>
              <h3 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">Histórico recente</h3>
              <div className="space-y-2">
                {history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className="flex w-full select-none items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-surface-2/30 active:bg-surface-2/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                      <Trophy className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{h.workout_name}</p>
                        <span className="shrink-0 text-[0.625rem] text-fg-muted/60">{h.week_label}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-fg-muted">
                        <span>{h.date}</span>
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-3 w-3" />
                          {h.sets_count}
                        </span>
                        {h.duration_min != null && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {h.duration_min} min
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted/50" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </AlunoShell>
  );
}
