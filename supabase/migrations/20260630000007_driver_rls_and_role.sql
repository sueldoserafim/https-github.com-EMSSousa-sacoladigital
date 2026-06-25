-- Add RLS for drivers to view and update their own orders
DROP POLICY IF EXISTS "delivery_select_own_orders" ON public.orders;
CREATE POLICY "delivery_select_own_orders" ON public.orders
  FOR SELECT TO authenticated USING (
    delivery_person_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delivery_update_own_orders" ON public.orders;
CREATE POLICY "delivery_update_own_orders" ON public.orders
  FOR UPDATE TO authenticated USING (
    delivery_person_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    delivery_person_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- Allow drivers to SELECT profiles to see their own info
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (
    id = auth.uid()
  );

-- Allow drivers to SELECT drivers to fetch their driver info
DROP POLICY IF EXISTS "drivers_tenant_isolation_select" ON public.drivers;
CREATE POLICY "drivers_tenant_isolation_select" ON public.drivers
  FOR SELECT TO authenticated USING (
    organization_id = public.get_user_org_id() OR user_id = auth.uid()
  );
