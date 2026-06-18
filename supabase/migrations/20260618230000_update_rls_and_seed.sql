-- Enhance handle_new_user to avoid slug collisions and prevent duplicate keys
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_org_id uuid;
    v_org_name text;
    v_full_name text;
    v_slug text;
BEGIN
    v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Minha Organização');
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');
    
    v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := v_slug || '-' || substr(NEW.id::text, 1, 8);

    INSERT INTO public.organizations (name, slug)
    VALUES (v_org_name, v_slug)
    RETURNING id INTO v_org_id;

    INSERT INTO public.profiles (id, organization_id, full_name, role)
    VALUES (NEW.id, v_org_id, v_full_name, 'admin');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure organizations slug is unique
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_key ON public.organizations (slug);
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_slug_key;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_slug_key UNIQUE USING INDEX organizations_slug_key;

-- Fix policies for Profiles (Enable team management)
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;
CREATE POLICY "Users can view org profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org profiles" ON public.profiles;
CREATE POLICY "Users can update org profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- Fix policies for Organizations (Enable updating organization details)
DROP POLICY IF EXISTS "Users can update own organization" ON public.organizations;
CREATE POLICY "Users can update own organization" ON public.organizations
    FOR UPDATE TO authenticated
    USING (id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- Seed Initial User ensuring all token strings are empty
DO $$
DECLARE
    new_user_id uuid;
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
            now(), now(), now(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Sueldo", "organization_name": "Suporte Sigma"}',
            false, 'authenticated', 'authenticated',
            '', '', '', '', '', NULL, '', '', ''
        );
    END IF;
END $$;
