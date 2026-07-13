-- 1) Fonte única de verdade: limite padrão por plano
CREATE OR REPLACE FUNCTION public.plan_default_max_alunos(_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _plan
    WHEN 'free'       THEN 10
    WHEN 'starter'    THEN 50
    WHEN 'pro'        THEN 250
    WHEN 'enterprise' THEN NULL
    ELSE 10
  END
$$;

-- 2) Trigger: aplica default do plano em INSERT/UPDATE de organizations
--    - INSERT: se max_alunos for NULL, aplica o default do plano
--    - UPDATE plan: se o limite atual é NULL ou é exatamente o default do plano antigo,
--      atualiza para o default do novo plano (preserva overrides manuais do Super Admin)
CREATE OR REPLACE FUNCTION public.apply_plan_defaults_on_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  old_default int;
  new_default int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.max_alunos IS NULL THEN
      NEW.max_alunos := public.plan_default_max_alunos(NEW.plan);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.plan IS DISTINCT FROM OLD.plan THEN
    old_default := public.plan_default_max_alunos(OLD.plan);
    new_default := public.plan_default_max_alunos(NEW.plan);
    -- só sobrescreve se o valor atual era o padrão do plano antigo (não é override manual)
    IF NEW.max_alunos IS NOT DISTINCT FROM OLD.max_alunos
       AND (OLD.max_alunos IS NULL OR OLD.max_alunos = old_default) THEN
      NEW.max_alunos := new_default;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_plan_defaults_on_org ON public.organizations;
CREATE TRIGGER trg_apply_plan_defaults_on_org
BEFORE INSERT OR UPDATE OF plan ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.apply_plan_defaults_on_org();

-- 3) Trigger: bloqueia insert de aluno acima do limite do plano
CREATE OR REPLACE FUNCTION public.enforce_org_max_alunos()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_count int;
  v_plan  text;
  v_susp  timestamptz;
BEGIN
  SELECT max_alunos, plan, suspended_at
    INTO v_limit, v_plan, v_susp
    FROM public.organizations
   WHERE id = NEW.organization_id;

  IF v_susp IS NOT NULL THEN
    RAISE EXCEPTION 'Conta suspensa. Não é possível cadastrar novos alunos.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_limit IS NULL THEN
    RETURN NEW; -- ilimitado (ex.: enterprise)
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.alunos
   WHERE organization_id = NEW.organization_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite do plano % atingido (% de % alunos). Faça upgrade para cadastrar mais alunos.', v_plan, v_count, v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_org_max_alunos ON public.alunos;
CREATE TRIGGER trg_enforce_org_max_alunos
BEFORE INSERT ON public.alunos
FOR EACH ROW EXECUTE FUNCTION public.enforce_org_max_alunos();

-- 4) Backfill: organizações existentes sem limite recebem o default do plano
UPDATE public.organizations
   SET max_alunos = public.plan_default_max_alunos(plan)
 WHERE max_alunos IS NULL
   AND public.plan_default_max_alunos(plan) IS NOT NULL;