# 🗺️ Módulo: Mapa

**Ruta:** `/mapa`  
**Archivo:** `/app/mapa/page.tsx`  
**Tipo:** Página dinámica con visualización geográfica (Leaflet.js)

---

## 📖 Descripción General

El módulo **Mapa** proporciona una **visualización geográfica interactiva** de todas las direcciones de entrega del sistema, permitiendo filtrar por fecha, estado y tipo de cliente.

### Propósito
- Visualizar ubicación de entregas en mapa interactivo
- Filtrar entregas por fecha específica
- Filtrar por estado de pedido (Pedido/Ruta/Despachado)
- Filtrar por tipo de cliente (Hogar/Empresa)
- Ver estadísticas en tiempo real según filtros

### Audiencia
- **Gerentes**: Vista general de zonas de cobertura
- **Conductores**: Ver entregas del día en el mapa
- **Logística**: Identificar zonas concentradas de entrega

---

## ✨ Funcionalidades

### 1. Mapa Interactivo (Leaflet.js)

- **Biblioteca**: react-leaflet + Leaflet
- **Tiles**: OpenStreetMap
- **Centro inicial**: Santiago, Chile (-33.4489, -70.6693)
- **Zoom**: Ajustable con rueda del ratón o botones
- **Marcadores**: Cada dirección de entrega con coordenadas GPS

### 2. Filtros Disponibles

#### Filtro de Fecha (Nuevo)
```typescript
// Selector de fecha con calendario
<Popover>
  <PopoverTrigger>
    <Button variant="outline">
      {fechaFiltro ? format(fechaFiltro, 'PPP', { locale: es }) : 'Filtrar por fecha'}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Calendar mode="single" selected={fechaFiltro} onSelect={setFechaFiltro} />
  </PopoverContent>
</Popover>
```

**Funcionalidad**:
- Click en botón abre calendario
- Seleccionar fecha filtra entregas de ese día
- Botón "X" limpia el filtro
- Badge "Filtro activo" visible cuando hay filtro

#### Filtro de Estado de Pedido
```typescript
<Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
  <SelectItem value="todos">Todos los Estados</SelectItem>
  <SelectItem value="Pedido">Pedido</SelectItem>
  <SelectItem value="Ruta">Ruta</SelectItem>
  <SelectItem value="Despachado">Despachado</SelectItem>
</Select>
```

#### Filtro de Tipo de Cliente
```typescript
<Select value={tipoClienteFiltro} onValueChange={setTipoClienteFiltro}>
  <SelectItem value="todos">Todos los Tipos</SelectItem>
  <SelectItem value="Hogar">Hogar</SelectItem>
  <SelectItem value="Empresa">Empresa</SelectItem>
</Select>
```

### 3. Marcadores Agrupados

**Problema**: Múltiples entregas en la misma ubicación se superponen

**Solución**: Agrupación automática
```typescript
// Agrupar entregas por coordenadas
const entregasAgrupadas = entregasFiltradas.reduce((acc, entrega) => {
  const key = `${entrega.latitude},${entrega.longitude}`
  if (!acc[key]) {
    acc[key] = []
  }
  acc[key].push(entrega)
  return acc
}, {} as Record<string, any[]>)
```

**Resultado**: 
- Un solo marcador por ubicación
- Popup muestra TODAS las entregas en esa ubicación
- Contador: "3 entregas en esta ubicación"

### 4. Popups Informativos

Cuando haces click en un marcador:

```
┌─────────────────────────────────┐
│ 📍 Zenteno 881, Maipú           │
├─────────────────────────────────┤
│ 3 entregas en esta ubicación    │
│                                  │
│ 1. Cliente ABC                  │
│    📦 Botellón 20L × 10         │
│    📅 10 oct 2025               │
│    🏢 Empresa                   │
│    ━━━━━━━━━━━━━━━━━━━━━━━━   │
│ 2. Cliente XYZ                  │
│    📦 Botellón 10L × 5          │
│    📅 10 oct 2025               │
│    🏠 Hogar                     │
│    ━━━━━━━━━━━━━━━━━━━━━━━━   │
│ 3. ...                          │
└─────────────────────────────────┘
```

### 5. Estadísticas en Tiempo Real

```
┌────────────────────────────────────────┐
│ 📊 Estadísticas                        │
├────────────────────────────────────────┤
│ Total Entregas: 45                     │
│ Mostrando: 12 de 45                    │
│ Ubicaciones Únicas: 8                  │
│ Total Botellones: 120                  │
└────────────────────────────────────────┘
```

**Actualización**: Las estadísticas se actualizan automáticamente al cambiar filtros.

---

## 🎨 Interfaz de Usuario

### Componentes shadcn/ui
```typescript
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
```

### Librería de Mapas
```typescript
import dynamic from 'next/dynamic'

// Importación dinámica para evitar SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
```

### Estructura Visual

```
┌─────────────────────────────────────────────┐
│ 🗺️ Mapa de Entregas                        │
├─────────────────────────────────────────────┤
│ [📅 Filtrar fecha] [Estado ▼] [Tipo ▼]     │
│ [Filtro activo: 10 oct 2025 (X)]           │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐    │
│ │                                      │    │
│ │        🗺️ MAPA INTERACTIVO          │    │
│ │                                      │    │
│ │    📍  📍      📍                    │    │
│ │        📍  📍                        │    │
│ │  📍                                  │    │
│ │                                      │    │
│ └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│ 📊 Total: 45 │ Mostrando: 12 │ Botellones: 120 │
└─────────────────────────────────────────────┘
```

---

## 💾 Datos y Lógica

### Vista de Supabase Utilizada

#### `3t_dashboard_ventas`
```sql
-- Vista que incluye coordenadas de direcciones
SELECT 
  o.*,
  c.customer_name,
  c.customer_type,
  a.raw_address,
  a.commune,
  a.latitude,      -- ← Necesario para el mapa
  a.longitude,     -- ← Necesario para el mapa
  p.product_name
FROM 3t_orders o
LEFT JOIN 3t_customers c ON o.customer_id = c.customer_id
LEFT JOIN 3t_addresses a ON o.delivery_address_id = a.address_id
LEFT JOIN 3t_products p ON o.product_type = p.product_id
WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
```

### Query Principal

```typescript
const loadEntregas = async () => {
  let query = supabase
    .from('3t_dashboard_ventas')
    .select('*')
    .not('latitude', 'is', null)     // Solo direcciones con GPS
    .not('longitude', 'is', null)
  
  // Filtro de fecha (si está activo)
  if (fechaFiltro) {
    const fechaStr = format(fechaFiltro, 'yyyy-MM-dd')
    query = query.eq('delivered_date', fechaStr)
  }
  
  const { data, error } = await query.order('order_date', { ascending: false })
  
  if (!error && data.length > 0) {
    setEntregas(data)
    // Centrar mapa en la primera entrega
    setMapCenter([data[0].latitude, data[0].longitude])
  }
}
```

### Filtrado en Cliente

```typescript
// Filtros aplicados en el cliente (no en DB)
const entregasFiltradas = entregas.filter(e => {
  const matchesEstado = estadoFiltro === 'todos' || e.status === estadoFiltro
  const matchesTipo = tipoClienteFiltro === 'todos' || e.customer_type === tipoClienteFiltro
  return matchesEstado && matchesTipo
})
```

---

## 💻 Código Técnico

### Ubicación
```
/opt/cane/3t/app/mapa/page.tsx
```

### Tipo de Componente
```typescript
'use client'  // Cliente-side (Leaflet, hooks)
```

### Estados
```typescript
const [entregas, setEntregas] = useState<any[]>([])
const [loading, setLoading] = useState(true)
const [estadoFiltro, setEstadoFiltro] = useState('todos')
const [tipoClienteFiltro, setTipoClienteFiltro] = useState('todos')
const [fechaFiltro, setFechaFiltro] = useState<Date | undefined>(undefined)
const [mapCenter, setMapCenter] = useState<[number, number]>([-33.4489, -70.6693])
```

### Fix de Iconos Leaflet en Next.js

```typescript
useEffect(() => {
  // Fix para iconos de Leaflet en Next.js
  if (typeof window !== 'undefined') {
    const L = require('leaflet')
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    })
  }
  
  loadEntregas()
}, [fechaFiltro])
```

---

## 🔄 Flujo de Trabajo

```
Usuario accede a /mapa
         ↓
Carga entregas con coordenadas GPS
         ↓
Mapa se renderiza centrado en Santiago
         ↓
Si hay entregas, centra en la primera
         ↓
Marcadores se muestran en el mapa
         ↓
Usuario click en filtro de fecha
         ↓
Calendario se abre
         ↓
Usuario selecciona "10 oct 2025"
         ↓
useEffect detecta cambio → loadEntregas()
         ↓
Query filtra por delivered_date
         ↓
Entregas se actualizan
         ↓
Mapa muestra solo entregas del 10 oct
         ↓
Estadísticas actualizadas: "Mostrando 12 de 45"
         ↓
✅ Vista filtrada visible
```

---

## 🔗 Relaciones con Otros Módulos

### Consume Datos De:
- ✅ `3t_dashboard_ventas` - Vista con todas las relaciones
- ✅ `3t_addresses` - Coordenadas GPS (a través de la vista)
- ✅ `3t_orders` - Pedidos (a través de la vista)

### Complementa A:
- ✅ `/rutas` - Ambos usan Google Maps/mapas
- ✅ `/pedidos` - Visualiza pedidos creados
- ✅ `/dashboard` - Vista alternativa de los mismos datos

---

## 📋 Ejemplos de Uso

### Caso 1: Ver Entregas del Día
```
1. Usuario abre /mapa
2. Click en "Filtrar por fecha"
3. Selecciona "Hoy" (10 oct 2025)
4. Mapa muestra solo entregas de hoy
5. Badge: "Filtro activo: 10 oct 2025"
6. Estadísticas: "Mostrando 12 de 45"
7. ✅ Vista clara de entregas del día
```

### Caso 2: Ver Solo Empresas en Ruta
```
1. Filtro Estado: "Ruta"
2. Filtro Tipo: "Empresa"
3. Mapa muestra solo pedidos de empresas en ruta
4. Estadísticas: "Mostrando 8 de 45"
5. ✅ Vista específica para conductor de ruta empresas
```

---

## 🐛 Troubleshooting

### Problema: Mapa no se muestra
**Causa**: Leaflet no se carga en SSR (Server-Side Rendering)

**Solución**: Ya está resuelto con `dynamic import`:
```typescript
const MapContainer = dynamic(..., { ssr: false })
```

### Problema: Iconos de marcadores rotos
**Causa**: Leaflet en Next.js no encuentra las rutas de iconos

**Solución**: Fix en `useEffect` (ver sección Código Técnico)

### Problema: No hay marcadores en el mapa
**Causa**: Direcciones sin coordenadas GPS

**Solución**:
```
1. Ir a /clientes
2. Editar cliente
3. Editar/Agregar dirección
4. Usar autocompletado de Google Maps
5. Guardar (captura GPS automáticamente)
```

### Problema: Filtro de fecha no funciona
**Causa**: Query filtra por `delivered_date` pero debería filtrar por `order_date`

**Solución**: Cambiar query:
```typescript
// Si quieres filtrar por fecha de pedido
query = query.eq('order_date', fechaStr)

// Si quieres filtrar por fecha de entrega
query = query.eq('delivered_date', fechaStr)
```

---

## ⚡ Mejoras Futuras Sugeridas

1. **Clusterización de Marcadores**
   - Agrupar marcadores cercanos automáticamente
   - Usar `react-leaflet-markercluster`

2. **Rutas en el Mapa**
   - Dibujar ruta optimizada sobre el mapa
   - Integrar con módulo `/rutas`

3. **Filtro por Comuna**
   - Agregar selector de comuna
   - Zoom automático a la comuna seleccionada

4. **Heatmap**
   - Visualizar zonas con más entregas
   - Identificar áreas de alta demanda

---

## 📚 Referencias

- Leaflet.js: [leafletjs.com](https://leafletjs.com/)
- react-leaflet: [react-leaflet.js.org](https://react-leaflet.js.org/)
- OpenStreetMap: [openstreetmap.org](https://www.openstreetmap.org/)

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación del Módulo: Mapa**  
**Última actualización:** Octubre 11, 2025

