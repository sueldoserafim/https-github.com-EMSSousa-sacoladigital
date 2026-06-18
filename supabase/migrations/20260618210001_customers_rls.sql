-- Enable RLS just in case it is not
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on customers to ensure clean slate
DROP POLICY IF EXISTS "Users can view org customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert org customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update org customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete org customers" ON public.customers;

-- Recreate all policies for customers ensuring DELETE is also available and isolated by tenant
CREATE POLICY "Users can view org customers" ON public.customers
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert org customers" ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update org customers" ON public.customers
    FOR UPDATE TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete org customers" ON public.customers
    FOR DELETE TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );
