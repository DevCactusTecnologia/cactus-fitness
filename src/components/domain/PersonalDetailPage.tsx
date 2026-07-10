import { notFound, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Loader2, Mail, Phone, Calendar, Shield, Crown,
  BadgeCheck, Users as UsersIcon, FileText, Sparkles,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { initialsFromName } from "@/lib/auth";
import { colorForId } from "@/lib/avatar-color";
import type { Scope } from "@/lib/scope";

type PersonalDetail = {
  user_id: string;
  full_name: string;
  phone: string | null;
  cref: string | null;
  bio: string | null;
  specialties: string[] | null;
  created_at: string;
  role: "owner" | "personal" | "staff";
  member_since: string;
  organization_id: string;
  alunos: { id: string; full_name: string; is_active: boolean; created_at: string }[];
};

function usePersonal(personalId: string) {
  return useQuery({
    queryKey: ["personal-detail", personalId],
    queryFn: async (): Promise<PersonalDetail> => {
      const { data: authUser } = await supabase.auth.getUser();
      const uid = authUser.user?.id;
      if (!uid) throw notFound();

      const { data: mine } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", uid)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!mine?.organization_id) throw notFound();
      const orgId = mine.organization_id;

      const { data: member } = await supabase
        .from("organization_members")
        .select("user_id, role, created_at")
        .eq("organization_id", orgId)
        .eq("user_id", personalId)
        .maybeSingle();
      if (!member) throw notFound();

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, phone, cref, bio, specialties, created_at")
        .eq("id", personalId)
        .maybeSingle();

      const { data: alunos } = await supabase
        .from("alunos")
        .select("id, full_name, is_active, created_at")
        .eq("organization_id", orgId)
        .eq("personal_id", personalId)
        .order("created_at", { ascending: false });

      return {
        user_id: personalId,
        full_name: profile?.full_name ?? "Sem nome",
        phone: profile?.phone ?? null,
        cref: profile?.cref ?? null,
        bio: profile?.bio ?? null,
        specialties: (profile?.specialties as string[] | null) ?? null,
        created_at: profile?.created_at ?? member.created_at,
        role: member.role as PersonalDetail["role"],
        member_since: member.created_at,
        organization_id: orgId,
        alunos: (alunos ?? []) as PersonalDetail["alunos"],
      };
    },
  });
}

const TABS = ["Alunos", "Informações"];

function Row({
  icon: Icon, label, value,
}: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1">
      <div className="grid h-9 w-9 shrink-0 place-items-center text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value || "Não informado"}</div>
      </div>
    </div>
  );
}

export function PersonalDetailPage({ scope }: { scope: Scope }) {
  const { personalId } = useParams({ strict: false }) as { personalId: string };
  const { data: p, isLoading } = usePersonal(personalId);
  const [tab, setTab] = useState(0);

  const alunosBase = scope === "academia" ? "/dashboard/academia/alunos" : "/dashboard/personal/alunos";

  if (isLoading || !p) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = initialsFromName(p.full_name, null);
  const avColor = colorForId(p.user_id);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail scope={scope} />

      <main className="pb-24 md:ml-[72px] md:pb-10">
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
          <div className="px-4 py-4 sm:px-6 md:px-8">
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
              <h1 className="text-xl font-bold tracking-tight font-display sm:text-2xl">Perfil do Personal</h1>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
          <div className="rounded-xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-center gap-4">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-lg font-bold font-display ring-2 ring-primary shadow-md"
                style={{ backgroundColor: avColor.bg, color: avColor.fg }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold md:text-2xl font-display">{p.full_name}</h2>
                <p className="truncate text-sm text-muted-foreground">
                  {p.cref ? `CREF ${p.cref}` : "CREF não informado"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {p.role === "owner" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      <Crown className="h-3 w-3" /> Dono
                    </span>
                  ) : p.role === "personal" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-400">
                      <Shield className="h-3 w-3" /> Personal
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      Equipe
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <UsersIcon className="h-3 w-3" /> {p.alunos.length} {p.alunos.length === 1 ? "aluno" : "alunos"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border overflow-x-auto">
              <div className="inline-flex w-max min-w-full items-center">
                {TABS.map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setTab(i)}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                      i === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 md:p-6">
              {tab === 0 && (
                <div className="space-y-2">
                  {p.alunos.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                        <UsersIcon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium">Nenhum aluno vinculado</p>
                      <p className="text-xs text-muted-foreground">Este personal ainda não atende alunos.</p>
                    </div>
                  ) : (
                    p.alunos.map((a) => (
                      <Link
                        key={a.id}
                        to={`${alunosBase}/$alunoId` as "/dashboard/personal/alunos/$alunoId"}
                        params={{ alunoId: a.id }}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3 transition hover:bg-accent"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold font-display"
                            style={{ backgroundColor: colorForId(a.id).bg, color: colorForId(a.id).fg }}
                          >
                            {initialsFromName(a.full_name, null)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{a.full_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {a.is_active ? "Ativo" : "Desativado"} · desde{" "}
                              {new Date(a.created_at).toLocaleDateString("pt-BR")}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))
                  )}
                </div>
              )}

              {tab === 1 && (
                <div className="space-y-1">
                  <Row icon={BadgeCheck} label="CREF" value={p.cref} />
                  <Row icon={Phone} label="Telefone" value={p.phone} />
                  <Row icon={Mail} label="E-mail" value={null} />
                  <Row
                    icon={Calendar}
                    label="Membro desde"
                    value={new Date(p.member_since).toLocaleDateString("pt-BR")}
                  />
                  <Row
                    icon={Sparkles}
                    label="Especialidades"
                    value={p.specialties && p.specialties.length ? p.specialties.join(", ") : null}
                  />
                  <div className="mt-4 rounded-lg border border-border bg-background/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" /> Bio
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {p.bio || "Sem biografia cadastrada."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav scope={scope} />
    </div>
  );
}
