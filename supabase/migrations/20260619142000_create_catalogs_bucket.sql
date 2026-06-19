-- Create catalogs bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('catalogs', 'catalogs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Create policies for catalogs bucket
CREATE POLICY "Public Access" ON storage.objects 
  FOR SELECT USING (bucket_id = 'catalogs');

CREATE POLICY "Authenticated Insert" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'catalogs');
  
CREATE POLICY "Authenticated Update" ON storage.objects 
  FOR UPDATE TO authenticated USING (bucket_id = 'catalogs');

CREATE POLICY "Authenticated Delete" ON storage.objects 
  FOR DELETE TO authenticated USING (bucket_id = 'catalogs');

-- Ensure pdf_url column exists in catalog_histories
ALTER TABLE public.catalog_histories ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Recreate RLS for catalog_histories
DROP POLICY IF EXISTS "catalog_histories_select" ON public.catalog_histories;
CREATE POLICY "catalog_histories_select" ON public.catalog_histories
  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "catalog_histories_insert" ON public.catalog_histories;
CREATE POLICY "catalog_histories_insert" ON public.catalog_histories
  FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "catalog_histories_delete" ON public.catalog_histories;
CREATE POLICY "catalog_histories_delete" ON public.catalog_histories
  FOR DELETE TO authenticated USING (organization_id = get_my_org_id());
