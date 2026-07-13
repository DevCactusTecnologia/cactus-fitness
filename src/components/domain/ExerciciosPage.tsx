import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search, ChevronLeft, Play,
  SlidersHorizontal as FilterIcon, Loader2, AlertTriangle, X, Check,
  ArrowLeft, ArrowRight, Video, Info, Target, ListChecks,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Scope } from "@/lib/scope";

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
  category?: string | null;
  video_url?: string | null;
  image_path?: string | null;
  video_path?: string | null;
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


/* ---------- personal id: real auth session ---------- */
function usePersonalId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return id;
}


import { IconRail } from "@/components/IconRail";

// Grupos-modalidade legados que hoje existem no banco mas conceitualmente são
// modalidade (Categoria), não músculo. Ficam ocultos como opção de "Grupo
// muscular", mas continuam funcionando para exercícios legados já cadastrados.
const MODALITY_GROUP_SLUGS = new Set([
  "aerobio", "funcional", "alongamento", "em-casa",
  "mobilidade", "elasticos", "mat-pilates", "laboral",
]);
const isMuscleGroup = (g: Group) => !MODALITY_GROUP_SLUGS.has(g.slug);

/* ---------- Page ---------- */
const PAGE_SIZE = 20;
const TABS = [
  { id: "all", label: "Todos" },
  { id: "mine", label: "Meus" },
] as const;
type TabId = (typeof TABS)[number]["id"];



export function ExerciciosPage({ scope }: { scope: Scope }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<number | "all">("all");
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [tab, setTab] = useState<TabId>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingEx, setEditingEx] = useState<Exercise | null>(null);
  const [personalizingEx, setPersonalizingEx] = useState<Exercise | null>(null);
  const [detailEx, setDetailEx] = useState<Exercise | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const personalId = usePersonalId();

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
      supabase.from("equipments").select("*").order("sort_order"),
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

  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return exercises.filter((x) => {
      if (tab === "mine" && x.owner_id !== personalId) return false;
      if (activeGroup !== "all" && x.group_id !== activeGroup) return false;
      if (activeCategory !== "all" && (x.category ?? "") !== activeCategory) return false;
      if (q && !normalize(x.name).includes(q)) return false;
      return true;
    });
  }, [exercises, query, activeGroup, activeCategory, tab, personalId]);


  useEffect(() => { setVisible(PAGE_SIZE); }, [query, activeGroup, activeCategory, tab]);


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
      <IconRail scope={scope} />

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
                showFilters || activeGroup !== "all" || activeCategory !== "all"
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <FilterIcon className="h-3.5 w-3.5" />
              Filtros
              {(activeGroup !== "all" ? 1 : 0) + (activeCategory !== "all" ? 1 : 0) > 0 && (
                <span className="ml-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary/25 px-1 text-[10px]">
                  {(activeGroup !== "all" ? 1 : 0) + (activeCategory !== "all" ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mb-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Grupo muscular</p>
                <div className="flex flex-wrap gap-2">
                  <GroupChip label="Todos" active={activeGroup === "all"} onClick={() => setActiveGroup("all")} />
                  {groups.filter(isMuscleGroup).map((g) => (
                    <GroupChip key={g.id} label={g.name} active={activeGroup === g.id} onClick={() => setActiveGroup(g.id)} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Categoria</p>
                <div className="flex flex-wrap gap-2">
                  <GroupChip label="Todas" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
                  {CATEGORIES.map((c) => (
                    <GroupChip key={c} label={c} active={activeCategory === c} onClick={() => setActiveCategory(c)} />
                  ))}
                </div>
              </div>
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

      <MobileBottomNav scope={scope} />

      {showWizard && personalId && (
        <NewExerciseWizard
          groups={groups}
          equipments={equipments}
          personalId={personalId}
          mode="new"
          onClose={() => setShowWizard(false)}
          onCreated={async () => { setShowWizard(false); setTab("mine"); await loadData(); }}
        />
      )}

      {editingEx && personalId && (
        <NewExerciseWizard
          groups={groups}
          equipments={equipments}
          personalId={personalId}
          initial={editingEx}
          mode="edit"
          onClose={() => setEditingEx(null)}
          onCreated={async () => { setEditingEx(null); await loadData(); }}
        />
      )}

      {personalizingEx && personalId && (
        <NewExerciseWizard
          groups={groups}
          equipments={equipments}
          personalId={personalId}
          initial={personalizingEx}
          mode="personalize"
          onClose={() => setPersonalizingEx(null)}
          onCreated={async () => { setPersonalizingEx(null); setTab("mine"); await loadData(); }}
        />
      )}

      {detailEx && (
        <ExerciseDetailModal
          ex={detailEx}
          groupName={groupById.get(detailEx.group_id)?.name ?? ""}
          isOwner={detailEx.owner_id === personalId}
          onClose={() => setDetailEx(null)}
          onEdit={() => { setEditingEx(detailEx); setDetailEx(null); }}
          onPersonalize={() => { setPersonalizingEx(detailEx); setDetailEx(null); }}
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
          {ex.category && ex.category.trim().toLowerCase() !== groupName.trim().toLowerCase() && (
            <>
              <span className="text-[11px] text-muted-foreground/60">·</span>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground bg-muted">
                {ex.category}
              </span>
            </>
          )}
          {ex.difficulty && (
            <>
              <span className="text-[11px] text-muted-foreground/60">·</span>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground bg-muted">
                {ex.difficulty}
              </span>
            </>
          )}
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
  ex, groupName, isOwner, onClose, onEdit, onPersonalize,
}: { ex: Exercise; groupName: string; isOwner?: boolean; onClose: () => void; onEdit?: () => void; onPersonalize?: () => void }) {
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
          <div className="flex items-center gap-2 shrink-0">
            {isOwner && onEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition"
              >
                Editar
              </button>
            )}
            {!isOwner && onPersonalize && (
              <button
                onClick={onPersonalize}
                title='Uma cópia será salva na aba "Meus Exercícios"'
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25 transition"
              >
                Personalizar exercício
              </button>
            )}
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-muted/70 transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>



        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {ex.video_url ? (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
              <iframe src={toEmbedUrl(ex.video_url)} className="w-full h-full" allowFullScreen title={ex.name} />
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

/* ---------- Novo Exercício — tela única ---------- */

type FormData = {
  name: string;
  description: string;
  instructions: string;
  group_id: number | null;
  category: string;
  difficulty: string;
  objective: string;
  equipment: string[];
  muscles_primary: string[];
  muscles_secondary: string[];
  video_url: string;
  image_path: string;
  video_path: string;
};

const DIFFICULTIES = ["Iniciante", "Intermediário", "Avançado"];
const CATEGORIES = [
  "Musculação", "Aeróbico", "Funcional", "Alongamento",
  "Em casa", "Mobilidade", "Elástico", "MAT Pilates", "Laboral",
];
const MUSCLE_OPTIONS = [
  "Peitoral maior", "Peitoral menor", "Deltoide anterior", "Deltoide medial", "Deltoide posterior",
  "Bíceps", "Tríceps", "Antebraço", "Trapézio", "Grande dorsal", "Romboides", "Lombar",
  "Abdominal", "Oblíquos", "Glúteo máximo", "Glúteo médio", "Quadríceps", "Isquiotibiais",
  "Adutores", "Abdutores", "Panturrilha", "Tibial anterior",
];

function NewExerciseWizard({
  groups, equipments, personalId, initial, mode = "new", onClose, onCreated,
}: {
  groups: Group[]; equipments: Equipment[]; personalId: string;
  initial?: Exercise | null;
  mode?: "new" | "edit" | "personalize";
  onClose: () => void; onCreated: () => void;
}) {
  const isEdit = mode === "edit";
  const isPersonalize = mode === "personalize";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FormData>(() => ({
    name: initial?.name ? (isPersonalize ? `${initial.name} (personalizado)` : initial.name) : "",
    description: [initial?.description, initial?.instructions].filter(Boolean).join("\n\n"),
    instructions: "",
    group_id: initial?.group_id ?? null,
    category: initial?.category ?? "",
    difficulty: initial?.difficulty ?? "",
    objective: initial?.objective ?? "",
    equipment: initial?.equipment ? initial.equipment.split(",").map((s) => s.trim()).filter(Boolean) : [],
    muscles_primary: initial?.muscles_primary ?? [],
    muscles_secondary: initial?.muscles_secondary ?? [],
    video_url: initial?.video_url ?? "",
    image_path: isPersonalize ? "" : (initial?.image_path ?? ""),
    video_path: isPersonalize ? "" : (initial?.video_path ?? ""),
  }));
  const [mediaTab, setMediaTab] = useState<"none" | "url" | "photo" | "video">(() => {
    if (initial?.video_url) return "url";
    if (initial?.video_path && !isPersonalize) return "video";
    if (initial?.image_path && !isPersonalize) return "photo";
    return "none";
  });
  const [uploading, setUploading] = useState<null | "photo" | "video">(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Load existing media previews on edit
  useEffect(() => {
    if (isPersonalize) return;
    let cancelled = false;
    (async () => {
      if (initial?.image_path) {
        const { data: s } = await supabase.storage.from("exercise-media").createSignedUrl(initial.image_path, 60 * 60);
        if (!cancelled) setImagePreview(s?.signedUrl ?? "");
      }
      if (initial?.video_path) {
        const { data: s } = await supabase.storage.from("exercise-media").createSignedUrl(initial.video_path, 60 * 60);
        if (!cancelled) setVideoPreview(s?.signedUrl ?? "");
      }
    })();
    return () => { cancelled = true; };
  }, [initial?.image_path, initial?.video_path, isPersonalize]);


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

  const step1Valid = data.name.trim().length > 0 && data.group_id !== null;
  const canSave = step1Valid && !saving;

  const submit = async () => {
    setSaving(true); setError(null);
    const name = data.name.trim();
    if (!name) { setSaving(false); setError("Informe o nome do exercício."); setStep(1); return; }
    if (data.group_id == null) { setSaving(false); setError("Selecione o grupo muscular."); setStep(1); return; }

    const payload: any = {
      name,
      description: data.description.trim() || null,
      instructions: data.instructions.trim() || null,
      group_id: data.group_id,
      category: data.category || null,
      difficulty: data.difficulty || null,
      objective: data.objective || null,
      equipment: data.equipment.length ? data.equipment.join(", ") : null,
      muscles_primary: data.muscles_primary,
      muscles_secondary: data.muscles_secondary,
      video_url: data.video_url.trim() || null,
      image_path: data.image_path || null,
      video_path: data.video_path || null,
    };

    let err: any = null;
    if (isEdit && initial) {
      const res = await (supabase.from("exercises") as any).update(payload).eq("id", initial.id);
      err = res.error;
    } else {
      payload.owner_id = personalId;
      payload.is_active = true;
      const res = await (supabase.from("exercises") as any).insert(payload);
      err = res.error;
    }
    setSaving(false);
    if (err) { setError(`Erro ao salvar: ${err.message}`); return; }
    onCreated();
  };

  const toggle = (arr: string[], m: string) =>
    arr.includes(m) ? arr.filter((x) => x !== m) : [...arr, m];

  const STEPS = [
    { n: 1, label: "Básico" },
    { n: 2, label: "Mídia" },
    { n: 3, label: "Detalhes" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div
        className="w-full md:max-w-2xl bg-card border border-border rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 md:px-6 py-4 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {isEdit ? "Editar exercício" : isPersonalize ? "Personalizar exercício" : "Novo exercício"} · Etapa {step} de 3
            </p>
            <h2 className="text-xl md:text-2xl font-bold font-display leading-tight">
              {STEPS[step - 1].label}
            </h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-muted/70 transition shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-5 md:px-6 pt-4">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const active = s.n === step;
              const done = s.n < step;
              return (
                <div key={s.n} className="flex items-center gap-2 flex-1">
                  <button
                    type="button"
                    onClick={() => { if (s.n < step || (s.n === 2 && step1Valid) || (s.n === 3 && step1Valid)) setStep(s.n); }}
                    className={`h-1.5 flex-1 rounded-full transition ${
                      active ? "bg-primary" : done ? "bg-primary/60" : "bg-muted"
                    }`}
                    aria-label={`Ir para ${s.label}`}
                  />
                  {i < STEPS.length - 1 && <span className="sr-only">·</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 md:px-6 py-5 flex-1 space-y-5">
          {isPersonalize && step === 1 && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs flex gap-2.5 items-start">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <div className="space-y-1 text-foreground/90">
                <p className="font-semibold text-primary">Você está criando uma cópia personalizada</p>
                <p>
                  O exercício original <span className="font-semibold">{initial?.name}</span> não será alterado. A sua versão será salva na aba <span className="font-semibold">Meus Exercícios</span>, disponível só para você.
                </p>
              </div>
            </div>
          )}

          {!isPersonalize && !isEdit && step === 1 && (
            <p className="text-xs text-muted-foreground">
              Será salvo na aba <span className="font-semibold text-foreground">Meus Exercícios</span>.
            </p>
          )}

          {/* Etapa 1 — Básico */}
          {step === 1 && (
            <>
              <Field label="Nome *">
                <input
                  autoFocus
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  placeholder="Ex: Agachamento"
                  className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition"
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Grupo muscular *">
                  <Select
                    value={data.group_id != null ? String(data.group_id) : ""}
                    onValueChange={(v) => setData({ ...data, group_id: v ? Number(v) : null })}
                  >
                    <SelectTrigger className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm h-auto focus:border-primary transition">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.filter(isMuscleGroup).map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Categoria" hint="(modalidade)">
                  <Select
                    value={data.category || undefined}
                    onValueChange={(v) => setData({ ...data, category: v })}
                  >
                    <SelectTrigger className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm h-auto focus:border-primary transition">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

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
            </>
          )}

          {/* Etapa 2 — Mídia */}
          {step === 2 && (
            <div>
              <p className="text-xs text-muted-foreground mb-3">Adicione um vídeo ou foto para o aluno visualizar a execução. Opcional — pode pular.</p>
              <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1 text-xs font-semibold mb-3">
                {([
                  { id: "none", label: "Sem mídia" },
                  { id: "url", label: "YouTube" },
                  { id: "photo", label: "Foto" },
                  { id: "video", label: "Vídeo" },
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
                  <input
                    value={data.video_url}
                    onChange={(e) => setData({ ...data, video_url: e.target.value, video_path: "" })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition"
                  />
                  {data.video_url && (
                    <div className="mt-3 aspect-video w-full rounded-xl overflow-hidden bg-black">
                      <iframe src={toEmbedUrl(data.video_url)} className="w-full h-full" title="preview" allowFullScreen />
                    </div>
                  )}
                </>
              )}

              {mediaTab === "photo" && (
                <>
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 cursor-pointer hover:bg-muted/40 transition">
                    <Info className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{uploading === "photo" ? "Enviando..." : "Escolher imagem (JPG/PNG, máx. 20MB)"}</span>
                    <input
                      type="file" accept="image/*" className="hidden" disabled={uploading === "photo"}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "photo"); }}
                    />
                  </label>
                  {imagePreview && (
                    <img src={imagePreview} alt="preview" className="mt-3 w-full max-h-72 object-contain rounded-xl bg-black" />
                  )}
                </>
              )}

              {mediaTab === "video" && (
                <>
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 cursor-pointer hover:bg-muted/40 transition">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{uploading === "video" ? "Enviando..." : "Escolher vídeo (MP4/MOV, máx. 20MB)"}</span>
                    <input
                      type="file" accept="video/*" className="hidden" disabled={uploading === "video"}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "video"); }}
                    />
                  </label>
                  {videoPreview && (
                    <video src={videoPreview} controls className="mt-3 w-full max-h-72 rounded-xl bg-black" />
                  )}
                </>
              )}
            </div>
          )}

          {/* Etapa 3 — Detalhes (tudo opcional) */}
          {step === 3 && (
            <>
              <p className="text-xs text-muted-foreground">Tudo opcional. Salve a qualquer momento.</p>

              <Field label="Descrição e execução" hint="Explique o exercício e como executá-lo passo a passo.">
                <textarea
                  value={data.description}
                  onChange={(e) => setData({ ...data, description: e.target.value, instructions: "" })}
                  placeholder={"Ex.: Exercício para peitoral.\n1. Deite no banco...\n2. Desça a barra..."}
                  rows={6}
                  className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary transition resize-none"
                />
              </Field>

              <Field label="Objetivo">
                <Select
                  value={data.objective || undefined}
                  onValueChange={(v) => setData({ ...data, objective: v })}
                >
                  <SelectTrigger className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm h-auto focus:border-primary transition">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Músculos primários">
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_OPTIONS.map((m) => (
                    <button
                      key={`p-${m}`} type="button"
                      onClick={() => setData({ ...data, muscles_primary: toggle(data.muscles_primary, m) })}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        data.muscles_primary.includes(m)
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >{m}</button>
                  ))}
                </div>
              </Field>

              <Field label="Músculos secundários">
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_OPTIONS.map((m) => (
                    <button
                      key={`s-${m}`} type="button"
                      onClick={() => setData({ ...data, muscles_secondary: toggle(data.muscles_secondary, m) })}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        data.muscles_secondary.includes(m)
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >{m}</button>
                  ))}
                </div>
              </Field>

              <Field label="Equipamentos">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {equipments.map((eq) => {
                    const active = data.equipment.includes(eq.name);
                    return (
                      <button
                        key={eq.id} type="button"
                        onClick={() => setData({ ...data, equipment: toggle(data.equipment, eq.name) })}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-colors ${
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
              </Field>
            </>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 text-xs">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 md:px-6 py-4 border-t border-border flex items-center gap-3">
          <button
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as 1 | 2 | 3)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40 transition"
          >
            {step === 1 ? "Cancelar" : (<><ArrowLeft className="h-4 w-4" /> Voltar</>)}
          </button>

          {step < 3 ? (
            <>
              {step === 2 && (
                <button
                  onClick={submit}
                  disabled={!canSave}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/70 disabled:opacity-40 transition"
                >
                  Salvar agora
                </button>
              )}
              <button
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                disabled={step === 1 && !step1Valid}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={submit}
              disabled={!canSave}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.35)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Check className="h-4 w-4" /> {isEdit ? "Salvar alterações" : isPersonalize ? "Salvar em Meus Exercícios" : "Salvar exercício"}</>}
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
