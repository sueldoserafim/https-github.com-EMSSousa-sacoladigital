DO $$
BEGIN
  -- Ensure the driver can select orders assigned to them
  DROP POLICY IF EXISTS "driver_select_assigned_orders" ON public.orders;
  CREATE POLICY "driver_select_assigned_orders" ON public.orders
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.drivers d
        WHERE d.id = orders.delivery_person_id
        AND d.user_id = auth.uid()
      )
    );

  -- Ensure the driver can update orders assigned to them (e.g., status changes)
  DROP POLICY IF EXISTS "driver_update_assigned_orders" ON public.orders;
  CREATE POLICY "driver_update_assigned_orders" ON public.orders
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.drivers d
        WHERE d.id = orders.delivery_person_id
        AND d.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.drivers d
        WHERE d.id = orders.delivery_person_id
        AND d.user_id = auth.uid()
      )
    );
END $$;
