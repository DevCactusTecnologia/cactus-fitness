import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, ArrowUp, Medal, Users, HelpCircle, Eye } from "lucide-react";
import { AlunoShell } from "@/components/AlunoShell";
import { useCurrentUser, firstName, initialsFromName } from "@/lib/auth";
import { colorForId } from "@/lib/avatar-color";

export const Route = createFileRoute("/_authenticated/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking · cactusfitness" },
      { name: "description", content: "Ranking semanal do seu grupo." },
    ],
  }),
  component: RankingPage,
});

type Player = {
  rank: number;
  name: string;
  points: number;
  isYou?: boolean;
};

const PLAYERS: Player[] = [
  { rank: 1, name: "Ana Claudia", points: 60 },
  { rank: 2, name: "Jacqueline", points: 60 },
  { rank: 3, name: "Bruno", points: 60 },
  { rank: 4, name: "Andressa", points: 60 },
  { rank: 5, name: "Paulo", points: 35 },
  { rank: 6, name: "Nathalia", points: 35 },
  { rank: 7, name: "Camila", points: 30 },
  { rank: 8, name: "Kelen", points: 30 },
  { rank: 9, name: "Ellem", points: 30 },
  { rank: 10, name: "Carla", points: 30 },
  { rank: 11, name: "Jhon Kelvin", points: 30 },
  { rank: 12, name: "Analice", points: 30 },
  { rank: 13, name: "Luiz", points: 30 },
  { rank: 14, name: "Tania", points: 30 },
  { rank: 15, name: "Rodolfo", points: 30 },
  { rank: 16, name: "Thales", points: 30 },
  { rank: 17, name: "Sávio", points: 30 },
  { rank: 18, name: "Jaedson", points: 30 },
  { rank: 20, name: "Claudia", points: 30 },
];

const PROMO_LINE_AFTER = 7; // top 7 sobe

function RankingPage() {
  const { profile } = useCurrentUser();
  const [showPhoto, setShowPhoto] = useState(false);

  const youName = firstName(profile?.full_name, profile?.email);
  const youInitial = initialsFromName(profile?.full_name, profile?.email).charAt(0);
  const youColor = colorForId(profile?.id ?? "aluno").bg;
  const youRank = 19;
  const youPoints = 30;
  const totalInGroup = 20;

  // Monta a lista final inserindo "você" na posição 19
  const merged: Player[] = [];
  for (const p of PLAYERS) {
    if (p.rank > youRank && !merged.some((m) => m.isYou)) {
      merged.push({ rank: youRank, name: youName, points: youPoints, isYou: true });
    }
    merged.push(p);
  }
  if (!merged.some((m) => m.isYou)) {
    merged.push({ rank: youRank, name: youName, points: youPoints, isYou: true });
  }

  return (
    <AlunoShell>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl md:left-[72px]">
        <div className="flex items-center gap-3 px-4 py-4 md:px-6">
          <h1 className="font-display text-xl font-bold flex-1">Ranking</h1>
          <div className="text-right text-xs leading-tight">
            <p className="text-muted-foreground">semana 3 · termina amanhã</p>
            <p className="text-muted-foreground/60">temporada até 03 de agosto</p>
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
                    <p className="font-display text-lg font-bold tabular-nums">{youRank}º</p>
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

          <p className="text-center text-sm text-muted-foreground">
            você está em <span className="font-display font-bold text-foreground">{youRank}º</span> de {totalInGroup}
          </p>

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
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4 text-primary" /> como pontuar
            </button>
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {merged.map((p, idx) => {
              const prev = merged[idx - 1];
              const showPromoDivider = prev && prev.rank <= PROMO_LINE_AFTER && p.rank > PROMO_LINE_AFTER;
              const inPromoZone = p.rank <= PROMO_LINE_AFTER;
              return (
                <div key={`${p.rank}-${p.name}`}>
                  {showPromoDivider && (
                    <div className="flex items-center gap-2 py-1.5 text-primary">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-40" />
                      <span className="flex items-center gap-1 text-[0.625rem] font-bold">
                        <ArrowUp className="h-3 w-3" /> zona de promoção
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-40" />
                    </div>
                  )}
                  <PlayerRow
                    player={p}
                    highlighted={p.isYou}
                    softHighlight={inPromoZone}
                    youColor={p.isYou ? youColor : colorForId(p.name).bg}
                    initial={p.isYou ? youInitial : p.name.charAt(0).toUpperCase()}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </AlunoShell>
  );
}

function PlayerRow({
  player,
  highlighted,
  softHighlight,
  youColor,
  initial,
}: {
  player: Player;
  highlighted?: boolean;
  softHighlight?: boolean;
  youColor: string;
  initial: string;
}) {
  const textCls = highlighted ? "text-primary" : "text-foreground";
  const rankCls = highlighted ? "text-primary" : "text-muted-foreground";
  const containerCls = highlighted
    ? "bg-primary/10 border-primary/30"
    : softHighlight
    ? "bg-primary/5 border-primary/15"
    : "bg-card border-border";
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${containerCls}`}>
      <div className="w-7 shrink-0 text-center">
        <span className={`font-display text-sm font-bold tabular-nums ${rankCls}`}>{player.rank}º</span>
      </div>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-base font-bold text-white"
        style={{ backgroundColor: youColor }}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm font-semibold ${textCls}`}>{player.name}</p>
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
