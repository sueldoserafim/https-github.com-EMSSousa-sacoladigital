DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Ensure Sueldo is a super_admin
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'sueldo@suportesigma.com';
  
  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users SET is_super_admin = true WHERE id = v_user_id;
    
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_user_id, 'Sueldo (Master)', 'super_admin')
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
  END IF;

  -- super_admin policies for core tables
  DROP POLICY IF EXISTS "super_admin_all_organizations" ON public.organizations;
  CREATE POLICY "super_admin_all_organizations" ON public.organizations
    FOR ALL TO authenticated USING (public.is_super_admin());

  DROP POLICY IF EXISTS "super_admin_all_profiles" ON public.profiles;
  CREATE POLICY "super_admin_all_profiles" ON public.profiles
    FOR ALL TO authenticated USING (public.is_super_admin());

  DROP POLICY IF EXISTS "super_admin_all_orders" ON public.orders;
  CREATE POLICY "super_admin_all_orders" ON public.orders
    FOR ALL TO authenticated USING (public.is_super_admin());

  DROP POLICY IF EXISTS "super_admin_all_customers" ON public.customers;
  CREATE POLICY "super_admin_all_customers" ON public.customers
    FOR ALL TO authenticated USING (public.is_super_admin());

  DROP POLICY IF EXISTS "super_admin_all_financial_transactions" ON public.financial_transactions;
  CREATE POLICY "super_admin_all_financial_transactions" ON public.financial_transactions
    FOR ALL TO authenticated USING (public.is_super_admin());

  DROP POLICY IF EXISTS "super_admin_all_products" ON public.products;
  CREATE POLICY "super_admin_all_products" ON public.products
    FOR ALL TO authenticated USING (public.is_super_admin());

  DROP POLICY IF EXISTS "super_admin_all_product_skus" ON public.product_skus;
  CREATE POLICY "super_admin_all_product_skus" ON public.product_skus
    FOR ALL TO authenticated USING (public.is_super_admin());
END $$;
