-- Create helper function to securely get the user's organization ID and bypass RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_org_id;
END;
$function$;

-- Update profiles table policies
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete profiles" ON public.profiles;

CREATE POLICY "Users can select profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR organization_id = public.get_my_org_id());

CREATE POLICY "Users can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR organization_id = public.get_my_org_id());

CREATE POLICY "Users can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR organization_id = public.get_my_org_id());

CREATE POLICY "Users can delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (id = auth.uid() OR organization_id = public.get_my_org_id());

-- Update organizations table policies
DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can update own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can select organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can update organizations" ON public.organizations;

CREATE POLICY "Users can select organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_my_org_id());

CREATE POLICY "Users can update organizations" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.get_my_org_id());

-- Update all other multi-tenant tables
DO $do$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'products', 'product_skus', 'attributes', 'attribute_options', 
        'sku_attribute_values', 'orders', 'customers', 'stock_movements'
    ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users can view org %I" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert org %I" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update org %I" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete org %I" ON public.%I', tbl, tbl);
        
        EXECUTE format('CREATE POLICY "Users can view org %I" ON public.%I FOR SELECT TO authenticated USING (organization_id = public.get_my_org_id())', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can insert org %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_my_org_id())', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can update org %I" ON public.%I FOR UPDATE TO authenticated USING (organization_id = public.get_my_org_id())', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can delete org %I" ON public.%I FOR DELETE TO authenticated USING (organization_id = public.get_my_org_id())', tbl, tbl);
    END LOOP;
END $do$;

-- Update order_items which relies on order_id instead of organization_id
DROP POLICY IF EXISTS "Users can view org order_items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert org order_items" ON public.order_items;
DROP POLICY IF EXISTS "Users can update org order_items" ON public.order_items;
DROP POLICY IF EXISTS "Users can delete org order_items" ON public.order_items;

CREATE POLICY "Users can view org order_items" ON public.order_items
    FOR SELECT TO authenticated
    USING (order_id IN (SELECT id FROM public.orders WHERE organization_id = public.get_my_org_id()));

CREATE POLICY "Users can insert org order_items" ON public.order_items
    FOR INSERT TO authenticated
    WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE organization_id = public.get_my_org_id()));

CREATE POLICY "Users can update org order_items" ON public.order_items
    FOR UPDATE TO authenticated
    USING (order_id IN (SELECT id FROM public.orders WHERE organization_id = public.get_my_org_id()));

CREATE POLICY "Users can delete org order_items" ON public.order_items
    FOR DELETE TO authenticated
    USING (order_id IN (SELECT id FROM public.orders WHERE organization_id = public.get_my_org_id()));
