-- Migration for Suppliers and Purchase Orders
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org suppliers" ON public.suppliers;
CREATE POLICY "Users can view org suppliers" ON public.suppliers
    FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org suppliers" ON public.suppliers;
CREATE POLICY "Users can insert org suppliers" ON public.suppliers
    FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org suppliers" ON public.suppliers;
CREATE POLICY "Users can update org suppliers" ON public.suppliers
    FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org suppliers" ON public.suppliers;
CREATE POLICY "Users can delete org suppliers" ON public.suppliers
    FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RECEIVED', 'CANCELLED')),
    total_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org purchase_orders" ON public.purchase_orders;
CREATE POLICY "Users can view org purchase_orders" ON public.purchase_orders
    FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org purchase_orders" ON public.purchase_orders;
CREATE POLICY "Users can insert org purchase_orders" ON public.purchase_orders
    FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org purchase_orders" ON public.purchase_orders;
CREATE POLICY "Users can update org purchase_orders" ON public.purchase_orders
    FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org purchase_orders" ON public.purchase_orders;
CREATE POLICY "Users can delete org purchase_orders" ON public.purchase_orders
    FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES public.product_skus(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC NOT NULL CHECK (unit_cost >= 0)
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org purchase_items" ON public.purchase_items;
CREATE POLICY "Users can view org purchase_items" ON public.purchase_items
    FOR SELECT TO authenticated USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can insert org purchase_items" ON public.purchase_items;
CREATE POLICY "Users can insert org purchase_items" ON public.purchase_items
    FOR INSERT TO authenticated WITH CHECK (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can update org purchase_items" ON public.purchase_items;
CREATE POLICY "Users can update org purchase_items" ON public.purchase_items
    FOR UPDATE TO authenticated USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can delete org purchase_items" ON public.purchase_items;
CREATE POLICY "Users can delete org purchase_items" ON public.purchase_items
    FOR DELETE TO authenticated USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Function to receive a purchase order
CREATE OR REPLACE FUNCTION public.receive_purchase_order(p_po_id UUID)
RETURNS void AS $BODY$
DECLARE
    v_org_id UUID;
    v_status TEXT;
    v_item RECORD;
    v_product_id UUID;
BEGIN
    -- Check permissions and get current status
    SELECT organization_id, status INTO v_org_id, v_status
    FROM public.purchase_orders
    WHERE id = p_po_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Purchase order not found';
    END IF;

    IF v_org_id NOT IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_status != 'PENDING' THEN
        RAISE EXCEPTION 'Purchase order is not PENDING';
    END IF;

    -- Update PO status
    UPDATE public.purchase_orders
    SET status = 'RECEIVED'
    WHERE id = p_po_id;

    -- Process items
    FOR v_item IN (SELECT sku_id, quantity, unit_cost FROM public.purchase_items WHERE purchase_order_id = p_po_id) LOOP
        -- Add stock movement via adjust_sku_stock
        PERFORM public.adjust_sku_stock(v_item.sku_id, v_item.quantity, 'ENTRADA', 'Recebimento de Pedido de Compra');
        
        -- Get product_id from sku
        SELECT product_id INTO v_product_id
        FROM public.product_skus
        WHERE id = v_item.sku_id;

        -- Update product cost
        IF v_product_id IS NOT NULL THEN
            UPDATE public.products
            SET cost = v_item.unit_cost
            WHERE id = v_product_id;
        END IF;
    END LOOP;
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;
