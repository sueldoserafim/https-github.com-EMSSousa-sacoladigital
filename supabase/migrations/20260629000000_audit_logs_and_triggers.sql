CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, 
    entity_type TEXT NOT NULL, 
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.system_audit_logs;
CREATE POLICY "Super admins can view all audit logs" ON public.system_audit_logs
  FOR SELECT TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "Admins can view their org audit logs" ON public.system_audit_logs;
CREATE POLICY "Admins can view their org audit logs" ON public.system_audit_logs
  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

CREATE OR REPLACE FUNCTION log_seller_commission_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.commission_rate IS DISTINCT FROM NEW.commission_rate THEN
    INSERT INTO public.system_audit_logs (
      organization_id, user_id, action, entity_type, entity_id, old_data, new_data
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'UPDATE_COMMISSION',
      'sellers',
      NEW.id,
      jsonb_build_object('commission_rate', OLD.commission_rate),
      jsonb_build_object('commission_rate', NEW.commission_rate)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_seller_commission_update ON public.sellers;
CREATE TRIGGER on_seller_commission_update
  AFTER UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION log_seller_commission_change();

DO $$
BEGIN
  UPDATE public.profiles SET role = 'super_admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'sueldo@suportesigma.com');
END $$;

CREATE OR REPLACE FUNCTION handle_order_marketing_automation()
RETURNS TRIGGER AS $$
DECLARE
  auto RECORD;
  cust RECORD;
  content_text TEXT;
  subject_text TEXT;
  campaign_id UUID;
  req_id BIGINT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('completed', 'Entregue', 'Concluído') THEN
    FOR auto IN 
      SELECT * FROM public.marketing_automations 
      WHERE organization_id = NEW.organization_id AND trigger_type = 'order_completed' AND is_active = true
    LOOP
      SELECT * INTO cust FROM public.customers WHERE id = NEW.customer_id;
      IF cust.email IS NOT NULL THEN
        content_text := replace(replace(auto.content, '{{customer_name}}', COALESCE(cust.name, '')), '{{order_number}}', NEW.order_number);
        subject_text := replace(replace(auto.subject, '{{customer_name}}', COALESCE(cust.name, '')), '{{order_number}}', NEW.order_number);
        
        INSERT INTO public.marketing_campaigns (organization_id, name, subject, content, status, target_customer_id)
        VALUES (NEW.organization_id, '[Automação] Pedido ' || NEW.order_number, subject_text, content_text, 'draft', NEW.customer_id)
        RETURNING id INTO campaign_id;
        
        SELECT extensions.http_post(
          url := 'https://aktavfdahhbkreecsvpp.supabase.co/functions/v1/send-marketing-campaign',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdGF2ZmRhaGhia3JlZWNzdnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3Nzk0NzMsImV4cCI6MjA5NzM1NTQ3M30.7rS9RTWfb7lq6SdPJ5BJBEOpbMWhZXuV3-CuNmFU5SQ'
          ),
          body := jsonb_build_object('campaignId', campaign_id)
        ) INTO req_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_completed_marketing ON public.orders;
CREATE TRIGGER on_order_completed_marketing
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION handle_order_marketing_automation();
