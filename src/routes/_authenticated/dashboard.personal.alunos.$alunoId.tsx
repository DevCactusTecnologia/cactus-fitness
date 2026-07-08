import { createFileRoute, notFound, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  LogIn, Mail, Phone, ShieldAlert, Calendar, User, ArrowLeft, ChevronLeft, Layers, Repeat,
  Clock, Trophy, Pencil, Trash2, Tag, Copy, FileText, Sparkles, Loader2, Lock, AlertTriangle, KeyRound, Eye, EyeOff, X, CheckCircle2, ChevronDown, Dumbbell,
} from "lucide-react";

import { useServerFn } from "@tanstack/react-start";
import { changeAlunoPassword } from "@/lib/aluno-password.functions";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { initialsFromName } from "@/lib/auth";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { colorForId } from "@/lib/avatar-color";

export const Route = createFileRoute("/_authenticated/dashboard/personal/alunos/$alunoId")({
  head: () => ({
    meta: [
      { title: "Perfil do Aluno · cactusfitness" },
      { name: "description", content: "Detalhes, contato e histórico do aluno." },
    ],
  }),
  component: AlunoDetailPage,
});

type Aluno = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  objective: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function useAluno(alunoId: string) {
  return useQuery({
    queryKey: ["aluno", alunoId],
    queryFn: async (): Promise<Aluno> => {
      const { data, error } = await supabase.from("alunos").select("*").eq("id", alunoId).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Aluno;
    },
  });
}

function Row({
  icon: Icon, label, value, valueNode,
}: { icon: React.ElementType; label: string; value?: string; valueNode?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1">
      <div className="grid h-9 w-9 shrink-0 place-items-center text-primary">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{valueNode ?? value ?? "Não informado"}</div>
      </div>
    </div>
  );
}

const TABS = ["Treinos", "Avaliações", "Informações"];

function PermissionRow({
  title, description, defaultChecked,
}: { title: string; description: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/40 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function formatDate(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
type CopyableTemplate = {
  id: string;
  name: string;
  kind: string;
  sessionCount: number;
  exerciseCount: number;
};


function AlunoDetailPage() {
  const { alunoId } = Route.useParams();
  const navigate = useNavigate();
  const { data: aluno, isLoading } = useAluno(alunoId);
  const [activeTab, setActiveTab] = useState(0);
  const [novoPlanoOpen, setNovoPlanoOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [copyPickerOpen, setCopyPickerOpen] = useState(false);
  const [copyConfigOpen, setCopyConfigOpen] = useState(false);
  const [selectedCopyTemplate, setSelectedCopyTemplate] = useState<CopyableTemplate | null>(null);

  if (isLoading || !aluno) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = initialsFromName(aluno.full_name, aluno.email);
  const avColor = colorForId(aluno.id);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail />

      <main className="pb-24 md:ml-[72px] md:pb-10">
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
          <div className="px-4 py-4 sm:px-6 md:px-8">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Voltar</span>
              </button>
              <h1 className="text-xl font-bold tracking-tight font-display sm:text-2xl">Perfil do Aluno</h1>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
          <div className="rounded-xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-center gap-4">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-lg font-bold font-display ring-2 ring-primary shadow-md"
                style={{ backgroundColor: avColor.bg, color: avColor.fg }}
              >
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold md:text-2xl font-display">{aluno.full_name}</h2>
                <p className="truncate text-sm text-muted-foreground">{aluno.email ?? "Sem e-mail cadastrado"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${aluno.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {aluno.is_active ? "Ativo" : "Desativado"}
                  </span>
                  <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <Tag className="h-3 w-3" /> Adicionar categorias
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <KeyRound className="h-3 w-3" /> Alterar senha
                  </button>
                </div>
              </div>
            </div>
          </div>


          <button
            type="button"
            onClick={() => setImpersonateOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:bg-accent active:scale-[0.99]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
                <LogIn className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium">Acessar como aluno</p>
                <p className="text-xs text-muted-foreground">
                  Entre no app como {aluno.full_name.split(" ")[0]} para iniciar o treino no presencial.
                </p>
              </div>
            </div>
            <span className="hidden shrink-0 text-xs font-medium text-primary sm:inline">Entrar →</span>
          </button>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border overflow-x-auto">
              <div className="inline-flex w-max min-w-full items-center">
                {TABS.map((t, i) => (
                  <button
                    key={t}
                    onClick={() => {
                      if (t === "Avaliações") {
                        navigate({ to: "/dashboard/personal/avaliacoes/$alunoId", params: { alunoId } });
                        return;
                      }
                      setActiveTab(i);
                    }}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                      i === activeTab
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 md:p-6">
              {activeTab === 0 && <TreinosTab aluno={aluno} onNovoPlano={() => setNovoPlanoOpen(true)} onCopiar={() => setCopyPickerOpen(true)} />}
              {activeTab === 2 && (
                <InformacoesTab
                  aluno={aluno}
                  onEdit={() => setEditOpen(true)}
                  onToggle={() => setToggleOpen(true)}
                  onDelete={() => setDeleteOpen(true)}
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav />

      <EditAlunoDialog aluno={aluno} open={editOpen} onOpenChange={setEditOpen} />
      <ToggleActiveDialog aluno={aluno} open={toggleOpen} onOpenChange={setToggleOpen} />
      <DeleteAlunoDialog aluno={aluno} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <ChangePasswordDialog aluno={aluno} open={passwordOpen} onOpenChange={setPasswordOpen} />

      <Dialog open={impersonateOpen} onOpenChange={setImpersonateOpen}>
        <DialogContent className="max-w-md gap-0 p-0">
          <DialogHeader className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
                <LogIn className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="font-display text-lg">Atuar como aluno</DialogTitle>
            </div>
            <DialogDescription className="pt-3 text-sm text-muted-foreground">
              Você vai entrar no app como <span className="font-semibold text-foreground">{aluno.full_name}</span> e poderá iniciar treinos, registrar séries e usar o app no lugar do aluno.
            </DialogDescription>
            <p className="pt-2 text-sm text-muted-foreground">
              Útil para atendimento presencial. A qualquer momento você volta para o seu acesso pelo banner amarelo no topo.
            </p>
          </DialogHeader>

          <div className="mx-5 mb-5 rounded-xl border border-border bg-background/50 p-4">
            <p className="text-sm font-semibold">Algumas ações ficam bloqueadas neste modo:</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-muted-foreground" /> Excluir conta do aluno</li>
              <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-muted-foreground" /> Alterar dados pessoais (nome, email)</li>
              <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-muted-foreground" /> Trocar foto de perfil</li>
            </ul>
          </div>

          <DialogFooter className="flex-row justify-end gap-2 border-t border-border p-4">
            <button
              type="button"
              onClick={() => setImpersonateOpen(false)}
              className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setImpersonateOpen(false)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              <LogIn className="h-4 w-4" /> Entrar como aluno
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={novoPlanoOpen} onOpenChange={setNovoPlanoOpen}>
        <DialogContent className="max-w-lg gap-0 p-0">
          <DialogHeader className="border-b border-border p-5">
            <DialogTitle className="font-display text-lg">Novo plano · {aluno.full_name}</DialogTitle>
            <DialogDescription className="sr-only">Escolha como criar o novo plano</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 p-5">
            <div>
              <p className="text-sm font-semibold">De onde começar?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use um modelo pronto pra acelerar — ou comece do zero pra montar tudo manualmente.
              </p>
            </div>
            <button
              onClick={() => { setNovoPlanoOpen(false); setConfigOpen(true); }}
              className="group flex w-full items-start gap-3 rounded-xl border border-border bg-background/40 p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Começar do zero</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Plano simples em branco, 4 semanas, 3x por semana — você ajusta tudo no builder.
                </p>
              </div>
            </button>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modelos prontos</p>
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold">0</span>
              </div>
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Você ainda não criou nenhum modelo. Comece do zero.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-xl gap-0 p-0">
          <DialogHeader className="border-b border-border p-5">
            <DialogTitle className="font-display text-lg">Novo plano · {aluno.full_name}</DialogTitle>
            <DialogDescription className="sr-only">Configurações do plano</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5">
            <div>
              <p className="text-sm font-semibold">Configurações do plano</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-3">
                <Label className="text-xs">Nome do plano</Label>
                <Input className="mt-1.5" defaultValue={`Plano de ${aluno.full_name.split(" ")[0]}`} />
              </div>
              <div>
                <Label className="text-xs">Início</Label>
                <Input className="mt-1.5" type="date" />
              </div>
              <div>
                <Label className="text-xs">Duração (semanas)</Label>
                <Input className="mt-1.5" type="number" defaultValue={4} min={1} />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">Permissões na execução</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Defina como o aluno vai interagir com o treino durante a execução.
                </p>
              </div>
              <div className="space-y-2">
                <PermissionRow title="Solicitar RPE por exercício" description="O aluno deverá informar o nível de esforço percebido (1 a 10) após cada exercício." />
                <PermissionRow title="Permitir adicionar séries" description="O aluno poderá adicionar séries extras além do prescrito durante o treino." defaultChecked />
                <PermissionRow title="Rastrear tempo das séries" description="O aluno usa um botão Iniciar e o cronômetro registra o tempo até concluir cada série." />
                <PermissionRow title="Permitir baixar o treino em PDF" description="O aluno pode exportar o treino em PDF. Desligue para manter o PDF só com você." defaultChecked />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-border p-4">
            <button
              onClick={() => setConfigOpen(false)}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Continuar para o builder
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CopyPlanPickerDialog
        open={copyPickerOpen}
        onOpenChange={setCopyPickerOpen}
        onSelect={(tpl) => {
          setSelectedCopyTemplate(tpl);
          setCopyPickerOpen(false);
          setCopyConfigOpen(true);
        }}
      />

      <CopyPlanConfigDialog
        open={copyConfigOpen}
        onOpenChange={setCopyConfigOpen}
        template={selectedCopyTemplate}
        aluno={aluno}
        onBack={() => {
          setCopyConfigOpen(false);
          setCopyPickerOpen(true);
        }}
        onDone={() => {
          setCopyConfigOpen(false);
          setSelectedCopyTemplate(null);
        }}
      />
    </div>
  );
}

function InformacoesTab({
  aluno, onEdit, onToggle, onDelete,
}: { aluno: Aluno; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const genderLabel = aluno.gender ? aluno.gender.charAt(0).toUpperCase() + aluno.gender.slice(1) : null;
  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contato</h3>
          <Row icon={Mail} label="Email" value={aluno.email ?? undefined} />
          <Row icon={Phone} label="Telefone" value={aluno.phone ?? undefined} />
          <Row icon={ShieldAlert} label="Telefone de Emergência" />
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados Pessoais</h3>
          <Row icon={Calendar} label="Data de Nascimento" value={formatDate(aluno.birth_date)} />
          <Row
            icon={User}
            label="Gênero"
            valueNode={genderLabel ? (
              <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs">{genderLabel}</span>
            ) : undefined}
          />
          <Row icon={Clock} label="Objetivo" value={aluno.objective ?? undefined} />
        </div>
      </div>

      <div className="mt-6 space-y-3 border-t border-border pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ranking</h3>
        <div className="rounded-xl border border-border bg-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted/40 text-muted-foreground">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Ranking</p>
              <p className="text-xs text-muted-foreground">
                {aluno.full_name.split(" ")[0]} ainda não está no ranking. Treinos concluídos colocam o aluno na disputa.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-semibold hover:bg-accent"
          >
            <Pencil className="h-4 w-4" /> Editar dados
          </button>
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[oklch(0.72_0.18_45)] transition hover:bg-[oklch(0.72_0.18_45)]/10"
          >
            <Lock className="h-4 w-4" /> {aluno.is_active ? "Desativar aluno" : "Ativar aluno"}
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[oklch(0.68_0.22_25)] transition hover:bg-[oklch(0.68_0.22_25)]/10"
          >
            <Trash2 className="h-4 w-4" /> Excluir aluno
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Cadastrado em {formatDate(aluno.created_at)}</span>
          <span>Atualizado em {formatDate(aluno.updated_at)}</span>
        </div>
      </div>
    </>
  );
}

function EditAlunoDialog({
  aluno, open, onOpenChange,
}: { aluno: Aluno; open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: aluno.full_name,
    email: aluno.email ?? "",
    phone: aluno.phone ?? "",
    birth_date: aluno.birth_date ?? "",
    gender: aluno.gender ?? "",
    objective: aluno.objective ?? "",
    notes: aluno.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        full_name: aluno.full_name,
        email: aluno.email ?? "",
        phone: aluno.phone ?? "",
        birth_date: aluno.birth_date ?? "",
        gender: aluno.gender ?? "",
        objective: aluno.objective ?? "",
        notes: aluno.notes ?? "",
      });
      setError(null);
    }
  }, [open, aluno]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("alunos").update({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        birth_date: form.birth_date || null,
        gender: form.gender.trim() || null,
        objective: form.objective.trim() || null,
        notes: form.notes.trim() || null,
      }).eq("id", aluno.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aluno", aluno.id] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      onOpenChange(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) { setError("Informe o nome completo."); return; }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar dados</DialogTitle>
          <DialogDescription>Atualize as informações de {aluno.full_name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e_full_name">Nome completo *</Label>
            <Input id="e_full_name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="e_email">E-mail</Label>
              <Input id="e_email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e_phone">Telefone</Label>
              <Input id="e_phone" inputMode="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))} maxLength={15} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e_birth">Data de nascimento</Label>
              <Input id="e_birth" type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e_gender">Gênero</Label>
              <Input id="e_gender" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} placeholder="masculino / feminino" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e_objective">Objetivo</Label>
            <Input id="e_objective" value={form.objective} onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e_notes">Observações</Label>
            <Textarea id="e_notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar alterações
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleActiveDialog({
  aluno, open, onOpenChange,
}: { aluno: Aluno; open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const isActive = aluno.is_active;
  const firstName = aluno.full_name.split(" ")[0];

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("alunos").update({ is_active: !isActive }).eq("id", aluno.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aluno", aluno.id] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[oklch(0.72_0.18_45)]/15 text-[oklch(0.72_0.18_45)]">
              <Lock className="h-5 w-5" />
            </div>
            <DialogTitle className="font-display text-lg">
              {isActive ? "Desativar aluno" : "Ativar aluno"}
            </DialogTitle>
          </div>
          <DialogDescription className="pt-3 text-left text-sm text-foreground">
            Tem certeza que deseja {isActive ? "desativar" : "ativar"} o aluno <span className="font-semibold">{aluno.full_name}</span>?
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {isActive
            ? `Ele perderá o acesso ao aplicativo imediatamente. Se já estiver logado, verá uma tela informando que o acesso foi desativado pelo personal. Você pode reativá-lo a qualquer momento.`
            : `${firstName} voltará a ter acesso ao aplicativo imediatamente.`}
        </p>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.72_0.18_45)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isActive ? "Desativar aluno" : "Ativar aluno"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAlunoDialog({
  aluno, open, onOpenChange,
}: { aluno: Aluno; open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("alunos").delete().eq("id", aluno.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      onOpenChange(false);
      navigate({ to: "/dashboard/personal/alunos" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[oklch(0.68_0.22_25)]/15 text-[oklch(0.68_0.22_25)]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="font-display text-lg">Excluir aluno</DialogTitle>
          </div>
          <DialogDescription className="pt-3 text-left text-sm text-muted-foreground">
            Tem certeza que deseja excluir o aluno <span className="font-semibold text-foreground">{aluno.full_name}</span>? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.68_0.22_25)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Excluir aluno
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import {
  buildPlano,
  PLANO_SELECT,
  type Plano,
  type StudentWorkoutRow,
} from "@/lib/plano";


function PlanoCard({ plano }: { plano: Plano }) {
  return (
    <Link
      to="/dashboard/personal/treinos/plano/$planoId"
      params={{ planoId: plano.id }}
      className="block cursor-pointer rounded-lg border border-border bg-surface-2/30 p-4 transition-colors hover:bg-surface-2/50"
    >
      <div className="flex min-h-[56px] items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{plano.name}</p>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {plano.isActive ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/15 px-3 py-0.5 text-[0.625rem] font-semibold text-green-500">
                  Ativo
                </span>
              ) : null}
              {plano.isSimple ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-0.5 text-[0.625rem] font-semibold text-green-400">
                  Simples
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {plano.sessionsCount} sessões
            </span>
            <span className="flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {plano.perWeek}x/semana
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {plano.weeks} {plano.weeks === 1 ? "semana" : "semanas"}
            </span>
            {plano.startShort ? (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Início {plano.startShort}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ChevronDown className="h-5 w-5 -rotate-90 text-fg-muted" />
        </div>
      </div>
    </Link>
  );
}

function TreinosTab({ aluno, onNovoPlano, onCopiar }: { aluno: Aluno; onNovoPlano: () => void; onCopiar: () => void }) {
  const firstName = aluno.full_name.split(" ")[0];
  const { data: treinos, isLoading, error } = useQuery({
    queryKey: ["aluno-student-workouts", aluno.id],
    queryFn: async (): Promise<StudentWorkoutRow[]> => {
      const { data, error } = await supabase
        .from("student_workouts")
        .select(PLANO_SELECT)
        .eq("aluno_id", aluno.id)
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StudentWorkoutRow[];
    },
  });

  const plano = buildPlano(aluno, treinos ?? []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          Planos de Treino
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopiar}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            <Copy className="h-4 w-4" /> Copiar existente
          </button>
          <button
            onClick={onNovoPlano}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo Plano
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-2/30 py-12 text-sm text-fg-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando treinos…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-6 text-sm text-destructive">
          Não foi possível carregar os treinos deste aluno.
        </div>
      ) : !plano ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-2/20 px-6 py-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-3 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium">Nenhum plano de treino para {firstName}.</p>
          <p className="max-w-sm text-xs text-fg-muted">
            Crie um plano personalizado ou use um modelo pronto.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <PlanoCard plano={plano} />
        </div>
      )}
    </div>
  );
}






function ChangePasswordDialog({
  aluno, open, onOpenChange,
}: { aluno: Aluno; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<{ pass: boolean; confirm: boolean }>({ pass: false, confirm: false });
  const changePassword = useServerFn(changeAlunoPassword);

  useEffect(() => {
    if (!open) {
      setPassword(""); setConfirm(""); setShow(false);
      setTouched({ pass: false, confirm: false });
    }
  }, [open]);

  const passError = touched.pass && password.length > 0 && password.length < 6
    ? "A senha deve ter no mínimo 6 caracteres"
    : null;
  const confirmError = touched.confirm && confirm.length > 0 && confirm !== password
    ? "As senhas não conferem"
    : null;
  const canSubmit = password.length >= 6 && confirm === password && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ pass: true, confirm: true });
    if (!canSubmit) return;
    setLoading(true);

    const title = aluno.full_name;
    const renderToast = (
      id: string | number,
      pct: number,
      status: "uploading" | "done" | "error",
      subtitle: string,
    ) => (
      <div className="pointer-events-auto flex w-[340px] items-center gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-3 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6),0_0_40px_-10px_hsl(var(--primary)/0.35)] backdrop-blur-xl">
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
          {status === "uploading" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : status === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <X className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border/60">
            <div
              className={`h-full rounded-full transition-all duration-200 ${status === "error" ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${status === "done" ? 100 : pct}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );

    let pct = 0;
    const id = toast.custom(() => renderToast("tmp", pct, "uploading", "Salvando nova senha…"), { duration: Infinity });
    const update = (p: number, status: "uploading" | "done" | "error", subtitle: string) =>
      toast.custom(() => renderToast(id, p, status, subtitle), {
        id,
        duration: status === "uploading" ? Infinity : 3500,
      });
    const timer = setInterval(() => {
      pct = Math.min(pct + Math.random() * 18, 90);
      update(pct, "uploading", "Salvando nova senha…");
    }, 220);

    try {
      const res: any = await changePassword({ data: { alunoId: aluno.id, newPassword: password } });
      clearInterval(timer);
      update(100, "done", res?.created
        ? `Conta criada · ${aluno.email}`
        : "Senha alterada com sucesso");
      onOpenChange(false);
    } catch (err: any) {
      clearInterval(timer);
      update(100, "error", err?.message ?? "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="font-display text-lg">Alterar senha</DialogTitle>
          </div>
          <DialogDescription className="pt-3 text-sm text-muted-foreground">
            O aluno poderá entrar com o e-mail{" "}
            <span className="font-semibold text-foreground">{aluno.email ?? "não cadastrado"}</span>{" "}
            e a senha definida abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="new_pass" className="text-xs">Nova senha</Label>
            <div className="relative">
              <Input
                id="new_pass"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, pass: true }))}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                aria-invalid={!!passError}
                className={`pr-10 transition ${passError ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="min-h-[16px] text-[11px] leading-tight">
              {passError ? (
                <span className="inline-flex items-center gap-1 text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertTriangle className="h-3 w-3" /> {passError}
                </span>
              ) : (
                <span className="text-muted-foreground/70">Use pelo menos 6 caracteres.</span>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_pass" className="text-xs">Confirmar nova senha</Label>
            <Input
              id="confirm_pass"
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              placeholder="Digite a senha novamente"
              autoComplete="new-password"
              aria-invalid={!!confirmError}
              className={`transition ${confirmError ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
            />
            <div className="min-h-[16px] text-[11px] leading-tight">
              {confirmError && (
                <span className="inline-flex items-center gap-1 text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertTriangle className="h-3 w-3" /> {confirmError}
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="-mx-5 mt-4 flex-row justify-end gap-2 border-t border-border p-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {loading ? "Salvando…" : "Salvar nova senha"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
