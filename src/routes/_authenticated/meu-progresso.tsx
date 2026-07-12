import { requireAlunoRole } from "@/lib/route-guards";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  TrendingUp,
  BarChart3,
  Dumbbell,
  ChevronDown,
  Clock,
  MessageSquareText,
  Check,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlunoShell } from "@/components/AlunoShell";
import { useCurrentUser } from "@/lib/auth";
import {
  getMyProgress,
  type HistoryItem,
  type MuscleRow,
  type WeekPoint,
} from "@/lib/progress.functions";

export const Route = createFileRoute("/_authenticated/meu-progresso")({
  beforeLoad: ({ location }) => requireAlunoRole(location),
  head: () => ({
    meta: [
      { title: "Meu Progresso · cactusfitness" },
      { name: "description", content: "Acompanhe seu volume, frequência e histórico de treinos." },
    ],
  }),
  component: MeuProgressoPage,
});

function MeuProgressoPage() {
  const { profile } = useCurrentUser();
  const fetchProgress = useServerFn(getMyProgress);
  const { data, isLoading } = useQuery({
    queryKey: ["my-progress", profile?.id],
    queryFn: () => fetchProgress(),
    enabled: !!profile?.id,
    staleTime: 60_000,
  });

  const volume: WeekPoint[] = data?.volume ?? [];
  const frequency: WeekPoint[] = data?.frequency ?? [];
  const muscles: MuscleRow[] = data?.muscles ?? [];
  const history: HistoryItem[] = data?.history ?? [];

  return (
    <AlunoShell>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl md:left-[72px]">
        <div className="flex items-center px-4 py-4 md:px-6">
          <h1 className="font-display text-xl font-bold">Meu Progresso</h1>
        </div>
      </header>

      <main className="p-4 pt-[76px] md:p-6 md:pt-[84px]">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-5">
            <VolumeCard data={volume} loading={isLoading} />
            <FrequencyCard data={frequency} loading={isLoading} />
            <MuscleCard data={muscles} loading={isLoading} />
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Histórico de treinos
              </h3>
              <span className="text-xs text-muted-foreground">
                {history.length} {history.length === 1 ? "registro" : "registros"}
              </span>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center rounded-lg border border-border bg-card py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card py-8 text-center text-sm text-muted-foreground">
                Nenhum treino concluído ainda. Registre seu primeiro treino para ver seu progresso.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <HistoryCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </AlunoShell>
  );
}

function CardShell({
  icon,
  iconClass,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  iconClass?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card text-foreground transition-all">
      <div className="flex flex-col space-y-1.5 px-4 pt-4 pb-2">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-foreground">
          <span className={`inline-flex h-4 w-4 items-center justify-center ${iconClass ?? "text-primary"}`}>
            {icon}
          </span>
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="px-2 pb-4 pt-0">{children}</div>
    </div>
  );
}

function VolumeCard({ data, loading }: { data: WeekPoint[]; loading: boolean }) {
  return (
    <CardShell
      icon={<TrendingUp className="h-4 w-4" />}
      title="Volume semanal"
      subtitle="Total de carga × reps por semana (kg)"
    >
      <div className="h-[200px] w-full sm:h-[240px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="week" fontSize={10} stroke="#888" tickLine={false} axisLine={false} />
              <YAxis fontSize={10} stroke="#888" tickLine={false} axisLine={false} width={30} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </CardShell>
  );
}

function FrequencyCard({ data, loading }: { data: WeekPoint[]; loading: boolean }) {
  return (
    <CardShell
      icon={<BarChart3 className="h-4 w-4" />}
      iconClass="text-blue-500"
      title="Frequência semanal"
      subtitle="Treinos concluídos por semana"
    >
      <div className="h-[200px] w-full sm:h-[240px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="week" fontSize={10} stroke="#888" tickLine={false} axisLine={false} />
              <YAxis fontSize={10} stroke="#888" tickLine={false} axisLine={false} width={30} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="rgb(59, 130, 246)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </CardShell>
  );
}

function MuscleCard({ data, loading }: { data: MuscleRow[]; loading: boolean }) {
  const max = Math.max(1, ...data.map((m) => m.primary + m.secondary));
  return (
    <div className="rounded-xl border border-border bg-card text-foreground">
      <div className="flex flex-col space-y-1.5 px-4 pt-4 pb-2">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-foreground">
          <Dumbbell className="h-4 w-4 text-purple-500" />
          Grupamento muscular
        </h3>
        <p className="text-xs text-muted-foreground">Séries por grupo muscular (total acumulado)</p>
      </div>
      <div className="px-4 pt-0 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Sem dados ainda — conclua um treino para começar a acompanhar.
          </p>
        ) : (
          <div className="space-y-2.5">
            {data.map((m) => {
              const pct = ((m.primary + m.secondary) / max) * 100;
              return (
                <div key={m.name} className="flex items-center gap-3">
                  <span
                    className="w-24 shrink-0 truncate text-right text-xs text-muted-foreground"
                    title={m.name}
                  >
                    {m.name}
                  </span>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-muted/50">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-purple-600/80 to-purple-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-y-0 left-2.5 z-10 flex items-center text-xs font-bold text-white">
                      {m.primary + m.secondary}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-[0.625rem] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-purple-500" />
            Primário
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-pink-400" />
            Secundário
          </span>
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent/40"
      >
        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted/40">
          <span className="text-[0.625rem] font-medium uppercase leading-none text-muted-foreground">
            {item.weekday}
          </span>
          <span className="text-sm font-bold leading-tight text-foreground/80">{item.date}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{item.name}</p>
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="truncate">{item.personal}</span>
            <span className="text-border">·</span>
            <span className="truncate">Fase: {item.fase}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3 w-3" />
              {item.exercises} exerc.
            </span>
            <span className="tabular-nums">
              {item.seriesDone}/{item.seriesTotal} séries
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.minutes}min
            </span>
            <span>Sem. {item.week}</span>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          <div className="grid grid-cols-3 gap-2 px-3 pb-3 pt-1">
            <StatBox label="Séries" value={`${item.seriesDone}/${item.seriesTotal}`} />
            <StatBox label="Reps totais" value={String(item.totalReps)} />
            <StatBox label="Volume" value={item.volume} />
          </div>

          <div className="border-t border-border">
            {item.reaction && (
              <div className="px-3 pt-3">
                <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquareText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      Resposta do personal
                    </span>
                  </div>
                  <p className="text-2xl leading-none">{item.reaction}</p>
                </div>
              </div>
            )}

            <div className="space-y-2 p-3">
              {item.exerciseList.map((ex, idx) => (
                <div key={idx} className="rounded-lg bg-muted/20 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <p className="flex-1 truncate text-sm font-medium">{ex.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {ex.done}/{ex.total}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 px-1 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                      <div className="w-6 text-center">#</div>
                      <div className="text-center">Reps</div>
                      <div className="text-center">Carga</div>
                      <div className="w-5" />
                    </div>
                    {ex.sets.map((s) => (
                      <div
                        key={s.n}
                        className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 rounded px-1 py-1 text-xs"
                      >
                        <div className="w-6 text-center text-muted-foreground">{s.n}</div>
                        <div className="text-center font-medium">{s.reps}</div>
                        <div className="text-center">{s.load}</div>
                        <div className="flex w-5 items-center justify-center">
                          <Check className="h-3 w-3 text-emerald-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/30 px-2.5 py-1.5">
      <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
