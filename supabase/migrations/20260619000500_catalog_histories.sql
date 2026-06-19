CREATE TABLE IF NOT EXISTS catalog_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  name text NOT NULL,
  settings jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE catalog_histories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org catalog_histories" ON catalog_histories;
CREATE POLICY "Users can view org catalog_histories" ON catalog_histories
  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can insert org catalog_histories" ON catalog_histories;
CREATE POLICY "Users can insert org catalog_histories" ON catalog_histories
  FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can delete org catalog_histories" ON catalog_histories;
CREATE POLICY "Users can delete org catalog_histories" ON catalog_histories
  FOR DELETE TO authenticated USING (organization_id = get_my_org_id());
