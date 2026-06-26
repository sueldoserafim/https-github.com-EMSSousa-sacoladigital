DO $$
BEGIN
  -- Ensure proper RLS on sellers for admins to insert/update
  DROP POLICY IF EXISTS "sellers_admin_insert" ON public.sellers;
  CREATE POLICY "sellers_admin_insert" ON public.sellers
    FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

  DROP POLICY IF EXISTS "sellers_admin_update" ON public.sellers;
  CREATE POLICY "sellers_admin_update" ON public.sellers
    FOR UPDATE TO authenticated USING (organization_id = get_my_org_id());

  -- Profiles policies for admins to insert/update
  DROP POLICY IF EXISTS "profiles_admin_insert" ON public.profiles;
  CREATE POLICY "profiles_admin_insert" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

  DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
  CREATE POLICY "profiles_admin_update" ON public.profiles
    FOR UPDATE TO authenticated USING (organization_id = get_my_org_id());
END $$;
