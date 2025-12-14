-- =====================================================
-- IMPLEMENTACIÓN COMPLETA DE RLS EN UNA TRANSACCIÓN
-- Este script combina enable + policies + verify
-- Para minimizar tiempo de indisponibilidad
-- Fecha: 2025-10-16
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: ELIMINAR POLÍTICAS EXISTENTES PERMISIVAS
-- =====================================================

-- Eliminar políticas de 3t_customers
DROP POLICY IF EXISTS "Permitir escritura a autenticados" ON 3t_customers;
DROP POLICY IF EXISTS "Permitir lectura a autenticados" ON 3t_customers;

-- Eliminar políticas de 3t_orders
DROP POLICY IF EXISTS "Permitir escritura a autenticados" ON 3t_orders;
DROP POLICY IF EXISTS "Permitir lectura a autenticados" ON 3t_orders;

-- Eliminar políticas de 3t_users
DROP POLICY IF EXISTS "Permitir escritura a autenticados" ON 3t_users;
DROP POLICY IF EXISTS "Todos autenticados pueden leer usuarios" ON 3t_users;
DROP POLICY IF EXISTS "Usuarios pueden ver su propia información" ON 3t_users;

-- =====================================================
-- PASO 2: ACTIVAR RLS EN TODAS LAS TABLAS
-- =====================================================

ALTER TABLE 3t_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_purchase_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_saved_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_supplier_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_supplier_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 3: CREAR POLÍTICAS NUEVAS
-- =====================================================

-- TABLA: 3t_users
CREATE POLICY "users_select_own_profile" ON 3t_users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "admin_select_all_users" ON 3t_users FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol = 'admin' AND activo = true));

CREATE POLICY "users_update_own_profile" ON 3t_users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND rol = (SELECT rol FROM 3t_users WHERE id = auth.uid()));

CREATE POLICY "admin_all_on_users" ON 3t_users FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol = 'admin' AND activo = true));

-- TABLA: 3t_orders
CREATE POLICY "authenticated_select_orders" ON 3t_orders FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_operador_insert_orders" ON 3t_orders FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

CREATE POLICY "admin_operador_update_delete_orders" ON 3t_orders FOR UPDATE
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

CREATE POLICY "admin_operador_delete_orders" ON 3t_orders FOR DELETE
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

CREATE POLICY "repartidor_update_delivery_status" ON 3t_orders FOR UPDATE
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol = 'repartidor' AND activo = true))
WITH CHECK (status IN ('Ruta', 'Despachado') OR delivery_datetime IS NOT NULL OR delivered_date IS NOT NULL);

-- TABLA: 3t_customers
CREATE POLICY "authenticated_select_customers" ON 3t_customers FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_operador_insert_customers" ON 3t_customers FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

CREATE POLICY "admin_operador_update_customers" ON 3t_customers FOR UPDATE
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

CREATE POLICY "admin_operador_delete_customers" ON 3t_customers FOR DELETE
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

-- TABLA: 3t_addresses
CREATE POLICY "authenticated_select_addresses" ON 3t_addresses FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_operador_all_addresses" ON 3t_addresses FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

-- TABLA: 3t_products
CREATE POLICY "authenticated_select_products" ON 3t_products FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_all_products" ON 3t_products FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol = 'admin' AND activo = true));

-- TABLA: 3t_quotes
CREATE POLICY "authenticated_select_quotes" ON 3t_quotes FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_operador_all_quotes" ON 3t_quotes FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

-- TABLA: 3t_quote_items (eliminar políticas viejas primero)
DROP POLICY IF EXISTS "auth_can_read_quote_items" ON 3t_quote_items;
DROP POLICY IF EXISTS "permission_based_write_quote_items" ON 3t_quote_items;

CREATE POLICY "authenticated_select_quote_items" ON 3t_quote_items FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_operador_all_quote_items" ON 3t_quote_items FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

-- TABLA: 3t_suppliers
CREATE POLICY "authenticated_select_suppliers" ON 3t_suppliers FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_operador_all_suppliers" ON 3t_suppliers FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

-- TABLA: 3t_supplier_addresses
CREATE POLICY "authenticated_select_supplier_addresses" ON 3t_supplier_addresses FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_operador_all_supplier_addresses" ON 3t_supplier_addresses FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

-- TABLA: 3t_purchases
CREATE POLICY "authenticated_select_purchases" ON 3t_purchases FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_operador_all_purchases" ON 3t_purchases FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

-- TABLA: 3t_purchase_products
CREATE POLICY "authenticated_select_purchase_products" ON 3t_purchase_products FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_operador_all_purchase_products" ON 3t_purchase_products FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

-- TABLA: 3t_supplier_price_history
CREATE POLICY "authenticated_select_supplier_price_history" ON 3t_supplier_price_history FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_operador_all_supplier_price_history" ON 3t_supplier_price_history FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador') AND activo = true));

-- TABLA: 3t_saved_routes
CREATE POLICY "authenticated_select_saved_routes" ON 3t_saved_routes FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "staff_all_saved_routes" ON 3t_saved_routes FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol IN ('admin', 'operador', 'repartidor') AND activo = true));

-- TABLA: 3t_roles (mantener políticas existentes si son buenas, o reemplazar)
DROP POLICY IF EXISTS "auth_can_read_roles" ON 3t_roles;
CREATE POLICY "authenticated_select_roles" ON 3t_roles FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_all_roles" ON 3t_roles FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol = 'admin' AND activo = true));

-- TABLA: 3t_permissions (mantener política SELECT existente)
DROP POLICY IF EXISTS "permission_based_write_permissions" ON 3t_permissions;
CREATE POLICY "admin_all_permissions" ON 3t_permissions FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol = 'admin' AND activo = true));

-- TABLA: 3t_role_permissions (actualizar)
DROP POLICY IF EXISTS "permission_based_write_role_permissions" ON 3t_role_permissions;
CREATE POLICY "authenticated_select_role_permissions" ON 3t_role_permissions FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_all_role_permissions" ON 3t_role_permissions FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol = 'admin' AND activo = true));

-- TABLA: 3t_user_permissions (actualizar)
DROP POLICY IF EXISTS "permission_based_write_user_permissions" ON 3t_user_permissions;
DROP POLICY IF EXISTS "user_sees_own_permissions" ON 3t_user_permissions;
CREATE POLICY "authenticated_select_user_permissions" ON 3t_user_permissions FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "admin_all_user_permissions" ON 3t_user_permissions FOR ALL
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol = 'admin' AND activo = true));

-- TABLA: 3t_audit_log (mantener INSERT existente, actualizar SELECT)
DROP POLICY IF EXISTS "user_sees_own_audit" ON 3t_audit_log;
DROP POLICY IF EXISTS "only_service_can_write_audit" ON 3t_audit_log;

CREATE POLICY "authenticated_insert_audit_log" ON 3t_audit_log FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND activo = true) AND user_id = auth.uid()::text);

CREATE POLICY "admin_select_audit_log" ON 3t_audit_log FOR SELECT
USING (EXISTS (SELECT 1 FROM 3t_users WHERE id = auth.uid() AND rol = 'admin' AND activo = true));

-- =====================================================
-- PASO 4: COMENTARIOS
-- =====================================================

COMMENT ON TABLE 3t_users IS 'RLS habilitado: Usuarios solo ven su perfil, admins ven todo';
COMMENT ON TABLE 3t_orders IS 'RLS habilitado: Todos ven pedidos, admin/operador modifican, repartidor actualiza entregas';
COMMENT ON TABLE 3t_customers IS 'RLS habilitado: Todos ven, admin/operador modifican';
COMMENT ON TABLE 3t_products IS 'RLS habilitado: Todos ven, solo admin modifica';

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

COMMIT;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename LIKE '3t_%'
ORDER BY tablename;

SELECT 
  tablename,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename LIKE '3t_%'
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Todas las tablas deben tener rls_enabled = true
-- Todas las tablas deben tener policy_count > 0
-- =====================================================
















