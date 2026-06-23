-- Add lat/lng to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS lat NUMERIC,
  ADD COLUMN IF NOT EXISTS lng NUMERIC;

-- Create default user if doesn't exist
DO $$
DECLARE
  new_user_id UUID;
  org_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sueldo@suportesigma.com') THEN
    new_user_id := gen_random_uuid();
    org_id := gen_random_uuid();

    -- Insert User
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
      crypt('Skip@Pass123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Sueldo Sigma"}',
      true, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    -- Insert Default Organization
    INSERT INTO public.organizations (id, name, slug, lat, lng)
    VALUES (org_id, 'Sigma Suporte', 'sigma-suporte', -23.5505, -46.6333)
    ON CONFLICT (slug) DO NOTHING;

    -- Update or Insert Profile
    INSERT INTO public.profiles (id, full_name, organization_id, role)
    VALUES (new_user_id, 'Sueldo Sigma', org_id, 'admin')
    ON CONFLICT (id) DO UPDATE SET 
      organization_id = EXCLUDED.organization_id,
      full_name = EXCLUDED.full_name;
  END IF;
END $$;
