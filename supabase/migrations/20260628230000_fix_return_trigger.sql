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
            IF NEW.type = 'return' THEN
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
                    'Refund',
                    -v_amount,
                    'Estorno por ' || NEW.type || ' (Qtd: ' || NEW.quantity || ')'
                );
            END IF;
            
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
