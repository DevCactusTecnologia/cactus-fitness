
CREATE TABLE public.avaliacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mode TEXT NOT NULL DEFAULT 'personal',
  composicao_corporal JSONB NOT NULL DEFAULT '{}'::jsonb,
  perimetros JSONB NOT NULL DEFAULT '{}'::jsonb,
  peso_osseo JSONB NOT NULL DEFAULT '{}'::jsonb,
  vo2max JSONB NOT NULL DEFAULT '{}'::jsonb,
  neuromotora JSONB NOT NULL DEFAULT '{}'::jsonb,
  banco_wells JSONB NOT NULL DEFAULT '{}'::jsonb,
  dinamometria JSONB NOT NULL DEFAULT '{}'::jsonb,
  teste_rm JSONB NOT NULL DEFAULT '{}'::jsonb,
  fotos JSONB NOT NULL DEFAULT '{}'::jsonb,
  postural JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personals manage own avaliacoes"
  ON public.avaliacoes FOR ALL
  TO authenticated
  USING (auth.uid() = personal_id)
  WITH CHECK (auth.uid() = personal_id);

CREATE INDEX avaliacoes_aluno_idx ON public.avaliacoes(aluno_id, assessment_date DESC);
CREATE INDEX avaliacoes_personal_idx ON public.avaliacoes(personal_id, assessment_date DESC);

CREATE TRIGGER update_avaliacoes_updated_at
  BEFORE UPDATE ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
