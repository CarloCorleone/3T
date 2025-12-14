-- =====================================================
-- MIGRACIÓN: Sistema de Notificaciones Completo
-- Fecha: 2025-10-21
-- Descripción: Crea tablas y triggers para sistema de
--              notificaciones push e in-app
-- =====================================================

-- 1. TABLA: Configuración de notificaciones por usuario
-- =====================================================
CREATE TABLE IF NOT EXISTS "3t_notification_settings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "3t_users"(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  channel TEXT NOT NULL DEFAULT 'both',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_notification UNIQUE(user_id, notification_type),
  CONSTRAINT valid_notification_type CHECK (
    notification_type IN (
      'pedido_creado',
      'pedido_ruta',
      'pedido_despachado',
      'compra_completada',
      'cliente_nuevo'
    )
  ),
  CONSTRAINT valid_channel CHECK (
    channel IN ('in_app', 'push', 'both')
  )
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_notification_settings_user 
  ON "3t_notification_settings"(user_id);

-- Comentarios para documentación
COMMENT ON TABLE "3t_notification_settings" IS 
  'Configuración de preferencias de notificaciones por usuario';
COMMENT ON COLUMN "3t_notification_settings".notification_type IS 
  'Tipos disponibles: pedido_creado, pedido_ruta, pedido_despachado, compra_completada, cliente_nuevo';
COMMENT ON COLUMN "3t_notification_settings".channel IS 
  'Canales de entrega: in_app (solo en aplicación), push (notificación nativa), both (ambos)';

-- 2. TABLA: Historial de notificaciones enviadas
-- =====================================================
CREATE TABLE IF NOT EXISTS "3t_notifications_log" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "3t_users"(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  channel TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_log_channel CHECK (
    channel IN ('in_app', 'push')
  ),
  CONSTRAINT valid_status CHECK (
    status IN ('sent', 'read', 'failed')
  )
);

-- Índices para consultas rápidas y ordenamiento
CREATE INDEX IF NOT EXISTS idx_notifications_log_user_date 
  ON "3t_notifications_log"(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_log_status 
  ON "3t_notifications_log"(status);
CREATE INDEX IF NOT EXISTS idx_notifications_log_type 
  ON "3t_notifications_log"(notification_type);

-- Comentarios
COMMENT ON TABLE "3t_notifications_log" IS 
  'Historial completo de notificaciones enviadas para auditoría y debugging';
COMMENT ON COLUMN "3t_notifications_log".data IS 
  'Metadata del evento en formato JSON (order_id, customer_name, etc.)';
COMMENT ON COLUMN "3t_notifications_log".status IS 
  'Estados: sent (enviada), read (leída por usuario), failed (falló el envío)';

-- 3. TABLA: Suscripciones de Web Push API
-- =====================================================
CREATE TABLE IF NOT EXISTS "3t_push_subscriptions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "3t_users"(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_push_endpoint UNIQUE(endpoint)
);

-- Índice para consultas por usuario
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
  ON "3t_push_subscriptions"(user_id);

-- Índice para limpiar suscripciones inactivas
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_used 
  ON "3t_push_subscriptions"(last_used_at);

-- Comentarios
COMMENT ON TABLE "3t_push_subscriptions" IS 
  'Suscripciones de Web Push API por usuario y dispositivo';
COMMENT ON COLUMN "3t_push_subscriptions".endpoint IS 
  'URL única del servicio push del navegador';
COMMENT ON COLUMN "3t_push_subscriptions".p256dh IS 
  'Clave pública P-256 ECDH para encriptación de mensajes';
COMMENT ON COLUMN "3t_push_subscriptions".auth IS 
  'Token de autenticación secreto para verificar origen';
COMMENT ON COLUMN "3t_push_subscriptions".user_agent IS 
  'Información del navegador/dispositivo para debugging';

-- 4. FUNCIÓN: Inicializar preferencias al crear usuario
-- =====================================================
CREATE OR REPLACE FUNCTION init_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar configuración predeterminada para nuevo usuario
  -- pedido_despachado está activo por defecto (prioridad del negocio)
  INSERT INTO "3t_notification_settings" (user_id, notification_type, enabled, channel)
  VALUES 
    (NEW.id, 'pedido_creado', false, 'both'),
    (NEW.id, 'pedido_ruta', false, 'both'),
    (NEW.id, 'pedido_despachado', true, 'both'),  -- ✅ Activo por defecto
    (NEW.id, 'compra_completada', false, 'both'),
    (NEW.id, 'cliente_nuevo', false, 'both')
  ON CONFLICT (user_id, notification_type) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION init_notification_settings() IS 
  'Crea configuración inicial de notificaciones al registrar usuario nuevo. Notificaciones de pedido_despachado activadas por defecto.';

-- 5. TRIGGER: Auto-inicializar preferencias
-- =====================================================
DROP TRIGGER IF EXISTS trigger_init_notification_settings ON "3t_users";
CREATE TRIGGER trigger_init_notification_settings
  AFTER INSERT ON "3t_users"
  FOR EACH ROW
  EXECUTE FUNCTION init_notification_settings();

-- 6. FUNCIÓN: Actualizar timestamp de last_used
-- =====================================================
CREATE OR REPLACE FUNCTION update_push_subscription_last_used()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGER: Auto-actualizar last_used_at
-- =====================================================
DROP TRIGGER IF EXISTS trigger_update_push_last_used ON "3t_push_subscriptions";
CREATE TRIGGER trigger_update_push_last_used
  BEFORE UPDATE ON "3t_push_subscriptions"
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_last_used();

-- 8. FUNCIÓN: Limpiar notificaciones antiguas (>30 días)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM "3t_notifications_log"
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('read', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_notifications() IS 
  'Limpia notificaciones leídas o fallidas con más de 30 días. Retorna cantidad eliminada.';

-- 9. FUNCIÓN: Limpiar suscripciones inactivas (>90 días)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_inactive_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM "3t_push_subscriptions"
  WHERE last_used_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_inactive_subscriptions() IS 
  'Elimina suscripciones push no usadas en más de 90 días. Retorna cantidad eliminada.';

-- 10. INICIALIZAR PREFERENCIAS PARA USUARIOS EXISTENTES
-- =====================================================
-- Solo si la tabla está vacía (primera instalación)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "3t_notification_settings" LIMIT 1) THEN
    INSERT INTO "3t_notification_settings" (user_id, notification_type, enabled, channel)
    SELECT 
      u.id,
      unnest(ARRAY['pedido_creado', 'pedido_ruta', 'pedido_despachado', 'compra_completada', 'cliente_nuevo']),
      CASE unnest(ARRAY['pedido_creado', 'pedido_ruta', 'pedido_despachado', 'compra_completada', 'cliente_nuevo'])
        WHEN 'pedido_despachado' THEN true  -- Solo esta activa por defecto
        ELSE false
      END,
      'both'
    FROM "3t_users" u
    ON CONFLICT (user_id, notification_type) DO NOTHING;
    
    RAISE NOTICE 'Preferencias de notificaciones inicializadas para usuarios existentes';
  END IF;
END $$;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

-- Verificación de instalación
SELECT 
  'Tablas creadas correctamente' AS status,
  (SELECT COUNT(*) FROM "3t_notification_settings") AS settings_count,
  (SELECT COUNT(*) FROM "3t_notifications_log") AS logs_count,
  (SELECT COUNT(*) FROM "3t_push_subscriptions") AS subscriptions_count;


