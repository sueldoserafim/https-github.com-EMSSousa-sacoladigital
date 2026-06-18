-- create attributes table
CREATE TABLE IF NOT EXISTS public.attributes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- create attribute_options table
CREATE TABLE IF NOT EXISTS public.attribute_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attribute_id uuid REFERENCES public.attributes(id) ON DELETE CASCADE NOT NULL,
    value text NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- create product_skus table
CREATE TABLE IF NOT EXISTS public.product_skus (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    sku_code text NOT NULL,
    price_override numeric,
    stock integer DEFAULT 0 NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(product_id, sku_code)
);

-- create sku_attribute_values table
CREATE TABLE IF NOT EXISTS public.sku_attribute_values (
    sku_id uuid REFERENCES public.product_skus(id) ON DELETE CASCADE NOT NULL,
    attribute_option_id uuid REFERENCES public.attribute_options(id) ON DELETE CASCADE NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (sku_id, attribute_option_id)
);

-- RLS
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku_attribute_values ENABLE ROW LEVEL SECURITY;

-- attributes policies
DROP POLICY IF EXISTS "Users can view org attributes" ON public.attributes;
CREATE POLICY "Users can view org attributes" ON public.attributes
    FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org attributes" ON public.attributes;
CREATE POLICY "Users can insert org attributes" ON public.attributes
    FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org attributes" ON public.attributes;
CREATE POLICY "Users can update org attributes" ON public.attributes
    FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org attributes" ON public.attributes;
CREATE POLICY "Users can delete org attributes" ON public.attributes
    FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- attribute_options policies
DROP POLICY IF EXISTS "Users can view org attribute_options" ON public.attribute_options;
CREATE POLICY "Users can view org attribute_options" ON public.attribute_options
    FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org attribute_options" ON public.attribute_options;
CREATE POLICY "Users can insert org attribute_options" ON public.attribute_options
    FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org attribute_options" ON public.attribute_options;
CREATE POLICY "Users can update org attribute_options" ON public.attribute_options
    FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org attribute_options" ON public.attribute_options;
CREATE POLICY "Users can delete org attribute_options" ON public.attribute_options
    FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- product_skus policies
DROP POLICY IF EXISTS "Users can view org product_skus" ON public.product_skus;
CREATE POLICY "Users can view org product_skus" ON public.product_skus
    FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org product_skus" ON public.product_skus;
CREATE POLICY "Users can insert org product_skus" ON public.product_skus
    FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org product_skus" ON public.product_skus;
CREATE POLICY "Users can update org product_skus" ON public.product_skus
    FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org product_skus" ON public.product_skus;
CREATE POLICY "Users can delete org product_skus" ON public.product_skus
    FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- sku_attribute_values policies
DROP POLICY IF EXISTS "Users can view org sku_attribute_values" ON public.sku_attribute_values;
CREATE POLICY "Users can view org sku_attribute_values" ON public.sku_attribute_values
    FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org sku_attribute_values" ON public.sku_attribute_values;
CREATE POLICY "Users can insert org sku_attribute_values" ON public.sku_attribute_values
    FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org sku_attribute_values" ON public.sku_attribute_values;
CREATE POLICY "Users can update org sku_attribute_values" ON public.sku_attribute_values
    FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org sku_attribute_values" ON public.sku_attribute_values;
CREATE POLICY "Users can delete org sku_attribute_values" ON public.sku_attribute_values
    FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- Also ensure products can be deleted
DROP POLICY IF EXISTS "Users can delete org products" ON public.products;
CREATE POLICY "Users can delete org products" ON public.products
    FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
