DO $DO$
BEGIN
  -- Drop existing policy to ensure idempotency
  DROP POLICY IF EXISTS "driver_select_assigned_orders" ON public.orders;
  
  -- Create policy allowing drivers to select their assigned orders
  CREATE POLICY "driver_select_assigned_orders" ON public.orders
    FOR SELECT TO authenticated USING (
      delivery_person_id IN (
        SELECT id FROM public.drivers WHERE user_id = auth.uid()
      )
    );
    
  -- Update specifically requested orders to the given driver ID to meet Acceptance Criteria
  UPDATE public.orders
  SET 
    delivery_person_id = '72ee9d47-fbaa-41b3-83d5-ff865be0da2d'::uuid,
    status = 'Pronto p/ entrega'
  WHERE order_number IN ('PED-0WNN', 'ORD-816207');
END $DO$;
