import type { Scope } from "@/lib/scope";
import { useState } from "react";
import {
  Wallet,
  Plus,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Users,
  Link as LinkIcon,
  FileText,
  ArrowLeft,
  Pencil,
  XCircle,
  History,
  Calendar,
  Receipt,
  UserMinus,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

type Tab = "planos" | "links" | "extrato" | "saques";

export function FinanceiroPage({ scope }: { scope: Scope }) {
  const [tab, setTab] = useState<Tab>("planos");
  const router = useRouter();


  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail scope={scope} />
      <div className="md:ml-[72px]">
        <header className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-border">
          <button
            type="button"
            onClick={() => router.history.back()}
            aria-label="Voltar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary hover:text-primary active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold font-display">Financeiro</h1>
        </header>

        <main className="px-3 sm:px-4 py-4 sm:py-6 mx-auto max-w-5xl space-y-5 pb-24 md:pb-6">

          {/* Wallet */}
          <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="h-4 w-4" /> Disponível para saque
                </p>
                <p className="text-3xl font-bold mt-1">R$ 0,00</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full font-semibold bg-primary text-primary-foreground h-8 px-4 py-2 text-xs transition hover:brightness-110 active:scale-95"
              >
                <ArrowDown className="h-4 w-4" /> Sacar
              </button>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full font-semibold border border-border bg-transparent text-foreground hover:border-primary hover:text-primary px-4 py-2 text-xs w-full h-9 transition active:scale-95"
            >
              <Plus className="h-4 w-4" /> Adicionar conta bancária
            </button>
          </div>

          {/* Fees */}
          <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taxas e prazos</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-muted/40 p-2.5">
                <p className="text-xs font-medium">PIX</p>
                <p className="text-sm font-bold text-primary">R$ 2,99 + 1%</p>
                <p className="text-[0.625rem] text-muted-foreground mt-0.5">Compensação em até 7 dias</p>
              </div>
              <div className="rounded-md bg-muted/40 p-2.5">
                <p className="text-xs font-medium">Cartão à vista</p>
                <p className="text-sm font-bold text-primary">R$ 1,49 + 4%</p>
                <p className="text-[0.625rem] text-muted-foreground mt-0.5">Compensação em até 31 dias</p>
              </div>
            </div>
            <p className="text-[0.625rem] text-muted-foreground">
              As taxas são descontadas automaticamente. O valor líquido é creditado na sua carteira após a compensação.
            </p>
          </div>

          {/* Tabs */}
          <div>
            <div
              role="tablist"
              className="h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full grid grid-cols-4"
            >
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
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                      active ? "bg-background text-foreground shadow-sm" : ""
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 mt-4">
              {tab === "planos" && <PlanosTab />}
              {tab === "links" && <EmptyState icon={LinkIcon} title="Nenhum link de cobrança" description="Crie links para cobrar avulsos e envie aos alunos." />}
              {tab === "extrato" && <EmptyState icon={FileText} title="Sem lançamentos" description="Suas movimentações aparecerão aqui." />}
              {tab === "saques" && <EmptyState icon={ArrowDown} title="Nenhum saque solicitado" description="Adicione uma conta bancária para solicitar saques." />}
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

type PlanoModalMode = "create" | "edit";

function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);
  let out = p1;
  if (d.length > 3) out += "." + p2;
  if (d.length > 6) out += "." + p3;
  if (d.length > 9) out += "-" + p4;
  return out;
}

function isValidCPF(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
}

function PlanosTab() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PlanoModalMode>("create");
  const [expanded, setExpanded] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [periodo, setPeriodo] = useState("mensal");

  const [alunoOpen, setAlunoOpen] = useState(false);
  const [alunoSel, setAlunoSel] = useState("");
  const [cpf, setCpf] = useState("");
  const [diaCobranca, setDiaCobranca] = useState("5");
  const [aceitaPix, setAceitaPix] = useState(true);
  const [aceitaCartao, setAceitaCartao] = useState(false);
  const [testeGratis, setTesteGratis] = useState(false);

  const [plano, setPlano] = useState({ nome: "Forte", valor: "60,00", periodo: "mensal" });
  const [histOpen, setHistOpen] = useState(false);
  type Pagamento = {
    id: string;
    valor: string;
    metodo: string;
    vencimento: string;
    taxa: string;
    liquido: string;
    status: "pendente" | "pago";
    pagoEm?: string;
  };
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([
    {
      id: "p1",
      valor: "60,00",
      metodo: "Pix",
      vencimento: "05/08/2026",
      taxa: "3,59",
      liquido: "56,41",
      status: "pendente",
    },
  ]);
  const marcarPago = (id: string) => {
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, "0");
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const yyyy = hoje.getFullYear();
    setPagamentos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "pago", pagoEm: `${dd}/${mm}/${yyyy}` } : p,
      ),
    );
  };
  const deletarPagamento = (id: string) => {
    setPagamentos((prev) => prev.filter((p) => p.id !== id));
  };

  const canCreate = nome.trim().length > 0 && valor.trim().length > 0;
  const cpfDigits = cpf.replace(/\D/g, "");
  const cpfValid = isValidCPF(cpfDigits);
  const canAssociar = alunoSel.length > 0 && (aceitaPix || aceitaCartao) && cpfValid;

  const taxaPix = aceitaPix ? 2.99 : 0;
  const taxaCartao = aceitaCartao ? 1.49 : 0;
  const taxaTotal = (taxaPix + taxaCartao).toFixed(2).replace(".", ",");

  const periodoLabel: Record<string, string> = {
    mensal: "mês",
    trimestral: "trimestre",
    semestral: "semestre",
    anual: "ano",
  };

  const openCreate = () => {
    setMode("create");
    setNome("");
    setValor("");
    setPeriodo("mensal");
    setOpen(true);
  };

  const openEdit = () => {
    setMode("edit");
    setNome(plano.nome);
    setValor(plano.valor);
    setPeriodo(plano.periodo);
    setOpen(true);
  };

  const handleSave = () => {
    if (mode === "edit") {
      setPlano({ nome: nome.trim(), valor: valor.trim(), periodo });
    }
    setOpen(false);
  };


  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">1 plano(s) ativo(s)</p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full font-semibold bg-primary text-primary-foreground h-8 px-4 py-2 text-xs transition hover:brightness-110 active:scale-95"
        >
          <Plus className="h-4 w-4" /> Criar Plano
        </button>
      </div>

      <div className="rounded-xl border border-primary/40 bg-card transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full p-4 flex items-center justify-between text-left active:scale-[0.99] transition-transform"
        >
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-base truncate">{plano.nome}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-primary font-semibold">
                R$ {plano.valor}<span className="text-xs text-muted-foreground font-normal">/{periodoLabel[plano.periodo] ?? plano.periodo}</span>
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> 1
              </span>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {expanded && (
          <div className="border-t border-border/50">
            <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/40">
              <button
                type="button"
                onClick={() => {
                  setAlunoSel("");
                  setCpf("");
                  setDiaCobranca("5");
                  setAceitaPix(true);
                  setAceitaCartao(false);
                  setTesteGratis(false);
                  setAlunoOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full font-semibold bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground py-2 h-7 text-xs px-2 active:scale-95 transition-transform"
              >
                <Plus className="h-3.5 w-3.5" /> Aluno
              </button>
              <button
                type="button"
                onClick={openEdit}
                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full font-semibold bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground py-2 h-7 text-xs px-2 active:scale-95 transition-transform"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full font-semibold bg-transparent hover:bg-muted py-2 h-7 text-xs px-2 text-destructive active:scale-95 transition-transform ml-auto"
                aria-label="Excluir plano"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-border/40">
              <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div
                  className="h-2 w-2 rounded-full shrink-0 bg-yellow-500"
                  title="Aguardando"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">marcos Lisboa</p>
                  <p className="text-[0.6875rem] text-muted-foreground">Dia 5 · Pix</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    title="Histórico"
                    onClick={() => setHistOpen(true)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all"
                  >
                    <History className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Validade do plano"
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Gerar cobrança"
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-90 transition-all"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Remover do plano"
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
              {mode === "edit" ? "Editar Plano de Cobrança" : "Criar Plano de Cobrança"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do plano</Label>
              <Input
                id="nome"
                placeholder="Ex: Mensalidade"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="valor"
                  placeholder="0,00"
                  inputMode="numeric"
                  className="pl-9"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger>
                  <SelectValue placeholder="Mensal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              variant="outline"
              className="rounded-full h-10 px-6"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-full h-10 px-6"
              disabled={!canCreate}
              onClick={handleSave}
            >
              {mode === "edit" ? "Salvar" : "Criar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={alunoOpen} onOpenChange={setAlunoOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
              Associar aluno ao plano
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Aluno</Label>
              <Select value={alunoSel} onValueChange={setAlunoSel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marcos">marcos Lisboa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpfAluno">CPF do aluno</Label>
              <Input
                id="cpfAluno"
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                aria-invalid={cpf.length > 0 && !cpfValid}
              />
              {cpf.length > 0 && !cpfValid && (
                <p className="text-xs text-destructive">CPF inválido</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataCobranca">Dia de cobrança (1-28)</Label>
              <Input
                id="dataCobranca"
                type="number"
                min={1}
                max={28}
                value={diaCobranca}
                onChange={(e) => setDiaCobranca(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Formas de pagamento aceitas</Label>
              <p className="text-xs text-muted-foreground">
                Quando você seleciona as duas, o aluno escolhe como pagar no link de cobrança.
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/40 transition-colors">
                  <Checkbox
                    checked={aceitaPix}
                    onCheckedChange={(v) => setAceitaPix(v === true)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Pix</p>
                    <p className="text-xs text-muted-foreground">R$ 2,99 + 1% por cobrança</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/40 transition-colors">
                  <Checkbox
                    checked={aceitaCartao}
                    onCheckedChange={(v) => setAceitaCartao(v === true)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Cartão</p>
                    <p className="text-xs text-muted-foreground">R$ 1,49 + 4% por cobrança</p>
                  </div>
                </label>
              </div>
              {(aceitaPix || aceitaCartao) && (
                <div className="rounded-lg bg-muted px-3 py-2 text-xs">
                  <p className="text-foreground/80">
                    Taxa por cobrança: <span className="font-semibold">R$ {taxaTotal}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Período de teste grátis</Label>
                <Switch checked={testeGratis} onCheckedChange={setTesteGratis} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              variant="outline"
              className="rounded-full h-10 px-6"
              onClick={() => setAlunoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-full h-10 px-6"
              disabled={!canAssociar}
              onClick={() => setAlunoOpen(false)}
            >
              Associar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={histOpen} onOpenChange={setHistOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
              Pagamentos — marcos Lisboa
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {pagamentos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                Nenhum pagamento registrado.
              </div>
            ) : (
              pagamentos.map((p) => {
                const pago = p.status === "pago";
                return (
                  <div key={p.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">R$ {p.valor}</span>
                      <div
                        className={
                          pago
                            ? "inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-[11px] font-semibold text-primary"
                            : "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-0.5 text-[11px] font-semibold text-muted-foreground"
                        }
                      >
                        {pago ? "Pago" : "Pendente"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.metodo}</span>
                      <span>Vencimento: {p.vencimento}</span>
                    </div>
                    {pago && p.pagoEm && (
                      <div className="text-xs text-primary">Pago em {p.pagoEm}</div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Taxa: R$ {p.taxa}</span>
                      <span>Líquido: R$ {p.liquido}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {!pago && (
                        <button
                          type="button"
                          onClick={() => marcarPago(p.id)}
                          className="inline-flex items-center justify-center whitespace-nowrap font-semibold border border-border bg-transparent text-foreground hover:border-primary hover:text-primary px-4 py-2 h-7 text-xs gap-1.5 rounded-full active:scale-[0.97] transition-all"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> marcar como pago
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deletarPagamento(p.id)}
                        className="inline-flex items-center justify-center whitespace-nowrap font-semibold bg-transparent px-4 py-2 h-7 text-xs gap-1.5 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-[0.97] transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> deletar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="font-display text-sm font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
