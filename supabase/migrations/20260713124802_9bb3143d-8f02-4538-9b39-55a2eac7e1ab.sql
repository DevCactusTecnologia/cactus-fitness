-- 1) Coluna type em organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'academia';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_type_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_type_check
      CHECK (type IN ('academia','personal_solo'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(type);

-- 2) Backfill: cria org "personal_solo" para cada personal que ainda não é dono de uma organização
DO $$
DECLARE
  r RECORD;
  new_org_id uuid;
  personal_name text;
BEGIN
  FOR r IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'personal'
      AND NOT EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.user_id = ur.user_id AND m.role = 'owner'
      )
  LOOP
    SELECT COALESCE(NULLIF(trim(p.full_name), ''), 'Personal')
      INTO personal_name
    FROM public.profiles p
    WHERE p.id = r.user_id;

    INSERT INTO public.organizations (name, type, created_by, plan, subscription_status)
    VALUES ('Studio de ' || personal_name, 'personal_solo', r.user_id, 'free', 'active')
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, r.user_id, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END LOOP;
END $$;