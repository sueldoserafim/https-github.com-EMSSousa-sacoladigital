CREATE TABLE IF NOT EXISTS public.pre_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES public.product_skus(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'notified', 'fulfilled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pre_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view org pre_orders" ON public.pre_orders;
    CREATE POLICY "Users can view org pre_orders" ON public.pre_orders
        FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "Users can insert org pre_orders" ON public.pre_orders;
    CREATE POLICY "Users can insert org pre_orders" ON public.pre_orders
        FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "Users can update org pre_orders" ON public.pre_orders;
    CREATE POLICY "Users can update org pre_orders" ON public.pre_orders
        FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "Users can delete org pre_orders" ON public.pre_orders;
    CREATE POLICY "Users can delete org pre_orders" ON public.pre_orders
        FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
END $$;
