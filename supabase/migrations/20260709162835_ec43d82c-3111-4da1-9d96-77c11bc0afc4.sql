
-- =========================
-- 1. CONTRATOS_PERSONAL
-- =========================
CREATE TYPE public.tipo_repasse AS ENUM ('percentual', 'fixo_por_aluno', 'salario_fixo');

CREATE TABLE public.contratos_personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  personal_user_id uuid NOT NULL,
  tipo_repasse public.tipo_repasse NOT NULL,
  valor numeric(12,2) NOT NULL CHECK (valor >= 0),
  ativo boolean NOT NULL DEFAULT true,
  inicio date NOT NULL DEFAULT CURRENT_DATE,
  fim date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contratos_personal_org ON public.contratos_personal(organization_id);
CREATE INDEX idx_contratos_personal_user ON public.contratos_personal(personal_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos_personal TO authenticated;
GRANT ALL ON public.contratos_personal TO service_role;

ALTER TABLE public.contratos_personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donos gerenciam contratos da sua academia"
  ON public.contratos_personal FOR ALL
  TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), 'owner'))
  WITH CHECK (public.has_org_role(organization_id, auth.uid(), 'owner'));

CREATE POLICY "Personal vê o próprio contrato"
  ON public.contratos_personal FOR SELECT
  TO authenticated
  USING (personal_user_id = auth.uid());

CREATE TRIGGER trg_contratos_personal_updated
  BEFORE UPDATE ON public.contratos_personal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 2. LANCAMENTOS
-- =========================
CREATE TYPE public.lancamento_tipo AS ENUM ('receita', 'despesa');
CREATE TYPE public.lancamento_categoria AS ENUM (
  'mensalidade',
  'repasse_personal',
  'salario',
  'particular',
  'outros'
);

CREATE TABLE public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tipo public.lancamento_tipo NOT NULL,
  categoria public.lancamento_categoria NOT NULL,
  descricao text,
  valor numeric(12,2) NOT NULL CHECK (valor >= 0),
  competencia date NOT NULL, -- primeiro dia do mês
  pago_em date,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  personal_user_id uuid,
  contrato_id uuid REFERENCES public.contratos_personal(id) ON DELETE SET NULL,
  origem_lancamento_id uuid REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  is_espelho boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lancamentos_org ON public.lancamentos(organization_id);
CREATE INDEX idx_lancamentos_competencia ON public.lancamentos(competencia);
CREATE INDEX idx_lancamentos_personal ON public.lancamentos(personal_user_id);
CREATE INDEX idx_lancamentos_origem ON public.lancamentos(origem_lancamento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;

ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros da org visualizam lançamentos"
  ON public.lancamentos FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Donos e personais criam lançamentos"
  ON public.lancamentos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_org(organization_id, auth.uid())
    AND is_espelho = false
  );

CREATE POLICY "Donos e personais editam próprios lançamentos"
  ON public.lancamentos FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_org(organization_id, auth.uid())
    AND is_espelho = false
  )
  WITH CHECK (
    public.can_manage_org(organization_id, auth.uid())
    AND is_espelho = false
  );

CREATE POLICY "Donos e personais removem próprios lançamentos"
  ON public.lancamentos FOR DELETE
  TO authenticated
  USING (
    public.can_manage_org(organization_id, auth.uid())
    AND is_espelho = false
  );

CREATE TRIGGER trg_lancamentos_updated
  BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 3. TRIGGER DO ESPELHO
-- =========================
-- Quando uma DESPESA de repasse_personal é criada na academia,
-- cria automaticamente uma RECEITA espelho na org "solo" do personal.

CREATE OR REPLACE FUNCTION public.solo_org_for_personal(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM public.organizations o
  JOIN public.organization_members m
    ON m.organization_id = o.id
   AND m.user_id = _user_id
   AND m.role = 'owner'
  WHERE o.created_by = _user_id
  ORDER BY o.created_at ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.mirror_repasse_personal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_espelho_org uuid;
  v_espelho_id uuid;
BEGIN
  -- Só espelha despesa de repasse na criação
  IF NEW.tipo <> 'despesa' OR NEW.categoria <> 'repasse_personal' THEN
    RETURN NEW;
  END IF;
  IF NEW.personal_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.is_espelho THEN
    RETURN NEW;
  END IF;

  v_espelho_org := public.solo_org_for_personal(NEW.personal_user_id);
  IF v_espelho_org IS NULL OR v_espelho_org = NEW.organization_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.lancamentos (
    organization_id, tipo, categoria, descricao, valor, competencia, pago_em,
    personal_user_id, contrato_id, origem_lancamento_id, is_espelho, created_by
  ) VALUES (
    v_espelho_org, 'receita', 'repasse_personal',
    COALESCE(NEW.descricao, 'Repasse da academia'),
    NEW.valor, NEW.competencia, NEW.pago_em,
    NEW.personal_user_id, NEW.contrato_id, NEW.id, true, NEW.created_by
  )
  RETURNING id INTO v_espelho_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lancamentos_mirror_insert
  AFTER INSERT ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.mirror_repasse_personal();

-- Atualiza o espelho quando o original muda
CREATE OR REPLACE FUNCTION public.mirror_repasse_personal_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_espelho THEN RETURN NEW; END IF;
  IF NEW.tipo <> 'despesa' OR NEW.categoria <> 'repasse_personal' THEN
    RETURN NEW;
  END IF;

  UPDATE public.lancamentos
     SET valor = NEW.valor,
         descricao = NEW.descricao,
         competencia = NEW.competencia,
         pago_em = NEW.pago_em,
         contrato_id = NEW.contrato_id,
         updated_at = now()
   WHERE origem_lancamento_id = NEW.id
     AND is_espelho = true;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lancamentos_mirror_update
  AFTER UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.mirror_repasse_personal_update();
