import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, Plus, Info, ArrowDownToLine, PlayCircle, Link as LinkIcon, FileText, ArrowDown } from "lucide-react";
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
        <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-8 sm:pt-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">Financeiro</h1>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-accent"
            >
              <PlayCircle className="h-3.5 w-3.5 text-primary" /> Tutorial em vídeo
            </button>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">Como cobrar do aluno no cactusfitness</p>

          {/* Wallet card */}
          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Disponível para saque
                </p>
                <p className="mt-1 font-display text-3xl font-bold tracking-tight">R$ 0,00</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-primary/40 px-5 text-xs font-semibold text-primary-foreground/70 cursor-not-allowed"
                >
                  <ArrowDownToLine className="h-4 w-4" /> Sacar
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-5 text-xs font-semibold hover:bg-accent"
                >
                  <Plus className="h-4 w-4" /> Adicionar conta bancária
                </button>
              </div>
            </div>
          </section>

          {/* Fees */}
          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Taxas e prazos</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PIX</p>
                <p className="mt-1 font-display text-lg font-bold">R$ 2,99 <span className="text-sm font-medium text-muted-foreground">+ 1%</span></p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Compensação em até 7 dias</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cartão à vista</p>
                <p className="mt-1 font-display text-lg font-bold">R$ 1,49 <span className="text-sm font-medium text-muted-foreground">+ 4%</span></p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Compensação em até 31 dias</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              As taxas são descontadas automaticamente. O valor líquido é creditado na sua carteira após a compensação.
            </p>
          </section>

          {/* Tabs */}
          <section className="mt-4 rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 pt-3">
              {(
                [
                  { id: "planos", label: "Planos", icon: Wallet },
                  { id: "links", label: "Links", icon: LinkIcon },
                  { id: "extrato", label: "Extrato", icon: FileText },
                  { id: "saques", label: "Saques", icon: ArrowDown },
                ] as { id: Tab; label: string; icon: React.ElementType }[]
              ).map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-2 text-xs font-semibold transition ${
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                    {active && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              {tab === "planos" && <PlanosTab />}
              {tab === "links" && <EmptyState title="Nenhum link de cobrança" description="Crie links para cobrar avulsos e enviar aos alunos." />}
              {tab === "extrato" && <EmptyState title="Sem lançamentos" description="Suas movimentações aparecerão aqui." />}
              {tab === "saques" && <EmptyState title="Nenhum saque solicitado" description="Adicione uma conta bancária para solicitar saques." />}
            </div>
          </section>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

function PlanosTab() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">0 plano(s) ativo(s)</p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> Criar
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-border/60 bg-background/30 p-8 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Wallet className="h-5 w-5" />
        </div>
        <h3 className="font-display text-sm font-bold">Nenhum plano criado</h3>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          Crie planos mensais para cobrar seus alunos de forma recorrente.
        </p>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-background/30 p-8 text-center">
      <h3 className="font-display text-sm font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
