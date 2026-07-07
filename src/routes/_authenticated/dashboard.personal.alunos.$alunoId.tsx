import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  ArrowLeft, LogIn, Mail, Phone, ShieldAlert, Calendar, User,
  Clock, Trophy, Pencil, Trash2, Tag, Copy, FileText, Sparkles, Loader2, Lock,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const AVATAR_COLORS = [
  { bg: "oklch(0.35 0.15 25)", fg: "oklch(0.85 0.15 25)" },   // vermelho
  { bg: "oklch(0.35 0.15 55)", fg: "oklch(0.85 0.15 55)" },   // laranja
  { bg: "oklch(0.35 0.15 90)", fg: "oklch(0.85 0.15 90)" },   // amarelo
  { bg: "oklch(0.35 0.15 145)", fg: "oklch(0.85 0.15 145)" }, // verde
  { bg: "oklch(0.35 0.15 200)", fg: "oklch(0.85 0.15 200)" }, // ciano
  { bg: "oklch(0.35 0.15 245)", fg: "oklch(0.85 0.15 245)" }, // azul
  { bg: "oklch(0.35 0.15 295)", fg: "oklch(0.85 0.15 295)" }, // roxo
  { bg: "oklch(0.35 0.15 340)", fg: "oklch(0.85 0.15 340)" }, // rosa
];
function colorForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
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

const TABS = [
  "Informações", "Treinos", "Corrida", "Avaliações",
  "Dieta", "Anamnese", "Anotações", "Histórico",
  "Progresso", "Cargas", "Financeiro",
];

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

function AlunoDetailPage() {
  const { alunoId } = Route.useParams();
  const { data: aluno, isLoading } = useAluno(alunoId);
  const [activeTab, setActiveTab] = useState(0);
  const [novoPlanoOpen, setNovoPlanoOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

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

        {/* Sticky title bar */}
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="px-4 py-4 sm:px-6 md:px-8">
            <Link to="/dashboard/personal/alunos" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> voltar
            </Link>
            <h1 className="mt-1 text-xl font-bold tracking-tight font-display sm:text-2xl">Perfil do Aluno</h1>
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
                </div>
              </div>
            </div>
          </div>


          <button className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:bg-accent active:scale-[0.99]">
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
              {activeTab === 0 && <InformacoesTab aluno={aluno} />}
              {activeTab === 1 && <TreinosTab firstName={aluno.full_name.split(" ")[0]} onNovoPlano={() => setNovoPlanoOpen(true)} />}
              {activeTab > 1 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Em breve.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav />

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
    </div>
  );
}

function InformacoesTab({ aluno }: { aluno: Aluno }) {
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
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-semibold hover:bg-accent">
            <Pencil className="h-4 w-4" /> Editar dados
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[oklch(0.72_0.18_45)] transition hover:bg-[oklch(0.72_0.18_45)]/10">
            <Lock className="h-4 w-4" /> {aluno.is_active ? "Desativar aluno" : "Ativar aluno"}
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[oklch(0.68_0.22_25)] transition hover:bg-[oklch(0.68_0.22_25)]/10">
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



function TreinosTab({ firstName, onNovoPlano }: { firstName: string; onNovoPlano: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold">Planos de Treino</h3>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-semibold hover:bg-accent">
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

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/40 px-6 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">Nenhum plano de treino para {firstName}.</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Crie um plano personalizado ou use um modelo pronto.
        </p>
      </div>
    </div>
  );
}
