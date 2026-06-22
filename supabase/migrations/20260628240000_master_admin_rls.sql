DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert seed user (idempotent)
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'sueldo@suportesigma.com';
  
  IF new_user_id IS NULL THEN
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
      crypt('Skip@Pass123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Master Admin"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new_user_id, 'Sueldo (Master)', 'super_admin')
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
END $$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Allow super_admin to perform all operations on required tables
DROP POLICY IF EXISTS "super_admin_all_organizations" ON public.organizations;
CREATE POLICY "super_admin_all_organizations" ON public.organizations
  FOR ALL TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_all_profiles" ON public.profiles;
CREATE POLICY "super_admin_all_profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_all_orders" ON public.orders;
CREATE POLICY "super_admin_all_orders" ON public.orders
  FOR ALL TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_all_financial_transactions" ON public.financial_transactions;
CREATE POLICY "super_admin_all_financial_transactions" ON public.financial_transactions
  FOR ALL TO authenticated USING (public.is_super_admin());
