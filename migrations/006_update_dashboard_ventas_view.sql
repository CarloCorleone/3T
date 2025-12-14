-- =====================================================
-- Migración: Actualizar Vista 3t_dashboard_ventas
-- Fecha: 2025-10-28
-- Descripción: Agregar columnas invoice_number, invoice_date,
--              payment_date y delivery_photo_path a la vista
-- =====================================================

-- Eliminar vista existente
DROP VIEW IF EXISTS "3t_dashboard_ventas";

-- Recrear vista con columnas adicionales
CREATE OR REPLACE VIEW "3t_dashboard_ventas" AS
SELECT 
  o.order_id,
  o.order_date,
  o.delivered_date,
  o.invoice_date,
  o.payment_date,
  o.status,
  o.payment_status,
  o.payment_type,
  o.invoice_number,
  o.final_price,
  o.quantity,
  o.details,
  o.delivery_photo_path,  -- Ruta de la foto de despacho
  
  -- Datos del cliente (ya con JOIN)
  c.customer_id,
  c.name AS customer_name,
  c.customer_type,
  c.phone AS customer_phone,
  
  -- Datos de dirección (ya con JOIN)
  a.address_id,
  a.raw_address,
  a.commune,
  a.latitude,
  a.longitude,
  
  -- Datos del producto (ya con JOIN)
  p.name AS product_name,
  p.category AS product_category,
  
  -- Métricas calculadas
  CASE 
    WHEN o.delivered_date IS NOT NULL AND o.order_date IS NOT NULL
    THEN EXTRACT(EPOCH FROM (o.delivered_date::timestamp - o.order_date::timestamp)) / 60
    ELSE NULL
  END AS tiempo_entrega_minutos,
  
  CASE 
    WHEN c.customer_type = 'Empresa'
    THEN ROUND(o.final_price * 1.19)
    ELSE o.final_price
  END AS precio_con_iva,
  
  o.final_price AS precio_neto

FROM "3t_orders" o
LEFT JOIN "3t_customers" c ON o.customer_id = c.customer_id
LEFT JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id
LEFT JOIN "3t_products" p ON o.product_type = p.product_id;

-- Comentario de la vista
COMMENT ON VIEW "3t_dashboard_ventas" IS 'Vista pre-calculada con JOINs para reportes de ventas. Incluye invoice_number, invoice_date, payment_date y delivery_photo_path para trazabilidad completa.';

