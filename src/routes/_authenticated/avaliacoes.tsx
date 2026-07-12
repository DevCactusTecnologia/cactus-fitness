import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Activity,
  Ruler,
  HeartPulse,
  Zap,
  PersonStanding,
  StretchHorizontal,
  Dumbbell,
  Weight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { AlunoShell } from "@/components/AlunoShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/avaliacoes")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Minhas Avaliações · cactusfitness" },
      { name: "description", content: "Consulte suas avaliações físicas." },
    ],
  }),
  component: AvaliacoesPage,
});

type Avaliacao = {
  id: string;
  assessment_date: string;
  composicao_corporal: Record<string, string> | null;
  perimetros: Record<string, string> | null;
  peso_osseo: Record<string, string> | null;
  vo2max: Record<string, string> | null;
  neuromotora: Record<string, string> | null;
  banco_wells: Record<string, string> | null;
  dinamometria: Record<string, string> | null;
  teste_rm: {
    exercicios?: Array<{ nome: string; carga: string; reps: string }>;
    observacoes?: string;
  } | null;
  postural: Record<string, string> | null;
  ia_analysis: string | null;
  ia_visible_to_aluno: boolean | null;
};

function useMinhasAvaliacoes() {
  return useQuery({
    queryKey: ["aluno-avaliacoes"],
    queryFn: async (): Promise<Avaliacao[]> => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select(
          "id, assessment_date, composicao_corporal, perimetros, peso_osseo, vo2max, neuromotora, banco_wells, dinamometria, teste_rm, postural, ia_analysis, ia_visible_to_aluno",
        )
        .order("assessment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Avaliacao[];
    },
  });
}

function formatDateLong(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function AvaliacoesPage() {
  const { id } = Route.useSearch();
  return (
    <AlunoShell>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:left-[72px]">
        <div className="flex items-center px-4 py-4 md:px-6">
          <h1 className="font-display text-xl font-bold">Minhas Avaliações</h1>
        </div>
      </header>
      {id ? <AvaliacaoDetalhe id={id} /> : <AvaliacoesLista />}
    </AlunoShell>
  );
}

/* ------------------ Lista ------------------ */

function AvaliacoesLista() {
  const { data, isLoading } = useMinhasAvaliacoes();
  const navigate = useNavigate();

  return (
    <main className="p-4 pt-[76px] md:p-6 md:pt-[84px]">
      <div className="mx-auto max-w-4xl space-y-4">


        {isLoading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <HeartPulse className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhuma avaliação disponível ainda. Assim que seu personal criar uma, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  navigate({ to: "/avaliacoes", search: { id: a.id } })
                }
                className="w-full cursor-pointer rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{formatDateLong(a.assessment_date)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {hasData(a.composicao_corporal) && (
                        <ChipItem icon={<Activity className="h-3 w-3" />} label="Composição" />
                      )}
                      {hasData(a.perimetros) && (
                        <ChipItem icon={<Ruler className="h-3 w-3" />} label="Perímetros" />
                      )}
                      {hasData(a.vo2max) && (
                        <ChipItem icon={<HeartPulse className="h-3 w-3" />} label="VO2" />
                      )}
                      {hasData(a.neuromotora) && (
                        <ChipItem icon={<Zap className="h-3 w-3" />} label="Neuro" />
                      )}
                      {hasData(a.postural) && (
                        <ChipItem icon={<PersonStanding className="h-3 w-3" />} label="Postural" />
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ChipItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function hasData(obj: Record<string, unknown> | null | undefined): boolean {
  if (!obj) return false;
  return Object.values(obj).some((v) => v !== null && v !== undefined && String(v).trim() !== "");
}

/* ------------------ Detalhe ------------------ */

function useAvaliacao(id: string) {
  return useQuery({
    queryKey: ["aluno-avaliacao", id],
    queryFn: async (): Promise<Avaliacao | null> => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select(
          "id, assessment_date, composicao_corporal, perimetros, peso_osseo, vo2max, neuromotora, banco_wells, dinamometria, teste_rm, postural, ia_analysis, ia_visible_to_aluno",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Avaliacao) ?? null;
    },
  });
}

function toNum(v: string | undefined | null): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function computeIMC(comp: Record<string, string> | null | undefined): number | null {
  if (!comp) return null;
  const peso = toNum(comp.peso);
  const alturaCm = toNum(comp.altura);
  if (!peso || !alturaCm) return null;
  const m = alturaCm / 100;
  if (m <= 0) return null;
  return peso / (m * m);
}

function AvaliacaoDetalhe({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useAvaliacao(id);

  if (isLoading) {
    return (
      <main className="p-4 pt-[76px] md:p-6 md:pt-[84px]">

        <div className="mx-auto grid max-w-4xl place-items-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="p-4 pt-[76px] md:p-6 md:pt-[84px]">

        <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Avaliação não encontrada.
        </div>
      </main>
    );
  }

  const imc = computeIMC(data.composicao_corporal);

  return (
    <main className="p-4 pt-[76px] md:p-6 md:pt-[84px]">
      <div className="mx-auto max-w-4xl space-y-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/avaliacoes", search: { id: undefined } })}
          className="mb-2 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para lista
        </button>

        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{formatDateLong(data.assessment_date)}</h2>
        </div>

        {data.ia_visible_to_aluno && data.ia_analysis && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 md:p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Análise do Personal
              </h3>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {data.ia_analysis}
            </p>
          </div>
        )}

        {imc != null && (
          <div className="rounded-xl border border-border bg-card p-4 md:p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Resultados
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{imc.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">IMC</p>
              </div>
            </div>
          </div>
        )}

        <SectionCard
          icon={<Activity className="h-5 w-5 text-primary" />}
          title="Composição Corporal"
          empty={!hasData(data.composicao_corporal)}
        >
          <FieldGrid
            fields={pickFields(data.composicao_corporal, [
              { key: "peso", label: "Peso", suffix: "kg" },
              { key: "altura", label: "Altura", suffix: "cm" },
              { key: "meta_gordura", label: "Meta % Gordura" },
              { key: "protocolo", label: "Protocolo" },
              { key: "gordura_aparelho", label: "% Gordura (aparelho)" },
              { key: "pescoco", label: "Pescoço", suffix: "cm" },
              { key: "cintura", label: "Cintura", suffix: "cm" },
              { key: "quadril", label: "Quadril", suffix: "cm" },
              { key: "circ_abdominal", label: "Circ. Abdominal", suffix: "cm" },
            ])}
          />
        </SectionCard>

        <SectionCard
          icon={<Ruler className="h-5 w-5 text-primary" />}
          title="Perímetros"
          empty={!hasData(data.perimetros)}
        >
          <PerimetrosView data={data.perimetros} />
        </SectionCard>

        <SectionCard
          icon={<HeartPulse className="h-5 w-5 text-primary" />}
          title="VO2máx"
          empty={!hasData(data.vo2max)}
        >
          <FieldGrid
            fields={pickFields(data.vo2max, [
              { key: "protocolo", label: "Protocolo" },
              { key: "vo2max", label: "VO2máx", suffix: "ml/kg/min" },
              { key: "fc_repouso", label: "FC Repouso", suffix: "bpm" },
              { key: "fc_maxima", label: "FC Máxima", suffix: "bpm" },
              { key: "pa_sist_pre", label: "PA Sistólica Pré", suffix: "mmHg" },
              { key: "pa_diast_pre", label: "PA Diastólica Pré", suffix: "mmHg" },
              { key: "pa_sist_pos", label: "PA Sistólica Pós", suffix: "mmHg" },
              { key: "pa_diast_pos", label: "PA Diastólica Pós", suffix: "mmHg" },
              { key: "glicemia_pre", label: "Glicemia Pré", suffix: "mg/dL" },
              { key: "glicemia_pos", label: "Glicemia Pós", suffix: "mg/dL" },
            ])}
            observation={data.vo2max?.observacoes}
          />
        </SectionCard>

        <SectionCard
          icon={<Zap className="h-5 w-5 text-primary" />}
          title="Avaliação Neuromotora"
          empty={!hasData(data.neuromotora)}
        >
          <FieldGrid
            fields={pickFields(data.neuromotora, [
              { key: "wells", label: "Banco Wells", suffix: "cm" },
              { key: "abdominal", label: "Abdominal 1min", suffix: "reps" },
              { key: "flexao_braco", label: "Flexão de Braço", suffix: "reps" },
              { key: "impulsao_vertical", label: "Impulsão Vertical", suffix: "cm" },
              { key: "impulsao_horizontal", label: "Impulsão Horizontal", suffix: "cm" },
              { key: "agilidade_t", label: "Agilidade Teste T", suffix: "seg" },
            ])}
            observation={data.neuromotora?.observacoes}
          />
        </SectionCard>

        <SectionCard
          icon={<StretchHorizontal className="h-5 w-5 text-primary" />}
          title="Banco de Wells"
          empty={!hasData(data.banco_wells)}
        >
          <FieldGrid
            fields={pickFields(data.banco_wells, [
              { key: "alcance", label: "Alcance", suffix: "cm" },
              { key: "alcance_dir", label: "Alcance Direito", suffix: "cm" },
              { key: "alcance_esq", label: "Alcance Esquerdo", suffix: "cm" },
              { key: "sexo", label: "Sexo" },
              { key: "idade", label: "Idade" },
              { key: "compensacoes", label: "Compensações" },
              { key: "limitacoes", label: "Limitações" },
            ])}
            observation={data.banco_wells?.observacoes}
          />
        </SectionCard>

        <SectionCard
          icon={<Dumbbell className="h-5 w-5 text-primary" />}
          title="Dinamometria"
          empty={!hasData(data.dinamometria)}
        >
          <DinamometriaView data={data.dinamometria} />
        </SectionCard>

        <SectionCard
          icon={<Weight className="h-5 w-5 text-primary" />}
          title="Teste de RM"
          empty={!data.teste_rm || (!data.teste_rm.exercicios?.length && !data.teste_rm.observacoes)}
        >
          <TesteRMView data={data.teste_rm} />
        </SectionCard>

        <SectionCard
          icon={<PersonStanding className="h-5 w-5 text-primary" />}
          title="Avaliação Postural"
          empty={!hasData(data.postural)}
        >
          <FieldGrid
            fields={Object.entries(data.postural ?? {})
              .filter(([, v]) => v && String(v).trim() !== "")
              .map(([k, v]) => ({ label: labelize(k), value: String(v) }))}
          />
        </SectionCard>
      </div>
    </main>
  );
}

/* ------------------ Helpers ------------------ */

function SectionCard({
  icon,
  title,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!empty);
  if (empty) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 transition-colors hover:bg-accent/40 md:p-5"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-border p-4 pt-0 md:p-5">{children}</div>}
    </div>
  );
}

type Field = { label: string; value: string; suffix?: string };

function pickFields(
  data: Record<string, string> | null | undefined,
  spec: Array<{ key: string; label: string; suffix?: string }>,
): Field[] {
  if (!data) return [];
  return spec
    .map((s) => ({ label: s.label, value: String(data[s.key] ?? "").trim(), suffix: s.suffix }))
    .filter((f) => f.value !== "");
}

function FieldGrid({ fields, observation }: { fields: Field[]; observation?: string }) {
  if (!fields.length && !observation) {
    return <p className="mt-4 text-sm text-muted-foreground">Sem dados registrados.</p>;
  }
  return (
    <div className="mt-4 space-y-4">
      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {fields.map((f) => (
            <div key={f.label} className="space-y-1">
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p className="text-sm font-medium">
                {f.value}
                {f.suffix ? ` ${f.suffix}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
      {observation && (
        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Observações</p>
          <p className="whitespace-pre-wrap text-sm">{observation}</p>
        </div>
      )}
    </div>
  );
}

const PERIMETROS_SUP = [
  "Braço Dir. Relaxado",
  "Braço Esq. Relaxado",
  "Braço Dir. Contraído",
  "Braço Esq. Contraído",
  "Antebraço Direito",
  "Antebraço Esquerdo",
];
const PERIMETROS_INF = [
  "Coxa Prox. Direita",
  "Coxa Prox. Esquerda",
  "Coxa Med. Direita",
  "Coxa Med. Esquerda",
  "Coxa Dist. Direita",
  "Coxa Dist. Esquerda",
  "Panturrilha Direita",
  "Panturrilha Esquerda",
];
const PERIMETROS_TRONCO = ["Tórax", "Ombro", "Cintura", "Abdômen", "Quadril", "Pescoço"];

const DINA_SUP = [
  "Preensão Manual D.",
  "Preensão Manual E.",
  "Flexão Cotovelo D.",
  "Flexão Cotovelo E.",
  "Extensão Cotovelo D.",
  "Extensão Cotovelo E.",
  "Flexão Ombro D.",
  "Flexão Ombro E.",
  "Extensão Ombro D.",
  "Extensão Ombro E.",
  "Abdução Ombro D.",
  "Abdução Ombro E.",
];
const DINA_TRONCO = ["Flexão Tronco", "Extensão Tronco"];
const DINA_INF = [
  "Flexão Quadril D.",
  "Flexão Quadril E.",
  "Extensão Quadril D.",
  "Extensão Quadril E.",
  "Flexão Joelho D.",
  "Flexão Joelho E.",
  "Extensão Joelho D.",
  "Extensão Joelho E.",
  "Dorsiflexão Tornozelo D.",
  "Dorsiflexão Tornozelo E.",
  "Flexão Plantar D.",
  "Flexão Plantar E.",
];

const keyOf = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

function labelize(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function GroupedView({
  data,
  groups,
  unit,
}: {
  data: Record<string, string> | null | undefined;
  groups: Array<{ title: string; labels: string[] }>;
  unit: string;
}) {
  if (!data) return null;
  return (
    <div className="mt-4 space-y-4">
      {groups.map((g) => {
        const fields = g.labels
          .map((l) => ({ label: l, value: String(data[keyOf(l)] ?? "").trim() }))
          .filter((f) => f.value !== "");
        if (fields.length === 0) return null;
        return (
          <div key={g.title}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {g.title} ({unit})
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {fields.map((f) => (
                <div key={f.label} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-medium">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PerimetrosView({ data }: { data: Record<string, string> | null | undefined }) {
  return (
    <GroupedView
      data={data}
      unit="cm"
      groups={[
        { title: "Membros Superiores", labels: PERIMETROS_SUP },
        { title: "Membros Inferiores", labels: PERIMETROS_INF },
        { title: "Tronco e Outros", labels: PERIMETROS_TRONCO },
      ]}
    />
  );
}

function DinamometriaView({ data }: { data: Record<string, string> | null | undefined }) {
  return (
    <>
      <GroupedView
        data={data}
        unit="kgf"
        groups={[
          { title: "Membros Superiores", labels: DINA_SUP },
          { title: "Tronco", labels: DINA_TRONCO },
          { title: "Membros Inferiores", labels: DINA_INF },
        ]}
      />
      {data?.observacoes && (
        <div className="mt-4 space-y-1 border-t border-border pt-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Observações</p>
          <p className="whitespace-pre-wrap text-sm">{data.observacoes}</p>
        </div>
      )}
    </>
  );
}

function TesteRMView({
  data,
}: {
  data: Avaliacao["teste_rm"];
}) {
  const exs = data?.exercicios ?? [];
  return (
    <div className="mt-4 space-y-3">
      {exs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum exercício registrado.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Exercício</div>
            <div className="text-center">Carga</div>
            <div className="text-center">Reps</div>
          </div>
          {exs.map((e, i) => {
            const c = Number(String(e.carga).replace(",", "."));
            const r = Number(String(e.reps).replace(",", "."));
            const rm =
              Number.isFinite(c) && Number.isFinite(r) && c > 0 && r > 0
                ? c * (1 + 0.033 * r)
                : null;
            return (
              <div
                key={i}
                className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{e.nome || "—"}</p>
                  {rm != null && (
                    <p className="text-xs text-muted-foreground">1RM ≈ {rm.toFixed(1)} kg</p>
                  )}
                </div>
                <div className="text-center tabular-nums">{e.carga || "—"}</div>
                <div className="text-center tabular-nums">{e.reps || "—"}</div>
              </div>
            );
          })}
        </div>
      )}
      {data?.observacoes && (
        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Observações</p>
          <p className="whitespace-pre-wrap text-sm">{data.observacoes}</p>
        </div>
      )}
    </div>
  );
}
