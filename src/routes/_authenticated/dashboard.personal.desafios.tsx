import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Play, Trophy, Plus, X, Info, Loader2, Pencil, Trash2, CalendarDays, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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

type Desafio = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "treino_realizado";
  data_encerramento: string | null;
  status: string;
  desafio_participantes: { aluno_id: string }[];
};

function DesafiosPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Desafio | null>(null);
  const qc = useQueryClient();

  const { data: desafios = [], isLoading } = useQuery({
    queryKey: ["desafios"],
    queryFn: async (): Promise<Desafio[]> => {
      const { data, error } = await supabase
        .from("desafios")
        .select("id, nome, descricao, tipo, data_encerramento, status, desafio_participantes(aluno_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Desafio[];
    },
  });

  const deleteDesafio = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("desafios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desafios"] });
      toast.success("Desafio excluído");
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao excluir"),
  });

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />

      <main className="pb-24 md:ml-[72px] md:pb-0">
        <div className="flex items-center justify-between gap-3 px-4 pt-5 sm:px-8 sm:pt-6">
          <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">Desafios</h1>
          <button
            type="button"
            onClick={() => { setEditing(null); setOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Desafio
          </button>
        </div>

        <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">

          {isLoading ? (
            <div className="mt-16 grid place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : desafios.length === 0 ? (
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
                onClick={() => { setEditing(null); setOpen(true); }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.97]"
              >
                <Plus className="h-4 w-4" /> Criar primeiro desafio
              </button>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {desafios.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-3 py-3 transition hover:bg-card sm:px-4"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Trophy className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{d.nome}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span>{d.desafio_participantes.length} participante{d.desafio_participantes.length === 1 ? "" : "s"}</span>
                      {d.data_encerramento && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          até {formatBrDate(d.data_encerramento)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEditing(d); setOpen(true); }}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm("Excluir este desafio?")) deleteDesafio.mutate(d.id); }}
                    className="grid h-9 w-9 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <MobileBottomNav />
      <DesafioDialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}
        editing={editing}
      />
    </div>
  );
}

function formatBrDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type AlunoRow = { id: string; full_name: string };

function DesafioDialog({
  open, onOpenChange, editing,
}: { open: boolean; onOpenChange: (o: boolean) => void; editing: Desafio | null }) {
  const qc = useQueryClient();
  const isEdit = !!editing;

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"treino_realizado">("treino_realizado");
  const [dataEnc, setDataEnc] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setNome(editing.nome);
      setDescricao(editing.descricao ?? "");
      setTipo(editing.tipo);
      setDataEnc(editing.data_encerramento ?? "");
      setSelected(new Set(editing.desafio_participantes.map((p) => p.aluno_id)));
    } else {
      setNome(""); setDescricao(""); setTipo("treino_realizado"); setDataEnc(""); setSelected(new Set());
    }
  }, [open, editing]);

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
  const canSave = nome.trim().length > 0 && selected.size >= 2;
  const allSelected = useMemo(
    () => alunos.length > 0 && alunos.every((a) => selected.has(a.id)),
    [alunos, selected],
  );

  const save = useMutation({
    mutationFn: async () => {
      const trimmedNome = nome.trim();
      const trimmedDesc = descricao.trim();
      if (trimmedNome.length === 0) throw new Error("Informe o nome do desafio");
      if (selected.size < 2) throw new Error("Selecione ao menos 2 participantes");

      const payload = {
        nome: trimmedNome,
        descricao: trimmedDesc || null,
        tipo,
        data_encerramento: dataEnc || null,
      };

      let desafioId = editing?.id;
      if (isEdit && desafioId) {
        const { error } = await supabase.from("desafios").update(payload).eq("id", desafioId);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const personalId = userData.user?.id;
        if (!personalId) throw new Error("Sessão expirada.");
        const { data, error } = await supabase
          .from("desafios")
          .insert({ ...payload, personal_id: personalId })
          .select("id")
          .single();
        if (error) throw error;
        desafioId = data.id;
      }

      // Sync participants
      const nextIds = new Set(selected);
      const prevIds = new Set(editing?.desafio_participantes.map((p) => p.aluno_id) ?? []);
      const toAdd = [...nextIds].filter((id) => !prevIds.has(id));
      const toRemove = [...prevIds].filter((id) => !nextIds.has(id));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("desafio_participantes")
          .delete()
          .eq("desafio_id", desafioId!)
          .in("aluno_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("desafio_participantes")
          .insert(toAdd.map((aluno_id) => ({ desafio_id: desafioId!, aluno_id })));
        if (error) throw error;
      }
      return desafioId!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desafios"] });
      toast.success(isEdit ? "Desafio atualizado" : "Desafio criado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao salvar desafio"),
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(alunos.map((a) => a.id)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 max-h-[96vh] min-h-[640px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 pr-10">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" strokeWidth={2} />
            <h2 className="font-display text-base font-bold">{isEdit ? "Editar Desafio" : "Novo Desafio"}</h2>
          </div>
        </div>


        {/* Body (scroll only if needed) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2 space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="desafio_nome" className="text-xs font-semibold">Nome do desafio</Label>
            <Input id="desafio_nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} placeholder="Ex: Desafio de Consistência" className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desafio_desc" className="text-xs font-semibold">Descrição (opcional)</Label>
            <Textarea id="desafio_desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={500} rows={2} placeholder="Descreva as regras do desafio..." className="text-sm min-h-[60px]" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipo de desafio</Label>
            <button
              type="button"
              onClick={() => setTipo("treino_realizado")}
              className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition ${
                tipo === "treino_realizado" ? "border-primary/40 bg-primary/5" : "border-border/60 bg-background/40"
              }`}
            >
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-primary">
                {tipo === "treino_realizado" && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">Treino Realizado</p>
                <p className="text-xs text-muted-foreground">Cada treino concluído = <span className="text-primary">1 ponto</span></p>
              </div>
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-2.5 py-2 text-xs text-muted-foreground/60">
              <Info className="h-3.5 w-3.5 shrink-0" /> Novos tipos de desafio em breve (volume, frequência, carga...)
            </div>

          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Data de encerramento (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm transition hover:bg-accent/40",
                    !dataEnc && "text-muted-foreground"
                  )}
                >
                  <span>
                    {dataEnc
                      ? format(parse(dataEnc, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: ptBR })
                      : "dd/mm/aaaa"}
                  </span>
                  <CalendarIcon className="h-4 w-4 opacity-70" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  locale={ptBR}
                  selected={dataEnc ? parse(dataEnc, "yyyy-MM-dd", new Date()) : undefined}
                  onSelect={(d) => setDataEnc(d ? format(d, "yyyy-MM-dd") : "")}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-muted-foreground">Deixe vazio para encerrar manualmente.</p>
          </div>


          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Participantes ({selected.size} {selected.size === 1 ? "selecionado" : "selecionados"})
              </Label>
              {enoughAlunos && (
                <button type="button" onClick={toggleAll} className="text-xs font-semibold text-primary hover:underline">
                  {allSelected ? "Limpar" : "Selecionar todos"}
                </button>
              )}
            </div>

            {!enoughAlunos && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-200/90">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>É necessário selecionar <strong>no mínimo 2 alunos</strong> para criar um desafio. Cadastre mais alunos para liberar esta funcionalidade.</span>
              </div>
            )}

            <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
              {alunos.map((a) => {
                const on = selected.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(a.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition ${
                      on ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:border-border-strong"
                    }`}
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? "border-primary bg-primary" : "border-border"}`}>
                      {on && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </span>
                    <span className="truncate text-sm">{a.full_name}</span>
                  </button>
                );
              })}
              {alunos.length === 0 && (
                <div className="rounded-lg border border-border/60 bg-background/30 px-2 py-2 text-center text-xs text-muted-foreground">
                  Nenhum aluno ativo encontrado.
                </div>
              )}
            </div>
          </div>

          {/* Footer (scrolls with content, sem divisória) */}
          <div className="flex items-center justify-end gap-2 pt-2 pb-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={!canSave || save.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Salvar" : "Criar Desafio"}
            </button>
          </div>
        </div>


      </DialogContent>
    </Dialog>
  );
}
