import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Users,
  Link2, Search, LayoutGrid, ChevronRight, ChevronDown, Filter,
  Activity, CalendarDays, ArrowUpDown,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { IconRail } from "@/components/IconRail";
import { initialsFromName } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/dashboard/personal/alunos/")({
  head: () => ({
    meta: [
      { title: "Alunos · cactusfitness" },
      { name: "description", content: "Gerencie seus alunos ativos, convidados e desativados." },
    ],
  }),
  component: AlunosPage,
});


/* ---------- Info card ---------- */

function InfoCard({
  title, desc, icon: Icon,
}: { title: string; desc: string; icon: React.ElementType }) {
  return (
    <button className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition hover:border-border-strong">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:text-foreground" />
    </button>
  );
}

/* ---------- Tab ---------- */

function Tab({ label, count, active }: { label: string; count?: number; active?: boolean }) {
  return (
    <button
      className={`rounded-full px-3.5 py-1.5 text-sm transition ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-1 opacity-70">({count})</span>}
    </button>
  );
}

/* ---------- Page ---------- */

type AlunoRow = {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  updated_at: string;
};

type TabKey = "todos" | "ativos" | "convidados" | "desativados";

function AlunosPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabKey>("todos");
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", objective: "", notes: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createAluno = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { data: userData } = await supabase.auth.getUser();
      const personalId = userData.user?.id;
      if (!personalId) throw new Error("Sessão expirada. Faça login novamente.");
      const { error } = await supabase.from("alunos").insert({
        personal_id: personalId,
        full_name: payload.full_name.trim(),
        email: payload.email.trim() || null,
        phone: payload.phone.trim() || null,
        objective: payload.objective.trim() || null,
        notes: payload.notes.trim() || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      setOpenNew(false);
      setForm({ full_name: "", email: "", phone: "", objective: "", notes: "" });
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.full_name.trim()) {
      setFormError("Informe o nome completo do aluno.");
      return;
    }
    createAluno.mutate(form);
  };


  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ["alunos"],
    queryFn: async (): Promise<AlunoRow[]> => {
      const { data, error } = await supabase
        .from("alunos")
        .select("id, full_name, email, is_active, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AlunoRow[];
    },
  });

  const counts = useMemo(() => ({
    todos: alunos.length,
    ativos: alunos.filter((a) => a.is_active).length,
    convidados: 0,
    desativados: alunos.filter((a) => !a.is_active).length,
  }), [alunos]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return alunos.filter((a) => {
      if (tab === "ativos" && !a.is_active) return false;
      if (tab === "desativados" && a.is_active) return false;
      if (!term) return true;
      return a.full_name.toLowerCase().includes(term) || (a.email ?? "").toLowerCase().includes(term);
    });
  }, [alunos, q, tab]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail />

      <main className="pb-24 md:ml-[72px] md:pb-0">
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-bold tracking-tight font-display sm:text-3xl">Alunos</h1>
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-2 text-sm hover:bg-accent">
                <Link2 className="h-4 w-4" /> <span className="hidden sm:inline">Link de cadastro</span><span className="sm:hidden">Link</span>
              </button>
              <button
                type="button"
                onClick={() => setOpenNew(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110"
              >
                <Plus className="h-4 w-4" /> Novo Aluno
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 md:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="buscar alunos..."
                  className="w-full bg-transparent placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm hover:bg-accent">
                <LayoutGrid className="h-4 w-4" /> Gerenciar Categorias
              </button>
            </div>

            <div className="mt-3">
              <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
                <Filter className="h-3.5 w-3.5" /> Filtrar por categoria
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <InfoCard icon={Activity} title="Rotinas de treino" desc="Veja quem treinou e quantas vezes em qualquer período." />
              <InfoCard icon={CalendarDays} title="Vencimento dos treinos" desc="Veja quando o treino de cada aluno termina e quem precisa renovar." />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1">
                <TabBtn label="Todos" count={counts.todos} active={tab === "todos"} onClick={() => setTab("todos")} />
                <TabBtn label="Ativos" count={counts.ativos} active={tab === "ativos"} onClick={() => setTab("ativos")} />
                <TabBtn label="Convidados" count={counts.convidados} active={tab === "convidados"} onClick={() => setTab("convidados")} />
                <TabBtn label="Desativados" count={counts.desativados} active={tab === "desativados"} onClick={() => setTab("desativados")} />
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent">
                <ArrowUpDown className="h-4 w-4" /> Mais recentes
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              {isLoading ? "Carregando..." : `${filtered.length} ${filtered.length === 1 ? "aluno encontrado" : "alunos encontrados"}`}
            </p>

            <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
              <div className="grid grid-cols-[1.6fr_1fr_1fr_auto] items-center gap-4 border-b border-border px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                <div>Nome</div>
                <div>Status</div>
                <div>Atualizado</div>
                <div className="w-8" />
              </div>

              {isLoading ? (
                <div className="grid place-items-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Nenhum aluno cadastrado ainda</p>
                    <p className="mt-1 text-xs text-muted-foreground">Clique em "Novo Aluno" para começar.</p>
                  </div>
                </div>
              ) : (
                filtered.map((a) => (
                  <Link
                    key={a.id}
                    to="/dashboard/personal/alunos/$alunoId"
                    params={{ alunoId: a.id }}
                    className="grid grid-cols-[1.6fr_1fr_1fr_auto] items-center gap-4 px-5 py-4 transition hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-sm font-bold text-primary font-display ring-2 ring-border">
                        {initialsFromName(a.full_name, a.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{a.full_name}</div>
                        <div className="truncate text-xs text-muted-foreground">{a.email ?? "sem e-mail"}</div>
                      </div>
                    </div>
                    <div>
                      {a.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          Desativado
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(a.updated_at).toLocaleDateString("pt-BR")}
                    </div>
                    <span className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

function TabBtn({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm transition ${
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {label}
      <span className="ml-1 opacity-70">({count})</span>
    </button>
  );
}
