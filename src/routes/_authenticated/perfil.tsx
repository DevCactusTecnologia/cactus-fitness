import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Upload, Check } from "lucide-react";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil · cactusfitness" },
      { name: "description", content: "Customize a aparência do app dos seus alunos." },
    ],
  }),
  component: PerfilPage,
});

const PRESET_COLORS = [
  "#D7F205", "#22C55E", "#3B82F6", "#8B5CF6",
  "#EC4899", "#F59E0B", "#EF4444", "#14B8A6",
];

const SECTIONS = [
  "Meus Treinos", "Dieta", "Progresso", "Avaliações",
  "Arquivos", "Agenda", "Mensagens", "Desafios",
  "Comunidade", "Anotações", "Formulários", "Produtos",
];

const STORAGE_KEY = "cactus.customization.v1";

type Customization = {
  brandTitle: string;
  primaryColor: string;
  welcome: string;
  sections: Record<string, boolean>;
};

const DEFAULTS: Customization = {
  brandTitle: "cactusfitness",
  primaryColor: "#D7F205",
  welcome: "",
  sections: Object.fromEntries(SECTIONS.map((s) => [s, true])),
};

// Convert #RRGGBB → "H S% L%" for CSS var
function hexToHslTuple(hex: string): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16) / 255;
  const g = parseInt(m.substring(2, 4), 16) / 255;
  const b = parseInt(m.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hexToRgba(hex: string, a: number) {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function applyPrimaryColor(hex: string) {
  const root = document.documentElement;
  root.style.setProperty("--primary", hexToHslTuple(hex));
  root.style.setProperty("--ring", hexToHslTuple(hex));
  root.style.setProperty("--sidebar-primary", hexToHslTuple(hex));
  root.style.setProperty("--primary-glow", hexToRgba(hex, 0.15));
  root.style.setProperty("--primary-glow-medium", hexToRgba(hex, 0.20));
  root.style.setProperty("--primary-glow-strong", hexToRgba(hex, 0.30));
}

function loadCustomization(): Customization {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function PerfilPage() {
  const initial = useMemo(loadCustomization, []);
  const [tab, setTab] = useState<"metricas" | "pagina" | "customizar">("customizar");
  const [brandTitle, setBrandTitle] = useState(initial.brandTitle);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [welcome, setWelcome] = useState(initial.welcome);
  const [sections, setSections] = useState<Record<string, boolean>>(initial.sections);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    applyPrimaryColor(primaryColor);
  }, [primaryColor]);

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Arquivo maior que 5MB");
      return;
    }
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  }

  function onSave() {
    const payload: Customization = { brandTitle, primaryColor, welcome, sections };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    applyPrimaryColor(primaryColor);
    toast.success("Customizações salvas");
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <IconRail />
      <main className="flex-1 pb-20 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
          <header className="mb-6">
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Perfil</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Personalize a aparência do app dos seus alunos.
            </p>
          </header>

          <div className="mb-6 inline-flex rounded-full border border-border bg-card p-1 text-sm">
            {[
              { id: "metricas", label: "Métricas" },
              { id: "pagina", label: "Página" },
              { id: "customizar", label: "Customizar" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "customizar" && (
            <div className="space-y-6">
              {/* Logo / Marca */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-base font-bold">Logo / Marca</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  A imagem que aparece no topo do app
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/30">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem logo</span>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    Enviar logo
                    <input type="file" accept="image/png,image/svg+xml" className="hidden" onChange={onLogoChange} />
                  </label>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  PNG ou SVG com fundo transparente. Máx 5MB. {logoFile && `Selecionado: ${logoFile.name}`}
                </p>
              </section>

              {/* Título ao lado do logo */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <Label htmlFor="brandTitle" className="font-display text-base font-bold">
                  Título ao lado do logo
                </Label>
                <Input
                  id="brandTitle"
                  value={brandTitle}
                  onChange={(e) => setBrandTitle(e.target.value)}
                  className="mt-3"
                  placeholder="Nome da consultoria"
                />
              </section>

              {/* Cor Principal */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-base font-bold">Cor Principal</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Usada nos botões, destaques e no app dos seus alunos
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {PRESET_COLORS.map((c) => {
                    const active = c.toLowerCase() === primaryColor.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setPrimaryColor(c)}
                        aria-label={`Cor ${c}`}
                        className={`grid h-10 w-10 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-card transition-all ${
                          active ? "ring-foreground" : "ring-transparent hover:ring-border"
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {active && <Check className="h-4 w-4 text-black" />}
                      </button>
                    );
                  })}
                  <label className="ml-2 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs">
                    Personalizada:
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border-none bg-transparent p-0"
                    />
                    <span className="font-mono">{primaryColor.toUpperCase()}</span>
                  </label>
                </div>
              </section>

              {/* Mensagem de Boas-vindas */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="welcome" className="font-display text-base font-bold">
                    Mensagem de Boas-vindas
                  </Label>
                  <span className="text-xs text-muted-foreground">{welcome.length}/200</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Texto que aparece na home do aluno</p>
                <Textarea
                  id="welcome"
                  value={welcome}
                  maxLength={200}
                  onChange={(e) => setWelcome(e.target.value)}
                  className="mt-3"
                  rows={3}
                />
              </section>

              {/* Seções Visíveis */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-base font-bold">Seções Visíveis</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Escolha quais seções seus alunos podem ver
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SECTIONS.map((s) => (
                    <div
                      key={s}
                      className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-2.5"
                    >
                      <span className="text-sm">{s}</span>
                      <Switch
                        checked={sections[s] ?? true}
                        onCheckedChange={(v) => setSections((prev) => ({ ...prev, [s]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex justify-end">
                <Button onClick={onSave} size="lg" className="rounded-full font-bold">
                  Salvar customizações
                </Button>
              </div>
            </div>
          )}

          {tab === "metricas" && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Métricas em breve.
            </div>
          )}
          {tab === "pagina" && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Configurações de página em breve.
            </div>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
