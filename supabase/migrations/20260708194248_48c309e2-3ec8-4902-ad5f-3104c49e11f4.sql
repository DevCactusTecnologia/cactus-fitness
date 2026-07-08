ALTER TABLE public.student_workouts ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS sw_archived_idx ON public.student_workouts (aluno_id) WHERE archived_at IS NULL;