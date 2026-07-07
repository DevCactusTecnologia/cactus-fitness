import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, FileText, Palette, Upload, Check } from "lucide-react";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Consultoria · cactusfitness" },
      { name: "description", content: "Customize a aparência do app dos seus alunos." },
    ],
  }),
  component: PerfilPage,
});

const PRESET_COLORS = [
  "rgb(215, 242, 5)", "rgb(233, 197, 16)", "rgb(255, 107, 53)",
  "rgb(244, 67, 54)", "rgb(233, 30, 99)", "rgb(156, 39, 176)",
  "rgb(103, 58, 183)", "rgb(63, 81, 181)", "rgb(33, 150, 243)",
  "rgb(3, 169, 244)", "rgb(0, 188, 212)", "rgb(0, 150, 136)",
  "rgb(76, 175, 80)", "rgb(139, 195, 74)", "rgb(255, 152, 0)",
];

const SECTIONS = [
  "Meus Treinos", "Dieta", "Progresso", "Avaliações",
  "Arquivos", "Agenda", "Mensagens", "Desafios",
  "Comunidade", "Anotações", "Formulários", "Produtos",
];

const STORAGE_KEY = "cactus.customization.v1";

type Customization = {
  brandTitle: string;
  showBrandTitle: boolean;
  primaryColor: string; // hex
  welcome: string;
  sections: Record<string, boolean>;
};

const DEFAULTS: Customization = {
  brandTitle: "cactusfitness",
  showBrandTitle: false,
  primaryColor: "#D7F205",
  welcome: "",
  sections: Object.fromEntries(SECTIONS.map((s) => [s, true])),
};

function rgbStringToHex(c: string): string {
  const m = c.match(/\d+/g);
  if (!m || m.length < 3) return c;
  const [r, g, b] = m.map(Number);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

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
  root.style.setProperty("--primary-glow-medium", hexToRgba(hex, 0.2));
  root.style.setProperty("--primary-glow-strong", hexToRgba(hex, 0.3));
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
  const [showBrandTitle, setShowBrandTitle] = useState(initial.showBrandTitle);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [savedColor, setSavedColor] = useState(initial.primaryColor);
  const [welcome, setWelcome] = useState(initial.welcome);
  const [sections, setSections] = useState<Record<string, boolean>>(initial.sections);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const colorPending = primaryColor.toLowerCase() !== savedColor.toLowerCase();

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
    setLogoPreview(URL.createObjectURL(f));
  }

  function saveColor() {
    const current = loadCustomization();
    const payload: Customization = { ...current, primaryColor };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    applyPrimaryColor(primaryColor);
    setSavedColor(primaryColor);
    toast.success("Cor salva");
  }

  function cancelColor() {
    setPrimaryColor(savedColor);
    applyPrimaryColor(savedColor);
  }

  function onSave() {
    const payload: Customization = { brandTitle, showBrandTitle, primaryColor, welcome, sections };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    applyPrimaryColor(primaryColor);
    setSavedColor(primaryColor);
    toast.success("Customizações salvas");
  }

  const tabs = [
    { id: "metricas" as const, label: "Métricas", icon: BarChart3 },
    { id: "pagina" as const, label: "Página", icon: FileText },
    { id: "customizar" as const, label: "Customizar", icon: Palette },
  ];

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <IconRail />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-[72px]">
        <div className="min-h-screen pb-24 text-foreground md:pb-0">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:p-6">
            <h1 className="font-display text-xl font-bold md:text-2xl">Consultoria</h1>
          </header>

          <main className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-6">
            {/* Tabs */}
            <div
              role="tablist"
              className="mb-4 grid h-10 w-full grid-cols-3 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground sm:mb-6"
            >
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                      active ? "bg-background text-foreground shadow-sm" : ""
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {tab === "customizar" && (
              <div className="space-y-4">
                {/* Logo / Marca */}
                <section className="rounded-xl border border-border bg-card text-foreground">
                  <div className="flex flex-col space-y-1.5 p-4">
                    <h3 className="font-display text-base font-bold tracking-tight sm:text-lg">
                      Logo / Marca
                    </h3>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      A imagem que aparece no topo do app
                    </p>
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-center gap-4">
                      <label className="shrink-0 cursor-pointer transition-transform active:scale-95">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/40 hover:bg-muted">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                          ) : (
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <input type="file" accept="image/*,.svg" className="hidden" onChange={onLogoChange} />
                      </label>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Enviar logo</p>
                        <p className="mt-0.5 text-[0.625rem] text-muted-foreground">
                          PNG ou SVG com fundo transparente. Máx 5MB.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 border-t border-border pt-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Título ao lado do logo</Label>
                        <Switch checked={showBrandTitle} onCheckedChange={setShowBrandTitle} />
                      </div>
                      {showBrandTitle && (
                        <input
                          value={brandTitle}
                          onChange={(e) => setBrandTitle(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
                          placeholder="Nome da consultoria"
                        />
                      )}
                    </div>
                  </div>
                </section>

                {/* Cor Principal */}
                <section className="rounded-xl border border-border bg-card text-foreground">
                  <div className="flex flex-col space-y-1.5 p-4">
                    <h3 className="font-display text-base font-bold tracking-tight sm:text-lg">
                      Cor Principal
                    </h3>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Usada nos botões, destaques e no app dos seus alunos
                    </p>
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((c) => {
                        const hex = rgbStringToHex(c);
                        const active = hex.toLowerCase() === primaryColor.toLowerCase();
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setPrimaryColor(hex)}
                            aria-label={`Cor ${hex}`}
                            className={`grid h-10 w-10 place-items-center rounded-full transition-all active:scale-90 ${
                              active
                                ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-background"
                                : "hover:scale-105"
                            }`}
                            style={{ backgroundColor: c }}
                          >
                            {active && <Check className="h-4 w-4 text-black" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="shrink-0 text-sm font-medium">Personalizada:</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                          className="h-10 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                        />
                        <input
                          value={primaryColor}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColor(v.toUpperCase());
                          }}
                          className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-1 font-mono text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Mensagem de Boas-vindas */}
                <section className="rounded-xl border border-border bg-card text-foreground">
                  <div className="flex flex-col space-y-1.5 p-4">
                    <h3 className="font-display text-base font-bold tracking-tight sm:text-lg">
                      Mensagem de Boas-vindas
                    </h3>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Texto que aparece na home do aluno
                    </p>
                  </div>
                  <div className="p-4">
                    <Textarea
                      value={welcome}
                      maxLength={200}
                      onChange={(e) => setWelcome(e.target.value)}
                      className="h-20 resize-none text-sm"
                      placeholder="Ex: Bem-vindo ao seu espaço de treino! Qualquer dúvida, me chame."
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <span />
                      <p className="text-[0.625rem] text-muted-foreground">{welcome.length}/200</p>
                    </div>
                  </div>
                </section>

                {/* Seções Visíveis */}
                <section className="rounded-xl border border-border bg-card text-foreground">
                  <div className="flex flex-col space-y-1.5 p-4">
                    <h3 className="font-display text-base font-bold tracking-tight sm:text-lg">
                      Seções Visíveis
                    </h3>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Escolha quais seções seus alunos podem ver
                    </p>
                  </div>
                  <div className="space-y-3 p-4">
                    {SECTIONS.map((s) => (
                      <div key={s} className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{s}</Label>
                        <Switch
                          checked={sections[s] ?? true}
                          onCheckedChange={(v) => setSections((prev) => ({ ...prev, [s]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <div className="sticky bottom-20 z-10 pt-2 md:bottom-4">
                  <Button
                    onClick={onSave}
                    size="lg"
                    className="w-full font-bold shadow-lg"
                  >
                    Salvar customizações
                  </Button>
                </div>
              </div>
            )}

            {tab === "metricas" && (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Métricas em breve.
              </div>
            )}
            {tab === "pagina" && (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Configurações de página em breve.
              </div>
            )}
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
