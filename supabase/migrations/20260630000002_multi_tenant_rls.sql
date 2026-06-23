DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.get_user_org_id()
  RETURNS uuid AS $FUNC$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  $FUNC$ LANGUAGE sql SECURITY DEFINER STABLE;

  CREATE OR REPLACE FUNCTION public.is_super_admin()
  RETURNS boolean AS $FUNC$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    );
  $FUNC$ LANGUAGE sql SECURITY DEFINER STABLE;
END $$;

CREATE OR REPLACE FUNCTION public.trg_enforce_organization_id()
RETURNS trigger AS $$
DECLARE
  v_user_org_id uuid;
  v_is_super boolean;
BEGIN
  v_user_org_id := public.get_user_org_id();
  v_is_super := public.is_super_admin();

  IF TG_OP = 'INSERT' THEN
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := v_user_org_id;
    END IF;
  END IF;

  IF NOT v_is_super AND NEW.organization_id != v_user_org_id THEN
    RAISE EXCEPTION 'Access Denied: You can only assign records to your own organization.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger products
DROP TRIGGER IF EXISTS enforce_org_products ON public.products;
CREATE TRIGGER enforce_org_products
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_organization_id();

-- Trigger orders
DROP TRIGGER IF EXISTS enforce_org_orders ON public.orders;
CREATE TRIGGER enforce_org_orders
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_organization_id();

-- Trigger customers
DROP TRIGGER IF EXISTS enforce_org_customers ON public.customers;
CREATE TRIGGER enforce_org_customers
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_organization_id();

-- Trigger product_skus
DROP TRIGGER IF EXISTS enforce_org_product_skus ON public.product_skus;
CREATE TRIGGER enforce_org_product_skus
BEFORE INSERT OR UPDATE ON public.product_skus
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_organization_id();


-- RLS ENABLING
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_skus ENABLE ROW LEVEL SECURITY;

-- Products Policies
DROP POLICY IF EXISTS "products_tenant_isolation_select" ON public.products;
CREATE POLICY "products_tenant_isolation_select" ON public.products
FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "products_tenant_isolation_insert" ON public.products;
CREATE POLICY "products_tenant_isolation_insert" ON public.products
FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "products_tenant_isolation_update" ON public.products;
CREATE POLICY "products_tenant_isolation_update" ON public.products
FOR UPDATE TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin())
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "products_tenant_isolation_delete" ON public.products;
CREATE POLICY "products_tenant_isolation_delete" ON public.products
FOR DELETE TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

-- Product SKUs Policies
DROP POLICY IF EXISTS "product_skus_tenant_isolation_select" ON public.product_skus;
CREATE POLICY "product_skus_tenant_isolation_select" ON public.product_skus
FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "product_skus_tenant_isolation_insert" ON public.product_skus;
CREATE POLICY "product_skus_tenant_isolation_insert" ON public.product_skus
FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "product_skus_tenant_isolation_update" ON public.product_skus;
CREATE POLICY "product_skus_tenant_isolation_update" ON public.product_skus
FOR UPDATE TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin())
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "product_skus_tenant_isolation_delete" ON public.product_skus;
CREATE POLICY "product_skus_tenant_isolation_delete" ON public.product_skus
FOR DELETE TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

-- Orders Policies
DROP POLICY IF EXISTS "orders_tenant_isolation_select" ON public.orders;
CREATE POLICY "orders_tenant_isolation_select" ON public.orders
FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "orders_tenant_isolation_insert" ON public.orders;
CREATE POLICY "orders_tenant_isolation_insert" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "orders_tenant_isolation_update" ON public.orders;
CREATE POLICY "orders_tenant_isolation_update" ON public.orders
FOR UPDATE TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin())
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "orders_tenant_isolation_delete" ON public.orders;
CREATE POLICY "orders_tenant_isolation_delete" ON public.orders
FOR DELETE TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

-- Customers Policies
DROP POLICY IF EXISTS "customers_tenant_isolation_select" ON public.customers;
CREATE POLICY "customers_tenant_isolation_select" ON public.customers
FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "customers_tenant_isolation_insert" ON public.customers;
CREATE POLICY "customers_tenant_isolation_insert" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "customers_tenant_isolation_update" ON public.customers;
CREATE POLICY "customers_tenant_isolation_update" ON public.customers
FOR UPDATE TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin())
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "customers_tenant_isolation_delete" ON public.customers;
CREATE POLICY "customers_tenant_isolation_delete" ON public.customers
FOR DELETE TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());
