DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Ensure Sueldo is a super_admin
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'sueldo@suportesigma.com';
  
  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users SET is_super_admin = true WHERE id = v_user_id;
    
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_user_id, 'Sueldo (Master)', 'super_admin')
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
  END IF;

  -- Add super_admin RLS for sellers
  DROP POLICY IF EXISTS "super_admin_all_sellers" ON public.sellers;
  CREATE POLICY "super_admin_all_sellers" ON public.sellers
    FOR ALL TO authenticated USING (public.is_super_admin());

END $$;
