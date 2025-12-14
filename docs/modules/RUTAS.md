# 🚚 Módulo: Gestión de Rutas

**Ruta:** `/rutas`  
**Archivo:** `/app/rutas/page.tsx`  
**Tipo:** Página dinámica con drag & drop, optimización de rutas y visualización de mapas

---

## 📖 Descripción General

El módulo **Gestión de Rutas** permite organizar pedidos y compras en rutas de entrega optimizadas, con funcionalidad de drag & drop, visualización en mapa y sincronización automática.

### Propósito
- Organizar pedidos en rutas de entrega eficientes
- Optimizar rutas automáticamente usando Google Maps API
- Visualizar ubicaciones en mapa interactivo
- Gestionar capacidad de entrega (55 botellones por ruta)
- Integrar pedidos de entrega y compras en la misma ruta
- Sincronizar cambios entre usuarios (despachos en tiempo real)

### Audiencia
- **Administrativos**: Organizar rutas diarias
- **Conductores**: Ver rutas asignadas y navegar
- **Despachadores**: Marcar pedidos como despachados

---

## ✨ Funcionalidades

### 1. Vista de Pedidos Disponibles ⭐

**Descripción:** Sección superior que muestra todos los pedidos y compras pendientes de asignación.

**Características:**
- ✅ **Tarjetas compactas** con información esencial (cliente, productos, cantidad)
- ✅ **Colores por comuna** mediante borde izquierdo (visual y sutil)
- ✅ **Leyenda de colores** en el header para identificación rápida
- ✅ **Drag & drop** habilitado para arrastrar a rutas
- ✅ **Diferenciación visual**: 🔵 Entregas | 🟠 Compras
- ✅ **Agrupación automática** por comuna

**Colores por Comuna:**
```typescript
San Miguel → Verde esmeralda (#10b981)
Maipú → Azul (#3b82f6)
Pudahuel → Verde (#22c55e)
Cerrillos → Morado (#a855f7)
Quilicura → Cian (#06b6d4)
Renca → Ámbar (#f59e0b)
Lampa → Rojo (#ef4444)
```

**Formato de Tarjeta:**
```
┌────────────────────────────────┐
│ ║ 🔵 Margarita Oliver           │ ← Borde verde (San Miguel)
│      PET (x2)                   │
│      2                          │
└────────────────────────────────┘
```

---

### 2. Gestión de Rutas ⭐

**Descripción:** Sección inferior con cards de rutas donde se asignan pedidos.

**Características:**
- ✅ **Cards colapsables** para optimizar espacio
- ✅ **Indicador de capacidad** (actual/55 botellones)
- ✅ **Alerta visual** si excede capacidad (no bloqueante)
- ✅ **Botón "Navegar en Maps"** con ruta completa
- ✅ **Botón "Eliminar Ruta"** devuelve pedidos a disponibles
- ✅ **Reordenamiento** dentro de la ruta (drag & drop)
- ✅ **Color único por ruta** (azul, morado, naranja, verde, rojo, amarillo)
- ✅ **Marcado de despacho** con foto y notas

**Estructura de Card:**
```
┌─────────────────────────────────────────┐
│ Ruta 1     3 paradas     [15/55]        │ ← Borde azul
│ [Maps] [▼] [🗑️]                         │
├─────────────────────────────────────────┤
│ 1. Cliente ABC                          │
│    Av. Kennedy 123                      │
│    PC (x10)                             │
│    10 bot.                    [✓]       │
├─────────────────────────────────────────┤
│ 2. Cliente XYZ                          │
│    ...                                  │
└─────────────────────────────────────────┘
```

---

### 3. Drag & Drop Completo ⭐ NUEVO

**Implementado:** Octubre 14, 2025

**Tecnología:** `@dnd-kit/core` y `@dnd-kit/sortable`

**Funcionalidades:**
- ✅ **Pedidos disponibles → Rutas**: Arrastra de sección superior a cualquier ruta
- ✅ **Entre rutas**: Mueve pedidos de una ruta a otra
- ✅ **Reordenar dentro de ruta**: Cambia el orden de paradas
- ✅ **Feedback visual**: Opacidad reducida mientras se arrastra
- ✅ **Validación de capacidad**: Alerta si excede 55 botellones (no bloquea)
- ✅ **Guardado automático**: Cambios se guardan con debounce de 2 segundos

**Comportamiento:**
```typescript
// Sensores configurados para mejor UX
useSensor(PointerSensor, {
  activationConstraint: {
    distance: 8  // Evita drags accidentales
  }
})
```

---

### 4. Optimización Automática de Rutas ⭐

**Descripción:** Genera rutas optimizadas automáticamente usando Google Maps Directions API.

**Características:**
- ✅ **Algoritmo inteligente** agrupa por capacidad (max 55 botellones)
- ✅ **Optimización geográfica** minimiza distancia total
- ✅ **Considera punto de partida y llegada** (bodega)
- ✅ **Rutas circulares** (bodega → paradas → bodega)
- ✅ **Respeta compras** como entregas especiales (marcadas en naranja)

**Flujo:**
```
1. Click "Optimizar Rutas"
2. Sistema agrupa pedidos por capacidad
3. Para cada grupo:
   - Calcula ruta óptima con Google Maps
   - Ordena paradas por distancia
4. Crea rutas automáticamente
5. Guarda en 3t_saved_routes
6. ✅ Rutas listas para usar
```

**API Endpoint:**
```typescript
POST /api/optimize-route
Body: {
  pedidos: Pedido[]  // Todos los pedidos disponibles
}
Response: {
  rutas: Ruta[]     // Rutas optimizadas
}
```

---

### 5. Visualización en Mapa ⭐

**Descripción:** Mapa unificado que muestra todas las ubicaciones y rutas trazadas.

**Características:**
- ✅ **Mapa Google Maps** integrado
- ✅ **Marcador de bodega** (inicio/fin) 🟢
- ✅ **Marcadores de pedidos disponibles** (coloreados por comuna)
- ✅ **Marcadores numerados** por ruta (orden de entrega)
- ✅ **Polylines de colores** muestran ruta trazada
- ✅ **Filtros por ruta** (ver ruta específica o todas)
- ✅ **Toggle "Rutas Trazadas"** para mostrar/ocultar líneas
- ✅ **Info windows** al hacer clic en marcadores
- ✅ **Zoom automático** para mostrar todos los puntos

**Marcadores:**
```typescript
Bodega → Verde (#16a34a) con label "B"
Pedidos disponibles → Color de comuna (escala 12)
Pedidos en ruta → Color de ruta + número secuencial (escala 15)
Compras → Naranja (#f97316) con 🟠
```

**Polylines:**
- Cada ruta tiene su color único
- Grosor: 4px, Opacidad: 0.7
- Se dibuja usando Google Directions API
- Muestra ruta óptima en carreteras reales

---

### 6. Navegación con Google Maps ⭐

**Descripción:** Botón en cada ruta que abre Google Maps con la ruta completa.

**Características:**
- ✅ **URL dinámica** con todos los waypoints
- ✅ **Se abre en nueva pestaña** o app de Google Maps (móvil)
- ✅ **Modo conducción** predeterminado
- ✅ **Ruta circular** (bodega → paradas → bodega)

**Formato de URL:**
```
https://www.google.com/maps/dir/?api=1
  &origin=-33.5334497,-70.7651785      # Bodega
  &destination=-33.5334497,-70.7651785 # Bodega (circular)
  &waypoints=lat1,lng1|lat2,lng2|...   # Todas las paradas
  &travelmode=driving
```

---

### 7. Guardado Automático ⭐

**Descripción:** Cambios se guardan automáticamente sin intervención del usuario.

**Características:**
- ✅ **Debounce de 2 segundos** para evitar guardados excesivos
- ✅ **Guarda en `3t_saved_routes`** con `is_active = true`
- ✅ **Invalidación automática** de rutas anteriores
- ✅ **Incluye metadata**: total de pedidos, total de rutas
- ✅ **Feedback visual** en consola (desarrollo)

**Tabla:**
```sql
CREATE TABLE 3t_saved_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_data JSONB NOT NULL,
  total_orders INTEGER NOT NULL,
  total_routes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

### 8. Cálculo de Kilómetros ⭐ NUEVO

**Implementado:** Noviembre 4, 2025

**Descripción:** Cada ruta muestra los kilómetros totales calculados con Google Maps Directions API, visibles en un badge azul junto a la capacidad.

**Características:**
- ✅ **Badge de kilómetros** visible en cada ruta (📏 15.3 km)
- ✅ **Cálculo automático** al optimizar rutas
- ✅ **Recálculo en tiempo real** al mover pedidos manualmente
- ✅ **Persistencia en BD** al despachar (campo `route_distance_km`)
- ✅ **Métricas operacionales** para reportes de combustible y eficiencia

**Visualización:**
```
┌─────────────────────────────────────────┐
│ Ruta 1     2 paradas     [50/55]        │
│ 📏 15.3 km                              │ ← Badge azul
│ [Maps] [▼] [🗑️]                         │
└─────────────────────────────────────────┘
```

**Comportamiento:**

1. **Al Optimizar Rutas:**
   - Google Maps calcula ruta óptima con distancia total
   - Km se muestran automáticamente en badge azul
   - Se guardan en `rutaOptimizada.distanceMeters`

2. **Al Mover Pedidos (Drag & Drop):**
   - Sistema detecta cambio en la ruta
   - Recalcula km automáticamente (1-2 segundos)
   - Badge se actualiza con nueva distancia
   - Funciona en 3 casos:
     * Agregar pedido desde disponibles
     * Reordenar pedidos dentro de ruta
     * Mover pedido entre rutas

3. **Al Despachar:**
   - Km de la ruta se guardan en campo `route_distance_km`
   - Permite análisis histórico de distancias recorridas
   - Base para cálculo de costos de combustible

**Campo en Base de Datos:**
```sql
ALTER TABLE "3t_orders" 
ADD COLUMN route_distance_km NUMERIC(6,2) DEFAULT NULL;

COMMENT ON COLUMN "3t_orders".route_distance_km IS 
'Kilómetros totales de la ruta cuando se despachó este pedido (para métricas operacionales)';
```

**Ejemplos de Métricas:**

```sql
-- Kilómetros totales por mes
SELECT 
  TO_CHAR(DATE_TRUNC('month', delivered_date), 'YYYY-MM') as mes,
  COUNT(*) as pedidos_despachados,
  SUM(route_distance_km) as km_totales,
  ROUND(AVG(route_distance_km), 2) as km_promedio_por_ruta
FROM "3t_orders"
WHERE status = 'Despachado' 
  AND route_distance_km IS NOT NULL
GROUP BY DATE_TRUNC('month', delivered_date)
ORDER BY mes DESC;

-- Kilómetros por comuna
SELECT 
  a.commune as comuna,
  COUNT(o.order_id) as pedidos,
  SUM(o.route_distance_km) as km_totales,
  ROUND(AVG(o.route_distance_km), 2) as km_promedio
FROM "3t_orders" o
JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id
WHERE o.status = 'Despachado'
  AND o.route_distance_km IS NOT NULL
GROUP BY a.commune
ORDER BY km_totales DESC;
```

**Logs en Consola:**
```bash
# Al optimizar:
📊 Optimizando 2 rutas con Google Maps...
  ✅ Ruta 1: 15.3 km - 25 min
  ✅ Ruta 2: 42.7 km - 1 hr 5 min
✅ 2 rutas optimizadas con kilómetros calculados

# Al mover pedidos:
📏 Ruta 1 recalculada: 18.5 km
📏 Ruta 2 recalculada: 40.2 km
```

**Casos de Uso:**
- 📊 **Reportes mensuales** de kilómetros recorridos
- 💰 **Cálculo de costos** de combustible (km × costo/km)
- 📈 **Análisis de eficiencia** (botellones por kilómetro)
- 🗺️ **Optimización de zonas** de entrega
- 👤 **Métricas por conductor** (si se agrega campo de conductor)

---

### 🔄 Bug Fixes Críticos Implementados

**Fecha:** Octubre 16, 2025  
**Versión:** 2.1

El módulo de rutas recibió correcciones críticas para mejorar la persistencia y confiabilidad:

#### ✅ Fix #1: Persistencia de Rutas al Recargar

**Problema anterior:** Las rutas guardadas aparecían vacías al cambiar de página y volver.

**Solución implementada:**
- Invertido orden de carga: pedidos primero, rutas después
- Los pedidos siempre se cargan frescos desde la BD
- Las rutas guardadas se restauran correctamente con sus pedidos

**Logs visibles:**
```
📦 Cargando pedidos y compras desde BD...
✅ 15 pedidos cargados (2 compras + 13 entregas)
📂 Ruta guardada encontrada, restaurando...
   └─ 2 rutas con 15 pedidos
   └─ 0 pedidos quedan disponibles
✅ Rutas restauradas exitosamente
```

#### ✅ Fix #2: Guardado al Navegar Rápido

**Problema anterior:** Si cambiabas de página antes de 2 segundos, el último cambio se perdía.

**Solución implementada:**
- `useRef` mantiene estado siempre actualizado
- Guardado inmediato en cleanup del componente
- Garantiza persistencia incluso al navegar rápido

**Log visible al salir:**
```
💾 Guardando cambios pendientes antes de salir...
✅ Ruta guardada
```

#### ✅ Fix #3: Botón Recargar Completo

**Problema anterior:** Botón "Recargar" solo recargaba pedidos pero dejaba rutas.

**Solución implementada:**
- Limpia completamente el estado de rutas
- Re-inicializa el mapa desde cero
- Vuelve al estado inicial (todos los pedidos disponibles)

**Logs visibles:**
```
🔄 Force reload: limpiando rutas existentes...
🗺️ Limpiando instancia del mapa...
📦 Cargando pedidos y compras desde BD...
✅ 15 pedidos cargados
🔄 Force reload activado: mostrando todos los pedidos como disponibles
🗺️ Forzando re-render del mapa
🗺️ Renderizando mapa unificado
```

**Resultado:** El sistema ahora es completamente confiable para uso diario en producción.

---

### 9. Despacho de Pedidos ⭐ ACTUALIZADO

**Descripción:** Modal para confirmar entrega con foto y notas, con persistencia automática.

**Características:**
- ✅ **Foto opcional** (subida a Supabase Storage con compresión)
- ✅ **Notas opcionales** (observaciones del conductor)
- ✅ **Cantidad entregada** (puede ser menor a la solicitada)
- ✅ **Actualiza estado** a "Despachado" en `3t_orders`
- ✅ **Fecha y hora** de despacho automático
- ✅ **Remueve de ruta** automáticamente
- ✅ **Guarda rutas actualizadas** en `3t_saved_routes` (NUEVO Nov 6, 2025)
- ✅ **Toast de confirmación** verde con feedback visual (NUEVO Nov 6, 2025)
- ✅ **Persistencia automática** sin necesidad de "Recargar" (NUEVO Nov 6, 2025)

**Flujo Completo:**
1. Usuario hace clic en botón ✓ junto al pedido
2. Modal se abre con información del pedido
3. Usuario (opcionalmente) toma foto y escribe notas
4. Usuario confirma despacho
5. Sistema actualiza `3t_orders` con `status = 'Despachado'`
6. Sistema actualiza estado local (remueve pedido de ruta)
7. **Sistema guarda rutas actualizadas en `3t_saved_routes`** ✅
8. **Toast verde aparece: "✅ Pedido despachado"** ✅
9. Modal se cierra automáticamente

**Modal:**
```
┌──────────────────────────────────┐
│ Confirmar Despacho                │
├──────────────────────────────────┤
│ Cliente: ABC Corp                 │
│ Dirección: Av. Kennedy 123        │
│                                   │
│ [📷 Subir foto] (opcional)        │
│ [____________]                    │
│                                   │
│ Cantidad entregada: [10]          │
│ Notas: [____________]             │
│                                   │
│ [Cancelar] [✓ Confirmar Despacho]│
└──────────────────────────────────┘
```

**Toast de Confirmación (Nuevo):**
```
┌──────────────────────────────────┐
│ ✅ Pedido despachado              │
│ El pedido se marcó como           │
│ despachado exitosamente           │
└──────────────────────────────────┘
```

**Persistencia Automática:**
- ✅ El pedido desaparece inmediatamente de la ruta
- ✅ Las rutas guardadas se actualizan en `3t_saved_routes`
- ✅ Otros usuarios ven el cambio al recargar (sin Realtime)
- ✅ NO necesitas presionar "Recargar" manualmente
- ✅ Los kilómetros de la ruta se guardan en `route_distance_km`

---

### 10. Origen de Datos

**Fuentes:**
1. **Entregas**: `3t_orders` con `status = 'Ruta'`
   - Vista `3t_dashboard_ventas` (incluye customer, address, products)
2. **Compras**: `3t_purchases` con `status = 'Ruta'`
   - Relacionado con `3t_suppliers`, `3t_supplier_addresses`, `3t_purchase_products`

**Diferenciación Visual:**
- Entregas: 🔵 Azul (clientes)
- Compras: 🟠 Naranja (proveedores)

---

## 🎨 Interfaz de Usuario

### Componentes shadcn/ui
```typescript
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
```

### Librerías Drag & Drop
```typescript
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
```

### Estructura Visual

```
┌──────────────────────────────────────────────────────────┐
│  Gestión de Rutas                    [🔄] [🔵 Optimizar] │
│  Arrastra pedidos a las rutas o usa optimización         │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Pedidos Disponibles (3)         15 botellones total     │
├──────────────────────────────────────────────────────────┤
│  Leyenda: [║ San Miguel] [║ Quilicura] [║ Renca]        │
│                                                           │
│  [║🔵 Margarita Oliver]  [║🔵 APLICACIONES..]  [║🔵 Mi..] │
│     PET (x2)    2           PET (x12)    12     Trans..1  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Rutas (2)                            [+ agregar ruta]   │
├─────────────────────────┬────────────────────────────────┤
│  Ruta 1    2 paradas    │  Ruta 2    1 parada           │
│  [15/55] 🟢             │  [12/55] 🟢                   │
│  [Maps] [▼] [🗑️]        │  [Maps] [▼] [🗑️]              │
└─────────────────────────┴────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Mapa de Ubicaciones                                     │
│  Visualiza todos los pedidos disponibles y rutas        │
├──────────────────────────────────────────────────────────┤
│  [Todas] [Ruta 1] [Ruta 2]           [✓ Rutas Trazadas] │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │            [MAPA GOOGLE MAPS]                      │ │
│  │         Con marcadores y polylines                 │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 💾 Datos y Lógica

### Tipos TypeScript

```typescript
interface Pedido {
  id: string
  tipo: 'entrega' | 'compra'
  cliente: string  // o proveedor si es compra
  direccion: string
  comuna: string
  productos: string  // "PC (x5)" o "PC + PET (+1)"
  cantidadTotal: number
  latitude: number
  longitude: number
  order_date?: string
}

interface Ruta {
  numero: number
  pedidos: Pedido[]
  capacidadUsada: number
  rutaOptimizada?: OptimizedRoute
}

interface OptimizedRoute {
  pedidos: Pedido[]
  distance: number
  duration: number
}
```

### Queries Principales

#### Cargar Pedidos (Entregas)
```typescript
const { data, error } = await supabase
  .from('3t_dashboard_ventas')
  .select('*')
  .eq('status', 'Ruta')
  .not('latitude', 'is', null)
  .not('longitude', 'is', null)
```

#### Cargar Compras
```typescript
const { data: compras } = await supabase
  .from('3t_purchases')
  .select('*')
  .eq('status', 'Ruta')

const { data: suppliers } = await supabase
  .from('3t_suppliers')
  .select('*')

const { data: addresses } = await supabase
  .from('3t_supplier_addresses')
  .select('*')
  .not('latitude', 'is', null)

const { data: purchaseProducts } = await supabase
  .from('3t_purchase_products')
  .select('*')
```

#### Guardar Rutas
```typescript
// Invalidar ruta anterior
await supabase
  .from('3t_saved_routes')
  .update({ is_active: false })
  .eq('is_active', true)

// Guardar nueva ruta
await supabase
  .from('3t_saved_routes')
  .insert({
    route_data: { rutas },
    total_orders: rutas.reduce((sum, r) => sum + r.pedidos.length, 0),
    total_routes: rutas.length,
    is_active: true
  })
```

#### Marcar como Despachado
```typescript
const { error } = await supabase
  .from('3t_orders')
  .update({
    status: 'Despachado',
    delivered_date: new Date().toISOString(),
    botellones_entregados: cantidadEntregada,
    observations: notas,
    photo_url: photoUrl
  })
  .eq('order_id', pedidoId)
```

### Lógica de Drag & Drop

```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event
  if (!over) return
  
  const activeData = active.data.current
  const overData = over.data.current
  
  // Caso 1: Pedido disponible → Ruta
  if (activeData?.tipo === 'pedido-disponible' && overData?.tipo === 'ruta') {
    moverPedidoARuta(activeData.pedido, overData.rutaNumero)
  }
  
  // Caso 2: Reordenar dentro de ruta
  if (activeData?.tipo === 'pedido-en-ruta' && overData?.tipo === 'pedido-en-ruta') {
    reordenarDentroDeRuta(activeData.pedido, overData.pedido)
  }
  
  // Caso 3: Mover entre rutas
  if (activeData?.tipo === 'pedido-en-ruta' && overData?.tipo === 'ruta') {
    moverEntreRutas(activeData.pedido, overData.rutaNumero)
  }
  
  // Guardar automáticamente después del movimiento
  guardarRutasAutomaticamente()
}
```

### Optimización de Rutas

```typescript
const handleOptimizarRutas = async () => {
  setOptimizing(true)
  
  try {
    // 1. Agrupar por capacidad
    const grupos = groupOrdersByCapacity(pedidosDisponibles, 55)
    
    // 2. Optimizar cada grupo con Google Maps
    const rutasOptimizadas: Ruta[] = []
    
    for (let i = 0; i < grupos.length; i++) {
      const grupo = grupos[i]
      const rutaOptimizada = await calculateOptimizedRoute(grupo)
      
      rutasOptimizadas.push({
        numero: i + 1,
        pedidos: rutaOptimizada.pedidos,
        capacidadUsada: grupo.reduce((sum, p) => sum + p.cantidadTotal, 0),
        rutaOptimizada
      })
    }
    
    // 3. Actualizar estado
    setRutas(rutasOptimizadas)
    setPedidosDisponibles([])
    
    // 4. Guardar automáticamente
    guardarRutasAutomaticamente()
    
  } catch (error) {
    console.error('Error optimizando rutas:', error)
  } finally {
    setOptimizing(false)
  }
}
```

---

## 💻 Código Técnico

### Ubicación
```
/opt/cane/3t/app/rutas/page.tsx
/opt/cane/3t/lib/google-maps.ts          # Funciones de optimización
```

### Tipo de Componente
```typescript
'use client'  // Cliente-side (hooks, drag & drop, mapa)
```

### Estados Principales
```typescript
// Datos
const [pedidosDisponibles, setPedidosDisponibles] = useState<Pedido[]>([])
const [rutas, setRutas] = useState<Ruta[]>([])
const [dispatchedOrders, setDispatchedOrders] = useState<Set<string>>(new Set())

// UI
const [loading, setLoading] = useState(false)
const [optimizing, setOptimizing] = useState(false)
const [error, setError] = useState<string | null>(null)
const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
const [expandedRoutes, setExpandedRoutes] = useState<Set<number>>(new Set())

// Drag & Drop
const [activePedido, setActivePedido] = useState<Pedido | null>(null)

// Mapa
const [mapRefreshKey, setMapRefreshKey] = useState(0)
const [selectedRouteFilter, setSelectedRouteFilter] = useState<number | 'all'>('all')
const [showRouteLines, setShowRouteLines] = useState(true)

// Modal despacho
const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null)
const [deliveryNotes, setDeliveryNotes] = useState('')
const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null)
const [deliveredQuantity, setDeliveredQuantity] = useState<number>(0)

// Referencias
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
const mapRef = useRef<any>(null)
const markersRef = useRef<any[]>([])
const directionsRenderersRef = useRef<any[]>([])
```

### useEffect Hooks

```typescript
// 1. Verificar carga de Google Maps
useEffect(() => {
  const checkGoogleMaps = () => {
    const google = (window as any).google
    if (google && google.maps && google.maps.places) {
      setGoogleMapsLoaded(true)
    }
  }
  checkGoogleMaps()
  const interval = setInterval(checkGoogleMaps, 100)
  return () => clearInterval(interval)
}, [])

// 2. Cargar datos iniciales
useEffect(() => {
  cargarPedidosYCompras()
}, [])

// 3. Renderizar mapa
useEffect(() => {
  if (!googleMapsLoaded) return
  const hayPedidos = pedidosDisponibles.length > 0 || rutas.some(r => r.pedidos.length > 0)
  if (!hayPedidos) return
  
  // ... lógica de renderizado de mapa
  
}, [rutas, pedidosDisponibles, googleMapsLoaded, mapRefreshKey, selectedRouteFilter, showRouteLines])

// 4. Cleanup de timeout
useEffect(() => {
  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
  }
}, [])
```

---

## 🔄 Flujo de Trabajo

```
Usuario abre /rutas
         ↓
Sistema carga:
  - Pedidos de 3t_dashboard_ventas (status='Ruta')
  - Compras de 3t_purchases (status='Ruta')
         ↓
Se muestran como tarjetas en sección superior
(agrupadas visualmente por comuna con bordes de color)
         ↓
OPCIÓN A: Drag & Drop Manual
  1. Usuario arrastra pedido a ruta
  2. Pedido se mueve a la ruta
  3. Capacidad se actualiza
  4. Alerta si excede 55 (no bloquea)
  5. Guardado automático (2s debounce)
         ↓
OPCIÓN B: Optimización Automática
  1. Click "Optimizar Rutas"
  2. Sistema agrupa por capacidad (max 55)
  3. Cada grupo se optimiza con Google Maps
  4. Rutas se crean automáticamente
  5. Pedidos asignados en orden óptimo
  6. Guardado automático
         ↓
Rutas visibles en cards inferiores
         ↓
Usuario puede:
  - Ver detalles de cada ruta
  - Navegar en Google Maps
  - Reordenar pedidos dentro de ruta
  - Mover pedidos entre rutas
  - Eliminar rutas (pedidos vuelven arriba)
  - Ver mapa unificado con todas las ubicaciones
  - Marcar pedidos como despachados
         ↓
✅ Rutas organizadas y listas para entrega
```

---

## 🔗 Relaciones con Otros Módulos

### Consume Datos De:
- ✅ `/pedidos` - Pedidos en estado "Ruta"
- ✅ `/compras` - Compras pendientes de recogida (status "Ruta")
- ✅ `/clientes` - Datos de clientes (vía dashboard_ventas)
- ✅ `/proveedores` - Datos de proveedores (para compras)

### Es Consumido Por:
- ✅ `/mapa` - Puede visualizar ubicaciones de rutas
- ✅ Conductores - Usan rutas para entregas

### APIs Externas:
- ✅ **Google Maps JavaScript API** - Visualización de mapas
- ✅ **Google Maps Directions API** - Optimización y polylines
- ✅ **Google Maps Geocoding API** - Coordenadas

---

## 📋 Ejemplos de Uso

### Caso 1: Organización Manual con Drag & Drop
```
1. Abrir /rutas
2. Ver 5 pedidos disponibles en sección superior
3. Click "agregar ruta" para crear Ruta 1
4. Arrastrar 3 pedidos de San Miguel a Ruta 1
5. Sistema calcula: 15 botellones (15/55) 🟢
6. Click "agregar ruta" para crear Ruta 2
7. Arrastrar 2 pedidos de Quilicura a Ruta 2
8. Sistema guarda automáticamente
9. ✅ 2 rutas organizadas manualmente
```

### Caso 2: Optimización Automática
```
1. Abrir /rutas con 20 pedidos disponibles
2. Click "Optimizar Rutas"
3. Sistema muestra "Optimizando..."
4. Algoritmo:
   - Agrupa por capacidad (55 bot/ruta)
   - Calcula 4 rutas necesarias
   - Optimiza orden con Google Maps
5. Después de 5 segundos:
   - Ruta 1: 10 paradas (50 botellones)
   - Ruta 2: 8 paradas (52 botellones)
   - Ruta 3: 5 paradas (35 botellones)
   - Ruta 4: 7 paradas (48 botellones)
6. Pedidos ordenados por proximidad geográfica
7. ✅ Rutas optimizadas automáticamente
```

### Caso 3: Navegación con Google Maps
```
1. Ruta 1 tiene 5 paradas asignadas
2. Click botón "Maps" en Ruta 1
3. Sistema genera URL:
   - Origen: Bodega (Inppa)
   - Waypoint 1: Cliente A
   - Waypoint 2: Cliente B
   - Waypoint 3: Cliente C
   - Waypoint 4: Cliente D
   - Waypoint 5: Cliente E
   - Destino: Bodega (circular)
4. Se abre Google Maps en nueva pestaña/app
5. Conductor sigue ruta paso a paso
6. ✅ Navegación completa lista
```

### Caso 4: Visualización en Mapa
```
1. Abrir /rutas con pedidos y rutas
2. Scroll hasta sección "Mapa de Ubicaciones"
3. Mapa muestra:
   - Marcador verde en bodega (B)
   - Marcadores de pedidos disponibles (colores por comuna)
   - Marcadores numerados de Ruta 1 (azul)
   - Marcadores numerados de Ruta 2 (morado)
   - Polylines azules y moradas trazando rutas
4. Click filtro "Ruta 1"
5. Mapa se ajusta para mostrar solo Ruta 1
6. Click marcador de parada 3
7. Info window muestra datos del pedido
8. ✅ Visualización completa de rutas
```

### Caso 5: Marcar Pedido como Despachado
```
1. Conductor llega a Cliente ABC
2. En Ruta 1, encuentra pedido de ABC
3. Click botón ✓ al lado del pedido
4. Modal se abre:
   - Cliente: ABC Corp
   - Dirección: Av. Kennedy 123
5. Conductor toma foto con cámara
6. Sube foto
7. Escribe nota: "Recibido por Juan Pérez"
8. Cantidad entregada: 10 (misma cantidad)
9. Click "Confirmar Despacho"
10. Sistema:
    - Actualiza status a "Despachado"
    - Guarda foto en Storage
    - Guarda nota en observations
    - Remueve de ruta
    - Actualiza vista para otros usuarios
11. ✅ Pedido despachado y registrado
```

### Caso 6: Ajustar Ruta por Capacidad
```
1. Ruta 1 tiene 45 botellones (45/55) 🟢
2. Arrastrar pedido de 15 botellones a Ruta 1
3. Capacidad actualiza: 60/55 🟠
4. Alerta visible: "⚠️ Capacidad excedida: +5 botellones"
5. Sistema NO bloquea, solo advierte
6. Usuario decide:
   OPCIÓN A: Dejar así (puede llevar más)
   OPCIÓN B: Mover 1 pedido a otra ruta
7. Si elige B:
   - Arrastra pedido de 10 bot a Ruta 2
   - Ruta 1: 50/55 🟢
   - Ruta 2: 25/55 🟢
8. ✅ Capacidades balanceadas
```

---

## 🐛 Troubleshooting

### Problema: Pedidos no cargan
**Causa**: No hay pedidos con status "Ruta"

**Solución**:
```
1. Ir a /pedidos
2. Cambiar estado de pedidos a "Ruta"
3. Volver a /rutas
4. Click "Recargar"
5. ✅ Pedidos aparecen
```

### Problema: Drag & drop no funciona
**Causa**: El cursor debe moverse al menos 8px para activar

**Solución**:
```
1. Hacer click sostenido en tarjeta
2. Arrastrar al menos 8 píxeles
3. Soltar sobre ruta destino
4. Si sigue sin funcionar:
   - Recargar página
   - Verificar que no hay errores en consola
```

### Problema: Mapa no se muestra
**Causa**: Google Maps API no ha cargado o no hay pedidos

**Solución**:
```
1. Verificar consola para errores
2. Verificar que NEXT_PUBLIC_GOOGLE_MAPS_API_KEY está en .env
3. Asegurarse que hay pedidos disponibles O rutas con pedidos
4. El mapa requiere coordenadas válidas
5. Recargar página
```

### Problema: Optimización falla
**Causa**: Google Maps API alcanzó límite o error de red

**Solución**:
```
1. Verificar consola para error específico
2. Verificar cuota de Google Maps API
3. Esperar 30 segundos e intentar nuevamente
4. Si persiste, organizar manualmente con drag & drop
```

### Problema: Rutas no se guardan
**Causa**: Error de conexión con Supabase

**Solución**:
```
1. Verificar conexión a internet
2. Verificar en consola: "✅ Ruta guardada automáticamente"
3. Si no aparece:
   - Verificar credenciales de Supabase
   - Verificar RLS en tabla 3t_saved_routes
4. Recargar y volver a organizar rutas
```

### Problema: Colores de comuna no se ven en modo oscuro
**Causa anteriormente**: Usaba clases Tailwind que no funcionaban en dark mode

**Solución implementada:**
```
✅ Ahora usa inline styles con colores hex
✅ Los bordes de colores funcionan en ambos modos
✅ Si aún no se ven, limpiar caché del navegador
```

### Problema: Rutas aparecen vacías al recargar
**Causa**: [RESUELTO] Bug corregido en versión 2.1

**Solución**:
```
✅ Este problema fue corregido el 16/10/2025
✅ Las rutas ahora se cargan correctamente con todos sus pedidos
✅ Si sigues experimentando este problema:
   1. Verifica versión en producción (debe ser > 2.1)
   2. Limpia caché del navegador
   3. Verifica logs en consola: debe mostrar "Rutas restauradas exitosamente"
```

### Problema: Cambios se pierden al cambiar de página
**Causa**: [RESUELTO] Bug corregido en versión 2.1

**Solución**:
```
✅ Este problema fue corregido el 16/10/2025
✅ El sistema ahora guarda cambios pendientes antes de salir
✅ Verifica en logs: "💾 Guardando cambios pendientes antes de salir..."
```

### Problema: Capacidad excedida bloquea guardado
**Respuesta**: Esto es CORRECTO por diseño

**Explicación:**
```
El sistema DEBE permitir exceder capacidad:
- Solo muestra alerta visual (borde naranja)
- NO bloquea movimientos
- NO impide guardar
- Deja al usuario decidir si continúa o ajusta

Esto es intencional para flexibilidad operativa.
```

---

## 🔒 Seguridad

### Validaciones Implementadas
- ✅ **Queries parametrizadas**: Uso de `.eq()` de Supabase
- ✅ **Filtrado de coordenadas**: Solo pedidos con lat/lng válidos
- ✅ **Sanitización de inputs**: No se renderiza HTML arbitrario
- ✅ **RLS activo**: En todas las tablas involucradas
- ✅ **Variables de entorno**: API keys no expuestas en código

### Variables Requeridas
```bash
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 📚 Referencias

### Documentación Relacionada
- **Plan original**: `/refactorizaci-n-m-dulo-rutas.plan.md`
- **Optimización**: `docs/modules/OPTIMIZADOR-RUTAS.md`
- **Google Maps**: `docs/MIGRACION-GOOGLE-MAPS-AUTOCOMPLETE.md`
- **Changelog**: `docs/CHANGELOG.md` - Octubre 14, 2025

### Librerías Usadas
- `@dnd-kit/core` v6.1.0 - Drag & drop
- `@dnd-kit/sortable` v8.0.0 - Reordenamiento
- `@googlemaps/js-api-loader` - Carga de Google Maps
- `date-fns` - Manejo de fechas
- `shadcn/ui` - Componentes UI

### API Endpoints
- `POST /api/optimize-route` - Optimización de rutas

---

## 📊 Métricas y Rendimiento

### Performance
- **Debounce de guardado**: 2 segundos
- **Debounce de mapa**: 300ms
- **Carga inicial**: <2 segundos (promedio)
- **Optimización de rutas**: 3-10 segundos (depende de cantidad)

### Límites
- **Capacidad por ruta**: 55 botellones (recomendado, no forzado)
- **Waypoints Google Maps**: 25 máximo por ruta
- **Pedidos simultáneos**: Sin límite técnico

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación del Módulo: Gestión de Rutas**  
**Última actualización:** Octubre 14, 2025  
**Versión:** 2.0 (Refactorización Completa)

---

## 🎯 Resumen Ejecutivo

**Refactorización completa implementada exitosamente:**

✅ **Interfaz moderna** con drag & drop intuitivo  
✅ **Optimización automática** con Google Maps API  
✅ **Visualización en mapa** con polylines y marcadores  
✅ **Guardado automático** sin intervención del usuario  
✅ **Persistencia confiable** - Bugs críticos corregidos  
✅ **Integración de compras** junto con entregas  
✅ **Gestión de capacidad** con alertas visuales no bloqueantes  
✅ **Navegación por ruta** con Google Maps  
✅ **Modo oscuro** completamente funcional  
✅ **Responsive design** para móviles y tablets  

**El módulo más avanzado del sistema.**

---

## 🆘 Sistema de Ayuda Contextual

**Fecha Implementación:** Octubre 15, 2025  
**Estado:** ✅ Completamente funcional  
**Componentes:** SimpleTooltip, SimplePopover, DisabledButtonHelper, SimpleValidationPanel

### 📍 Tooltips Implementados

Este módulo cuenta con **10 tooltips contextuales** que guían al usuario:

#### **Header:**
1. **Botón Recargar** → "Recarga los pedidos en estado 'Ruta' desde la base de datos"
2. **Botón Optimizar Rutas** → Feedback dinámico según estado:
   - Deshabilitado sin Maps: "Google Maps está cargando, espera un momento"
   - Deshabilitado sin pedidos: "Se necesitan al menos 2 pedidos (tienes X)"
   - Habilitado: Sin tooltip

#### **Gestión de Rutas:**
3. **Botón (?) al lado de "Rutas"** → Popover con guía de gestión de rutas
4. **Botón "agregar ruta"** → "Crea una ruta vacía para organizar manualmente los pedidos"

#### **Card de Ruta:**
5. **Botón Maps** → "Abre esta ruta en Google Maps para navegación"
6. **Botón Expandir/Colapsar** → "Expandir/colapsar detalles de la ruta"
7. **Botón Eliminar** → "Eliminar esta ruta y devolver pedidos a disponibles"

#### **Mapa - Filtros:**
8. **Botón "Todas las Rutas"** → "Mostrar todas las rutas en el mapa"
9. **Botones "Ruta 1, 2, 3..."** → "Mostrar solo los pedidos de la Ruta X en el mapa"
10. **Toggle Rutas Trazadas** → Tooltip dinámico:
    - Activo: "Ocultar las líneas trazadas de las rutas en el mapa"
    - Inactivo: "Mostrar las líneas trazadas de las rutas en el mapa"

### 📊 Panel de Validaciones

**Ubicación:** Esquina inferior derecha (flotante y colapsable)

**3 validaciones en tiempo real:**
1. **Pedidos disponibles/asignados:**
   - ✅ Verde: "Todos los pedidos asignados" (cuando count = 0 y hay rutas)
   - ✅ Verde: "X pedidos listos para asignar" (cuando count >= 2)
   - ❌ Rojo: "Al menos 2 pedidos para optimizar" (cuando count < 2)

2. **Capacidad dentro del límite:**
   - ✅ Verde: Todas las rutas ≤ 55 botellones
   - ❌ Rojo: "Algunas rutas exceden la capacidad máxima"

3. **Rutas creadas:**
   - ✅ Verde: Al menos 1 ruta creada
   - ❌ Rojo: "Al menos una ruta para organizar"

**Características:**
- Estado collapsed se persiste en `localStorage`
- Contador de validaciones: (3/3) o (2/3)
- Ícono visual: ✅ verde si todo OK, ❌ rojo si hay errores

### 🎯 Popovers Informativos

**2 popovers con guías detalladas:**

1. **Header (?) - "Cómo usar el Módulo de Rutas":**
   - 6 pasos desde carga de pedidos hasta despacho
   - Leyenda de colores y símbolos
   - Información sobre capacidad máxima

2. **Rutas (?) - "Gestión de Rutas":**
   - Cómo crear rutas manualmente
   - Cómo arrastrar pedidos
   - Cómo usar la optimización automática
   - Límites de capacidad

### 🎨 Estilo Consistente

**Todos los tooltips comparten:**
- Fondo oscuro: `bg-gray-900` / `bg-gray-800`
- Texto blanco con buen contraste
- Bordes redondeados: `rounded-lg`
- Sombra pronunciada: `shadow-xl`
- Borde sutil: `border-gray-700`
- Delay de 200ms antes de mostrar
- z-index: 9999 (siempre visible)
- Posicionamiento inteligente que evita salir del viewport

### 📱 Soporte Mobile

**Características touch-friendly:**
- Detección automática de dispositivos móviles
- Tooltips se activan por tap (no hover)
- Auto-cierre después de 3 segundos
- Popovers con botón de cerrar visible
- Panel colapsable con gestos táctiles

### ♿ Accesibilidad

**Cumplimiento WCAG:**
- `role="tooltip"` en todos los tooltips
- `role="dialog"` en popovers
- `aria-label` en botones de ayuda
- `aria-describedby` para describir controles deshabilitados
- Contraste de color AAA
- Navegación por teclado (Tab, Enter, Escape)
- Focus visible en todos los elementos interactivos

### 🔧 Implementación Técnica

**Componentes utilizados:**
```tsx
import { 
  SimpleTooltip, 
  SimplePopover, 
  DisabledButtonHelper, 
  SimpleValidationPanel 
} from '@/components/help'
```

**Store de validaciones:**
```tsx
import { useRouteValidationsStore } from '@/stores/route-validations'
```

**Contenidos:**
```tsx
import { RUTAS_HELP } from '@/lib/help/rutas'
```

**Ejemplo de uso:**
```tsx
// Tooltip simple
<SimpleTooltip content="Texto de ayuda">
  <Button>Mi Botón</Button>
</SimpleTooltip>

// Botón deshabilitado con feedback
<DisabledButtonHelper
  disabled={!canSave}
  reason="No se puede guardar todavía"
  requirements={['Completa todos los campos', 'Selecciona una opción']}
>
  <Button disabled={!canSave}>Guardar</Button>
</DisabledButtonHelper>

// Popover informativo
<SimplePopover
  title="Cómo usar esta función"
  description="Explicación detallada"
  steps={['Paso 1', 'Paso 2', 'Paso 3']}
  module="rutas"
  helpKey="tutorial"
  place="header"
/>

// Panel de validaciones
<SimpleValidationPanel
  items={validationsStore.getValidationItems()}
  position="bottom-right"
/>
```

### 📚 Documentación Relacionada

- **Guía completa:** `/opt/cane/3t/components/help/README.md`
- **Arquitectura:** `/opt/cane/3t/docs/modules/SISTEMA-AYUDAS.md`
- **Changelog:** `/opt/cane/3t/docs/CHANGELOG.md` (Octubre 15, 2025)

---

**💧 Agua Tres Torres - Módulo de Rutas**  
**Última actualización:** Noviembre 4, 2025  
**Versión:** 2.2 - Cálculo y Tracking de Kilómetros

