-- Limpeza retroativa: remover tenants "personal_solo" vazios que foram
-- criados por engano para personais que já eram membros de uma academia.
-- Mantém solos com dados (alunos, lançamentos, templates) e solos de
-- personais que só existem como independentes.

WITH to_delete AS (
  SELECT o.id
  FROM public.organizations o
  WHERE o.type = 'personal_solo'
    AND EXISTS (
      SELECT 1
      FROM public.organization_members m
      JOIN public.organizations o2 ON o2.id = m.organization_id
      WHERE m.user_id = o.created_by
        AND o2.type = 'academia'
        AND m.role = 'personal'
    )
    AND NOT EXISTS (SELECT 1 FROM public.alunos             WHERE organization_id = o.id)
    AND NOT EXISTS (SELECT 1 FROM public.lancamentos        WHERE organization_id = o.id)
    AND NOT EXISTS (SELECT 1 FROM public.workout_templates  WHERE organization_id = o.id)
    AND NOT EXISTS (SELECT 1 FROM public.exercises          WHERE organization_id = o.id)
)
DELETE FROM public.organizations WHERE id IN (SELECT id FROM to_delete);
