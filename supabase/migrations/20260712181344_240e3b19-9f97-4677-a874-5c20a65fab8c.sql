
INSERT INTO public.lancamentos (organization_id, tipo, categoria, descricao, valor, competencia, pago_em, aluno_id, personal_user_id)
SELECT a.organization_id, 'receita', 'mensalidade', 'Forte', 60.00,
       date_trunc('month', now())::date + INTERVAL '4 days',
       NULL, a.id, a.personal_id
FROM public.alunos a
WHERE a.aluno_user_id IS NOT NULL AND a.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.lancamentos l WHERE l.aluno_id = a.id AND l.categoria='mensalidade'
      AND date_trunc('month', l.competencia) = date_trunc('month', now())
  );

INSERT INTO public.lancamentos (organization_id, tipo, categoria, descricao, valor, competencia, pago_em, aluno_id, personal_user_id)
SELECT a.organization_id, 'receita', 'mensalidade', 'Forte', 60.00,
       (date_trunc('month', now()) - INTERVAL '1 month')::date + INTERVAL '4 days',
       (date_trunc('month', now()) - INTERVAL '1 month')::date + INTERVAL '6 days',
       a.id, a.personal_id
FROM public.alunos a
WHERE a.aluno_user_id IS NOT NULL AND a.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.lancamentos l WHERE l.aluno_id = a.id AND l.categoria='mensalidade'
      AND date_trunc('month', l.competencia) = date_trunc('month', now() - INTERVAL '1 month')
  );
