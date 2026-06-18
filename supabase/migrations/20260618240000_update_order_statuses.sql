-- Update existing 'Pendente' statuses to 'Novo' to match new workflow
DO $BODY$
BEGIN
    UPDATE public.orders SET status = 'Novo' WHERE status = 'Pendente';
END $BODY$;

-- Ensure default status for new orders is 'Novo'
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'Novo';

-- Replace the create_checkout_order RPC to initialize orders as 'Novo' instead of 'Pendente'
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

    -- Create order with initial status 'Novo'
    INSERT INTO public.orders (organization_id, customer_id, order_number, total, status)
    VALUES (v_org_id, v_customer_id, v_order_number, v_total, 'Novo')
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

-- Ensure RLS allows organization users to insert/update their orders
DROP POLICY IF EXISTS "Users can insert org orders" ON public.orders;
CREATE POLICY "Users can insert org orders" ON public.orders
    FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "Users can update org orders" ON public.orders;
CREATE POLICY "Users can update org orders" ON public.orders
    FOR UPDATE TO authenticated USING (organization_id = public.get_my_org_id()) WITH CHECK (organization_id = public.get_my_org_id());
