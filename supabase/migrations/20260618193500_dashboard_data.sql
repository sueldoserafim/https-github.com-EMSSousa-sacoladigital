-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    price numeric(10,2) NOT NULL DEFAULT 0,
    stock integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    order_number text NOT NULL,
    total numeric(10,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'Confirmado',
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    quantity integer NOT NULL DEFAULT 1,
    price numeric(10,2) NOT NULL DEFAULT 0
);

-- RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view org products" ON public.products;
CREATE POLICY "Users can view org products" ON public.products
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org products" ON public.products;
CREATE POLICY "Users can insert org products" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org products" ON public.products;
CREATE POLICY "Users can update org products" ON public.products
    FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- RLS for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view org orders" ON public.orders;
CREATE POLICY "Users can view org orders" ON public.orders
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org orders" ON public.orders;
CREATE POLICY "Users can insert org orders" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org orders" ON public.orders;
CREATE POLICY "Users can update org orders" ON public.orders
    FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- RLS for order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view org order_items" ON public.order_items;
CREATE POLICY "Users can view org order_items" ON public.order_items
    FOR SELECT TO authenticated
    USING (order_id IN (SELECT id FROM public.orders WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())));

-- Seed Data
DO $$
DECLARE
    new_user_id uuid;
    org_id uuid;
    cust_id_1 uuid;
    cust_id_2 uuid;
    cust_id_3 uuid;
    cust_id_4 uuid;
    cust_id_5 uuid;
BEGIN
    -- Only proceed if we have sueldo@suportesigma.com
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'sueldo@suportesigma.com' LIMIT 1;
    
    IF new_user_id IS NOT NULL THEN
        SELECT organization_id INTO org_id FROM public.profiles WHERE id = new_user_id LIMIT 1;

        IF org_id IS NOT NULL THEN
            -- Insert missing customers
            INSERT INTO public.customers (organization_id, name, email) VALUES
                (org_id, 'Ana Paula Souza', 'ana@example.com'),
                (org_id, 'Mariana Silva', 'mariana@example.com'),
                (org_id, 'Cláudia Ramos', 'claudia@example.com'),
                (org_id, 'Patrícia Lima', 'patricia@example.com'),
                (org_id, 'Rosana Costa', 'rosana@example.com')
            ON CONFLICT DO NOTHING;

            SELECT id INTO cust_id_1 FROM public.customers WHERE name = 'Ana Paula Souza' LIMIT 1;
            SELECT id INTO cust_id_2 FROM public.customers WHERE name = 'Mariana Silva' LIMIT 1;
            SELECT id INTO cust_id_3 FROM public.customers WHERE name = 'Cláudia Ramos' LIMIT 1;
            SELECT id INTO cust_id_4 FROM public.customers WHERE name = 'Patrícia Lima' LIMIT 1;
            SELECT id INTO cust_id_5 FROM public.customers WHERE name = 'Rosana Costa' LIMIT 1;

            -- Products
            INSERT INTO public.products (id, organization_id, name, price, stock) VALUES
                (gen_random_uuid(), org_id, 'Blusa Floral P - Vestido M', 169.80, 10),
                (gen_random_uuid(), org_id, 'Calça Jeans 38', 89.90, 2),
                (gen_random_uuid(), org_id, 'Vestido Midi Listrado G', 119.90, 1),
                (gen_random_uuid(), org_id, 'Blusa Ombro a Ombro P', 94.80, 0),
                (gen_random_uuid(), org_id, 'Calça Wide Leg 40', 99.90, 5)
            ON CONFLICT DO NOTHING;

            -- Orders (only if empty to prevent duplication on multiple runs)
            IF NOT EXISTS (SELECT 1 FROM public.orders WHERE organization_id = org_id LIMIT 1) THEN
                INSERT INTO public.orders (id, organization_id, customer_id, order_number, total, status, created_at) VALUES
                    (gen_random_uuid(), org_id, cust_id_1, '#0042', 169.80, 'Confirmado', now() - interval '5 minutes'),
                    (gen_random_uuid(), org_id, cust_id_2, '#0041', 89.90, 'Em Preparação', now() - interval '23 minutes'),
                    (gen_random_uuid(), org_id, cust_id_3, '#0040', 119.90, 'Pronto para Entrega', now() - interval '1 hour'),
                    (gen_random_uuid(), org_id, cust_id_4, '#0039', 94.80, 'Entregue', now() - interval '2 hours'),
                    (gen_random_uuid(), org_id, cust_id_5, '#0038', 99.90, 'Cancelado', now() - interval '3 hours');
            END IF;
        END IF;
    END IF;
END $$;
