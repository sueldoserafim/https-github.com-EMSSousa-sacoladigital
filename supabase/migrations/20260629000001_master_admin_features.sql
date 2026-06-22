-- Migrations for Plan Management and Audit Enhancements

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  max_products INTEGER DEFAULT 0,
  max_users INTEGER DEFAULT 0,
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view plans" ON public.plans;
CREATE POLICY "Public can view plans" ON public.plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admin can manage plans" ON public.plans;
CREATE POLICY "Super admin can manage plans" ON public.plans
  FOR ALL TO authenticated USING (is_super_admin());

ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Seed default plans
INSERT INTO public.plans (name, description, price, max_products, max_users, features)
VALUES 
  ('Basic', 'Plano básico para iniciantes', 0, 50, 1, '{"support": "email"}'::jsonb),
  ('Pro', 'Plano profissional com mais recursos', 49, 1000, 5, '{"support": "priority"}'::jsonb),
  ('Enterprise', 'Plano ilimitado para grandes operações', 199, -1, -1, '{"support": "24/7"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Trigger to log organization updates
CREATE OR REPLACE FUNCTION public.log_organization_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.system_audit_logs (
    organization_id, user_id, action, entity_type, entity_id, old_data, new_data
  ) VALUES (
    NEW.id,
    auth.uid(),
    'UPDATE',
    'organizations',
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_organization_update ON public.organizations;
CREATE TRIGGER on_organization_update
  AFTER UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.log_organization_changes();
