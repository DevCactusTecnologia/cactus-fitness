import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Home, MessageSquare, MessageCircle, TrendingUp, Trophy, Users, Utensils, Calendar,
  Folder, ClipboardList, FileText, User as UserIcon, Settings, HeadphonesIcon,
  Droplet, Sun, Camera, Check, CheckCircle2, Flame, Play, ChevronRight, Zap, Dumbbell, Activity,
  Edit3, StickyNote, Bell, Receipt, MessageSquareText, Menu as MenuIcon, ChevronDown, Shield,
  LayoutDashboard, HeartPulse, Loader2, Undo2,
} from "lucide-react";
import { useCurrentUser, useSignOut, firstName, initialsFromName } from "@/lib/auth";
import { colorForId } from "@/lib/avatar-color";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import { supabase } from "@/integrations/supabase/client";
import { applyPrimaryColor } from "@/lib/theme";
import logoUrl from "@/assets/cactus-logo.png";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { useQueryClient } from "@tanstack/react-query";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";



export const Route = createFileRoute("/_authenticated/meu-treino")({
  head: () => ({
    meta: [
      { title: "Início · cactusfitness" },
      { name: "description", content: "Seu painel de treinos, progresso e comunidade." },
    ],
  }),
  component: MeuTreinoPage,
});

const RAIL_ITEMS = [
  { icon: LayoutDashboard, label: "Início", to: "/meu-treino" as const },
  { icon: Dumbbell, label: "Meus Treinos", to: "/treinos" as const },
  { icon: TrendingUp, label: "Meu Progresso", to: "/meu-progresso" as const },
  { icon: Trophy, label: "Desafios", to: "/desafios" as const },
  { icon: HeartPulse, label: "Avaliações", to: "/avaliacoes" as const },
];

const MOBILE_NAV_ITEMS = RAIL_ITEMS.filter((i) => i.to !== "/meu-progresso");



const MENU_ITEMS: { icon: any; label: string }[] = [
  { icon: Dumbbell, label: "Treinos" },
  { icon: Activity, label: "Atividades" },
  { icon: TrendingUp, label: "Progresso" },
  { icon: ClipboardList, label: "Avaliações" },
];

const WEEK_DAYS_PT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function MeuTreinoPage() {
  const navigate = useNavigate();
  const { profile, loading } = useCurrentUser();
  const signOut = useSignOut();

  useEffect(() => {
    if (!loading && profile && profile.role === "personal") {
      navigate({ to: "/", replace: true });
    }
  }, [loading, profile, navigate]);

  // Aplica a cor principal definida pelo personal do aluno
  useEffect(() => {
    if (!profile?.id || profile.role !== "aluno") return;
    let cancelled = false;
    (async () => {
      const { data: link } = await supabase
        .from("alunos")
        .select("personal_id")
        .eq("aluno_user_id", profile.id)
        .maybeSingle();
      if (cancelled || !link?.personal_id) return;
      const { data: personal } = await supabase
        .from("profiles")
        .select("primary_color")
        .eq("id", link.personal_id)
        .maybeSingle();
      if (cancelled) return;
      if (personal?.primary_color) applyPrimaryColor(personal.primary_color);
    })();
    return () => { cancelled = true; };
  }, [profile?.id, profile?.role]);

  const name = firstName(profile?.full_name, profile?.email);
  const initials = initialsFromName(profile?.full_name, profile?.email);
  const av = colorForId(profile?.id ?? "aluno");

  const now = new Date();
  const jsDay = now.getDay();
  const todayIdx = (jsDay + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const fullDate = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const isoDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  const todayIso = isoDate(now);
  const weekStart = isoDate(weekDates[0]);
  const weekEnd = isoDate(weekDates[6]);

  const [checkIns, setCheckIns] = useState<Set<string>>(new Set());
  const [checkingIn, setCheckingIn] = useState(false);
  const [nextWorkout, setNextWorkout] = useState<{ id: string; name: string; exercises: number; sessionPosition: number | null }| null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarDisplayUrl = useAvatarUrl(profile?.avatar_url);
  const queryClient = useQueryClient();
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!profile?.id) return;
    setUploadingAvatar(true);
    const path = `${profile.id}/avatar-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (upErr) { setUploadingAvatar(false); return; }
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", profile.id);
    setUploadingAvatar(false);
    setCropSrc(null);
    if (!dbErr) {
      await queryClient.invalidateQueries({ queryKey: ["current-user-profile", profile.id] });
    }
  };


  useEffect(() => {
    if (!profile?.id || profile.role !== "aluno") return;
    let cancelled = false;
    (async () => {
      const { data: link } = await supabase
        .from("alunos")
        .select("id")
        .eq("aluno_user_id", profile.id)
        .maybeSingle();
      if (cancelled || !link?.id) return;
      const { data: sw } = await supabase
        .from("student_workouts")
        .select("id, name, template_id, scheduled_for, status")
        .eq("aluno_id", link.id)
        .is("archived_at", null)
        .neq("status", "concluido")
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !sw) return;
      let exercises = 0;
      let sessionPosition: number | null = null;
      let sessionName: string | null = null;
      if (sw.template_id) {
        const { data: exs } = await supabase
          .from("workout_template_exercises")
          .select("session_position, session_label")
          .eq("template_id", sw.template_id)
          .order("session_position", { ascending: true, nullsFirst: true });
        const list = exs ?? [];
        if (list.length) {
          sessionPosition = list[0].session_position ?? null;
          sessionName = list[0].session_label ?? null;
          exercises = list.filter((e: any) => (e.session_position ?? null) === sessionPosition).length;
        }
      }
      const displayName = sessionName || sw.name || "Treino";
      if (!cancelled) setNextWorkout({ id: sw.id, name: displayName, exercises, sessionPosition });
    })();
    return () => { cancelled = true; };
  }, [profile?.id, profile?.role]);


  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("aluno_check_ins")
        .select("check_in_date")
        .eq("user_id", profile.id)
        .gte("check_in_date", weekStart)
        .lte("check_in_date", weekEnd);
      if (!cancelled && data) setCheckIns(new Set(data.map((r: any) => r.check_in_date)));
    })();
    return () => { cancelled = true; };
  }, [profile?.id, weekStart, weekEnd]);

  const checkedToday = checkIns.has(todayIso);

  const handleCheckIn = async () => {
    if (!profile?.id || checkedToday || checkingIn) return;
    setCheckingIn(true);
    const { error } = await supabase
      .from("aluno_check_ins")
      .insert({ user_id: profile.id, check_in_date: todayIso });
    setCheckingIn(false);
    if (!error) setCheckIns((prev) => new Set(prev).add(todayIso));
  };

  const handleUndoCheckIn = async () => {
    if (!profile?.id || !checkedToday || checkingIn) return;
    setCheckingIn(true);
    const { error } = await supabase
      .from("aluno_check_ins")
      .delete()
      .eq("user_id", profile.id)
      .eq("check_in_date", todayIso);
    setCheckingIn(false);
    if (!error) setCheckIns((prev) => {
      const next = new Set(prev);
      next.delete(todayIso);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Rail lateral (desktop) — mesmo estilo do painel do personal */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center gap-2 border-r border-border bg-sidebar py-4 md:flex">
        <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl">
          <span
            aria-label="CactusFitness"
            role="img"
            className="block h-8 w-8 bg-primary"
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
        </div>
        {RAIL_ITEMS.map(({ icon: Icon, label, to }) => {
          const active = to === "/meu-treino";
          return (
            <Link
              key={label}
              to={to}
              title={label}
              className={`group relative grid h-11 w-11 place-items-center rounded-[10px] transition ${
                active
                  ? "bg-primary/20 text-primary"
                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
              }`}
            >
              {active && (
                <span className="absolute -left-3.5 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-border opacity-0 group-hover:opacity-100 transition">
                {label}
              </span>
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col items-center gap-2">
          <UserAvatarMenu />
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="md:ml-[72px] pt-[76px] pb-24 md:pb-8">
        {/* Header fixo no topo */}
        <header className="fixed top-0 right-0 left-0 md:left-[72px] z-30 bg-background/70 px-4 py-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">

            <div className="min-w-0 md:hidden flex items-center gap-2">
              <span
                aria-label="CactusFitness"
                role="img"
                className="block h-7 w-7 bg-primary"
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
              <span className="font-display text-lg font-bold leading-none">
                Cactus<span className="italic font-semibold">Fitness</span>
              </span>
            </div>
            <div className="min-w-0 hidden md:block">
              <h1 className="font-display text-2xl font-bold leading-tight">Início</h1>
              <p className="text-sm text-muted-foreground first-letter:uppercase">{fullDate}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-primary hover:bg-accent" aria-label="Hidratação">
                <Droplet className="h-4 w-4" fill="currentColor" />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-foreground hover:bg-accent" aria-label="Tema">
                <Sun className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
          {/* Saudação + Bronze */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarDisplayUrl ? (
                <img
                  src={avatarDisplayUrl}
                  alt={name}
                  className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-primary/60 shadow-md"
                />
              ) : (
                <div
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-full font-display text-lg font-bold ring-2 ring-primary/60 shadow-md"
                  style={{ backgroundColor: "rgb(244, 63, 94)", color: "#fff" }}
                >
                  {initials}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground disabled:opacity-70"
                aria-label="Trocar foto"
              >
                {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-bold leading-tight">Olá, {name}!</h2>
              <Link
                to="/ranking"
                className="mt-1 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 pl-1 pr-2.5 py-0.5 transition active:opacity-60 hover:bg-accent/40"
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-2xl shrink-0"
                  style={{ backgroundColor: "rgba(205, 127, 50, 0.15)", border: "1.5px solid rgba(205, 127, 50, 0.4)" }}
                >
                  <Shield className="h-4 w-4 text-[#9A5B12] dark:text-[#CD7F32]" fill="currentColor" />
                </span>
                <span className="text-xs font-semibold" style={{ color: "rgb(205, 127, 50)" }}>Bronze</span>
                <span className="text-[0.625rem] text-muted-foreground/70">· 19º no grupo</span>
              </Link>
            </div>
          </div>

          {/* Calendário da semana */}
          <section className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[0.6875rem] font-display font-bold uppercase tracking-wider text-muted-foreground">calendário da semana</p>
            <div className="grid grid-cols-7 gap-1 select-none">
              {weekDates.map((d, i) => {
                const isToday = i === todayIdx;
                // TODO: marcar como concluído somente quando o aluno finalizar o treino do dia
                const workoutDone = false;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className={`text-[0.625rem] font-semibold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground/60"}`}>
                      {WEEK_DAYS_PT[i]}
                    </span>
                    <div
                      className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                        workoutDone
                          ? "border-primary bg-primary text-primary-foreground"
                          : isToday
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30 ring-offset-1 ring-offset-background"
                          : "border-muted-foreground/15 bg-transparent text-muted-foreground/50"
                      }`}
                    >
                      {workoutDone ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="tabular-nums">{d.getDate()}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 shrink-0 text-muted-foreground/30" fill="currentColor" />
              <p className="text-xs text-muted-foreground">Treine 6x esta semana para iniciar sua ofensiva!</p>
            </div>
          </section>


          {/* Próximo treino */}
          <section className="relative overflow-hidden rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-primary/[0.06] blur-2xl" />
            <div className="relative flex items-center justify-between">
              <span className="text-[0.6875rem] font-display font-bold uppercase tracking-wider text-muted-foreground">próximo treino</span>
              <span className="text-xs font-semibold text-muted-foreground">{WEEK_DAYS_PT[todayIdx]} · sem. 1/4</span>
            </div>
            <h3 className="relative font-display text-xl font-extrabold text-foreground">{nextWorkout?.name ?? "Nenhum treino agendado"}</h3>
            <p className="relative text-xs text-muted-foreground">
              {nextWorkout ? <>{nextWorkout.exercises} exercícios<span style={{ color: "rgb(59, 130, 246)" }}> · Fase 1</span></> : "aguarde o seu personal atribuir um treino"}
            </p>
            {nextWorkout ? (
              <Link
                to="/meu-treino/treino/$id"
                params={{ id: nextWorkout.id }}
                search={nextWorkout.sessionPosition != null ? { bloco: nextWorkout.sessionPosition } : {}}
                className="relative flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:brightness-110 active:scale-[0.97]"
              >
                <Play className="h-4 w-4" fill="currentColor" /> Iniciar treino
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="relative flex h-11 w-full items-center justify-center gap-2 rounded-full bg-muted px-6 text-sm font-bold text-muted-foreground opacity-60"
              >
                <Play className="h-4 w-4" fill="currentColor" /> Iniciar treino
              </button>
            )}
          </section>


          {/* Ranking + Check-in */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <button className="flex w-full items-center justify-between gap-3 p-4 hover:bg-accent/40">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-500">
                  <Shield className="h-5 w-5" fill="currentColor" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">seu ranking</p>
                  <p className="font-display text-lg font-bold text-amber-600 dark:text-amber-500">Bronze</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                ver ranking <ChevronRight className="h-4 w-4" />
              </span>
            </button>
            {checkedToday ? (
              <div className="flex w-full items-center justify-center gap-2 border-t border-border/60 py-3 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-500">check-in de hoje feito</span>
                <button
                  type="button"
                  onClick={handleUndoCheckIn}
                  disabled={checkingIn}
                  aria-label="Desfazer check-in"
                  title="Desfazer check-in"
                  className="ml-1 grid h-6 w-6 place-items-center rounded-full text-muted-foreground/70 transition hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {checkingIn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="flex w-full items-center justify-center gap-2 border-t border-border/60 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-60"
              >
                {checkingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> registrando check-in...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" fill="currentColor" /> fazer check-in de hoje (+5 pts)
                  </>
                )}
              </button>
            )}
          </section>

          {/* Grid de menu */}
          <section className="grid grid-cols-2 gap-2">
            {MENU_ITEMS.map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                className="flex items-center gap-2 rounded-[10px] border border-border bg-card p-2.5 text-left transition hover:border-primary/60 hover:bg-accent/40"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <span className="font-display text-sm font-semibold">{label}</span>
              </button>
            ))}
          </section>
        </div>
      </main>

      {/* Bottom nav (mobile) — mesmos itens do rail lateral */}
      <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
        <div className={`grid`} style={{ gridTemplateColumns: `repeat(${MOBILE_NAV_ITEMS.length}, minmax(0, 1fr))` }}>
          {MOBILE_NAV_ITEMS.map(({ icon: Icon, label, to }) => {
            const active = to === "/meu-treino";
            return (
              <Link
                key={label}
                to={to}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <AvatarCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        onCancel={() => setCropSrc(null)}
        onConfirm={handleCropConfirm}
        saving={uploadingAvatar}
      />
    </div>
  );
}
