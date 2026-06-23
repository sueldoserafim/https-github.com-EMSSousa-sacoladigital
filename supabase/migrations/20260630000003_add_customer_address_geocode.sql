DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'lat'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN lat numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'lng'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN lng numeric;
  END IF;
END $$;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT oid::regprocedure AS func_signature
        FROM pg_proc
        WHERE proname = 'create_checkout_order'
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_org_slug text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_seller_slug text DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_delivery_lat numeric DEFAULT NULL,
  p_delivery_lng numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_customer_id uuid;
  v_seller_id uuid;
  v_order_id uuid;
  v_item jsonb;
  v_total numeric := 0;
  v_sku_id uuid;
  v_quantity int;
  v_price numeric;
BEGIN
  -- Get org ID
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = p_org_slug;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Get seller ID if provided
  IF p_seller_slug IS NOT NULL THEN
    SELECT id INTO v_seller_id FROM public.sellers WHERE slug = p_seller_slug AND organization_id = v_org_id;
  END IF;

  -- Find or create customer
  SELECT id INTO v_customer_id FROM public.customers WHERE email = p_customer_email AND organization_id = v_org_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (organization_id, name, email, phone, address, lat, lng)
    VALUES (v_org_id, p_customer_name, p_customer_email, p_customer_phone, p_delivery_address, p_delivery_lat, p_delivery_lng)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET address = COALESCE(p_delivery_address, address),
        lat = COALESCE(p_delivery_lat, lat),
        lng = COALESCE(p_delivery_lng, lng),
        phone = COALESCE(p_customer_phone, phone),
        name = p_customer_name
    WHERE id = v_customer_id;
  END IF;

  -- Calculate total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_total := v_total + ((v_item->>'price')::numeric * (v_item->>'quantity')::int);
  END LOOP;

  -- Create order
  INSERT INTO public.orders (
    organization_id, customer_id, seller_id, order_number, total, status, delivery_address, delivery_lat, delivery_lng
  )
  VALUES (
    v_org_id, v_customer_id, v_seller_id,
    'ORD-' || upper(substr(md5(random()::text), 1, 6)),
    v_total, 'Novo', p_delivery_address, p_delivery_lat, p_delivery_lng
  )
  RETURNING id INTO v_order_id;

  -- Create order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_sku_id := (v_item->>'sku_id')::uuid;
    v_quantity := (v_item->>'quantity')::int;
    v_price := (v_item->>'price')::numeric;

    INSERT INTO public.order_items (order_id, sku_id, product_id, quantity, price)
    SELECT v_order_id, v_sku_id, product_id, v_quantity, v_price
    FROM public.product_skus WHERE id = v_sku_id;
    
    -- Subtract stock
    UPDATE public.product_skus
    SET stock = stock - v_quantity
    WHERE id = v_sku_id;
  END LOOP;

  RETURN v_order_id;
END;
$$;
