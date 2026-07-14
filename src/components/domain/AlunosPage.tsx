import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import {
  Plus,
  Users,
  Search,
  ChevronRight,
  ChevronDown,
  Activity,
  CalendarDays,
  ArrowUpDown,
  Loader2,
  User,
  Mail,
  Phone,
  Sparkles,
  Cake,
  Link2,
  LayoutGrid,
  Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { IconRail } from "@/components/IconRail";
import { initialsFromName } from "@/lib/auth";
import { colorForId } from "@/lib/avatar-color";
import type { Scope } from "@/lib/scope";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


type AlunoRow = {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  updated_at: string;
};

type TabKey = "todos" | "ativos" | "desativados";

function InfoCard({
  title,
  desc,
  icon: Icon,
  onClick,
}: {
  title: string;
  desc: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition hover:border-border-strong"
    >
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
    </button>
  );
}


function TabBtn({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm transition ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {label}
      <span className="ml-1 opacity-70">({count})</span>
    </button>
  );
}

export function AlunosPage({ scope }: { scope: Scope }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabKey>("todos");
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    nickname: "",
    birth_date: "",
    email: "",
    phone: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false }) as { new?: boolean };
  const navigate = useNavigate();

  useEffect(() => {
    if (search?.new) {
      setOpenNew(true);
      navigate({ to: ".", search: {}, replace: true });
    }
  }, [search?.new, navigate]);

  const createAluno = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { data: userData } = await supabase.auth.getUser();
      const personalId = userData.user?.id;
      if (!personalId) throw new Error("Sessão expirada. Faça login novamente.");
      const { error } = await supabase.from("alunos").insert({
        personal_id: personalId,
        full_name: payload.full_name.trim(),
        nickname: payload.nickname.trim() || null,
        birth_date: payload.birth_date || null,
        email: payload.email.trim() || null,
        phone: payload.phone.trim() || null,
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alunos", scope] });
      setOpenNew(false);
      setForm({ full_name: "", nickname: "", birth_date: "", email: "", phone: "" });
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.full_name.trim()) {
      setFormError("Informe o nome completo do aluno.");
      return;
    }
    createAluno.mutate(form);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const PAGE_SIZE = 20;
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["alunos", scope],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<AlunoRow[]> => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("alunos")
        .select("id, full_name, email, is_active, updated_at, created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as AlunoRow[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length,
  });

  const alunos = useMemo<AlunoRow[]>(
    () => (data?.pages ?? []).flat(),
    [data],
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const counts = useMemo(
    () => ({
      todos: alunos.length,
      ativos: alunos.filter((a) => a.is_active).length,
      desativados: alunos.filter((a) => !a.is_active).length,
    }),
    [alunos],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return alunos.filter((a) => {
      if (tab === "ativos" && !a.is_active) return false;
      if (tab === "desativados" && a.is_active) return false;
      if (!term) return true;
      return (
        a.full_name.toLowerCase().includes(term) ||
        (a.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [alunos, q, tab]);

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
              <h1 className="text-xl font-bold tracking-tight font-display sm:text-2xl">
                Alunos
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenNew(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110"
              >
                <Plus className="h-4 w-4" /> Novo Aluno
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
                  placeholder="buscar alunos..."
                  className="w-full bg-transparent placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <InfoCard
                icon={Activity}
                title="Rotinas de treino"
                desc="Veja quem treinou e quantas vezes em qualquer período."
                onClick={() =>
                  navigate({
                    to:
                      scope === "academia"
                        ? "/dashboard/academia/alunos/rotinas"
                        : "/dashboard/personal/alunos/rotinas",
                  })
                }
              />
              <InfoCard
                icon={CalendarDays}
                title="Vencimento dos treinos"
                desc="Veja quando o treino de cada aluno termina e quem precisa renovar."
              />

            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1">
                <TabBtn
                  label="Todos"
                  count={counts.todos}
                  active={tab === "todos"}
                  onClick={() => setTab("todos")}
                />
                <TabBtn
                  label="Ativos"
                  count={counts.ativos}
                  active={tab === "ativos"}
                  onClick={() => setTab("ativos")}
                />
                <TabBtn
                  label="Desativados"
                  count={counts.desativados}
                  active={tab === "desativados"}
                  onClick={() => setTab("desativados")}
                />
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent">
                <ArrowUpDown className="h-4 w-4" /> Mais recentes
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              {isLoading
                ? "Carregando..."
                : `${filtered.length} ${
                    filtered.length === 1
                      ? "aluno encontrado"
                      : "alunos encontrados"
                  }`}
            </p>

            <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
              <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_auto] items-center gap-4 border-b border-border px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                <div>Nome</div>
                <div>Status</div>
                <div>Atualizado</div>
                <div className="w-8" />
              </div>

              {isLoading ? (
                <div className="grid place-items-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Nenhum aluno cadastrado ainda
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Clique em "Novo Aluno" para começar.
                    </p>
                  </div>
                </div>
              ) : (
                filtered.map((a) =>
                  scope === "academia" ? (
                    <Link
                      key={a.id}
                      to="/dashboard/academia/alunos/$alunoId"
                      params={{ alunoId: a.id }}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 transition hover:bg-accent/50 sm:grid-cols-[1.6fr_1fr_1fr_auto] sm:px-5 sm:py-4"
                    >
                      <AlunoRowInner a={a} />
                    </Link>
                  ) : (
                    <Link
                      key={a.id}
                      to="/dashboard/personal/alunos/$alunoId"
                      params={{ alunoId: a.id }}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 transition hover:bg-accent/50 sm:grid-cols-[1.6fr_1fr_1fr_auto] sm:px-5 sm:py-4"
                    >
                      <AlunoRowInner a={a} />
                    </Link>
                  ),
                )
              )}
              {hasNextPage && (
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center py-6 text-xs text-muted-foreground"
                >
                  {isFetchingNextPage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Carregando mais..."
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav scope={scope} />

      <Dialog
        open={openNew}
        onOpenChange={(o) => {
          setOpenNew(o);
          if (!o) setFormError(null);
        }}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <form onSubmit={submitNew}>
            <div className="flex items-center gap-4 border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-5">
              <div
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold font-display ring-2 ring-primary/40 transition"
                style={{
                  backgroundColor: form.full_name
                    ? colorForId(form.full_name).bg
                    : "hsl(var(--muted))",
                  color: form.full_name
                    ? colorForId(form.full_name).fg
                    : "hsl(var(--muted-foreground))",
                }}
              >
                {form.full_name
                  ? initialsFromName(form.full_name, form.email)
                  : "?"}
              </div>
              <div className="min-w-0">
                <DialogHeader className="space-y-0.5 text-left">
                  <DialogTitle className="text-lg">Novo aluno</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground">
                  Só o essencial. Você completa o perfil depois.
                </p>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-medium text-muted-foreground">
                  Nome completo
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, full_name: e.target.value }))
                    }
                    placeholder="Ex: Maria Silva"
                    autoFocus
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nickname" className="text-xs font-medium text-muted-foreground">
                    Apelido <span className="text-muted-foreground/70">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="nickname"
                      value={form.nickname}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nickname: e.target.value }))
                      }
                      placeholder="Como você chama"
                      className="pl-9"
                      maxLength={40}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="birth_date" className="text-xs font-medium text-muted-foreground">
                    Nascimento <span className="text-muted-foreground/70">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <Cake className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="birth_date"
                      type="date"
                      value={form.birth_date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, birth_date: e.target.value }))
                      }
                      max={new Date().toISOString().slice(0, 10)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>


              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground">
                  Telefone <span className="text-muted-foreground/70">(opcional)</span>
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        phone: formatPhone(e.target.value),
                      }))
                    }
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  E-mail <span className="text-muted-foreground/70">(opcional)</span>
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="aluno@email.com"
                    className="pl-9"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Necessário para o aluno acessar o app.
                </p>
              </div>

              {formError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              )}
            </div>

            <DialogFooter className="border-t border-border bg-muted/30 px-6 py-3">
              <button
                type="button"
                onClick={() => setOpenNew(false)}
                className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createAluno.isPending || !form.full_name.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {createAluno.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Cadastrar
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlunoRowInner({ a }: { a: AlunoRow }) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold font-display ring-2 ring-primary"
          style={{
            backgroundColor: colorForId(a.id).bg,
            color: colorForId(a.id).fg,
          }}
        >
          {initialsFromName(a.full_name, a.email)}
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium">{a.full_name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {a.email ?? "sem e-mail"}
          </div>
        </div>
      </div>
      <div className="hidden sm:block">
        {a.is_active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Ativo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Desativado
          </span>
        )}
      </div>
      <div className="hidden text-sm text-muted-foreground sm:block">
        {new Date(a.updated_at).toLocaleDateString("pt-BR")}
      </div>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground">
        <ChevronRight className="h-4 w-4" />
      </span>
    </>
  );
}
