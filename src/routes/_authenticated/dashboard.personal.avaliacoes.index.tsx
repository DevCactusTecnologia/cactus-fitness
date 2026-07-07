import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Play, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { initialsFromName } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard/personal/avaliacoes/")({
  head: () => ({
    meta: [
      { title: "Avaliações Físicas · cactusfitness" },
      { name: "description", content: "Crie e acompanhe as avaliações físicas dos seus alunos." },
    ],
  }),
  component: AvaliacoesPage,
});

type AlunoRow = {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
};

/* palette used for avatar backgrounds (mirrors reference) */
const AVATAR_COLORS = [
  "bg-fuchsia-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-orange-500",
];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function TutorialCard() {
  return (
    <button
      type="button"
      className="group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4 text-left transition hover:border-primary/40 sm:p-5"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
          <Play className="h-6 w-6 fill-current" strokeWidth={0} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-primary">Tutorial em vídeo</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-foreground sm:text-base">
            Como criar uma avaliação física no cactusfitness
          </div>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
    </button>
  );
}

function AvaliacoesPage() {
  const [q, setQ] = useState("");

  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ["alunos", "avaliacoes"],
    queryFn: async (): Promise<AlunoRow[]> => {
      const { data, error } = await supabase
        .from("alunos")
        .select("id, full_name, email, is_active")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AlunoRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return alunos;
    return alunos.filter(
      (a) =>
        a.full_name.toLowerCase().includes(term) ||
        (a.email ?? "").toLowerCase().includes(term),
    );
  }, [alunos, q]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />

      <main className="pb-24 md:ml-[72px] md:pb-8">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-8">
          <h1 className="text-2xl font-bold tracking-tight font-display sm:text-3xl">
            Avaliações Físicas
          </h1>

          <p className="mt-5 text-sm text-muted-foreground">
            Selecione um aluno para ver ou criar avaliações físicas.
          </p>


          <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="buscar alunos..."
              className="w-full bg-transparent placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <ul className="mt-4 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card">
            {isLoading && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">Carregando…</li>
            )}
            {!isLoading && filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum aluno encontrado.
              </li>
            )}
            {filtered.map((a) => {
              const initials = initialsFromName(a.full_name, a.email);
              return (
                <li key={a.id}>
                  <Link
                    to="/dashboard/personal/alunos/$alunoId"
                    params={{ alunoId: a.id }}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-accent/40"
                  >
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${colorFor(a.id)}`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{a.full_name}</div>
                      {a.email && (
                        <div className="truncate text-xs text-muted-foreground">{a.email}</div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
