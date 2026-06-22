CREATE TABLE IF NOT EXISTS public.organization_financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  monthly_fixed_costs numeric NOT NULL DEFAULT 0,
  monthly_pro_labore numeric NOT NULL DEFAULT 0,
  expected_monthly_orders integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.organization_financial_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org financial_settings" ON public.organization_financial_settings;
CREATE POLICY "Users can view org financial_settings" ON public.organization_financial_settings
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org financial_settings" ON public.organization_financial_settings;
CREATE POLICY "Users can insert org financial_settings" ON public.organization_financial_settings
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org financial_settings" ON public.organization_financial_settings;
CREATE POLICY "Users can update org financial_settings" ON public.organization_financial_settings
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org financial_settings" ON public.organization_financial_settings;
CREATE POLICY "Users can delete org financial_settings" ON public.organization_financial_settings
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
