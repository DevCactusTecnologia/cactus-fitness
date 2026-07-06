import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Home, Users, Dumbbell, ClipboardCheck, Wallet, Bell, Plus, PanelLeftClose,
  ArrowLeft, LogIn, Mail, Phone, ShieldAlert, Calendar, User,
  Clock, Trophy, Pencil, Power, Trash2, Tag, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/personal/alunos/$alunoId")({
  head: () => ({
    meta: [
      { title: "Perfil do Aluno · cactusfitness" },
      { name: "description", content: "Detalhes, contato e histórico do aluno." },
    ],
  }),
  component: AlunoDetailPage,
});

function SidebarIcon({
  icon: Icon, active, badge, to,
}: { icon: React.ElementType; active?: boolean; badge?: string; to?: string }) {
  const cls = `relative grid h-10 w-10 place-items-center rounded-xl transition ${
    active ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
  }`;
  const content = (
    <>
      <Icon className="h-5 w-5" />
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
    </>
  );
  if (to) return <Link to={to} className={cls}>{content}</Link>;
  return <button className={cls}>{content}</button>;
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
        <div className="text-sm font-medium truncate">{valueNode ?? value}</div>
      </div>
    </div>
  );
}

const TABS = [
  "Informações", "Treinos", "Corrida", "Avaliações",
  "Dieta", "Anamnese", "Anotações", "Histórico",
  "Progresso", "Cargas", "Financeiro",
];

function AlunoDetailPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-16 flex-col items-center gap-2 border-r border-border bg-sidebar py-4">
        <Link to="/" className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2c-3 4-3 8 0 12 3-4 3-8 0-12zm-7 10c4 3 8 3 12 0-4-3-8-3-12 0zm7 10c-3-4-3-8 0-12 3 4 3 8 0 12z"/></svg>
        </Link>
        <SidebarIcon icon={Home} to="/" />
        <SidebarIcon icon={Users} to="/dashboard/personal/alunos" active />
        <SidebarIcon icon={Dumbbell} />
        <SidebarIcon icon={ClipboardCheck} />
        <SidebarIcon icon={Wallet} />
        <div className="mt-auto flex flex-col items-center gap-2">
          <SidebarIcon icon={Plus} />
          <SidebarIcon icon={Bell} badge="2" />
          <SidebarIcon icon={PanelLeftClose} />
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/90 text-sm font-semibold text-white">ML</div>
        </div>
      </aside>

      <main className="ml-16 p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link to="/dashboard/personal/alunos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> voltar
          </Link>
          <h1 className="text-2xl font-bold tracking-tight font-display">Perfil do Aluno</h1>

          {/* Header card */}
          <div className="rounded-xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-center gap-4">
              <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 text-lg font-bold text-white font-display ring-2 ring-border shadow-md">
                ML
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold md:text-2xl font-display">marcos Lisboa</h2>
                <p className="truncate text-sm text-muted-foreground">marcosalan.bcc@gmail.com</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                    Ativo
                  </span>
                  <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <Tag className="h-3 w-3" /> Adicionar categorias
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Acessar como aluno */}
          <button className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:bg-accent active:scale-[0.99]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
                <LogIn className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium">Acessar como aluno</p>
                <p className="text-xs text-muted-foreground">
                  Entre no app como marcos para iniciar o treino no presencial.
                </p>
              </div>
            </div>
            <span className="hidden shrink-0 text-xs font-medium text-primary sm:inline">Entrar →</span>
          </button>

          {/* Tabs + content card */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border overflow-x-auto">
              <div className="inline-flex w-max min-w-full items-center">
                {TABS.map((t, i) => (
                  <button
                    key={t}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                      i === 0
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
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Contato */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contato</h3>
                  <Row icon={Mail} label="Email" value="marcosalan.bcc@gmail.com" />
                  <Row icon={Phone} label="Telefone" value="(83) 99634-0118" />
                  <Row icon={ShieldAlert} label="Telefone de Emergência" value="Não informado" />
                </div>
                {/* Dados Pessoais */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados Pessoais</h3>
                  <Row icon={Calendar} label="Data de Nascimento" value="02/09/1988" />
                  <Row
                    icon={User}
                    label="Gênero"
                    valueNode={
                      <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs">Feminino</span>
                    }
                  />
                  <Row icon={Clock} label="Último Acesso" value="Hoje" />
                </div>
              </div>

              {/* Ranking */}
              <div className="mt-6 space-y-3 border-t border-border pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ranking</h3>
                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Ranking</p>
                      <p className="text-xs text-muted-foreground">
                        marcos ainda não está no ranking. Treinos concluídos colocam o aluno na disputa.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-4 border-t border-border pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-semibold hover:bg-accent">
                    <Pencil className="h-4 w-4" /> Editar dados
                  </button>
                  <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-semibold hover:bg-accent">
                    <Power className="h-4 w-4" /> Desativar aluno
                  </button>
                  <button className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3.5 py-2 text-sm font-semibold text-destructive hover:bg-destructive/15">
                    <Trash2 className="h-4 w-4" /> Excluir aluno
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Cadastrado em 06/07/2026</span>
                  <span>Atualizado em 06/07/2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
