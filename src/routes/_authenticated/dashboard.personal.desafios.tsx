import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Play, Trophy, Plus, X, Info } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/personal/desafios")({
  head: () => ({
    meta: [
      { title: "Desafios · cactusfitness" },
      { name: "description", content: "Crie desafios para motivar seus alunos a competirem entre si." },
    ],
  }),
  component: DesafiosPage,
});

function DesafiosPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />

      <main className="pb-24 md:ml-[72px] md:pb-0">
        <div className="flex items-center justify-between gap-3 px-4 pt-5 sm:px-8 sm:pt-6">
          <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">Desafios</h1>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Desafio
          </button>
        </div>

        <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-2.5 text-left transition hover:bg-card sm:p-3"
          >
            <div className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/60 sm:h-14 sm:w-20">
              <Play className="h-4 w-4 fill-primary text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Tutorial em vídeo</div>
              <div className="mt-0.5 truncate text-xs font-semibold sm:text-sm">Como criar um desafio no cactusfitness</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <div className="mt-20 flex flex-col items-center text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Trophy className="h-6 w-6" strokeWidth={2} />
            </div>
            <h3 className="mb-1.5 font-display text-base font-bold">Nenhum desafio criado</h3>
            <p className="mb-5 max-w-sm text-xs text-muted-foreground">
              Crie um desafio para motivar seus alunos a competirem entre si!
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" /> Criar primeiro desafio
            </button>
          </div>
        </div>
      </main>

      <MobileBottomNav />
      <NovoDesafioDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

type AlunoRow = { id: string; full_name: string };

function NovoDesafioDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"treino_realizado">("treino_realizado");
  const [dataEnc, setDataEnc] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: alunos = [] } = useQuery({
    queryKey: ["alunos", "desafios"],
    enabled: open,
    queryFn: async (): Promise<AlunoRow[]> => {
      const { data, error } = await supabase
        .from("alunos")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AlunoRow[];
    },
  });

  const enoughAlunos = alunos.length >= 2;
  const canCreate = nome.trim().length > 0 && selected.size >= 2;
  const allSelected = useMemo(
    () => alunos.length > 0 && alunos.every((a) => selected.has(a.id)),
    [alunos, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(alunos.map((a) => a.id)));
  }

  function reset() {
    setNome("");
    setDescricao("");
    setTipo("treino_realizado");
    setDataEnc("");
    setSelected(new Set());
  }

  function handleCreate() {
    if (!canCreate) return;
    toast.success("Desafio criado");
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md gap-0 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" strokeWidth={2} />
            <h2 className="font-display text-lg font-bold">Novo Desafio</h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="desafio_nome" className="text-xs font-semibold">Nome do desafio</Label>
            <Input
              id="desafio_nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
              placeholder="Ex: Desafio de Consistência"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="desafio_desc" className="text-xs font-semibold">Descrição (opcional)</Label>
            <Textarea
              id="desafio_desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Descreva as regras do desafio..."
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipo de desafio</Label>
            <button
              type="button"
              onClick={() => setTipo("treino_realizado")}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                tipo === "treino_realizado" ? "border-primary bg-primary/5" : "border-border bg-background/40"
              }`}
            >
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-primary">
                {tipo === "treino_realizado" && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Treino Realizado</p>
                <p className="text-[11px] text-muted-foreground">
                  Cada treino concluído = <span className="text-primary">1 ponto</span>
                </p>
              </div>
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/30 px-3 py-2.5 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Novos tipos de desafio em breve (volume, frequência, carga...)
            </div>
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <Label htmlFor="desafio_data" className="text-xs font-semibold">Data de encerramento (opcional)</Label>
            <Input
              id="desafio_data"
              type="date"
              value={dataEnc}
              onChange={(e) => setDataEnc(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Deixe vazio para encerrar manualmente.</p>
          </div>

          {/* Participantes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Participantes ({selected.size} {selected.size === 1 ? "selecionado" : "selecionados"})
              </Label>
              {enoughAlunos && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  {allSelected ? "Limpar seleção" : "Selecionar todos"}
                </button>
              )}
            </div>

            {!enoughAlunos && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-200/90">
                É necessário selecionar <strong>no mínimo 2 alunos</strong> para criar um desafio.
                Cadastre mais alunos para liberar esta funcionalidade.
              </div>
            )}

            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {alunos.map((a) => {
                const on = selected.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(a.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      on ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:border-border-strong"
                    }`}
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? "border-primary bg-primary" : "border-border"}`}>
                      {on && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                    </span>
                    <span className="truncate text-sm">{a.full_name}</span>
                  </button>
                );
              })}
              {alunos.length === 0 && (
                <div className="rounded-xl border border-border/60 bg-background/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
                  Nenhum aluno ativo encontrado.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border/60 p-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Criar Desafio
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
