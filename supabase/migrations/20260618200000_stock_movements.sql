-- Create stock_movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id uuid REFERENCES public.product_skus(id) ON DELETE CASCADE NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quantity integer NOT NULL,
    type text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Add CHECK constraint on product_skus
ALTER TABLE public.product_skus ADD CONSTRAINT stock_not_negative CHECK (stock >= 0);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view org stock_movements" ON public.stock_movements;
CREATE POLICY "Users can view org stock_movements" ON public.stock_movements
    FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org stock_movements" ON public.stock_movements;
CREATE POLICY "Users can insert org stock_movements" ON public.stock_movements
    FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- No UPDATE or DELETE policies -> immutable

-- Create RPC for adjusting stock
CREATE OR REPLACE FUNCTION public.adjust_sku_stock(
    p_sku_id uuid,
    p_quantity integer,
    p_type text,
    p_description text
) RETURNS void AS $$
DECLARE
    v_org_id uuid;
    v_new_stock integer;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.profiles WHERE id = auth.uid();
    
    IF NOT EXISTS (
        SELECT 1 FROM public.product_skus 
        WHERE id = p_sku_id AND organization_id = v_org_id
    ) THEN
        RAISE EXCEPTION 'SKU não encontrado ou não pertence à organização.';
    END IF;

    UPDATE public.product_skus
    SET stock = stock + p_quantity
    WHERE id = p_sku_id
    RETURNING stock INTO v_new_stock;

    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Estoque não pode ficar negativo.';
    END IF;

    INSERT INTO public.stock_movements(
        sku_id, organization_id, user_id, quantity, type, description
    ) VALUES (
        p_sku_id, v_org_id, auth.uid(), p_quantity, p_type, p_description
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
