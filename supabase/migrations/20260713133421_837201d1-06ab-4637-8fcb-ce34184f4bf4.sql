
CREATE TABLE public.plans (
  slug text PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  price_cents integer NOT NULL DEFAULT 0,
  max_alunos integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  icon text NOT NULL DEFAULT 'sparkles',
  accent text NOT NULL DEFAULT 'muted',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_active_authenticated"
  ON public.plans FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "plans_super_admin_insert"
  ON public.plans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "plans_super_admin_update"
  ON public.plans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "plans_super_admin_delete"
  ON public.plans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plans (slug, name, tagline, price_cents, max_alunos, features, icon, accent, sort_order) VALUES
  ('free',       'Free',       'Onboarding e testes',            0,     10,   '["Até 10 alunos","1 profissional","Suporte por email"]'::jsonb,        'sparkles', 'muted',   1),
  ('starter',    'Starter',    'Personais e microacademias',     4900,  50,   '["Até 50 alunos","3 profissionais","Financeiro básico"]'::jsonb,       'zap',      'sky',     2),
  ('pro',        'Pro',        'Academias em crescimento',       14900, 250,  '["Até 250 alunos","Equipe ilimitada","Avaliações + IA"]'::jsonb,       'crown',    'primary', 3),
  ('enterprise', 'Enterprise', 'Redes e franquias',              39900, NULL, '["Alunos ilimitados","SLA dedicado","Onboarding assistido"]'::jsonb,   'shield',   'amber',   4);

-- Substitui a função para ler da tabela plans (com fallback para os padrões antigos).
CREATE OR REPLACE FUNCTION public.plan_default_max_alunos(_plan text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT max_alunos FROM public.plans WHERE slug = _plan),
    CASE _plan
      WHEN 'free'       THEN 10
      WHEN 'starter'    THEN 50
      WHEN 'pro'        THEN 250
      WHEN 'enterprise' THEN NULL
      ELSE 10
    END
  )
$$;
