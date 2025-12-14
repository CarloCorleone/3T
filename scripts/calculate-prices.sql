-- Script para calcular precios finales manualmente

UPDATE public."3t_orders" AS o
SET final_price = (
  CASE 
    WHEN p.category = 'Venta' THEN 
      p.pv_iva_inc * COALESCE(o.botellones_entregados, o.quantity)
    ELSE 
      COALESCE(c.price, 0) * COALESCE(o.botellones_entregados, o.quantity)
  END
)
FROM public."3t_products" AS p
LEFT JOIN public."3t_customers" AS c ON c.customer_id = o.customer_id
WHERE p.product_id = o.product_type
  AND o.final_price IS NULL;

