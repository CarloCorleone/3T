# 📋 Módulo: Pedidos

**Ruta:** `/pedidos`  
**Archivo:** `/app/pedidos/page.tsx`  
**Tipo:** Página dinámica con CRUD completo y cálculo automático de precios

---

## 📖 Descripción General

El módulo **Pedidos** es el corazón operativo del sistema. Gestiona el ciclo completo de pedidos desde la creación hasta la entrega, con cálculo automático de precios basado en reglas de negocio.

### Propósito
- Crear y gestionar pedidos diarios
- Calcular precios automáticamente según tipo de pedido
- Seguimiento de estados (Pedido → Ruta → Despachado)
- Gestión de pagos (Pendiente → Pagado → Facturado)
- Filtrado por tabs (Todos, Pedido, Ruta, Despachado)

### Audiencia
- **Administrativos**: Crear pedidos telefónicos
- **Conductores**: Ver pedidos en ruta
- **Finanzas**: Seguimiento de pagos

---

## ✨ Funcionalidades

### 📸 Gestión de Fotos de Despacho ⭐ NUEVO

**Implementado:** Octubre 28, 2025

El módulo ahora incluye sistema completo de visualización, compresión y gestión de fotos de evidencia de entrega.

**Características:**
- ✅ **Visualización de Fotos**: Ver fotos de despacho en modal de detalles
- ✅ **Compresión Automática**: Reduce fotos de 3MB a ~500-800KB (75-85% más ligeras)
- ✅ **Copiar Enlace**: Copiar URL de la foto al portapapeles
- 🚧 **Compartir por WhatsApp**: Compartir foto directamente (en desarrollo)
- ✅ **Almacenamiento Público**: Bucket de Supabase Storage configurado
- ✅ **URLs Directas**: Acceso público a fotos de despacho

**Compresión Inteligente:**
- Automática y transparente para el usuario
- Reduce tamaño 75-85% sin pérdida de calidad perceptible
- Documentos perfectamente legibles
- Carga 4x más rápida en conexiones lentas
- Ahorro significativo en costos de almacenamiento

**Ubicación:**
- Bucket Supabase Storage: `delivery-photos`
- Campo en BD: `3t_orders.delivery_photo_path`
- Campo en Vista: `3t_dashboard_ventas.delivery_photo_path`
- Utilidad: `lib/image-compression.ts`

**Interfaz Visual:**
```
┌──────────────────────────────────────────┐
│ 📸 Foto de Despacho      [📋] [📤]      │
├──────────────────────────────────────────┤
│                                           │
│    [Imagen de Despacho - 3MB]            │
│                                           │
│ Foto tomada al momento de la entrega     │
└──────────────────────────────────────────┘

[📋] = Copiar enlace al portapapeles
[📤] = Compartir (menú nativo en móviles)
```

**Funcionalidad de Botones:**

1. **Copiar Enlace (📋)**
   - Copia URL pública de la foto
   - Muestra toast de confirmación
   - Funciona en todos los navegadores

2. **Compartir (📤)** - ⚠️ En Desarrollo
   - **Estado:** Parcialmente funcional
   - **En móviles:** Abre menú nativo de compartir
   - **En desktop:** Abre WhatsApp Web con URL
   - **Pendiente:** Compartir imagen directamente en WhatsApp

**Nota Técnica:**
```typescript
// Implementación actual (parcial)
const response = await fetch(deliveryPhotoUrl)
const blob = await response.blob()
const file = new File([blob], `pedido-${orderId}.jpg`, { type: 'image/jpeg' })

if (navigator.canShare && navigator.canShare({ files: [file] })) {
  await navigator.share({
    files: [file]  // Intenta compartir archivo
  })
}
```

**Limitaciones Conocidas:**
- WhatsApp puede no aceptar el archivo en algunos dispositivos
- API de compartir varía según navegador y OS
- Fallback actual: WhatsApp Web con URL

---

### 🔴 Actualizaciones en Tiempo Real ⭐ NUEVO

**Implementado:** Noviembre 14, 2025

El módulo ahora cuenta con **Supabase Realtime** habilitado, permitiendo que los cambios realizados por un usuario aparezcan automáticamente en las pantallas de otros usuarios sin necesidad de refrescar la página.

**Eventos Soportados:**
- **INSERT**: Nuevo pedido creado → Aparece automáticamente en todas las sesiones
- **UPDATE**: Pedido modificado → Se actualiza en tiempo real (estado, pago, cantidad, etc.)
- **DELETE**: Pedido eliminado → Desaparece automáticamente de la lista

**Características:**
- ✅ **Sincronización < 2 segundos**: Cambios visibles casi instantáneamente
- ✅ **Notificaciones Toast**: Alertas visuales para cada evento
- ✅ **Indicador de Conexión**: Badge visual (🟢 En vivo / ⚪ Sin conexión)
- ✅ **Hook Reutilizable**: `usePedidosRealtime` para fácil integración
- ✅ **Sin Refrescar Página**: Todo se actualiza automáticamente

**Casos de Uso:**
1. **Colaboración en Tiempo Real**: Múltiples usuarios trabajando simultáneamente
2. **Coordinación de Ruta**: Ver pedidos nuevos mientras se asignan rutas
3. **Seguimiento de Estado**: Ver cambios de estado instantáneamente
4. **Actualización de Pagos**: Finanzas puede ver pagos confirmados en vivo

**Implementación Técnica:**
```typescript
// Hook personalizado
const { isConnected: realtimeConnected } = usePedidosRealtime({
  onInsert: (newOrder) => {
    loadOrders() // Recargar pedidos
    toast({ title: '📦 Nuevo pedido' })
  },
  onUpdate: (updatedOrder) => {
    loadOrders()
    toast({ title: '✏️ Pedido actualizado' })
  },
  onDelete: (deletedOrder) => {
    setOrders(prev => prev.filter(o => o.order_id !== deletedOrder.order_id))
    toast({ title: '🗑️ Pedido eliminado' })
  }
})
```

**Indicador Visual:**
```tsx
<Badge variant={realtimeConnected ? "default" : "secondary"}>
  {realtimeConnected ? "🟢 En vivo" : "⚪ Sin conexión"}
</Badge>
```

**Requisitos:**
- Tabla `3t_orders` publicada en `supabase_realtime`
- Servicio Realtime operativo en Supabase
- WebSocket habilitado en Kong
- JWT válido con campo `exp`

**Archivos Relacionados:**
- `/hooks/use-pedidos-realtime.ts` - Hook personalizado
- `/app/pedidos/page.tsx` - Integración del hook
- `/lib/supabase.ts` - Cliente de Supabase

**Nota Técnica:**
- El hook usa `useRef` para evitar re-suscripciones innecesarias
- Las funciones callback son estables gracias a referencias
- El `useEffect` solo se ejecuta una vez al montar el componente
- RLS (Row Level Security) garantiza que cada usuario solo ve sus pedidos autorizados

---

### 0. Pedidos Multi-Producto ⭐ NUEVO

**Implementado:** Octubre 13, 2025

El módulo ahora soporta **múltiples productos por pedido**, eliminando la necesidad de crear pedidos separados para entregas a la misma dirección.

**Características Principales:**
- ✅ **Carrito de Productos**: Agregar múltiples productos antes de crear el pedido
- ✅ **Auto-detección de Tipo**: El sistema detecta automáticamente si un producto debe ser "recarga" o "nuevo"
- ✅ **Cálculo Individual**: Cada producto tiene su propio precio unitario y subtotal
- ✅ **Visualización Mejorada**: Tabla principal muestra "+X más" para pedidos multi-producto
- ✅ **Modal de Detalles**: Ver todos los productos de un pedido en un dialog completo
- ✅ **Compatibilidad**: Pedidos antiguos (1 solo producto) siguen funcionando perfectamente

**Estructura de Datos:**
```typescript
// Nuevo componente: /components/carrito-productos.tsx
export type ProductoCarrito = {
  product_id: string
  product_name: string
  quantity: number
  precio_unitario: number
  subtotal: number
  order_type: 'recarga' | 'nuevo' | 'compras'
}
```

**Tabla `order_products`:**
```sql
CREATE TABLE order_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT REFERENCES 3t_orders(order_id),
  product_id TEXT REFERENCES 3t_products(product_id),
  quantity INTEGER NOT NULL,
  price_neto NUMERIC NOT NULL,
  total INTEGER,  -- Calculado automáticamente
  UNIQUE(order_id, product_id)
)
```

**Ejemplo de Uso:**
```
Cliente pide: 55 botellones PC + 1000 vasos
Antes → 2 pedidos separados ❌
Ahora → 1 pedido con 2 productos ✅

Carrito:
  📦 PC: 55 × $2,525 = $138,875
  📦 Vasos 200cc: 1000 × $18 = $18,000
  ────────────────────────────────
  Total: $156,875
```

**Auto-detección de Tipo:**
- Si es PC o PET y el cliente tiene precio → `recarga` automáticamente
- Si es otro producto (vasos, bombas, etc.) → `nuevo` automáticamente  
- Si es compras internas → `compras` manual
- Usuario puede cambiar manualmente si es necesario

**Ver también:**
- `docs/CHANGELOG.md` - Octubre 13, 2025: Documentación completa de la implementación
- `/TESTING-MULTI-PRODUCTO.md` - 9 casos de prueba documentados
- `/IMPLEMENTACION-COMPLETADA.md` - Resumen técnico de la implementación

---

### 🔴 Actualizaciones en Tiempo Real ⭐ NUEVO

**Implementado:** Noviembre 14, 2025

El módulo de Pedidos ahora usa **Supabase Realtime** para sincronizar cambios automáticamente entre todos los usuarios conectados.

**Eventos soportados:**
- ✅ **Nuevo pedido creado** → Aparece automáticamente en todas las pantallas
- ✅ **Pedido actualizado** → Se actualiza en vivo (estado, pago, cantidad, etc.)
- ✅ **Pedido eliminado** → Desaparece automáticamente

**Características:**
- 🚀 Sincronización en < 2 segundos
- 🔔 Notificaciones toast informativas
- 🟢 Indicador visual de conexión
- ⚡ Sin necesidad de refrescar la página
- 🔒 Respeta políticas RLS (usuarios ven solo lo permitido)

**Indicador de conexión:**

```
┌────────────────────────────────────────┐
│ Lista de Pedidos     🟢 En vivo       │
└────────────────────────────────────────┘
```

- 🟢 **En vivo** - Realtime conectado (actualizaciones automáticas)
- ⚪ **Sin conexión** - Modo fallback (usar botón refresh manual)

**Notificaciones toast:**

```
📦 Nuevo pedido
Pedido creado por otro usuario

✏️ Pedido actualizado
Cambios en pedido [order_id]

🗑️ Pedido eliminado
Pedido eliminado por otro usuario
```

**Casos de uso:**
1. **Colaboración en tiempo real**: Varios usuarios gestionando pedidos simultáneamente
2. **Despacho coordinado**: Conductor marca como despachado → Admin ve cambio inmediato
3. **Seguimiento de estado**: Cambios de estado visibles instantáneamente
4. **Sincronización de pagos**: Actualización de pagos propagada automáticamente

**Requisitos:**
- Navegador con soporte WebSocket
- Conexión estable a internet
- Sesión autenticada activa

**Implementación técnica:**
- Hook: `/opt/cane/3t/hooks/use-pedidos-realtime.ts`
- Tabla: `3t_orders` (publicación habilitada)
- WebSocket: `wss://api.loopia.cl/realtime/v1/`
- Infraestructura: Ver `/opt/cane/supabase-project-1/REALTIME_MEMORY_ISSUE.md`

---

### 1. Tipos de Pedido (Lógica de Precios)

| Tipo | Precio Unitario | Uso | Ejemplo |
|------|----------------|-----|---------|
| **Recarga** | `customers.price` | Cliente tiene precio personalizado | $2,500/botellón |
| **Nuevo** | `products.price_neto` | Venta directa del producto | $5,000/botellón |
| **Compras** | $0 | Pedidos internos/sin costo | Reposición de inventario |

**Cálculo del precio total**:
```typescript
precio_total = cantidad × precio_unitario
```

### 2. Estados del Pedido

#### Estado de Pedido (Logística)
- **Pedido** (🔵): Recién creado, pendiente de preparar
- **Ruta** (🟡): En camino al cliente
- **Despachado** (🟢): Entregado al cliente

#### Estado de Pago (Finanzas)
- **Pendiente** (⚪): No pagado
- **Pagado** (🟢): Pago recibido
- **Facturado** (🔵): Factura emitida
- **Interno** (⚫): Sin cobro (compras internas)

#### Tipo de Pago
- **Efectivo**: Pago en el momento de entrega
- **Transferencia**: Pago bancario

### 3. Búsqueda y Filtros Avanzados ⭐ MEJORADO

**Implementado:** Octubre 13, 2025 (Tarde)

El módulo ahora incluye búsqueda sin límites y filtros especializados:

#### Búsqueda Inteligente
- ✅ Busca por **nombre de cliente** o **ID de pedido**
- ✅ Búsqueda **sin límite temporal** - encuentra TODOS los pedidos históricos
- ✅ Insensible a mayúsculas/minúsculas
- ✅ Debounce automático de 500ms (evita consultas excesivas)
- ✅ Indicador visual de resultados encontrados

#### Filtro "Solo Pendientes"
- ✅ Switch para mostrar solo pedidos con pago pendiente
- ✅ Ideal para gestión de **cuentas por cobrar**
- ✅ Muestra TODOS los pendientes sin límite de 100
- ✅ Combinable con búsqueda por cliente

#### Comportamiento Inteligente
| Condición | Límite de Pedidos | Motivo |
|-----------|-------------------|--------|
| Sin búsqueda ni filtros | 100 pedidos | Rendimiento óptimo |
| Con búsqueda activa | SIN límite | Busca en todo el historial |
| Con filtro "Solo Pendientes" | SIN límite | Muestra todas las cuentas por cobrar |
| Búsqueda + Filtro combinados | SIN límite | Máxima flexibilidad |

**Interfaz Visual:**
```
┌──────────────────────────────────────────────────────┐
│ 🔍 [Buscar cliente o ID...]  📋 Solo Pendientes [⚪]│
│                                                       │
│ ℹ️  Mostrando 15 resultado(s) para "Juan"           │
│    con pago pendiente (búsqueda en todos los pedidos)│
└──────────────────────────────────────────────────────┘
```

### 4. Tabs de Filtrado

```
┌─────────┬─────────┬─────────┬────────────┐
│  Todos  │ Pedido  │  Ruta   │ Despachado │
└─────────┴─────────┴─────────┴────────────┘
```

- **Todos**: Muestra todos los pedidos (respeta límite de 100 si no hay búsqueda)
- **Pedido**: Solo pedidos en estado "Pedido"
- **Ruta**: Solo pedidos en estado "Ruta"
- **Despachado**: Solo pedidos entregados

**Nota:** Los tabs funcionan como filtros locales sobre los pedidos ya cargados. Para búsqueda histórica, usar el campo de búsqueda o filtro de pendientes.

### 5. CRUD Completo

#### Crear Pedido
1. Seleccionar cliente (con búsqueda)
2. Seleccionar dirección del cliente (carga automáticamente)
3. Seleccionar tipo de pedido (Recarga/Nuevo/Compras)
4. Seleccionar producto
5. Ingresar cantidad
6. **Precio se calcula automáticamente** según tipo
7. Fecha de pedido (predeterminado: hoy)
8. Estado inicial: "Pedido", Pago: "Pendiente"

#### Editar Pedido
- Modal con datos pre-cargados
- Puede cambiar: cantidad, estado, pago, observaciones
- Recalcula precio si cambia cantidad

#### Eliminar Pedido
- Confirmación con modal
- Eliminación directa

---

## 🎨 Interfaz de Usuario

### Componentes shadcn/ui
```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
```

### Estructura Visual

```
┌─────────────────────────────────────────┐
│  [Buscar...]    [+ Nuevo Pedido]        │
└─────────────────────────────────────────┘

┌─────────┬─────────┬─────────┬────────────┐
│  Todos  │ Pedido  │  Ruta   │ Despachado │ ← Tabs
└─────────┴─────────┴─────────┴────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Fecha  │ Cliente │ Dirección │ Producto │ Cant │ Total │ Estado │
├─────────────────────────────────────────────────────────────────┤
│10/10/25│ ABC Corp│ Zenteno..│Botellón..|  10  │$25,000│🟡 Ruta │
│10/10/25│ Cliente │ Av. Kenn.│Botellón..|   5  │$12,500│🟢 Desp.│
└─────────────────────────────────────────────────────────────────┘
```

### Modal de Nuevo Pedido

```
┌──────────────────────────────────────┐
│  Nuevo Pedido                         │
├──────────────────────────────────────┤
│  Cliente: [Buscar cliente... ▼]     │
│  Dirección: [Zenteno 881, Maipú ▼]  │
│  Tipo: [●Recarga ○Nuevo ○Compras]   │
│  Producto: [Botellón 20L ▼]         │
│  Cantidad: [10]                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Precio Unitario: $2,500            │
│  Precio Total: $25,000              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Observaciones: [____________]       │
│  Estado: [Pedido ▼]                 │
│  Pago: [Pendiente ▼] [Efectivo ▼]  │
│  Fecha: [10/10/2025]                │
│                                       │
│  [Cancelar]  [Crear Pedido]         │
└──────────────────────────────────────┘
```

---

## 💾 Datos y Lógica

### Tabla de Supabase

#### `3t_orders`
```sql
CREATE TABLE 3t_orders (
  order_id UUID PRIMARY KEY,
  customer_id UUID REFERENCES 3t_customers(customer_id),
  delivery_address_id UUID REFERENCES 3t_addresses(address_id),
  product_type UUID REFERENCES 3t_products(product_id),
  quantity INTEGER NOT NULL DEFAULT 1,
  botellones_entregados INTEGER,
  status TEXT CHECK (status IN ('Pedido', 'Ruta', 'Despachado')),
  payment_status TEXT CHECK (payment_status IN ('Pendiente', 'Pagado', 'Facturado', 'Interno')),
  payment_type TEXT CHECK (payment_type IN ('Efectivo', 'Transferencia')),
  final_price INTEGER,                    -- Calculado: cantidad × precio_unitario
  order_date DATE DEFAULT CURRENT_DATE,
  delivered_date TIMESTAMP,
  observations TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Queries Principales

#### Cargar Pedidos con Relaciones
```typescript
const { data, error } = await supabase
  .from('3t_orders')
  .select(`
    *,
    customer:3t_customers!customer_id(
      customer_id,
      name,
      customer_type,
      phone,
      price
    ),
    address:3t_addresses!delivery_address_id(
      address_id,
      raw_address,
      commune
    ),
    product:3t_products!product_type(
      product_id,
      name,
      price_neto
    )
  `)
  .order('order_date', { ascending: false })
```

### Lógica de Cálculo de Precios

```typescript
// 1. Cuando selecciona cliente y tipo "Recarga"
useEffect(() => {
  if (formData.customer_id && formData.order_type === 'recarga') {
    const customer = customers.find(c => c.customer_id === formData.customer_id)
    if (customer) {
      const precioUnitario = customer.price || 0
      setFormData(prev => ({
        ...prev,
        precio_unitario: precioUnitario,
        precio_total: precioUnitario * prev.quantity
      }))
    }
  }
}, [formData.customer_id, formData.order_type, customers])

// 2. Cuando selecciona producto y tipo "Nuevo"
useEffect(() => {
  if (formData.product_type && formData.order_type === 'nuevo') {
    const product = products.find(p => p.product_id === formData.product_type)
    if (product) {
      const precioUnitario = product.price_neto || 0
      setFormData(prev => ({
        ...prev,
        precio_unitario: precioUnitario,
        precio_total: precioUnitario * prev.quantity
      }))
    }
  }
}, [formData.product_type, formData.order_type, products])

// 3. Cuando cambia cantidad
useEffect(() => {
  setFormData(prev => ({
    ...prev,
    precio_total: prev.precio_unitario * prev.quantity
  }))
}, [formData.quantity])

// 4. Tipo "Compras" → precio 0
if (formData.order_type === 'compras') {
  precio_unitario = 0
  precio_total = 0
}
```

### Crear Pedido
```typescript
const handleCreateOrder = async () => {
  const { data, error } = await supabase
    .from('3t_orders')
    .insert([{
      order_id: crypto.randomUUID(),
      customer_id: formData.customer_id,
      delivery_address_id: formData.delivery_address_id,
      product_type: formData.product_type,
      quantity: formData.quantity,
      final_price: formData.precio_total,
      status: formData.status,
      payment_status: formData.payment_status,
      payment_type: formData.payment_type,
      order_date: formData.order_date,
      observations: formData.details
    }])
  
  if (!error) {
    alert('Pedido creado exitosamente')
    loadOrders()
  }
}
```

---

## 💻 Código Técnico

### Ubicación
```
/opt/cane/3t/app/pedidos/page.tsx
```

### Tipo de Componente
```typescript
'use client'  // Cliente-side (hooks)
```

### Estados Principales
```typescript
const [orders, setOrders] = useState<any[]>([])
const [customers, setCustomers] = useState<Customer[]>([])
const [addresses, setAddresses] = useState<Address[]>([])
const [products, setProducts] = useState<Product[]>([])
const [searchTerm, setSearchTerm] = useState('')
const [loading, setLoading] = useState(true)
const [isDialogOpen, setIsDialogOpen] = useState(false)
const [activeTab, setActiveTab] = useState('todos')
const [editingOrder, setEditingOrder] = useState<any | null>(null)

const [formData, setFormData] = useState({
  customer_id: '',
  delivery_address_id: '',
  product_type: '',
  quantity: 1,
  order_type: 'recarga' as 'recarga' | 'nuevo' | 'compras',
  precio_unitario: 0,
  precio_total: 0,
  details: '',
  status: 'Pedido',
  payment_status: 'Pendiente',
  payment_type: 'Efectivo',
  order_date: format(new Date(), 'yyyy-MM-dd')
})
```

---

## 🔄 Flujo de Trabajo

```
Usuario abre /pedidos
         ↓
Carga pedidos con relaciones (customer, address, product)
         ↓
Usuario click "+ Nuevo Pedido"
         ↓
Modal se abre
         ↓
Selecciona Cliente → Carga direcciones automáticamente
         ↓
Selecciona Dirección
         ↓
Selecciona Tipo: "Recarga"
         ↓
Sistema busca customer.price → $2,500
         ↓
Selecciona Producto: "Botellón 20L"
         ↓
Cantidad: 10
         ↓
Sistema calcula: 10 × $2,500 = $25,000
         ↓
Usuario confirma: Estado "Pedido", Pago "Pendiente"
         ↓
Click "Crear Pedido"
         ↓
Supabase INSERT con todos los datos
         ↓
Pedido guardado
         ↓
Lista se actualiza
         ↓
✅ Pedido visible en tab "Pedido"
```

---

## 🔗 Relaciones con Otros Módulos

### Consume Datos De:
- ✅ `/clientes` - Información de clientes y direcciones
- ✅ `/productos` - Catálogo y precios

### Es Consumido Por:
- ✅ `/dashboard` - Analiza ventas de pedidos
- ✅ `/rutas` - Optimiza pedidos en estado "Ruta"
- ✅ `/mapa` - Visualiza ubicación de pedidos

---

## 📋 Ejemplos de Uso

### Caso 1: Pedido de Recarga
```
1. Click "+ Nuevo Pedido"
2. Cliente: "Supermercado ABC" (tiene precio $3,500)
3. Dirección: "Av. Kennedy 5600"
4. Tipo: ●Recarga
5. Producto: "Botellón 20L"
6. Cantidad: 15
7. Sistema calcula: 15 × $3,500 = $52,500
8. Estado: "Pedido", Pago: "Pendiente", Tipo: "Transferencia"
9. Click "Crear Pedido"
10. ✅ Pedido creado
```

### Caso 2: Pedido de Venta Nueva
```
1. Click "+ Nuevo Pedido"
2. Cliente: "Cliente Nuevo" (sin precio personalizado)
3. Tipo: ●Nuevo
4. Producto: "Botellón 10L" (precio $4,000)
5. Cantidad: 5
6. Sistema calcula: 5 × $4,000 = $20,000
7. Click "Crear Pedido"
8. ✅ Pedido creado
```

### Caso 3: Buscar Pedidos Antiguos para Editar ⭐ NUEVO
```
1. Abrir /pedidos
2. En campo de búsqueda escribir: "Restaurant El Sol"
3. Sistema busca en TODOS los pedidos históricos
4. Muestra mensaje: "Mostrando 8 resultado(s) para 'Restaurant El Sol'"
5. Aparecen todos los pedidos del cliente (incluso de hace meses)
6. Click en botón de editar del pedido deseado
7. ✅ Editar pedido antiguo
```

### Caso 4: Revisar Cuentas por Cobrar ⭐ NUEVO
```
1. Abrir /pedidos
2. Activar switch "Solo Pendientes"
3. Sistema muestra TODOS los pedidos con pago pendiente
4. Aparece mensaje: "Mostrando 23 resultado(s) con pago pendiente"
5. Revisar listado completo de deudas
6. Editar o marcar como pagado según corresponda
7. ✅ Gestión de cuentas por cobrar
```

### Caso 5: Buscar Cliente Específico con Deuda ⭐ NUEVO
```
1. Abrir /pedidos
2. Activar switch "Solo Pendientes"
3. En búsqueda escribir: "María González"
4. Sistema filtra: pendientes + nombre
5. Mensaje: "Mostrando 3 resultado(s) para 'María González' con pago pendiente"
6. Ver todos los pedidos pendientes de ese cliente
7. ✅ Búsqueda combinada efectiva
```

---

## 🐛 Troubleshooting

### Problema: Precio no se calcula
**Causa**: Tipo de pedido no seleccionado o datos faltantes

**Solución**:
```typescript
// Verificar que:
1. Cliente está seleccionado (si es Recarga)
2. Producto está seleccionado (si es Nuevo)
3. Tipo de pedido está definido
```

### Problema: Direcciones no cargan
**Causa**: Cliente no tiene direcciones

**Solución**:
```
1. Ir a /clientes
2. Editar el cliente
3. Agregar dirección con Google Maps
4. Volver a /pedidos
```

### Problema: No encuentro un pedido antiguo ⭐ RESUELTO
**Causa anterior**: Solo se mostraban últimos 100 pedidos

**Solución implementada:**
```
1. Usar el campo de búsqueda
2. Escribir nombre del cliente o ID del pedido
3. El sistema busca en TODOS los pedidos históricos sin límite
4. ✅ Ahora lo encuentras siempre
```

### Problema: Búsqueda muy lenta
**Causa**: Demasiadas consultas mientras escribes

**Solución ya implementada:**
```
✅ Debounce automático de 500ms
   - El sistema espera a que termines de escribir
   - Reduce consultas innecesarias
   - Si aún es lento, puede ser conexión de red
```

### Problema: No veo cuentas por cobrar antiguas
**Causa anterior**: Límite de 100 pedidos

**Solución:**
```
1. Activar switch "Solo Pendientes"
2. Sistema muestra TODOS los pagos pendientes
3. Sin límite temporal
4. ✅ Gestión completa de cuentas por cobrar
```

---

## 📚 Referencias

- Trigger `set_final_price()`: `docs/INSTALACION-COMPLETA.md` sección 3.3
- Cálculo de precios: `docs/CHANGELOG.md` - Importación de Orders

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación del Módulo: Pedidos**  
**Última actualización:** Octubre 13, 2025
- Mañana: Implementación de Pedidos Multi-Producto
- Tarde: Búsqueda Sin Límites y Filtro de Cuentas por Cobrar

