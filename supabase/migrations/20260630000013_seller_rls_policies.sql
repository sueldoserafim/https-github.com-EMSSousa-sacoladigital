-- Drop existing org-wide policies that might leak data to sellers
DROP POLICY IF EXISTS "Users can view org orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert org orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update org orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete org orders" ON public.orders;
DROP POLICY IF EXISTS "orders_tenant_isolation_select" ON public.orders;
DROP POLICY IF EXISTS "orders_tenant_isolation_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_tenant_isolation_update" ON public.orders;
DROP POLICY IF EXISTS "orders_tenant_isolation_delete" ON public.orders;

DROP POLICY IF EXISTS "Users can view org order_items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert org order_items" ON public.order_items;
DROP POLICY IF EXISTS "Users can update org order_items" ON public.order_items;
DROP POLICY IF EXISTS "Users can delete org order_items" ON public.order_items;
DROP POLICY IF EXISTS "order_items_tenant_isolation_select" ON public.order_items;
DROP POLICY IF EXISTS "order_items_tenant_isolation_insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items_tenant_isolation_update" ON public.order_items;
DROP POLICY IF EXISTS "order_items_tenant_isolation_delete" ON public.order_items;

DROP POLICY IF EXISTS "Users can view org transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Users can insert org transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Users can update org transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Users can delete org transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_tenant_isolation_select" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_tenant_isolation_insert" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_tenant_isolation_update" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_tenant_isolation_delete" ON public.financial_transactions;

DROP POLICY IF EXISTS "Users can view org consignment_orders" ON public.consignment_orders;
DROP POLICY IF EXISTS "Users can insert org consignment_orders" ON public.consignment_orders;
DROP POLICY IF EXISTS "Users can update org consignment_orders" ON public.consignment_orders;
DROP POLICY IF EXISTS "Users can delete org consignment_orders" ON public.consignment_orders;

DROP POLICY IF EXISTS "Users can view org consignment_items" ON public.consignment_items;
DROP POLICY IF EXISTS "Users can insert org consignment_items" ON public.consignment_items;
DROP POLICY IF EXISTS "Users can update org consignment_items" ON public.consignment_items;
DROP POLICY IF EXISTS "Users can delete org consignment_items" ON public.consignment_items;

-- 1. Orders
CREATE POLICY "Users can view org orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

CREATE POLICY "Users can insert org orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

CREATE POLICY "Users can update org orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  )
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

CREATE POLICY "Users can delete org orders" ON public.orders
  FOR DELETE TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

-- 2. Order Items
CREATE POLICY "Users can view org order_items" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE organization_id = get_my_org_id() AND
      (
        get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
        (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
      )
    )
  );

CREATE POLICY "Users can insert org order_items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders WHERE organization_id = get_my_org_id() AND
      (
        get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
        (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
      )
    )
  );

CREATE POLICY "Users can update org order_items" ON public.order_items
  FOR UPDATE TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE organization_id = get_my_org_id() AND
      (
        get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
        (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
      )
    )
  )
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders WHERE organization_id = get_my_org_id() AND
      (
        get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
        (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
      )
    )
  );

CREATE POLICY "Users can delete org order_items" ON public.order_items
  FOR DELETE TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE organization_id = get_my_org_id() AND
      (
        get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
        (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
      )
    )
  );

-- 3. Financial Transactions
CREATE POLICY "Users can view org transactions" ON public.financial_transactions
  FOR SELECT TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

CREATE POLICY "Users can insert org transactions" ON public.financial_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

CREATE POLICY "Users can update org transactions" ON public.financial_transactions
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  )
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

CREATE POLICY "Users can delete org transactions" ON public.financial_transactions
  FOR DELETE TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

-- 4. Consignment Orders
CREATE POLICY "Users can view org consignment_orders" ON public.consignment_orders
  FOR SELECT TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

CREATE POLICY "Users can insert org consignment_orders" ON public.consignment_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

CREATE POLICY "Users can update org consignment_orders" ON public.consignment_orders
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  )
  WITH CHECK (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

CREATE POLICY "Users can delete org consignment_orders" ON public.consignment_orders
  FOR DELETE TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    (
      get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
      (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
    )
  );

-- 5. Consignment Items
CREATE POLICY "Users can view org consignment_items" ON public.consignment_items
  FOR SELECT TO authenticated
  USING (
    consignment_id IN (
      SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id() AND
      (
        get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
        (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
      )
    )
  );

CREATE POLICY "Users can insert org consignment_items" ON public.consignment_items
  FOR INSERT TO authenticated
  WITH CHECK (
    consignment_id IN (
      SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id() AND
      (
        get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
        (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
      )
    )
  );

CREATE POLICY "Users can update org consignment_items" ON public.consignment_items
  FOR UPDATE TO authenticated
  USING (
    consignment_id IN (
      SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id() AND
      (
        get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
        (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
      )
    )
  )
  WITH CHECK (
    consignment_id IN (
      SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id() AND
      (
        get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
        (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
      )
    )
  );

CREATE POLICY "Users can delete org consignment_items" ON public.consignment_items
  FOR DELETE TO authenticated
  USING (
    consignment_id IN (
      SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id() AND
      (
        get_my_role() IN ('admin', 'owner', 'manager', 'member') OR
        (get_my_role() = 'seller' AND seller_id = get_my_seller_id())
      )
    )
  );

-- Trigger to automatically set seller_id if the user is a seller (to satisfy the WITH CHECK policy on INSERTs)
CREATE OR REPLACE FUNCTION public.set_seller_id_on_insert()
RETURNS trigger AS $$
BEGIN
  IF public.get_my_role() = 'seller' THEN
    NEW.seller_id := public.get_my_seller_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_seller_id_on_order_insert ON public.orders;
CREATE TRIGGER trg_set_seller_id_on_order_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_seller_id_on_insert();

DROP TRIGGER IF EXISTS trg_set_seller_id_on_tx_insert ON public.financial_transactions;
CREATE TRIGGER trg_set_seller_id_on_tx_insert
  BEFORE INSERT ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_seller_id_on_insert();

DROP TRIGGER IF EXISTS trg_set_seller_id_on_consignment_insert ON public.consignment_orders;
CREATE TRIGGER trg_set_seller_id_on_consignment_insert
  BEFORE INSERT ON public.consignment_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_seller_id_on_insert();

-- Verification user insert (seed maria if not exists)
DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  IF v_org_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'maria@exemplo.com') THEN
      v_user_id := gen_random_uuid();
      
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
        'maria@exemplo.com',
        crypt('Skip@Pass', gen_salt('bf')),
        NOW(), NOW(), NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Maria Vendedora"}',
        false, 'authenticated', 'authenticated',
        '', '', '', '', '', NULL, '', '', ''
      );

      INSERT INTO public.profiles (id, organization_id, full_name, role)
      VALUES (v_user_id, v_org_id, 'Maria Vendedora', 'seller')
      ON CONFLICT (id) DO UPDATE SET role = 'seller', full_name = 'Maria Vendedora';

      INSERT INTO public.sellers (organization_id, name, slug, commission_rate, user_id)
      VALUES (v_org_id, 'Maria Vendedora', 'maria-vendedora', 15.0, v_user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;
