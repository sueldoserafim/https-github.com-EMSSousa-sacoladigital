-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name text,
    role text DEFAULT 'member',
    updated_at timestamptz DEFAULT now()
);

-- Create customers table for RLS demonstration
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Policies for Organizations
DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
CREATE POLICY "Users can view own organization" ON public.organizations
    FOR SELECT TO authenticated
    USING (id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- Policies for Customers (Tenant Isolation)
DROP POLICY IF EXISTS "Users can view org customers" ON public.customers;
CREATE POLICY "Users can view org customers" ON public.customers
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org customers" ON public.customers;
CREATE POLICY "Users can insert org customers" ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org customers" ON public.customers;
CREATE POLICY "Users can update org customers" ON public.customers
    FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- Function to handle new user signup and create organization + profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_org_id uuid;
    v_org_name text;
    v_full_name text;
BEGIN
    v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Minha Organização');
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');

    INSERT INTO public.organizations (name, slug)
    VALUES (v_org_name, lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g')))
    RETURNING id INTO v_org_id;

    INSERT INTO public.profiles (id, organization_id, full_name, role)
    VALUES (NEW.id, v_org_id, v_full_name, 'admin');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed initial user and data
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
        
        -- Trigger creates org and profile. Now add dummy customers for this org.
        INSERT INTO public.customers (organization_id, name, email)
        SELECT organization_id, 'Acme Corp', 'contato@acme.com'
        FROM public.profiles WHERE id = new_user_id;

        INSERT INTO public.customers (organization_id, name, email)
        SELECT organization_id, 'Global Industries', 'info@global.com'
        FROM public.profiles WHERE id = new_user_id;
    END IF;
END $$;
