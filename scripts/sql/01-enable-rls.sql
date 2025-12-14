-- =====================================================
-- ACTIVAR ROW LEVEL SECURITY EN TODAS LAS TABLAS 3T
-- Basado en: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Fecha: 2025-10-16
-- =====================================================

-- ⚠️ IMPORTANTE: Después de ejecutar este script, 
-- NADIE podrá acceder a los datos hasta que crees las políticas

-- =====================================================
-- PEDIDOS Y VENTAS
-- =====================================================
ALTER TABLE 3t_orders ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CLIENTES Y DIRECCIONES
-- =====================================================
ALTER TABLE 3t_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_addresses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PRODUCTOS
-- =====================================================
ALTER TABLE 3t_products ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PRESUPUESTOS
-- =====================================================
ALTER TABLE 3t_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_quote_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USUARIOS Y PERMISOS (CRÍTICO)
-- =====================================================
ALTER TABLE 3t_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROVEEDORES Y COMPRAS
-- =====================================================
ALTER TABLE 3t_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_supplier_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_purchase_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_supplier_price_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RUTAS
-- =====================================================
ALTER TABLE 3t_saved_routes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Este query muestra qué tablas tienen RLS activo
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename LIKE '3t_%'
ORDER BY tablename;

-- =====================================================
-- NOTAS
-- =====================================================
-- 1. RLS ahora está activo en todas las tablas 3t_*
-- 2. NADIE puede acceder a los datos (ni siquiera admins)
-- 3. SIGUIENTE PASO: Ejecutar 02-create-policies.sql
-- =====================================================
















