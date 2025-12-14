# 🗄️ Database Schema para AI Agent - Agua Tres Torres

**Propósito:** Este documento contiene el schema completo de la base de datos para que el AI Agent (Claude) pueda generar consultas SQL precisas.

**Última actualización:** Octubre 17, 2025

---

## ⚠️ REGLA CRÍTICA: NOMBRES DE TABLAS CON NÚMEROS

**TODAS las tablas en este sistema empiezan con "3t_" (número) y PostgreSQL REQUIERE comillas dobles:**

```sql
-- ✅ CORRECTO
SELECT * FROM "3t_orders" LIMIT 10;

-- ❌ INCORRECTO - ERROR DE SINTAXIS
SELECT * FROM 3t_orders LIMIT 10;
```

**Regla de oro:** Siempre usar comillas dobles `"3t_nombre_tabla"` en TODAS las tablas.

---

## 📊 Tablas Principales del Sistema

### 1. "3t_orders" - Pedidos de Clientes

Tabla central del sistema que registra todos los pedidos de botellones.

```sql
CREATE TABLE "3t_orders" (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT,                    -- FK → "3t_customers"
  delivery_address_id TEXT,            -- FK → "3t_addresses"
  
  -- Estado del pedido
  status TEXT,                         -- 'Pedido', 'Ruta', 'Despachado'
  order_type TEXT,                     -- 'Venta', 'Préstamo'
  
  -- Información del producto
  product_type TEXT,                   -- Tipo de botellón
  quantity NUMERIC,                    -- Cantidad de botellones
  bottles_delivered NUMERIC,           -- Botellones entregados
  bottles_returned NUMERIC,            -- Botellones devueltos (vacíos)
  
  -- Información de pago
  payment_status TEXT,                 -- 'Pendiente', 'Pagado', 'Facturado', 'Interno'
  payment_type TEXT,                   -- 'Efectivo', 'Transferencia', 'Débito', 'Crédito'
  final_price NUMERIC,                 -- Precio total en CLP
  invoice_number TEXT,                 -- Número de factura/boleta
  
  -- Fechas
  order_date DATE,                     -- Fecha del pedido
  delivered_date DATE,                 -- Fecha de entrega
  payment_date DATE,                   -- Fecha de pago
  delivery_datetime TIMESTAMP,         -- Hora exacta de entrega
  
  -- Otros
  details TEXT,                        -- Observaciones
  warehouse TEXT,                      -- Bodega de origen
  delivery_photo_path TEXT             -- Path de foto de entrega
);
```

**Relaciones:**
- `customer_id` → `"3t_customers"(customer_id)`
- `delivery_address_id` → `"3t_addresses"(address_id)`

**Valores enum:**
- `status`: 'Pedido', 'Ruta', 'Despachado'
- `payment_status`: 'Pendiente', 'Pagado', 'Facturado', 'Interno'
- `payment_type`: 'Efectivo', 'Transferencia', 'Débito', 'Crédito'
- `order_type`: 'Venta', 'Préstamo'

---

### 2. "3t_customers" - Clientes

Información de clientes (hogares y empresas).

```sql
CREATE TABLE "3t_customers" (
  customer_id TEXT PRIMARY KEY,
  
  -- Identificación
  name TEXT,                           -- Nombre del cliente
  business_name TEXT,                  -- Razón social (solo empresas)
  rut TEXT,                            -- RUT chileno
  customer_type TEXT,                  -- 'Hogar' o 'Empresa'
  
  -- Contacto
  email TEXT,
  phone TEXT,                          -- Formato: +56 9 XXXX XXXX
  address_id TEXT,                     -- FK → "3t_addresses" (dirección principal)
  commune TEXT,                        -- Comuna
  
  -- Preferencias
  product_format TEXT,                 -- 'PC' o 'PET'
  price NUMERIC                        -- Precio personalizado (opcional)
);
```

**Relaciones:**
- `address_id` → `"3t_addresses"(address_id)`

**Valores enum:**
- `customer_type`: 'Hogar', 'Empresa'
- `product_format`: 'PC', 'PET'

---

### 3. "3t_addresses" - Direcciones

Direcciones de entrega de clientes (un cliente puede tener múltiples direcciones).

```sql
CREATE TABLE "3t_addresses" (
  address_id TEXT PRIMARY KEY,
  customer_id TEXT,                    -- FK → "3t_customers"
  
  -- Dirección
  raw_address TEXT,                    -- Dirección completa como texto
  street_name TEXT,                    -- Nombre de calle
  street_number INTEGER,               -- Número
  apartment TEXT,                      -- Depto/Of (opcional)
  commune TEXT,                        -- Comuna
  region TEXT,                         -- Región
  
  -- Información adicional
  directions TEXT,                     -- Indicaciones de llegada
  is_default BOOLEAN,                  -- ¿Es la dirección principal?
  
  -- Geolocalización
  latitude NUMERIC,                    -- Latitud (decimal)
  longitude NUMERIC,                   -- Longitud (decimal)
  maps_link TEXT                       -- URL de Google Maps
);
```

**Relaciones:**
- `customer_id` → `"3t_customers"(customer_id)`

---

### 4. "3t_purchases" - Compras a Proveedores

Órdenes de compra de productos a proveedores.

```sql
CREATE TABLE "3t_purchases" (
  purchase_id TEXT PRIMARY KEY,
  supplier_id TEXT,                    -- FK → "3t_suppliers"
  address_id UUID,                     -- FK → "3t_supplier_addresses"
  
  -- Estado
  status TEXT,                         -- 'Pedido', 'Ruta', 'Despachado'
  supplier_order_number TEXT,          -- Número de orden del proveedor
  
  -- Información financiera
  final_price NUMERIC,                 -- Total en CLP
  
  -- Fechas
  purchase_date DATE,                  -- Fecha de compra
  completed_date DATE,                 -- Fecha de recepción
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  -- Otros
  observations TEXT                    -- Notas sobre la compra
);
```

**Relaciones:**
- `supplier_id` → `"3t_suppliers"(supplier_id)`
- `address_id` → `"3t_supplier_addresses"(address_id)`

**Valores enum:**
- `status`: 'Pedido', 'Ruta', 'Despachado'

---

### 5. "3t_purchase_products" - Productos en Compras

Detalle de productos incluidos en cada orden de compra (relación muchos-a-muchos).

```sql
CREATE TABLE "3t_purchase_products" (
  id UUID PRIMARY KEY,
  purchase_id TEXT,                    -- FK → "3t_purchases"
  product_id TEXT,                     -- FK → "3t_products"
  
  quantity INTEGER,                    -- Cantidad comprada
  unit_price NUMERIC,                  -- Precio unitario
  total INTEGER                        -- Total = quantity × unit_price
);
```

**Relaciones:**
- `purchase_id` → `"3t_purchases"(purchase_id)`
- `product_id` → `"3t_products"(product_id)`

---

### 6. "3t_suppliers" - Proveedores

Información de proveedores (ej: Vanni Ltda., Plasticos SP).

```sql
CREATE TABLE "3t_suppliers" (
  supplier_id TEXT PRIMARY KEY,
  name TEXT,                           -- Nombre del proveedor
  phone TEXT,                          -- Teléfono
  email TEXT,                          -- Email
  observations TEXT,                   -- Notas
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Ejemplos de proveedores:**
- Vanni Ltda.
- VPlasticos SP

---

### 7. "3t_supplier_addresses" - Direcciones de Proveedores

Direcciones de proveedores para compras.

```sql
CREATE TABLE "3t_supplier_addresses" (
  address_id UUID PRIMARY KEY,
  supplier_id TEXT,                    -- FK → "3t_suppliers"
  
  raw_address TEXT,
  street_name TEXT,
  street_number TEXT,
  apartment TEXT,
  commune TEXT,
  region TEXT,
  directions TEXT,
  
  latitude NUMERIC,
  longitude NUMERIC,
  maps_link TEXT,
  is_default BOOLEAN,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

### 8. "3t_products" - Catálogo de Productos

Productos disponibles para venta.

```sql
CREATE TABLE "3t_products" (
  product_id TEXT PRIMARY KEY,
  name TEXT,                           -- Nombre del producto
  category TEXT,                       -- Categoría
  image_url TEXT,                      -- URL de imagen
  
  -- Precios
  price_neto NUMERIC,                  -- Precio neto (sin IVA)
  pv_iva_inc INTEGER                   -- Precio venta IVA incluido
);
```

---

### 9. "3t_invoices" - Facturas (Sistema Profesional)

Facturas emitidas a clientes. Sistema N:M que soporta facturación parcial y consolidación.

```sql
CREATE TABLE "3t_invoices" (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,        -- Número único de factura
  invoice_date DATE NOT NULL,                 -- Fecha de emisión
  
  -- Montos
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,   -- Subtotal sin IVA
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- IVA (19%)
  total_amount DECIMAL(12,2) NOT NULL,          -- Total con IVA
  
  -- Clasificación
  status TEXT DEFAULT 'vigente',               -- 'vigente', 'anulada', 'pendiente'
  invoice_type TEXT DEFAULT 'venta',           -- 'venta', 'exenta', 'boleta'
  
  -- Adicionales
  notes TEXT,
  pdf_url TEXT,                                -- URL del PDF generado
  
  -- Auditoría
  created_by UUID,                             -- FK → "3t_users"
  updated_by UUID,                             -- FK → "3t_users"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Consultas comunes:**
```sql
-- Facturas vigentes del mes
SELECT 
  invoice_number,
  invoice_date,
  total_amount,
  status
FROM "3t_invoices"
WHERE invoice_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'vigente'
ORDER BY invoice_date DESC
LIMIT 50;

-- Total facturado en período
SELECT 
  COUNT(*) as total_facturas,
  SUM(subtotal) as sin_iva,
  SUM(tax_amount) as iva,
  SUM(total_amount) as total
FROM "3t_invoices"
WHERE invoice_date BETWEEN '2025-01-01' AND '2025-01-31'
  AND status = 'vigente';
```

---

### 10. "3t_order_invoices" - Relación Pedidos-Facturas

Tabla de relación N:M entre pedidos y facturas. Permite facturación parcial y consolidación.

```sql
CREATE TABLE "3t_order_invoices" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,                      -- FK → "3t_orders"
  invoice_id UUID NOT NULL,                    -- FK → "3t_invoices"
  amount_invoiced DECIMAL(12,2) NOT NULL,      -- Monto facturado de este pedido
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, invoice_id)
);
```

**Consultas comunes:**
```sql
-- Pedidos incluidos en una factura
SELECT 
  oi.amount_invoiced,
  o.order_id,
  o.order_date,
  c.name as cliente,
  p.name as producto
FROM "3t_order_invoices" oi
JOIN "3t_orders" o ON oi.order_id = o.order_id
JOIN "3t_customers" c ON o.customer_id = c.customer_id
JOIN "3t_products" p ON o.product_type = p.product_id
WHERE oi.invoice_id = '[invoice_id]';

-- Facturas de un pedido y monto pendiente
SELECT 
  o.final_price as monto_total,
  COALESCE(SUM(oi.amount_invoiced), 0) as monto_facturado,
  o.final_price - COALESCE(SUM(oi.amount_invoiced), 0) as monto_pendiente
FROM "3t_orders" o
LEFT JOIN "3t_order_invoices" oi ON o.order_id = oi.order_id
LEFT JOIN "3t_invoices" i ON oi.invoice_id = i.invoice_id AND i.status = 'vigente'
WHERE o.order_id = '[order_id]'
GROUP BY o.order_id, o.final_price;
```

**Vistas útiles:**
- `v_invoices_with_orders`: Facturas con pedidos relacionados en JSON
- `v_orders_with_invoices`: Pedidos con total facturado y saldo pendiente

---

### 11. "3t_quotes" - Presupuestos

Presupuestos generados para clientes.

```sql
CREATE TABLE "3t_quotes" (
  quote_id UUID PRIMARY KEY,
  quote_number TEXT,                   -- Número de presupuesto
  
  -- Cliente
  customer_id UUID,                    -- FK → "3t_customers" (opcional)
  customer_name TEXT,
  customer_rut TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  address_id TEXT,                     -- FK → "3t_addresses"
  
  -- Montos
  subtotal INTEGER,                    -- Subtotal sin IVA
  iva_amount INTEGER,                  -- Monto del IVA
  total INTEGER,                       -- Total con IVA
  
  -- Condiciones
  payment_conditions TEXT,             -- Condiciones de pago
  valid_until DATE,                    -- Válido hasta
  status TEXT,                         -- Estado del presupuesto
  
  -- Archivos
  pdf_url TEXT,                        -- URL del PDF generado
  observations TEXT,                   -- Observaciones
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

### 10. "3t_quote_items" - Items de Presupuestos

Items individuales de cada presupuesto.

```sql
CREATE TABLE "3t_quote_items" (
  item_id UUID PRIMARY KEY,
  quote_id UUID,                       -- FK → "3t_quotes"
  product_id UUID,                     -- FK → "3t_products" (opcional)
  
  product_name TEXT,
  product_description TEXT,
  quantity INTEGER,
  unit_price INTEGER,
  subtotal INTEGER,                    -- quantity × unit_price
  order_index INTEGER,                 -- Orden de visualización
  
  created_at TIMESTAMPTZ
);
```

---

### 11. "3t_users" - Usuarios del Sistema

Usuarios con acceso al sistema.

```sql
CREATE TABLE "3t_users" (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  nombre TEXT,
  
  -- Roles y permisos
  rol TEXT,                            -- Rol legacy
  role_id TEXT,                        -- FK → "3t_roles"
  activo BOOLEAN,
  
  -- Auditoría
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER
);
```

---

### 12. "3t_roles" - Roles del Sistema

Roles de usuario (Admin, Operador, etc.).

```sql
CREATE TABLE "3t_roles" (
  role_id TEXT PRIMARY KEY,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

### 13. "3t_permissions" - Permisos

Permisos granulares del sistema.

```sql
CREATE TABLE "3t_permissions" (
  permission_id TEXT PRIMARY KEY,
  module TEXT,                         -- Módulo (pedidos, clientes, etc.)
  action TEXT,                         -- Acción (view, create, edit, delete)
  description TEXT,
  created_at TIMESTAMPTZ
);
```

---

### 14. "3t_saved_routes" - Rutas Guardadas

Rutas optimizadas guardadas para entregas (solo 1 activa a la vez).

```sql
CREATE TABLE "3t_saved_routes" (
  route_id UUID PRIMARY KEY,
  route_data JSONB,                    -- Datos completos de la ruta
  total_orders INTEGER,                -- Total de pedidos
  total_routes INTEGER,                -- Número de rutas
  is_active BOOLEAN,                   -- Solo 1 puede estar activo
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 📈 Vistas Importantes

### Vista: "3t_dashboard_ventas"

Vista pre-calculada con JOINs para reportes de ventas (muy útil para análisis).

```sql
-- Esta vista ya tiene los JOINs hechos
SELECT 
  order_id,
  order_date,
  delivered_date,
  status,
  payment_status,
  payment_type,
  final_price,
  quantity,
  
  -- Datos del cliente (ya con JOIN)
  customer_id,
  customer_name,
  customer_type,
  customer_phone,
  
  -- Datos de dirección (ya con JOIN)
  address_id,
  raw_address,
  commune,
  latitude,
  longitude,
  
  -- Datos del producto (ya con JOIN)
  product_name,
  product_category,
  
  -- Métricas calculadas
  tiempo_entrega_minutos,
  precio_con_iva,
  precio_neto
FROM "3t_dashboard_ventas";
```

**Ventaja:** Esta vista ya tiene todos los JOINs hechos, úsala cuando necesites análisis de ventas completo.

---

## 🔗 Relaciones Más Comunes (JOINs)

### 1. Pedidos con Clientes

```sql
SELECT o.order_id, c.name, o.final_price
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id;
```

### 2. Pedidos con Clientes y Direcciones

```sql
SELECT 
  o.order_id,
  c.name AS cliente,
  a.raw_address AS direccion,
  a.commune AS comuna
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
LEFT JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id;
```

### 3. Compras con Proveedores

```sql
SELECT 
  p.purchase_id,
  s.name AS proveedor,
  p.final_price
FROM "3t_purchases" p
JOIN "3t_suppliers" s ON p.supplier_id = s.supplier_id;
```

### 4. Compras con Detalle de Productos

```sql
SELECT 
  p.purchase_id,
  s.name AS proveedor,
  prod.name AS producto,
  pp.quantity,
  pp.unit_price
FROM "3t_purchases" p
JOIN "3t_suppliers" s ON p.supplier_id = s.supplier_id
JOIN "3t_purchase_products" pp ON p.purchase_id = pp.purchase_id
JOIN "3t_products" prod ON pp.product_id = prod.product_id;
```

---

## 📅 Trabajando con Fechas

### Fecha actual

```sql
CURRENT_DATE          -- 2025-10-17
CURRENT_TIMESTAMP     -- 2025-10-17 14:30:00
```

### Filtros de tiempo comunes

```sql
-- Hoy
WHERE order_date = CURRENT_DATE

-- Esta semana (lunes a hoy)
WHERE order_date >= DATE_TRUNC('week', CURRENT_DATE)

-- Este mes
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)

-- Últimos 7 días
WHERE order_date >= CURRENT_DATE - INTERVAL '7 days'

-- Últimos 30 días
WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'

-- Entre fechas
WHERE order_date BETWEEN '2025-10-01' AND '2025-10-31'
```

### Formateo de fechas

```sql
-- Formato chileno: DD/MM/YYYY
TO_CHAR(order_date, 'DD/MM/YYYY')

-- Nombre del mes en español (requiere configuración)
TO_CHAR(order_date, 'TMMonth YYYY')

-- Día de la semana
TO_CHAR(order_date, 'Day')
```

---

## 💰 Formato de Montos (CLP)

Los precios están en pesos chilenos (CLP) sin decimales.

```sql
-- Sumar ventas
SUM(final_price) as total_ventas

-- Formatear en respuesta
-- $15000 → "$15.000 CLP"
```

---

## 🎯 Consultas Ejemplo por Caso de Uso

### Caso 1: Pedidos en Ruta

```sql
SELECT 
  o.order_id,
  c.name AS cliente,
  a.raw_address AS direccion,
  o.quantity AS botellones
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
LEFT JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id
WHERE o.status = 'Ruta'
ORDER BY o.order_date DESC
LIMIT 50;
```

### Caso 2: Cuentas por Cobrar

```sql
SELECT 
  c.name AS cliente,
  c.phone AS telefono,
  COUNT(o.order_id) AS pedidos_pendientes,
  SUM(o.final_price) AS deuda_total
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
WHERE o.payment_status = 'Pendiente'
GROUP BY c.customer_id, c.name, c.phone
ORDER BY deuda_total DESC
LIMIT 50;
```

### Caso 3: Ventas del Mes

```sql
SELECT 
  COUNT(*) AS total_pedidos,
  SUM(quantity) AS botellones_vendidos,
  SUM(final_price) AS ventas_totales
FROM "3t_orders"
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'Despachado'
LIMIT 1;
```

### Caso 4: Top Clientes

```sql
SELECT 
  c.name AS cliente,
  c.customer_type AS tipo,
  COUNT(o.order_id) AS total_pedidos,
  SUM(o.final_price) AS ventas_totales
FROM "3t_customers" c
JOIN "3t_orders" o ON c.customer_id = o.customer_id
WHERE o.status = 'Despachado'
GROUP BY c.customer_id, c.name, c.customer_type
ORDER BY ventas_totales DESC
LIMIT 10;
```

### Caso 5: Contacto de Cliente

```sql
SELECT 
  name AS nombre,
  phone AS telefono,
  email,
  commune AS comuna
FROM "3t_customers"
WHERE name ILIKE '%veolia%'
LIMIT 10;
```

---

## ⚠️ Consideraciones Importantes

### 1. NULL Values

Muchos campos pueden ser NULL, usa COALESCE cuando sea necesario:

```sql
COALESCE(c.phone, 'Sin teléfono') AS telefono
COALESCE(o.payment_date, 'Sin fecha') AS fecha_pago
```

### 2. Case Sensitivity

Para búsquedas sin distinción de mayúsculas:

```sql
WHERE name ILIKE '%veolia%'  -- No distingue mayúsculas
WHERE name LIKE '%Veolia%'    -- Distingue mayúsculas
```

### 3. LIMIT es Obligatorio

SIEMPRE agregar LIMIT para evitar queries muy grandes:

```sql
SELECT * FROM "3t_orders" LIMIT 100;  -- ✅ Correcto
SELECT * FROM "3t_orders";            -- ❌ Evitar
```

### 4. Agregaciones Requieren GROUP BY

```sql
-- ✅ Correcto
SELECT customer_id, COUNT(*)
FROM "3t_orders"
GROUP BY customer_id;

-- ❌ Error: falta GROUP BY
SELECT customer_id, COUNT(*)
FROM "3t_orders";
```

---

## 📝 Resumen de Reglas SQL

1. ✅ **SIEMPRE usar comillas dobles:** `"3t_orders"`
2. ✅ **SIEMPRE agregar LIMIT:** máximo 100 registros
3. ✅ **SOLO SELECT:** nunca INSERT, UPDATE, DELETE
4. ✅ **Usar JOINs explícitos:** preferir INNER JOIN / LEFT JOIN
5. ✅ **Manejar NULL:** usar COALESCE cuando sea necesario
6. ✅ **Fechas en español:** formatear con TO_CHAR
7. ✅ **Montos en CLP:** sin decimales, formato chileno

---

**Fin del documento**


