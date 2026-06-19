DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('organization-assets', 'organization-assets', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "Public access to organization-assets" ON storage.objects;
CREATE POLICY "Public access to organization-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-assets');

DROP POLICY IF EXISTS "Authenticated users can upload organization-assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload organization-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'organization-assets');

DROP POLICY IF EXISTS "Authenticated users can update organization-assets" ON storage.objects;
CREATE POLICY "Authenticated users can update organization-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'organization-assets');

DROP POLICY IF EXISTS "Authenticated users can delete organization-assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete organization-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'organization-assets');
