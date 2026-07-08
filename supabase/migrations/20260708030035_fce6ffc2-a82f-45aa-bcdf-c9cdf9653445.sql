
CREATE TABLE public.aluno_check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, check_in_date)
);
GRANT SELECT, INSERT, DELETE ON public.aluno_check_ins TO authenticated;
GRANT ALL ON public.aluno_check_ins TO service_role;
ALTER TABLE public.aluno_check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own check-ins"
  ON public.aluno_check_ins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
