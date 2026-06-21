CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  path text NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_site_visits" ON public.site_visits;
CREATE POLICY "anon_insert_site_visits" ON public.site_visits FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_site_visits" ON public.site_visits;
CREATE POLICY "auth_select_site_visits" ON public.site_visits FOR SELECT TO authenticated USING (true);


CREATE TABLE IF NOT EXISTS public.intelligent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('stagnant', 'rupture')),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, product_id, type)
);

ALTER TABLE public.intelligent_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_intelligent_alerts" ON public.intelligent_alerts;
CREATE POLICY "auth_all_intelligent_alerts" ON public.intelligent_alerts FOR ALL TO authenticated USING (true);

-- Function to refresh intelligent alerts dynamically based on actual conditions
CREATE OR REPLACE FUNCTION public.refresh_intelligent_alerts(p_org_id uuid)
RETURNS void AS $$
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

  -- Resolve rupture alerts if stock is healthy
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

  -- Resolve stagnant products alerts if they have sold or have no stock
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
END;
$$ LANGUAGE plpgsql;

-- Seed user if not exists
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sueldo@suportesigma.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'sueldo@suportesigma.com',
      crypt('Skip@Pass', gen_salt('bf')),
      now(), now(), now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Sueldo"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new_user_id, 'Sueldo', 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
