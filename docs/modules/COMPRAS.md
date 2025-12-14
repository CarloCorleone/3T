# 🛒 Módulo: Compras

**Ruta:** `/compras`  
**Archivo:** `/app/compras/page.tsx`  
**Tipo:** Página dinámica con sistema de órdenes multi-producto

---

## 📖 Descripción General

El módulo **Compras** permite gestionar órdenes de compra a proveedores con **funcionalidad completa CRUD** (Crear, Leer, Actualizar, Eliminar), **sistema de carrito multi-producto**, y **registro automático de historial de precios** por proveedor y producto.

### Propósito
- Crear órdenes de compra con múltiples productos
- Registrar precios de compra por proveedor y producto
- Gestionar estados de compra (Pedido → Ruta → Completado)
- Mantener historial de precios para análisis de tendencias
- Integrar con optimizador de rutas para incluir paradas de compra

### Audiencia
- **Compras**: Crear y gestionar órdenes de compra
- **Administrativos**: Revisar historial y estados
- **Logística**: Coordinar rutas que incluyen compras
- **Finanzas**: Analizar precios históricos

---

## ✨ Funcionalidades Principales

### 1. Gestión de Órdenes de Compra (CRUD Completo)

#### Crear Orden de Compra
- Modal con formulario completo
- **Campos principales**:
  - Proveedor (requerido) - Dropdown de proveedores
  - Dirección - Auto-selección de dirección predeterminada
  - Nº Orden del Proveedor - Número de la orden que da el proveedor
  - Fecha de Compra (default: hoy)
  - Estado (Pedido/Ruta/Completado)
  - Observaciones
- **Carrito multi-producto**:
  - Agregar múltiples productos
  - Ingresar cantidad y precio unitario por producto
  - Cálculo automático de subtotales y total
  - Ver historial de precios al ingresar precio
- Validación: Mínimo 1 producto requerido
- Generación automática de ID único (8 caracteres)

#### Listar Órdenes
- Tabla con todas las órdenes de compra
- **Búsqueda en tiempo real**:
  - Por nombre de proveedor
  - Por número de orden del proveedor
  - Por ID de compra
- **Información mostrada**:
  - Fecha de compra
  - Proveedor
  - Nº Orden del proveedor
  - Cantidad de productos
  - Total
  - Estado con badge visual
- Botones de acción: Ver Detalles, Editar, Eliminar

#### Ver Detalles de Compra
- Modal con información completa:
  - Datos del proveedor
  - Dirección de recogida
  - Fecha de compra
  - Nº Orden del proveedor
  - Estado actual
  - **Lista de productos**:
    - Nombre del producto
    - Cantidad
    - Precio unitario
    - Subtotal por producto
    - **Total general**
  - Observaciones

#### Editar Orden de Compra
- Modal con datos pre-cargados
- Permite modificar:
  - Proveedor
  - Dirección
  - Nº Orden
  - Estado
  - Productos (agregar, modificar, eliminar)
  - Observaciones
- Actualiza historial de precios si cambian

#### Eliminar Orden
- Modal de confirmación
- Advertencia: Se eliminarán todos los productos asociados
- Eliminación en cascada de `3t_purchase_products`
- No requiere validaciones adicionales (compras ya completadas no se deberían eliminar)

### 2. Sistema de Carrito Multi-Producto ⭐

#### Agregar Producto al Carrito

1. **Seleccionar producto** del dropdown
2. **El sistema agrega con valores iniciales**:
   - Cantidad: 1
   - Precio unitario: 0 (para que el usuario lo ingrese)
3. **Producto aparece en tabla del carrito**

#### Tabla del Carrito

```
┌────────────────────────────────────────────────────────────────┐
│ Producto        │ Cantidad │ Precio Unitario    │ Subtotal    │
├────────────────────────────────────────────────────────────────┤
│ Vasos 200cc     │ [1000]   │ $[18] [📊]        │ $18,000     │[🗑️]
│ Bomba USB       │ [50]     │ $[4,000] [📊]     │ $200,000    │[🗑️]
│ Dispensador     │ [5]      │ $[90,000] [📊]    │ $450,000    │[🗑️]
├────────────────────────────────────────────────────────────────┤
│                              TOTAL: $668,000                    │
└────────────────────────────────────────────────────────────────┘

[📊] = Botón "Ver Historial de Precios"
[🗑️] = Botón "Eliminar del carrito"
```

**Funcionalidades**:
- ✅ Editar cantidad directamente en la tabla
- ✅ Editar precio unitario directamente en la tabla
- ✅ Ver historial de precios del producto con ese proveedor
- ✅ Eliminar producto del carrito
- ✅ Cálculo automático de subtotales y total
- ✅ Validación: No se puede agregar producto duplicado

### 3. Historial de Precios ⭐

#### Registro Automático

Al guardar una orden de compra, se registran automáticamente los precios:

```typescript
// Por cada producto en el carrito:
const priceHistoryData = productosCarrito.map(p => ({
  supplier_id: formData.supplier_id,
  product_id: p.product_id,
  price: p.unit_price,
  recorded_at: NOW(),
  purchase_id: purchaseId
}))

await supabase
  .from('3t_supplier_price_history')
  .insert(priceHistoryData)
```

#### Ver Historial

Al hacer clic en el botón [📊] junto al precio:

1. **Modal "Historial de Precios"** se abre
2. **Muestra últimos 10 precios** registrados con ese proveedor
3. **Información mostrada**:
   - Fecha y hora del registro
   - Precio en ese momento
   - Ordenados de más reciente a más antiguo

```
┌─────────────────────────────────────────┐
│  Historial de Precios                   │
│  Vasos 200cc - Distribuidora XYZ        │
├─────────────────────────────────────────┤
│ Fecha           │ Precio                │
├─────────────────────────────────────────┤
│ 13/10/2025 14:30│ $18                   │
│ 05/10/2025 10:15│ $17                   │
│ 28/09/2025 16:45│ $19                   │
│ 20/09/2025 11:20│ $17                   │
└─────────────────────────────────────────┘
```

**Beneficios**:
- 📊 Ver tendencia de precios
- 💡 Detectar aumentos o bajas
- ✅ Validar precio antes de comprar
- 📈 Análisis de costos históricos

---

## 🗄️ Estructura de Datos

### Tabla: `3t_purchases`

```sql
CREATE TABLE 3t_purchases (
  purchase_id TEXT PRIMARY KEY,                    -- ID único (8 chars)
  supplier_id TEXT REFERENCES 3t_suppliers(supplier_id) ON DELETE RESTRICT,
  address_id UUID REFERENCES 3t_supplier_addresses(address_id) ON DELETE RESTRICT,
  supplier_order_number TEXT,                      -- Nº Orden del proveedor
  status TEXT CHECK (status IN ('Pedido', 'Ruta', 'Completado')) DEFAULT 'Pedido',
  purchase_date DATE DEFAULT CURRENT_DATE,
  completed_date DATE,                             -- Se llena al marcar Completado
  final_price NUMERIC DEFAULT 0,                   -- Suma de todos los productos
  observations TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: `3t_purchase_products`

```sql
CREATE TABLE 3t_purchase_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id TEXT REFERENCES 3t_purchases(purchase_id) ON DELETE CASCADE,
  product_id TEXT REFERENCES 3t_products(product_id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total INTEGER GENERATED ALWAYS AS (CAST(quantity * unit_price AS INTEGER)) STORED,
  UNIQUE(purchase_id, product_id)                  -- No duplicados
);
```

### Tabla: `3t_supplier_price_history`

```sql
CREATE TABLE 3t_supplier_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id TEXT REFERENCES 3t_suppliers(supplier_id) ON DELETE CASCADE,
  product_id TEXT REFERENCES 3t_products(product_id) ON DELETE CASCADE,
  price NUMERIC NOT NULL CHECK (price >= 0),
  recorded_at TIMESTAMP DEFAULT NOW(),
  purchase_id TEXT REFERENCES 3t_purchases(purchase_id) ON DELETE SET NULL
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_price_history_supplier_product 
ON 3t_supplier_price_history(supplier_id, product_id, recorded_at DESC);
```

### Relaciones

- **1 Compra → N Productos**: Una compra puede tener múltiples productos
- **1 Proveedor → N Compras**: Un proveedor puede tener múltiples órdenes
- **1 Dirección → N Compras**: Una dirección puede ser usada en múltiples compras
- **1 Compra → N Registros de Precio**: Cada producto genera un registro de precio

---

## 🎨 Interfaz de Usuario

### Vista Principal

```
┌───────────────────────────────────────────────────────────┐
│  Compras                            [+ Nueva Compra]      │
│  Gestiona las órdenes de compra a proveedores             │
├───────────────────────────────────────────────────────────┤
│  [🔍 Buscar por proveedor o número de orden...]           │
├───────────────────────────────────────────────────────────┤
│ Fecha      │ Proveedor │ Nº Orden │ Productos │ Total │...│
├───────────────────────────────────────────────────────────┤
│ 13/10/2025 │ Dist. XYZ │ OC-12345 │ 3 prods   │$668k  │[👁️][✏️][🗑️]│
│ 10/10/2025 │ Prov. ABC │ 98765    │ 1 prod    │$250k  │[👁️][✏️][🗑️]│
└───────────────────────────────────────────────────────────┘

Estado con badges:
🔵 Pedido     🟡 Ruta     🟢 Completado
```

### Modal: Nueva/Editar Orden de Compra

```
┌─────────────────────────────────────────────────────────────┐
│  Nueva Orden de Compra                                [×]   │
├─────────────────────────────────────────────────────────────┤
│  Proveedor *                    Dirección                   │
│  [Distribuidora XYZ        ▼]   [Av. Los Pajaritos...  ▼]  │
│                                                             │
│  Nº Orden Proveedor            Fecha de Compra *           │
│  [OC-12345               ]     [2025-10-13            ]    │
│                                                             │
│  Estado                         Observaciones              │
│  [Pedido                 ▼]    [Contactar a Juan...    ]   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Productos de la Compra                              │   │
│  │                                                      │   │
│  │ Producto: [Vasos 200cc                         ▼]   │   │
│  │                                                      │   │
│  │ Producto      │Cant │Precio Unit│Subtotal│         │   │
│  │ Vasos 200cc   │1000 │$[18] [📊] │$18,000 │[🗑️]    │   │
│  │ Bomba USB     │50   │$[4k] [📊] │$200k   │[🗑️]    │   │
│  │                                                      │   │
│  │                          Total: $218,000            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              [Cancelar]  [Crear Orden]                      │
└─────────────────────────────────────────────────────────────┘
```

### Modal: Ver Detalles

```
┌─────────────────────────────────────────────────────┐
│  Detalles de la Orden de Compra            [×]      │
├─────────────────────────────────────────────────────┤
│  Proveedor: Distribuidora XYZ                       │
│  Fecha: 13/10/2025                                  │
│  Nº Orden Proveedor: OC-12345                       │
│  Estado: [Ruta 🟡]                                  │
│                                                     │
│  Dirección:                                         │
│  Av. Los Pajaritos 3250, Maipú                      │
│                                                     │
│  Productos:                                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ Producto      │Cant │Precio│Total         │   │
│  │ Vasos 200cc   │1000 │$18   │$18,000       │   │
│  │ Bomba USB     │50   │$4,000│$200,000      │   │
│  │                                             │   │
│  │                     Total: $218,000         │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Observaciones:                                     │
│  Contactar a Juan en bodega, portón verde           │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Estados y Flujo de Trabajo

### Estados de Compra

| Estado | Descripción | Badge | Siguiente Estado |
|--------|-------------|-------|------------------|
| **Pedido** | Orden creada, pendiente de programar | 🔵 Azul | Ruta |
| **Ruta** | En ruta para recoger productos | 🟡 Amarillo | Completado |
| **Completado** | Productos recogidos | 🟢 Verde | - |

### Flujo de Trabajo Completo

```
1. CREAR ORDEN
   ├─ Seleccionar proveedor
   ├─ Agregar productos y precios
   ├─ Estado inicial: "Pedido"
   └─ Guardar → Registra precios en historial

2. PROGRAMAR RECOGIDA
   ├─ Cambiar estado a "Ruta"
   └─ Ir a `/rutas`

3. OPTIMIZAR RUTA
   ├─ Activar "Incluir compras en la ruta"
   ├─ Compra aparece como parada 🟠 naranja
   └─ Optimizar con entregas

4. EJECUTAR RUTA
   ├─ Ir a ubicación del proveedor
   ├─ Recoger productos
   └─ Continuar con entregas

5. COMPLETAR
   ├─ Cambiar estado a "Completado"
   ├─ completed_date = TODAY
   └─ ✅ Orden finalizada
```

---

## 🔗 Integraciones

### 1. Módulo de Proveedores

Al seleccionar un proveedor, se cargan automáticamente sus direcciones:

```typescript
// Cargar direcciones al seleccionar proveedor
const loadAddresses = async (supplierId: string) => {
  const { data: addresses } = await supabase
    .from('3t_supplier_addresses')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('is_default', { ascending: false })
  
  // Auto-selección de dirección predeterminada
  const defaultAddress = addresses?.find(addr => addr.is_default)
  if (defaultAddress) {
    setFormData(prev => ({ 
      ...prev, 
      address_id: defaultAddress.address_id 
    }))
  }
}
```

### 2. Módulo de Productos

Los productos se cargan del catálogo general `3t_products`:

```typescript
// Cargar productos disponibles
const { data: products } = await supabase
  .from('3t_products')
  .select('*')
  .order('name', { ascending: true })

// Solo productos no agregados al carrito
const availableProducts = products.filter(
  p => !productosCarrito.find(pc => pc.product_id === p.product_id)
)
```

### 3. Optimizador de Rutas

Las compras en estado "Ruta" se incluyen en el optimizador:

```typescript
// En /rutas - Cargar compras
const { data: compras } = await supabase
  .from('3t_purchases')
  .select(`
    *,
    supplier:supplier_id(name),
    address:address_id(raw_address, commune, latitude, longitude)
  `)
  .eq('status', 'Ruta')
  .not('address_id', 'is', null)

// Transformar a formato compatible con pedidos
const comprasTransformadas = compras
  .filter(c => c.address?.latitude && c.address?.longitude)
  .map(c => ({
    order_id: c.purchase_id,
    customer_name: c.supplier?.name || 'Proveedor',
    raw_address: c.address?.raw_address,
    commune: c.address?.commune,
    latitude: c.address?.latitude,
    longitude: c.address?.longitude,
    quantity: 0,  // No cuenta para capacidad de botellones
    product_name: '🟠 COMPRA',
    is_purchase: true,
    supplier_order_number: c.supplier_order_number
  }))
```

---

## 📊 Análisis y Reportes

### Consultas Útiles

#### Compras por Proveedor
```sql
SELECT 
  s.name as proveedor,
  COUNT(p.purchase_id) as total_compras,
  SUM(p.final_price) as total_gastado
FROM 3t_purchases p
JOIN 3t_suppliers s ON p.supplier_id = s.supplier_id
WHERE p.status = 'Completado'
GROUP BY s.name
ORDER BY total_gastado DESC;
```

#### Productos Más Comprados
```sql
SELECT 
  prod.name as producto,
  SUM(pp.quantity) as total_cantidad,
  AVG(pp.unit_price) as precio_promedio,
  MAX(pp.unit_price) as precio_maximo,
  MIN(pp.unit_price) as precio_minimo
FROM 3t_purchase_products pp
JOIN 3t_products prod ON pp.product_id = prod.product_id
JOIN 3t_purchases p ON pp.purchase_id = p.purchase_id
WHERE p.status = 'Completado'
GROUP BY prod.name
ORDER BY total_cantidad DESC;
```

#### Tendencia de Precios
```sql
SELECT 
  prod.name as producto,
  s.name as proveedor,
  ph.price,
  ph.recorded_at
FROM 3t_supplier_price_history ph
JOIN 3t_products prod ON ph.product_id = prod.product_id
JOIN 3t_suppliers s ON ph.supplier_id = s.supplier_id
WHERE prod.product_id = 'jf0j4ñs6'  -- Vasos 200cc
ORDER BY ph.recorded_at DESC
LIMIT 10;
```

---

## ⚠️ Validaciones y Reglas de Negocio

### Crear Orden de Compra
- ✅ Proveedor es requerido
- ✅ Fecha de compra es requerida
- ✅ Mínimo 1 producto en el carrito
- ✅ Precio unitario debe ser >= 0
- ✅ Cantidad debe ser > 0
- ℹ️ ID único se genera automáticamente

### Agregar Producto al Carrito
- ❌ No se puede agregar producto duplicado
- ✅ Muestra mensaje: "Este producto ya está en el carrito"
- ✅ Permite modificar cantidad/precio del existente

### Eliminar Orden
- ⚠️ Advertencia: Se eliminarán todos los productos
- ✅ Eliminación en cascada automática
- ℹ️ No hay validaciones de dependencias (se asume que compras completadas no se eliminan)

### Cambiar Estado
- ✅ Pedido → Ruta (manual)
- ✅ Ruta → Completado (manual, se registra `completed_date`)
- ℹ️ No hay restricciones, se puede cambiar libremente

---

## 💡 Tips y Buenas Prácticas

### Para Usuarios de Compras

1. **Usar número de orden del proveedor**:
   - Facilita seguimiento
   - Permite cruce con factura del proveedor
   - Ayuda en caso de reclamos

2. **Revisar historial de precios antes de comprar**:
   - Click en [📊] junto al precio
   - Ver si el precio actual es normal
   - Detectar aumentos significativos

3. **Agregar observaciones útiles**:
   - Horario de atención del proveedor
   - Persona de contacto
   - Condiciones especiales de la compra

### Para Logística

1. **Cambiar a "Ruta" solo cuando esté programado**:
   - No cambiar si no se va a recoger ese día
   - Evita confusión en el optimizador

2. **Completar orden al recoger productos**:
   - Marca como "Completado" inmediatamente
   - Registra fecha exacta de recepción
   - Facilita seguimiento de inventario futuro

### Para Análisis

1. **Mantener precios actualizados**:
   - Ingresar precio real de compra
   - No usar precios estimados
   - Facilita análisis de tendencias

2. **Usar historial para negociar**:
   - Ver precios históricos
   - Detectar aumentos injustificados
   - Comparar entre proveedores

---

## 🐛 Troubleshooting

### No puedo agregar productos al carrito

**Causa 1**: Producto ya está en el carrito

**Solución**: Modificar cantidad/precio del producto existente o eliminarlo primero

**Causa 2**: No hay productos disponibles

**Solución**: Verificar que existan productos en `/productos`

### El historial de precios está vacío

**Causa**: Primera vez comprando ese producto a ese proveedor

**Solución**: Normal. El historial se llena con el tiempo al hacer compras

### Las direcciones no se cargan

**Causa**: Proveedor sin direcciones registradas

**Solución**: Ir a `/proveedores` y agregar dirección al proveedor

### La compra no aparece en el optimizador

**Causa 1**: Estado no es "Ruta"

**Solución**: Cambiar estado de la compra a "Ruta"

**Causa 2**: Checkbox "Incluir compras" desactivado

**Solución**: En `/rutas`, activar checkbox "Incluir compras en la ruta"

**Causa 3**: Dirección sin coordenadas GPS

**Solución**: Editar dirección del proveedor y usar autocompletado de Google Maps

---

## 📊 Preparación para Inventario Futuro

La estructura está lista para implementar control de inventario:

```sql
-- Vista futura: Stock actual
CREATE VIEW 3t_stock_current AS
SELECT 
  product_id,
  producto,
  entradas,
  salidas,
  (entradas - salidas) as stock_actual
FROM (
  -- ENTRADAS: Compras completadas
  SELECT 
    pp.product_id,
    prod.name as producto,
    SUM(pp.quantity) as entradas,
    0 as salidas
  FROM 3t_purchase_products pp
  JOIN 3t_purchases p ON pp.purchase_id = p.purchase_id
  JOIN 3t_products prod ON pp.product_id = prod.product_id
  WHERE p.status = 'Completado'
  GROUP BY pp.product_id, prod.name
  
  UNION ALL
  
  -- SALIDAS: Pedidos despachados
  SELECT 
    op.product_id,
    prod.name as producto,
    0 as entradas,
    SUM(op.quantity) as salidas
  FROM order_products op
  JOIN 3t_orders o ON op.order_id = o.order_id
  JOIN 3t_products prod ON op.product_id = prod.product_id
  WHERE o.status = 'Despachado'
  GROUP BY op.product_id, prod.name
) movimientos
GROUP BY product_id, producto, entradas, salidas;
```

---

## 📚 Referencias

- **Módulo relacionado**: [PROVEEDORES.md](./PROVEEDORES.md) - Gestión de proveedores
- **Módulo relacionado**: [PRODUCTOS.md](./PRODUCTOS.md) - Catálogo de productos
- **Módulo relacionado**: [OPTIMIZADOR-RUTAS.md](./OPTIMIZADOR-RUTAS.md) - Rutas con compras
- **Componentes UI**: [shadcn/ui](https://ui.shadcn.com/)

---

**Última actualización**: Octubre 13, 2025  
**Versión**: 1.0.0  
**Estado**: ✅ Implementado y Operativo


