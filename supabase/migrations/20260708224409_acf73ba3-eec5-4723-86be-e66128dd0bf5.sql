
-- Função que retorna a organização atual do usuário logado
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_org_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;

-- Preenche organization_id automaticamente em cada INSERT sem valor explícito
ALTER TABLE public.alunos              ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
ALTER TABLE public.workout_templates   ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
ALTER TABLE public.student_workouts    ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
ALTER TABLE public.avaliacoes          ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
ALTER TABLE public.desafios            ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
ALTER TABLE public.events              ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
ALTER TABLE public.exercises           ALTER COLUMN organization_id SET DEFAULT public.current_user_org_id();
