import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, Loader2, Save, Plus, Trash2, Upload, X,
  Activity, Ruler, Bone, HeartPulse, Zap, StretchHorizontal, Dumbbell,
  Weight, Camera, PersonStanding, FileText, Share2, Image as ImageIcon,
  Sparkles, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { generateAvaliacaoAnalysis } from "@/lib/avaliacao-ai.functions";

export const Route = createFileRoute("/_authenticated/_personal/dashboard/personal/avaliacao/$avaliacaoId")({
  head: () => ({
    meta: [
      { title: "Avaliação Física · cactusfitness" },
      { name: "description", content: "Formulário completo de avaliação física." },
    ],
  }),
  component: AvaliacaoPage,
});

type Avaliacao = {
  id: string;
  aluno_id: string;
  assessment_date: string;
  composicao_corporal: Record<string, string>;
  perimetros: Record<string, string>;
  peso_osseo: Record<string, string>;
  vo2max: Record<string, string>;
  neuromotora: Record<string, string>;
  banco_wells: Record<string, string>;
  dinamometria: Record<string, string>;
  teste_rm: { exercicios?: Array<{ nome: string; carga: string; reps: string }>; observacoes?: string };
  fotos: Record<string, string>;
  postural: Record<string, string>;
  ia_analysis: string | null;
  ia_visible_to_aluno: boolean;
};

function useAvaliacao(id: string) {
  return useQuery({
    queryKey: ["avaliacao", id],
    queryFn: async (): Promise<Avaliacao & { aluno: { full_name: string } }> => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select("*, aluno:alunos!inner(full_name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as unknown as Avaliacao & { aluno: { full_name: string } };
    },
  });
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function AvaliacaoPage() {
  const { avaliacaoId } = Route.useParams();
  const { data, isLoading } = useAvaliacao(avaliacaoId);

  if (isLoading || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />
      <main className="pb-24 md:ml-[72px] md:pb-0">
        <header className="sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 bg-background/60 p-4 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/40 md:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold sm:text-2xl">Avaliação Física</h1>
              <p className="truncate text-xs text-muted-foreground">{data.aluno.full_name} · {formatDate(data.assessment_date)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 text-sm font-semibold hover:bg-accent">
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 text-sm font-semibold hover:bg-accent">
              <Share2 className="h-4 w-4" /> Compartilhar
            </button>
            <Link
              to="/dashboard/personal/avaliacoes/$alunoId"
              params={{ alunoId: data.aluno_id }}
              aria-label="Fechar"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-4xl space-y-3 p-4 md:p-6">
          <AnaliseIACard avaliacao={data} />
          <ResultadosCard avaliacao={data} />
          <ComposicaoCorporalCard avaliacao={data} />
          <PerimetrosCard avaliacao={data} />
          <PesoOsseoCard avaliacao={data} />
          <Vo2MaxCard avaliacao={data} />
          <NeuromotoraCard avaliacao={data} />
          <BancoWellsCard avaliacao={data} />
          <DinamometriaCard avaliacao={data} />
          <TesteRMCard avaliacao={data} />
          <FotosCard avaliacao={data} />
          <PosturalCard avaliacao={data} />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

/* ------------ Análise IA + Resultados ------------ */

function toNum(v: string | undefined | null): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function computeIMC(comp: Record<string, string>): number | null {
  const peso = toNum(comp?.peso);
  const alturaCm = toNum(comp?.altura);
  if (!peso || !alturaCm) return null;
  const m = alturaCm / 100;
  if (m <= 0) return null;
  return peso / (m * m);
}

function imcClass(v: number): string {
  if (v < 18.5) return "Abaixo do peso";
  if (v < 25) return "Peso normal";
  if (v < 30) return "Sobrepeso";
  if (v < 35) return "Obesidade I";
  if (v < 40) return "Obesidade II";
  return "Obesidade III";
}

function ResultadosCard({ avaliacao }: { avaliacao: Avaliacao }) {
  const imc = computeIMC(avaliacao.composicao_corporal);
  if (imc == null) return null;
  return (
    <div className="rounded-[22px] border border-border bg-card p-5 md:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resultados</p>
      <div className="mt-3 flex flex-wrap items-end gap-8">
        <div>
          <p className="font-display text-4xl font-bold text-primary">{imc.toFixed(1)}</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">IMC</p>
        </div>
        <div>
          <p className="font-display text-sm font-semibold">{imcClass(imc)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">Classificação</p>
        </div>
      </div>
    </div>
  );
}

function AnaliseIACard({ avaliacao }: { avaliacao: Avaliacao }) {
  const qc = useQueryClient();
  const generate = useServerFn(generateAvaliacaoAnalysis);

  const gen = useMutation({
    mutationFn: async () => generate({ data: { avaliacaoId: avaliacao.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avaliacao", avaliacao.id] });
      toast.success("Análise gerada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao gerar análise"),
  });

  const toggleVisible = useMutation({
    mutationFn: async (v: boolean) => {
      const { error } = await supabase
        .from("avaliacoes")
        .update({ ia_visible_to_aluno: v })
        .eq("id", avaliacao.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avaliacao", avaliacao.id] }),
  });

  const hasComp = Boolean(avaliacao.composicao_corporal?.peso && avaliacao.composicao_corporal?.altura);
  if (!hasComp && !avaliacao.ia_analysis) return null;

  return (
    <div className="rounded-[22px] border border-primary/30 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(198,255,0,0.12),transparent_55%)] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-base font-semibold">Análise da IA</p>
            {avaliacao.ia_analysis && (
              <button
                type="button"
                onClick={() => gen.mutate()}
                disabled={gen.isPending}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                {gen.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Regenerar
              </button>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          visível para o aluno
          <Switch
            checked={avaliacao.ia_visible_to_aluno}
            onCheckedChange={(v) => toggleVisible.mutate(v)}
          />
        </label>
      </div>

      <div className="mt-4 text-sm leading-relaxed text-foreground/90">
        {avaliacao.ia_analysis ? (
          avaliacao.ia_analysis.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap">{p}</p>
          ))
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border/60 p-4">
            <p className="text-xs text-muted-foreground">
              Gere uma análise personalizada com base nos dados preenchidos.
            </p>
            <button
              type="button"
              onClick={() => gen.mutate()}
              disabled={gen.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
            >
              {gen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Gerar análise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------ Reusable Collapsible section ------------ */


function Section({
  icon: Icon, title, subtitle, colorClass, children,
}: { icon: React.ElementType; title: string; subtitle?: string; colorClass: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[22px] border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 bg-surface-2 p-4 text-left hover:bg-surface-hover/60 md:p-5"
      >
        <Icon className={`h-5 w-5 shrink-0 ${colorClass}`} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-border bg-surface-1 p-4 md:p-6">{children}</div>}
    </div>
  );
}

function useSaveSection<K extends keyof Avaliacao>(id: string, column: K) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Avaliacao[K]) => {
      const patch = { [column as string]: payload } as never;
      const { error } = await supabase.from("avaliacoes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["avaliacao", id] }),
  });
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        className="h-9 border-border-subtle bg-background text-foreground shadow-none focus-visible:ring-primary/35 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.,-]/g, "");
          onChange(v);
        }}
      />
    </div>
  );
}
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input className="h-9 border-border-subtle bg-background text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/35" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function SelectField({ label, value, onChange, options, placeholder = "Selecione" }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-9 border-border-subtle bg-background text-foreground shadow-none focus:ring-primary/35">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-t-[4px] rounded-b-[10px] border-border bg-popover/95 backdrop-blur-xl">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="rounded-md text-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
function AreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5 md:col-span-full">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Textarea className="border-border-subtle bg-background text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/35" value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
    </div>
  );
}

function SaveButton({ label, onClick, pending }: { label: string; onClick: () => void; pending: boolean }) {
  return (
    <div className="mt-5 flex justify-start">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {label}
      </button>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-3 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">{children}</h4>;
}

/* ------------ Sections ------------ */

function useForm<T extends Record<string, string>>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const set = (k: keyof T, v: string) => setState((s) => ({ ...s, [k]: v }));
  return [state, set] as const;
}

const PROTOCOLO_OPTIONS = [
  { value: "pollock_7", label: "Pollock 7 Dobras" },
  { value: "pollock_3", label: "Pollock 3 Dobras" },
  { value: "guedes_3", label: "Guedes 3 Dobras" },
  { value: "faulkner", label: "Faulkner 4 Dobras" },
  { value: "weltman", label: "Weltman" },
  { value: "us_navy", label: "US Navy (Fita Métrica)" },
  { value: "bioimpedancia", label: "Bioimpedância" },
];

const PROTOCOLO_FIELDS: Record<string, { key: string; label: string }[]> = {
  pollock_7: [
    { key: "peitoral", label: "Peitoral (mm)" },
    { key: "axilar_medial", label: "Axilar Medial (mm)" },
    { key: "triceps", label: "Triceps (mm)" },
    { key: "subescapular", label: "Subescapular (mm)" },
    { key: "abdominal", label: "Abdominal (mm)" },
    { key: "supra_iliaca", label: "Supra-iliaca (mm)" },
    { key: "coxa", label: "Coxa (mm)" },
  ],
  pollock_3: [
    { key: "peitoral", label: "Peitoral (mm)" },
    { key: "abdominal", label: "Abdominal (mm)" },
    { key: "coxa", label: "Coxa (mm)" },
  ],
  guedes_3: [
    { key: "triceps", label: "Triceps (mm)" },
    { key: "supra_iliaca", label: "Supra-iliaca (mm)" },
    { key: "abdominal", label: "Abdominal (mm)" },
  ],
  faulkner: [
    { key: "triceps", label: "Triceps (mm)" },
    { key: "subescapular", label: "Subescapular (mm)" },
    { key: "supra_iliaca", label: "Supra-iliaca (mm)" },
    { key: "abdominal", label: "Abdominal (mm)" },
  ],
  weltman: [
    { key: "circ_cintura", label: "Circunferência da Cintura (cm)" },
    { key: "circ_abdominal", label: "Circunferência Abdominal (cm)" },
  ],
  us_navy: [
    { key: "pescoco", label: "Pescoço (cm)" },
    { key: "cintura", label: "Cintura (cm)" },
    { key: "quadril", label: "Quadril (cm) — apenas mulheres" },
  ],
  bioimpedancia: [
    { key: "gordura_aparelho", label: "% Gordura (aparelho)" },
  ],
};

function ComposicaoCorporalCard({ avaliacao }: { avaliacao: Avaliacao }) {
  const [form, setForm] = useState<Record<string, string>>(() => ({
    peso: avaliacao.composicao_corporal.peso ?? "",
    altura: avaliacao.composicao_corporal.altura ?? "",
    meta_gordura: avaliacao.composicao_corporal.meta_gordura ?? "",
    protocolo: avaliacao.composicao_corporal.protocolo ?? "",
    ...avaliacao.composicao_corporal,
  }));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useSaveSection(avaliacao.id, "composicao_corporal");
  const protocoloFields = PROTOCOLO_FIELDS[form.protocolo] ?? [];
  return (
    <Section icon={Activity} title="Composição Corporal" colorClass="text-assessment-lime">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NumField label="Peso (kg)" value={form.peso} onChange={(v) => set("peso", v)} />
        <NumField label="Altura (cm)" value={form.altura} onChange={(v) => set("altura", v)} />
        <NumField label="Meta % Gordura" value={form.meta_gordura} onChange={(v) => set("meta_gordura", v)} />
      </div>
      <div className="mt-4">
        <SelectField
          label="Protocolo"
          value={form.protocolo}
          onChange={(v) => set("protocolo", v)}
          options={PROTOCOLO_OPTIONS}
          placeholder="Selecione o protocolo"
        />
      </div>
      {protocoloFields.length > 0 && (
        <>
          <SubHeading>Campos do Protocolo</SubHeading>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {protocoloFields.map((f) => (
              <NumField key={f.key} label={f.label} value={form[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
            ))}
          </div>
        </>
      )}
      <SaveButton label="Salvar Composição Corporal" onClick={() => save.mutate(form)} pending={save.isPending} />
    </Section>
  );
}

const PERIMETROS_SUP = ["Braço Dir. Relaxado", "Braço Esq. Relaxado", "Braço Dir. Contraído", "Braço Esq. Contraído", "Antebraço Direito", "Antebraço Esquerdo"];
const PERIMETROS_INF = ["Coxa Prox. Direita", "Coxa Prox. Esquerda", "Coxa Med. Direita", "Coxa Med. Esquerda", "Coxa Dist. Direita", "Coxa Dist. Esquerda", "Panturrilha Direita", "Panturrilha Esquerda"];
const PERIMETROS_TRONCO = ["Tórax", "Ombro", "Cintura", "Abdômen", "Quadril", "Pescoço"];
const keyOf = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function PerimetrosCard({ avaliacao }: { avaliacao: Avaliacao }) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const all = [...PERIMETROS_SUP, ...PERIMETROS_INF, ...PERIMETROS_TRONCO];
    return Object.fromEntries(all.map((l) => [keyOf(l), avaliacao.perimetros[keyOf(l)] ?? ""]));
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useSaveSection(avaliacao.id, "perimetros");
  const renderGroup = (labels: string[]) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {labels.map((l) => <NumField key={l} label={l} value={form[keyOf(l)] ?? ""} onChange={(v) => set(keyOf(l), v)} />)}
    </div>
  );
  return (
    <Section icon={Ruler} title="Perímetros" colorClass="text-assessment-cyan">
      <SubHeading>Membros Superiores (cm)</SubHeading>
      {renderGroup(PERIMETROS_SUP)}
      <SubHeading>Membros Inferiores (cm)</SubHeading>
      {renderGroup(PERIMETROS_INF)}
      <SubHeading>Tronco e Outros (cm)</SubHeading>
      {renderGroup(PERIMETROS_TRONCO)}
      <SaveButton label="Salvar Perímetros" onClick={() => save.mutate(form)} pending={save.isPending} />
    </Section>
  );
}

function PesoOsseoCard({ avaliacao }: { avaliacao: Avaliacao }) {
  const [form, set] = useForm({
    punho: avaliacao.peso_osseo.punho ?? "",
    umero: avaliacao.peso_osseo.umero ?? "",
    femur: avaliacao.peso_osseo.femur ?? "",
  });
  const save = useSaveSection(avaliacao.id, "peso_osseo");
  return (
    <Section icon={Bone} title="Peso Ósseo" subtitle="Informe os diâmetros ósseos para calcular o peso ósseo estimado (fórmula de Martin)." colorClass="text-assessment-violet">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NumField label="Punho (cm)" value={form.punho} onChange={(v) => set("punho", v)} />
        <NumField label="Úmero (cm)" value={form.umero} onChange={(v) => set("umero", v)} />
        <NumField label="Fêmur (cm)" value={form.femur} onChange={(v) => set("femur", v)} />
      </div>
      <SaveButton label="Salvar Peso Ósseo" onClick={() => save.mutate(form)} pending={save.isPending} />
    </Section>
  );
}

function Vo2MaxCard({ avaliacao }: { avaliacao: Avaliacao }) {
  const [form, set] = useForm({
    protocolo: avaliacao.vo2max.protocolo ?? "",
    vo2max: avaliacao.vo2max.vo2max ?? "",
    fc_repouso: avaliacao.vo2max.fc_repouso ?? "",
    fc_maxima: avaliacao.vo2max.fc_maxima ?? "",
    pa_sist_pre: avaliacao.vo2max.pa_sist_pre ?? "",
    pa_diast_pre: avaliacao.vo2max.pa_diast_pre ?? "",
    pa_sist_pos: avaliacao.vo2max.pa_sist_pos ?? "",
    pa_diast_pos: avaliacao.vo2max.pa_diast_pos ?? "",
    glicemia_pre: avaliacao.vo2max.glicemia_pre ?? "",
    glicemia_pos: avaliacao.vo2max.glicemia_pos ?? "",
    observacoes: avaliacao.vo2max.observacoes ?? "",
  });
  const save = useSaveSection(avaliacao.id, "vo2max");
  return (
    <Section icon={HeartPulse} title="VO2máx" colorClass="text-assessment-rose">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField label="Protocolo do Teste" value={form.protocolo} onChange={(v) => set("protocolo", v)} options={[
          { value: "cooper", label: "Cooper 12min" },
          { value: "bruce", label: "Bruce (esteira)" },
          { value: "astrand", label: "Åstrand (bicicleta)" },
          { value: "rockport", label: "Rockport (caminhada)" },
        ]} />
        <NumField label="VO2máx (ml/kg/min)" value={form.vo2max} onChange={(v) => set("vo2max", v)} />
        <NumField label="FC Repouso (bpm)" value={form.fc_repouso} onChange={(v) => set("fc_repouso", v)} />
        <NumField label="FC Máxima (bpm)" value={form.fc_maxima} onChange={(v) => set("fc_maxima", v)} />
      </div>
      <SubHeading>Pressão Arterial — Antes do Teste</SubHeading>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumField label="PA Sistólica Pré (mmHg)" value={form.pa_sist_pre} onChange={(v) => set("pa_sist_pre", v)} />
        <NumField label="PA Diastólica Pré (mmHg)" value={form.pa_diast_pre} onChange={(v) => set("pa_diast_pre", v)} />
      </div>
      <SubHeading>Pressão Arterial — Após o Teste</SubHeading>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumField label="PA Sistólica Pós (mmHg)" value={form.pa_sist_pos} onChange={(v) => set("pa_sist_pos", v)} />
        <NumField label="PA Diastólica Pós (mmHg)" value={form.pa_diast_pos} onChange={(v) => set("pa_diast_pos", v)} />
      </div>
      <SubHeading>Glicemia (Glicosímetro)</SubHeading>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumField label="Glicemia Pré (mg/dL)" value={form.glicemia_pre} onChange={(v) => set("glicemia_pre", v)} />
        <NumField label="Glicemia Pós (mg/dL)" value={form.glicemia_pos} onChange={(v) => set("glicemia_pos", v)} />
      </div>
      <div className="mt-4">
        <AreaField label="Observações" value={form.observacoes} onChange={(v) => set("observacoes", v)} />
      </div>
      <SaveButton label="Salvar VO2máx" onClick={() => save.mutate(form)} pending={save.isPending} />
    </Section>
  );
}

function NeuromotoraCard({ avaliacao }: { avaliacao: Avaliacao }) {
  const [form, set] = useForm({
    wells: avaliacao.neuromotora.wells ?? "",
    abdominal: avaliacao.neuromotora.abdominal ?? "",
    flexao_braco: avaliacao.neuromotora.flexao_braco ?? "",
    impulsao_vertical: avaliacao.neuromotora.impulsao_vertical ?? "",
    impulsao_horizontal: avaliacao.neuromotora.impulsao_horizontal ?? "",
    agilidade_t: avaliacao.neuromotora.agilidade_t ?? "",
    observacoes: avaliacao.neuromotora.observacoes ?? "",
  });
  const save = useSaveSection(avaliacao.id, "neuromotora");
  return (
    <Section icon={Zap} title="Avaliação Neuromotora" colorClass="text-assessment-amber">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumField label="Flexibilidade - Banco Wells (cm)" value={form.wells} onChange={(v) => set("wells", v)} />
        <NumField label="Abdominal 1min (reps)" value={form.abdominal} onChange={(v) => set("abdominal", v)} />
        <NumField label="Flexão de Braço (reps)" value={form.flexao_braco} onChange={(v) => set("flexao_braco", v)} />
        <NumField label="Impulsão Vertical (cm)" value={form.impulsao_vertical} onChange={(v) => set("impulsao_vertical", v)} />
        <NumField label="Impulsão Horizontal (cm)" value={form.impulsao_horizontal} onChange={(v) => set("impulsao_horizontal", v)} />
        <NumField label="Agilidade - Teste T (seg)" value={form.agilidade_t} onChange={(v) => set("agilidade_t", v)} />
        <AreaField label="Observações" value={form.observacoes} onChange={(v) => set("observacoes", v)} />
      </div>
      <SaveButton label="Salvar Neuromotor" onClick={() => save.mutate(form)} pending={save.isPending} />
    </Section>
  );
}

function BancoWellsCard({ avaliacao }: { avaliacao: Avaliacao }) {
  const [form, set] = useForm({
    alcance: avaliacao.banco_wells.alcance ?? "",
    alcance_dir: avaliacao.banco_wells.alcance_dir ?? "",
    alcance_esq: avaliacao.banco_wells.alcance_esq ?? "",
    sexo: avaliacao.banco_wells.sexo ?? "",
    idade: avaliacao.banco_wells.idade ?? "",
    compensacoes: avaliacao.banco_wells.compensacoes ?? "",
    limitacoes: avaliacao.banco_wells.limitacoes ?? "",
    observacoes: avaliacao.banco_wells.observacoes ?? "",
  });
  const save = useSaveSection(avaliacao.id, "banco_wells");
  return (
    <Section icon={StretchHorizontal} title="Banco de Wells (Sit-and-Reach)" colorClass="text-assessment-sky">
      <p className="mb-4 rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Instruções:</span> O avaliado senta com as pernas estendidas, pés apoiados na caixa. Braços estendidos à frente, uma mão sobre a outra. Flexionar o tronco lentamente empurrando o cursor o mais longe possível. Manter a posição por 2 segundos. Registrar o melhor de 3 tentativas.
      </p>
      <SubHeading>Resultado Bilateral</SubHeading>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumField label="Alcance (cm)" value={form.alcance} onChange={(v) => set("alcance", v)} />
      </div>
      <SubHeading>Avaliação Unilateral (opcional)</SubHeading>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumField label="Alcance Direito (cm)" value={form.alcance_dir} onChange={(v) => set("alcance_dir", v)} />
        <NumField label="Alcance Esquerdo (cm)" value={form.alcance_esq} onChange={(v) => set("alcance_esq", v)} />
      </div>
      <SubHeading>Classificação (idade e sexo)</SubHeading>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField label="Sexo" value={form.sexo} onChange={(v) => set("sexo", v)} options={[
          { value: "masculino", label: "Masculino" },
          { value: "feminino", label: "Feminino" },
        ]} />
        <NumField label="Idade" value={form.idade} onChange={(v) => set("idade", v)} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4">
        <TextField label="Compensações observadas" value={form.compensacoes} onChange={(v) => set("compensacoes", v)} />
        <TextField label="Dor / Limitações" value={form.limitacoes} onChange={(v) => set("limitacoes", v)} />
        <AreaField label="Observações" value={form.observacoes} onChange={(v) => set("observacoes", v)} />
      </div>
      <SaveButton label="Salvar Banco de Wells" onClick={() => save.mutate(form)} pending={save.isPending} />
    </Section>
  );
}

const DINA_SUP = ["Preensão Manual D.", "Preensão Manual E.", "Flexão Cotovelo D.", "Flexão Cotovelo E.", "Extensão Cotovelo D.", "Extensão Cotovelo E.", "Flexão Ombro D.", "Flexão Ombro E.", "Extensão Ombro D.", "Extensão Ombro E.", "Abdução Ombro D.", "Abdução Ombro E."];
const DINA_TRONCO = ["Flexão Tronco", "Extensão Tronco"];
const DINA_INF = ["Flexão Quadril D.", "Flexão Quadril E.", "Extensão Quadril D.", "Extensão Quadril E.", "Flexão Joelho D.", "Flexão Joelho E.", "Extensão Joelho D.", "Extensão Joelho E.", "Dorsiflexão Tornozelo D.", "Dorsiflexão Tornozelo E.", "Flexão Plantar D.", "Flexão Plantar E."];

function DinamometriaCard({ avaliacao }: { avaliacao: Avaliacao }) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const all = [...DINA_SUP, ...DINA_TRONCO, ...DINA_INF];
    const base = Object.fromEntries(all.map((l) => [keyOf(l), avaliacao.dinamometria[keyOf(l)] ?? ""]));
    return { ...base, observacoes: avaliacao.dinamometria.observacoes ?? "" };
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useSaveSection(avaliacao.id, "dinamometria");
  const group = (labels: string[]) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {labels.map((l) => <NumField key={l} label={l} value={form[keyOf(l)] ?? ""} onChange={(v) => set(keyOf(l), v)} />)}
    </div>
  );
  return (
    <Section icon={Dumbbell} title="Dinamometria" colorClass="text-assessment-orange">
      <SubHeading>Membros Superiores (kgf)</SubHeading>
      {group(DINA_SUP)}
      <SubHeading>Tronco (kgf)</SubHeading>
      {group(DINA_TRONCO)}
      <SubHeading>Membros Inferiores (kgf)</SubHeading>
      {group(DINA_INF)}
      <div className="mt-4"><AreaField label="Observações" value={form.observacoes ?? ""} onChange={(v) => set("observacoes", v)} /></div>
      <SaveButton label="Salvar Dinamometria" onClick={() => save.mutate(form)} pending={save.isPending} />
    </Section>
  );
}

function TesteRMCard({ avaliacao }: { avaliacao: Avaliacao }) {
  const [exs, setExs] = useState(() => avaliacao.teste_rm.exercicios ?? []);
  const [obs, setObs] = useState(avaliacao.teste_rm.observacoes ?? "");
  const save = useSaveSection(avaliacao.id, "teste_rm");
  const add = () => setExs((a) => [...a, { nome: "", carga: "", reps: "" }]);
  const upd = (i: number, k: "nome" | "carga" | "reps", v: string) => setExs((a) => a.map((e, idx) => idx === i ? { ...e, [k]: v } : e));
  const remove = (i: number) => setExs((a) => a.filter((_, idx) => idx !== i));
  return (
    <Section icon={Weight} title="Teste de RM (Epley)" subtitle="Fórmula de Epley: 1RM = carga × (1 + 0,033 × reps). Adicione os exercícios multiarticulares desejados." colorClass="text-assessment-emerald">
      <div className="space-y-3">
        {exs.length === 0 && (
          <p className="rounded-lg border border-dashed border-border bg-background/40 p-4 text-center text-xs text-muted-foreground">
            Nenhum exercício adicionado ainda.
          </p>
        )}
        {exs.map((e, i) => (
          <div key={i} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border bg-background/40 p-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
            <TextField label="Exercício" value={e.nome} onChange={(v) => upd(i, "nome", v)} placeholder="Ex: Supino reto" />
            <NumField label="Carga (kg)" value={e.carga} onChange={(v) => upd(i, "carga", v)} />
            <NumField label="Repetições" value={e.reps} onChange={(v) => upd(i, "reps", v)} />
            <button type="button" onClick={() => remove(i)} className="grid h-9 w-9 place-items-center rounded-md text-destructive hover:bg-destructive/10" aria-label="Remover">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-background/40 px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Adicionar Exercício
        </button>
        <div className="mt-2"><AreaField label="Observações" value={obs} onChange={setObs} /></div>
      </div>
      <SaveButton label="Salvar Teste de RM" onClick={() => save.mutate({ exercicios: exs, observacoes: obs })} pending={save.isPending} />
    </Section>
  );
}

const FOTOS_TIPOS = ["Frente Relaxado", "Costas Relaxado", "Frontal Contraído", "Costas Contraído", "Lateral Direito", "Lateral Esquerdo"];

function FotosCard({ avaliacao }: { avaliacao: Avaliacao }) {
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(FOTOS_TIPOS.map((t) => [keyOf(t), avaliacao.fotos[keyOf(t)] ?? ""])),
  );
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const save = useSaveSection(avaliacao.id, "fotos");

  const renderToast = (id: string | number, file: File, pct: number, status: "uploading" | "done" | "error", errMsg?: string) => {
    return (
      <div className="pointer-events-auto flex w-[340px] items-center gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-3 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6),0_0_40px_-10px_hsl(var(--primary)/0.35)] backdrop-blur-xl">
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
          {status === "uploading" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : status === "done" ? (
            <ImageIcon className="h-4 w-4 text-primary" />
          ) : (
            <X className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {status === "uploading" ? `Enviando... ${Math.round(pct)}%` : status === "done" ? "Enviado com sucesso" : errMsg ?? "Falha no envio"}
          </p>
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
  };

  const handleUpload = async (tipo: string, file: File) => {
    const k = keyOf(tipo);
    setUploading((u) => ({ ...u, [k]: true }));
    let pct = 0;
    const id = toast.custom(() => renderToast("tmp", file, pct, "uploading"), { duration: Infinity });
    const update = (p: number, status: "uploading" | "done" | "error", err?: string) =>
      toast.custom(() => renderToast(id, file, p, status, err), { id, duration: status === "uploading" ? Infinity : 3500 });
    const timer = setInterval(() => {
      pct = Math.min(pct + Math.random() * 18, 90);
      update(pct, "uploading");
    }, 220);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${avaliacao.id}/${k}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avaliacao-fotos").upload(path, file, {
        contentType: file.type, upsert: true,
      });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("avaliacao-fotos").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? "";
      const next = { ...form, [k]: url };
      setForm(next);
      await save.mutateAsync(next);
      clearInterval(timer);
      update(100, "done");
    } catch (e: any) {
      clearInterval(timer);
      update(pct, "error", e?.message);
    } finally {
      setUploading((u) => ({ ...u, [k]: false }));
    }
  };

  const handleRemove = async (tipo: string) => {
    const k = keyOf(tipo);
    const next = { ...form, [k]: "" };
    setForm(next);
    await save.mutateAsync(next);
  };

  return (
    <Section icon={Camera} title="Fotos" colorClass="text-assessment-fuchsia">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FOTOS_TIPOS.map((t) => {
          const k = keyOf(t);
          const url = form[k];
          const isUp = uploading[k];
          return (
            <div key={t}>
              <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground/70">{t}</p>
              <div className="group relative">
                <label className="relative flex aspect-[3/4] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/60 bg-background/20 transition hover:border-border hover:bg-background/40">
                  {url ? (
                    <img src={url} alt={t} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                      <Upload className="h-5 w-5" strokeWidth={1.5} />
                      <span className="text-xs">{isUp ? "Enviando..." : "Enviar"}</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(t, f); e.target.value = ""; }}
                  />
                </label>
                {url && (
                  <button
                    type="button"
                    onClick={() => handleRemove(t)}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-background/80 text-foreground opacity-0 backdrop-blur transition hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                    aria-label={`Remover ${t}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

const POST_ANT = ["Cabeça (inclinação)", "Ombros (nivelamento)", "Triângulo de Tales", "Crista Ilíaca", "Joelhos (valgo/varo)", "Pés (pronação/supinação)"];
const POST_LAT = ["Cabeça (projeção anterior)", "Cervical (lordose)", "Torácica (cifose)", "Lombar (lordose)", "Pelve (anteversão/retroversão)", "Joelhos (flexo/recurvatum)"];
const POST_POS = ["Cabeça (inclinação)", "Escápulas (simetria)", "Coluna (escoliose)", "Quadril (nivelamento)", "Pregas Glúteas", "Calcanhares (valgo/varo)"];

function PosturalCard({ avaliacao }: { avaliacao: Avaliacao }) {
  const kAnt = (l: string) => `ant_${keyOf(l)}`;
  const kLat = (l: string) => `lat_${keyOf(l)}`;
  const kPos = (l: string) => `pos_${keyOf(l)}`;
  const [form, setForm] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    POST_ANT.forEach((l) => (base[kAnt(l)] = avaliacao.postural[kAnt(l)] ?? ""));
    POST_LAT.forEach((l) => (base[kLat(l)] = avaliacao.postural[kLat(l)] ?? ""));
    POST_POS.forEach((l) => (base[kPos(l)] = avaliacao.postural[kPos(l)] ?? ""));
    base.obs_ant = avaliacao.postural.obs_ant ?? "";
    base.obs_lat = avaliacao.postural.obs_lat ?? "";
    base.obs_pos = avaliacao.postural.obs_pos ?? "";
    return base;
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useSaveSection(avaliacao.id, "postural");
  const group = (labels: string[], keyFn: (l: string) => string) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {labels.map((l) => <TextField key={keyFn(l)} label={l} value={form[keyFn(l)] ?? ""} onChange={(v) => set(keyFn(l), v)} />)}
    </div>
  );
  return (
    <Section icon={PersonStanding} title="Avaliação Postural" colorClass="text-assessment-blue">
      <SubHeading>Vista Anterior</SubHeading>
      {group(POST_ANT, kAnt)}
      <div className="mt-4"><AreaField label="Observações - Vista Anterior" value={form.obs_ant} onChange={(v) => set("obs_ant", v)} /></div>

      <SubHeading>Vista Lateral</SubHeading>
      {group(POST_LAT, kLat)}
      <div className="mt-4"><AreaField label="Observações - Vista Lateral" value={form.obs_lat} onChange={(v) => set("obs_lat", v)} /></div>

      <SubHeading>Vista Posterior</SubHeading>
      {group(POST_POS, kPos)}
      <div className="mt-4"><AreaField label="Observações - Vista Posterior" value={form.obs_pos} onChange={(v) => set("obs_pos", v)} /></div>

      <SaveButton label="Salvar Avaliação Postural" onClick={() => save.mutate(form)} pending={save.isPending} />
    </Section>
  );
}

