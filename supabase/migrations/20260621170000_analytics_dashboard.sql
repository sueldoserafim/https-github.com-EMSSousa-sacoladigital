-- View for Product Profitability and ABC Curve Analysis
-- Incorporates COGS, Margins, and Revenue calculations server-side

CREATE OR REPLACE VIEW public.vw_product_performance WITH (security_invoker = true) AS
SELECT 
    p.id as product_id,
    p.organization_id,
    p.name,
    p.price,
    COALESCE(p.cost, 0) as cost,
    p.stock,
    COALESCE(SUM(oi.quantity), 0)::numeric as total_sold_quantity,
    COALESCE(SUM(oi.quantity * oi.price), 0)::numeric as total_revenue,
    COALESCE(SUM(oi.quantity * p.cost), 0)::numeric as total_cogs,
    (p.price - COALESCE(p.cost, 0))::numeric as unit_profit,
    CASE 
        WHEN p.price > 0 THEN ((p.price - COALESCE(p.cost, 0)) / p.price * 100)::numeric
        ELSE 0 
    END as margin_percentage
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('Cancelado', 'Cancelled', 'Canceled')
GROUP BY p.id, p.organization_id, p.name, p.price, p.cost, p.stock;
