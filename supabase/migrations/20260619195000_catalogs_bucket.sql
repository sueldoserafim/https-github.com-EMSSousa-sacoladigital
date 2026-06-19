DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('catalogs', 'catalogs', true, 52428800, ARRAY['application/pdf']::text[])
  ON CONFLICT (id) DO UPDATE SET public = true, allowed_mime_types = ARRAY['application/pdf']::text[];
END $$;

DROP POLICY IF EXISTS "Public access to catalogs" ON storage.objects;
CREATE POLICY "Public access to catalogs" ON storage.objects FOR SELECT USING (bucket_id = 'catalogs');

DROP POLICY IF EXISTS "Auth upload to catalogs" ON storage.objects;
CREATE POLICY "Auth upload to catalogs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'catalogs');

DROP POLICY IF EXISTS "Auth update catalogs" ON storage.objects;
CREATE POLICY "Auth update catalogs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'catalogs');

DROP POLICY IF EXISTS "Auth delete catalogs" ON storage.objects;
CREATE POLICY "Auth delete catalogs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'catalogs');
