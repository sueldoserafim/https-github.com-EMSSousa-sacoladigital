-- Add sku_id to order_items to track which SKU was sold
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sku_id uuid REFERENCES public.product_skus(id);

-- Drop public read policies if they exist for idempotency
DROP POLICY IF EXISTS "Public can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Public can view product_skus" ON public.product_skus;
DROP POLICY IF EXISTS "Public can view attributes" ON public.attributes;
DROP POLICY IF EXISTS "Public can view attribute_options" ON public.attribute_options;
DROP POLICY IF EXISTS "Public can view sku_attribute_values" ON public.sku_attribute_values;

-- Create public read policies for the storefront
CREATE POLICY "Public can view organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public can view product_skus" ON public.product_skus FOR SELECT USING (true);
CREATE POLICY "Public can view attributes" ON public.attributes FOR SELECT USING (true);
CREATE POLICY "Public can view attribute_options" ON public.attribute_options FOR SELECT USING (true);
CREATE POLICY "Public can view sku_attribute_values" ON public.sku_attribute_values FOR SELECT USING (true);

-- RPC to securely create a checkout order from the public storefront
CREATE OR REPLACE FUNCTION public.create_checkout_order(
    p_org_slug text,
    p_customer_name text,
    p_customer_email text,
    p_items jsonb
) RETURNS uuid AS $BODY$
DECLARE
    v_org_id uuid;
    v_customer_id uuid;
    v_order_id uuid;
    v_order_number text;
    v_total numeric := 0;
    v_item jsonb;
BEGIN
    -- Find organization by slug
    SELECT id INTO v_org_id FROM public.organizations WHERE slug = p_org_slug;
    IF v_org_id IS NULL THEN 
        RAISE EXCEPTION 'Organização não encontrada'; 
    END IF;

    -- Find or create customer
    SELECT id INTO v_customer_id FROM public.customers WHERE email = p_customer_email AND organization_id = v_org_id LIMIT 1;
    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (organization_id, name, email) 
        VALUES (v_org_id, p_customer_name, p_customer_email) 
        RETURNING id INTO v_customer_id;
    ELSE
        UPDATE public.customers SET name = p_customer_name WHERE id = v_customer_id;
    END IF;

    -- Calculate total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_total := v_total + ((v_item->>'price')::numeric * (v_item->>'quantity')::integer);
    END LOOP;

    -- Generate order number
    v_order_number := 'PED-' || upper(substr(md5(random()::text), 1, 6));

    -- Create order with initial status 'Pendente'
    INSERT INTO public.orders (organization_id, customer_id, order_number, total, status)
    VALUES (v_org_id, v_customer_id, v_order_number, v_total, 'Pendente')
    RETURNING id INTO v_order_id;

    -- Create order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.order_items (order_id, product_id, sku_id, quantity, price)
        VALUES (
            v_order_id,
            (SELECT product_id FROM public.product_skus WHERE id = (v_item->>'sku_id')::uuid),
            (v_item->>'sku_id')::uuid,
            (v_item->>'quantity')::integer,
            (v_item->>'price')::numeric
        );
    END LOOP;

    RETURN v_order_id;
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to confirm an order securely
CREATE OR REPLACE FUNCTION public.confirm_order(p_order_id uuid) RETURNS void AS $BODY$
DECLARE
    v_order public.orders%ROWTYPE;
    v_item public.order_items%ROWTYPE;
BEGIN
    -- Get order details
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    
    IF v_order.id IS NULL THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;

    IF v_order.status = 'Confirmado' THEN
        RAISE EXCEPTION 'Pedido já está confirmado.';
    END IF;

    -- Update stock for each item
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
        IF v_item.sku_id IS NULL THEN
            RAISE EXCEPTION 'Item do pedido não possui SKU associado.';
        END IF;

        -- Adjust stock. This function checks if the SKU belongs to the caller's org
        -- and uses auth.uid() for the stock movement log.
        PERFORM public.adjust_sku_stock(
            v_item.sku_id,
            -(v_item.quantity),
            'SAIDA',
            'Saída referente ao pedido ' || v_order.order_number
        );
    END LOOP;

    -- Update order status
    UPDATE public.orders SET status = 'Confirmado' WHERE id = p_order_id;
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;
