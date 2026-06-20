-- Allow 'INCOME' in financial transactions types
ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_type_check;

-- Update existing REVENUE to INCOME to align with the new standard
UPDATE public.financial_transactions SET type = 'INCOME' WHERE type = 'REVENUE';

-- Re-add the constraint with INCOME included
ALTER TABLE public.financial_transactions ADD CONSTRAINT financial_transactions_type_check CHECK (type IN ('INCOME', 'EXPENSE', 'REVERSAL'));

-- Update handle_order_status_finance trigger to log INCOME
CREATE OR REPLACE FUNCTION public.handle_order_status_finance()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to Confirmado or Pago from something else
  IF (NEW.status = 'Confirmado' OR NEW.status = 'Pago') AND (OLD.status != 'Confirmado' AND OLD.status != 'Pago') THEN
    INSERT INTO public.financial_transactions (organization_id, order_id, type, amount, description)
    VALUES (NEW.organization_id, NEW.id, 'INCOME', NEW.total, 'Venda - Pedido #' || NEW.order_number);
  END IF;

  -- When status changes to Cancelado from something else
  IF NEW.status = 'Cancelado' AND OLD.status != 'Cancelado' THEN
    -- Only if there's a INCOME for this order
    IF EXISTS (SELECT 1 FROM public.financial_transactions WHERE order_id = NEW.id AND type = 'INCOME') THEN
      INSERT INTO public.financial_transactions (organization_id, order_id, type, amount, description)
      VALUES (NEW.organization_id, NEW.id, 'REVERSAL', NEW.total, 'Estorno - Pedido #' || NEW.order_number);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update receive_purchase_order to log EXPENSE
CREATE OR REPLACE FUNCTION public.receive_purchase_order(p_po_id UUID)
RETURNS void AS $BODY$
DECLARE
    v_org_id UUID;
    v_status TEXT;
    v_item RECORD;
    v_product_id UUID;
    v_total_amount NUMERIC;
    v_supplier_id UUID;
    v_supplier_name TEXT;
BEGIN
    -- Check permissions and get current status
    SELECT po.organization_id, po.status, po.total_amount, po.supplier_id, s.name
    INTO v_org_id, v_status, v_total_amount, v_supplier_id, v_supplier_name
    FROM public.purchase_orders po
    LEFT JOIN public.suppliers s ON po.supplier_id = s.id
    WHERE po.id = p_po_id;

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

    -- Automatically log expense
    INSERT INTO public.financial_transactions (
        organization_id,
        type,
        amount,
        description
    ) VALUES (
        v_org_id,
        'EXPENSE',
        v_total_amount,
        'Compra - Pedido de Compra' || COALESCE(' (' || v_supplier_name || ')', '')
    );
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;
