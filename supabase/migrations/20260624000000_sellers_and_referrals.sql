-- Create sellers table
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure slug is unique per organization
DO $BODY$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sellers_organization_id_slug_key'
    ) THEN
        ALTER TABLE public.sellers ADD CONSTRAINT sellers_organization_id_slug_key UNIQUE (organization_id, slug);
    END IF;
END $BODY$;

-- Add seller_id to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Enable RLS for sellers
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org sellers" ON public.sellers;
CREATE POLICY "Users can view org sellers" ON public.sellers
    FOR SELECT USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "Public can view org sellers" ON public.sellers;
CREATE POLICY "Public can view org sellers" ON public.sellers
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can insert org sellers" ON public.sellers;
CREATE POLICY "Users can insert org sellers" ON public.sellers
    FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "Users can update org sellers" ON public.sellers;
CREATE POLICY "Users can update org sellers" ON public.sellers
    FOR UPDATE TO authenticated USING (organization_id = public.get_my_org_id()) WITH CHECK (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "Users can delete org sellers" ON public.sellers;
CREATE POLICY "Users can delete org sellers" ON public.sellers
    FOR DELETE TO authenticated USING (organization_id = public.get_my_org_id());

-- Update checkout RPC to support p_seller_slug
DROP FUNCTION IF EXISTS public.create_checkout_order(text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.create_checkout_order(text, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_checkout_order(
    p_org_slug text,
    p_customer_name text,
    p_customer_email text,
    p_customer_phone text DEFAULT NULL,
    p_items jsonb DEFAULT '[]'::jsonb,
    p_seller_slug text DEFAULT NULL
) RETURNS uuid AS $BODY$
DECLARE
    v_org_id uuid;
    v_customer_id uuid;
    v_order_id uuid;
    v_order_number text;
    v_total numeric := 0;
    v_item jsonb;
    v_seller_id uuid := NULL;
BEGIN
    -- Find organization by slug
    SELECT id INTO v_org_id FROM public.organizations WHERE slug = p_org_slug;
    IF v_org_id IS NULL THEN 
        RAISE EXCEPTION 'Organização não encontrada'; 
    END IF;

    -- Find or create customer
    SELECT id INTO v_customer_id FROM public.customers WHERE email = p_customer_email AND organization_id = v_org_id LIMIT 1;
    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (organization_id, name, email, phone) 
        VALUES (v_org_id, p_customer_name, p_customer_email, p_customer_phone) 
        RETURNING id INTO v_customer_id;
    ELSE
        UPDATE public.customers SET name = p_customer_name, phone = p_customer_phone WHERE id = v_customer_id;
    END IF;

    -- Find seller if slug provided
    IF p_seller_slug IS NOT NULL THEN
        SELECT id INTO v_seller_id FROM public.sellers WHERE slug = p_seller_slug AND organization_id = v_org_id LIMIT 1;
    END IF;

    -- Calculate total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_total := v_total + ((v_item->>'price')::numeric * (v_item->>'quantity')::integer);
    END LOOP;

    -- Generate order number
    v_order_number := 'PED-' || upper(substr(md5(random()::text), 1, 6));

    -- Create order with initial status 'Novo'
    INSERT INTO public.orders (organization_id, customer_id, order_number, total, status, seller_id)
    VALUES (v_org_id, v_customer_id, v_order_number, v_total, 'Novo', v_seller_id)
    RETURNING id INTO v_order_id;

    -- Create order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.order_items (order_id, product_id, sku_id, quantity, price)
        VALUES (
            v_order_id,
            (SELECT product_id FROM public.product_skus WHERE id = (v_item->>'sku_id')::uuid),
            (v_item->>'sku_id')::uuid,
            (v_item->>'quantity')::integer,
            (v_item->>'price')::numeric
        );
    END LOOP;

    RETURN v_order_id;
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed administrator user
DO $BODY$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug) VALUES ('Sigma Store', 'sigma') RETURNING id INTO v_org_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sueldo@suportesigma.com') THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'sueldo@suportesigma.com',
      crypt('Skip@Pass', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Sueldo"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, organization_id, full_name, role)
    VALUES (v_user_id, v_org_id, 'Sueldo', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $BODY$;
