# Módulo de Facturas

## Descripción

Sistema profesional de facturación con soporte para:
- Facturación parcial progresiva de pedidos
- Consolidación de múltiples pedidos en una factura
- Facturas independientes sin pedidos asociados
- Gestión completa del ciclo de vida de facturas

## Arquitectura

### Tablas de Base de Datos

#### `3t_invoices` - Facturas
```sql
CREATE TABLE "3t_invoices" (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente', 'anulada', 'pendiente')),
  invoice_type TEXT DEFAULT 'venta' CHECK (invoice_type IN ('venta', 'exenta', 'boleta')),
  notes TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES "3t_users"(id),
  updated_by UUID REFERENCES "3t_users"(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `3t_order_invoices` - Relación N:M
```sql
CREATE TABLE "3t_order_invoices" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES "3t_orders"(order_id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES "3t_invoices"(invoice_id) ON DELETE CASCADE,
  amount_invoiced DECIMAL(12,2) NOT NULL CHECK (amount_invoiced > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, invoice_id)
);
```

### Vistas SQL

#### `v_invoices_with_orders`
Vista optimizada que muestra facturas con sus pedidos relacionados.

#### `v_orders_with_invoices`
Vista optimizada que muestra pedidos con sus facturas relacionadas y el monto pendiente por facturar.

#### `v_pending_invoices_empresa` ⭐ Nuevo (Nov 2025)
Vista optimizada que muestra **pedidos de empresas pendientes de facturar**.

```sql
CREATE VIEW v_pending_invoices_empresa AS
SELECT 
  o.order_id, o.order_date, o.final_price,
  o.customer_id, c.name AS customer_name,
  c.customer_type, o.payment_status, o.invoice_number
FROM "3t_orders" o
INNER JOIN "3t_customers" c ON o.customer_id = c.customer_id
WHERE 
  c.customer_type = 'Empresa'
  AND o.invoice_number IS NULL
ORDER BY o.order_date DESC;
```

**Criterios de filtrado:**
- ✅ Cliente tipo `Empresa` (excluye hogares)
- ✅ `invoice_number IS NULL` (sin factura asociada)
- ✅ Ordenados por fecha descendente

**Uso:** Tab "Pedidos Por Facturar" en el módulo de facturas.

### Relaciones

- **3t_invoices → 3t_order_invoices**: Una factura puede tener múltiples relaciones (N:M)
- **3t_orders → 3t_order_invoices**: Un pedido puede estar en múltiples facturas (facturación parcial)
- **3t_invoices.created_by → 3t_users**: Usuario que creó la factura
- **3t_invoices.updated_by → 3t_users**: Usuario que modificó la factura por última vez

## Permisos

### Por Rol

- **Admin**: CRUD completo
  - Crear facturas
  - Editar facturas
  - Anular facturas
  - Ver todas las facturas

- **Operador**: CRUD completo
  - Crear facturas
  - Editar facturas
  - Anular facturas
  - Ver todas las facturas

- **Chofer**: Solo lectura
  - Ver facturas
  - No puede crear, editar o anular

## Flujos de Uso

### 1. Facturar Múltiples Pedidos (Tab "Pedidos Por Facturar") ⭐ Recomendado

**Nuevo flujo optimizado para facturación masiva (Nov 2025)**

**Pasos:**
1. Ir a módulo de Facturas (`/facturas`)
2. Click en tab **"Pedidos Por Facturar"**
3. Ver lista de 92 pedidos de empresas sin facturar
4. Seleccionar uno o varios pedidos con checkboxes
5. Click en **"Crear Factura (N)"** donde N = cantidad seleccionada
6. El formulario se abre con pedidos pre-seleccionados
7. Ingresar número de factura
8. Opcionalmente subir PDF de la factura
9. Revisar cálculos automáticos (Subtotal, IVA, Total)
10. Guardar

**Ventajas:**
- ✅ Visualización clara de todos los pedidos pendientes
- ✅ Selección múltiple con checkboxes
- ✅ Pre-carga automática en formulario
- ✅ Exportar a Excel para reportes
- ✅ Badge visual "Empresa" en cada pedido
- ✅ Montos netos destacados

**Métricas visibles:**
- **Cantidad Pendiente**: Número de pedidos sin facturar (92)
- **Pedidos Sin Facturar**: Monto total neto ($3,598,349)

### 2. Crear Factura desde Pedidos (Flujo Manual)

**Pasos:**
1. Click en "Nueva Factura"
2. Ingresar número de factura (único, requerido)
3. Seleccionar fecha de emisión
4. Elegir tipo de factura (venta, exenta, boleta)
5. Buscar y agregar pedidos manualmente
6. Para cada pedido, especificar monto a facturar
7. El sistema valida que no exceda el monto pendiente del pedido
8. Calcular automáticamente: Subtotal, IVA (19%), Total
9. Agregar notas opcionales
10. Opcionalmente subir PDF de la factura
11. Guardar

**Validaciones:**
- Número de factura único
- Al menos un pedido seleccionado
- Monto facturado ≤ Monto pendiente del pedido
- Suma de montos parciales = Total de la factura

### 3. Facturación Parcial

**Escenario:** Pedido de $100.000 que se factura en partes.

**Ejemplo:**
1. **Factura 1**: $60.000 del pedido #001
   - Monto restante por facturar: $40.000
2. **Factura 2**: $40.000 del pedido #001
   - Monto restante por facturar: $0
   - Pedido completamente facturado

**Características:**
- El sistema lleva el control automático del monto facturado
- Solo muestra pedidos con saldo pendiente
- Valida que no se exceda el monto total del pedido

### 4. Consolidar Pedidos

**Escenario:** Múltiples pedidos de un cliente en una sola factura.

**Ejemplo:**
- Pedido #001: $50.000
- Pedido #002: $30.000
- Pedido #003: $20.000
- **Factura única**: $100.000 (agrupa los 3 pedidos)

**Beneficios:**
- Menos facturas por emitir
- Simplifica contabilidad
- Mejor para clientes frecuentes

### 5. Múltiples Facturas por Pedido con Selección de Productos ⭐ Nuevo (Nov 14, 2025)

**Escenario:** Pedido con productos que deben facturarse por separado (ej: recargas + botellones nuevos).

**Caso real:** Pedido #15467aae
- Producto 1: PET (25 un.) = $62.500 → Factura 3517
- Producto 2: Botellon PET Nuevo (25 un.) = $162.500 → Factura 3535

**Pasos:**
1. Click en "Nueva Factura"
2. Agregar pedido(s) con productos
3. Activar toggle "Múltiples Facturas"
4. Sistema muestra **todos los productos** del pedido con checkboxes
5. Click en "Agregar Factura" para crear entradas adicionales
6. Para cada factura:
   - Ingresar número de factura (único)
   - Seleccionar fecha de emisión
   - **Seleccionar productos** con checkboxes
   - Monto se calcula automáticamente según productos seleccionados
   - Agregar notas opcionales (ej: "Recargas", "Botellones nuevos")
7. Verificar distribución:
   - Total disponible: suma de todos los productos
   - Total distribuido: suma de productos asignados
   - ✅ Verde si está correcto, ❌ Rojo si excede
8. Guardar → Sistema crea N facturas independientes

**Características:**
- ✅ Cada producto puede asignarse a **una sola** factura
- ✅ Productos ya asignados aparecen deshabilitados con badge "Asignado"
- ✅ Cálculo automático del monto por factura
- ✅ Validación visual con colores
- ✅ No permite guardar si hay sobreasignación
- ✅ Cada factura es un registro independiente en `3t_invoices`
- ✅ Relaciones en `3t_order_invoices` distribuidas proporcionalmente

**UI de selección de productos:**
```
Productos a Facturar:
☑️ PET (25 un.)
   $2.500 × 25 = $62.500

☐ Botellon PET Nuevo (25 un.) [Asignado]
   $6.500 × 25 = $162.500

Monto calculado: $62.500
```

**Validaciones:**
- Al menos un producto seleccionado por factura
- No duplicar productos entre facturas
- Total distribuido ≤ Total disponible
- Números de factura únicos

**Beneficios:**
- ✅ Soluciona casos reales de facturación compleja
- ✅ Interfaz visual clara e intuitiva
- ✅ Elimina errores manuales de cálculo
- ✅ Trazabilidad completa de productos por factura
- ✅ Escalable a cualquier cantidad de productos

### 6. Factura Independiente

**Escenario:** Factura sin pedidos asociados (servicios, ajustes, etc.)

**Pasos:**
1. Click en "Nueva Factura"
2. Activar toggle "Factura sin pedidos"
3. Ingresar número y fecha
4. Ingresar monto total manualmente
5. El sistema calcula Subtotal e IVA según tipo de factura

**Casos de uso:**
- Servicios adicionales
- Ajustes de precios
- Facturas especiales

### 7. Anular Factura

**Requisitos:**
- Solo facturas con estado "vigente" pueden anularse
- Confirmar acción (no reversible)

**Efectos:**
- Factura pasa a estado "anulada"
- Libera el monto facturado de los pedidos asociados
- Los pedidos vuelven a estar disponibles para facturar
- No se elimina de la base de datos (trazabilidad)

### 8. Consultar Estado de Facturación

**Vista de pedido:**
- Muestra monto total
- Muestra monto facturado
- Muestra monto pendiente
- Lista de facturas asociadas con links

**Filtros disponibles:**
- Rango de fechas
- Cliente
- Estado (vigente/anulada/pendiente)
- Tipo de factura
- Monto (min-max)
- Búsqueda por número de factura
- Búsqueda por número de pedido

## Componentes

### 1. InvoiceTable (`invoice-table.tsx`)

**Funcionalidad:**
- Lista paginada de facturas
- Columnas: Fecha, N° Factura, Cliente(s), Pedidos, Subtotal, IVA, Total, Estado
- ⭐ **Ordenamiento interactivo**: Click en Fecha, N° Factura o Cliente(s) para ordenar
- ⭐ **Formato de montos mejorado**: Subtotal destacado, Total mediano, IVA pequeño
- Click en fila → abre detalle
- Dropdown de acciones: Ver, Editar, PDF, Anular
- Skeletons durante carga

**Props:**
```typescript
{
  invoices: InvoiceWithOrders[]
  loading: boolean
  onViewDetail: (invoice: InvoiceWithOrders) => void
  onCancel: (invoice: InvoiceWithOrders) => void
}
```

### 2. InvoiceFilters (`invoice-filters.tsx`)

**Funcionalidad:**
- Filtros sticky (permanecen visibles al hacer scroll)
- Date range picker
- Cliente searchable
- Monto min/max
- Estado (vigente/anulada/pendiente)
- Tipo de factura
- Búsqueda por texto
- Botón "Limpiar filtros"

**Props:**
```typescript
{
  filters: InvoiceFiltersType
  onFiltersChange: (filters: InvoiceFiltersType) => void
}
```

### 2.5. PendingOrdersTable (`pending-orders-table.tsx`) ⭐ Nuevo (Nov 2025)

**Funcionalidad:**
- Tabla dedicada para pedidos de empresas pendientes de facturar
- Checkboxes para selección múltiple
- Badge visual "Empresa" en cada fila
- Montos netos destacados (sin IVA) + total con IVA secundario
- Botón "Crear Factura (N)" donde N = cantidad seleccionada
- Botón "Exportar a Excel" con formato profesional
- Select All / Deselect All en header
- Contador de seleccionados con monto total

**Formato de Excel:**
- Columnas: ID Pedido, Fecha, Cliente, Monto Total, Monto Pendiente, Estado
- Ancho de columnas ajustado automáticamente
- Nombre: `pedidos-sin-facturar-YYYY-MM-DD.xlsx`

**Props:**
```typescript
{
  orders: OrderWithInvoices[]
  loading: boolean
  onCreateInvoice: (selectedOrders: OrderWithInvoices[]) => void
}
```

**Uso:** Tab "Pedidos Por Facturar" en `/facturas`

### 3. InvoiceForm (`invoice-form.tsx`)

**Funcionalidad:**
- Formulario modal para crear/editar factura
- ⭐ **Pre-selección de pedidos**: Acepta pedidos ya seleccionados desde tab "Pedidos Por Facturar"
- Búsqueda y selección de pedidos
- Cálculo automático de totales
- Validaciones en tiempo real
- Toggle para factura independiente
- ⭐ **Toggle para múltiples facturas**: Crear varias facturas para los mismos pedidos (Nov 14, 2025)
- ⭐ **Selección de productos por factura**: Checkboxes interactivos para asignar productos (Nov 14, 2025)
- ⭐ **Carga automática de productos**: Obtiene productos de `order_products` al agregar pedido (Nov 14, 2025)
- ⭐ **Validación de asignación única**: Productos no pueden duplicarse entre facturas (Nov 14, 2025)
- ⭐ **Upload de PDF**: Subir PDF de la factura (máx 5MB)

**Validaciones:**
- Número de factura único (por cada entrada si son múltiples)
- Fecha válida
- Al menos un pedido O factura independiente
- Montos no exceden saldo del pedido
- Total > 0
- ⭐ **Múltiples facturas**: Al menos un producto por factura, total distribuido ≤ total disponible
- ⭐ PDF válido (si se sube): formato PDF, tamaño ≤ 5MB

**Nuevos estados (Nov 14, 2025):**
```typescript
type OrderProduct = {
  id: string
  product_id: string
  product_name: string
  quantity: number
  price_neto: number
  total: number
}

type InvoiceEntry = {
  id: string
  invoice_number: string
  invoice_date: Date
  amount: number
  notes: string
  selectedProducts: OrderProduct[] // Productos asignados a esta factura
}

const [multipleInvoices, setMultipleInvoices] = useState(false)
const [invoiceEntries, setInvoiceEntries] = useState<InvoiceEntry[]>([...])
```

**Nuevas funciones (Nov 14, 2025):**
```typescript
// Cargar productos de un pedido
loadOrderProducts(orderId: string): Promise<OrderProduct[]>

// Toggle producto en factura
toggleProductInInvoice(invoiceEntryId: string, product: OrderProduct)

// Verificar si producto está asignado a otra factura
isProductAssigned(productId: string, currentInvoiceId: string): boolean

// Obtener todos los productos disponibles
getAllAvailableProducts(): OrderProduct[]
```

**Props:**
```typescript
{
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  invoice?: InvoiceWithOrders // Para edición
  preselectedOrders?: OrderWithInvoices[] // Pedidos pre-seleccionados
}
```

### 4. InvoiceDetailDialog (`invoice-detail-dialog.tsx`)

**Funcionalidad:**
- Vista completa de la factura
- Información general (número, fecha, estado, tipo)
- Montos (Subtotal, IVA, Total)
- Tabla de pedidos incluidos
- Timeline de eventos (creación, modificaciones)
- Botones de acción: Ver PDF, Editar notas, Anular

**Secciones:**
1. **Header**: Badge de estado, número de factura
2. **Montos**: Card con Subtotal, IVA, Total (formato CLP)
3. **Pedidos**: Tabla con ID, fecha, cliente, monto facturado
4. **Timeline**: Historial de cambios
5. **Notas**: Texto libre editable
6. **Acciones**: PDF, Editar, Anular

**Props:**
```typescript
{
  invoice: InvoiceWithOrders | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}
```

## API / Hooks

### Queries principales

```typescript
// Cargar facturas con filtros
const { data, error } = await supabase
  .from('3t_invoices')
  .select(`
    *,
    order_invoices:3t_order_invoices(
      *,
      order:3t_orders(*, customer:3t_customers(*))
    )
  `)
  .gte('invoice_date', startDate)
  .lte('invoice_date', endDate)
  .eq('status', 'vigente')

// Cargar pedidos disponibles para facturar
const { data, error } = await supabase
  .from('v_orders_with_invoices')
  .select('*')
  .gt('remaining_to_invoice', 0)
```

### Crear factura

```typescript
// 1. Crear registro en 3t_invoices
const { data: invoice, error } = await supabase
  .from('3t_invoices')
  .insert({
    invoice_number: '12345',
    invoice_date: '2025-11-06',
    subtotal: 84033.61,
    tax_amount: 15966.39,
    total_amount: 100000,
    status: 'vigente',
    invoice_type: 'venta',
    notes: 'Factura consolidada',
    created_by: userId
  })
  .select()
  .single()

// 2. Crear relaciones en 3t_order_invoices
const relations = orders.map(order => ({
  order_id: order.order_id,
  invoice_id: invoice.invoice_id,
  amount_invoiced: order.amount_to_invoice
}))

await supabase
  .from('3t_order_invoices')
  .insert(relations)
```

### Anular factura

```typescript
// Cambiar estado a anulada
const { error } = await supabase
  .from('3t_invoices')
  .update({
    status: 'anulada',
    updated_by: userId,
    updated_at: new Date().toISOString()
  })
  .eq('invoice_id', invoiceId)

// Los pedidos se liberan automáticamente
// porque las vistas calculan remaining_to_invoice
// solo con facturas vigentes
```

## Integración con Dashboard

El dashboard se actualizó para usar la nueva estructura de facturas:

**Consulta:**
```typescript
const { data } = await supabase
  .from('3t_invoices')
  .select(`
    *,
    order_invoices:3t_order_invoices(
      amount_invoiced,
      order:3t_orders!inner(
        order_id,
        customer:3t_customers!inner(name, customer_type),
        product:3t_products!product_type(name)
      )
    )
  `)
  .gte('invoice_date', startDate)
  .lte('invoice_date', endDate)
  .eq('status', 'vigente')
```

**Métricas:**
- Total facturas: `data.length`
- Facturación sin IVA: `SUM(subtotal)`
- Facturación con IVA: `SUM(total_amount)`

## Migración de Datos

### Campos Legacy

Los campos `invoice_number` e `invoice_date` en `3t_orders` se mantienen como backup:

```sql
COMMENT ON COLUMN "3t_orders".invoice_number IS 'LEGACY: Usar tabla 3t_invoices. Campo mantenido como backup.';
COMMENT ON COLUMN "3t_orders".invoice_date IS 'LEGACY: Usar tabla 3t_invoices. Campo mantenido como backup.';
```

**Recomendación:** Mantener por al menos 3 meses antes de eliminar.

### Script de Validación

Ejecutar después de la migración:

```bash
npx tsx scripts/validate-invoice-migration.ts
```

Verifica:
- Todas las facturas únicas fueron migradas
- Todas las relaciones se crearon
- Integridad de montos
- No hay números duplicados
- No hay facturas huérfanas

## Consideraciones de Performance

### Índices
```sql
CREATE INDEX idx_invoices_date ON "3t_invoices"(invoice_date DESC);
CREATE INDEX idx_invoices_number ON "3t_invoices"(invoice_number);
CREATE INDEX idx_invoices_status ON "3t_invoices"(status);
CREATE INDEX idx_order_invoices_order ON "3t_order_invoices"(order_id);
CREATE INDEX idx_order_invoices_invoice ON "3t_order_invoices"(invoice_id);
```

### Paginación
- Límite de 50 registros por página
- Server-side pagination
- Loading states en todas las operaciones

### Vistas pre-calculadas
Las vistas SQL pre-calculan:
- Total facturado por pedido
- Monto pendiente por facturar
- Evita cálculos en cada request

## Formato de Datos

### Montos
Todos los montos se manejan como `DECIMAL(12,2)`:
- Soporta hasta $999,999,999.99
- Precisión de 2 decimales
- Sin problemas de redondeo

### Formato en UI
```typescript
const formatCLP = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
  }).format(amount)
}
```

**Output:** `$100.000` (formato chileno sin decimales)

## Seguridad

### RLS Policies
```sql
-- Admin y operador: acceso completo
CREATE POLICY "admin_operador_full_access_invoices" ON "3t_invoices"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "3t_users" 
      WHERE id = auth.uid() 
      AND rol IN ('admin', 'operador')
    )
  );

-- Chofer: solo lectura
CREATE POLICY "chofer_read_invoices" ON "3t_invoices"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "3t_users" 
      WHERE id = auth.uid() 
      AND rol = 'chofer'
    )
  );
```

### Auditoría
- `created_by`: Usuario que creó la factura
- `updated_by`: Usuario que modificó por última vez
- `created_at`: Fecha de creación
- `updated_at`: Fecha de última modificación

## Futuras Mejoras

### Fase 2 (Opcional)
1. **Integración SII**
   - Webhook desde servicios de terceros (SimpleAPI, DTE.Cloud)
   - Sincronización automática de facturas
   
2. **Generación de PDFs**
   - Template corporativo con logo
   - Generación automática al crear factura
   - Storage en Supabase

3. **Pagos asociados**
   - Tabla `3t_invoice_payments`
   - Relación N:M con métodos de pago
   - Control de facturas pagadas/pendientes

4. **Notificaciones**
   - Email al cliente cuando se emite factura
   - Recordatorios de pago
   - Alertas de facturas vencidas

5. **Estadísticas avanzadas**
   - Dashboard de facturación
   - Proyecciones de ingresos
   - Análisis de días promedio de pago

## Troubleshooting

### Error: "Número de factura duplicado"
**Causa:** Intentando crear factura con número que ya existe.
**Solución:** Verificar en la tabla que el número sea único.

### Error: "Monto excede saldo del pedido"
**Causa:** Intentando facturar más de lo que queda pendiente en el pedido.
**Solución:** Verificar monto restante con query a `v_orders_with_invoices`.

### Error: "No se puede anular factura"
**Causa:** Intentando anular una factura que no está en estado vigente.
**Solución:** Solo facturas vigentes pueden anularse.

### La vista v_orders_with_invoices no retorna datos
**Causa:** Vista SQL no fue creada en la base de datos.
**Solución:** Ejecutar migración SQL completa.

## Changelog

### v3.2.0 - 2025-11-14 ⭐ Nuevo
- **Múltiples facturas por pedido con selección de productos**
  - Toggle para activar modo múltiples facturas
  - Carga automática de productos desde `order_products`
  - Checkboxes interactivos para seleccionar productos por factura
  - Validación de asignación única (producto no se duplica)
  - Cálculo automático del monto por factura
  - Validación visual con colores (verde/rojo)
  - Cada factura es un registro independiente en `3t_invoices`
- **Exclusión de pedidos internos**
  - Vista `v_pending_invoices_empresa` excluye `payment_status = 'Interno'`
  - Pedidos de proveedores (retiros) no aparecen en lista de facturación
- **Filtros predefinidos de período**
  - Mes Actual, Mes Anterior, Trimestre, Año, Personalizado
  - Selector de período en `InvoiceFilters`
  - Cálculo automático de fechas con `date-fns`
- **Corrección de métricas por fecha de facturación**
  - Card "Total Facturado" ahora filtra por `invoice_date` en lugar de `order_date`
  - Validación correcta del período de facturas vigentes
- **Bugs corregidos**
  - Filtros movidos fuera de tabs para aplicación global
  - Documentación de problema con campos legacy en `3t_orders`

### v3.1.0 - 2025-11-06
- Sistema de facturación profesional implementado
- Soporte para facturación parcial
- Consolidación de pedidos
- Facturas independientes
- Migración automática de datos existentes
- Dashboard actualizado para usar nueva estructura

---

**Documentación actualizada:** 2025-11-14  
**Versión del módulo:** 3.2.0  
**Autor:** Sistema AI Assistant

