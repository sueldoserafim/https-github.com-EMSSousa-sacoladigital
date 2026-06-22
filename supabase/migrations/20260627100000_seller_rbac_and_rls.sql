-- Create helper functions for Role-Based Access Control
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_seller_id()
RETURNS uuid AS $$
  SELECT id FROM public.sellers WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Update RLS for orders
DROP POLICY IF EXISTS "Users can view org orders" ON public.orders;
CREATE POLICY "Users can view org orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

DROP POLICY IF EXISTS "Users can insert org orders" ON public.orders;
CREATE POLICY "Users can insert org orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

DROP POLICY IF EXISTS "Users can update org orders" ON public.orders;
CREATE POLICY "Users can update org orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  )
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

-- Update RLS for consignment_orders
DROP POLICY IF EXISTS "Users can view org consignment_orders" ON public.consignment_orders;
CREATE POLICY "Users can view org consignment_orders" ON public.consignment_orders
  FOR SELECT TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

DROP POLICY IF EXISTS "Users can insert org consignment_orders" ON public.consignment_orders;
CREATE POLICY "Users can insert org consignment_orders" ON public.consignment_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

DROP POLICY IF EXISTS "Users can update org consignment_orders" ON public.consignment_orders;
CREATE POLICY "Users can update org consignment_orders" ON public.consignment_orders
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  )
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

-- Update RLS for consignment_items
DROP POLICY IF EXISTS "Users can view org consignment_items" ON public.consignment_items;
CREATE POLICY "Users can view org consignment_items" ON public.consignment_items
  FOR SELECT TO authenticated
  USING (
    consignment_id IN (
      SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id()
    ) AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND consignment_id IN (
        SELECT id FROM public.consignment_orders WHERE seller_id = get_my_seller_id()
      ))
    )
  );

DROP POLICY IF EXISTS "Users can insert org consignment_items" ON public.consignment_items;
CREATE POLICY "Users can insert org consignment_items" ON public.consignment_items
  FOR INSERT TO authenticated
  WITH CHECK (
    consignment_id IN (
      SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id()
    ) AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND consignment_id IN (
        SELECT id FROM public.consignment_orders WHERE seller_id = get_my_seller_id()
      ))
    )
  );

DROP POLICY IF EXISTS "Users can update org consignment_items" ON public.consignment_items;
CREATE POLICY "Users can update org consignment_items" ON public.consignment_items
  FOR UPDATE TO authenticated
  USING (
    consignment_id IN (
      SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id()
    ) AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND consignment_id IN (
        SELECT id FROM public.consignment_orders WHERE seller_id = get_my_seller_id()
      ))
    )
  )
  WITH CHECK (
    consignment_id IN (
      SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id()
    ) AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND consignment_id IN (
        SELECT id FROM public.consignment_orders WHERE seller_id = get_my_seller_id()
      ))
    )
  );

-- Update RLS for financial_transactions
DROP POLICY IF EXISTS "Users can view org transactions" ON public.financial_transactions;
CREATE POLICY "Users can view org transactions" ON public.financial_transactions
  FOR SELECT TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

DROP POLICY IF EXISTS "Users can insert org transactions" ON public.financial_transactions;
CREATE POLICY "Users can insert org transactions" ON public.financial_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

DROP POLICY IF EXISTS "Users can update org transactions" ON public.financial_transactions;
CREATE POLICY "Users can update org transactions" ON public.financial_transactions
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  )
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() != 'seller' OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

-- Update RLS for group_buying_reservations
DROP POLICY IF EXISTS "Users can view org group_buying_reservations" ON public.group_buying_reservations;
CREATE POLICY "Users can view org group_buying_reservations" ON public.group_buying_reservations
  FOR SELECT TO authenticated
  USING (
    (get_my_role() != 'seller') OR
    (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
  );

DROP POLICY IF EXISTS "Users can insert org group_buying_reservations" ON public.group_buying_reservations;
CREATE POLICY "Users can insert org group_buying_reservations" ON public.group_buying_reservations
  FOR INSERT TO authenticated
  WITH CHECK (
    (get_my_role() != 'seller') OR
    (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
  );

DROP POLICY IF EXISTS "Users can update org group_buying_reservations" ON public.group_buying_reservations;
CREATE POLICY "Users can update org group_buying_reservations" ON public.group_buying_reservations
  FOR UPDATE TO authenticated
  USING (
    (get_my_role() != 'seller') OR
    (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
  )
  WITH CHECK (
    (get_my_role() != 'seller') OR
    (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
  );

DROP POLICY IF EXISTS "Sellers can delete own group_buying_reservations" ON public.group_buying_reservations;
DROP POLICY IF EXISTS "Sellers can insert own group_buying_reservations" ON public.group_buying_reservations;
DROP POLICY IF EXISTS "Sellers can update own group_buying_reservations" ON public.group_buying_reservations;

-- Ensure sueldo has admin role, and create test seller
DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_admin_id uuid;
BEGIN
  -- Get an organization to attach
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;

  -- Ensure admin role for sueldo
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'sueldo@suportesigma.com';
  IF v_admin_id IS NOT NULL THEN
    UPDATE public.profiles SET role = 'admin' WHERE id = v_admin_id;
  END IF;

  IF v_org_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'vendedora@teste.com') THEN
      v_user_id := gen_random_uuid();
      
      -- Insert into auth.users (idempotent due to check)
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
        'vendedora@teste.com',
        crypt('Skip@Pass', gen_salt('bf')),
        NOW(), NOW(), NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Vendedora Teste"}',
        false, 'authenticated', 'authenticated',
        '', '', '', '', '', NULL, '', '', ''
      );

      -- Add profile (trigger might have done it, so ON CONFLICT DO UPDATE)
      INSERT INTO public.profiles (id, organization_id, full_name, role)
      VALUES (v_user_id, v_org_id, 'Vendedora Teste', 'seller')
      ON CONFLICT (id) DO UPDATE SET role = 'seller', full_name = 'Vendedora Teste';

      -- Add seller record
      INSERT INTO public.sellers (organization_id, name, slug, commission_rate, user_id)
      VALUES (v_org_id, 'Vendedora Teste', 'vendedora-teste', 10.0, v_user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;
