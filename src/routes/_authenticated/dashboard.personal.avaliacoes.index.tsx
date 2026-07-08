import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Search, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { initialsFromName } from "@/lib/auth";
import { colorForId } from "@/lib/avatar-color";

type AlunoRow = {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
};

const alunosAvaliacoesQuery = queryOptions({
  queryKey: ["alunos", "avaliacoes"],
  queryFn: async (): Promise<AlunoRow[]> => {
    const { data, error } = await supabase
      .from("alunos")
      .select("id, full_name, email, is_active")
      .order("full_name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as AlunoRow[];
  },
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/dashboard/personal/avaliacoes/")({
  head: () => ({
    meta: [
      { title: "Avaliações Físicas · cactusfitness" },
      { name: "description", content: "Crie e acompanhe as avaliações físicas dos seus alunos." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(alunosAvaliacoesQuery),
  component: AvaliacoesPage,
});

function AvaliacoesPage() {
  const [q, setQ] = useState("");
  const { data: alunos } = useSuspenseQuery(alunosAvaliacoesQuery);


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

      <main className="pb-24 md:ml-[72px] md:pb-0">
        {/* Top-left page title */}
        <div className="px-4 pt-6 sm:px-8 sm:pt-8">
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Avaliações Físicas
          </h1>
        </div>

        {/* Centered content column */}
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">

          {/* Instruction */}
          <p className="mt-6 text-sm text-muted-foreground">
            Selecione um aluno para ver ou criar avaliações físicas.
          </p>

          {/* Search */}
          <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2.5 text-sm">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="buscar alunos..."
              className="w-full min-w-0 bg-transparent placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Student list */}
          <ul className="mt-4 space-y-2">
            {isLoading && (
              <li className="rounded-2xl border border-border/60 bg-card/40 px-4 py-6 text-center text-xs text-muted-foreground">
                Carregando…
              </li>
            )}
            {!isLoading && filtered.length === 0 && (
              <li className="rounded-2xl border border-border/60 bg-card/40 px-4 py-6 text-center text-xs text-muted-foreground">
                Nenhum aluno encontrado.
              </li>
            )}
            {filtered.map((a) => {
              const initials = initialsFromName(a.full_name, a.email);
              return (
                <li key={a.id}>
                  <Link
                    to="/dashboard/personal/avaliacoes/$alunoId"
                    params={{ alunoId: a.id }}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-3 py-3 transition hover:bg-card sm:px-4"
                  >
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold font-display ring-2 ring-primary"
                      style={{ backgroundColor: colorForId(a.id).bg, color: colorForId(a.id).fg }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{a.full_name}</div>
                      {a.email && (
                        <div className="truncate text-xs text-muted-foreground">{a.email}</div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
