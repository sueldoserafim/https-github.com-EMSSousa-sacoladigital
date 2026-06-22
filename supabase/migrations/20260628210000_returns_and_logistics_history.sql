DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS public.returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        sku_id UUID NOT NULL REFERENCES public.product_skus(id) ON DELETE CASCADE,
        quantity INT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('return', 'exchange')),
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.order_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        old_status TEXT,
        new_status TEXT NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
END $$;

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "returns_select" ON public.returns;
CREATE POLICY "returns_select" ON public.returns FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "returns_insert" ON public.returns;
CREATE POLICY "returns_insert" ON public.returns FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "returns_update" ON public.returns;
CREATE POLICY "returns_update" ON public.returns FOR UPDATE TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "returns_delete" ON public.returns;
CREATE POLICY "returns_delete" ON public.returns FOR DELETE TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "order_status_history_select" ON public.order_status_history;
CREATE POLICY "order_status_history_select" ON public.order_status_history FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "order_status_history_insert" ON public.order_status_history;
CREATE POLICY "order_status_history_insert" ON public.order_status_history FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.order_status_history (organization_id, order_id, old_status, new_status)
        VALUES (NEW.organization_id, NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_order_status_change ON public.orders;
CREATE TRIGGER trg_log_order_status_change
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();

CREATE OR REPLACE FUNCTION public.handle_return_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_order_item RECORD;
    v_amount NUMERIC;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Find the price for the sku in the order
        SELECT price INTO v_order_item
        FROM public.order_items
        WHERE order_id = NEW.order_id AND sku_id = NEW.sku_id
        LIMIT 1;

        IF FOUND THEN
            v_amount := v_order_item.price * NEW.quantity;

            INSERT INTO public.financial_transactions (
                organization_id,
                order_id,
                type,
                amount,
                description
            ) VALUES (
                NEW.organization_id,
                NEW.order_id,
                'REVERSAL',
                v_amount,
                'Estorno por ' || NEW.type || ' (Qtd: ' || NEW.quantity || ')'
            );
            
            -- Adjust stock back
            PERFORM public.adjust_sku_stock(
                NEW.sku_id,
                NEW.quantity,
                'RETURN',
                'Devolução/Troca do Pedido'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_return_completion ON public.returns;
CREATE TRIGGER trg_handle_return_completion
AFTER UPDATE OF status ON public.returns
FOR EACH ROW
EXECUTE FUNCTION public.handle_return_completion();
