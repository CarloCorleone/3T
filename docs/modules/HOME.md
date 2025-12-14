# 🏠 Módulo HOME - Dashboard Operacional

## 📝 Descripción General

El módulo **Home** es el **Dashboard Operacional** principal de la aplicación Agua Tres Torres. Sirve como punto de entrada para operadores y repartidores, mostrando información clave y permitiendo gestionar pedidos directamente desde la vista principal.

---

## 👥 Público Objetivo

- **Operadores**: Personal que gestiona las entregas diarias
- **Repartidores**: Conductores que realizan las entregas
- **Supervisores**: Personal que supervisa las operaciones del día

---

## 🎯 Propósito

Proveer una vista consolidada y operacional que permita:

1. **Saludo personalizado** con resumen del día
2. **Gestión rápida de pedidos** en ruta con despacho directo
3. **Visualización de rutas optimizadas** con acceso al mapa completo
4. **Monitoreo de observaciones importantes** de pedidos activos

---

## ✨ Funcionalidades Principales

### 1. Saludo Personalizado y Resumen del Día

**Card destacada** al inicio del dashboard que muestra:

- 🌤️ **Saludo contextual** según hora del día (Buenos días/tardes/noches)
- 👤 **Nombre del usuario** autenticado
- 📊 **Resumen operacional**:
  - Número de pedidos en ruta
  - Desglose de productos (PET, PC, etc.)
  - Cantidad de viajes necesarios

**Ejemplo de mensaje:**
> "Buenos días Juan, hoy hay un total de 4 pedidos en ruta con 33 PET para despachar, requiriendo 1 viaje."

**Datos mostrados:**
- Total de pedidos con `status = 'Ruta'`
- Totales de productos por tipo (PET, PC)
- Viajes necesarios calculados (capacidad: 55 botellones/viaje)

---

### 2. Pedidos en Gestión ⭐ ACTUALIZADO

**Lista compacta** de pedidos con tabs, despacho directo y visualización de despachados:

#### Estructura

```
┌──────────────────────────────────────────────────────────────┐
│  🚚 Pedidos en Gestión                  [33 PET] [33 Total] │
├──────────────────────────────────────────────────────────────┤
│  [En Ruta (4)] [Pedidos (2)]                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Conade Molymet    San Bernardo    10 PET          ✓   │  │ ← Activos
│  │ Conade Ariztía    Melipilla         9 PET          ✓   │  │
│  │                                                         │  │
│  │ ─────────────── Despachados Hoy ──────────────         │  │ ← Separador (NUEVO)
│  │                                                         │  │
│  │ ✅ Conade Melifeed  Melipilla  10 PET  Despachado ✓   │  │ ← Verde (NUEVO)
│  │ ✅ Conade El Paico  El Monte    4 PET  Despachado ✓   │  │ ← Verde (NUEVO)
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### Características

- **Vista por tabs**:
  - "En Ruta": Pedidos listos para despachar + Despachados HOY (NUEVO)
  - "Pedidos": Pedidos pendientes de asignar a ruta
- **Lista compacta** tipo tabla con filas:
  - Cliente | Comuna | Cantidad + Producto | Botón ✓
- **Totales de productos** en el header (badges con iconos)
- **Botón de despacho directo** (✓) por cada pedido
- **✅ Visualización de Despachados** (NUEVO Nov 6, 2025):
  - Pedidos despachados HOY aparecen al final
  - Fondo verde claro con borde verde
  - Texto en tonos verdes
  - Badge "Despachado" con ícono check
  - Separador visual "Despachados Hoy"
  - Solo en tab "En Ruta"

#### Funcionalidad de Despacho ⭐ ACTUALIZADO

Al hacer clic en el botón ✓, se abre un **modal de confirmación** con:

1. **Información del pedido**:
   - Cliente, dirección, comuna
   - Producto y cantidad solicitada
2. **Cantidad entregada** (input numérico)
3. **Notas del despacho** (textarea opcional)
4. **Foto de entrega** (input file, OPCIONAL)
   - Con timeout de 10s para evitar colgado de app
   - Si falla la subida, el despacho continúa

**Proceso:**
```typescript
// 1. Actualizar orden en Supabase
await supabase
  .from('3t_orders')
  .update({
    status: 'Despachado',
    delivered_date: new Date().toISOString(),
    botellones_entregados: deliveredQuantity,
    delivery_photo_path: photoPath, // opcional
    details: deliveryNote // opcional
  })
  .eq('order_id', selectedPedido.order_id)

// 2. Recargar datos del dashboard
await loadDashboardData()

// ✅ NUEVO: El pedido ahora aparece en verde al final de la lista
```

**Resultado Visual (NUEVO Nov 6, 2025):**
- Pedido se mueve automáticamente a sección de "Despachados Hoy"
- Aparece con fondo verde claro y borde verde
- Badge "Despachado" con ícono check verde
- Separador visual si es el primer despachado del día
- **Feedback inmediato**: Ver progreso del día en tiempo real

---

### 3. Rutas Optimizadas del Día

**Card azul** con resumen de rutas guardadas:

```
┌──────────────────────────────────────────────────────────────┐
│  🗺️ Rutas Optimizadas del Día                               │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  R1    2 paradas   23 botellones      23 PET  0 PC    │  │
│  │  R2    2 paradas   10 botellones      10 PET  0 PC    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Total: 2 rutas | 4 paradas | 33 botellones                 │
│                                                              │
│  [🗺️ Ver Mapa Completo de Rutas →]                          │
└──────────────────────────────────────────────────────────────┘
```

#### Características

- **Muestra rutas activas** guardadas en `3t_saved_routes`
- **Desglose por ruta**:
  - Número de ruta
  - Cantidad de paradas
  - Capacidad usada
  - Productos PET y PC
- **Totales generales** al final
- **Botón grande** para ver el mapa completo en `/rutas`

---

### 4. Observaciones Importantes

**Card amarilla** con observaciones de pedidos en ruta:

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️ Observaciones Importantes                                │
├──────────────────────────────────────────────────────────────┤
│  Recimat: PEDIDO SRA. LIDIA                                  │
│  [Ver 2 más ▼]                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Características

- **Solo muestra pedidos en estado "Ruta"** con notas/detalles
- Campo `details` de la vista `3t_dashboard_ventas`
- **Expansión/colapso** si hay más de 5 observaciones
- Formato: `Cliente: Observación`

---

## 🗑️ Elementos Removidos

❌ **Pedidos del Día** (redundante con "Pedidos en Gestión")  
❌ **KPIs individuales grandes** (resumidos en saludo personalizado)  
❌ **Cards separadas de productos** (integradas en header de Pedidos en Gestión)

---

## 💾 Flujo de Datos

### Queries Principales (Paralelas)

```typescript
const [
  pedidosHoyRes,
  pedidosPendientesRes,
  pedidosEnRutaRes,      // Vista 3t_dashboard_ventas con status='Ruta'
  pedidosEnPedidoRes,    // Vista 3t_dashboard_ventas con status='Pedido'
  productosRutaRes,      // Tabla 3t_orders para totales
  clientesRes,
  productosRes,
  rutasGuardadasRes      // Tabla 3t_saved_routes
] = await Promise.all([...])
```

### Tablas y Vistas Utilizadas

1. **`3t_dashboard_ventas`** (vista):
   - Pedidos con JOINS de clientes, productos, direcciones
   - Campos: `order_id`, `customer_name`, `product_name`, `quantity`, `status`, `details`, `commune`, etc.

2. **`3t_orders`** (tabla):
   - Para totales de productos y métricas

3. **`3t_customers`** (tabla):
   - Mapa de clientes para lookup

4. **`3t_products`** (tabla):
   - Mapa de productos para lookup

5. **`3t_saved_routes`** (tabla):
   - Rutas optimizadas guardadas activas

### Cálculos

```typescript
// Pedidos en ruta
const pedidosEnRuta = todosPedidos.filter(p => p.status === 'Ruta').length

// Viajes necesarios
const viajesNecesarios = Math.ceil(totalUnidades / 55)

// Totales de productos por tipo
const totales: Record<string, number> = {}
productosRutaData.forEach(p => {
  const nombreProducto = productosMap[p.product_type] || 'Sin categoría'
  totales[nombreProducto] = (totales[nombreProducto] || 0) + p.quantity
})

// Conteo PET/PC en rutas
const contarProductosPorTipo = (pedidos: any[]) => {
  let pet = 0, pc = 0
  pedidos.forEach(p => {
    const producto = p.raw_data?.product_name || p.productos || ''
    const cantidad = p.cantidadTotal || 0
    if (producto.toLowerCase().includes('pet')) pet += cantidad
    else if (producto.toLowerCase().includes('pc')) pc += cantidad
  })
  return { pet, pc }
}
```

---

## 🎨 UI/UX

### Jerarquía Visual

1. **Saludo y resumen** (Card destacada con gradiente)
2. **Pedidos en gestión** (Card con border primario, shadow)
3. **Rutas optimizadas** (Card azul con información estructurada)
4. **Observaciones** (Card amarilla, solo si hay datos)

### Colores de Estado

- **Primario**: Botones y métricas principales
- **Verde**: Confirmación de despacho (hover del botón ✓)
- **Azul**: Rutas optimizadas
- **Amarillo/Amber**: Observaciones importantes

### Responsividad

- **Mobile**: Cards apiladas verticalmente
- **Tablet/Desktop**: Grid de 2 columnas para algunas secciones
- **Lista de pedidos**: Siempre de ancho completo con scroll horizontal si es necesario

---

## 🔄 Estados de Carga

```typescript
const [loading, setLoading] = useState(true)
const [dispatching, setDispatching] = useState(false)
const [userName, setUserName] = useState<string>('')
const [todosPedidos, setTodosPedidos] = useState<any[]>([])
const [filtroPedidos, setFiltroPedidos] = useState<'Ruta' | 'Pedido'>('Ruta')
const [productosRutaTotales, setProductosRutaTotales] = useState<Record<string, number>>({})
const [rutasOptimizadas, setRutasOptimizadas] = useState<any[]>([])
const [observacionesImportantes, setObservacionesImportantes] = useState<any[]>([])
```

---

## 🔗 Interacciones y Navegación

### Botones de Acción

- **✓ Despachar**: Abre modal de confirmación de despacho
- **Ver Mapa Completo de Rutas**: Navega a `/rutas`

### Tabs

- **En Ruta**: Pedidos listos para despachar (vista por defecto)
- **Pedidos**: Pedidos pendientes de asignar a ruta

---

## 📱 Casos de Uso

### Caso 1: Repartidor inicia el día

1. Abre la app → Home
2. Ve el saludo con resumen: "4 pedidos en ruta, 33 PET, 1 viaje"
3. Revisa la lista de pedidos en la tab "En Ruta"
4. Verifica observaciones importantes antes de salir

### Caso 2: Repartidor completa una entrega

1. Abre la app → Home
2. Hace clic en el botón ✓ del pedido entregado
3. Completa el modal:
   - Cantidad entregada: 10
   - Notas: "Recibido por Juan"
   - Foto: (opcional)
4. Confirma despacho
5. El pedido desaparece de la lista "En Ruta"

### Caso 3: Supervisor revisa progreso

1. Abre la app → Home
2. Ve el saludo personalizado con su nombre
3. Revisa cuántos pedidos quedan en ruta
4. Hace clic en "Ver Mapa Completo de Rutas" para ver el estado en tiempo real

---

## ⚙️ Configuración Técnica

### Estados de Pedido

- `Pedido`: Pedido creado, no asignado a ruta
- `Ruta`: Pedido asignado a ruta, listo para despachar
- `Despachado`: Pedido entregado

### Capacidad de Camión

- **55 botellones por viaje** (constante)
- Cálculo automático de viajes necesarios

### Timeout de Subida de Fotos

- **10 segundos** para subida a Supabase Storage
- Si falla, el despacho continúa sin foto

---

## 📊 Métricas Mostradas

### Saludo Personalizado

- Total pedidos en ruta
- Productos por tipo (PET, PC)
- Viajes necesarios

### Pedidos en Gestión

- Count de pedidos "En Ruta"
- Count de pedidos "Pedido"
- Totales de productos (badges en header)

### Rutas Optimizadas

- Número de rutas
- Total de paradas
- Total de botellones
- Desglose PET/PC por ruta

---

## 🛠️ Tecnologías

- **Next.js 15** (App Router)
- **TypeScript**
- **Supabase** (PostgreSQL + Storage + Auth)
- **shadcn/ui** (Button, Card, Dialog, Input, Textarea, Tabs, Badge)
- **Lucide Icons**
- **date-fns** (formateo de fechas)
- **Tailwind CSS**

---

## 📂 Archivos Relacionados

- `/app/page.tsx` - Componente principal del Home
- `/lib/supabase.ts` - Cliente de Supabase
- `/docs/DATABASE_SCHEMA_FOR_AI.md` - Esquema de base de datos
- `/docs/modules/RUTAS.md` - Documentación del módulo de rutas

---

## 🔮 Mejoras Futuras Posibles

- [ ] Notificaciones push al completar despacho
- [ ] Filtros adicionales (por comuna, producto)
- [ ] Gráfico de progreso del día (% pedidos despachados)
- [ ] Vista de calendario con pedidos programados
- [ ] Integración con GPS para tracking en tiempo real
