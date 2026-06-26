DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
  v_org_id uuid;
BEGIN
  -- Get the default organization (or just grab the first one)
  SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;

  -- Create organization if it doesn't exist just to be safe
  IF v_org_id IS NULL THEN
    v_org_id := gen_random_uuid();
    INSERT INTO public.organizations (id, name, slug)
    VALUES (v_org_id, 'Sigma Suporte', 'sigma-suporte')
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sueldo@suportesigma.com') THEN
    v_user_id := gen_random_uuid();
    v_encrypted_password := crypt('Skip@Pass', gen_salt('bf'));

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'sueldo@suportesigma.com',
      v_encrypted_password,
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "Sueldo Admin"}'::jsonb,
      true, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    -- Insert into dependent tables using the SAME new_user_id
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (v_user_id, 'sueldo@suportesigma.com', 'Sueldo Admin', 'super_admin', v_org_id)
    ON CONFLICT (id) DO UPDATE SET 
      role = 'super_admin',
      organization_id = v_org_id;
  ELSE
    -- If it already exists, just ensure it's super_admin and linked to org
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'sueldo@suportesigma.com' LIMIT 1;
    
    UPDATE public.profiles 
    SET role = 'super_admin', organization_id = v_org_id 
    WHERE id = v_user_id;
  END IF;
END $$;
