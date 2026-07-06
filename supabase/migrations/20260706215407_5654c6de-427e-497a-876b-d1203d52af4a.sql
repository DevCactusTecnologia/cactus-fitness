
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS owner_id text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS muscles_primary text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS muscles_secondary text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS equipment text,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Ensure id can be generated for new inserts (was integer NOT NULL without default)
CREATE SEQUENCE IF NOT EXISTS public.exercises_id_seq OWNED BY public.exercises.id;
SELECT setval('public.exercises_id_seq', COALESCE((SELECT MAX(id) FROM public.exercises), 0) + 1, false);
ALTER TABLE public.exercises ALTER COLUMN id SET DEFAULT nextval('public.exercises_id_seq');

-- Allow public insert/update/delete for now (project has no auth yet, matches events table pattern)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO anon, authenticated;
GRANT ALL ON public.exercises TO service_role;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.exercises_id_seq TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Public update exercises" ON public.exercises;
DROP POLICY IF EXISTS "Public delete exercises" ON public.exercises;

CREATE POLICY "Public insert exercises" ON public.exercises FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update exercises" ON public.exercises FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public delete exercises" ON public.exercises FOR DELETE TO public USING (true);

DROP TRIGGER IF EXISTS update_exercises_updated_at ON public.exercises;
CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS exercises_owner_id_idx ON public.exercises(owner_id);
