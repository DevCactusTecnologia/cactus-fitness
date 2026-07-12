import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { applyPrimaryColor } from "@/lib/theme";

export type PersonalCustomization = {
  personalId: string | null;
  brandTitle: string;
  showBrandTitle: boolean;
  brandLogoUrl: string | null;
  primaryColor: string | null;
  welcomeMessage: string;
  visibleSections: Record<string, boolean>;
};

const DEFAULT: PersonalCustomization = {
  personalId: null,
  brandTitle: "cactusfitness",
  showBrandTitle: false,
  brandLogoUrl: null,
  primaryColor: null,
  welcomeMessage: "",
  visibleSections: {},
};

async function fetchLogoSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/**
 * Consulta a customização definida pelo personal do aluno atual.
 * Se o usuário for personal/owner, retorna a própria customização.
 */
export function usePersonalCustomization() {
  const { profile } = useCurrentUser();
  const userId = profile?.id ?? null;
  const role = profile?.role ?? null;

  const query = useQuery({
    queryKey: ["personal-customization", userId, role],
    enabled: !!userId,
    queryFn: async (): Promise<PersonalCustomization> => {
      if (!userId) return DEFAULT;
      let personalId = userId;

      if (role === "aluno") {
        const { data: link } = await supabase
          .from("alunos")
          .select("personal_id")
          .eq("aluno_user_id", userId)
          .maybeSingle();
        if (!link?.personal_id) return DEFAULT;
        personalId = link.personal_id;
      }

      const { data } = await supabase
        .from("profiles")
        .select("brand_title, show_brand_title, brand_logo_url, primary_color, welcome_message, visible_sections")
        .eq("id", personalId)
        .maybeSingle();

      const row = (data ?? {}) as {
        brand_title?: string | null;
        show_brand_title?: boolean | null;
        brand_logo_url?: string | null;
        primary_color?: string | null;
        welcome_message?: string | null;
        visible_sections?: Record<string, boolean> | null;
      };

      const logoSigned = await fetchLogoSignedUrl(row.brand_logo_url ?? null);

      return {
        personalId,
        brandTitle: row.brand_title ?? DEFAULT.brandTitle,
        showBrandTitle: row.show_brand_title ?? DEFAULT.showBrandTitle,
        brandLogoUrl: logoSigned,
        primaryColor: row.primary_color ?? null,
        welcomeMessage: row.welcome_message ?? "",
        visibleSections: row.visible_sections ?? {},
      };
    },
    staleTime: 60_000,
  });

  // Aplica a cor principal automaticamente
  useEffect(() => {
    if (query.data?.primaryColor) applyPrimaryColor(query.data.primaryColor);
  }, [query.data?.primaryColor]);

  return query.data ?? DEFAULT;
}

/** Mapa entre rótulos de nav e rótulos de seção usados na página Consultoria */
const NAV_TO_SECTION: Record<string, string> = {
  "Meus Treinos": "Meus Treinos",
  Treinos: "Meus Treinos",
  "Meu Progresso": "Progresso",
  Progresso: "Progresso",
  Avaliações: "Avaliações",
  Desafios: "Desafios",
};

/** Sempre visíveis independente de configuração */
const ALWAYS_VISIBLE = new Set(["Início", "Meu Plano", "Fatura"]);

export function isNavItemVisible(label: string, visibleSections: Record<string, boolean>) {
  if (ALWAYS_VISIBLE.has(label)) return true;
  const section = NAV_TO_SECTION[label];
  if (!section) return true; // itens sem mapeamento seguem visíveis
  const v = visibleSections[section];
  return v === undefined ? true : v;
}
