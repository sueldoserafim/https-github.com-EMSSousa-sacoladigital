DO $$
BEGIN
  ALTER TABLE public.group_buying_campaigns DROP CONSTRAINT IF EXISTS group_buying_campaigns_status_check;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

ALTER TABLE public.group_buying_campaigns
  ADD CONSTRAINT group_buying_campaigns_status_check 
  CHECK (status IN ('active', 'successful', 'failed', 'completed', 'cancelled'));

-- Trigger to prevent reservations past deadline
CREATE OR REPLACE FUNCTION public.check_campaign_deadline()
RETURNS trigger AS $$
DECLARE
    v_deadline TIMESTAMPTZ;
BEGIN
    SELECT deadline INTO v_deadline
    FROM public.group_buying_campaigns
    WHERE id = NEW.campaign_id;

    IF v_deadline < NOW() THEN
        RAISE EXCEPTION 'Cannot reserve for a campaign that has passed its deadline.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_campaign_deadline_trigger ON public.group_buying_reservations;
CREATE TRIGGER check_campaign_deadline_trigger
BEFORE INSERT OR UPDATE ON public.group_buying_reservations
FOR EACH ROW EXECUTE FUNCTION public.check_campaign_deadline();

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
        SET status = 'completed'
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
        SET status = 'cancelled'
        WHERE id = p_campaign_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
