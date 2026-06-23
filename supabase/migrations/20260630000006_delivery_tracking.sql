CREATE TABLE IF NOT EXISTS public.delivery_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id)
);

CREATE INDEX IF NOT EXISTS delivery_tracking_order_id_timestamp_idx ON public.delivery_tracking(order_id, timestamp);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'delivery_tracking'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_tracking;
  END IF;
END $$;

ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_tracking_select" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_select" ON public.delivery_tracking
  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "delivery_tracking_insert" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_insert" ON public.delivery_tracking
  FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());
