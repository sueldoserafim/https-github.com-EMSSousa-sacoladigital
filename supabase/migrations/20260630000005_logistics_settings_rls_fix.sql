-- Secure RLS policies for organization_logistics_settings
ALTER TABLE public.organization_logistics_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_logistics_select" ON public.organization_logistics_settings;
CREATE POLICY "org_logistics_select" ON public.organization_logistics_settings
  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "org_logistics_insert" ON public.organization_logistics_settings;
CREATE POLICY "org_logistics_insert" ON public.organization_logistics_settings
  FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "org_logistics_update" ON public.organization_logistics_settings;
CREATE POLICY "org_logistics_update" ON public.organization_logistics_settings
  FOR UPDATE TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "org_logistics_delete" ON public.organization_logistics_settings;
CREATE POLICY "org_logistics_delete" ON public.organization_logistics_settings
  FOR DELETE TO authenticated USING (organization_id = get_my_org_id());
