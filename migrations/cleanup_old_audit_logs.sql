-- ===========================================================================
-- Función para Limpieza Automática de Logs de Auditoría
-- ===========================================================================
-- Descripción: Elimina registros de auditoría antiguos (> 30 días)
-- Uso: Ejecutar manualmente o programar como cron job
-- Fecha de creación: 2025-10-21
-- ===========================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS TABLE (
  deleted_count bigint,
  oldest_remaining_date timestamptz
) AS $$
DECLARE
  v_deleted_count bigint;
  v_oldest_date timestamptz;
BEGIN
  -- Eliminar logs más antiguos que 30 días
  DELETE FROM "3t_audit_log"
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Obtener la fecha del log más antiguo restante
  SELECT MIN(created_at) INTO v_oldest_date
  FROM "3t_audit_log";
  
  RETURN QUERY SELECT v_deleted_count, v_oldest_date;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- Comentarios de la función
-- ===========================================================================
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 
'Elimina logs de auditoría más antiguos que 30 días y retorna estadísticas de la limpieza';

-- ===========================================================================
-- Ejemplo de uso
-- ===========================================================================
-- SELECT * FROM cleanup_old_audit_logs();
-- 
-- Resultado esperado:
-- deleted_count | oldest_remaining_date
-- --------------+----------------------
--           145 | 2025-09-21 10:30:00+00
-- ===========================================================================

-- ===========================================================================
-- Configuración de Cron Job (Opcional)
-- ===========================================================================
-- Para ejecutar automáticamente cada 7 días a las 3:00 AM:
-- 
-- Usando pg_cron (requiere extensión instalada):
-- SELECT cron.schedule(
--   '0 3 */7 * *',  -- Cada 7 días a las 3:00 AM
--   'SELECT cleanup_old_audit_logs();'
-- );
--
-- O ejecutar manualmente desde n8n/scripts:
-- CREATE OR REPLACE FUNCTION schedule_audit_cleanup()
-- RETURNS void AS $$
-- BEGIN
--   PERFORM cleanup_old_audit_logs();
-- END;
-- $$ LANGUAGE plpgsql;
-- ===========================================================================

