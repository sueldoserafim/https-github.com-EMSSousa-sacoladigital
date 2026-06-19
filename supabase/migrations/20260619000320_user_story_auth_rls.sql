DO $$
BEGIN
  ALTER TABLE public.product_skus ADD COLUMN IF NOT EXISTS image_url TEXT;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0;
END $$;

-- Setup storage for product images if missing
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public View product-images" ON storage.objects;
CREATE POLICY "Public View product-images" ON storage.objects 
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Auth Insert product-images" ON storage.objects;
CREATE POLICY "Auth Insert product-images" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Auth Update product-images" ON storage.objects;
CREATE POLICY "Auth Update product-images" ON storage.objects 
  FOR UPDATE TO authenticated USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Auth Delete product-images" ON storage.objects;
CREATE POLICY "Auth Delete product-images" ON storage.objects 
  FOR DELETE TO authenticated USING (bucket_id = 'product-images');

-- RLS for sku_attribute_values
DROP POLICY IF EXISTS "Users can view org sku_attribute_values" ON public.sku_attribute_values;
CREATE POLICY "Users can view org sku_attribute_values" ON public.sku_attribute_values FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org sku_attribute_values" ON public.sku_attribute_values;
CREATE POLICY "Users can insert org sku_attribute_values" ON public.sku_attribute_values FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org sku_attribute_values" ON public.sku_attribute_values;
CREATE POLICY "Users can update org sku_attribute_values" ON public.sku_attribute_values FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org sku_attribute_values" ON public.sku_attribute_values;
CREATE POLICY "Users can delete org sku_attribute_values" ON public.sku_attribute_values FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- RLS for products
DROP POLICY IF EXISTS "Users can view org products" ON public.products;
CREATE POLICY "Users can view org products" ON public.products FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org products" ON public.products;
CREATE POLICY "Users can insert org products" ON public.products FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org products" ON public.products;
CREATE POLICY "Users can update org products" ON public.products FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org products" ON public.products;
CREATE POLICY "Users can delete org products" ON public.products FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- RLS for product_skus
DROP POLICY IF EXISTS "Users can view org product_skus" ON public.product_skus;
CREATE POLICY "Users can view org product_skus" ON public.product_skus FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org product_skus" ON public.product_skus;
CREATE POLICY "Users can insert org product_skus" ON public.product_skus FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org product_skus" ON public.product_skus;
CREATE POLICY "Users can update org product_skus" ON public.product_skus FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org product_skus" ON public.product_skus;
CREATE POLICY "Users can delete org product_skus" ON public.product_skus FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Seed user
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
