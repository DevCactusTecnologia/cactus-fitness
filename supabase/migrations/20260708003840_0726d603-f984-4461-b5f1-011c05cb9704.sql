
CREATE TYPE public.desafio_tipo AS ENUM ('treino_realizado');

CREATE TABLE public.desafios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo public.desafio_tipo NOT NULL DEFAULT 'treino_realizado',
  data_encerramento DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.desafio_participantes (
  desafio_id UUID NOT NULL REFERENCES public.desafios(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  pontos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (desafio_id, aluno_id)
);

CREATE INDEX idx_desafios_personal_id ON public.desafios(personal_id);
CREATE INDEX idx_desafio_participantes_aluno ON public.desafio_participantes(aluno_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.desafios TO authenticated;
GRANT ALL ON public.desafios TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.desafio_participantes TO authenticated;
GRANT ALL ON public.desafio_participantes TO service_role;

ALTER TABLE public.desafios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desafio_participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal manages own desafios"
  ON public.desafios FOR ALL
  USING (auth.uid() = personal_id)
  WITH CHECK (auth.uid() = personal_id);

CREATE POLICY "Personal manages own desafio participantes"
  ON public.desafio_participantes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.desafios d WHERE d.id = desafio_id AND d.personal_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.desafios d WHERE d.id = desafio_id AND d.personal_id = auth.uid()));

CREATE TRIGGER update_desafios_updated_at
  BEFORE UPDATE ON public.desafios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
