DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Check if organization exists
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug) VALUES ('Sigma', 'sigma') RETURNING id INTO v_org_id;
  END IF;

  -- Create User
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sueldo@suportesigma.com') THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'sueldo@suportesigma.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Sueldo Sigma"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, organization_id, full_name, role)
    VALUES (v_user_id, v_org_id, 'Sueldo Sigma', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Ensure RLS on group_buying_campaigns
ALTER TABLE public.group_buying_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_buying_reservations ENABLE ROW LEVEL SECURITY;

-- Admins/Managers manage campaigns, Sellers view them.
DROP POLICY IF EXISTS "Users can view org group_buying_campaigns" ON public.group_buying_campaigns;
CREATE POLICY "Users can view org group_buying_campaigns" ON public.group_buying_campaigns
    FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can insert org group_buying_campaigns" ON public.group_buying_campaigns;
CREATE POLICY "Admins can insert org group_buying_campaigns" ON public.group_buying_campaigns
    FOR INSERT TO authenticated WITH CHECK (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

DROP POLICY IF EXISTS "Admins can update org group_buying_campaigns" ON public.group_buying_campaigns;
CREATE POLICY "Admins can update org group_buying_campaigns" ON public.group_buying_campaigns
    FOR UPDATE TO authenticated USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

DROP POLICY IF EXISTS "Admins can delete org group_buying_campaigns" ON public.group_buying_campaigns;
CREATE POLICY "Admins can delete org group_buying_campaigns" ON public.group_buying_campaigns
    FOR DELETE TO authenticated USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- Sellers create their own reservations
DROP POLICY IF EXISTS "Users can view org group_buying_reservations" ON public.group_buying_reservations;
CREATE POLICY "Users can view org group_buying_reservations" ON public.group_buying_reservations
    FOR SELECT TO authenticated USING (campaign_id IN (SELECT id FROM public.group_buying_campaigns WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Sellers can insert own group_buying_reservations" ON public.group_buying_reservations;
CREATE POLICY "Sellers can insert own group_buying_reservations" ON public.group_buying_reservations
    FOR INSERT TO authenticated WITH CHECK (
        seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

DROP POLICY IF EXISTS "Sellers can update own group_buying_reservations" ON public.group_buying_reservations;
CREATE POLICY "Sellers can update own group_buying_reservations" ON public.group_buying_reservations
    FOR UPDATE TO authenticated USING (
        seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

DROP POLICY IF EXISTS "Sellers can delete own group_buying_reservations" ON public.group_buying_reservations;
CREATE POLICY "Sellers can delete own group_buying_reservations" ON public.group_buying_reservations
    FOR DELETE TO authenticated USING (
        seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );
