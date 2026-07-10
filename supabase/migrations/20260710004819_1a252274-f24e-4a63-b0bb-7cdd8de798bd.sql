
-- 1. Trigger: manter user_roles em sincronia com organization_members
CREATE OR REPLACE FUNCTION public.sync_org_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, NEW.role::text::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = OLD.user_id AND role = OLD.role
    ) THEN
      DELETE FROM public.user_roles
      WHERE user_id = OLD.user_id AND role = OLD.role::text::public.app_role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_org_member_role_ins ON public.organization_members;
CREATE TRIGGER trg_sync_org_member_role_ins
AFTER INSERT OR UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.sync_org_member_role();

CREATE OR REPLACE FUNCTION public.sync_org_member_role_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = OLD.user_id AND role = OLD.role
  ) THEN
    DELETE FROM public.user_roles
    WHERE user_id = OLD.user_id AND role = OLD.role::text::public.app_role;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_org_member_role_del ON public.organization_members;
CREATE TRIGGER trg_sync_org_member_role_del
AFTER DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.sync_org_member_role_delete();

-- 2. Trigger: aluno recebe papel 'aluno' quando aluno_user_id é atribuído
CREATE OR REPLACE FUNCTION public.sync_aluno_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.aluno_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.aluno_user_id, 'aluno')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_aluno_role ON public.alunos;
CREATE TRIGGER trg_sync_aluno_role
AFTER INSERT OR UPDATE OF aluno_user_id ON public.alunos
FOR EACH ROW EXECUTE FUNCTION public.sync_aluno_role();

-- 3. Backfill de user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT om.user_id, om.role::text::public.app_role
FROM public.organization_members om
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT a.aluno_user_id, 'aluno'::public.app_role
FROM public.alunos a
WHERE a.aluno_user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Função current_user_primary_role
CREATE OR REPLACE FUNCTION public.current_user_primary_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'owner' THEN 1
    WHEN 'staff' THEN 2
    WHEN 'personal' THEN 3
    WHEN 'aluno' THEN 4
    ELSE 99
  END
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_user_primary_role() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_user_primary_role() TO authenticated;
