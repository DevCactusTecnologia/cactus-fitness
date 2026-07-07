import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Share2, Plus,
  ChevronLeft, ChevronRight, Play, X, PartyPopper, CircleDollarSign,
  Activity, Wallet, Cake, ShoppingBag, CreditCard, ChevronDown,
  Pencil, Trash2, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { IconRail } from "@/components/IconRail";

export const Route = createFileRoute("/_authenticated/dashboard/personal/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda · cactusfitness" },
      { name: "description", content: "Gerencie seus eventos, feriados, cobranças, aniversários e mais." },
    ],
  }),
  component: AgendaPage,
});

/* ---------- Types ---------- */

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string; // yyyy-mm-dd
  event_time: string; // HH:MM:SS
  color: number;
  student: string | null;
  is_public: boolean;
  multi_day: boolean;
  recurring: boolean;
};


/* ---------- Calendar ---------- */

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

type Cell = { day: number; muted?: boolean };

function buildJuly2026(): Cell[] {
  const cells: Cell[] = [];
  cells.push({ day: 28, muted: true }, { day: 29, muted: true }, { day: 30, muted: true });
  for (let d = 1; d <= 31; d++) cells.push({ day: d });
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
        {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
        {cells.map((c, i) => {
          const isSelected = !c.muted && c.day === selected;
          return (
            <button key={i}
              className={`grid aspect-square place-items-center rounded-md transition ${
                c.muted ? "text-muted-foreground/40"
                  : isSelected ? "bg-accent font-semibold text-foreground ring-1 ring-border"
                  : "text-foreground/80 hover:bg-accent"
              }`}>
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

type FormState = {
  title: string; description: string; location: string;
  event_date: string; event_time: string; color: number; student: string;
  is_public: boolean; multi_day: boolean; recurring: boolean;
};

const emptyForm: FormState = {
  title: "", description: "", location: "",
  event_date: new Date().toISOString().slice(0, 10), event_time: "08:00", color: 0, student: "",
  is_public: false, multi_day: false, recurring: false,
};

function NovoEventoModal({
  open, onClose, onSaved, editing,
}: {
  open: boolean; onClose: () => void; onSaved: () => void; editing: EventRow | null;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description ?? "",
        location: editing.location ?? "",
        event_date: editing.event_date,
        event_time: editing.event_time.slice(0, 5),
        color: editing.color,
        student: editing.student ?? "",
        is_public: editing.is_public,
        multi_day: editing.multi_day,
        recurring: editing.recurring,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, editing]);

  if (!open) return null;

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.title.trim()) { setError("Informe o título do evento."); return; }
    setSaving(true); setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) { setSaving(false); setError("Sessão expirada."); return; }
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      location: form.location || null,
      event_date: form.event_date,
      event_time: form.event_time,
      color: form.color,
      student: form.student || null,
      is_public: form.is_public,
      multi_day: form.multi_day,
      recurring: form.recurring,
    };
    const { error: err } = editing
      ? await supabase.from("events").update(payload).eq("id", editing.id)
      : await supabase.from("events").insert({ ...payload, personal_id: userId });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold font-display">{editing ? "Editar evento" : "Criar novo evento"}</h2>
          <button onClick={onClose} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Disponibilizar para agendamento público</div>
              <Toggle checked={form.is_public} onChange={(v) => update("is_public", v)} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Aparece no seu link <code className="rounded bg-accent px-1 py-0.5 text-[11px] text-foreground">/p/seu-apelido/agendar</code> para qualquer pessoa marcar.
            </p>
          </div>

          <Field label="Título">
            <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Nome do evento" className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </Field>

          <Field label="Descrição">
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Detalhes do evento" rows={3} className="w-full resize-none rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </Field>

          <Field label="Local">
            <input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Local do evento" className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input type="date" value={form.event_date} onChange={(e) => update("event_date", e.target.value)} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </Field>
            <Field label="Horário">
              <input type="time" value={form.event_time} onChange={(e) => update("event_time", e.target.value)} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </Field>
          </div>

          <Field label="Cor">
            <div className="flex items-center gap-2">
              {COLORS.map((c, i) => (
                <button key={c} onClick={() => update("color", i)}
                  className={`h-7 w-7 rounded-full ${c} transition ${
                    form.color === i ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : "opacity-90 hover:opacity-100"
                  }`} aria-label={`Cor ${i + 1}`} />
              ))}
            </div>
          </Field>

          <Field label="Aluno (opcional)">
            <AlunoSelect value={form.student} onChange={(v) => update("student", v)} />
          </Field>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-3 text-sm">
              <Toggle checked={form.multi_day} onChange={(v) => update("multi_day", v)} />
              <span>Evento de vários dias</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Toggle checked={form.recurring} onChange={(v) => update("recurring", v)} />
              <span>Evento recorrente</span>
            </label>
          </div>

          {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button onClick={onClose} className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-accent">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Salvar alterações" : "Criar evento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  open, onClose, onConfirm, title,
}: { open: boolean; onClose: () => void; onConfirm: () => void; title: string }) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl">
        <div className="px-5 py-4">
          <h3 className="text-base font-bold font-display">Excluir evento</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Tem certeza que deseja excluir <span className="font-semibold text-foreground">"{title}"</span>? Essa ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-accent">Cancelar</button>
          <button
            onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); }}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Excluir
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

function AlunoSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [items, setItems] = useState<{ id: string; full_name: string }[]>([]);
  useEffect(() => {
    supabase.from("alunos").select("id, full_name").eq("is_active", true).order("full_name")
      .then(({ data }) => setItems((data ?? []) as { id: string; full_name: string }[]));
  }, []);
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-border bg-background/40 px-3 py-2 pr-9 text-sm focus:border-primary focus:outline-none"
      >
        <option value="">Selecione um aluno</option>
        {items.map((a) => (
          <option key={a.id} value={a.full_name}>{a.full_name}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${checked ? "bg-primary" : "bg-border"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

/* ---------- Event card ---------- */

function EventCard({ ev, onEdit, onDelete }: { ev: EventRow; onEdit: () => void; onDelete: () => void }) {
  const dot = COLORS[ev.color] ?? COLORS[0];
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold">{ev.title}</div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} aria-label="Editar" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} aria-label="Excluir" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {new Date(ev.event_date + "T00:00:00").toLocaleDateString("pt-BR")} · {ev.event_time.slice(0, 5)}
          {ev.location ? ` · ${ev.location}` : ""}
        </div>
        {ev.description && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ev.description}</div>}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

function AgendaPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [deleting, setDeleting] = useState<EventRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });
    setEvents((data as EventRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleDelete() {
    if (!deleting) return;
    await supabase.from("events").delete().eq("id", deleting.id);
    setDeleting(null);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((e) => e.event_date === today);
  const upcoming = events.filter((e) => e.event_date >= today);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail />

      <main className="px-6 pb-24 pt-6 md:ml-[72px] md:px-8 md:py-8 md:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight font-display">Agenda</h1>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
              <Share2 className="h-4 w-4" /> Compartilhar link
            </button>
            <button
              onClick={() => { setEditing(null); setOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110"
            >
              <Plus className="h-4 w-4" /> Novo evento
            </button>
          </div>
        </div>

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

        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => <CategoryChip key={c.label} icon={c.icon} label={c.label} color={c.color} />)}
        </div>

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
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : todayEvents.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Nenhum evento para este dia</div>
              ) : (
                <div className="space-y-2">
                  {todayEvents.map((ev) => (
                    <EventCard key={ev.id} ev={ev}
                      onEdit={() => { setEditing(ev); setOpen(true); }}
                      onDelete={() => setDeleting(ev)} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Próximos eventos</h2>
            {loading ? (
              <div className="grid min-h-[280px] place-items-center text-sm text-muted-foreground">Carregando...</div>
            ) : upcoming.length === 0 ? (
              <div className="grid min-h-[280px] place-items-center text-sm text-muted-foreground">Nenhum evento próximo</div>
            ) : (
              <div className="mt-3 space-y-2">
                {upcoming.map((ev) => (
                  <EventCard key={ev.id} ev={ev}
                    onEdit={() => { setEditing(ev); setOpen(true); }}
                    onDelete={() => setDeleting(ev)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <NovoEventoModal
        open={open}
        editing={editing}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSaved={load}
      />
      <ConfirmDeleteModal
        open={!!deleting}
        title={deleting?.title ?? ""}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
      <MobileBottomNav />
    </div>
  );
}
