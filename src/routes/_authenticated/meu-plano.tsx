import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, History, CheckCircle2, CreditCard, Copy, Loader2 } from "lucide-react";
import { AlunoShell } from "@/components/AlunoShell";
import { useCurrentUser } from "@/lib/auth";
import { getMyPlan, type PlanPayment } from "@/lib/plan.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/meu-plano")({
  head: () => ({
    meta: [
      { title: "Meu Plano · cactusfitness" },
      { name: "description", content: "Acompanhe seu plano, mensalidades e pagamentos." },
    ],
  }),
  component: MeuPlanoPage,
});

const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getUTCFullYear()}`;
};

function StatusBadge({ status }: { status: PlanPayment["status"] | "ativa" }) {
  // Reference uses only two visual variants: primary (ativa/pago) and neutral (pendente/atrasado)
  const map: Record<string, string> = {
    ativa: "border-primary/20 bg-primary/15 text-primary",
    pago: "border-primary/20 bg-primary/15 text-primary",
    pendente: "border-border bg-surface-3 text-fg-muted",
    atrasado: "border-border bg-surface-3 text-fg-muted",
  };
  const label =
    status === "ativa"
      ? "Ativa"
      : status === "pago"
      ? "Pago"
      : status === "atrasado"
      ? "Atrasado"
      : "Pendente";
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-semibold ${map[status]}`}
    >
      {label}
    </div>
  );
}

function MeuPlanoPage() {
  const { profile } = useCurrentUser();
  const fetchPlan = useServerFn(getMyPlan);
  const { data, isLoading } = useQuery({
    queryKey: ["my-plan", profile?.id],
    queryFn: () => fetchPlan(),
    enabled: !!profile?.id,
    staleTime: 60_000,
  });

  const pending = data?.pending ?? [];
  const history = data?.history ?? [];

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText("cactusfitness-pix-copia-e-cola");
      toast.success("Código PIX copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const relativeDue = (days: number) => {
    if (days === 0) return "Vence hoje";
    if (days > 0) return `Vence em ${days} dia${days === 1 ? "" : "s"}`;
    return `Atrasado há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`;
  };

  return (
    <AlunoShell>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl md:left-[72px]">
        <div className="flex items-center gap-3 px-4 py-4 md:px-6">
          <h1 className="font-display text-xl font-bold flex-1">Meu Plano</h1>
        </div>
      </header>

      <main className="px-3 sm:px-4 py-4 sm:py-6 mx-auto max-w-2xl space-y-5 pt-[80px] md:pt-[88px]">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !data?.hasPlan ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 font-display font-bold text-lg">Nenhum plano ativo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Assim que seu personal ou academia lançar uma mensalidade, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Card do plano */}
            <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display font-bold text-lg">{data.planName}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.orgName ?? (data.personalName ? `Personal ${data.personalName}` : "Personal solo")}
                  </p>
                </div>
                <StatusBadge status={data.active ? "ativa" : "pendente"} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-bold text-sm">
                    {money(data.valorMensal)}
                    <span className="text-xs font-normal text-muted-foreground">/mês</span>
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">Dia cobrança</p>
                  <p className="font-bold text-sm">
                    {data.diaCobranca ? `Dia ${data.diaCobranca}` : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">Pagamento</p>
                  <p className="font-bold text-sm">{data.method}</p>
                </div>
              </div>
            </div>

            {/* Pagamentos pendentes */}
            {pending.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display font-bold text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Pagamentos pendentes
                </h2>
                {pending.map((p) => {
                  const overdue = p.status === "atrasado";
                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border p-4 space-y-3 ${
                        overdue
                          ? "border-red-500/40 bg-red-500/5"
                          : "border-amber-500/40 bg-amber-500/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{p.descricao || data.planName}</p>
                          <p className="text-xs text-muted-foreground">
                            {money(p.valor)} · {relativeDue(p.daysUntilDue)}
                          </p>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toast.info("Redirecionando para o pagamento…")}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pagar agora
                        </button>
                        <button
                          onClick={copyPix}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar PIX
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Histórico */}
            <div className="space-y-3">
              <h2 className="font-display font-bold text-base flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Histórico de pagamentos
              </h2>
              {history.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                  Nenhum pagamento registrado ainda.
                </div>
              ) : (
                history.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{money(p.valor)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.method}</span>
                      <span>Vencimento: {fmtDate(p.competencia)}</span>
                    </div>
                    {p.status === "pago" && p.pago_em ? (
                      <p className="text-xs text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Pago em {fmtDate(p.pago_em)}
                      </p>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => toast.info("Redirecionando para o pagamento…")}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90"
                        >
                          Pagar
                        </button>
                        <button
                          onClick={copyPix}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-muted"
                        >
                          Copiar PIX
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </AlunoShell>
  );
}
