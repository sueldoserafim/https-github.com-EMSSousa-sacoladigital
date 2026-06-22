CREATE TABLE IF NOT EXISTS public.marketing_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL,
  delay_days integer DEFAULT 0 NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.marketing_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org marketing_automations" ON public.marketing_automations;
CREATE POLICY "Users can view org marketing_automations" ON public.marketing_automations
  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can insert org marketing_automations" ON public.marketing_automations;
CREATE POLICY "Users can insert org marketing_automations" ON public.marketing_automations
  FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can update org marketing_automations" ON public.marketing_automations;
CREATE POLICY "Users can update org marketing_automations" ON public.marketing_automations
  FOR UPDATE TO authenticated USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Users can delete org marketing_automations" ON public.marketing_automations;
CREATE POLICY "Users can delete org marketing_automations" ON public.marketing_automations
  FOR DELETE TO authenticated USING (organization_id = get_my_org_id());

-- Add target_customer_id to marketing_campaigns for direct targeted automations
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS target_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Seed default automations for existing organizations
DO $$
DECLARE
  org record;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    INSERT INTO public.marketing_automations (organization_id, name, trigger_type, delay_days, subject, content, is_active)
    VALUES 
      (org.id, 'Agradecimento Pós-Compra', 'order_completed', 1, 'Obrigado pela sua compra, {{customer_name}}!', 'Olá {{customer_name}}, agradecemos por comprar conosco. O número do seu pedido é {{order_number}}. Esperamos que você adore!', false),
      (org.id, 'Recuperação de Cliente', 'customer_inactive', 30, 'Sentimos sua falta, {{customer_name}}!', 'Olá {{customer_name}}, notamos que você não compra há algum tempo. Volte para conferir nossas novidades!', false)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
