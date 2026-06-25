DO $$
BEGIN
  -- Drop existing policy if it exists to ensure idempotency
  DROP POLICY IF EXISTS "driver_select_assigned_orders" ON public.orders;
  
  -- Create policy for drivers to view their assigned orders
  CREATE POLICY "driver_select_assigned_orders" ON public.orders
    FOR SELECT TO authenticated USING (
      delivery_person_id IN (
        SELECT id FROM public.drivers WHERE user_id = auth.uid()
      )
    );
END $$;
