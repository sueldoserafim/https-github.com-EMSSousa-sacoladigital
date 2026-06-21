CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES public.product_skus(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending'::text,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org wishlists" ON public.wishlists;
CREATE POLICY "Users can view org wishlists" ON public.wishlists
    FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can insert org wishlists" ON public.wishlists;
CREATE POLICY "Users can insert org wishlists" ON public.wishlists
    FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can update org wishlists" ON public.wishlists;
CREATE POLICY "Users can update org wishlists" ON public.wishlists
    FOR UPDATE TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can delete org wishlists" ON public.wishlists;
CREATE POLICY "Users can delete org wishlists" ON public.wishlists
    FOR DELETE TO authenticated USING (organization_id = get_my_org_id());

CREATE OR REPLACE FUNCTION public.add_to_wishlist(
    p_org_id UUID,
    p_sku_id UUID,
    p_customer_name TEXT,
    p_customer_email TEXT
) RETURNS UUID AS $func$
DECLARE
    v_customer_id UUID;
    v_wishlist_id UUID;
BEGIN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE organization_id = p_org_id AND email = p_customer_email
    LIMIT 1;

    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (organization_id, name, email)
        VALUES (p_org_id, p_customer_name, p_customer_email)
        RETURNING id INTO v_customer_id;
    END IF;

    SELECT id INTO v_wishlist_id
    FROM public.wishlists
    WHERE organization_id = p_org_id AND customer_id = v_customer_id AND sku_id = p_sku_id AND status = 'pending'
    LIMIT 1;

    IF v_wishlist_id IS NULL THEN
        INSERT INTO public.wishlists (organization_id, customer_id, sku_id, status)
        VALUES (p_org_id, v_customer_id, p_sku_id, 'pending')
        RETURNING id INTO v_wishlist_id;
    END IF;

    RETURN v_wishlist_id;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_stock_replenishment()
RETURNS trigger AS $trigger$
BEGIN
    IF (OLD.stock <= 0 AND NEW.stock > 0) THEN
        PERFORM net.http_post(
            url := 'https://aktavfdahhbkreecsvpp.supabase.co/functions/v1/notify-back-in-stock',
            headers := jsonb_build_object(
              'Content-Type', 'application/json'
            ),
            body := jsonb_build_object('sku_id', NEW.id, 'organization_id', NEW.organization_id)
        );
    END IF;
    RETURN NEW;
END;
$trigger$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_stock_replenished ON public.product_skus;
CREATE TRIGGER on_stock_replenished
    AFTER UPDATE OF stock ON public.product_skus
    FOR EACH ROW
    WHEN (OLD.stock <= 0 AND NEW.stock > 0)
    EXECUTE FUNCTION public.handle_stock_replenishment();

DO $seed$
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
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Sueldo"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new_user_id, 'Sueldo', 'owner')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $seed$;
