import { notFound, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useScope, type Scope } from "@/lib/scope";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  LogIn, Mail, Phone, ShieldAlert, Calendar, User, ArrowLeft, ChevronLeft, Layers, Repeat, Search,
  Clock, Trophy, Pencil, Trash2, Copy, FileText, Sparkles, Loader2, Lock, AlertTriangle, KeyRound, Eye, EyeOff, X, CheckCircle2, ChevronDown, Dumbbell,
} from "lucide-react";

import { useServerFn } from "@tanstack/react-start";
import { changeAlunoPassword } from "@/lib/aluno-password.functions";
import { toast } from "@/components/ui/sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";
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


type Aluno = {
  id: string;
  full_name: string;
  nickname: string | null;
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
  title, description, checked, onCheckedChange,
}: { title: string; description: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/40 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
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


export function AlunoDetailPage({ scope }: { scope: Scope }) {
  const { alunoId } = useParams({ strict: false }) as { alunoId: string };
  const navigate = useNavigate();
  const treinosBase = scope === "academia" ? "/dashboard/academia/treinos" : "/dashboard/personal/treinos";
  const alunosBase = scope === "academia" ? "/dashboard/academia/alunos" : "/dashboard/personal/alunos";
  const avaliacoesBase = "/dashboard/personal/avaliacoes"; // avaliações permanece no scope personal por enquanto
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
      <IconRail scope={scope} />

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
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-xl font-bold md:text-2xl font-display">{aluno.full_name}</h2>
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    aria-label="Editar aluno"
                    title="Editar aluno"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                {aluno.nickname && (
                  <p className="truncate text-xs text-muted-foreground">"{aluno.nickname}"</p>
                )}
                <p className="truncate text-sm text-muted-foreground">{aluno.email ?? "Sem e-mail cadastrado"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${aluno.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {aluno.is_active ? "Ativo" : "Desativado"}
                  </span>
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
                    onClick={() => setActiveTab(i)}
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
              {activeTab === 1 && <AvaliacoesTab alunoId={aluno.id} scope={scope} />}
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
      <MobileBottomNav scope={scope} />

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
              onClick={() => {
                setNovoPlanoOpen(false);
                setConfigOpen(true);
              }}
              className="group flex w-full items-start gap-3 rounded-xl border border-border bg-background/40 p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Começar do zero</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Monte um plano do zero exclusivo para {aluno.full_name.split(" ")[0]} no builder.
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

      <PlanConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        aluno={aluno}
        scope={scope}
        onBack={() => {
          setConfigOpen(false);
          setNovoPlanoOpen(true);
        }}
      />



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

function PlanConfigDialog({
  open, onOpenChange, aluno, scope, onBack,
}: { open: boolean; onOpenChange: (o: boolean) => void; aluno: Aluno; scope: Scope; onBack: () => void }) {

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const firstName = aluno.full_name.split(" ")[0];
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(`Plano de ${firstName}`);
  const [startDate, setStartDate] = useState(today);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [allowRpe, setAllowRpe] = useState(false);
  const [allowAddSets, setAllowAddSets] = useState(true);
  const [trackSetTime, setTrackSetTime] = useState(false);
  const [allowPdf, setAllowPdf] = useState(true);

  useEffect(() => {
    if (open) {
      setName(`Plano de ${firstName}`);
      setStartDate(today);
      setDurationWeeks(4);
      setAllowRpe(false);
      setAllowAddSets(true);
      setTrackSetTime(false);
      setAllowPdf(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const createPlan = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Informe o nome do plano.");
      const { data: userRes, error: uErr } = await supabase.auth.getUser();
      if (uErr || !userRes.user) throw uErr ?? new Error("Sessão expirada.");
      const { data: tpl, error: tErr } = await supabase
        .from("workout_templates")
        .insert({
          name: trimmed,
          kind: "plan",
          personal_id: userRes.user.id,
          aluno_id: aluno.id,
          start_date: startDate || null,
          duration_weeks: durationWeeks,
          allow_rpe: allowRpe,
          allow_add_sets: allowAddSets,
          track_set_time: trackSetTime,
          allow_pdf: allowPdf,
        } as never)
        .select("id, slug")
        .single();
      if (tErr || !tpl) throw tErr ?? new Error("Falha ao criar plano.");
      const { error: swErr } = await supabase.from("student_workouts").insert({
        personal_id: userRes.user.id,
        aluno_id: aluno.id,
        template_id: tpl.id,
        name: trimmed,
      } as never);
      if (swErr) throw swErr;
      return tpl.slug as string;
    },
    onSuccess: async (slug) => {
      toast.success("Plano criado");
      const editBase =
        scope === "academia"
          ? "/dashboard/academia/treinos/editar/$slug"
          : "/dashboard/personal/treinos/editar/$slug";
      // Navigate first so the builder mounts before the dialog unmounts and
      // the parent profile refetches. Then close the dialog and invalidate.
      await navigate({
        to: editBase as "/dashboard/personal/treinos/editar/$slug",
        params: { slug },
        replace: true,
      });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["aluno-student-workouts", aluno.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0">
        <DialogHeader className="border-b border-border p-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Novo plano · {aluno.full_name}
              </p>
              <DialogTitle className="font-display text-lg">Configurações do plano</DialogTitle>
            </div>
          </div>
          <DialogDescription className="sr-only">Configurações do plano</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-3">
              <Label className="text-xs">Nome do plano</Label>
              <Input
                className="mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Início</Label>
              <Input
                className="mt-1.5"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Duração (semanas)</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={1}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Permissões na execução
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Defina como o aluno vai interagir com o treino durante a execução.
              </p>
            </div>
            <div className="space-y-2">
              <PermissionRow
                title="Solicitar RPE por exercício"
                description="O aluno deverá informar o nível de esforço percebido (1 a 10) após cada exercício."
                checked={allowRpe}
                onCheckedChange={setAllowRpe}
              />
              <PermissionRow
                title="Permitir adicionar séries"
                description="O aluno poderá adicionar séries extras além do prescrito durante o treino."
                checked={allowAddSets}
                onCheckedChange={setAllowAddSets}
              />
              <PermissionRow
                title="Rastrear tempo das séries"
                description="O aluno usa um botão Iniciar e o cronômetro registra o tempo até concluir cada série."
                checked={trackSetTime}
                onCheckedChange={setTrackSetTime}
              />
              <PermissionRow
                title="Permitir baixar o treino em PDF"
                description="O aluno pode exportar o treino em PDF. Desligue para manter o PDF só com você."
                checked={allowPdf}
                onCheckedChange={setAllowPdf}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-border p-4">
          <button
            type="button"
            onClick={() => createPlan.mutate()}
            disabled={createPlan.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {createPlan.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Continuar para o builder
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const scope = useScope();
  const alunosBase = scope === "academia" ? "/dashboard/academia/alunos" : "/dashboard/personal/alunos";

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("alunos").delete().eq("id", aluno.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      onOpenChange(false);
      navigate({ to: alunosBase as "/dashboard/personal/alunos" });
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
  buildPlanos,
  PLANO_SELECT,
  type Plano,
  type StudentWorkoutRow,
} from "@/lib/plano";


function PlanoCard({ plano }: { plano: Plano }) {
  const scope = useScope();
  const treinosBase = scope === "academia" ? "/dashboard/academia/treinos" : "/dashboard/personal/treinos";
  return (
    <Link
      to={`${treinosBase}/plano/$slug` as "/dashboard/personal/treinos/plano/$slug"}
      params={{ slug: plano.id }}

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
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-0.5 text-[0.625rem] font-semibold text-muted-foreground">
                  Arquivado
                </span>
              )}
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

  const planos = buildPlanos(aluno, treinos ?? []);

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
      ) : planos.length === 0 ? (
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
          {planos.map((p) => (
            <PlanoCard key={p.id} plano={p} />
          ))}
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
      <div className="pointer-events-auto flex w-[340px] items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3">
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
    const toastOpts = { classNames: { toast: "!bg-transparent !border-0 !shadow-none !p-0" } } as any;
    const id = toast.custom(() => renderToast("tmp", pct, "uploading", "Salvando nova senha…"), { duration: Infinity, ...toastOpts });
    const update = (p: number, status: "uploading" | "done" | "error", subtitle: string) =>
      toast.custom(() => renderToast(id, p, status, subtitle), {
        id,
        duration: status === "uploading" ? Infinity : 3500,
        ...toastOpts,
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

function CopyPlanPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (tpl: CopyableTemplate) => void;
}) {
  const [q, setQ] = useState("");

  const { data: templates, isLoading } = useQuery({
    enabled: open,
    queryKey: ["copyable-plans"],
    queryFn: async (): Promise<CopyableTemplate[]> => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("id, name, kind, workout_template_exercises ( session_position )")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => {
        const exs: { session_position: number }[] = t.workout_template_exercises ?? [];
        const sessions = new Set(exs.map((e) => e.session_position ?? 0));
        return {
          id: t.id,
          name: t.name,
          kind: t.kind ?? "template",
          sessionCount: sessions.size || 1,
          exerciseCount: exs.length,
        };
      });
    },
  });

  const filtered = (templates ?? []).filter((t) =>
    t.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <Copy className="h-5 w-5 text-primary" /> Selecionar plano
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Escolha o plano que deseja copiar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-5 pb-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar planos..."
              className="pl-9"
            />
          </div>

          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Nenhum plano encontrado.
              </div>
            ) : (
              filtered.map((tpl) => {
                const isPlan = tpl.kind === "plan";
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onSelect(tpl)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{tpl.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" />
                          {tpl.sessionCount} {tpl.sessionCount === 1 ? "sessão" : "sessões"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Dumbbell className="h-3.5 w-3.5" />
                          {tpl.exerciseCount} {tpl.exerciseCount === 1 ? "exercício" : "exercícios"}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-0.5 text-[0.625rem] font-semibold text-green-400">
                      {isPlan ? "Plano" : "Simples"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CopyPlanConfigDialog({
  open,
  onOpenChange,
  template,
  aluno,
  onBack,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: CopyableTemplate | null;
  aluno: Aluno;
  onBack: () => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (template && open) {
      setName(`${template.name} (copia)`);
      setStartDate("");
      setEndDate("");
    }
  }, [template, open]);

  const copyMutation = useMutation({
    mutationFn: async () => {
      if (!template) throw new Error("Nenhum plano selecionado");
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Sessão expirada");
      const personalId = userData.user.id;

      // 1. Duplicar workout_template (metadata)
      const { data: srcTpl, error: srcErr } = await supabase
        .from("workout_templates")
        .select("description, category, duration_min, kind, periodize, level, goal")
        .eq("id", template.id)
        .maybeSingle();
      if (srcErr) throw srcErr;

      const { data: newTpl, error: insTplErr } = await supabase
        .from("workout_templates")
        .insert({
          personal_id: personalId,
          name: name.trim() || `${template.name} (copia)`,
          description: srcTpl?.description ?? null,
          category: srcTpl?.category ?? null,
          duration_min: srcTpl?.duration_min ?? null,
          kind: srcTpl?.kind ?? "plan",
          periodize: srcTpl?.periodize ?? false,
          level: srcTpl?.level ?? null,
          goal: srcTpl?.goal ?? null,
        })
        .select("id")
        .single();
      if (insTplErr) throw insTplErr;

      // 2. Duplicar exercícios
      const { data: srcExs, error: exsErr } = await supabase
        .from("workout_template_exercises")
        .select("exercise_id, position, sets, reps, load, rest_seconds, notes, session_label, block_label, block_position, session_position")
        .eq("template_id", template.id);
      if (exsErr) throw exsErr;

      if (srcExs && srcExs.length > 0) {
        const rows = srcExs.map((e) => ({ ...e, template_id: newTpl.id }));
        const { error: insExsErr } = await supabase.from("workout_template_exercises").insert(rows);
        if (insExsErr) throw insExsErr;
      }

      // 3. Criar student_workouts para o aluno
      const { error: swErr } = await supabase.from("student_workouts").insert({
        personal_id: personalId,
        aluno_id: aluno.id,
        template_id: newTpl.id,
        name: name.trim() || `${template.name} (copia)`,
        scheduled_for: startDate || null,
      });
      if (swErr) throw swErr;

      return newTpl.id;
    },
    onSuccess: () => {
      toast.success("Plano copiado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["aluno-student-workouts", aluno.id] });
      queryClient.invalidateQueries({ queryKey: ["workout_templates", "list"] });
      queryClient.invalidateQueries({ queryKey: ["copyable-plans"] });
      onDone();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Erro ao copiar plano");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <Copy className="h-5 w-5 text-primary" /> Configurar cópia
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ajuste o nome e a data de início do novo plano.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 pb-2">
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Plano de origem
            </div>
            <p className="mt-0.5 text-sm font-semibold">{template?.name ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Aluno destino
            </div>
            <p className="mt-0.5 text-sm font-semibold">{aluno.full_name}</p>
          </div>

          <div>
            <Label className="text-xs font-semibold">Nome do novo plano</Label>
            <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold">Data de início (opcional)</Label>
              <Input className="mt-1.5" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Data de término (opcional)</Label>
              <Input className="mt-1.5" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 p-4">
          <button
            type="button"
            onClick={onBack}
            disabled={copyMutation.isPending}
            className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-60"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => copyMutation.mutate()}
            disabled={copyMutation.isPending || !template}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {copyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Copiar plano
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AvaliacoesTab({ alunoId, scope }: { alunoId: string; scope: Scope }) {
  const qc = useQueryClient();
  const [novaOpen, setNovaOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<"personal" | "aluno">("personal");

  const detailBase =
    scope === "academia"
      ? "/dashboard/academia/avaliacao/$avaliacaoId"
      : "/dashboard/personal/avaliacao/$avaliacaoId";

  const { data: avaliacoes = [], isLoading } = useQuery({
    queryKey: ["avaliacoes", alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select("id, assessment_date, composicao_corporal, perimetros, vo2max, neuromotora, dinamometria, teste_rm, banco_wells, postural, fotos")
        .eq("aluno_id", alunoId)
        .order("assessment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createAvaliacao = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const personalId = userData.user?.id;
      if (!personalId) throw new Error("Sessão expirada.");
      const { data, error } = await supabase
        .from("avaliacoes")
        .insert({ personal_id: personalId, aluno_id: alunoId, assessment_date: date, mode })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      setNovaOpen(false);
      qc.invalidateQueries({ queryKey: ["avaliacoes", alunoId] });
      toast.success("Avaliação criada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar"),
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

  function fmt(d: string) {
    const [y, m, day] = d.split("-").map(Number);
    const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    return `${String(day).padStart(2, "0")} de ${months[m - 1]} de ${y}`;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold">Avaliações Físicas</h3>
          <p className="text-xs text-muted-foreground">Histórico de avaliações do aluno</p>
        </div>
        <button
          type="button"
          onClick={() => setNovaOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Nova
        </button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : avaliacoes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-background/40 p-8 text-center">
          <p className="text-sm font-medium">Nenhuma avaliação física</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Clique em "Nova" para criar a primeira avaliação.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {avaliacoes.map((av: any) => (
            <li
              key={av.id}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-4 py-3"
            >
              <Link
                to={detailBase}
                params={{ avaliacaoId: av.id }}
                className="min-w-0 flex-1"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="h-4 w-4 text-primary" />
                  {fmt(av.assessment_date)}
                </div>
              </Link>
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: "Excluir avaliação?",
                    description: "Essa ação não pode ser desfeita.",
                    confirmLabel: "Excluir",
                    destructive: true,
                  });
                  if (ok) deleteAvaliacao.mutate(av.id);
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                aria-label="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova avaliação física</DialogTitle>
            <DialogDescription>Escolha quem vai preencher as medidas e a data.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("personal")}
                className={`rounded-lg border p-3 text-left text-sm transition ${mode === "personal" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="font-semibold">Eu vou preencher</div>
                <div className="mt-0.5 text-xs text-muted-foreground">Avaliação completa</div>
              </button>
              <button
                type="button"
                onClick={() => setMode("aluno")}
                className={`rounded-lg border p-3 text-left text-sm transition ${mode === "aluno" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="font-semibold">Pedir pro aluno</div>
                <div className="mt-0.5 text-xs text-muted-foreground">Envia no app</div>
              </button>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new_av_date" className="text-xs">Data</Label>
              <Input id="new_av_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setNovaOpen(false)}
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
              Criar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

