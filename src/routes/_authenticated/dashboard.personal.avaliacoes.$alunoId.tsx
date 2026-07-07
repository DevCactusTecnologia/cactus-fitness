import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ClipboardList, Plus, ArrowLeft, User as UserIcon, Send, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";

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

function AvaliacoesAlunoPage() {
  const { alunoId } = Route.useParams();
  const [open, setOpen] = useState(false);

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

        <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
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
        </div>
      </main>
      <MobileBottomNav />

      <NovaAvaliacaoDialog open={open} onOpenChange={setOpen} alunoNome={aluno.full_name} />
    </div>
  );
}

function NovaAvaliacaoDialog({
  open, onOpenChange, alunoNome, alunoId,
}: { open: boolean; onOpenChange: (o: boolean) => void; alunoNome: string; alunoId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<"personal" | "aluno">("personal");
  const [date, setDate] = useState(today);
  const navigate = useNavigate();

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
    onSuccess: (id) => {
      onOpenChange(false);
      navigate({ to: "/dashboard/personal/avaliacao/$avaliacaoId", params: { avaliacaoId: id } });
    },
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
