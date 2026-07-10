
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_org_id uuid;
BEGIN
  -- Cria usuário no auth
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'academia@gmail.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'Cactus Fitnes'),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'academia@gmail.com', 'email_verified', true),
    'email', v_user_id::text,
    now(), now(), now()
  );

  -- profile é criado pelo trigger handle_new_user; garante nome
  UPDATE public.profiles SET full_name = 'Cactus Fitnes' WHERE id = v_user_id;

  -- Role owner
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'owner')
  ON CONFLICT DO NOTHING;

  -- Organização
  INSERT INTO public.organizations (name, created_by)
  VALUES ('Academia Cactus Fitness', v_user_id)
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');
END $$;
