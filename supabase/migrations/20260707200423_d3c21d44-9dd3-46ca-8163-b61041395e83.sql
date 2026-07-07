
ALTER TABLE public.avaliacoes
  ADD COLUMN IF NOT EXISTS ia_analysis TEXT,
  ADD COLUMN IF NOT EXISTS ia_visible_to_aluno BOOLEAN NOT NULL DEFAULT true;
