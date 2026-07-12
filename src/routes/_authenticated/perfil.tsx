import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, FileText, Palette, Upload, Check, Loader2, Camera } from "lucide-react";
import { IconRail } from "@/components/IconRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useCurrentUser, initialsFromName } from "@/lib/auth";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { colorForId } from "@/lib/avatar-color";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { applyPrimaryColor } from "@/lib/theme";

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

type Customization = {
  brandTitle: string;
  showBrandTitle: boolean;
  brandLogoPath: string | null;
  primaryColor: string;
  welcome: string;
  sections: Record<string, boolean>;
};

const DEFAULTS: Customization = {
  brandTitle: "cactusfitness",
  showBrandTitle: false,
  brandLogoPath: null,
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

async function signedLogoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

function useCustomization() {
  return useQuery({
    queryKey: ["profile-customization"],
    queryFn: async (): Promise<Customization & { brandLogoUrl: string | null }> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return { ...DEFAULTS, brandLogoUrl: null };
      const { data } = await supabase
        .from("profiles")
        .select("brand_title, show_brand_title, brand_logo_url, primary_color, welcome_message, visible_sections")
        .eq("id", userId)
        .maybeSingle();
      const row = (data ?? {}) as {
        brand_title?: string | null;
        show_brand_title?: boolean | null;
        brand_logo_url?: string | null;
        primary_color?: string | null;
        welcome_message?: string | null;
        visible_sections?: Record<string, boolean> | null;
      };
      const brandLogoPath = row.brand_logo_url ?? null;
      return {
        brandTitle: row.brand_title ?? DEFAULTS.brandTitle,
        showBrandTitle: row.show_brand_title ?? DEFAULTS.showBrandTitle,
        brandLogoPath,
        primaryColor: row.primary_color ?? DEFAULTS.primaryColor,
        welcome: row.welcome_message ?? DEFAULTS.welcome,
        sections: { ...DEFAULTS.sections, ...(row.visible_sections ?? {}) },
        brandLogoUrl: await signedLogoUrl(brandLogoPath),
      };
    },
  });
}


function PerfilPage() {
  const qc = useQueryClient();
  const { data: initial, isLoading } = useCustomization();
  const [tab, setTab] = useState<"metricas" | "pagina" | "customizar">("customizar");
  const [brandTitle, setBrandTitle] = useState(DEFAULTS.brandTitle);
  const [showBrandTitle, setShowBrandTitle] = useState(DEFAULTS.showBrandTitle);
  const [primaryColor, setPrimaryColor] = useState(DEFAULTS.primaryColor);
  const [savedColor, setSavedColor] = useState(DEFAULTS.primaryColor);
  const [welcome, setWelcome] = useState(DEFAULTS.welcome);
  const [sections, setSections] = useState<Record<string, boolean>>(DEFAULTS.sections);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { profile } = useCurrentUser();
  const avatarUrl = useAvatarUrl(profile?.avatar_url);
  const initials = initialsFromName(profile?.full_name, profile?.email);
  const avatarColor = colorForId(profile?.id ?? "user");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Arquivo maior que 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const handleAvatarConfirm = async (blob: Blob) => {
    if (!profile?.id) return;
    setUploadingAvatar(true);
    const path = `${profile.id}/avatar-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (upErr) { setUploadingAvatar(false); toast.error("Falha ao enviar imagem"); return; }
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", profile.id);
    setUploadingAvatar(false);
    setCropSrc(null);
    if (dbErr) { toast.error(dbErr.message); return; }
    await qc.invalidateQueries({ queryKey: ["current-user-profile", profile.id] });
    toast.success("Foto atualizada");
  };

  const colorPending = primaryColor.toLowerCase() !== savedColor.toLowerCase();

  useEffect(() => {
    if (!initial) return;
    setBrandTitle(initial.brandTitle);
    setShowBrandTitle(initial.showBrandTitle);
    setPrimaryColor(initial.primaryColor);
    setSavedColor(initial.primaryColor);
    setWelcome(initial.welcome);
    setSections(initial.sections);
  }, [initial]);

  useEffect(() => {
    applyPrimaryColor(primaryColor);
  }, [primaryColor]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Customization) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("profiles")
        .update({
          brand_title: payload.brandTitle,
          show_brand_title: payload.showBrandTitle,
          primary_color: payload.primaryColor,
          welcome_message: payload.welcome,
          visible_sections: payload.sections,
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-customization"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Arquivo maior que 5MB");
      return;
    }
    setLogoPreview(URL.createObjectURL(f));
  }

  async function saveColor() {
    await saveMutation.mutateAsync({ brandTitle, showBrandTitle, primaryColor, welcome, sections });
    applyPrimaryColor(primaryColor);
    setSavedColor(primaryColor);
  }


  function cancelColor() {
    setPrimaryColor(savedColor);
    applyPrimaryColor(savedColor);
  }

  async function onSave() {
    await saveMutation.mutateAsync({ brandTitle, showBrandTitle, primaryColor, welcome, sections });
    applyPrimaryColor(primaryColor);
    setSavedColor(primaryColor);
    toast("Customizações salvas", {
      description: "Suas preferências foram atualizadas.",
      duration: 2200,
    });


  }

  const tabs = [
    { id: "metricas" as const, label: "Métricas", icon: BarChart3 },
    { id: "pagina" as const, label: "Página", icon: FileText },
    { id: "customizar" as const, label: "Customizar", icon: Palette },
  ];

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }


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
              <div className="flex flex-col space-y-4">
                {/* Foto de Perfil */}
                <section className="rounded-xl border border-border bg-card text-foreground">
                  <div className="flex flex-col space-y-1.5 p-4">
                    <h3 className="font-display text-base font-bold tracking-tight sm:text-lg">
                      Foto de perfil
                    </h3>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Aparece no painel e para seus alunos
                    </p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="group relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-primary/70 font-display text-xl font-bold transition active:scale-95"
                        style={avatarUrl ? undefined : { backgroundColor: avatarColor.bg, color: avatarColor.fg }}
                      >
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span>{initials}</span>
                        )}
                        <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                          <Camera className="h-5 w-5 text-white" />
                        </span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-transparent px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
                        >
                          {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {avatarUrl ? "Trocar foto" : "Enviar foto"}
                        </button>
                        <p className="mt-2 text-[0.625rem] text-muted-foreground">
                          JPG ou PNG. Máx 5MB.
                        </p>
                      </div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarPick}
                      />
                    </div>
                  </div>
                </section>

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
                          className="flex h-11 w-full rounded-lg border border-input/60 bg-background/60 px-4 py-2 text-base font-light tracking-tight shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none"
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
                        <div className="relative grid h-10 w-10 place-items-center rounded-md border border-border bg-background p-1">
                          <div
                            className="h-full w-full rounded-[4px]"
                            style={{ backgroundColor: primaryColor }}
                          />
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            aria-label="Escolher cor personalizada"
                          />
                        </div>
                        <input
                          value={primaryColor}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColor(v.toUpperCase());
                          }}
                          className="flex h-10 w-32 rounded-md border border-input bg-background px-3 font-mono text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none"
                        />
                      </div>
                    </div>

                    {colorPending && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={cancelColor}
                          className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-border bg-transparent px-5 text-sm font-semibold text-foreground transition-all duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.97]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={saveColor}
                          className="relative inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.35)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_40px_hsl(var(--primary)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:translate-y-0 active:scale-[0.97]"
                        >
                          Salvar cor
                        </button>
                      </div>
                    )}

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
                      className="min-h-24 resize-none rounded-lg border-input/60 bg-background/60 px-4 py-3 text-base font-light tracking-tight placeholder:text-muted-foreground/70 focus-visible:border-primary"
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

                <button
                  onClick={onSave}
                  className="relative inline-flex h-10 w-full items-center justify-center gap-2 self-start whitespace-nowrap rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.35)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_40px_hsl(var(--primary)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:translate-y-0 active:scale-[0.97] sm:w-auto"
                >
                  Salvar customizações
                </button>



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
      <AvatarCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        onCancel={() => setCropSrc(null)}
        onConfirm={handleAvatarConfirm}
        saving={uploadingAvatar}
      />
    </div>
  );
}
