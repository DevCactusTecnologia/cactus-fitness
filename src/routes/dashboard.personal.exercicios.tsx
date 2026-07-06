import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Home, Calendar, GraduationCap, SlidersHorizontal, Plus, Bell, Users,
  Dumbbell, ClipboardCheck, Trophy, Search, ChevronLeft, Play,
  SlidersHorizontal as FilterIcon, Loader2, AlertTriangle, X, Check,
  ArrowLeft, ArrowRight, Video, Info, Target, ListChecks,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";

export const Route = createFileRoute("/dashboard/personal/exercicios")({
  head: () => ({
    meta: [
      { title: "Exercícios · cactusfitness" },
      { name: "description", content: "Biblioteca completa de exercícios organizados por grupo muscular." },
    ],
  }),
  component: ExerciciosPage,
});

type Group = { id: number; name: string; slug: string; sort_order: number };
type Equipment = { id: number; name: string; slug: string; sort_order: number };
type Exercise = {
  id: number;
  name: string;
  group_id: number;
  is_active: boolean;
  owner_id?: string | null;
  description?: string | null;
  instructions?: string | null;
  muscles_primary?: string[] | null;
  muscles_secondary?: string[] | null;
  equipment?: string | null;
  difficulty?: string | null;
  objective?: string | null;
  video_url?: string | null;
};

const OBJECTIVES = [
  "Capacidade Aeróbia",
  "Coordenativos",
  "Estabilidade",
  "Flexibilidade",
  "Força",
  "Potência",
  "Reabilitação",
];

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return url;
}


/* ---------- identidade local (sem auth) ---------- */
function getPersonalId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("personal_id");
  if (!id) {
    id = `personal_${crypto.randomUUID()}`;
    localStorage.setItem("personal_id", id);
  }
  return id;
}

/* ---------- Sidebar ---------- */
function SidebarIconBtn({
  icon: Icon, active, badge, to, onClick, variant = "ghost", label,
}: {
  icon: React.ElementType; active?: boolean; badge?: string; to?: string;
  onClick?: () => void; variant?: "ghost" | "primary"; label?: string;
}) {
  const base = "group relative grid h-11 w-11 place-items-center rounded-[10px] transition";
  const styles =
    variant === "primary"
      ? "h-8 w-8 bg-primary text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110"
      : active
      ? "bg-primary/20 text-primary"
      : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground";
  const inner = (
    <>
      {active && <span className="absolute -left-3.5 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
      <Icon className={variant === "primary" ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.75} />
      {badge && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
      {label && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-border opacity-0 group-hover:opacity-100 transition">
          {label}
        </span>
      )}
    </>
  );
  if (to) return <Link to={to} title={label} className={`${base} ${styles}`}>{inner}</Link>;
  return <button onClick={onClick} title={label} className={`${base} ${styles}`}>{inner}</button>;
}

function IconRail() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center gap-2 border-r border-border bg-sidebar py-4 md:flex">
      <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl">
        <svg viewBox="0 0 32 32" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8 L10 24 L16 14 L22 24 L28 8" />
        </svg>
      </div>
      <SidebarIconBtn icon={Home} to="/" label="Início" />
      <SidebarIconBtn icon={Users} to="/dashboard/personal/alunos" label="Alunos" />
      <SidebarIconBtn icon={Dumbbell} active label="Exercícios" />
      <SidebarIconBtn icon={ClipboardCheck} to="/" label="Avaliações" />
      <SidebarIconBtn icon={Trophy} to="/" label="Desafios" />
      <SidebarIconBtn icon={Calendar} to="/dashboard/personal/agenda" label="Agenda" />
      <SidebarIconBtn icon={GraduationCap} to="/" label="Tutoriais" />
      <SidebarIconBtn icon={SlidersHorizontal} to="/" label="Configurações" />
      <div className="mt-auto flex flex-col items-center gap-2">
        
        <SidebarIconBtn icon={Bell} badge="3" />
        <UserAvatarMenu initials="ML" name="Meu perfil" />

      </div>
    </aside>
  );
}

/* ---------- Page ---------- */
const PAGE_SIZE = 20;
const TABS = [
  { id: "all", label: "Todos" },
  { id: "mine", label: "Meus" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function ExerciciosPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<number | "all">("all");
  const [tab, setTab] = useState<TabId>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [detailEx, setDetailEx] = useState<Exercise | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const personalId = useMemo(() => getPersonalId(), []);

  const fetchAll = async () => {
    const pageSize = 1000;
    const all: Exercise[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("name")
        .range(from, from + pageSize - 1);
      if (error || !data) break;
      all.push(...(data as unknown as Exercise[]));
      if (data.length < pageSize) break;
    }
    return all;
  };

  const loadData = async () => {
    const [g, eq, e] = await Promise.all([
      supabase.from("exercise_groups").select("*").order("sort_order"),
      supabase.from("equipments" as never).select("*").order("sort_order") as unknown as Promise<{ data: Equipment[] | null }>,
      fetchAll(),
    ]);
    setGroups((g.data ?? []) as Group[]);
    setEquipments((eq.data ?? []) as Equipment[]);
    setExercises(e);
    setLoading(false);
  };


  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, []);

  const groupById = useMemo(() => {
    const m = new Map<number, Group>();
    groups.forEach((g) => m.set(g.id, g));
    return m;
  }, [groups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((x) => {
      if (tab === "mine" && x.owner_id !== personalId) return false;
      if (activeGroup !== "all" && x.group_id !== activeGroup) return false;
      if (q && !x.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, query, activeGroup, tab, personalId]);

  useEffect(() => { setVisible(PAGE_SIZE); }, [query, activeGroup, tab]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0">
      <IconRail />

      <main className="md:ml-[72px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="md:hidden grid h-8 w-8 place-items-center rounded-full text-muted-foreground active:scale-90 transition" aria-label="Voltar">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="truncate text-xl font-bold font-display md:text-2xl">Exercícios</h1>
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="Buscar" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground transition">
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110 md:text-sm"
            >
              <Plus className="h-4 w-4" /> Novo
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 mb-4 text-xs text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Ainda estamos gravando os vídeos dos exercícios que estão faltando.</span>
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar exercício..."
              className="w-full bg-transparent placeholder:text-muted-foreground focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-xs text-muted-foreground hover:text-foreground">limpar</button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center rounded-full bg-card border border-border p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                    tab === t.id
                      ? "bg-primary text-primary-foreground shadow-[0_0_16px_rgba(76,175,80,0.35)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                showFilters || activeGroup !== "all"
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <FilterIcon className="h-3.5 w-3.5" />
              Filtros
              {activeGroup !== "all" && (
                <span className="ml-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary/25 px-1 text-[10px]">1</span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mb-4 flex flex-wrap gap-2">
              <GroupChip label="Todos" active={activeGroup === "all"} onClick={() => setActiveGroup("all")} />
              {groups.map((g) => (
                <GroupChip key={g.id} label={g.name} active={activeGroup === g.id} onClick={() => setActiveGroup(g.id)} />
              ))}
            </div>
          )}

          {loading ? (
            <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando exercícios...
            </div>
          ) : (
            <>
              <div className="mb-3 text-xs text-muted-foreground">
                Mostrando {shown.length} de {filtered.length}
              </div>
              <div className="space-y-3 pb-6">
                {shown.map((x) => (
                  <ExerciseRow
                    key={x.id}
                    ex={x}
                    groupName={groupById.get(x.group_id)?.name ?? ""}
                    isMine={x.owner_id === personalId}
                    onClick={() => setDetailEx(x)}
                  />
                ))}
                {filtered.length === 0 && (
                  <div className="mt-10 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    {tab === "mine" ? "Você ainda não criou nenhum exercício." : "Nenhum exercício encontrado."}
                  </div>
                )}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando mais...
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <MobileBottomNav />

      {showWizard && (
        <NewExerciseWizard
          groups={groups}
          equipments={equipments}
          personalId={personalId}
          onClose={() => setShowWizard(false)}
          onCreated={async () => { setShowWizard(false); setTab("mine"); await loadData(); }}
        />
      )}

      {detailEx && (
        <ExerciseDetailModal
          ex={detailEx}
          groupName={groupById.get(detailEx.group_id)?.name ?? ""}
          onClose={() => setDetailEx(null)}
        />
      )}
    </div>
  );
}

function GroupChip({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function ExerciseRow({
  ex, groupName, isMine, onClick,
}: { ex: Exercise; groupName: string; isMine: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-card/70 border border-border/50 hover:border-primary/30 transition text-left"
    >
      <div className="relative w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 to-primary/5" />
        <div className="relative w-5 h-5 rounded-full bg-primary/95 flex items-center justify-center">
          <Play className="h-2.5 w-2.5 text-primary-foreground ml-0.5" fill="currentColor" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium truncate text-sm">{ex.name}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground bg-muted">
            {groupName}
          </span>
          {isMine && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-primary bg-primary/15">
              Meu
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ---------- Modal de Detalhes ---------- */

function ExerciseDetailModal({
  ex, groupName, onClose,
}: { ex: Exercise; groupName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div
        className="w-full md:max-w-2xl bg-card border border-border rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Detalhes do exercício</p>
            <h2 className="text-lg font-bold font-display truncate">{ex.name}</h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-muted/70 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {ex.video_url ? (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
              <iframe src={ex.video_url} className="w-full h-full" allowFullScreen title={ex.name} />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-border">
              <div className="text-center text-muted-foreground">
                <Video className="h-8 w-8 mx-auto mb-2 opacity-60" />
                <p className="text-xs">Sem vídeo cadastrado</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <InfoTile label="Grupo muscular" value={groupName} />
            <InfoTile label="Dificuldade" value={ex.difficulty || "—"} />
            <InfoTile label="Equipamento" value={ex.equipment || "—"} />
            <InfoTile label="Status" value={ex.is_active ? "Ativo" : "Inativo"} />
          </div>

          {ex.description && (
            <Section icon={Info} title="Descrição"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{ex.description}</p></Section>
          )}

          {ex.instructions && (
            <Section icon={ListChecks} title="Instruções de execução">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ex.instructions}</p>
            </Section>
          )}

          {(ex.muscles_primary?.length || ex.muscles_secondary?.length) ? (
            <Section icon={Target} title="Músculos trabalhados">
              {ex.muscles_primary?.length ? (
                <div className="mb-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Primários</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ex.muscles_primary.map((m) => (
                      <span key={m} className="rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-medium">{m}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {ex.muscles_secondary?.length ? (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Secundários</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ex.muscles_secondary.map((m) => (
                      <span key={m} className="rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-xs font-medium">{m}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ---------- Wizard Novo Exercício (6 etapas) ---------- */

type WizardData = {
  name: string;
  description: string;
  instructions: string;
  group_id: number | null;
  difficulty: string;
  objective: string;
  equipment: string[];
  muscles_primary: string[];
  muscles_secondary: string[];
  video_url: string;
  image_path: string;
  video_path: string;
};



const STEPS = [
  { id: 1, label: "Nome" },
  { id: 2, label: "Instruções" },
  { id: 3, label: "Detalhes" },
  { id: 4, label: "Músculos" },
  { id: 5, label: "Vídeo" },
  { id: 6, label: "Revisão" },
];

const STEP_META: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Informações básicas", subtitle: "Como o exercício se chama e do que se trata" },
  2: { title: "Instruções de execução", subtitle: "Passo a passo (opcional)" },
  3: { title: "Detalhes", subtitle: "Grupo, equipamento e dificuldade" },
  4: { title: "Músculos", subtitle: "Selecione os músculos trabalhados" },
  5: { title: "Vídeo", subtitle: "Link demonstrativo (opcional)" },
  6: { title: "Revisão", subtitle: "Confira antes de salvar" },
};

const DIFFICULTIES = ["Iniciante", "Intermediário", "Avançado"];
const MUSCLE_OPTIONS = [
  "Peitoral maior", "Peitoral menor", "Deltoide anterior", "Deltoide medial", "Deltoide posterior",
  "Bíceps", "Tríceps", "Antebraço", "Trapézio", "Grande dorsal", "Romboides", "Lombar",
  "Abdominal", "Oblíquos", "Glúteo máximo", "Glúteo médio", "Quadríceps", "Isquiotibiais",
  "Adutores", "Abdutores", "Panturrilha", "Tibial anterior",
];

function NewExerciseWizard({
  groups, equipments, personalId, onClose, onCreated,
}: {
  groups: Group[]; equipments: Equipment[]; personalId: string; onClose: () => void; onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WizardData>({
    name: "", description: "", instructions: "",
    group_id: groups[0]?.id ?? null,
    difficulty: "", objective: "", equipment: [],
    muscles_primary: [], muscles_secondary: [],
    video_url: "", image_path: "", video_path: "",
  });
  const [mediaTab, setMediaTab] = useState<"url" | "photo" | "video">("url");
  const [uploading, setUploading] = useState<null | "photo" | "video">(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [videoPreview, setVideoPreview] = useState<string>("");

  const uploadFile = async (file: File, kind: "photo" | "video") => {
    setUploading(kind); setError(null);
    try {
      const ext = file.name.split(".").pop() || (kind === "photo" ? "jpg" : "mp4");
      const path = `${personalId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("exercise-media").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("exercise-media").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (kind === "photo") {
        setData((d) => ({ ...d, image_path: path }));
        setImagePreview(signed?.signedUrl ?? "");
      } else {
        setData((d) => ({ ...d, video_path: path, video_url: "" }));
        setVideoPreview(signed?.signedUrl ?? "");
      }
    } catch (e: any) {
      setError(e.message ?? "Falha no upload");
    } finally {
      setUploading(null);
    }
  };

  const meta = STEP_META[step];
  const canNext = step === 1 ? data.name.trim().length > 0 : step === 3 ? data.group_id !== null : true;

  const submit = async () => {
    setSaving(true); setError(null);

    // Validação obrigatória — impede perda silenciosa
    const name = data.name.trim();
    if (!name) { setSaving(false); setStep(1); setError("Informe o nome do exercício."); return; }
    if (data.group_id == null) { setSaving(false); setStep(3); setError("Selecione o grupo muscular."); return; }

    const payload = {
      name,
      description: data.description.trim() || null,
      instructions: data.instructions.trim() || null,
      group_id: data.group_id,
      difficulty: data.difficulty || null,
      objective: data.objective || null,
      equipment: data.equipment.length ? data.equipment.join(", ") : null,
      muscles_primary: data.muscles_primary,
      muscles_secondary: data.muscles_secondary,
      video_url: data.video_url.trim() || null,
      image_path: data.image_path || null,
      video_path: data.video_path || null,
      owner_id: personalId,
      is_active: true,
    };

    const { data: inserted, error: err } = await (supabase.from("exercises") as any)
      .insert(payload)
      .select("*")
      .single();

    if (err) {
      setSaving(false);
      setError(`Erro ao salvar: ${err.message}`);
      return;
    }

    // Verifica se todos os campos foram persistidos (evita perda silenciosa)
    const missing: string[] = [];
    for (const [k, v] of Object.entries(payload)) {
      if (v === null || (Array.isArray(v) && v.length === 0)) continue;
      const stored = inserted?.[k];
      const eq =
        Array.isArray(v)
          ? Array.isArray(stored) && stored.length === v.length && v.every((x, i) => x === stored[i])
          : stored === v;
      if (!eq) missing.push(k);
    }

    setSaving(false);

    if (missing.length > 0) {
      setError(`Alguns campos não foram salvos: ${missing.join(", ")}. Verifique o schema da tabela.`);
      return;
    }

    onCreated();

  };

  const toggle = (arr: string[], m: string) =>
    arr.includes(m) ? arr.filter((x) => x !== m) : [...arr, m];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div
        className="w-full md:max-w-3xl bg-card border border-border rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 md:px-6 py-4 border-b border-border relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Novo exercício · Passo {step} de 6</p>
              <h2 className="text-xl md:text-2xl font-bold font-display leading-tight">{meta.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{meta.subtitle}</p>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-muted/70 transition shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stepper */}
          <div className="mt-4 overflow-x-auto -mx-1 px-1">
            <div className="flex items-center gap-2 min-w-max">
              {STEPS.map((s, i) => {
                const done = s.id < step;
                const current = s.id === step;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 ${current ? "" : ""}`}>
                      <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold transition ${
                        done ? "bg-primary/20 text-primary" :
                        current ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(76,175,80,0.5)]" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {done ? <Check className="h-3 w-3" /> : s.id}
                      </span>
                      <span className={`text-[11px] font-semibold ${current ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <span className={`h-px w-6 ${done ? "bg-primary/40" : "bg-border"}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 md:px-6 py-5 flex-1">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold">Informações Básicas</h3>
              <Field label="Nome do Exercício *">
                <input
                  autoFocus
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  placeholder="Ex: Agachamento"
                  className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition"
                />
              </Field>
              <Field label="Descrição" hint="(opcional)">
                <textarea
                  value={data.description}
                  onChange={(e) => setData({ ...data, description: e.target.value })}
                  placeholder="Breve descrição do exercício"
                  rows={4}
                  className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition resize-none"
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold">Instruções</h3>
              <Field label="Instruções Detalhadas" hint="(opcional)">
                <p className="text-xs text-muted-foreground mb-2">Descreva passo a passo como realizar o exercício. Use números para cada etapa.</p>
                <textarea
                  value={data.instructions}
                  onChange={(e) => setData({ ...data, instructions: e.target.value })}
                  placeholder={"Exemplo:\n1. Posicione os pés na largura dos ombros\n2. Flexione os joelhos mantendo a coluna ereta\n3. Retorne à posição inicial controlando o movimento"}
                  rows={8}
                  className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition resize-none font-mono"
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold">Detalhes</h3>
              <Field label="Grupo muscular *">
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setData({ ...data, group_id: g.id })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        data.group_id === g.id
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Dificuldade">
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setData({ ...data, difficulty: data.difficulty === d ? "" : d })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        data.difficulty === d
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Objetivo" hint="(opcional)">
                <select
                  value={data.objective}
                  onChange={(e) => setData({ ...data, objective: e.target.value })}
                  className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition [&>option]:bg-card [&>option]:text-foreground"
                >
                  <option value="" className="bg-card text-foreground">Selecione...</option>
                  {OBJECTIVES.map((o) => (
                    <option key={o} value={o} className="bg-card text-foreground">{o}</option>
                  ))}
                </select>
              </Field>

              <Field label="Equipamentos" hint="(opcional)">
                <div className="max-h-[260px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {equipments.map((eq) => {
                      const active = data.equipment.includes(eq.name);
                      return (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => setData({ ...data, equipment: toggle(data.equipment, eq.name) })}
                          className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                            active
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <span className="truncate">{eq.name}</span>
                          {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                    {equipments.length === 0 && (
                      <p className="col-span-full text-xs text-muted-foreground">Nenhum equipamento cadastrado.</p>
                    )}
                  </div>
                </div>
              </Field>

            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-base font-bold">Músculos</h3>
              <Field label="Primários">
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setData({ ...data, muscles_primary: toggle(data.muscles_primary, m) })}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        data.muscles_primary.includes(m)
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Secundários">
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setData({ ...data, muscles_secondary: toggle(data.muscles_secondary, m) })}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        data.muscles_secondary.includes(m)
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold">Mídia</h3>
              <p className="text-xs text-muted-foreground">Adicione uma URL do YouTube ou faça upload de foto/vídeo (opcional).</p>

              <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1 text-xs font-semibold">
                {([
                  { id: "url", label: "URL YouTube" },
                  { id: "photo", label: "Upload Foto" },
                  { id: "video", label: "Upload Vídeo" },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMediaTab(t.id)}
                    className={`px-3 py-1.5 rounded-md transition ${
                      mediaTab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {mediaTab === "url" && (
                <>
                  <Field label="URL do vídeo" hint="(YouTube, Vimeo, etc.)">
                    <input
                      value={data.video_url}
                      onChange={(e) => setData({ ...data, video_url: e.target.value, video_path: "" })}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition"
                    />
                  </Field>
                  {data.video_url && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                      <iframe src={toEmbedUrl(data.video_url)} className="w-full h-full" title="preview" allowFullScreen />
                    </div>
                  )}
                </>
              )}

              {mediaTab === "photo" && (
                <Field label="Foto do exercício" hint="(JPG, PNG · máx. 20MB)">
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 cursor-pointer hover:bg-muted/40 transition">
                    <Info className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm font-medium">{uploading === "photo" ? "Enviando..." : "Clique para escolher uma imagem"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading === "photo"}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "photo"); }}
                    />
                  </label>
                  {imagePreview && (
                    <img src={imagePreview} alt="preview" className="mt-3 w-full max-h-72 object-contain rounded-xl bg-black" />
                  )}
                </Field>
              )}

              {mediaTab === "video" && (
                <Field label="Vídeo do exercício" hint="(MP4, MOV · máx. 20MB)">
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 cursor-pointer hover:bg-muted/40 transition">
                    <Video className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm font-medium">{uploading === "video" ? "Enviando..." : "Clique para escolher um vídeo"}</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={uploading === "video"}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "video"); }}
                    />
                  </label>
                  {videoPreview && (
                    <video src={videoPreview} controls className="mt-3 w-full max-h-72 rounded-xl bg-black" />
                  )}
                </Field>
              )}
            </div>
          )}



          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold">Revisão</h3>
              <ReviewRow label="Nome" value={data.name} />
              <ReviewRow label="Descrição" value={data.description || "—"} />
              <ReviewRow label="Grupo" value={groups.find((g) => g.id === data.group_id)?.name ?? "—"} />
              <ReviewRow label="Dificuldade" value={data.difficulty || "—"} />
              <ReviewRow label="Objetivo" value={data.objective || "—"} />
              <ReviewRow label="Equipamentos" value={data.equipment.join(", ") || "—"} />

              <ReviewRow label="Músculos primários" value={data.muscles_primary.join(", ") || "—"} />
              <ReviewRow label="Músculos secundários" value={data.muscles_secondary.join(", ") || "—"} />
              <ReviewRow label="Vídeo" value={data.video_url || "—"} />
              <ReviewRow label="Instruções" value={data.instructions || "—"} />
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 text-xs">{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 md:px-6 py-4 border-t border-border flex items-center gap-3">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || saving}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ArrowLeft className="h-4 w-4" /> Anterior
          </button>
          {step < 6 ? (
            <button
              onClick={() => setStep((s) => Math.min(6, s + 1))}
              disabled={!canNext}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={saving || !data.name.trim() || data.group_id === null}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Check className="h-4 w-4" /> Salvar exercício</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">
        {label} {hint && <span className="text-xs text-muted-foreground font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground w-40 shrink-0 font-semibold uppercase tracking-wider">{label}</span>
      <span className="text-sm flex-1 break-words">{value}</span>
    </div>
  );
}
