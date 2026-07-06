import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home, Calendar, GraduationCap, SlidersHorizontal, Plus, Bell, Share2,
  ChevronLeft, ChevronRight, Play, X, PartyPopper, CircleDollarSign,
  Activity, Wallet, Cake, ShoppingBag, CreditCard, ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/personal/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda · cactusfitness" },
      { name: "description", content: "Gerencie seus eventos, feriados, cobranças, aniversários e mais." },
    ],
  }),
  component: AgendaPage,
});

/* ---------- Sidebar (mesmo padrão do Início) ---------- */

const NAV = [
  { icon: Home, label: "Início", to: "/" as const },
  { icon: Calendar, label: "Agenda", to: "/dashboard/personal/agenda" as const, active: true },
  { icon: GraduationCap, label: "Tutoriais", to: "/" as const },
  { icon: SlidersHorizontal, label: "Configurações", to: "/" as const },
];

function SidebarIconBtn({
  icon: Icon, active, badge, to, onClick, variant = "ghost",
}: {
  icon: React.ElementType; active?: boolean; badge?: string; to?: string;
  onClick?: () => void; variant?: "ghost" | "primary";
}) {
  const base = "relative grid h-11 w-11 place-items-center rounded-[10px] transition";
  const styles =
    variant === "primary"
      ? "h-8 w-8 bg-primary text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110"
      : active
      ? "bg-primary/20 text-primary"
      : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground";
  const inner = (
    <>
      {active && <span className="absolute -left-3.5 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
      <Icon className={variant === "primary" ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.75} />
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </>
  );
  if (to) return <Link to={to} className={`${base} ${styles}`}>{inner}</Link>;
  return <button onClick={onClick} className={`${base} ${styles}`}>{inner}</button>;
}

function IconRail() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center gap-2 border-r border-border bg-sidebar py-4 md:flex">
      <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl">
        <svg viewBox="0 0 32 32" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8 L10 24 L16 14 L22 24 L28 8" />
        </svg>
      </div>
      {NAV.map((n) => (
        <SidebarIconBtn key={n.label} icon={n.icon} active={n.active} to={n.to} />
      ))}
      <div className="mt-auto flex flex-col items-center gap-2">
        <SidebarIconBtn icon={Plus} variant="primary" />
        <SidebarIconBtn icon={Bell} badge="3" />
        <div className="relative">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-destructive text-xs font-bold text-white ring-1 ring-border hover:ring-border-strong font-display">
            ML
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-sidebar" />
        </div>
      </div>
    </aside>
  );
}

/* ---------- Calendar ---------- */

// Julho 2026: 1° cai em quarta-feira. Grid começa no domingo.
// Semana 0 preenche com jun/28..jun/30.
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

type Cell = { day: number; muted?: boolean };

function buildJuly2026(): Cell[] {
  const cells: Cell[] = [];
  // dom 28 seg 29 ter 30 (junho)
  cells.push({ day: 28, muted: true }, { day: 29, muted: true }, { day: 30, muted: true });
  for (let d = 1; d <= 31; d++) cells.push({ day: d });
  // completa até 42 células com agosto (1..)
  let a = 1;
  while (cells.length < 42) cells.push({ day: a++, muted: true });
  return cells;
}

function MiniCalendar({ selected = 6 }: { selected?: number }) {
  const cells = buildJuly2026();
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">julho 2026</div>
        <div className="flex items-center gap-1">
          <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
        {cells.map((c, i) => {
          const isSelected = !c.muted && c.day === selected;
          return (
            <button
              key={i}
              className={`grid aspect-square place-items-center rounded-md transition ${
                c.muted
                  ? "text-muted-foreground/40"
                  : isSelected
                  ? "bg-accent font-semibold text-foreground ring-1 ring-border"
                  : "text-foreground/80 hover:bg-accent"
              }`}
            >
              {c.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Category chips ---------- */

const CATEGORIES: { icon: React.ElementType; label: string; color: string }[] = [
  { icon: PartyPopper, label: "Feriados", color: "text-emerald-400" },
  { icon: CircleDollarSign, label: "Cobranças", color: "text-amber-400" },
  { icon: Activity, label: "Vencimento de treino", color: "text-fuchsia-400" },
  { icon: Wallet, label: "Liberação de saldo", color: "text-emerald-400" },
  { icon: Cake, label: "Aniversários", color: "text-pink-400" },
  { icon: ShoppingBag, label: "Vendas", color: "text-sky-400" },
  { icon: CreditCard, label: "Sua assinatura", color: "text-indigo-400" },
];

function CategoryChip({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-border-strong">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span>{label}</span>
    </button>
  );
}

/* ---------- Modal ---------- */

const COLORS = [
  "bg-emerald-500", "bg-sky-500", "bg-amber-500",
  "bg-red-500", "bg-fuchsia-500", "bg-slate-400",
];

function NovoEventoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [publico, setPublico] = useState(false);
  const [multiDia, setMultiDia] = useState(false);
  const [recorrente, setRecorrente] = useState(false);
  const [cor, setCor] = useState(0);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold font-display">Criar novo evento</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {/* Público toggle */}
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Disponibilizar para agendamento público</div>
              <Toggle checked={publico} onChange={setPublico} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Aparece no seu link <code className="rounded bg-accent px-1 py-0.5 text-[11px] text-foreground">/p/seu-apelido/agendar</code> para qualquer pessoa marcar.
            </p>
          </div>

          <Field label="Título">
            <input placeholder="Nome do evento" className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </Field>

          <Field label="Descrição">
            <textarea placeholder="Detalhes do evento" rows={3} className="w-full resize-none rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </Field>

          <Field label="Local">
            <input placeholder="Local do evento" className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input type="date" defaultValue="2026-07-06" className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </Field>
            <Field label="Horário">
              <input type="time" defaultValue="08:00" className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </Field>
          </div>

          <Field label="Cor">
            <div className="flex items-center gap-2">
              {COLORS.map((c, i) => (
                <button
                  key={c}
                  onClick={() => setCor(i)}
                  className={`h-7 w-7 rounded-full ${c} transition ${
                    cor === i ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : "opacity-90 hover:opacity-100"
                  }`}
                  aria-label={`Cor ${i + 1}`}
                />
              ))}
            </div>
          </Field>

          <Field label="Aluno (opcional)">
            <div className="relative">
              <select className="w-full appearance-none rounded-lg border border-border bg-background/40 px-3 py-2 pr-9 text-sm focus:border-primary focus:outline-none">
                <option>Selecione um aluno</option>
                <option>Nenhum aluno</option>
                <option>marcos Lisboa</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-3 text-sm">
              <Toggle checked={multiDia} onChange={setMultiDia} />
              <span>Evento de vários dias</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Toggle checked={recorrente} onChange={setRecorrente} />
              <span>Evento recorrente</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
          >
            Cancelar
          </button>
          <button className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110">
            Criar evento
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-fg-secondary">{label}</div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
        checked ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ---------- Page ---------- */

function AgendaPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail />

      <main className="px-6 py-6 md:ml-[72px] md:px-8 md:py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight font-display">Agenda</h1>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
              <Share2 className="h-4 w-4" /> Compartilhar link
            </button>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110"
            >
              <Plus className="h-4 w-4" /> Novo evento
            </button>
          </div>
        </div>

        {/* Tutorial banner */}
        <button className="mt-6 flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-border-strong">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
              <Play className="h-4 w-4 fill-current" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Tutorial em vídeo</div>
              <div className="text-sm font-semibold">Como usar agenda na cactusfitness</div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Categories */}
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <CategoryChip key={c.label} icon={c.icon} label={c.label} color={c.color} />
          ))}
        </div>

        {/* Grid: calendar + upcoming */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,380px)_1fr]">
          <div className="space-y-4">
            <MiniCalendar selected={6} />
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">06 de julho</div>
                <div className="flex items-center gap-1">
                  <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhum evento para este dia</div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Próximos 7 dias</h2>
            <div className="grid min-h-[280px] place-items-center text-sm text-muted-foreground">
              Nenhum evento próximo
            </div>
          </div>
        </div>
      </main>

      <NovoEventoModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
