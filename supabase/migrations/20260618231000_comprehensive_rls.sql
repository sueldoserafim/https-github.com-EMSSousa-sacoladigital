-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- For profiles:
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;
CREATE POLICY "Users can view org profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

-- For organizations
DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
CREATE POLICY "Users can view own organization" ON public.organizations
    FOR SELECT TO authenticated
    USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own organization" ON public.organizations;
CREATE POLICY "Users can update own organization" ON public.organizations
    FOR UPDATE TO authenticated
    USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Macro for org-based policies
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'products', 'product_skus', 'attributes', 'attribute_options', 
        'sku_attribute_values', 'orders', 'customers', 'stock_movements'
    ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users can view org %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can view org %I" ON public.%I FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))', tbl, tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert org %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can insert org %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))', tbl, tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "Users can update org %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can update org %I" ON public.%I FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))', tbl, tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete org %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can delete org %I" ON public.%I FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))', tbl, tbl);
    END LOOP;
END $$;

-- order_items link to orders
DROP POLICY IF EXISTS "Users can view org order_items" ON public.order_items;
CREATE POLICY "Users can view org order_items" ON public.order_items
    FOR SELECT TO authenticated
    USING (order_id IN (SELECT id FROM public.orders WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can insert org order_items" ON public.order_items;
CREATE POLICY "Users can insert org order_items" ON public.order_items
    FOR INSERT TO authenticated
    WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can update org order_items" ON public.order_items;
CREATE POLICY "Users can update org order_items" ON public.order_items
    FOR UPDATE TO authenticated
    USING (order_id IN (SELECT id FROM public.orders WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can delete org order_items" ON public.order_items;
CREATE POLICY "Users can delete org order_items" ON public.order_items
    FOR DELETE TO authenticated
    USING (order_id IN (SELECT id FROM public.orders WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Seed data for sueldo@suportesigma.com
DO $$
DECLARE
    new_user_id uuid;
    v_org_id uuid;
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
    
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'sueldo@suportesigma.com' LIMIT 1;
    
    IF new_user_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = new_user_id) THEN
            INSERT INTO public.organizations (name, slug)
            VALUES ('Suporte Sigma', 'suporte-sigma-' || substr(new_user_id::text, 1, 8))
            ON CONFLICT (slug) DO NOTHING
            RETURNING id INTO v_org_id;

            IF v_org_id IS NULL THEN
                SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'suporte-sigma-' || substr(new_user_id::text, 1, 8) LIMIT 1;
            END IF;

            INSERT INTO public.profiles (id, organization_id, full_name, role)
            VALUES (new_user_id, v_org_id, 'Sueldo', 'admin')
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;
END $$;
