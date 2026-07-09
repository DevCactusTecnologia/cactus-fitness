
-- Remove referência de contrato dos lançamentos
ALTER TABLE public.lancamentos DROP COLUMN IF EXISTS contrato_id;

-- Ajusta trigger de update para não referenciar contrato_id
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
         updated_at = now()
   WHERE origem_lancamento_id = NEW.id
     AND is_espelho = true;

  RETURN NEW;
END;
$$;

-- Ajusta trigger de insert para não referenciar contrato_id
CREATE OR REPLACE FUNCTION public.mirror_repasse_personal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_espelho_org uuid;
BEGIN
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
    personal_user_id, origem_lancamento_id, is_espelho, created_by
  ) VALUES (
    v_espelho_org, 'receita', 'repasse_personal',
    COALESCE(NEW.descricao, 'Repasse da academia'),
    NEW.valor, NEW.competencia, NEW.pago_em,
    NEW.personal_user_id, NEW.id, true, NEW.created_by
  );

  RETURN NEW;
END;
$$;

-- Drop tabela de contratos
DROP TABLE IF EXISTS public.contratos_personal CASCADE;
DROP TYPE IF EXISTS public.tipo_repasse;
