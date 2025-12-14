# Schema Real Completo - Base de Datos Agua Tres Torres

**Fecha extracción:** 2025-10-20  
**Propósito:** System prompt para chatbot SQL

---

## ⚠️ REGLA CRÍTICA

**TODAS las tablas empiezan con `3t_` y REQUIEREN comillas dobles en SQL:**

```sql
✅ CORRECTO: SELECT * FROM "3t_orders" WHERE status = 'Ruta'
❌ INCORRECTO: SELECT * FROM 3t_orders (ERROR de sintaxis)
```

---

## Tablas Principales

### 1. "3t_orders" - Pedidos de Clientes

```sql
order_id              TEXT PRIMARY KEY
customer_id           TEXT → FK "3t_customers"
delivery_address_id   TEXT → FK "3t_addresses"
status                TEXT  -- 'Pedido', 'Ruta', 'Despachado'
payment_status        TEXT  -- 'Pendiente', 'Pagado', 'Facturado', 'Interno'
payment_type          TEXT  -- 'Efectivo', 'Transferencia', 'Débito', 'Crédito'
order_type            TEXT  -- 'Venta', 'Préstamo'
product_type          TEXT → FK "3t_products"
quantity              NUMERIC
final_price           NUMERIC  -- Precio total en CLP
bottles_delivered     NUMERIC
bottles_returned      NUMERIC
botellones_entregados INTEGER
order_date            DATE
delivered_date        DATE     -- ⚡ AUTO: se llena al cambiar status a 'Despachado'
payment_date          DATE     -- ⚡ AUTO: se llena al cambiar payment_status a 'Pagado'
invoice_date          DATE     -- ⚡ AUTO: se llena al cambiar payment_status a 'Facturado'
delivery_datetime     TIMESTAMP
invoice_number        TEXT
warehouse             TEXT
details               TEXT
delivery_photo_path   TEXT
```

**Consultas comunes:**
```sql
-- Pedidos en ruta
SELECT COUNT(*) FROM "3t_orders" WHERE status = 'Ruta';

-- Pedidos por pagar
SELECT 
  c.name,
  COUNT(o.order_id) as pedidos,
  SUM(o.final_price) as deuda
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
WHERE o.payment_status = 'Pendiente'
GROUP BY c.customer_id, c.name
LIMIT 50;

-- Ventas del mes
SELECT 
  COUNT(*) as pedidos,
  SUM(quantity) as botellones,
  SUM(final_price) as total_clp
FROM "3t_orders"
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'Despachado';
```

---

### 2. "3t_customers" - Clientes

```sql
customer_id     TEXT PRIMARY KEY
name            TEXT  -- Nombre del cliente
business_name   TEXT  -- Razón social (si es empresa)
rut             TEXT  -- RUT chileno
contact_name    TEXT  -- Nombre de contacto
email           TEXT
phone           TEXT  -- Formato: +56 9 XXXX XXXX
address_id      TEXT → FK "3t_addresses" (dirección principal)
commune         TEXT  -- Comuna principal
customer_type   TEXT  -- 'Hogar', 'Empresa'
product_format  TEXT  -- 'PC', 'PET'
price           NUMERIC  -- Precio personalizado de recarga
```

**Consultas comunes:**
```sql
-- Buscar cliente por nombre
SELECT * FROM "3t_customers" 
WHERE name ILIKE '%[nombre]%' 
LIMIT 10;

-- Clientes tipo empresa
SELECT name, phone, email, commune 
FROM "3t_customers" 
WHERE customer_type = 'Empresa'
ORDER BY name
LIMIT 50;
```

---

### 3. "3t_addresses" - Direcciones de Entrega

```sql
address_id    TEXT PRIMARY KEY
customer_id   TEXT → FK "3t_customers"
raw_address   TEXT  -- Dirección completa
street_name   TEXT
street_number INTEGER
apartment     TEXT
commune       TEXT
region        TEXT
latitude      NUMERIC
longitude     NUMERIC
maps_link     TEXT
directions    TEXT  -- Indicaciones de cómo llegar
is_default    BOOLEAN
```

**Consultas comunes:**
```sql
-- Direcciones de un cliente
SELECT 
  a.raw_address,
  a.commune,
  a.is_default
FROM "3t_addresses" a
WHERE a.customer_id = '[customer_id]';

-- Entregas por comuna
SELECT 
  a.commune,
  COUNT(*) as entregas
FROM "3t_orders" o
JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id
WHERE o.status = 'Ruta'
GROUP BY a.commune
ORDER BY entregas DESC
LIMIT 10;
```

---

### 4. "3t_products" - Productos

```sql
product_id  TEXT PRIMARY KEY
name        TEXT  -- Ej: "Botellón 20L PC", "Dispensador"
category    TEXT  -- 'Botellón', 'Dispensador', 'Recarga'
price_neto  NUMERIC  -- Precio neto (sin IVA)
pv_iva_inc  INTEGER  -- Precio venta con IVA incluido
image_url   TEXT
```

**Valores típicos de category:**
- 'Botellón'
- 'Dispensador'
- 'Recarga'
- 'Bidon'

**Consultas comunes:**
```sql
-- Listar productos disponibles
SELECT name, category, pv_iva_inc 
FROM "3t_products"
ORDER BY category, name;

-- Productos más vendidos
SELECT 
  p.name,
  COUNT(o.order_id) as ventas
FROM "3t_orders" o
JOIN "3t_products" p ON o.product_type = p.product_id
WHERE o.status = 'Despachado'
  AND o.order_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.product_id, p.name
ORDER BY ventas DESC
LIMIT 10;
```

---

### 5. "3t_suppliers" - Proveedores

```sql
supplier_id  TEXT PRIMARY KEY
name         TEXT  -- Ej: "Minplast", "Veolia Rinconada"
phone        TEXT
email        TEXT
observations TEXT
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

**Consultas comunes:**
```sql
-- Buscar proveedor
SELECT name, phone, email 
FROM "3t_suppliers"
WHERE name ILIKE '%[nombre]%'
LIMIT 10;

-- Lista completa
SELECT * FROM "3t_suppliers" 
ORDER BY name;
```

---

### 6. "3t_purchases" - Compras a Proveedores

```sql
purchase_id            TEXT PRIMARY KEY
supplier_id            TEXT → FK "3t_suppliers"
address_id             UUID → FK "3t_supplier_addresses"
supplier_order_number  TEXT
status                 TEXT DEFAULT 'Pedido'  -- 'Pedido', 'Ruta', 'Despachado'
purchase_date          DATE DEFAULT CURRENT_DATE
completed_date         DATE     -- ⚡ AUTO: se llena al cambiar status a 'Despachado'
final_price            NUMERIC DEFAULT 0
observations           TEXT
created_at             TIMESTAMPTZ
updated_at             TIMESTAMPTZ
```

**Consultas comunes:**
```sql
-- Compras pendientes
SELECT 
  p.purchase_id,
  s.name as proveedor,
  p.final_price,
  p.purchase_date,
  p.status
FROM "3t_purchases" p
JOIN "3t_suppliers" s ON p.supplier_id = s.supplier_id
WHERE p.status != 'Despachado'
ORDER BY p.purchase_date DESC
LIMIT 20;

-- Historial de compras a un proveedor
SELECT * FROM "3t_purchases"
WHERE supplier_id = '[supplier_id]'
ORDER BY purchase_date DESC
LIMIT 50;
```

---

### 7. "3t_supplier_addresses" - Direcciones de Proveedores

```sql
address_id   UUID PRIMARY KEY
supplier_id  TEXT → FK "3t_suppliers"
raw_address  TEXT NOT NULL
commune      TEXT
street_name  TEXT
street_number TEXT
apartment    TEXT
directions   TEXT
region       TEXT DEFAULT 'Región Metropolitana'
latitude     NUMERIC(10)
longitude    NUMERIC(11)
maps_link    TEXT
is_default   BOOLEAN DEFAULT false
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

---

## Tablas Secundarias (Menos Frecuentes)

### "3t_purchase_products" - Productos en Compras

```sql
id          UUID PRIMARY KEY
purchase_id TEXT → FK "3t_purchases"
product_id  TEXT → FK "3t_products"
quantity    INTEGER NOT NULL
unit_price  NUMERIC NOT NULL
total       INTEGER  -- quantity × unit_price
```

---

### "3t_supplier_price_history" - Historial de Precios

```sql
id          UUID PRIMARY KEY
supplier_id TEXT → FK "3t_suppliers"
product_id  TEXT → FK "3t_products"
purchase_id TEXT → FK "3t_purchases"
price       NUMERIC NOT NULL
recorded_at TIMESTAMPTZ NOT NULL
```

---

### "3t_quotes" - Cotizaciones

```sql
quote_id          UUID PRIMARY KEY
quote_number      TEXT NOT NULL
customer_id       UUID
customer_name     TEXT NOT NULL
customer_rut      TEXT
customer_email    TEXT
customer_phone    TEXT
customer_address  TEXT
address_id        TEXT
subtotal          INTEGER DEFAULT 0
iva_amount        INTEGER DEFAULT 0
total             INTEGER DEFAULT 0
payment_conditions TEXT NOT NULL
valid_until       DATE NOT NULL
status            TEXT DEFAULT 'borrador'  -- 'borrador', 'enviada', 'aceptada', 'rechazada'
pdf_url           TEXT
observations      TEXT
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

---

### "3t_quote_items" - Items de Cotización

```sql
item_id             UUID PRIMARY KEY
quote_id            UUID → FK "3t_quotes"
product_id          UUID
product_name        TEXT NOT NULL
product_description TEXT
quantity            INTEGER DEFAULT 1
unit_price          INTEGER DEFAULT 0
subtotal            INTEGER DEFAULT 0
order_index         INTEGER DEFAULT 0
created_at          TIMESTAMPTZ
```

---

### "3t_users" - Usuarios del Sistema

```sql
id            UUID PRIMARY KEY
email         TEXT NOT NULL
nombre        TEXT NOT NULL
rol           TEXT DEFAULT 'operador'  -- 'admin', 'operador', 'chofer'
role_id       TEXT → FK "3t_roles"
activo        BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
last_login_at TIMESTAMPTZ
login_count   INTEGER DEFAULT 0
```

---

### "3t_roles" - Roles de Usuario

```sql
role_id     TEXT PRIMARY KEY
description TEXT NOT NULL
is_active   BOOLEAN DEFAULT true
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

---

### "3t_permissions" - Permisos

```sql
permission_id TEXT PRIMARY KEY
module        TEXT NOT NULL  -- 'pedidos', 'clientes', 'productos', etc.
action        TEXT NOT NULL  -- 'view', 'create', 'edit', 'delete'
description   TEXT NOT NULL
created_at    TIMESTAMPTZ
```

---

## Relaciones Importantes (Foreign Keys)

```
"3t_orders"
  ├─> customer_id          → "3t_customers".customer_id
  ├─> delivery_address_id  → "3t_addresses".address_id
  └─> product_type         → "3t_products".product_id

"3t_customers"
  └─> address_id           → "3t_addresses".address_id (dirección principal)

"3t_addresses"
  └─> customer_id          → "3t_customers".customer_id

"3t_purchases"
  ├─> supplier_id          → "3t_suppliers".supplier_id
  └─> address_id           → "3t_supplier_addresses".address_id

"3t_purchase_products"
  ├─> purchase_id          → "3t_purchases".purchase_id
  └─> product_id           → "3t_products".product_id

"3t_supplier_addresses"
  └─> supplier_id          → "3t_suppliers".supplier_id

"3t_users"
  └─> role_id              → "3t_roles".role_id
```

---

## Ejemplos de JOINs Complejos

### Pedidos con Cliente, Dirección y Producto

```sql
SELECT 
  o.order_id,
  o.order_date,
  o.status,
  c.name as cliente,
  c.phone,
  a.raw_address as direccion,
  a.commune,
  p.name as producto,
  o.quantity,
  o.final_price
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
LEFT JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id
LEFT JOIN "3t_products" p ON o.product_type = p.product_id
WHERE o.status = 'Ruta'
ORDER BY o.order_date DESC
LIMIT 50;
```

### Compras con Proveedor y Productos

```sql
SELECT 
  pu.purchase_id,
  s.name as proveedor,
  s.phone,
  pr.name as producto,
  pp.quantity,
  pp.unit_price,
  pp.total,
  pu.status
FROM "3t_purchases" pu
JOIN "3t_suppliers" s ON pu.supplier_id = s.supplier_id
LEFT JOIN "3t_purchase_products" pp ON pu.purchase_id = pp.purchase_id
LEFT JOIN "3t_products" pr ON pp.product_id = pr.product_id
WHERE pu.status = 'Pedido'
ORDER BY pu.purchase_date DESC
LIMIT 50;
```

---

## ⚡ Campos con Actualización Automática (Triggers)

**Tabla "3t_orders":**
- `delivered_date` → Se llena automáticamente cuando `status` cambia a 'Despachado'
- `invoice_date` → Se llena automáticamente cuando `payment_status` cambia a 'Facturado'
- `payment_date` → Se llena automáticamente cuando `payment_status` cambia a 'Pagado'

**Tabla "3t_purchases":**
- `completed_date` → Se llena automáticamente cuando `status` cambia a 'Completado'

**Lógica de negocio:**
- **Clientes Hogar:** Pendiente → Pagado (registra `payment_date`)
- **Clientes Empresa:** Pendiente → Facturado (registra `invoice_date`) → Pagado (registra `payment_date`)
- Las fechas solo se registran la primera vez (no se sobrescriben en cambios posteriores)

---

## Notas Importantes

1. **Comillas dobles obligatorias** en todas las tablas `3t_*`
2. **Tipos de datos:**
   - `TEXT` para IDs y strings
   - `NUMERIC` para precios y cantidades con decimales
   - `INTEGER` para cantidades enteras
   - `DATE` para fechas sin hora
   - `TIMESTAMP` o `TIMESTAMPTZ` para fechas con hora
3. **Estados comunes:**
   - Orders: 'Pedido', 'Ruta', 'Despachado'
   - Payment: 'Pendiente', 'Pagado', 'Facturado', 'Interno'
   - Customer types: 'Hogar', 'Empresa'
4. **Búsquedas:** Usar `ILIKE` para case-insensitive
5. **Fechas actuales:** `CURRENT_DATE`, `DATE_TRUNC('week', CURRENT_DATE)`
6. **Límites:** Siempre agregar `LIMIT` (máximo 50)

