DO $$
BEGIN
  -- 1. Remove mock/demo data inserted by previous migrations to leave the database clean for merchants
  DELETE FROM public.order_items 
  WHERE product_id IN (
    SELECT id FROM public.products 
    WHERE name ILIKE '%demo%' OR name ILIKE '%exemplo%' OR name ILIKE '%sample%' OR name ILIKE '%teste%' OR name ILIKE '%produto%'
  );

  DELETE FROM public.product_skus 
  WHERE product_id IN (
    SELECT id FROM public.products 
    WHERE name ILIKE '%demo%' OR name ILIKE '%exemplo%' OR name ILIKE '%sample%' OR name ILIKE '%teste%' OR name ILIKE '%produto%'
  );

  DELETE FROM public.products 
  WHERE name ILIKE '%demo%' OR name ILIKE '%exemplo%' OR name ILIKE '%sample%' OR name ILIKE '%teste%' OR name ILIKE '%produto%';

  DELETE FROM public.orders 
  WHERE order_number ILIKE '%DEMO%' OR order_number ILIKE '%TEST%';

  -- 2. Seed Master User sueldo@suportesigma.com idempotently without seeding any products
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sueldo@suportesigma.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'sueldo@suportesigma.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Sueldo"}',
      true, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;
END $$;

-- 3. Redefine handle_new_user to ensure it creates organizations completely blank without sample records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id uuid;
  user_name text;
BEGIN
  user_name := coalesce(NEW.raw_user_meta_data->>'name', 'Usuário');
  
  INSERT INTO public.organizations (name, slug)
  VALUES (user_name || ' Store', 'store-' || substr(md5(random()::text), 1, 8))
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, full_name, organization_id, role)
  VALUES (NEW.id, user_name, new_org_id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
