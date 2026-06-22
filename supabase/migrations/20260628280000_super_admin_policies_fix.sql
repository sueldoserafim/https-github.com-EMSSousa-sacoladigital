DO $$
BEGIN
  -- Ensure order_items can be selected by super admins
  DROP POLICY IF EXISTS "super_admin_all_order_items" ON public.order_items;
  CREATE POLICY "super_admin_all_order_items" ON public.order_items
    FOR ALL TO authenticated 
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') OR public.is_super_admin()
    );

  -- Update sellers policy to include profiles check as per AC
  DROP POLICY IF EXISTS "super_admin_all_sellers" ON public.sellers;
  CREATE POLICY "super_admin_all_sellers" ON public.sellers
    FOR ALL TO authenticated 
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') OR public.is_super_admin()
    );

  -- Update orders policy to include profiles check
  DROP POLICY IF EXISTS "super_admin_all_orders" ON public.orders;
  CREATE POLICY "super_admin_all_orders" ON public.orders
    FOR ALL TO authenticated 
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') OR public.is_super_admin()
    );

  -- Update products policy (used by vw_product_performance)
  DROP POLICY IF EXISTS "super_admin_all_products" ON public.products;
  CREATE POLICY "super_admin_all_products" ON public.products
    FOR ALL TO authenticated 
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') OR public.is_super_admin()
    );

  -- Update product_skus policy
  DROP POLICY IF EXISTS "super_admin_all_product_skus" ON public.product_skus;
  CREATE POLICY "super_admin_all_product_skus" ON public.product_skus
    FOR ALL TO authenticated 
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') OR public.is_super_admin()
    );
END $$;
