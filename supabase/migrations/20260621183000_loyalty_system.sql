-- Create Loyalty Configs
CREATE TABLE IF NOT EXISTS public.loyalty_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    points_per_currency numeric NOT NULL DEFAULT 1,
    discount_value_per_point numeric NOT NULL DEFAULT 0.01,
    max_discount_percentage numeric NOT NULL DEFAULT 50,
    expiration_days integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(organization_id)
);

-- Create Loyalty Wallets
CREATE TABLE IF NOT EXISTS public.loyalty_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    balance numeric NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(customer_id, organization_id)
);

-- Create Loyalty Point Movements
CREATE TABLE IF NOT EXISTS public.loyalty_point_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id uuid REFERENCES public.loyalty_wallets(id) ON DELETE CASCADE NOT NULL,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    amount numeric NOT NULL,
    type text NOT NULL CHECK (type IN ('earn', 'spend')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Enable
ALTER TABLE public.loyalty_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_point_movements ENABLE ROW LEVEL SECURITY;

-- Policies for loyalty_configs
DROP POLICY IF EXISTS "loyalty_configs_select" ON public.loyalty_configs;
CREATE POLICY "loyalty_configs_select" ON public.loyalty_configs
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "loyalty_configs_insert" ON public.loyalty_configs;
CREATE POLICY "loyalty_configs_insert" ON public.loyalty_configs
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "loyalty_configs_update" ON public.loyalty_configs;
CREATE POLICY "loyalty_configs_update" ON public.loyalty_configs
    FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for loyalty_wallets
DROP POLICY IF EXISTS "loyalty_wallets_select" ON public.loyalty_wallets;
CREATE POLICY "loyalty_wallets_select" ON public.loyalty_wallets
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "loyalty_wallets_insert" ON public.loyalty_wallets;
CREATE POLICY "loyalty_wallets_insert" ON public.loyalty_wallets
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "loyalty_wallets_update" ON public.loyalty_wallets;
CREATE POLICY "loyalty_wallets_update" ON public.loyalty_wallets
    FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for loyalty_point_movements
DROP POLICY IF EXISTS "loyalty_point_movements_select" ON public.loyalty_point_movements;
CREATE POLICY "loyalty_point_movements_select" ON public.loyalty_point_movements
    FOR SELECT TO authenticated
    USING (wallet_id IN (SELECT id FROM public.loyalty_wallets WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "loyalty_point_movements_insert" ON public.loyalty_point_movements;
CREATE POLICY "loyalty_point_movements_insert" ON public.loyalty_point_movements
    FOR INSERT TO authenticated
    WITH CHECK (wallet_id IN (SELECT id FROM public.loyalty_wallets WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Immutability trigger function
CREATE OR REPLACE FUNCTION public.prevent_point_movement_update()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Point movements cannot be altered or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_point_movement_update_trg ON public.loyalty_point_movements;
CREATE TRIGGER prevent_point_movement_update_trg
    BEFORE UPDATE OR DELETE ON public.loyalty_point_movements
    FOR EACH ROW EXECUTE FUNCTION public.prevent_point_movement_update();

-- Accrual trigger function
CREATE OR REPLACE FUNCTION public.handle_order_points_accrual()
RETURNS trigger AS $$
DECLARE
    v_config public.loyalty_configs;
    v_wallet_id uuid;
    v_points numeric;
BEGIN
    IF NEW.status IN ('Confirmado', 'Pago', 'Concluído') AND OLD.status NOT IN ('Confirmado', 'Pago', 'Concluído') THEN
        SELECT * INTO v_config FROM public.loyalty_configs WHERE organization_id = NEW.organization_id;
        
        IF FOUND THEN
            v_points := NEW.total * v_config.points_per_currency;
            
            IF v_points > 0 THEN
                INSERT INTO public.loyalty_wallets (customer_id, organization_id, balance)
                VALUES (NEW.customer_id, NEW.organization_id, 0)
                ON CONFLICT (customer_id, organization_id) DO UPDATE SET balance = public.loyalty_wallets.balance
                RETURNING id INTO v_wallet_id;
                
                INSERT INTO public.loyalty_point_movements (wallet_id, order_id, amount, type)
                VALUES (v_wallet_id, NEW.id, v_points, 'earn');
                
                UPDATE public.loyalty_wallets SET balance = balance + v_points WHERE id = v_wallet_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_points ON public.orders;
CREATE TRIGGER on_order_status_points
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_points_accrual();
