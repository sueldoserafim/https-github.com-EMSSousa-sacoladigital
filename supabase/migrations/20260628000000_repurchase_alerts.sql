DO $do$
BEGIN
  ALTER TABLE public.intelligent_alerts DROP CONSTRAINT IF EXISTS intelligent_alerts_type_check;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $do$;

ALTER TABLE public.intelligent_alerts ADD CONSTRAINT intelligent_alerts_type_check CHECK (type IN ('stagnant', 'rupture', 'repurchase'));

GRANT EXECUTE ON FUNCTION public.add_to_wishlist(UUID, UUID, TEXT, TEXT) TO anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.refresh_intelligent_alerts(p_org_id uuid)
RETURNS void AS $func$
DECLARE
  v_inactive_count INT;
BEGIN
  -- 1. Rupture alerts
  INSERT INTO public.intelligent_alerts (organization_id, product_id, type, severity, message, is_resolved, created_at)
  SELECT 
    ps.organization_id,
    ps.product_id,
    'rupture',
    CASE WHEN ps.stock <= 0 THEN 'critical' ELSE 'warning' END,
    'O produto ' || p.name || ' (SKU: ' || ps.sku_code || ') está com estoque baixo ou esgotado (' || ps.stock || ' un).',
    false,
    now()
  FROM public.product_skus ps
  JOIN public.products p ON p.id = ps.product_id
  WHERE ps.organization_id = p_org_id 
    AND ps.stock <= ps.min_stock_level
  ON CONFLICT (organization_id, product_id, type) 
  DO UPDATE SET is_resolved = false, severity = EXCLUDED.severity, message = EXCLUDED.message, created_at = now();

  UPDATE public.intelligent_alerts ia
  SET is_resolved = true
  WHERE ia.organization_id = p_org_id AND ia.type = 'rupture' AND ia.is_resolved = false
  AND NOT EXISTS (
    SELECT 1 FROM public.product_skus ps 
    WHERE ps.product_id = ia.product_id AND ps.stock <= ps.min_stock_level
  );

  -- 2. Stagnant products alerts
  INSERT INTO public.intelligent_alerts (organization_id, product_id, type, severity, message, is_resolved, created_at)
  SELECT 
    p.organization_id,
    p.id,
    'stagnant',
    'info',
    'O produto ' || p.name || ' não teve vendas nos últimos 30 dias, mas possui estoque.',
    false,
    now()
  FROM public.products p
  WHERE p.organization_id = p_org_id
    AND p.stock > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = p.id AND o.created_at >= (now() - interval '30 days')
        AND o.status NOT IN ('Cancelado', 'Cancelled')
    )
  ON CONFLICT (organization_id, product_id, type) 
  DO UPDATE SET is_resolved = false, created_at = now();

  UPDATE public.intelligent_alerts ia
  SET is_resolved = true
  WHERE ia.organization_id = p_org_id AND ia.type = 'stagnant' AND ia.is_resolved = false
  AND (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = ia.product_id AND o.created_at >= (now() - interval '30 days')
        AND o.status NOT IN ('Cancelado', 'Cancelled')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = ia.product_id AND p.stock <= 0
    )
  );

  -- 3. Repurchase Alerts (customers inactive > 30 days)
  SELECT COUNT(*) INTO v_inactive_count
  FROM (
    SELECT c.id
    FROM public.customers c
    JOIN public.orders o ON o.customer_id = c.id
    WHERE c.organization_id = p_org_id
    GROUP BY c.id
    HAVING max(o.created_at) < (now() - interval '30 days')
  ) sub;

  IF v_inactive_count > 0 THEN
    IF EXISTS (SELECT 1 FROM public.intelligent_alerts WHERE organization_id = p_org_id AND type = 'repurchase' AND product_id IS NULL) THEN
      UPDATE public.intelligent_alerts
      SET is_resolved = false, message = v_inactive_count || ' cliente(s) estão inativos há mais de 30 dias sem novas compras.', created_at = now()
      WHERE organization_id = p_org_id AND type = 'repurchase' AND product_id IS NULL;
    ELSE
      INSERT INTO public.intelligent_alerts (organization_id, product_id, type, severity, message, is_resolved, created_at)
      VALUES (
        p_org_id,
        NULL,
        'repurchase',
        'warning',
        v_inactive_count || ' cliente(s) estão inativos há mais de 30 dias sem novas compras.',
        false,
        now()
      );
    END IF;
  ELSE
    UPDATE public.intelligent_alerts
    SET is_resolved = true
    WHERE organization_id = p_org_id AND type = 'repurchase' AND product_id IS NULL AND is_resolved = false;
  END IF;

END;
$func$ LANGUAGE plpgsql;
