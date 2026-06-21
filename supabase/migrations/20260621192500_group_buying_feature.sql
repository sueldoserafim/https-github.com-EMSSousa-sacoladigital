-- Migration for Group Buying Campaigns and Reservations

CREATE TABLE IF NOT EXISTS public.group_buying_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES public.product_skus(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_quantity INTEGER NOT NULL CHECK (target_quantity > 0),
    unit_cost NUMERIC NOT NULL CHECK (unit_cost >= 0),
    deadline TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'successful', 'failed', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_buying_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.group_buying_campaigns(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, seller_id)
);

ALTER TABLE public.group_buying_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_buying_reservations ENABLE ROW LEVEL SECURITY;

-- Admins/Members can CRUD campaigns.
DROP POLICY IF EXISTS "Users can view org group_buying_campaigns" ON public.group_buying_campaigns;
CREATE POLICY "Users can view org group_buying_campaigns" ON public.group_buying_campaigns
    FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org group_buying_campaigns" ON public.group_buying_campaigns;
CREATE POLICY "Users can insert org group_buying_campaigns" ON public.group_buying_campaigns
    FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org group_buying_campaigns" ON public.group_buying_campaigns;
CREATE POLICY "Users can update org group_buying_campaigns" ON public.group_buying_campaigns
    FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org group_buying_campaigns" ON public.group_buying_campaigns;
CREATE POLICY "Users can delete org group_buying_campaigns" ON public.group_buying_campaigns
    FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- Admins/Members/Sellers can view and manage their reservations
DROP POLICY IF EXISTS "Users can view org group_buying_reservations" ON public.group_buying_reservations;
CREATE POLICY "Users can view org group_buying_reservations" ON public.group_buying_reservations
    FOR SELECT TO authenticated USING (campaign_id IN (SELECT id FROM public.group_buying_campaigns WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can insert org group_buying_reservations" ON public.group_buying_reservations;
CREATE POLICY "Users can insert org group_buying_reservations" ON public.group_buying_reservations
    FOR INSERT TO authenticated WITH CHECK (campaign_id IN (SELECT id FROM public.group_buying_campaigns WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can update org group_buying_reservations" ON public.group_buying_reservations;
CREATE POLICY "Users can update org group_buying_reservations" ON public.group_buying_reservations
    FOR UPDATE TO authenticated USING (campaign_id IN (SELECT id FROM public.group_buying_campaigns WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can delete org group_buying_reservations" ON public.group_buying_reservations;
CREATE POLICY "Users can delete org group_buying_reservations" ON public.group_buying_reservations
    FOR DELETE TO authenticated USING (campaign_id IN (SELECT id FROM public.group_buying_campaigns WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));


-- Function to close campaign and generate PO if target is met
CREATE OR REPLACE FUNCTION public.close_group_buying_campaign(p_campaign_id UUID)
RETURNS void AS $$
DECLARE
    v_campaign RECORD;
    v_total_reserved INTEGER;
    v_po_id UUID;
BEGIN
    SELECT * INTO v_campaign 
    FROM public.group_buying_campaigns 
    WHERE id = p_campaign_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found';
    END IF;

    IF v_campaign.status != 'active' THEN
        RAISE EXCEPTION 'Campaign is not active';
    END IF;

    SELECT COALESCE(SUM(quantity), 0) INTO v_total_reserved
    FROM public.group_buying_reservations
    WHERE campaign_id = p_campaign_id;

    IF v_total_reserved >= v_campaign.target_quantity THEN
        -- Target Met -> Create PO
        UPDATE public.group_buying_campaigns
        SET status = 'successful'
        WHERE id = p_campaign_id;

        INSERT INTO public.purchase_orders (
            organization_id, supplier_id, status, total_amount
        ) VALUES (
            v_campaign.organization_id, v_campaign.supplier_id, 'PENDING', v_total_reserved * v_campaign.unit_cost
        ) RETURNING id INTO v_po_id;

        INSERT INTO public.purchase_items (
            purchase_order_id, sku_id, quantity, unit_cost
        ) VALUES (
            v_po_id, v_campaign.sku_id, v_total_reserved, v_campaign.unit_cost
        );
    ELSE
        -- Target Not Met
        UPDATE public.group_buying_campaigns
        SET status = 'failed'
        WHERE id = p_campaign_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Seed initial functional test data
DO $$
DECLARE
    v_org_id UUID;
    v_supplier_id UUID;
    v_product_id UUID;
    v_sku_id UUID;
    v_seller1_id UUID;
    v_seller2_id UUID;
    v_campaign_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
    
    IF v_org_id IS NOT NULL THEN
        -- Ensure a supplier exists
        SELECT id INTO v_supplier_id FROM public.suppliers WHERE organization_id = v_org_id LIMIT 1;
        IF v_supplier_id IS NULL THEN
            INSERT INTO public.suppliers (organization_id, name, email) 
            VALUES (v_org_id, 'Fornecedor Atacadista', 'vendas@atacadista.com') RETURNING id INTO v_supplier_id;
        END IF;

        -- Ensure a product & sku exists
        SELECT id INTO v_product_id FROM public.products WHERE organization_id = v_org_id LIMIT 1;
        IF v_product_id IS NOT NULL THEN
            SELECT id INTO v_sku_id FROM public.product_skus WHERE product_id = v_product_id LIMIT 1;
            
            IF v_sku_id IS NOT NULL THEN
                -- Ensure 2 sellers exist
                SELECT id INTO v_seller1_id FROM public.sellers WHERE organization_id = v_org_id LIMIT 1;
                IF v_seller1_id IS NULL THEN
                    INSERT INTO public.sellers (organization_id, name, slug) 
                    VALUES (v_org_id, 'Vendedor 1', 'seller-1') RETURNING id INTO v_seller1_id;
                END IF;
                
                SELECT id INTO v_seller2_id FROM public.sellers WHERE organization_id = v_org_id AND id != v_seller1_id LIMIT 1;
                IF v_seller2_id IS NULL THEN
                    INSERT INTO public.sellers (organization_id, name, slug) 
                    VALUES (v_org_id, 'Vendedor 2', 'seller-2') RETURNING id INTO v_seller2_id;
                END IF;

                -- Insert test campaign if none exists
                IF NOT EXISTS (SELECT 1 FROM public.group_buying_campaigns WHERE organization_id = v_org_id) THEN
                    INSERT INTO public.group_buying_campaigns (
                        organization_id, sku_id, supplier_id, name, target_quantity, unit_cost, deadline
                    ) VALUES (
                        v_org_id, v_sku_id, v_supplier_id, 'Compra Coletiva: Lote Verão', 100, 50.00, NOW() + INTERVAL '7 days'
                    ) RETURNING id INTO v_campaign_id;

                    -- Insert test reservations to reach goal (50 + 60 = 110 >= 100)
                    INSERT INTO public.group_buying_reservations (campaign_id, seller_id, quantity)
                    VALUES 
                        (v_campaign_id, v_seller1_id, 50),
                        (v_campaign_id, v_seller2_id, 60)
                    ON CONFLICT DO NOTHING;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;
