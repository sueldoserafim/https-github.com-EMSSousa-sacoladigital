CREATE TABLE IF NOT EXISTS public.organization_financial_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    monthly_fixed_costs NUMERIC NOT NULL DEFAULT 0,
    monthly_pro_labore NUMERIC NOT NULL DEFAULT 0,
    expected_monthly_orders INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id)
);

ALTER TABLE public.organization_financial_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_financial_settings_select" ON public.organization_financial_settings;
CREATE POLICY "org_financial_settings_select" ON public.organization_financial_settings
    FOR SELECT TO authenticated 
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_financial_settings_insert" ON public.organization_financial_settings;
CREATE POLICY "org_financial_settings_insert" ON public.organization_financial_settings
    FOR INSERT TO authenticated 
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_financial_settings_update" ON public.organization_financial_settings;
CREATE POLICY "org_financial_settings_update" ON public.organization_financial_settings
    FOR UPDATE TO authenticated 
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
