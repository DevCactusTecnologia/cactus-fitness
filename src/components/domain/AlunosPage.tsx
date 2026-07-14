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

type TabKey = "todos" | "ativos" | "convidados" | "desativados";

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
      convidados: 0,
      desativados: alunos.filter((a) => !a.is_active).length,
    }),
    [alunos],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return alunos.filter((a) => {
      if (tab === "ativos" && !a.is_active) return false;
      if (tab === "desativados" && a.is_active) return false;
      if (tab === "convidados") return false;
      if (!term) return true;
      return (
        a.full_name.toLowerCase().includes(term) ||
        (a.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [alunos, q, tab]);

  const rotinasHref =
    scope === "academia"
      ? "/dashboard/academia/alunos/rotinas"
      : "/dashboard/personal/alunos/rotinas";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconRail scope={scope} />

      <div className="pb-24 md:ml-[72px] md:pb-0">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:p-6">
          <div className="flex items-center gap-3">
            <h1 className="hidden font-display text-2xl font-bold md:block">
              Alunos
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-transparent px-4 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary hover:text-primary hover:shadow-glow active:scale-95"
            >
              <Link2 className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Link de cadastro</span>
              <span className="sm:hidden">Link</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenNew(true)}
              className="relative inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-glow-lg active:translate-y-0 active:scale-[0.97]"
            >
              <Plus className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Novo Aluno</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="p-4 md:p-6">
          <div className="mx-auto max-w-4xl">
            {/* Search + Categorias */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  type="text"
                  placeholder="buscar alunos..."
                  className="h-12 w-full rounded-xl border border-border bg-surface-2 pl-10 pr-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <button
                type="button"
                className="relative flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-transparent px-6 py-2.5 text-sm font-semibold text-foreground transition-all hover:border-primary hover:text-primary hover:shadow-glow active:scale-[0.97] md:w-auto"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden md:inline">Gerenciar Categorias</span>
                <span className="md:hidden">Categorias</span>
              </button>
            </div>

            {/* Filter by category */}
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="relative inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-transparent px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary hover:text-primary hover:shadow-glow active:scale-[0.97] sm:flex-none"
                >
                  <Filter className="h-4 w-4" />
                  Filtrar por categoria
                </button>
              </div>
            </div>

            {/* Rotinas de treino */}
            <Link
              to={rotinasHref}
              className="group mb-3 block rounded-xl border border-border bg-surface-1 p-3 transition-all hover:border-primary/40 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold text-foreground">
                    Rotinas de treino
                  </p>
                  <p className="text-xs text-fg-muted">
                    Veja quem treinou e quantas vezes em qualquer período.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>




            {/* Vencimentos */}
            <button
              type="button"
              className="group mb-6 block w-full rounded-xl border border-border bg-surface-1 p-3 text-left transition-all hover:border-primary/40 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold text-foreground">
                    Vencimento dos treinos
                  </p>
                  <p className="text-xs text-fg-muted">
                    Veja quando o treino de cada aluno termina e quem precisa renovar.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>

            {/* Status tabs + Sort */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="no-scrollbar flex min-w-0 items-center gap-0 overflow-x-auto rounded-full bg-surface-2 p-1">
                {(
                  [
                    ["todos", `Todos (${counts.todos})`],
                    ["ativos", `Ativos (${counts.ativos})`],
                    ["convidados", "Convidados"],
                    ["desativados", "Desativados"],
                  ] as [TabKey, string][]
                ).map(([key, label]) => {
                  const active = tab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-fg-muted hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="flex h-9 w-auto items-center justify-between gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-2 text-xs text-foreground"
              >
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
                <span>Mais recentes</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
            </div>

            {/* Count */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-fg-muted">
                <span className="font-medium text-foreground">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1 ? "aluno encontrado" : "alunos encontrados"}
              </p>
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
              <div className="hidden border-b border-border p-4 md:flex">
                <div className="w-12" />
                <div className="flex-1 font-medium">Nome</div>
                <div className="w-24 text-center font-medium">Status</div>
                <div className="w-32 text-center font-medium">Último Acesso</div>
              </div>

              <div className="divide-y divide-border">
                {isLoading ? (
                  <div className="grid place-items-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-fg-muted" />
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
                      <p className="mt-1 text-xs text-fg-muted">
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
                        className="flex items-center justify-between p-4 transition-colors hover:bg-surface-2"
                      >
                        <AlunoRowInner a={a} />
                      </Link>
                    ) : (
                      <Link
                        key={a.id}
                        to="/dashboard/personal/alunos/$alunoId"
                        params={{ alunoId: a.id }}
                        className="flex items-center justify-between p-4 transition-colors hover:bg-surface-2"
                      >
                        <AlunoRowInner a={a} />
                      </Link>
                    ),
                  )
                )}
                {hasNextPage && (
                  <div
                    ref={sentinelRef}
                    className="flex items-center justify-center py-6 text-xs text-fg-muted"
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
      </div>
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

type RankTier = {
  name: string;
  rgb: string; // "r, g, b"
  textLight: string;
  textDark: string;
};

const RANK_TIERS: RankTier[] = [
  { name: "Bronze", rgb: "205, 127, 50", textLight: "#9A5B12", textDark: "#CD7F32" },
  { name: "Prata", rgb: "148, 163, 184", textLight: "#475569", textDark: "#CBD5E1" },
  { name: "Ouro", rgb: "234, 179, 8", textLight: "#854D0E", textDark: "#FDE047" },
  { name: "Platina", rgb: "20, 184, 166", textLight: "#0F766E", textDark: "#5EEAD4" },
  { name: "Diamante", rgb: "139, 92, 246", textLight: "#6D28D9", textDark: "#C4B5FD" },
];

function rankForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return RANK_TIERS[h % RANK_TIERS.length];
}

function RankBadge({ tier }: { tier: RankTier }) {
  const boxStyle = {
    backgroundColor: `rgba(${tier.rgb}, 0.15)`,
    border: `1.5px solid rgba(${tier.rgb}, 0.4)`,
  };
  const textClass = `text-[${tier.textLight}] dark:text-[${tier.textDark}]`;
  const shield = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 256 256"
      className={textClass}
    >
      <path d="M224,56v56c0,52.72-25.52,84.67-46.93,102.19-23.06,18.86-46,25.27-47,25.53a8,8,0,0,1-4.2,0c-1-.26-23.91-6.67-47-25.53C57.52,196.67,32,164.72,32,112V56A16,16,0,0,1,48,40H208A16,16,0,0,1,224,56Z" />
    </svg>
  );
  return (
    <span
      data-onboarding="ranking-aluno-badge"
      className="shrink-0"
      title={`Divisão ${tier.name.toLowerCase()}`}
    >
      <div className="flex items-center gap-2.5 sm:hidden">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl"
          style={boxStyle}
        >
          {shield}
        </div>
      </div>
      <div className="hidden items-center gap-2.5 sm:flex">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl"
          style={boxStyle}
        >
          {shield}
        </div>
        <span className={`font-display text-xs font-extrabold ${textClass}`}>
          {tier.name}
        </span>
      </div>
    </span>
  );
}

function formatLastAccess(iso: string) {
  const then = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86400000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `há ${days} dias`;
  return then.toLocaleDateString("pt-BR");
}

function AlunoRowInner({ a }: { a: AlunoRow }) {
  const rank = rankForId(a.id);
  const statusPill = a.is_active ? (
    <span className="whitespace-nowrap rounded-full bg-green-900/20 px-2 py-1 text-xs text-green-500">
      Ativo
    </span>
  ) : (
    <span className="whitespace-nowrap rounded-full bg-muted px-2 py-1 text-xs text-fg-muted">
      Desativado
    </span>
  );
  return (
    <>
      <div className="relative mr-3 shrink-0">
        <div
          className="relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold text-white"
          style={{
            width: 40,
            height: 40,
            backgroundColor: colorForId(a.id).bg,
            color: colorForId(a.id).fg,
            fontSize: 16,
          }}
        >
          <span>{initialsFromName(a.full_name, a.email)}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-medium">{a.full_name}</h3>
          <RankBadge tier={rank} />
        </div>
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
          <p className="truncate text-xs text-fg-muted">
            {a.email ?? "sem e-mail"}
          </p>
        </div>
      </div>
      <div className="hidden w-24 text-center md:block">{statusPill}</div>
      <div className="hidden w-32 text-center text-fg-muted md:block">
        {formatLastAccess(a.updated_at)}
      </div>
      <div className="flex items-center md:hidden">{statusPill}</div>
    </>
  );
}
