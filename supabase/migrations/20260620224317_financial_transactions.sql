CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('REVENUE', 'EXPENSE', 'REVERSAL')),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org transactions" ON public.financial_transactions;
CREATE POLICY "Users can view org transactions" ON public.financial_transactions
  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can insert org transactions" ON public.financial_transactions;
CREATE POLICY "Users can insert org transactions" ON public.financial_transactions
  FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can update org transactions" ON public.financial_transactions;
CREATE POLICY "Users can update org transactions" ON public.financial_transactions
  FOR UPDATE TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can delete org transactions" ON public.financial_transactions;
CREATE POLICY "Users can delete org transactions" ON public.financial_transactions
  FOR DELETE TO authenticated USING (organization_id = get_my_org_id());

CREATE OR REPLACE FUNCTION public.prevent_auto_transaction_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.order_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify or delete automatically generated financial transactions.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_auto_transaction_modification ON public.financial_transactions;
CREATE TRIGGER trg_prevent_auto_transaction_modification
BEFORE UPDATE OR DELETE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.prevent_auto_transaction_modification();

CREATE OR REPLACE FUNCTION public.handle_order_status_finance()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to Confirmado from something else
  IF NEW.status = 'Confirmado' AND OLD.status != 'Confirmado' THEN
    INSERT INTO public.financial_transactions (organization_id, order_id, type, amount, description)
    VALUES (NEW.organization_id, NEW.id, 'REVENUE', NEW.total, 'Venda de Pedido #' || NEW.order_number);
  END IF;

  -- When status changes to Cancelado from something else
  IF NEW.status = 'Cancelado' AND OLD.status != 'Cancelado' THEN
    -- Only if there's a REVENUE for this order
    IF EXISTS (SELECT 1 FROM public.financial_transactions WHERE order_id = NEW.id AND type = 'REVENUE') THEN
      INSERT INTO public.financial_transactions (organization_id, order_id, type, amount, description)
      VALUES (NEW.organization_id, NEW.id, 'REVERSAL', NEW.total, 'Estorno de Pedido #' || NEW.order_number);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_order_status_finance ON public.orders;
CREATE TRIGGER trg_handle_order_status_finance
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_order_status_finance();
