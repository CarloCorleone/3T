-- =====================================================
-- VERIFICAR ROW LEVEL SECURITY (RLS)
-- Fecha: 2025-10-16
-- =====================================================

-- =====================================================
-- FUNCIÓN: Verificar estado de RLS
-- =====================================================

CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE(
  table_name text, 
  rls_enabled boolean, 
  policy_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text,
    c.relrowsecurity,
    COUNT(p.polname)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE n.nspname = 'public'
  AND c.relname LIKE '3t_%'
  AND c.relkind = 'r' -- Solo tablas regulares
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EJECUTAR VERIFICACIÓN
-- =====================================================

SELECT * FROM check_rls_status();

-- =====================================================
-- VERIFICACIÓN DETALLADA: Mostrar todas las políticas
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual, -- Condición USING
  with_check -- Condición WITH CHECK
FROM pg_policies 
WHERE tablename LIKE '3t_%'
ORDER BY tablename, policyname;

-- =====================================================
-- VERIFICACIÓN: Contar políticas por tabla
-- =====================================================

SELECT 
  tablename,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
  COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as all_policies
FROM pg_policies 
WHERE tablename LIKE '3t_%'
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- PRUEBA: Verificar que auth.uid() funciona
-- =====================================================

-- Esta query debe retornar el UUID del usuario autenticado
-- Si retorna NULL, significa que no estás autenticado
SELECT auth.uid() as current_user_id;

-- =====================================================
-- PRUEBA: Verificar acceso a 3t_users
-- =====================================================

-- Esta query debe mostrar solo tu propio perfil (o todos si eres admin)
SELECT id, email, nombre, rol, activo 
FROM 3t_users 
LIMIT 5;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================

-- Todas las tablas 3t_* deben tener:
-- ✅ rls_enabled = true
-- ✅ policy_count > 0

-- Si alguna tabla tiene policy_count = 0, significa que nadie puede acceder

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- Si auth.uid() retorna NULL:
-- 1. Verifica que estás autenticado en Supabase
-- 2. Verifica que el JWT es válido
-- 3. Verifica que el usuario existe en auth.users

-- Si no puedes acceder a los datos:
-- 1. Verifica que tu usuario existe en 3t_users
-- 2. Verifica que 3t_users.id = auth.uid()
-- 3. Verifica que activo = true
-- 4. Verifica el rol asignado

-- Para ver usuarios en auth.users (solo admin con acceso a schema auth):
-- SELECT id, email, created_at FROM auth.users LIMIT 5;

-- =====================================================
-- NOTAS FINALES
-- =====================================================

-- RLS está activo y protegiendo los datos
-- Las políticas controlan quién puede ver/modificar qué
-- Todos los accesos se filtran automáticamente por PostgreSQL
-- No es necesario agregar WHERE clauses en las queries del frontend

-- =====================================================
















