
-- ============ 1. ROLES ============
CREATE TYPE public.app_role AS ENUM ('personal', 'aluno');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- ============ 2. PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  cref text,
  bio text,
  specialties text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Personal can read profiles of their alunos and vice-versa (added later after alunos exists)

-- ============ 3. TRIGGER: auto-create profile + role on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role text;
  final_role app_role;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'personal');
  IF requested_role NOT IN ('personal','aluno') THEN
    final_role := 'personal';
  ELSE
    final_role := requested_role::app_role;
  END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, final_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ 4. ALUNOS (link personal <-> aluno) ============
CREATE TABLE public.alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  birth_date date,
  gender text,
  objective text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (personal_id, aluno_user_id)
);
CREATE INDEX alunos_personal_idx ON public.alunos(personal_id);
CREATE INDEX alunos_aluno_user_idx ON public.alunos(aluno_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos TO authenticated;
GRANT ALL ON public.alunos TO service_role;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal manages own alunos" ON public.alunos FOR ALL TO authenticated
  USING (auth.uid() = personal_id) WITH CHECK (auth.uid() = personal_id);
CREATE POLICY "Aluno reads own record" ON public.alunos FOR SELECT TO authenticated
  USING (auth.uid() = aluno_user_id);
CREATE TRIGGER alunos_updated_at BEFORE UPDATE ON public.alunos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 5. WORKOUT TEMPLATES ============
CREATE TABLE public.workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  duration_min integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workout_templates_personal_idx ON public.workout_templates(personal_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_templates TO service_role;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal manages own templates" ON public.workout_templates FOR ALL TO authenticated
  USING (auth.uid() = personal_id) WITH CHECK (auth.uid() = personal_id);
CREATE TRIGGER workout_templates_updated_at BEFORE UPDATE ON public.workout_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.workout_template_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id integer REFERENCES public.exercises(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  sets integer,
  reps text,
  load text,
  rest_seconds integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wte_template_idx ON public.workout_template_exercises(template_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_template_exercises TO authenticated;
GRANT ALL ON public.workout_template_exercises TO service_role;
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal manages own template exercises" ON public.workout_template_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_templates t WHERE t.id = template_id AND t.personal_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_templates t WHERE t.id = template_id AND t.personal_id = auth.uid()));

-- ============ 6. STUDENT WORKOUTS (atribuidos) ============
CREATE TABLE public.student_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  scheduled_for date,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sw_aluno_idx ON public.student_workouts(aluno_id);
CREATE INDEX sw_personal_idx ON public.student_workouts(personal_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_workouts TO authenticated;
GRANT ALL ON public.student_workouts TO service_role;
ALTER TABLE public.student_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal manages own student workouts" ON public.student_workouts FOR ALL TO authenticated
  USING (auth.uid() = personal_id) WITH CHECK (auth.uid() = personal_id);
CREATE POLICY "Aluno reads assigned workouts" ON public.student_workouts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.aluno_user_id = auth.uid()));
CREATE TRIGGER student_workouts_updated_at BEFORE UPDATE ON public.student_workouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extra policy: personal reads profiles of their alunos
CREATE POLICY "Personal reads aluno profiles" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.aluno_user_id = profiles.id AND a.personal_id = auth.uid()));

-- ============ 7. FIX EVENTS (agenda) ============
DROP POLICY IF EXISTS "Public delete events" ON public.events;
DROP POLICY IF EXISTS "Public insert events" ON public.events;
DROP POLICY IF EXISTS "Public read events" ON public.events;
DROP POLICY IF EXISTS "Public update events" ON public.events;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS personal_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS events_personal_idx ON public.events(personal_id);

CREATE POLICY "Personal manages own events" ON public.events FOR ALL TO authenticated
  USING (auth.uid() = personal_id) WITH CHECK (auth.uid() = personal_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 8. FIX EXERCISES ownership ============
DROP POLICY IF EXISTS "Public delete exercises" ON public.exercises;
DROP POLICY IF EXISTS "Public insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Public read exercises" ON public.exercises;
DROP POLICY IF EXISTS "Public update exercises" ON public.exercises;

-- Migrate owner_id text -> uuid nullable (public library exercises have NULL owner)
ALTER TABLE public.exercises ALTER COLUMN owner_id DROP DEFAULT;
ALTER TABLE public.exercises ALTER COLUMN owner_id TYPE uuid USING NULL;

CREATE INDEX IF NOT EXISTS exercises_owner_idx ON public.exercises(owner_id);

-- Read: public library (owner NULL) for everyone signed-in, plus your own
CREATE POLICY "Read public or own exercises" ON public.exercises FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());
CREATE POLICY "Insert own exercises" ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Update own exercises" ON public.exercises FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Delete own exercises" ON public.exercises FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;

-- exercise_groups and equipments already public read; ensure GRANTs
GRANT SELECT ON public.exercise_groups TO authenticated, anon;
GRANT SELECT ON public.equipments TO authenticated, anon;
