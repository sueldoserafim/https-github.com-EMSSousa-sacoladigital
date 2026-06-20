-- Add min_stock_level
ALTER TABLE public.product_skus ADD COLUMN IF NOT EXISTS min_stock_level INTEGER NOT NULL DEFAULT 0;

-- Add invoice_url
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- Create Storage Bucket for Purchase Documents
INSERT INTO storage.buckets (id, name, public) VALUES ('purchase-documents', 'purchase-documents', false) ON CONFLICT (id) DO NOTHING;

-- Setup Storage Policies
DO $BODY$
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own documents" ON storage.objects;
    CREATE POLICY "Users can insert their own documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'purchase-documents');

    DROP POLICY IF EXISTS "Users can read their own documents" ON storage.objects;
    CREATE POLICY "Users can read their own documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'purchase-documents');
END $BODY$;
