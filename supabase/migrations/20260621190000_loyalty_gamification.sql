-- Create loyalty notifications table
CREATE TABLE IF NOT EXISTS public.loyalty_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL CHECK (type IN ('earned', 'expired', 'expiring_soon')),
    message text NOT NULL,
    read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for notifications
ALTER TABLE public.loyalty_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_notifications_select" ON public.loyalty_notifications;
CREATE POLICY "loyalty_notifications_select" ON public.loyalty_notifications
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Update loyalty_point_movements type check to include expiration
ALTER TABLE public.loyalty_point_movements DROP CONSTRAINT IF EXISTS loyalty_point_movements_type_check;
ALTER TABLE public.loyalty_point_movements ADD CONSTRAINT loyalty_point_movements_type_check CHECK (type IN ('earn', 'spend', 'expiration'));

-- Update accrual trigger to also insert an earned notification
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

                INSERT INTO public.loyalty_notifications (customer_id, organization_id, type, message)
                VALUES (NEW.customer_id, NEW.organization_id, 'earned', 'Você ganhou ' || v_points || ' pontos pela sua compra!');
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for automated point expiration
CREATE OR REPLACE FUNCTION public.expire_expired_points()
RETURNS void AS $$
DECLARE
    v_wallet RECORD;
    v_total_spent numeric;
    v_earned_past numeric;
    v_to_expire numeric;
BEGIN
    FOR v_wallet IN
        SELECT w.id, w.customer_id, w.organization_id, w.balance, c.expiration_days
        FROM public.loyalty_wallets w
        JOIN public.loyalty_configs c ON c.organization_id = w.organization_id
        WHERE c.expiration_days IS NOT NULL AND w.balance > 0
    LOOP
        -- Total points that were spent or already expired
        SELECT COALESCE(SUM(amount), 0) INTO v_total_spent
        FROM public.loyalty_point_movements
        WHERE wallet_id = v_wallet.id AND type IN ('spend', 'expiration');

        -- Total points earned before the expiration threshold
        SELECT COALESCE(SUM(amount), 0) INTO v_earned_past
        FROM public.loyalty_point_movements
        WHERE wallet_id = v_wallet.id AND type = 'earn'
          AND created_at <= (NOW() - (v_wallet.expiration_days || ' days')::interval);

        v_to_expire := v_earned_past - v_total_spent;

        IF v_to_expire > 0 THEN
            -- Ensure we do not expire more than the current actual balance
            v_to_expire := LEAST(v_to_expire, v_wallet.balance);

            IF v_to_expire > 0 THEN
                INSERT INTO public.loyalty_point_movements (wallet_id, amount, type)
                VALUES (v_wallet.id, v_to_expire, 'expiration');

                UPDATE public.loyalty_wallets
                SET balance = balance - v_to_expire
                WHERE id = v_wallet.id;

                INSERT INTO public.loyalty_notifications (customer_id, organization_id, type, message)
                VALUES (v_wallet.customer_id, v_wallet.organization_id, 'expired', v_to_expire || ' pontos expiraram do seu saldo.');
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- View for Expiring Soon Points Alerts
CREATE OR REPLACE VIEW public.vw_expiring_soon_points AS
SELECT * FROM (
    SELECT
        w.id AS wallet_id,
        w.customer_id,
        c.name AS customer_name,
        w.organization_id,
        w.balance,
        cfg.expiration_days,
        LEAST(w.balance, GREATEST(0, 
            (SELECT COALESCE(SUM(amount), 0) FROM public.loyalty_point_movements WHERE wallet_id = w.id AND type = 'earn' AND created_at <= (NOW() - (GREATEST(0, cfg.expiration_days - 30) || ' days')::interval))
            -
            (SELECT COALESCE(SUM(amount), 0) FROM public.loyalty_point_movements WHERE wallet_id = w.id AND type IN ('spend', 'expiration'))
        )) AS expiring_points
    FROM public.loyalty_wallets w
    JOIN public.customers c ON c.id = w.customer_id
    JOIN public.loyalty_configs cfg ON cfg.organization_id = w.organization_id
    WHERE cfg.expiration_days IS NOT NULL AND w.balance > 0
) sub
WHERE expiring_points > 0;

-- Gracefully schedule cron job (catch permissions or availability issues)
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN END;

    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            PERFORM cron.unschedule('expire_points_daily');
        EXCEPTION WHEN OTHERS THEN END;
        
        BEGIN
            PERFORM cron.schedule('expire_points_daily', '0 0 * * *', 'SELECT public.expire_expired_points();');
        EXCEPTION WHEN OTHERS THEN END;
    END IF;
END;
$$;
