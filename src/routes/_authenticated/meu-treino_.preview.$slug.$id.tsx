import { requireAlunoRole } from "@/lib/route-guards";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, X, Play, Clock, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugify, blockIndexToLetter, letterToBlockIndex } from "@/lib/slug";

export const Route = createFileRoute("/_authenticated/meu-treino_/preview/$slug/$id")({
  beforeLoad: ({ location }) => requireAlunoRole(location),
  head: () => ({
    meta: [
      { title: "Preview do treino · cactusfitness" },
      { name: "description", content: "Preview do treino antes de iniciar." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    dia: typeof search.dia === "string" && /^[a-z]$/i.test(search.dia)
      ? search.dia.toLowerCase()
      : undefined,
  }),
  component: PreviewPage,
});

type Row = {
  id: string;
  position: number;
  sets: number | null;
  reps: number | null;
  rest_seconds: number | null;
  session_label: string | null;
  session_position: number | null;
  exercise: { id: number; name: string; muscles_primary: string[] | null } | null;
};

function PreviewPage() {
  const { id, slug } = Route.useParams();
  const { dia } = Route.useSearch();
  const bloco = letterToBlockIndex(dia);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workoutName, setWorkoutName] = useState("Treino");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: sw } = await supabase
        .from("student_workouts")
        .select("name, template_id")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;

      let displayName = sw?.name ?? "Treino";
      let list: Row[] = [];

      if (sw?.template_id) {
        const { data: exs } = await supabase
          .from("workout_template_exercises")
          .select("id, position, sets, reps, rest_seconds, session_label, session_position, exercise:exercises(id, name, muscles_primary)")
          .eq("template_id", sw.template_id)
          .order("position", { ascending: true });
        list = ((exs ?? []) as any as Row[]);
        if (bloco != null) {
          list = list.filter((r) => (r.session_position ?? 0) === bloco);
          const label = list.find((r) => r.session_label)?.session_label;
          if (label) displayName = label;
        }
      }

      if (!cancelled) {
        setWorkoutName(displayName);
        setRows(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, bloco]);

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-background/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/treinos" })}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-2"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted">Preview do treino</p>
            <h1 className="truncate font-display text-base font-bold">{workoutName}</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/treinos" })}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-2"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-sm text-fg-muted">{rows.length} exercício{rows.length === 1 ? "" : "s"}</p>
          {loading ? (
            <div className="p-6 text-center text-sm text-fg-muted">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-fg-muted">Nenhum exercício.</div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r, i) => {
                const muscle = r.exercise?.muscles_primary?.[0] ?? "Geral";
                return (
                  <li key={r.id} className="flex items-start gap-4 py-4">
                    <span className="w-6 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-fg-muted/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold">{r.exercise?.name ?? "Exercício"}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-muted/60">
                        <span className="inline-flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif' }}>
                          <span className="h-1.5 w-1.5 rounded-full bg-[#c8e552]" />
                          {muscle}
                        </span>
                        <span className="font-medium">
                          {r.sets ?? 0}× {r.reps ?? "-"} reps
                        </span>
                        {r.rest_seconds != null && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {r.rest_seconds}s
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      {!loading && rows.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-4 backdrop-blur">
          <div className="pointer-events-auto mx-auto max-w-3xl">
            <Link
              to="/meu-treino/treino/$slug/$id"
              params={{ slug: slugify(workoutName), id }}
              search={(() => { const d = blockIndexToLetter(bloco); return d ? { dia: d } : {}; })()}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98]"
            >
              <Play className="h-5 w-5" fill="currentColor" />
              Iniciar {workoutName}
            </Link>
          </div>
        </div>
      )}

      {/* prevent unused-import warnings */}
      <span className="hidden"><Dumbbell /></span>
    </div>
  );
}
