DO $$
BEGIN
    -- Enhance orders table to be globally readable by super_admin
    DROP POLICY IF EXISTS "super_admin_all_orders" ON public.orders;
    CREATE POLICY "super_admin_all_orders" ON public.orders
        FOR SELECT TO authenticated USING (public.is_super_admin());

    -- Enhance order_items table to be globally readable by super_admin
    DROP POLICY IF EXISTS "super_admin_all_order_items" ON public.order_items;
    CREATE POLICY "super_admin_all_order_items" ON public.order_items
        FOR SELECT TO authenticated USING (public.is_super_admin());

    -- Enhance sellers table to be globally readable by super_admin
    DROP POLICY IF EXISTS "super_admin_all_sellers" ON public.sellers;
    CREATE POLICY "super_admin_all_sellers" ON public.sellers
        FOR SELECT TO authenticated USING (public.is_super_admin());
END $$;
