CREATE TABLE IF NOT EXISTS public.organization_logistics_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    base_shipping_fee NUMERIC DEFAULT 0,
    cost_per_km NUMERIC DEFAULT 0,
    store_address TEXT,
    store_lat NUMERIC,
    store_lng NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT organization_logistics_settings_org_id_key UNIQUE (organization_id)
);

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_lat NUMERIC,
ADD COLUMN IF NOT EXISTS delivery_lng NUMERIC;

ALTER TABLE public.organization_logistics_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_logistics_select" ON public.organization_logistics_settings;
CREATE POLICY "org_logistics_select" ON public.organization_logistics_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "org_logistics_insert" ON public.organization_logistics_settings;
CREATE POLICY "org_logistics_insert" ON public.organization_logistics_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "org_logistics_update" ON public.organization_logistics_settings;
CREATE POLICY "org_logistics_update" ON public.organization_logistics_settings FOR UPDATE USING (true);
