-- Ensure sueldo@suportesigma.com admin user exists with idempotent check
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
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Administrador do Sistema"}',
      true, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL,
      '', '', ''
    );

    -- Ensure profile exists and is super_admin
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new_user_id, 'Administrador do Sistema', 'super_admin')
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
  END IF;
END $$;

-- Ensure robust RLS on drivers
DROP POLICY IF EXISTS "drivers_tenant_isolation_select" ON public.drivers;
CREATE POLICY "drivers_tenant_isolation_select" ON public.drivers
  FOR SELECT TO authenticated USING (
    organization_id = public.get_user_org_id() OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "drivers_tenant_isolation_insert" ON public.drivers;
CREATE POLICY "drivers_tenant_isolation_insert" ON public.drivers
  FOR INSERT TO authenticated WITH CHECK (
    organization_id = public.get_user_org_id()
  );

DROP POLICY IF EXISTS "drivers_tenant_isolation_update" ON public.drivers;
CREATE POLICY "drivers_tenant_isolation_update" ON public.drivers
  FOR UPDATE TO authenticated USING (
    organization_id = public.get_user_org_id()
  ) WITH CHECK (
    organization_id = public.get_user_org_id()
  );

DROP POLICY IF EXISTS "drivers_tenant_isolation_delete" ON public.drivers;
CREATE POLICY "drivers_tenant_isolation_delete" ON public.drivers
  FOR DELETE TO authenticated USING (
    organization_id = public.get_user_org_id()
  );
