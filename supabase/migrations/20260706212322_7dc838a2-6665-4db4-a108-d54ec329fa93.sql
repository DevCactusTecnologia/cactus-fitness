CREATE TABLE public.exercise_groups (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercise_groups TO anon, authenticated;
GRANT ALL ON public.exercise_groups TO service_role;
ALTER TABLE public.exercise_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read exercise_groups" ON public.exercise_groups FOR SELECT USING (true);

CREATE TABLE public.exercises (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  group_id INT NOT NULL REFERENCES public.exercise_groups(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_path TEXT,
  video_path TEXT,
  video_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercises TO anon, authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read exercises" ON public.exercises FOR SELECT USING (true);

CREATE INDEX exercises_group_id_idx ON public.exercises(group_id);
CREATE INDEX exercises_name_idx ON public.exercises USING gin (to_tsvector('portuguese', name));

CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.exercise_groups (id, name, slug, sort_order) VALUES
  (1, 'Peitoral', 'peitoral', 1),
  (2, 'Dorsal', 'dorsal', 2),
  (3, 'Bíceps', 'biceps', 3),
  (4, 'Tríceps', 'triceps', 4),
  (5, 'Inferiores', 'inferiores', 5),
  (6, 'Ombro', 'ombro', 6),
  (7, 'Abdômen', 'abdomen', 7),
  (8, 'Antebraço', 'antebraco', 8),
  (9, 'Aeróbio', 'aerobio', 9),
  (10, 'Funcional', 'funcional', 10),
  (11, 'Alongamentos', 'alongamento', 11),
  (12, 'Em Casa', 'em-casa', 12),
  (13, 'Mobilidade', 'mobilidade', 13),
  (14, 'Elásticos', 'elasticos', 14),
  (15, 'MAT Pilates', 'mat-pilates', 15),
  (16, 'Laboral', 'laboral', 16),
  (17, 'Outros', 'outros', 17);