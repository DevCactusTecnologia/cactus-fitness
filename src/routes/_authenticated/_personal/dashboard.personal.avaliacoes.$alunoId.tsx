import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, ArrowLeft, User as UserIcon, Send, Loader2, Calendar as CalendarIcon, Trash2, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/personal/avaliacoes/$alunoId")({
  head: () => ({
    meta: [
      { title: "Avaliações Físicas · cactusfitness" },
      { name: "description", content: "Avaliações físicas do aluno." },
    ],
  }),
  component: AvaliacoesAlunoPage,
});

type Aluno = { id: string; full_name: string; email: string | null };
type Avaliacao = {
  id: string;
  assessment_date: string;
  composicao_corporal: any;
  perimetros: any;
  vo2max: any;
  neuromotora: any;
  dinamometria: any;
  teste_rm: any;
  banco_wells: any;
  postural: any;
  fotos: any;
};

const SECTIONS: { key: keyof Avaliacao; label: string }[] = [
  { key: "composicao_corporal", label: "Composição" },
  { key: "perimetros", label: "Perimetros" },
  { key: "vo2max", label: "VO2" },
  { key: "neuromotora", label: "Neuro" },
  { key: "dinamometria", label: "Força" },
  { key: "teste_rm", label: "RM" },
  { key: "banco_wells", label: "Wells" },
  { key: "postural", label: "Postural" },
];

function hasData(v: any) {
  if (!v) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return Boolean(v);
}

function fotoCount(v: any) {
  if (!v || typeof v !== "object") return 0;
  return Object.values(v).filter((x) => typeof x === "string" && x).length;
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${String(day).padStart(2, "0")} de ${months[m - 1]} de ${y}`;
}

function AvaliacoesAlunoPage() {
  const { alunoId } = Route.useParams();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: aluno, isLoading } = useQuery({
    queryKey: ["aluno", alunoId, "avaliacoes-header"],
    queryFn: async (): Promise<Aluno> => {
      const { data, error } = await supabase
        .from("alunos")
        .select("id, full_name, email")
        .eq("id", alunoId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Aluno;
    },
  });

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ["avaliacoes", alunoId],
    queryFn: async (): Promise<Avaliacao[]> => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select("id, assessment_date, composicao_corporal, perimetros, vo2max, neuromotora, dinamometria, teste_rm, banco_wells, postural, fotos")
        .eq("aluno_id", alunoId)
        .order("assessment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Avaliacao[];
    },
  });

  const deleteAvaliacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("avaliacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avaliacoes", alunoId] });
      toast.success("Avaliação excluída");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir"),
  });

  if (isLoading || !aluno) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />
      <main className="pb-24 md:ml-[72px] md:pb-0">
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to="/dashboard/personal/avaliacoes"
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 hover:bg-accent"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="truncate font-display text-xl font-bold tracking-tight sm:text-2xl">
                Avaliações Físicas
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110"
            >
              <Plus className="h-4 w-4" /> Nova
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-4xl space-y-3 p-4 md:p-6">
          {avaliacoes.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <ClipboardList className="mx-auto mb-4 h-12 w-12 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="mb-2 text-lg font-semibold">Nenhuma avaliação física</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Crie a primeira avaliação física para acompanhar a evolução do aluno.
              </p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.97]"
              >
                <Plus className="h-4 w-4" /> Criar Avaliação
              </button>
            </div>
          ) : (
            avaliacoes.map((av) => {
              const fotos = fotoCount(av.fotos);
              return (
                <div
                  key={av.id}
                  className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 px-5 py-4 transition hover:border-border hover:bg-card/60"
                >
                  <Link
                    to="/dashboard/personal/avaliacao/$avaliacaoId"
                    params={{ avaliacaoId: av.id }}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex items-center gap-2 text-base font-semibold">
                      <CalendarIcon className="h-4 w-4 text-primary" strokeWidth={2} />
                      {formatDate(av.assessment_date)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      {SECTIONS.map((s) => {
                        const filled = hasData(av[s.key]);
                        return (
                          <span
                            key={s.key}
                            className={`inline-flex items-center gap-1.5 ${filled ? "text-primary" : "text-muted-foreground/60"}`}
                          >
                            {filled ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground/40" strokeWidth={1.75} />
                            )}
                            {s.label}
                          </span>
                        );
                      })}
                      {fotos > 0 && (
                        <span className="text-primary">{fotos} foto{fotos > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Excluir esta avaliação?")) deleteAvaliacao.mutate(av.id);
                    }}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 text-destructive hover:bg-destructive/10"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Link
                    to="/dashboard/personal/avaliacao/$avaliacaoId"
                    params={{ avaliacaoId: av.id }}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
                    aria-label="Abrir"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </main>
      <MobileBottomNav />

      <NovaAvaliacaoDialog open={open} onOpenChange={setOpen} alunoNome={aluno.full_name} alunoId={aluno.id} />
    </div>
  );
}

function NovaAvaliacaoDialog({
  open, onOpenChange, alunoNome, alunoId,
}: { open: boolean; onOpenChange: (o: boolean) => void; alunoNome: string; alunoId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<"personal" | "aluno">("personal");
  const [date, setDate] = useState(today);
  
  const qc = useQueryClient();

  const createAvaliacao = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const personalId = userData.user?.id;
      if (!personalId) throw new Error("Sessão expirada.");
      const { data, error } = await supabase
        .from("avaliacoes")
        .insert({
          personal_id: personalId,
          aluno_id: alunoId,
          assessment_date: date,
          mode,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["avaliacoes", alunoId] });
      toast.success("Avaliação criada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="font-display text-lg font-bold">Nova avaliação física</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Quem vai preencher as medidas desta avaliação de {alunoNome.split(" ")[0]}?
            </p>
          </div>
        </div>

        <div className="space-y-3 px-5 pt-5">
          <ModeOption
            active={mode === "personal"}
            onClick={() => setMode("personal")}
            icon={UserIcon}
            title="eu vou preencher"
            desc="Você abre a avaliação completa (dobras, perímetros, VO2, postura, fotos)."
          />
          <ModeOption
            active={mode === "aluno"}
            onClick={() => setMode("aluno")}
            icon={Send}
            title="pedir pro aluno preencher"
            desc="O aluno recebe uma notificação no app com vídeos tutoriais ensinando a medir peso, altura, perímetros e tirar as fotos."
          />
        </div>

        <div className="space-y-2 px-5 pt-5">
          <Label htmlFor="av_date" className="text-xs">Data da avaliação</Label>
          <Input id="av_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/60 p-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => createAvaliacao.mutate()}
            disabled={createAvaliacao.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {createAvaliacao.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "aluno" ? "Enviar ao aluno" : "Criar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeOption({
  active, onClick, icon: Icon, title, desc,
}: { active: boolean; onClick: () => void; icon: React.ElementType; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
        active ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:border-border-strong"
      }`}
    >
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}
