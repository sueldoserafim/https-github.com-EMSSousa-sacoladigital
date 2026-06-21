-- 1. Modify public.sellers
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Modify public.financial_transactions
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Update type constraint safely
ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_type_check;
ALTER TABLE public.financial_transactions ADD CONSTRAINT financial_transactions_type_check CHECK (type IN ('REVENUE', 'EXPENSE', 'REVERSAL', 'COMMISSION_PAYABLE', 'INCOME'));

-- 3. Replace Trigger Function
CREATE OR REPLACE FUNCTION public.handle_order_status_finance()
RETURNS TRIGGER AS $BODY$
DECLARE
  v_commission_rate NUMERIC := 0;
  v_seller_name TEXT;
  v_commission_amount NUMERIC := 0;
BEGIN
  -- When status changes to Confirmado from something else
  IF NEW.status = 'Confirmado' AND OLD.status != 'Confirmado' THEN
    INSERT INTO public.financial_transactions (organization_id, order_id, type, amount, description)
    VALUES (NEW.organization_id, NEW.id, 'REVENUE', NEW.total, 'Venda de Pedido #' || NEW.order_number);

    IF NEW.seller_id IS NOT NULL THEN
      SELECT commission_rate, name INTO v_commission_rate, v_seller_name
      FROM public.sellers
      WHERE id = NEW.seller_id;

      IF v_commission_rate > 0 THEN
        v_commission_amount := NEW.total * (v_commission_rate / 100);

        -- 1. Commission payable
        INSERT INTO public.financial_transactions (organization_id, order_id, seller_id, type, amount, description)
        VALUES (NEW.organization_id, NEW.id, NEW.seller_id, 'COMMISSION_PAYABLE', v_commission_amount, 'Comissão Pedido #' || NEW.order_number);

        -- 2. Expense
        INSERT INTO public.financial_transactions (organization_id, order_id, seller_id, type, amount, description)
        VALUES (NEW.organization_id, NEW.id, NEW.seller_id, 'EXPENSE', v_commission_amount, 'Despesa Operacional - Comissão ' || v_seller_name);
      END IF;
    END IF;
  END IF;

  -- When status changes to Cancelado from something else
  IF NEW.status = 'Cancelado' AND OLD.status != 'Cancelado' THEN
    IF EXISTS (SELECT 1 FROM public.financial_transactions WHERE order_id = NEW.id AND type = 'REVENUE') THEN
      INSERT INTO public.financial_transactions (organization_id, order_id, type, amount, description)
      VALUES (NEW.organization_id, NEW.id, 'REVERSAL', NEW.total, 'Estorno de Pedido #' || NEW.order_number);
    END IF;
  END IF;

  RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

-- 4. Update RLS on financial_transactions
DROP POLICY IF EXISTS "Users can view org transactions" ON public.financial_transactions;
CREATE POLICY "Users can view org transactions" ON public.financial_transactions
  FOR SELECT TO authenticated USING (
    organization_id = public.get_my_org_id() AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
      OR
      (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'seller' 
        AND seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
      )
      OR
      (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'seller')
    )
  );

-- 5. Seed Validation Scenario Data
DO $BODY$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'seller@example.com') THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'seller@example.com',
      crypt('Skip@Pass', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Vendedora Teste"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, organization_id, full_name, role)
    VALUES (v_user_id, v_org_id, 'Vendedora Teste', 'seller')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.sellers (organization_id, name, slug, commission_rate, user_id)
    VALUES (v_org_id, 'Vendedora Teste', 'vendedora-teste', 10, v_user_id)
    ON CONFLICT (organization_id, slug) DO UPDATE SET commission_rate = 10, user_id = v_user_id;
  END IF;
END $BODY$;
