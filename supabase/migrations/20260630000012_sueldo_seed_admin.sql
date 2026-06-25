DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'sueldo@suportesigma.com' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
    
    IF v_org_id IS NOT NULL THEN
      UPDATE public.profiles 
      SET role = 'admin', organization_id = v_org_id 
      WHERE id = v_user_id;
    END IF;
  END IF;
END $$;
