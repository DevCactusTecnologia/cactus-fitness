import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight } from "lucide-react";
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

      <main className="pb-24 md:ml-[72px] md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md shadow-lg">
            <div className="flex min-h-[70vh] flex-col md:flex-row">
              {/* Left translucent title bar */}
              <div className="shrink-0 border-b border-border/60 bg-black/40 px-5 py-5 md:w-[220px] md:border-b-0 md:border-r md:px-6 md:py-8 lg:w-[260px]">
                <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl md:text-2xl md:leading-tight">
                  Avaliações
                  <br className="hidden md:block" />{" "}
                  Físicas
                </h1>
              </div>

              {/* Right content */}
              <div className="flex min-w-0 flex-1 flex-col px-4 py-5 sm:px-6 sm:py-6">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Selecione um aluno para ver ou criar avaliações físicas.
                </p>

                <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-sm">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="buscar alunos..."
                    className="w-full min-w-0 bg-transparent placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>

                <ul className="mt-3 flex-1 space-y-1 overflow-y-auto">
                  {isLoading && (
                    <li className="px-2 py-4 text-center text-xs text-muted-foreground">
                      Carregando…
                    </li>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <li className="px-2 py-6 text-center text-xs text-muted-foreground">
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
                          className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-accent/40"
                        >
                          <div
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${colorFor(a.id)}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">
                              {a.full_name}
                            </div>
                            {a.email && (
                              <div className="truncate text-xs text-muted-foreground">
                                {a.email}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
