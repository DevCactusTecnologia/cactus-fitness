
-- =========================================================================
-- FASE 1: Multi-tenant (organizações / academia com equipe)
-- =========================================================================

-- 1. Enum de papel dentro da organização
CREATE TYPE public.org_role AS ENUM ('owner', 'personal', 'staff');

-- 2. Tabela de organizações
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

-- 3. Membros da organização
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'personal',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;

-- 4. Convites por e-mail (schema pronto; UI vem depois)
CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'personal',
  invited_by uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_invites_email ON public.organization_invites(email);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invites TO authenticated;
GRANT ALL ON public.organization_invites TO service_role;

-- 5. Funções SECURITY DEFINER (evitam recursão em RLS)
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _user_id uuid, _role public.org_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _user_id
      AND role IN ('owner','personal'))
$$;

CREATE OR REPLACE FUNCTION public.shares_org_with(_other_user uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m1
    JOIN public.organization_members m2 ON m2.organization_id = m1.organization_id
    WHERE m1.user_id = _user_id AND m2.user_id = _other_user
  )
$$;

-- 6. Adiciona organization_id nas tabelas de domínio
ALTER TABLE public.alunos              ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.workout_templates   ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.student_workouts    ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.avaliacoes          ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.desafios            ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.events              ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.exercises           ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- 7. Backfill: cria uma organização por personal existente e associa recursos
DO $$
DECLARE
  personal_rec RECORD;
  new_org_id uuid;
BEGIN
  FOR personal_rec IN
    SELECT DISTINCT ur.user_id, COALESCE(p.full_name, 'Personal') AS full_name
    FROM public.user_roles ur
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = 'personal'
  LOOP
    INSERT INTO public.organizations (name, created_by)
    VALUES ('Academia de ' || personal_rec.full_name, personal_rec.user_id)
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, personal_rec.user_id, 'owner');

    UPDATE public.alunos              SET organization_id = new_org_id WHERE personal_id = personal_rec.user_id;
    UPDATE public.workout_templates   SET organization_id = new_org_id WHERE personal_id = personal_rec.user_id;
    UPDATE public.student_workouts    SET organization_id = new_org_id WHERE personal_id = personal_rec.user_id;
    UPDATE public.avaliacoes          SET organization_id = new_org_id WHERE personal_id = personal_rec.user_id;
    UPDATE public.desafios            SET organization_id = new_org_id WHERE personal_id = personal_rec.user_id;
    UPDATE public.events              SET organization_id = new_org_id WHERE personal_id = personal_rec.user_id;
    UPDATE public.exercises           SET organization_id = new_org_id WHERE owner_id    = personal_rec.user_id;
  END LOOP;
END $$;

-- 8. Torna NOT NULL onde toda linha já tem valor
ALTER TABLE public.alunos            ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.workout_templates ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.student_workouts  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.avaliacoes        ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.desafios          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.events            ALTER COLUMN organization_id SET NOT NULL;
-- exercises: organization_id nullable (exercícios globais/públicos podem existir sem org)

-- 9. Índices para os novos FKs
CREATE INDEX idx_alunos_org              ON public.alunos(organization_id);
CREATE INDEX idx_workout_templates_org   ON public.workout_templates(organization_id);
CREATE INDEX idx_student_workouts_org    ON public.student_workouts(organization_id);
CREATE INDEX idx_avaliacoes_org          ON public.avaliacoes(organization_id);
CREATE INDEX idx_desafios_org            ON public.desafios(organization_id);
CREATE INDEX idx_events_org              ON public.events(organization_id);
CREATE INDEX idx_exercises_org           ON public.exercises(organization_id);

-- 10. Trigger de updated_at
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. RLS das novas tabelas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own org" ON public.organizations
  FOR SELECT USING (public.is_org_member(id, auth.uid()));

CREATE POLICY "Anyone signed-in can create org" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners update org" ON public.organizations
  FOR UPDATE USING (public.has_org_role(id, auth.uid(), 'owner'::public.org_role))
  WITH CHECK (public.has_org_role(id, auth.uid(), 'owner'::public.org_role));

CREATE POLICY "Owners delete org" ON public.organizations
  FOR DELETE USING (public.has_org_role(id, auth.uid(), 'owner'::public.org_role));

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read same-org members" ON public.organization_members
  FOR SELECT USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Owners manage members" ON public.organization_members
  FOR ALL USING (public.has_org_role(organization_id, auth.uid(), 'owner'::public.org_role))
  WITH CHECK (public.has_org_role(organization_id, auth.uid(), 'owner'::public.org_role));

CREATE POLICY "New owner can insert own membership" ON public.organization_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid())
  );

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage invites" ON public.organization_invites
  FOR ALL USING (public.has_org_role(organization_id, auth.uid(), 'owner'::public.org_role))
  WITH CHECK (public.has_org_role(organization_id, auth.uid(), 'owner'::public.org_role));

-- 12. Reescreve RLS das tabelas existentes para usar organização

-- alunos
DROP POLICY "Personal manages own alunos" ON public.alunos;
DROP POLICY "Aluno reads own record" ON public.alunos;
CREATE POLICY "Org members manage alunos" ON public.alunos
  FOR ALL USING (public.can_manage_org(organization_id, auth.uid()))
  WITH CHECK (public.can_manage_org(organization_id, auth.uid()));
CREATE POLICY "Aluno reads own record" ON public.alunos
  FOR SELECT USING (auth.uid() = aluno_user_id);

-- workout_templates
DROP POLICY "Personal manages own templates" ON public.workout_templates;
DROP POLICY "Aluno reads assigned templates" ON public.workout_templates;
CREATE POLICY "Org members manage templates" ON public.workout_templates
  FOR ALL USING (public.can_manage_org(organization_id, auth.uid()))
  WITH CHECK (public.can_manage_org(organization_id, auth.uid()));
CREATE POLICY "Aluno reads assigned templates" ON public.workout_templates
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.student_workouts sw
    JOIN public.alunos a ON a.id = sw.aluno_id
    WHERE sw.template_id = workout_templates.id AND a.aluno_user_id = auth.uid()
  ));

-- workout_template_exercises
DROP POLICY "Personal manages own template exercises" ON public.workout_template_exercises;
DROP POLICY "Aluno reads assigned template exercises" ON public.workout_template_exercises;
CREATE POLICY "Org members manage template exercises" ON public.workout_template_exercises
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = workout_template_exercises.template_id
      AND public.can_manage_org(t.organization_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = workout_template_exercises.template_id
      AND public.can_manage_org(t.organization_id, auth.uid())
  ));
CREATE POLICY "Aluno reads assigned template exercises" ON public.workout_template_exercises
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.student_workouts sw
    JOIN public.alunos a ON a.id = sw.aluno_id
    WHERE sw.template_id = workout_template_exercises.template_id AND a.aluno_user_id = auth.uid()
  ));

-- student_workouts
DROP POLICY "Personal manages own student workouts" ON public.student_workouts;
DROP POLICY "Aluno reads assigned workouts" ON public.student_workouts;
CREATE POLICY "Org members manage student workouts" ON public.student_workouts
  FOR ALL USING (public.can_manage_org(organization_id, auth.uid()))
  WITH CHECK (public.can_manage_org(organization_id, auth.uid()));
CREATE POLICY "Aluno reads assigned workouts" ON public.student_workouts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.alunos a
    WHERE a.id = student_workouts.aluno_id AND a.aluno_user_id = auth.uid()
  ));

-- avaliacoes
DROP POLICY "Personals manage own avaliacoes" ON public.avaliacoes;
CREATE POLICY "Org members manage avaliacoes" ON public.avaliacoes
  FOR ALL USING (public.can_manage_org(organization_id, auth.uid()))
  WITH CHECK (public.can_manage_org(organization_id, auth.uid()));
CREATE POLICY "Aluno reads own avaliacoes" ON public.avaliacoes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.alunos a
    WHERE a.id = avaliacoes.aluno_id AND a.aluno_user_id = auth.uid()
  ));

-- desafios
DROP POLICY "Personal manages own desafios" ON public.desafios;
CREATE POLICY "Org members manage desafios" ON public.desafios
  FOR ALL USING (public.can_manage_org(organization_id, auth.uid()))
  WITH CHECK (public.can_manage_org(organization_id, auth.uid()));

-- desafio_participantes
DROP POLICY "Personal manages own desafio participantes" ON public.desafio_participantes;
CREATE POLICY "Org members manage desafio participantes" ON public.desafio_participantes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.desafios d
    WHERE d.id = desafio_participantes.desafio_id
      AND public.can_manage_org(d.organization_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.desafios d
    WHERE d.id = desafio_participantes.desafio_id
      AND public.can_manage_org(d.organization_id, auth.uid())
  ));

-- events
DROP POLICY "Personal manages own events" ON public.events;
CREATE POLICY "Org members manage events" ON public.events
  FOR ALL USING (public.can_manage_org(organization_id, auth.uid()))
  WITH CHECK (public.can_manage_org(organization_id, auth.uid()));

-- exercises: mantém owner_id; adiciona leitura pela organização
DROP POLICY "Read public or own exercises" ON public.exercises;
CREATE POLICY "Read public own or org exercises" ON public.exercises
  FOR SELECT USING (
    owner_id IS NULL
    OR owner_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.can_manage_org(organization_id, auth.uid()))
  );

-- profiles: membros da mesma organização podem se ver
CREATE POLICY "Org members read each other profiles" ON public.profiles
  FOR SELECT USING (public.shares_org_with(profiles.id, auth.uid()));

-- 13. handle_new_user: cria organização automaticamente para novo personal
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  requested_role text;
  final_role app_role;
  new_org_id uuid;
  display_name text;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'personal');
  IF requested_role NOT IN ('personal','aluno') THEN
    final_role := 'personal';
  ELSE
    final_role := requested_role::app_role;
  END IF;

  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, display_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, final_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Cria organização própria para novo personal
  IF final_role = 'personal' THEN
    INSERT INTO public.organizations (name, created_by)
    VALUES ('Academia de ' || display_name, NEW.id)
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$function$;
