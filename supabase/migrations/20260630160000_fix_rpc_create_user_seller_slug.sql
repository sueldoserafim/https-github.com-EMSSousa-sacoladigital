-- Migration to refactor rpc_create_user and explicitly decouple seller slug from organizations
-- Ensures no metadata maps accidentally to the organizations table, preventing constraint errors.

CREATE OR REPLACE FUNCTION public.rpc_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_organization_id uuid,
  p_phone text DEFAULT NULL,
  p_entity_data jsonb DEFAULT NULL
) RETURNS jsonb AS $func$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- 1. Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Este email já está registrado. Por favor, use um email diferente.';
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  -- 2. Insert into auth.users atomically
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
    p_email,
    v_encrypted_password,
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('name', p_full_name),
    false, 'authenticated', 'authenticated',
    '', '', '', '', '',
    p_phone, '', '', ''
  );

  -- 3. Handle profile creation explicitly referencing the foreign key
  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (v_user_id, p_email, p_full_name, p_role, p_organization_id)
  ON CONFLICT (id) DO UPDATE SET 
    role = EXCLUDED.role, 
    organization_id = EXCLUDED.organization_id,
    full_name = EXCLUDED.full_name;

  -- 4. Handle entity data creation ONLY for the appropriate entity
  -- This strictly ensures NO insertions/updates are executed against organizations
  IF p_entity_data IS NOT NULL THEN
    IF p_role = 'seller' THEN
      INSERT INTO public.sellers (user_id, organization_id, name, slug, commission_rate)
      VALUES (
        v_user_id, 
        p_organization_id, 
        p_full_name, 
        (p_entity_data->>'slug')::text, 
        COALESCE((p_entity_data->>'commission_rate')::numeric, 0)
      );
    ELSIF p_role = 'driver' THEN
      INSERT INTO public.drivers (user_id, organization_id, name, phone, vehicle_info)
      VALUES (
        v_user_id, 
        p_organization_id, 
        p_full_name, 
        (p_entity_data->>'phone')::text, 
        (p_entity_data->>'vehicle_info')::text
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('id', v_user_id, 'email', p_email);
EXCEPTION
  WHEN unique_violation THEN
    -- Distinguish between seller slugs and other unique constraints
    IF SQLERRM LIKE '%sellers_organization_id_slug_key%' OR SQLERRM LIKE '%sellers_slug_key%' THEN
      RAISE EXCEPTION 'O identificador (slug) já está em uso por outra vendedora. Escolha um diferente.';
    ELSIF SQLERRM LIKE '%organizations_slug_key%' THEN
      RAISE EXCEPTION 'O identificador (slug) da organização já está em uso.';
    ELSE
      RAISE EXCEPTION 'Já existe um registro com estes dados (conflito de unicidade).';
    END IF;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply grants
REVOKE ALL ON FUNCTION public.rpc_create_user(text, text, text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_create_user(text, text, text, text, uuid, text, jsonb) TO service_role;

-- Ensure the seed sueldo@suportesigma.com user is safely present as per requirements
DO $seed$
DECLARE
  v_sueldo_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sueldo@suportesigma.com') THEN
    v_sueldo_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_sueldo_id, '00000000-0000-0000-0000-000000000000', 'sueldo@suportesigma.com',
      crypt('Skip@Pass123', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "Sueldo"}'::jsonb,
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_sueldo_id, 'sueldo@suportesigma.com', 'Sueldo', 'super_admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $seed$;
