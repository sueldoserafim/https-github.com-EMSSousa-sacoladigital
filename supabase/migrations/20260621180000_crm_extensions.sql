-- Add segment column to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS segment text DEFAULT 'Novo';

-- Create customer_tags
CREATE TABLE IF NOT EXISTS public.customer_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create customer_notes
CREATE TABLE IF NOT EXISTS public.customer_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    content text NOT NULL,
    is_private boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

-- Policies for customer_tags
DROP POLICY IF EXISTS "Users can view org customer_tags" ON public.customer_tags;
CREATE POLICY "Users can view org customer_tags" ON public.customer_tags
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org customer_tags" ON public.customer_tags;
CREATE POLICY "Users can insert org customer_tags" ON public.customer_tags
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org customer_tags" ON public.customer_tags;
CREATE POLICY "Users can delete org customer_tags" ON public.customer_tags
    FOR DELETE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for customer_notes
DROP POLICY IF EXISTS "Users can view org customer_notes" ON public.customer_notes;
CREATE POLICY "Users can view org customer_notes" ON public.customer_notes
    FOR SELECT TO authenticated
    USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (
            is_private = false 
            OR author_id = auth.uid() 
            OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Users can insert org customer_notes" ON public.customer_notes;
CREATE POLICY "Users can insert org customer_notes" ON public.customer_notes
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org customer_notes" ON public.customer_notes;
CREATE POLICY "Users can update org customer_notes" ON public.customer_notes
    FOR UPDATE TO authenticated
    USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (author_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager'))
    );

DROP POLICY IF EXISTS "Users can delete org customer_notes" ON public.customer_notes;
CREATE POLICY "Users can delete org customer_notes" ON public.customer_notes
    FOR DELETE TO authenticated
    USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (author_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager'))
    );
