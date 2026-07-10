import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Home, UserPlus, Users as UsersIcon, Users, Dumbbell, Crown, ArrowRight,
  TrendingUp, Wallet, HeartPulse, Trophy, Eye, ChevronRight, ChevronDown, Activity,
  Link2, Lock, Pencil,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useCurrentUser, firstName, initialsFromName } from "@/lib/auth";
import logoUrl from "@/assets/cactus-logo.png";

export const Route = createFileRoute("/_authenticated/_academia/dashboard/academia/")({
  head: () => ({
    meta: [
      { title: "Painel da Academia · cactusfitness" },
      { name: "description", content: "Visão geral da sua academia." },
    ],
  }),
  component: AcademiaHome,
});

function greetingFor(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function useOwnerOverview() {
  return useQuery({
    queryKey: ["owner-overview"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return null;
      const { data: mine } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", uid)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!mine) return null;
      const orgId = mine.organization_id;
      const [orgRes, membersRes, alunosRes, treinosRes, avaliacoesRes] = await Promise.all([
        supabase.from("organizations").select("id, name").eq("id", orgId).maybeSingle(),
        supabase.from("organization_members").select("id, user_id, role").eq("organization_id", orgId),
        supabase.from("alunos").select("id, personal_id, is_active, created_at").eq("organization_id", orgId),
        supabase.from("workout_templates").select("id, created_at"),
        supabase.from("avaliacoes").select("id, created_at"),
      ]);
      const members = membersRes.data ?? [];
      const alunos = alunosRes.data ?? [];
      const treinos = treinosRes.data ?? [];
      const avaliacoes = avaliacoesRes.data ?? [];
      const personais = members.filter((m: any) => m.role === "owner" || m.role === "personal");
      const equipe = members.filter((m: any) => m.role === "staff");
      const ativos = alunos.filter((a: any) => a.is_active).length;
      const byPersonal: Record<string, number> = {};
      alunos.forEach((a: any) => { byPersonal[a.personal_id] = (byPersonal[a.personal_id] ?? 0) + 1; });
      const personalIds = personais.map((p: any) => p.user_id);
      const { data: profs } = personalIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", personalIds)
        : { data: [] as any[] };
      const profById = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const personaisList = personais.map((p: any) => ({
        user_id: p.user_id,
        full_name: profById.get(p.user_id)?.full_name ?? "Sem nome",
        role: p.role,
        alunos: byPersonal[p.user_id] ?? 0,
      })).sort((a, b) => b.alunos - a.alunos);
      const cutoff = Date.now() - 30 * 864e5;
      const novosAlunos30d = alunos.filter((a: any) => new Date(a.created_at).getTime() > cutoff).length;
      const novosTreinos30d = treinos.filter((t: any) => t.created_at && new Date(t.created_at).getTime() > cutoff).length;
      const novasAvaliacoes30d = avaliacoes.filter((a: any) => a.created_at && new Date(a.created_at).getTime() > cutoff).length;
      return {
        orgName: orgRes.data?.name ?? "Minha Academia",
        totalPersonais: personais.length,
        totalEquipe: equipe.length,
        totalAlunos: alunos.length,
        ativos,
        novosAlunos30d,
        novosTreinos30d,
        novasAvaliacoes30d,
        treinosAtivos: treinos.length,
        avaliacoes: avaliacoes.length,
        personaisList,
      };
    },
  });
}


function Sparkline({ points, up = true }: { points: number[]; up?: boolean }) {
  const w = 90, h = 32, pad = 2;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const step = (w - pad * 2) / Math.max(points.length - 1, 1);
  const d = points.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={up ? "text-primary" : "text-muted-foreground"}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Kpi({ label, value, hint, spark, delta }: {
  label: string; value: number | string; hint: string; spark: number[]; delta?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        {delta && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            <TrendingUp className="h-3 w-3" /> {delta}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="font-display text-3xl font-extrabold leading-none tracking-tight">{value}</div>
        <Sparkline points={spark} />
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

/* ---------- Mobile ---------- */

function MobileTopBar() {
  return (
    <header className="sticky top-0 z-20 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-label="CactusFitness"
          role="img"
          className="block h-7 w-7 shrink-0 bg-primary"
          style={{
            WebkitMaskImage: `url(${logoUrl})`,
            maskImage: `url(${logoUrl})`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
        <span className="min-w-0 truncate text-base font-semibold tracking-tight font-display">
          Cactus<span className="italic font-normal">Fitness</span>
        </span>
      </div>
    </header>
  );
}

function MobileGreetingCard({ name, alunos, treinos, avaliacoes, novosAlunos, novosTreinos, novasAvaliacoes }: {
  name: string; alunos: number; treinos: number; avaliacoes: number;
  novosAlunos: number; novosTreinos: number; novasAvaliacoes: number;
}) {
  const greeting = greetingFor(new Date().getHours());
  const delta = (n: number) => n > 0 ? `↑ ${n} este mês` : "";
  return (
    <div className="rounded-[1.55rem] border border-border bg-[image:var(--gradient-greeting-card)] p-5 shadow-[var(--shadow-mobile-card)]">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-background/60 ring-2 ring-primary/70 sm:h-14 sm:w-14">
          <img src={logoUrl} alt="CactusFitness" className="h-8 w-8 object-contain sm:h-10 sm:w-10" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground sm:text-sm">{greeting},</div>
          <div className="truncate text-xl font-extrabold leading-tight tracking-tight font-display sm:text-[1.5rem]">{name}</div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4 sm:mt-7">
        <div>
          <div className="text-3xl font-extrabold leading-none font-display sm:text-[2.15rem]">{alunos}</div>
          <div className="mt-2 text-xs leading-tight text-muted-foreground sm:text-sm">alunos<br />ativos</div>
          {delta(novosAlunos) && <div className="mt-1 text-[11px] font-semibold text-emerald-500">{delta(novosAlunos)}</div>}
        </div>
        <div>
          <div className="text-3xl font-extrabold leading-none font-display sm:text-[2.15rem]">{treinos}</div>
          <div className="mt-2 text-xs leading-tight text-muted-foreground sm:text-sm">treinos<br />ativos</div>
          {delta(novosTreinos) && <div className="mt-1 text-[11px] font-semibold text-emerald-500">{delta(novosTreinos)}</div>}
        </div>
        <div>
          <div className="text-3xl font-extrabold leading-none font-display sm:text-[2.15rem]">{avaliacoes}</div>
          <div className="mt-2 text-xs leading-tight text-muted-foreground sm:text-sm">avaliações<br />físicas</div>
          {delta(novasAvaliacoes) && <div className="mt-1 text-[11px] font-semibold text-emerald-500">{delta(novasAvaliacoes)}</div>}
        </div>
      </div>
    </div>
  );
}


function WalletCard() {
  return (
    <div className="flex items-center gap-4 rounded-[1.55rem] border border-border bg-card px-5 py-4 shadow-[var(--shadow-mobile-card)]">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Wallet className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-muted-foreground">Carteira CactusFitness</div>
        <div className="truncate text-2xl font-extrabold leading-tight text-primary font-display">R$ 0,00</div>
      </div>
      <Eye className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, to }: { icon: React.ElementType; label: string; onClick?: () => void; to?: string }) {
  const inner = (
    <>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <span className="min-w-0 flex-1 text-sm font-bold leading-tight sm:text-base">{label}</span>
    </>
  );
  const cls = "flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[1.25rem] border border-border bg-card px-4 py-4 text-left shadow-[var(--shadow-mobile-card)] transition hover:border-primary/40 sm:gap-4 sm:px-5";
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

function MobilePulseCard() {
  return (
    <button
      type="button"
      className="flex w-full min-w-0 items-center gap-4 overflow-hidden rounded-[1.55rem] border border-primary/40 bg-card px-5 py-4 text-left shadow-[var(--shadow-mobile-card)]"
    >
      <div className="relative shrink-0">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
          <Activity className="h-6 w-6" strokeWidth={2} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-extrabold text-foreground sm:text-base">pulso da academia</div>
        <div className="truncate text-xs text-muted-foreground sm:text-sm">Nenhuma atividade nova</div>
      </div>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function AcademiaHome() {
  const { profile } = useCurrentUser();
  const { data: o } = useOwnerOverview();
  const navigate = useNavigate();
  const name = firstName(profile?.full_name, profile?.email);
  const initials = initialsFromName(profile?.full_name, profile?.email);
  const greeting = greetingFor(new Date().getHours());
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const alunosAtivos = o?.ativos ?? 0;
  const personaisAtivos = o?.totalPersonais ?? 0;

  const shortcuts = [
    { to: "/dashboard/academia/personais", icon: UsersIcon, title: "Equipe", desc: "Cadastrar personais e ajustar papéis", key: "E" },
    { to: "/dashboard/academia/alunos", icon: Users, title: "Todos os alunos", desc: "Cadastros e contatos", key: "A" },
    { to: "/dashboard/academia/treinos", icon: Dumbbell, title: "Modelos de treino", desc: "Biblioteca compartilhada", key: "T" },
    { to: "/dashboard/academia/financeiro", icon: Wallet, title: "Financeiro", desc: "Receitas, repasses e saques", key: "F" },
    { to: "/dashboard/academia/avaliacoes", icon: HeartPulse, title: "Avaliações", desc: "Consolidado da academia", key: "V" },
    { to: "/dashboard/academia/desafios", icon: Trophy, title: "Desafios", desc: "Engajamento e ranking", key: "D" },
  ] as const;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <IconRail scope="academia" />
      <MobileTopBar />
      <main className="w-full pb-24 md:ml-[72px] md:w-[calc(100%-72px)] md:pb-8">
        {/* ==================== DESKTOP (lg+) ==================== */}
        <div className="hidden lg:block">
          <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-6 md:py-8">
            {/* Cabeçalho */}
            <header className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-primary">
                  <Home className="h-3.5 w-3.5" /> Painel da Academia
                </div>
                <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight md:text-3xl">
                  {greeting}, {name}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {o?.orgName ?? "Minha Academia"} · {today}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/dashboard/academia/personais"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:border-primary/40"
                >
                  <UsersIcon className="h-3.5 w-3.5" /> Gerenciar equipe
                </Link>
                <Link
                  to="/dashboard/academia/alunos"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Novo aluno
                </Link>
              </div>
            </header>

            {/* KPIs */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Kpi
                label="Alunos ativos"
                value={alunosAtivos}
                hint={`de ${o?.totalAlunos ?? 0} cadastrados`}
                spark={[1, 2, 2, 3, 2, 4, alunosAtivos + 1]}
                delta={o?.novosAlunos30d ? `+${o.novosAlunos30d}` : undefined}
              />
              <Kpi
                label="Personais ativos"
                value={personaisAtivos}
                hint={o?.totalEquipe ? `+ ${o.totalEquipe} na equipe` : "sua equipe técnica"}
                spark={[1, 1, 2, 2, 3, 3, personaisAtivos + 1]}
              />
              <Kpi
                label="Receita do mês"
                value="R$ 0"
                hint="vs mês anterior"
                spark={[1, 1, 2, 2, 3, 4, 5]}
              />
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
              {/* Atalhos rápidos */}
              <section className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <h2 className="font-display text-base font-bold">Atalhos rápidos</h2>
                    <p className="text-[11px] text-muted-foreground">Ações da administração</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">use as teclas</span>
                </div>
                <div className="grid gap-3 p-3 sm:grid-cols-2">
                  {shortcuts.map(({ to, icon: Icon, title, desc, key }) => (
                    <Link
                      key={to}
                      to={to}
                      className="group flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3 hover:border-primary/40"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{title}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{desc}</div>
                      </div>
                      <kbd className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-background/60 font-mono text-[11px] font-bold text-muted-foreground">
                        {key}
                      </kbd>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Personais da academia */}
              <section className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <h2 className="font-display text-base font-bold">Personais da academia</h2>
                    <p className="text-[11px] text-muted-foreground">Distribuição de alunos por profissional</p>
                  </div>
                  <Link
                    to="/dashboard/academia/personais"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Gerenciar <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {!o || o.personaisList.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum personal cadastrado ainda.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {o.personaisList.map((p) => {
                      const max = Math.max(...o.personaisList.map((x) => x.alunos), 1);
                      const pct = (p.alunos / max) * 100;
                      return (
                        <li key={p.user_id} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                              {p.full_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-semibold">{p.full_name}</div>
                                {p.role === "owner" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                    <Crown className="h-2.5 w-2.5" /> Dono
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-display text-lg font-extrabold leading-none">{p.alunos}</div>
                              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">alunos</div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* ==================== MOBILE / TABLET (<lg) ==================== */}
        <div className="w-full overflow-hidden lg:hidden">
          <div className="mx-auto w-full overflow-hidden px-3 py-4 sm:px-4">
            <div className="space-y-4">
              <MobileGreetingCard
                name={name}
                alunos={alunosAtivos}
                treinos={o?.treinosAtivos ?? 0}
                avaliacoes={o?.avaliacoes ?? 0}
                novosAlunos={o?.novosAlunos30d ?? 0}
                novosTreinos={o?.novosTreinos30d ?? 0}
                novasAvaliacoes={o?.novasAvaliacoes30d ?? 0}
              />


              <WalletCard />

              <div className="grid grid-cols-2 gap-3">
                <ActionButton
                  icon={UserPlus}
                  label="Adicionar Aluno"
                  onClick={() => navigate({ to: "/dashboard/academia/alunos" })}
                />
                <ActionButton
                  icon={Link2}
                  label="Gerenciar Equipe"
                  to="/dashboard/academia/personais"
                />
              </div>

              <MobilePulseCard />
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav scope="academia" />
    </div>
  );
}
