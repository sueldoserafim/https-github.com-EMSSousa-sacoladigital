-- Policies for consignment_orders
DROP POLICY IF EXISTS "Users can view org consignment_orders" ON public.consignment_orders;
CREATE POLICY "Users can view org consignment_orders" ON public.consignment_orders
  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can insert org consignment_orders" ON public.consignment_orders;
CREATE POLICY "Users can insert org consignment_orders" ON public.consignment_orders
  FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can update org consignment_orders" ON public.consignment_orders;
CREATE POLICY "Users can update org consignment_orders" ON public.consignment_orders
  FOR UPDATE TO authenticated USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can delete org consignment_orders" ON public.consignment_orders;
CREATE POLICY "Users can delete org consignment_orders" ON public.consignment_orders
  FOR DELETE TO authenticated USING (organization_id = get_my_org_id());

-- Policies for consignment_items
DROP POLICY IF EXISTS "Users can view org consignment_items" ON public.consignment_items;
CREATE POLICY "Users can view org consignment_items" ON public.consignment_items
  FOR SELECT TO authenticated USING (consignment_id IN (SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id()));

DROP POLICY IF EXISTS "Users can insert org consignment_items" ON public.consignment_items;
CREATE POLICY "Users can insert org consignment_items" ON public.consignment_items
  FOR INSERT TO authenticated WITH CHECK (consignment_id IN (SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id()));

DROP POLICY IF EXISTS "Users can update org consignment_items" ON public.consignment_items;
CREATE POLICY "Users can update org consignment_items" ON public.consignment_items
  FOR UPDATE TO authenticated USING (consignment_id IN (SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id())) WITH CHECK (consignment_id IN (SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id()));

DROP POLICY IF EXISTS "Users can delete org consignment_items" ON public.consignment_items;
CREATE POLICY "Users can delete org consignment_items" ON public.consignment_items
  FOR DELETE TO authenticated USING (consignment_id IN (SELECT id FROM public.consignment_orders WHERE organization_id = get_my_org_id()));

-- Triggers for stock movement
CREATE OR REPLACE FUNCTION public.handle_consignment_item_change()
RETURNS trigger AS $$
DECLARE
  v_status text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT status INTO v_status FROM public.consignment_orders WHERE id = NEW.consignment_id;
    IF v_status != 'returned' THEN
      UPDATE public.product_skus
      SET stock = stock - NEW.quantity,
          consigned_stock = COALESCE(consigned_stock, 0) + NEW.quantity
      WHERE id = NEW.sku_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT status INTO v_status FROM public.consignment_orders WHERE id = OLD.consignment_id;
    IF v_status != 'returned' THEN
      UPDATE public.product_skus
      SET stock = stock + OLD.quantity,
          consigned_stock = COALESCE(consigned_stock, 0) - OLD.quantity
      WHERE id = OLD.sku_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT status INTO v_status FROM public.consignment_orders WHERE id = NEW.consignment_id;
    IF v_status != 'returned' THEN
      UPDATE public.product_skus
      SET stock = stock + OLD.quantity - NEW.quantity,
          consigned_stock = COALESCE(consigned_stock, 0) - OLD.quantity + NEW.quantity
      WHERE id = NEW.sku_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_consignment_item_change ON public.consignment_items;
CREATE TRIGGER on_consignment_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.consignment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_consignment_item_change();

CREATE OR REPLACE FUNCTION public.handle_consignment_status_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'returned' AND OLD.status != 'returned' THEN
    UPDATE public.product_skus ps
    SET stock = stock + ci.quantity,
        consigned_stock = COALESCE(consigned_stock, 0) - ci.quantity
    FROM public.consignment_items ci
    WHERE ci.consignment_id = NEW.id AND ps.id = ci.sku_id;
  ELSIF NEW.status != 'returned' AND OLD.status = 'returned' THEN
    UPDATE public.product_skus ps
    SET stock = stock - ci.quantity,
        consigned_stock = COALESCE(consigned_stock, 0) + ci.quantity
    FROM public.consignment_items ci
    WHERE ci.consignment_id = NEW.id AND ps.id = ci.sku_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_consignment_status_change ON public.consignment_orders;
CREATE TRIGGER on_consignment_status_change
  AFTER UPDATE OF status ON public.consignment_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_consignment_status_change();

-- Seed test user
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
      '{"name": "Sueldo"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;
END $$;
