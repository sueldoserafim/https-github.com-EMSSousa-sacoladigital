DO $$
DECLARE
  new_user_id uuid;
  sys_org_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sueldo@suportesigma.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'sueldo@suportesigma.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Sueldo"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    SELECT id INTO sys_org_id FROM public.organizations WHERE slug = 'master' LIMIT 1;
    IF sys_org_id IS NULL THEN
      sys_org_id := gen_random_uuid();
      INSERT INTO public.organizations (id, name, slug)
      VALUES (sys_org_id, 'Master Admin', 'master')
      ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO public.profiles (id, full_name, role, organization_id)
    VALUES (new_user_id, 'Sueldo', 'super_admin', sys_org_id)
    ON CONFLICT (id) DO UPDATE SET 
      role = 'super_admin',
      organization_id = EXCLUDED.organization_id;

  ELSE
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'sueldo@suportesigma.com' LIMIT 1;
    
    SELECT id INTO sys_org_id FROM public.organizations WHERE slug = 'master' LIMIT 1;
    IF sys_org_id IS NULL THEN
      sys_org_id := gen_random_uuid();
      INSERT INTO public.organizations (id, name, slug)
      VALUES (sys_org_id, 'Master Admin', 'master')
      ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO public.profiles (id, full_name, role, organization_id)
    VALUES (new_user_id, 'Sueldo', 'super_admin', sys_org_id)
    ON CONFLICT (id) DO UPDATE SET 
      role = 'super_admin',
      organization_id = EXCLUDED.organization_id;
  END IF;
END $$;
