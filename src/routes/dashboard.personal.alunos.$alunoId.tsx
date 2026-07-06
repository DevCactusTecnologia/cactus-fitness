import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Home, Users, Dumbbell, ClipboardCheck, Wallet, Bell, Plus,
  ArrowLeft, LogIn, Mail, Phone, ShieldAlert, Calendar, User,
  Clock, Trophy, Pencil, Power, Trash2, Tag,
} from "lucide-react";

export const Route = createFileRoute("/alunos/$alunoId")({
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

function Field({
  icon: Icon, label, value, valueNode,
}: { icon: React.ElementType; label: string; value?: string; valueNode?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs lowercase text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm font-medium">{valueNode ?? value}</div>
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
        <SidebarIcon icon={Users} to="/alunos" active />
        <SidebarIcon icon={Dumbbell} />
        <SidebarIcon icon={ClipboardCheck} />
        <SidebarIcon icon={Wallet} />
        <div className="mt-auto flex flex-col items-center gap-2">
          <SidebarIcon icon={Plus} />
          <SidebarIcon icon={Bell} badge="2" />
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/90 text-sm font-semibold text-white">ML</div>
        </div>
      </aside>

      <main className="ml-16 px-8 py-8">
        <div className="mx-auto max-w-6xl">
          <Link to="/alunos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> voltar
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Perfil do Aluno</h1>

          {/* Header card */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-fuchsia-600 text-2xl font-semibold text-white">
                  ML
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">marcos Lisboa</h2>
                  <p className="mt-1 text-sm text-muted-foreground">marcosalan.bcc@gmail.com</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">
                      Ativo
                    </span>
                    <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground">
                      <Tag className="h-3 w-3" /> Adicionar categorias
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-xs rounded-xl border border-border bg-background/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <LogIn className="h-4 w-4 text-primary" /> Acessar como aluno
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Entre no app como marcos para iniciar o treino no presencial.
                </p>
                <button className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Entrar →
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
            {TABS.map((t, i) => (
              <button
                key={t}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Contato */}
          <section className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold">Contato</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field icon={Mail} label="Email" value="marcosalan.bcc@gmail.com" />
              <Field icon={Phone} label="Telefone" value="(83) 99634-0118" />
              <Field icon={ShieldAlert} label="Telefone de Emergência" value="Não informado" />
            </div>
          </section>

          {/* Dados Pessoais */}
          <section className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold">Dados Pessoais</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field icon={Calendar} label="Data de Nascimento" value="02/09/1988" />
              <Field
                icon={User}
                label="Gênero"
                valueNode={
                  <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs">Feminino</span>
                }
              />
              <Field icon={Clock} label="Último Acesso" value="Hoje" />
            </div>
          </section>

          {/* Ranking */}
          <section className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold">Ranking</h3>
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Ranking</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  marcos ainda não está no ranking. Treinos concluídos colocam o aluno na disputa.
                </p>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
                <Pencil className="h-4 w-4" /> Editar dados
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
                <Power className="h-4 w-4" /> Desativar aluno
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive hover:bg-destructive/15">
                <Trash2 className="h-4 w-4" /> Excluir aluno
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Cadastrado em 06/07/2026 · Atualizado em 06/07/2026
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
