import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Wallet,
  Plus,
  ArrowDownToLine,
  PlayCircle,
  Link as LinkIcon,
  FileText,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  Users,
} from "lucide-react";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/_authenticated/dashboard/personal/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro · cactusfitness" },
      { name: "description", content: "Gerencie planos, links de cobrança, extrato e saques da sua carteira." },
    ],
  }),
  component: FinanceiroPage,
});

type Tab = "planos" | "links" | "extrato" | "saques";

function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>("planos");

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />
      <main className="pb-24 md:ml-[72px] md:pb-0">
        <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-8 sm:pt-8">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Financeiro</h1>

          {/* Tutorial banner */}
          <button
            type="button"
            className="mt-6 flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:bg-accent/40"
          >
            <div className="relative grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
              <PlayCircle className="h-7 w-7 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Tutorial em vídeo</p>
              <p className="mt-0.5 truncate text-sm font-semibold">Como cobrar do aluno no cactusfitness</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>

          {/* Wallet card */}
          <section className="mt-4 overflow-hidden rounded-2xl border border-primary/60 bg-card shadow-[0_0_40px_-15px_hsl(var(--primary)/0.6)]">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  <span>Disponível para saque</span>
                </div>
                <p className="mt-2 font-display text-4xl font-bold tracking-tight">R$ 0,00</p>
              </div>
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:brightness-110 sm:self-auto"
              >
                <ArrowDownToLine className="h-4 w-4" /> Sacar
              </button>
            </div>
            <div className="border-t border-border/60 p-3">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-foreground transition hover:bg-accent/40"
              >
                <Plus className="h-4 w-4" /> Adicionar conta bancária
              </button>
            </div>
          </section>

          {/* Fees */}
          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Taxas e prazos</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-background/40 p-4">
                <p className="text-sm font-semibold">PIX</p>
                <p className="mt-1 font-display text-lg font-bold text-primary">R$ 2,99 + 1%</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Compensação em até 7 dias</p>
              </div>
              <div className="rounded-xl bg-background/40 p-4">
                <p className="text-sm font-semibold">Cartão à vista</p>
                <p className="mt-1 font-display text-lg font-bold text-primary">R$ 1,49 + 4%</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Compensação em até 31 dias</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              As taxas são descontadas automaticamente. O valor líquido é creditado na sua carteira após a compensação.
            </p>
          </section>

          {/* Tabs pill */}
          <div className="mt-5 grid grid-cols-4 gap-1 rounded-full border border-border bg-card p-1">
            {(
              [
                { id: "planos", label: "Planos" },
                { id: "links", label: "Links" },
                { id: "extrato", label: "Extrato" },
                { id: "saques", label: "Saques" },
              ] as { id: Tab; label: string }[]
            ).map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-full py-2.5 text-sm font-semibold transition ${
                    active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            {tab === "planos" && <PlanosTab />}
            {tab === "links" && <EmptyState icon={LinkIcon} title="Nenhum link de cobrança" description="Crie links para cobrar avulsos e enviar aos alunos." />}
            {tab === "extrato" && <EmptyState icon={FileText} title="Sem lançamentos" description="Suas movimentações aparecerão aqui." />}
            {tab === "saques" && <EmptyState icon={ArrowDown} title="Nenhum saque solicitado" description="Adicione uma conta bancária para solicitar saques." />}
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

function PlanosTab() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">1 plano(s) ativo(s)</p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Criar Plano
        </button>
      </div>

      <button
        type="button"
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left transition hover:bg-accent/40"
      >
        <div className="min-w-0">
          <p className="font-display text-base font-bold">Forte</p>
          <div className="mt-1 flex items-center gap-3 text-sm">
            <span className="font-semibold text-primary">R$ 60,00<span className="text-xs font-medium text-muted-foreground">/mês</span></span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> 1
            </span>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-sm font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
