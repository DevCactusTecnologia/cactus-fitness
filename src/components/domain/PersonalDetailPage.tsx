import { notFound, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft, ChevronRight, Loader2, Mail, Phone, Calendar, Shield, Crown,
  BadgeCheck, Users as UsersIcon, Pencil, KeyRound, Eye, EyeOff, Lock, Trash2, AlertTriangle, Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { initialsFromName } from "@/lib/auth";
import { colorForId } from "@/lib/avatar-color";
import type { Scope } from "@/lib/scope";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  updatePersonalProfile, changePersonalPassword, togglePersonalActive, getPersonalEmail,
} from "@/lib/personal-admin.functions";
import { removeMember } from "@/lib/academia-config.functions";

type PersonalDetail = {
  user_id: string;
  full_name: string;
  phone: string | null;
  cref: string | null;
  created_at: string;
  role: "owner" | "personal" | "staff";
  is_active: boolean;
  member_since: string;
  organization_id: string;
  alunos_count: number;
};

type AlunoLite = { id: string; full_name: string; is_active: boolean; created_at: string };
const ALUNOS_PAGE_SIZE = 20;


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
        .select("user_id, role, created_at, is_active")
        .eq("organization_id", orgId)
        .eq("user_id", personalId)
        .maybeSingle();
      if (!member) throw notFound();

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, phone, cref, created_at")
        .eq("id", personalId)
        .maybeSingle();

      const { count: alunosCount } = await supabase
        .from("alunos")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("personal_id", personalId);

      return {
        user_id: personalId,
        full_name: profile?.full_name ?? "Sem nome",
        phone: profile?.phone ?? null,
        cref: profile?.cref ?? null,
        created_at: profile?.created_at ?? member.created_at,
        role: member.role as PersonalDetail["role"],
        is_active: (member as any).is_active ?? true,
        member_since: member.created_at,
        organization_id: orgId,
        alunos_count: alunosCount ?? 0,
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
  const getEmailFn = useServerFn(getPersonalEmail);
  const { data: emailData } = useQuery({
    queryKey: ["personal-email", personalId],
    queryFn: () => getEmailFn({ data: { personalId } }),
    staleTime: 60_000,
  });
  const [tab, setTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [alunoQuery, setAlunoQuery] = useState("");

  const alunosBase = scope === "academia" ? "/dashboard/academia/alunos" : "/dashboard/personal/alunos";

  const orgId = p?.organization_id;
  const {
    data: alunosData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: alunosLoading,
  } = useInfiniteQuery({
    queryKey: ["personal-alunos", personalId, orgId, alunoQuery.trim().toLowerCase()],
    enabled: !!orgId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<AlunoLite[]> => {
      const from = (pageParam as number) * ALUNOS_PAGE_SIZE;
      const to = from + ALUNOS_PAGE_SIZE - 1;
      let query = supabase
        .from("alunos")
        .select("id, full_name, is_active, created_at")
        .eq("organization_id", orgId!)
        .eq("personal_id", personalId);
      const term = alunoQuery.trim();
      if (term) query = query.ilike("full_name", `%${term}%`);
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as AlunoLite[];
    },
    getNextPageParam: (last, all) => (last.length < ALUNOS_PAGE_SIZE ? undefined : all.length),
  });

  const alunos = useMemo<AlunoLite[]>(() => (alunosData?.pages ?? []).flat(), [alunosData]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);


  if (isLoading || !p) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = initialsFromName(p.full_name, null);
  const avColor = colorForId(p.user_id);
  const canManage = p.role !== "owner";

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
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      p.is_active
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.is_active ? "Ativo" : "Inativo"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <UsersIcon className="h-3 w-3" /> {p.alunos_count} {p.alunos_count === 1 ? "aluno" : "alunos"}
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
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-full border border-border bg-background/40 px-4 py-2 text-sm">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                      value={alunoQuery}
                      onChange={(e) => setAlunoQuery(e.target.value)}
                      placeholder="buscar aluno..."
                      className="w-full bg-transparent placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>

                  {alunosLoading ? (
                    <div className="grid place-items-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : alunos.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                        <UsersIcon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium">
                        {alunoQuery ? "Nenhum aluno encontrado" : "Nenhum aluno vinculado"}
                      </p>
                      {!alunoQuery && (
                        <p className="text-xs text-muted-foreground">Este personal ainda não atende alunos.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alunos.map((a) => (
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
                      ))}
                      {hasNextPage && (
                        <div
                          ref={sentinelRef}
                          className="flex items-center justify-center py-4 text-xs text-muted-foreground"
                        >
                          {isFetchingNextPage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Carregando mais..."
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}


              {tab === 1 && (
                <>
                  <div className="space-y-1">
                    <Row icon={BadgeCheck} label="CREF" value={p.cref} />
                    <Row icon={Phone} label="Telefone" value={p.phone} />
                    <Row icon={Mail} label="E-mail" value={emailData?.email ?? null} />
                    <Row
                      icon={Calendar}
                      label="Membro desde"
                      value={new Date(p.member_since).toLocaleDateString("pt-BR")}
                    />
                  </div>

                  <div className="mt-6 space-y-4 border-t border-border pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setEditOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors duration-200 hover:border-primary hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar dados
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => setPassOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors duration-200 hover:border-primary hover:text-primary"
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Alterar senha
                          </button>

                          <button
                            onClick={() => setToggleOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[oklch(0.72_0.18_45)] transition hover:bg-[oklch(0.72_0.18_45)]/10"
                          >
                            <Lock className="h-3.5 w-3.5" /> {p.is_active ? "Desativar personal" : "Ativar personal"}
                          </button>
                          <button
                            onClick={() => setDeleteOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[oklch(0.68_0.22_25)] transition hover:bg-[oklch(0.68_0.22_25)]/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir personal


                          </button>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Membro desde {new Date(p.member_since).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav scope={scope} />

      <EditProfileDialog personal={p} email={emailData?.email ?? null} open={editOpen} onOpenChange={setEditOpen} />
      <ChangePasswordDialog personal={p} open={passOpen} onOpenChange={setPassOpen} />
      <ToggleActiveDialog personal={p} open={toggleOpen} onOpenChange={setToggleOpen} />
      <DeletePersonalDialog personal={p} scope={scope} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}

function EditProfileDialog({
  personal, email, open, onOpenChange,
}: { personal: PersonalDetail; email: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updatePersonalProfile);
  const [fullName, setFullName] = useState(personal.full_name);
  const [phone, setPhone] = useState(personal.phone ?? "");
  const [cref, setCref] = useState(personal.cref ?? "");
  const [emailVal, setEmailVal] = useState(email ?? "");

  useEffect(() => {
    if (open) {
      setFullName(personal.full_name);
      setPhone(personal.phone ?? "");
      setCref(personal.cref ?? "");
      setEmailVal(email ?? "");
    }
  }, [open, personal, email]);

  const emailChanged = emailVal.trim().toLowerCase() !== (email ?? "").toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal.trim());
  const emailError = emailChanged && emailVal.trim().length > 0 && !emailValid ? "E-mail inválido" : null;

  const save = useMutation({
    mutationFn: async () => {
      await updateFn({
        data: {
          personalId: personal.user_id,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          cref: cref.trim() || null,
          ...(emailChanged && emailValid ? { email: emailVal.trim().toLowerCase() } : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["personal-detail", personal.user_id] });
      qc.invalidateQueries({ queryKey: ["personal-email", personal.user_id] });
      qc.invalidateQueries({ queryKey: ["personais"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Editar dados</DialogTitle>
          <DialogDescription>Atualize as informações do personal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Nome completo</Label>
            <Input id="p-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-phone">Telefone</Label>
            <Input
              id="p-phone"
              value={phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                let formatted = digits;
                if (digits.length > 0) formatted = `(${digits.slice(0, 2)}`;
                if (digits.length >= 3) formatted += `) ${digits.slice(2, 7)}`;
                if (digits.length >= 8) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
                setPhone(formatted);
              }}
              placeholder="(11) 99999-9999"
              inputMode="numeric"
              maxLength={15}
            />

          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-email">E-mail</Label>
            <Input
              id="p-email"
              type="email"
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
              placeholder="email@exemplo.com"
              autoComplete="email"
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-cref">CREF</Label>
            <Input id="p-cref" value={cref} onChange={(e) => setCref(e.target.value)} placeholder="000000-G/UF" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || fullName.trim().length < 2 || !!emailError}>
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleActiveDialog({
  personal, open, onOpenChange,
}: { personal: PersonalDetail; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const toggleFn = useServerFn(togglePersonalActive);
  const next = !personal.is_active;

  const submit = useMutation({
    mutationFn: async () => {
      await toggleFn({ data: { personalId: personal.user_id, is_active: next } });
    },
    onSuccess: () => {
      toast.success(next ? "Personal ativado" : "Personal desativado");
      qc.invalidateQueries({ queryKey: ["personal-detail", personal.user_id] });
      qc.invalidateQueries({ queryKey: ["personais"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao alterar status"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {next ? "Ativar personal" : "Desativar personal"}
          </DialogTitle>
          <DialogDescription>
            {next
              ? `${personal.full_name} voltará a aparecer nas listagens ativas.`
              : `${personal.full_name} deixará de aparecer nas listagens ativas. Os alunos vinculados permanecem, mas o acesso pode ser revisto.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submit.isPending}>Cancelar</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending ? "Salvando..." : next ? "Ativar" : "Desativar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeletePersonalDialog({
  personal, scope, open, onOpenChange,
}: { personal: PersonalDetail; scope: Scope; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const removeFn = useServerFn(removeMember);
  const [confirm, setConfirm] = useState("");

  useEffect(() => { if (open) setConfirm(""); }, [open]);

  const canSubmit = confirm.trim().toLowerCase() === "excluir";

  const submit = useMutation({
    mutationFn: async () => {
      await removeFn({ data: { userId: personal.user_id } });
    },
    onSuccess: () => {
      toast.success("Personal removido");
      qc.invalidateQueries({ queryKey: ["personais"] });
      onOpenChange(false);
      const base = scope === "academia" ? "/dashboard/academia/personais" : "/dashboard/personal/personais";
      navigate({ to: base });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[oklch(0.68_0.22_25)]" /> Excluir personal
          </DialogTitle>
          <DialogDescription>
            Esta ação remove <span className="font-medium">{personal.full_name}</span> da academia.
            Os alunos vinculados ficam sem personal responsável até serem realocados.
            Digite <span className="font-mono font-semibold">excluir</span> para confirmar.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="excluir"
          autoComplete="off"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submit.isPending}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => submit.mutate()}
            disabled={!canSubmit || submit.isPending}
          >
            {submit.isPending ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({
  personal, open, onOpenChange,
}: { personal: PersonalDetail; open: boolean; onOpenChange: (v: boolean) => void }) {
  const changeFn = useServerFn(changePersonalPassword);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) { setPassword(""); setConfirm(""); setShow(false); }
  }, [open]);

  const passError = password.length > 0 && password.length < 8 ? "Mínimo 8 caracteres" : null;
  const confirmError = confirm.length > 0 && confirm !== password ? "Senhas não coincidem" : null;
  const canSubmit = password.length >= 8 && confirm === password;

  const submit = useMutation({
    mutationFn: async () => {
      await changeFn({ data: { personalId: personal.user_id, newPassword: password } });
    },
    onSuccess: () => {
      toast.success("Senha atualizada");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao alterar senha"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Alterar senha</DialogTitle>
          <DialogDescription>Defina uma nova senha para {personal.full_name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pass">Nova senha</Label>
            <div className="relative">
              <Input
                id="pass"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passError && <p className="text-xs text-destructive">{passError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pass-c">Confirmar senha</Label>
            <Input
              id="pass-c"
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {confirmError && <p className="text-xs text-destructive">{confirmError}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submit.isPending}>Cancelar</Button>
          <Button onClick={() => submit.mutate()} disabled={!canSubmit || submit.isPending}>
            {submit.isPending ? "Salvando..." : "Alterar senha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
