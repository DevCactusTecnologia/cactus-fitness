import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  UserPlus, Shield, Search, ChevronRight, ChevronLeft, ChevronDown,
  ArrowUpDown, Activity, Users as UsersIcon, Loader2, Crown, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { IconRail } from "@/components/IconRail";
import { initialsFromName } from "@/lib/auth";
import { colorForId } from "@/lib/avatar-color";
import { createPersonal } from "@/lib/academia-config.functions";
import type { Scope } from "@/lib/scope";

/* ---------- Info card ---------- */

function InfoCard({
  title, desc, icon: Icon, to,
}: { title: string; desc: string; icon: React.ElementType; to?: string }) {
  const inner = (
    <>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:text-foreground" />
    </>
  );
  const cls = "group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition hover:border-border-strong";
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button className={cls}>{inner}</button>;
}

/* ---------- Page ---------- */

type PersonalRow = {
  user_id: string;
  full_name: string;
  email: string | null;
  role: "owner" | "personal" | "staff";
  created_at: string;
  alunos_count: number;
};

type TabKey = "todos" | "personais" | "equipe";

export function PersonaisPage({ scope }: { scope: Scope }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabKey>("todos");
  const [openCreate, setOpenCreate] = useState(false);

  const teamMgmtTo = scope === "academia" ? "/dashboard/academia/configuracoes" : "/dashboard/personal/academia";

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["personais"],
    queryFn: async (): Promise<PersonalRow[]> => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return [];
      const { data: mine } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", uid)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!mine?.organization_id) return [];
      const orgId = mine.organization_id;

      const [membersRes, alunosRes] = await Promise.all([
        supabase
          .from("organization_members")
          .select("user_id, role, created_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: true }),
        supabase
          .from("alunos")
          .select("personal_id")
          .eq("organization_id", orgId),
      ]);
      const members = (membersRes.data ?? []) as { user_id: string; role: PersonalRow["role"]; created_at: string }[];
      const counts: Record<string, number> = {};
      (alunosRes.data ?? []).forEach((a: any) => {
        counts[a.personal_id] = (counts[a.personal_id] ?? 0) + 1;
      });
      const ids = members.map((m) => m.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as any[] };
      const profById = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return members.map((m) => ({
        user_id: m.user_id,
        full_name: profById.get(m.user_id)?.full_name ?? "Sem nome",
        email: null,
        role: m.role,
        created_at: m.created_at,
        alunos_count: counts[m.user_id] ?? 0,
      }));
    },
  });

  const counts = useMemo(() => ({
    todos: rows.length,
    personais: rows.filter((r) => r.role === "owner" || r.role === "personal").length,
    equipe: rows.filter((r) => r.role === "staff").length,
  }), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "personais" && !(r.role === "owner" || r.role === "personal")) return false;
      if (tab === "equipe" && r.role !== "staff") return false;
      if (!term) return true;
      return r.full_name.toLowerCase().includes(term);
    });
  }, [rows, q, tab]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail scope={scope} />

      <main className="pb-24 md:ml-[72px] md:pb-0">
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Voltar</span>
              </button>
              <h1 className="text-xl font-bold tracking-tight font-display sm:text-2xl">Personais</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenCreate(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110"
              >
                <UserPlus className="h-4 w-4" /> Cadastrar Personal
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 md:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 basis-full items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm sm:basis-auto sm:min-w-[240px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="buscar personais..."
                  className="w-full bg-transparent placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <InfoCard icon={Activity} title="Distribuição de alunos" desc="Veja quantos alunos cada personal atende hoje." />
              <InfoCard
                icon={UsersIcon}
                title="Equipe"
                desc="Gerencie membros e papéis da academia."
                to={teamMgmtTo}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1">
                <TabBtn label="Todos" count={counts.todos} active={tab === "todos"} onClick={() => setTab("todos")} />
                <TabBtn label="Personais" count={counts.personais} active={tab === "personais"} onClick={() => setTab("personais")} />
                <TabBtn label="Equipe" count={counts.equipe} active={tab === "equipe"} onClick={() => setTab("equipe")} />
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent">
                <ArrowUpDown className="h-4 w-4" /> Mais recentes
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              {isLoading ? "Carregando..." : `${filtered.length} ${filtered.length === 1 ? "profissional encontrado" : "profissionais encontrados"}`}
            </p>

            <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
              <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_auto] items-center gap-4 border-b border-border px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                <div>Nome</div>
                <div>Papel</div>
                <div>Alunos</div>
                <div className="w-8" />
              </div>

              {isLoading ? (
                <div className="grid place-items-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Nenhum personal ainda</p>
                    <p className="mt-1 text-xs text-muted-foreground">Clique em "Convidar Personal" para adicionar sua equipe.</p>
                  </div>
                </div>
              ) : (
                filtered.map((p) => (
                  <div
                    key={p.user_id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 transition hover:bg-accent/50 sm:grid-cols-[1.6fr_1fr_1fr_auto] sm:px-5 sm:py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold font-display ring-2 ring-primary"
                        style={{ backgroundColor: colorForId(p.user_id).bg, color: colorForId(p.user_id).fg }}
                      >
                        {initialsFromName(p.full_name, p.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.full_name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          desde {new Date(p.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      {p.role === "owner" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                          <Crown className="h-3 w-3" /> Dono
                        </span>
                      ) : p.role === "personal" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                          <Shield className="h-3 w-3" /> Personal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          Equipe
                        </span>
                      )}
                    </div>
                    <div className="hidden text-sm text-muted-foreground sm:block">
                      <span className="font-display text-base font-extrabold text-foreground">{p.alunos_count}</span>{" "}
                      {p.alunos_count === 1 ? "aluno" : "alunos"}
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                ))
              )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Para convidar, remover ou trocar o papel de alguém, acesse{" "}
              <Link to={teamMgmtTo} className="text-primary hover:underline">Equipe & convites</Link>.
            </p>
          </div>
        </div>
      </main>
      <MobileBottomNav scope={scope} />
    </div>
  );
}

function TabBtn({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm transition ${
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {label}
      <span className="ml-1 opacity-70">({count})</span>
    </button>
  );
}
