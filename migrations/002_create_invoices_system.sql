-- ===================================================
-- MIGRACIÓN: Sistema de Facturación Profesional
-- Versión: 002
-- Fecha: 2025-11-06
-- Descripción: Crear sistema N:M para facturación con
--              soporte para facturación parcial y consolidada
-- ===================================================

-- ===================================================
-- PASO 1: CREAR TABLAS PRINCIPALES
-- ===================================================

-- Tabla principal de facturas
CREATE TABLE "3t_invoices" (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente', 'anulada', 'pendiente')),
  invoice_type TEXT DEFAULT 'venta' CHECK (invoice_type IN ('venta', 'exenta', 'boleta')),
  notes TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES "3t_users"(id),
  updated_by UUID REFERENCES "3t_users"(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de relación N:M entre pedidos y facturas
CREATE TABLE "3t_order_invoices" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES "3t_orders"(order_id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES "3t_invoices"(invoice_id) ON DELETE CASCADE,
  amount_invoiced DECIMAL(12,2) NOT NULL CHECK (amount_invoiced > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, invoice_id)
);

-- ===================================================
-- PASO 2: CREAR ÍNDICES PARA PERFORMANCE
-- ===================================================

CREATE INDEX idx_invoices_date ON "3t_invoices"(invoice_date DESC);
CREATE INDEX idx_invoices_number ON "3t_invoices"(invoice_number);
CREATE INDEX idx_invoices_status ON "3t_invoices"(status);
CREATE INDEX idx_order_invoices_order ON "3t_order_invoices"(order_id);
CREATE INDEX idx_order_invoices_invoice ON "3t_order_invoices"(invoice_id);

-- ===================================================
-- PASO 3: HABILITAR ROW LEVEL SECURITY (RLS)
-- ===================================================

ALTER TABLE "3t_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3t_order_invoices" ENABLE ROW LEVEL SECURITY;

-- Policy: Admin y operador pueden todo en facturas
CREATE POLICY "admin_operador_full_access_invoices" ON "3t_invoices"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "3t_users" 
      WHERE id = auth.uid() 
      AND rol IN ('admin', 'operador')
    )
  );

-- Policy: Admin y operador pueden todo en relaciones pedido-factura
CREATE POLICY "admin_operador_full_access_order_invoices" ON "3t_order_invoices"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "3t_users" 
      WHERE id = auth.uid() 
      AND rol IN ('admin', 'operador')
    )
  );

-- Policy: Chofer solo puede leer facturas
CREATE POLICY "chofer_read_invoices" ON "3t_invoices"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "3t_users" 
      WHERE id = auth.uid() 
      AND rol = 'chofer'
    )
  );

-- Policy: Chofer solo puede leer relaciones pedido-factura
CREATE POLICY "chofer_read_order_invoices" ON "3t_order_invoices"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "3t_users" 
      WHERE id = auth.uid() 
      AND rol = 'chofer'
    )
  );

-- ===================================================
-- PASO 4: CREAR TRIGGER PARA UPDATED_AT
-- ===================================================

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON "3t_invoices"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================================
-- PASO 5: CREAR VISTAS SQL OPTIMIZADAS
-- ===================================================

-- Vista: Facturas con pedidos relacionados
CREATE OR REPLACE VIEW v_invoices_with_orders AS
SELECT 
  i.invoice_id,
  i.invoice_number,
  i.invoice_date,
  i.total_amount,
  i.tax_amount,
  i.subtotal,
  i.status,
  i.invoice_type,
  i.notes,
  i.pdf_url,
  i.created_at,
  i.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'order_id', o.order_id,
        'order_date', o.order_date,
        'customer_name', c.name,
        'customer_type', c.customer_type,
        'amount_invoiced', oi.amount_invoiced,
        'product_name', p.name
      ) ORDER BY o.order_date
    ) FILTER (WHERE o.order_id IS NOT NULL),
    '[]'::json
  ) as orders
FROM "3t_invoices" i
LEFT JOIN "3t_order_invoices" oi ON i.invoice_id = oi.invoice_id
LEFT JOIN "3t_orders" o ON oi.order_id = o.order_id
LEFT JOIN "3t_customers" c ON o.customer_id = c.customer_id
LEFT JOIN "3t_products" p ON o.product_type = p.product_id
GROUP BY i.invoice_id, i.invoice_number, i.invoice_date, i.total_amount, 
         i.tax_amount, i.subtotal, i.status, i.invoice_type, i.notes, 
         i.pdf_url, i.created_at, i.updated_at;

-- Vista: Pedidos con facturas relacionadas
CREATE OR REPLACE VIEW v_orders_with_invoices AS
SELECT 
  o.order_id,
  o.order_date,
  o.final_price,
  c.name as customer_name,
  COALESCE(SUM(oi.amount_invoiced), 0) as total_invoiced,
  o.final_price - COALESCE(SUM(oi.amount_invoiced), 0) as remaining_to_invoice,
  COALESCE(
    json_agg(
      json_build_object(
        'invoice_id', i.invoice_id,
        'invoice_number', i.invoice_number,
        'invoice_date', i.invoice_date,
        'amount_invoiced', oi.amount_invoiced,
        'status', i.status
      ) ORDER BY i.invoice_date
    ) FILTER (WHERE i.invoice_id IS NOT NULL),
    '[]'::json
  ) as invoices
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
LEFT JOIN "3t_order_invoices" oi ON o.order_id = oi.order_id
LEFT JOIN "3t_invoices" i ON oi.invoice_id = i.invoice_id AND i.status != 'anulada'
GROUP BY o.order_id, o.order_date, o.final_price, c.name;

-- ===================================================
-- PASO 6: MIGRACIÓN AUTOMÁTICA DE DATOS EXISTENTES
-- ===================================================

-- Migrar facturas existentes (únicas por invoice_number)
INSERT INTO "3t_invoices" (invoice_number, invoice_date, total_amount, subtotal, tax_amount, status)
SELECT DISTINCT ON (invoice_number)
  invoice_number,
  invoice_date,
  SUM(final_price) OVER (PARTITION BY invoice_number) as total_amount,
  ROUND((SUM(final_price) OVER (PARTITION BY invoice_number)) / 1.19, 2) as subtotal,
  ROUND((SUM(final_price) OVER (PARTITION BY invoice_number)) - 
        (SUM(final_price) OVER (PARTITION BY invoice_number)) / 1.19, 2) as tax_amount,
  'vigente' as status
FROM "3t_orders"
WHERE invoice_number IS NOT NULL 
  AND invoice_number != ''
  AND invoice_date IS NOT NULL
ORDER BY invoice_number, invoice_date;

-- Crear relaciones pedido-factura para datos migrados
INSERT INTO "3t_order_invoices" (order_id, invoice_id, amount_invoiced)
SELECT 
  o.order_id,
  i.invoice_id,
  o.final_price
FROM "3t_orders" o
JOIN "3t_invoices" i ON o.invoice_number = i.invoice_number
WHERE o.invoice_number IS NOT NULL 
  AND o.invoice_number != ''
ON CONFLICT (order_id, invoice_id) DO NOTHING;

-- ===================================================
-- PASO 7: DOCUMENTAR CAMPOS LEGACY
-- ===================================================

COMMENT ON COLUMN "3t_orders".invoice_number IS 'LEGACY: Usar tabla 3t_invoices. Campo mantenido como backup.';
COMMENT ON COLUMN "3t_orders".invoice_date IS 'LEGACY: Usar tabla 3t_invoices. Campo mantenido como backup.';

-- ===================================================
-- FIN DE MIGRACIÓN
-- ===================================================
