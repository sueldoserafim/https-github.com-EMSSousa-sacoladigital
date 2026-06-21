DO $BODY$
BEGIN
  -- Add columns if not exists
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_unsubscribed BOOLEAN DEFAULT false;
  ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'basic';

  -- Create table
  CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    segment TEXT,
    status TEXT DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- RLS
  ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view org marketing_campaigns" ON public.marketing_campaigns;
  CREATE POLICY "Users can view org marketing_campaigns" ON public.marketing_campaigns
    FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

  DROP POLICY IF EXISTS "Users can insert org marketing_campaigns" ON public.marketing_campaigns;
  CREATE POLICY "Users can insert org marketing_campaigns" ON public.marketing_campaigns
    FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

  DROP POLICY IF EXISTS "Users can update org marketing_campaigns" ON public.marketing_campaigns;
  CREATE POLICY "Users can update org marketing_campaigns" ON public.marketing_campaigns
    FOR UPDATE TO authenticated USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());

  DROP POLICY IF EXISTS "Users can delete org marketing_campaigns" ON public.marketing_campaigns;
  CREATE POLICY "Users can delete org marketing_campaigns" ON public.marketing_campaigns
    FOR DELETE TO authenticated USING (organization_id = get_my_org_id());

END $BODY$;

CREATE OR REPLACE FUNCTION public.unsubscribe_customer(p_customer_id UUID)
RETURNS void AS $BODY$
BEGIN
  UPDATE public.customers
  SET is_unsubscribed = true
  WHERE id = p_customer_id;
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;
