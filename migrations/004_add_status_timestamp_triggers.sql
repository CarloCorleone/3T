-- =====================================================
-- Migración: Sistema de Timestamps Automáticos
-- Fecha: 2025-10-20
-- Descripción: Agregar campo invoice_date y triggers
--              para registrar automáticamente fechas
--              de cambio de estado en pedidos y compras
-- =====================================================

-- ============================================
-- PASO 1: Agregar campo invoice_date
-- ============================================

ALTER TABLE "3t_orders" 
ADD COLUMN IF NOT EXISTS invoice_date DATE;

COMMENT ON COLUMN "3t_orders".invoice_date IS 'Fecha de emisión de factura (cuando payment_status = Facturado)';

-- ============================================
-- PASO 2: Función trigger para pedidos
-- ============================================

CREATE OR REPLACE FUNCTION update_order_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar delivered_date cuando cambia a Despachado
  IF NEW.status = 'Despachado' AND (OLD.status IS NULL OR OLD.status != 'Despachado') AND NEW.delivered_date IS NULL THEN
    NEW.delivered_date = CURRENT_DATE;
  END IF;
  
  -- Actualizar invoice_date cuando cambia a Facturado
  IF NEW.payment_status = 'Facturado' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'Facturado') AND NEW.invoice_date IS NULL THEN
    NEW.invoice_date = CURRENT_DATE;
  END IF;
  
  -- Actualizar payment_date cuando cambia a Pagado
  IF NEW.payment_status = 'Pagado' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'Pagado') AND NEW.payment_date IS NULL THEN
    NEW.payment_date = CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_order_status_timestamps() IS 'Actualiza automáticamente las fechas de estado en pedidos';

-- ============================================
-- PASO 3: Función trigger para compras
-- ============================================

CREATE OR REPLACE FUNCTION update_purchase_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar completed_date cuando cambia a Completado
  IF (NEW.status = 'Despachado' OR NEW.status = 'Completado') 
     AND (OLD.status IS NULL OR (OLD.status != 'Despachado' AND OLD.status != 'Completado')) 
     AND NEW.completed_date IS NULL THEN
    NEW.completed_date = CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_purchase_status_timestamps() IS 'Actualiza automáticamente las fechas de estado en compras';

-- ============================================
-- PASO 4: Crear triggers
-- ============================================

-- Trigger para pedidos
DROP TRIGGER IF EXISTS trg_update_order_timestamps ON "3t_orders";
CREATE TRIGGER trg_update_order_timestamps
  BEFORE UPDATE ON "3t_orders"
  FOR EACH ROW
  EXECUTE FUNCTION update_order_status_timestamps();

COMMENT ON TRIGGER trg_update_order_timestamps ON "3t_orders" IS 'Registra automáticamente delivered_date, invoice_date y payment_date';

-- Trigger para compras
DROP TRIGGER IF EXISTS trg_update_purchase_timestamps ON "3t_purchases";
CREATE TRIGGER trg_update_purchase_timestamps
  BEFORE UPDATE ON "3t_purchases"
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_status_timestamps();

COMMENT ON TRIGGER trg_update_purchase_timestamps ON "3t_purchases" IS 'Registra automáticamente completed_date';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que el campo se creó
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = '3t_orders' 
    AND column_name = 'invoice_date'
  ) THEN
    RAISE NOTICE '✅ Campo invoice_date creado correctamente';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Campo invoice_date no existe';
  END IF;
END $$;

-- Verificar que las funciones existen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_order_status_timestamps') THEN
    RAISE NOTICE '✅ Función update_order_status_timestamps creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Función update_order_status_timestamps no existe';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_purchase_status_timestamps') THEN
    RAISE NOTICE '✅ Función update_purchase_status_timestamps creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Función update_purchase_status_timestamps no existe';
  END IF;
END $$;

-- Verificar que los triggers existen
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'trg_update_order_timestamps'
  ) THEN
    RAISE NOTICE '✅ Trigger trg_update_order_timestamps creado correctamente';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Trigger trg_update_order_timestamps no existe';
  END IF;
  
  IF EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'trg_update_purchase_timestamps'
  ) THEN
    RAISE NOTICE '✅ Trigger trg_update_purchase_timestamps creado correctamente';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Trigger trg_update_purchase_timestamps no existe';
  END IF;
END $$;

-- ============================================
-- RESUMEN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE             ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  📅 Campo agregado: invoice_date                  ║';
  RAISE NOTICE '║  🔧 Funciones creadas: 2                          ║';
  RAISE NOTICE '║  ⚡ Triggers creados: 2                           ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  CAMPOS QUE SE ACTUALIZAN AUTOMÁTICAMENTE:        ║';
  RAISE NOTICE '║  • delivered_date (status → Despachado)           ║';
  RAISE NOTICE '║  • invoice_date (payment_status → Facturado)      ║';
  RAISE NOTICE '║  • payment_date (payment_status → Pagado)         ║';
  RAISE NOTICE '║  • completed_date (status → Despachado, compras)  ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
END $$;

