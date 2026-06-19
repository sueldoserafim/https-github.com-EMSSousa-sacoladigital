-- Add pdf_url to catalog_histories
ALTER TABLE public.catalog_histories ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create catalogs storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('catalogs', 'catalogs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'catalogs'
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'catalogs');

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'catalogs');

DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'catalogs');

DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'catalogs');
