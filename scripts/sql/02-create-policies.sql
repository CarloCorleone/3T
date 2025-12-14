-- =====================================================
-- POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- Basado en: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Fecha: 2025-10-16
-- 
-- IMPORTANTE: auth.uid() retorna el UUID del usuario autenticado
-- La tabla 3t_users.id debe coincidir con auth.uid()
-- =====================================================

-- =====================================================
-- TABLA: 3t_users (Usuarios del Sistema)
-- =====================================================

-- Política 1: Los usuarios pueden ver su propio perfil
CREATE POLICY "users_select_own_profile"
ON 3t_users FOR SELECT
USING (auth.uid() = id);

-- Política 2: Los admins pueden ver todos los perfiles
CREATE POLICY "admin_select_all_users"
ON 3t_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
    AND activo = true
  )
);

-- Política 3: Los usuarios pueden actualizar su propio perfil (nombre, email)
CREATE POLICY "users_update_own_profile"
ON 3t_users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND rol = (SELECT rol FROM 3t_users WHERE id = auth.uid()) -- No pueden cambiar su rol
);

-- Política 4: Solo admins pueden insertar/eliminar usuarios
CREATE POLICY "admin_all_on_users"
ON 3t_users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_orders (Pedidos)
-- =====================================================

-- Política 1: Todos los usuarios autenticados y activos pueden ver pedidos
CREATE POLICY "authenticated_select_orders"
ON 3t_orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

-- Política 2: Admin y operadores pueden crear pedidos
CREATE POLICY "admin_operador_insert_orders"
ON 3t_orders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

-- Política 3: Admin y operadores pueden actualizar/eliminar pedidos
CREATE POLICY "admin_operador_update_delete_orders"
ON 3t_orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

CREATE POLICY "admin_operador_delete_orders"
ON 3t_orders FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

-- Política 4: Repartidores solo pueden actualizar estado de entrega
CREATE POLICY "repartidor_update_delivery_status"
ON 3t_orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'repartidor'
    AND activo = true
  )
)
WITH CHECK (
  -- Solo pueden modificar campos de entrega
  status IN ('Ruta', 'Despachado') OR
  delivery_datetime IS NOT NULL OR
  delivered_date IS NOT NULL OR
  delivery_photo_path IS NOT NULL
);

-- =====================================================
-- TABLA: 3t_customers (Clientes)
-- =====================================================

-- Todos los usuarios activos pueden ver clientes
CREATE POLICY "authenticated_select_customers"
ON 3t_customers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

-- Solo admin y operadores pueden modificar clientes
CREATE POLICY "admin_operador_insert_customers"
ON 3t_customers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

CREATE POLICY "admin_operador_update_customers"
ON 3t_customers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

CREATE POLICY "admin_operador_delete_customers"
ON 3t_customers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_addresses (Direcciones)
-- =====================================================

CREATE POLICY "authenticated_select_addresses"
ON 3t_addresses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "admin_operador_all_addresses"
ON 3t_addresses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_products (Productos)
-- =====================================================

-- Todos pueden ver productos
CREATE POLICY "authenticated_select_products"
ON 3t_products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

-- Solo admin puede modificar productos
CREATE POLICY "admin_all_products"
ON 3t_products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_quotes (Presupuestos)
-- =====================================================

CREATE POLICY "authenticated_select_quotes"
ON 3t_quotes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "admin_operador_all_quotes"
ON 3t_quotes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_quote_items (Items de Presupuestos)
-- =====================================================

CREATE POLICY "authenticated_select_quote_items"
ON 3t_quote_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "admin_operador_all_quote_items"
ON 3t_quote_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_suppliers (Proveedores)
-- =====================================================

CREATE POLICY "authenticated_select_suppliers"
ON 3t_suppliers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "admin_operador_all_suppliers"
ON 3t_suppliers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_supplier_addresses
-- =====================================================

CREATE POLICY "authenticated_select_supplier_addresses"
ON 3t_supplier_addresses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "admin_operador_all_supplier_addresses"
ON 3t_supplier_addresses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_purchases (Compras)
-- =====================================================

CREATE POLICY "authenticated_select_purchases"
ON 3t_purchases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "admin_operador_all_purchases"
ON 3t_purchases FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_purchase_products
-- =====================================================

CREATE POLICY "authenticated_select_purchase_products"
ON 3t_purchase_products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "admin_operador_all_purchase_products"
ON 3t_purchase_products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_supplier_price_history
-- =====================================================

CREATE POLICY "authenticated_select_supplier_price_history"
ON 3t_supplier_price_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "admin_operador_all_supplier_price_history"
ON 3t_supplier_price_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_saved_routes (Rutas Guardadas)
-- =====================================================

CREATE POLICY "authenticated_select_saved_routes"
ON 3t_saved_routes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "staff_all_saved_routes"
ON 3t_saved_routes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador', 'repartidor')
    AND activo = true
  )
);

-- =====================================================
-- TABLAS DE PERMISOS (Solo Admin)
-- =====================================================

-- 3t_roles
CREATE POLICY "admin_all_roles"
ON 3t_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
    AND activo = true
  )
);

CREATE POLICY "authenticated_select_roles"
ON 3t_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

-- 3t_permissions
CREATE POLICY "authenticated_select_permissions"
ON 3t_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "admin_all_permissions"
ON 3t_permissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
    AND activo = true
  )
);

-- 3t_role_permissions
CREATE POLICY "authenticated_select_role_permissions"
ON 3t_role_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "admin_all_role_permissions"
ON 3t_role_permissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
    AND activo = true
  )
);

-- 3t_user_permissions
CREATE POLICY "authenticated_select_user_permissions"
ON 3t_user_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
);

CREATE POLICY "admin_all_user_permissions"
ON 3t_user_permissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
    AND activo = true
  )
);

-- =====================================================
-- TABLA: 3t_audit_log (Log de Auditoría)
-- =====================================================

-- Todos pueden crear logs (para registrar acciones)
CREATE POLICY "authenticated_insert_audit_log"
ON 3t_audit_log FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND activo = true
  )
  AND user_id = auth.uid()::text
);

-- Solo admin puede ver logs
CREATE POLICY "admin_select_audit_log"
ON 3t_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
    AND activo = true
  )
);

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE 3t_users IS 'RLS habilitado: Usuarios solo ven su perfil, admins ven todo';
COMMENT ON TABLE 3t_orders IS 'RLS habilitado: Todos ven pedidos, admin/operador modifican, repartidor actualiza entregas';
COMMENT ON TABLE 3t_customers IS 'RLS habilitado: Todos ven, admin/operador modifican';
COMMENT ON TABLE 3t_products IS 'RLS habilitado: Todos ven, solo admin modifica';
COMMENT ON TABLE 3t_saved_routes IS 'RLS habilitado: Todos ven, staff (admin/operador/repartidor) modifican';
COMMENT ON TABLE 3t_audit_log IS 'RLS habilitado: Todos insertan, solo admin lee';

-- =====================================================
-- FIN DE POLÍTICAS
-- =====================================================

-- Verificar políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename LIKE '3t_%'
ORDER BY tablename, policyname;
















