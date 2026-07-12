import { createFileRoute } from "@tanstack/react-router";
import { useState, type ComponentType, type SVGProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Shield, ArrowUp, ArrowDown, Medal, Users, HelpCircle, Eye, X, Dumbbell, CalendarCheck, Zap, Loader2,
  Trophy, Crown, Gem, Footprints, ChevronRight, Calendar,
} from "lucide-react";
import { AlunoShell } from "@/components/AlunoShell";
import { useCurrentUser, firstName, initialsFromName } from "@/lib/auth";
import { colorForId } from "@/lib/avatar-color";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { getMyRanking, type RankingPlayer } from "@/lib/ranking.functions";

export const Route = createFileRoute("/_authenticated/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking · cactusfitness" },
      { name: "description", content: "Ranking semanal do seu grupo." },
    ],
  }),
  component: RankingPage,
});

const PROMO_LINE_AFTER = 7; // top 7 sobe
const DEMO_LINE_FROM = 15; // do 15 pra baixo cai

function RankingPage() {
  const { profile } = useCurrentUser();
  const [showPhoto, setShowPhoto] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  const fetchRanking = useServerFn(getMyRanking);
  const { data, isLoading } = useQuery({
    queryKey: ["ranking-me", profile?.id],
    queryFn: () => fetchRanking(),
    enabled: !!profile?.id,
    staleTime: 30_000,
  });

  const players = data?.players ?? [];
  const youRank = data?.youRank ?? null;
  const youPoints = data?.youPoints ?? 0;
  const totalInGroup = data?.totalInGroup ?? 0;

  return (
    <AlunoShell>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl md:left-[72px]">
        <div className="flex items-center gap-3 px-4 py-4 md:px-6">
          <h1 className="font-display text-xl font-bold flex-1">Ranking</h1>
          <div className="text-right text-xs leading-tight">
            <p className="text-muted-foreground">
              {data?.orgName ? `grupo · ${data.orgName}` : "semana"}
            </p>
            <p className="text-muted-foreground/60">reseta toda segunda</p>
          </div>
        </div>
      </header>

      <main className="p-4 pt-[80px] md:p-6 md:pt-[88px]">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Card divisão */}
          <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex items-center gap-4">
              <div
                className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl"
                style={{ backgroundColor: "rgba(205, 127, 50, 0.15)", border: "1.5px solid rgba(205, 127, 50, 0.4)" }}
              >
                <Shield className="h-11 w-11 text-[#9A5B12] dark:text-[#CD7F32]" fill="currentColor" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">sua divisão</p>
                <p className="font-display text-2xl font-extrabold leading-tight text-[#9A5B12] dark:text-[#CD7F32]">
                  Bronze
                </p>
                <div className="mt-2 flex items-center gap-4">
                  <div>
                    <p className="font-display text-lg font-bold tabular-nums">{youPoints}</p>
                    <p className="text-[0.625rem] text-muted-foreground/70">pontos</p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold tabular-nums">{youRank ? `${youRank}º` : "—"}</p>
                    <p className="text-[0.625rem] text-muted-foreground/70">no grupo</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                  <span className="text-muted-foreground">próxima</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#6B7280] dark:text-[#BFC7CE]">
                    <ArrowUp className="h-3.5 w-3.5" />
                    <Medal className="h-3.5 w-3.5" />
                    Prata
                  </span>
                  <span className="text-muted-foreground">· fique no top 7 pra subir</span>
                </div>
              </div>
            </div>
          </section>

          {/* Pill "no grupo" */}
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />
              no grupo
            </span>
          </div>

          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">carregando…</p>
          ) : totalInGroup === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              você ainda não faz parte de um grupo.
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              você está em{" "}
              <span className="font-display font-bold text-foreground">
                {youRank ? `${youRank}º` : "—"}
              </span>{" "}
              de {totalInGroup}
            </p>
          )}

          {/* Foto pública */}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">mostrar minha foto</p>
              <p className="text-[0.625rem] text-muted-foreground">
                quando ativado, os outros do grupo veem sua foto de perfil no ranking. desligado, aparecem só suas iniciais.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showPhoto}
              onClick={() => setShowPhoto((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent shadow-sm transition-colors ${
                showPhoto ? "bg-primary" : "bg-input"
              }`}
              aria-label="mostrar minha foto no ranking"
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full shadow-lg transition-transform ${
                  showPhoto ? "translate-x-5 bg-background" : "translate-x-0 bg-foreground"
                }`}
              />
            </button>
          </div>

          {/* Botão como pontuar */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setShowHowTo(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4 text-primary" /> como pontuar
            </button>
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((p, idx) => {
                const rank = idx + 1;
                const prevRank = idx;
                const showPromoDivider = prevRank === PROMO_LINE_AFTER;
                const showDemoDivider = rank === DEMO_LINE_FROM && players.length >= DEMO_LINE_FROM;
                const inPromoZone = rank <= PROMO_LINE_AFTER;
                const inDemoZone = rank >= DEMO_LINE_FROM;
                return (
                  <div key={p.alunoId}>
                    {showPromoDivider && <PromoDivider />}
                    {showDemoDivider && <DemoDivider />}
                    <PlayerRow
                      rank={rank}
                      player={p}
                      showPhoto={showPhoto}
                      inPromoZone={inPromoZone}
                      inDemoZone={inDemoZone}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showHowTo && <HowToScoreModal onClose={() => setShowHowTo(false)} />}
    </AlunoShell>
  );
}

function PromoDivider() {
  return (
    <div className="flex items-center gap-2 py-1.5 text-primary">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-40" />
      <span className="flex items-center gap-1 text-[0.625rem] font-bold">
        <ArrowUp className="h-3 w-3" /> zona de promoção
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-40" />
    </div>
  );
}

function DemoDivider() {
  return (
    <div className="flex items-center gap-2 py-1.5 text-destructive">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-40" />
      <span className="flex items-center gap-1 text-[0.625rem] font-bold">
        <ArrowDown className="h-3 w-3" /> zona de rebaixamento
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-40" />
    </div>
  );
}

function PlayerRow({
  rank, player, showPhoto, inPromoZone, inDemoZone,
}: {
  rank: number;
  player: RankingPlayer;
  showPhoto: boolean;
  inPromoZone: boolean;
  inDemoZone: boolean;
}) {
  const avatarUrl = useAvatarUrl(showPhoto ? player.avatarUrl : null);
  const color = colorForId(player.userId ?? player.alunoId);
  const initial = (player.name?.charAt(0) || "?").toUpperCase();
  const highlighted = player.isYou;

  const containerCls = highlighted
    ? "bg-primary/10 border-primary/30"
    : inPromoZone
    ? "bg-primary/5 border-primary/15"
    : inDemoZone
    ? "bg-destructive/5 border-destructive/15"
    : "bg-card border-border";

  const textCls = highlighted ? "text-primary" : "text-foreground";
  const rankCls = highlighted ? "text-primary" : "text-muted-foreground";

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${containerCls}`}>
      <div className="w-7 shrink-0 text-center">
        <span className={`font-display text-sm font-bold tabular-nums ${rankCls}`}>{rank}º</span>
      </div>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-base font-bold text-white"
        style={{ backgroundColor: color.bg }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm font-semibold ${textCls}`}>
            {highlighted ? firstName(player.name) : player.name}
          </p>
          {highlighted && (
            <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.625rem] font-bold text-primary">
              você
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-display text-base font-bold tabular-nums ${textCls}`}>{player.points}</p>
        <p className="text-[0.625rem] text-muted-foreground/70">pts</p>
      </div>
    </div>
  );
}

type ScoringRule = { icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>; label: string; points: string };

const SCORING_RULES: ScoringRule[] = [
  { icon: Dumbbell, label: "treino concluído (a partir de 30 min)", points: "+30 pts" },
  { icon: CalendarCheck, label: "check-in diário (1x por dia)", points: "+5 pts" },
  { icon: Zap, label: "atividade extra registrada", points: "+10 pts" },
  { icon: Footprints, label: "corrida concluída", points: "+30 pts" },
];

type Division = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  color: string;
  bg: string;
  border: string;
};

const DIVISIONS: Division[] = [
  { label: "Bronze",   icon: Shield, color: "#CD7F32", bg: "rgba(205, 127, 50, 0.1)",  border: "rgba(205, 127, 50, 0.25)" },
  { label: "Prata",    icon: Medal,  color: "#BFC7CE", bg: "rgba(191, 199, 206, 0.1)", border: "rgba(191, 199, 206, 0.25)" },
  { label: "Ouro",     icon: Medal,  color: "#FFC93C", bg: "rgba(255, 201, 60, 0.1)",  border: "rgba(255, 201, 60, 0.25)" },
  { label: "Platina",  icon: Trophy, color: "#5CD1C6", bg: "rgba(92, 209, 198, 0.1)",  border: "rgba(92, 209, 198, 0.25)" },
  { label: "Diamante", icon: Gem,    color: "#5AA9FF", bg: "rgba(90, 169, 255, 0.1)",  border: "rgba(90, 169, 255, 0.25)" },
  { label: "Campeão",  icon: Crown,  color: "#D7F205", bg: "rgba(215, 242, 5, 0.1)",   border: "rgba(215, 242, 5, 0.25)" },
];

function HowToScoreModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-in fade-in-0"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-labelledby="ranking-modal-title"
        className="relative grid w-full max-w-md gap-4 overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-lg animate-in zoom-in-95 max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="fechar"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-left">
          <h2
            id="ranking-modal-title"
            className="font-display flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <Trophy className="h-5 w-5 text-primary" fill="currentColor" />
            como funciona o ranking
          </h2>
        </div>

        {/* Body */}
        <div className="space-y-6 pt-1">
          {/* como pontuar */}
          <section className="space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
              como pontuar
            </h3>
            <ul className="space-y-2.5">
              {SCORING_RULES.map(({ icon: Icon, label, points }) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-foreground/80">{label}</span>
                  <span className="shrink-0 font-display text-sm font-bold text-primary tabular-nums">{points}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* como funcionam os grupos */}
          <section className="space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
              como funcionam os grupos
            </h3>
            <p className="flex items-start gap-2 text-sm leading-relaxed text-foreground/80">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>você compete num grupo de até 20 alunos da sua divisão.</span>
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {DIVISIONS.map((d, i) => {
                const Icon = d.icon;
                return (
                  <span key={d.label} className="flex items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.625rem] font-semibold"
                      style={{
                        backgroundColor: d.bg,
                        border: `1px solid ${d.border}`,
                        color: d.color,
                      }}
                    >
                      <Icon className="h-3 w-3" fill="currentColor" />
                      {d.label}
                    </span>
                    {i < DIVISIONS.length - 1 && (
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    )}
                  </span>
                );
              })}
            </div>
            <div className="space-y-2 pt-1">
              <p className="flex items-start gap-2 text-sm leading-relaxed text-foreground/80">
                <ArrowUp className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>toda semana o grupo reseta: quem fica no topo (zona de promoção) sobe de divisão.</span>
              </p>
              <p className="flex items-start gap-2 text-sm leading-relaxed text-foreground/80">
                <ArrowDown className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>quem fica no fundo (zona de rebaixamento) é rebaixado.</span>
              </p>
            </div>
          </section>

          {/* temporadas */}
          <section className="space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
              temporadas
            </h3>
            <p className="flex items-start gap-2 text-sm leading-relaxed text-foreground/80">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                a cada 6 semanas a temporada fecha: todo mundo volta pro bronze e os pontos zeram — começa
                tudo de novo. (sua melhor divisão fica registrada.)
              </span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

