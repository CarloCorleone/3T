-- ==========================================
-- MIGRACIÓN: Sistema de Autenticación
-- Fecha: 2025-10-13
-- Descripción: Configurar tabla de usuarios, RLS y políticas de seguridad
-- ==========================================

-- ==========================================
-- PASO 1: Configurar tabla 3t_users
-- ==========================================

-- Eliminar tabla existente si existe (cuidado en producción!)
-- DROP TABLE IF EXISTS "3t_users" CASCADE;

-- Crear tabla de usuarios con estructura completa
CREATE TABLE IF NOT EXISTS "3t_users" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'operador' CHECK (rol IN ('admin', 'operador', 'repartidor')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_3t_users_email ON "3t_users"(email);
CREATE INDEX IF NOT EXISTS idx_3t_users_rol ON "3t_users"(rol);
CREATE INDEX IF NOT EXISTS idx_3t_users_activo ON "3t_users"(activo) WHERE activo = true;

-- Comentarios de documentación
COMMENT ON TABLE "3t_users" IS 'Usuarios del sistema Agua Tres Torres con roles y permisos';
COMMENT ON COLUMN "3t_users".id IS 'UUID único del usuario (puede ser FK a auth.users si usas Supabase Auth)';
COMMENT ON COLUMN "3t_users".email IS 'Email único del usuario para login';
COMMENT ON COLUMN "3t_users".nombre IS 'Nombre completo del usuario';
COMMENT ON COLUMN "3t_users".rol IS 'Rol del usuario: admin (acceso total), operador (operaciones diarias), repartidor (solo lectura y rutas)';
COMMENT ON COLUMN "3t_users".activo IS 'Si el usuario puede acceder al sistema';

-- ==========================================
-- PASO 2: Trigger para actualizar updated_at automáticamente
-- ==========================================

-- Crear función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a 3t_users
DROP TRIGGER IF EXISTS update_3t_users_updated_at ON "3t_users";
CREATE TRIGGER update_3t_users_updated_at 
  BEFORE UPDATE ON "3t_users"
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- PASO 3: Activar Row Level Security (RLS)
-- ==========================================

-- Activar RLS en todas las tablas principales
ALTER TABLE "3t_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3t_customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3t_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3t_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3t_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3t_suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3t_supplier_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3t_purchases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3t_purchase_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3t_quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3t_quote_items" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PASO 4: Políticas RLS para tabla 3t_users
-- ==========================================

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden ver su propia información" ON "3t_users";
DROP POLICY IF EXISTS "Admins pueden ver todos los usuarios" ON "3t_users";
DROP POLICY IF EXISTS "Admins pueden modificar usuarios" ON "3t_users";

-- Política 1: Usuarios pueden ver su propia información
CREATE POLICY "Usuarios pueden ver su propia información" 
ON "3t_users"
FOR SELECT 
USING (auth.uid() = id);

-- Política 2: Admins pueden ver todos los usuarios
CREATE POLICY "Admins pueden ver todos los usuarios" 
ON "3t_users"
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- Política 3: Solo admins pueden modificar usuarios
CREATE POLICY "Admins pueden modificar usuarios" 
ON "3t_users"
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- ==========================================
-- PASO 5: Políticas RLS para tablas principales
-- ==========================================

-- Políticas para 3t_customers (Clientes)
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer clientes" ON "3t_customers";
DROP POLICY IF EXISTS "Admin y Operador pueden modificar clientes" ON "3t_customers";

CREATE POLICY "Usuarios autenticados pueden leer clientes" 
ON "3t_customers"
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM "3t_users" WHERE id = auth.uid())
);

CREATE POLICY "Admin y Operador pueden modificar clientes" 
ON "3t_customers"
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

-- Políticas para 3t_addresses (Direcciones)
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer direcciones" ON "3t_addresses";
DROP POLICY IF EXISTS "Admin y Operador pueden modificar direcciones" ON "3t_addresses";

CREATE POLICY "Usuarios autenticados pueden leer direcciones" 
ON "3t_addresses"
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM "3t_users" WHERE id = auth.uid())
);

CREATE POLICY "Admin y Operador pueden modificar direcciones" 
ON "3t_addresses"
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

-- Políticas para 3t_products (Productos)
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer productos" ON "3t_products";
DROP POLICY IF EXISTS "Admin y Operador pueden modificar productos" ON "3t_products";

CREATE POLICY "Usuarios autenticados pueden leer productos" 
ON "3t_products"
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM "3t_users" WHERE id = auth.uid())
);

CREATE POLICY "Admin y Operador pueden modificar productos" 
ON "3t_products"
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

-- Políticas para 3t_orders (Pedidos)
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer pedidos" ON "3t_orders";
DROP POLICY IF EXISTS "Admin y Operador pueden modificar pedidos" ON "3t_orders";

CREATE POLICY "Usuarios autenticados pueden leer pedidos" 
ON "3t_orders"
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM "3t_users" WHERE id = auth.uid())
);

CREATE POLICY "Admin y Operador pueden modificar pedidos" 
ON "3t_orders"
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

-- Políticas para 3t_suppliers (Proveedores) - Solo Admin y Operador
DROP POLICY IF EXISTS "Admin y Operador pueden ver proveedores" ON "3t_suppliers";
DROP POLICY IF EXISTS "Admin y Operador pueden modificar proveedores" ON "3t_suppliers";

CREATE POLICY "Admin y Operador pueden ver proveedores" 
ON "3t_suppliers"
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

CREATE POLICY "Admin y Operador pueden modificar proveedores" 
ON "3t_suppliers"
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

-- Políticas para 3t_supplier_addresses (Direcciones de Proveedores) - Solo Admin y Operador
DROP POLICY IF EXISTS "Admin y Operador pueden ver direcciones proveedores" ON "3t_supplier_addresses";
DROP POLICY IF EXISTS "Admin y Operador pueden modificar direcciones proveedores" ON "3t_supplier_addresses";

CREATE POLICY "Admin y Operador pueden ver direcciones proveedores" 
ON "3t_supplier_addresses"
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

CREATE POLICY "Admin y Operador pueden modificar direcciones proveedores" 
ON "3t_supplier_addresses"
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

-- Políticas para 3t_purchases (Compras) - Solo Admin y Operador
DROP POLICY IF EXISTS "Admin y Operador pueden ver compras" ON "3t_purchases";
DROP POLICY IF EXISTS "Admin y Operador pueden modificar compras" ON "3t_purchases";

CREATE POLICY "Admin y Operador pueden ver compras" 
ON "3t_purchases"
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

CREATE POLICY "Admin y Operador pueden modificar compras" 
ON "3t_purchases"
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

-- Políticas para 3t_purchase_products - Solo Admin y Operador
DROP POLICY IF EXISTS "Admin y Operador pueden ver productos compras" ON "3t_purchase_products";
DROP POLICY IF EXISTS "Admin y Operador pueden modificar productos compras" ON "3t_purchase_products";

CREATE POLICY "Admin y Operador pueden ver productos compras" 
ON "3t_purchase_products"
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

CREATE POLICY "Admin y Operador pueden modificar productos compras" 
ON "3t_purchase_products"
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

-- Políticas para 3t_quotes (Presupuestos) - Solo Admin
DROP POLICY IF EXISTS "Solo admin puede ver presupuestos" ON "3t_quotes";
DROP POLICY IF EXISTS "Solo admin puede modificar presupuestos" ON "3t_quotes";

CREATE POLICY "Solo admin puede ver presupuestos" 
ON "3t_quotes"
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol = 'admin'
  )
);

CREATE POLICY "Solo admin puede modificar presupuestos" 
ON "3t_quotes"
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol = 'admin'
  )
);

-- Políticas para 3t_quote_items - Solo Admin
DROP POLICY IF EXISTS "Solo admin puede ver items presupuestos" ON "3t_quote_items";
DROP POLICY IF EXISTS "Solo admin puede modificar items presupuestos" ON "3t_quote_items";

CREATE POLICY "Solo admin puede ver items presupuestos" 
ON "3t_quote_items"
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol = 'admin'
  )
);

CREATE POLICY "Solo admin puede modificar items presupuestos" 
ON "3t_quote_items"
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "3t_users" 
    WHERE id = auth.uid() 
    AND rol = 'admin'
  )
);

-- ==========================================
-- PASO 6: Crear usuarios de prueba
-- ==========================================

-- Usuario Admin de prueba
INSERT INTO "3t_users" (id, email, nombre, rol, activo)
VALUES (
  gen_random_uuid(),
  'admin@trestorres.cl',
  'Administrador Sistema',
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE
SET 
  nombre = EXCLUDED.nombre,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo;

-- Usuario Operador de prueba
INSERT INTO "3t_users" (id, email, nombre, rol, activo)
VALUES (
  gen_random_uuid(),
  'operador@trestorres.cl',
  'Operador Sistema',
  'operador',
  true
)
ON CONFLICT (email) DO UPDATE
SET 
  nombre = EXCLUDED.nombre,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo;

-- Usuario Repartidor de prueba
INSERT INTO "3t_users" (id, email, nombre, rol, activo)
VALUES (
  gen_random_uuid(),
  'repartidor@trestorres.cl',
  'Repartidor Sistema',
  'repartidor',
  true
)
ON CONFLICT (email) DO UPDATE
SET 
  nombre = EXCLUDED.nombre,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo;

-- ==========================================
-- PASO 7: Verificar configuración
-- ==========================================

-- Ver usuarios creados
SELECT id, email, nombre, rol, activo, created_at 
FROM "3t_users" 
ORDER BY created_at DESC;

-- Ver políticas RLS activas
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename LIKE '3t_%'
ORDER BY tablename, policyname;

-- ==========================================
-- FIN DE MIGRACIÓN
-- ==========================================

-- NOTA IMPORTANTE:
-- Después de ejecutar este script, necesitas:
-- 1. Crear usuarios en Supabase Auth (auth.users) con los mismos IDs
-- 2. O modificar los IDs en esta tabla para que coincidan con auth.users existentes
-- 3. Actualizar el password de cada usuario en Supabase Auth:
--    - Dashboard de Supabase → Authentication → Users → Reset Password

-- Contraseñas recomendadas temporales:
-- admin@trestorres.cl: AdminTresTorres2025!
-- operador@trestorres.cl: OperadorTresTorres2025!
-- repartidor@trestorres.cl: RepartidorTresTorres2025!


