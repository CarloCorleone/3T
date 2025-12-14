# 📊 Módulo: Dashboard

**Ruta:** `/dashboard`  
**Archivo:** `/app/dashboard/page.tsx`  
**Tipo:** Página dinámica (Cliente-side con datos en tiempo real)  
**Última actualización:** Noviembre 6, 2025 - Sistema de drill-down con diálogos interactivos

---

## 📖 Descripción General

El módulo **Dashboard** es el **centro de inteligencia de negocio** del sistema. Proporciona métricas clave, gráficos comparativos avanzados, análisis temporales y filtros dinámicos para analizar el desempeño del negocio de forma integral.

### Propósito
- Análisis visual de ventas con gráficos modernos y profesionales
- Métricas calculadas automáticamente (financieras, operacionales, comerciales)
- Comparativas temporales (mes vs mes, año vs año)
- Filtros flexibles por período predefinido, tipo de cliente y cliente específico
- Gráficos interactivos con botones de período integrados

### Audiencia
- **Gerentes**: Toma de decisiones basada en datos con análisis comparativo
- **Administradores**: Seguimiento de ventas diarias/mensuales con KPIs clave
- **Finanzas**: Análisis de ingresos con/sin IVA, ticket promedio y frecuencia
- **Operaciones**: Métricas de botellones entregados y tiempos de entrega

---

## ✨ Funcionalidades

### 1. Sistema de Filtros Avanzados

**A. Filtro de Período Predefinido** (Nuevo)

| Opción | Descripción | Rango de Fechas |
|--------|-------------|-----------------|
| **Mes Actual** | Mes en curso (default) | Desde día 1 hasta último día del mes |
| **Mes Anterior** | Mes pasado completo | Desde día 1 hasta último día del mes anterior |
| **Último Trimestre** | Últimos 3 meses | Desde hace 3 meses hasta hoy |
| **Año Completo** | Año en curso | Desde 1 de enero hasta hoy |
| **Personalizado** | Rango manual | Fechas seleccionadas por el usuario |

**Comportamiento:**
```typescript
type PeriodoTipo = 'mes-actual' | 'mes-anterior' | 'trimestre' | 'ano' | 'personalizado'

// Handler automático de cambio de período
const handlePeriodoChange = (value: PeriodoTipo) => {
  // Actualiza fechaInicio y fechaFin automáticamente
  // Dispara useEffect para recargar datos
}
```

**B. Filtros Adicionales**

| Filtro | Tipo | Opciones | Efecto |
|--------|------|----------|--------|
| **Fecha Inicio** | Input date | Cualquier fecha | Filtra desde esta fecha |
| **Fecha Fin** | Input date | Cualquier fecha | Filtra hasta esta fecha |
| **Tipo Cliente** | Select | Todos / Hogar / Empresa | Filtra por tipo de cliente |
| **Cliente Específico** | Select | Lista de clientes | Filtra por un cliente particular |

**UI del Filtro:**
- Card destacado con borde primario (`border-primary/20 bg-primary/5`)
- Icono `Filter` para identificación visual inmediata
- Grid responsivo de 5 columnas que colapsa a 1 columna en móvil
- Los filtros se aplican **en tiempo real** (useEffect)
- Al cambiar el período predefinido, se actualiza automáticamente y cambia a "Personalizado" si se modifican las fechas manualmente

### 2. Métricas Clave (8 Cards KPI) con Drill-Down Interactivo

Grid de 4 columnas en desktop, 2 en tablet, 1 en móvil, con 8 métricas balanceadas.

**✨ NUEVO: 5 cards clickeables** con diálogos de drill-down para análisis profundo:
- Cards interactivas con icono de ojo (👁️)
- Hover con borde resaltado
- Texto indicador: "(clic para detalle)"
- Diálogos modales con datos granulares

Grid de 4 columnas en desktop, 2 en tablet, 1 en móvil, con 8 métricas balanceadas:

#### Financieras

**1. Ingresos del Período** 💰 **[CLICKEABLE]**
- **Cálculo**: Suma total con IVA incluido para empresas
- **Badge dinámico**: Muestra % de cambio vs período anterior
  - Verde con ↗ si es positivo
  - Rojo con ↘ si es negativo
- **Icono**: DollarSign + Eye
- **Color**: Azul

**Drill-down al hacer clic:**
- **Diálogo modal** con tabla completa de pedidos
- **Resumen**: Total pedidos, ventas empresa, ventas hogar, total con IVA
- **Columnas**: Fecha, Cliente, Tipo, Producto, Cantidad, Precio, Estado
- **Ordenamiento**: Por fecha descendente
- **Formato**: Tabla scrolleable con max 80vh

**2. Ventas por Tipo** 🏢
- **Principal**: Ventas Empresa con IVA
- **Secundario**: Ventas Hogar sin IVA
- **Iconos**: Building2 + Home
- **Color**: Azul + Verde

**3. Facturación del Mes** 🧾 **[CLICKEABLE]** ⭐ **NUEVA MÉTRICA**
- **Principal**: Número de facturas emitidas en el período
- **Desglose financiero**:
  - Sin IVA: Suma directa de `final_price`
  - Con IVA: Monto sin IVA × 1.19
- **Filtro**: Por `invoice_date` (fecha de facturación, no fecha de pedido)
- **Icono**: ShoppingCart + Eye
- **Color**: Naranja
- **Query específica**: Trae facturas del período aunque el pedido sea antiguo

**Cálculo corregido (facturas únicas):**
```typescript
// Query independiente por invoice_date con datos completos
const facturasDelMes = await supabase
  .from('3t_orders')
  .select(`
    order_id, final_price, invoice_date, invoice_number,
    customer:3t_customers(name, customer_type),
    product:3t_products!product_type(name)
  `)
  .gte('invoice_date', fechaInicio)
  .lte('invoice_date', fechaFin)
  .not('invoice_date', 'is', null)
  .order('invoice_date', { ascending: false })

// Contar facturas únicas, no pedidos
const facturasUnicas = new Set(facturas.map(f => f.invoice_number))
const totalFacturas = facturasUnicas.size  // Correcto ✅

const facturacionSinIva = facturas.reduce((sum, o) => sum + o.final_price, 0)
const facturacionConIva = facturacionSinIva * 1.19
```

**Drill-down al hacer clic: 🌟 FEATURE DESTACADA**
- **Diálogo modal** con sistema de filas expandibles
- **Resumen (4 columnas)**: Total facturas (únicas), Total pedidos, Sin IVA, Con IVA
- **Tabla principal**: Una fila por factura (sin duplicados)
  - Columnas: Flecha, Fecha, N° Factura, Cliente, Tipo, **Contador pedidos**, Sin IVA, IVA, Total
  - **Agrupación automática**: Por número de factura
  - **Badge de pedidos**: Muestra cuántos pedidos tiene cada factura (ej: "3")

**✨ Filas Expandibles (innovación clave):**
- **Clic en cualquier parte de la fila** para expandir/contraer
- **Flecha indicadora**: ➡️ (cerrado) ⬇️ (abierto)
- **Al expandir**: Muestra todos los pedidos de esa factura
- **Detalle de cada pedido**:
  - Fecha del pedido
  - Badge "Pedido #1", "Pedido #2", etc.
  - Producto específico
  - Cantidad
  - Monto sin IVA individual
  - IVA del pedido
  - Total del pedido
- **Fondo diferenciado**: `bg-muted/30` para distinguir pedidos
- **Solo una factura expandida**: Al abrir otra se cierra la anterior
- **Suma correcta**: El total de la factura = suma de todos sus pedidos

**Problema resuelto:**
- ❌ Antes: Factura 3527 con 3 pedidos aparecía 3 veces (duplicado)
- ✅ Ahora: Aparece 1 vez con badge "3 pedidos" + expandible para ver detalle

**4. Ticket Promedio** 📊
- **Cálculo**: Total ventas / Total pedidos
- **Secundario**: Frecuencia (pedidos por cliente)
- **Icono**: TrendingUp
- **Color**: Púrpura

#### Operacionales

**5. Botellones Entregados** 📦 **[CLICKEABLE]**
- **Principal**: Total de botellones (suma de quantity)
- **Secundario**: Promedio por pedido
- **Icono**: Package + Eye
- **Color**: Índigo

**Drill-down al hacer clic:**
- **Diálogo modal** con tabla ordenada por cantidad
- **Resumen**: Total botellones, Total pedidos, Promedio por pedido
- **Columnas**: Fecha, Cliente, Producto, **Cantidad** (badge grande), Precio unitario, Total
- **Ordenamiento**: Por cantidad descendente (mayor primero)
- **Destacado**: Badge de cantidad más visible para análisis rápido

**6. Tiempo Promedio Entrega** ⏰
- **Cálculo**: Promedio de horas desde order_date hasta delivered_date
- **Formato**: "XXh" o "N/A" si no hay entregas completadas
- **Icono**: Clock
- **Color**: Naranja

#### Comerciales

**7. Clientes Activos** 👥 **[CLICKEABLE]**
- **Cálculo**: Clientes únicos con pedidos en el período
- **Secundario**: "De X clientes totales"
- **Icono**: Users + Eye
- **Color**: Verde

**Drill-down al hacer clic:**
- **Diálogo modal** con análisis de clientes
- **Resumen**: Clientes activos, Total clientes, % Activos
- **Columnas**: Cliente, Tipo, Pedidos (contador), Total ventas, Ticket promedio
- **Fuente**: Datos del Top 10 Clientes
- **Badges**: Diferenciación visual Empresa/Hogar con iconos

**8. Top Comuna** 📍 **[CLICKEABLE]**
- **Principal**: Nombre de la comuna con más ventas
- **Secundario**: Monto total de ventas en esa comuna
- **Icono**: MapPin + Eye
- **Color**: Cyan

**Drill-down al hacer clic:**
- **Diálogo modal** con ranking completo
- **Resumen**: Top comuna, Ventas top, Comunas atendidas
- **Columnas**: Ranking (#), Comuna, Pedidos, Total ventas, % del Total
- **Ordenamiento**: Por ventas descendente
- **Badge especial**: La comuna #1 con badge primario destacado

**Cálculos técnicos:**
```typescript
// Clientes activos
const clientesActivosSet = new Set(ordersData.map((o: any) => o.customer_id))
const clientesActivos = clientesActivosSet.size

// Top comuna
const ventasPorComuna: Record<string, number> = {}
ordersData.forEach((o: any) => {
  const comuna = addressMap[o.delivery_address_id]?.commune || 'Sin comuna'
  ventasPorComuna[comuna] = (ventasPorComuna[comuna] || 0) + (o.final_price || 0)
})
const topComunaEntry = Object.entries(ventasPorComuna).sort((a, b) => b[1] - a[1])[0]

// Ticket y frecuencia
const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0
const frecuenciaPromedio = clientesActivos > 0 ? totalPedidos / clientesActivos : 0
```

### 3. Gráficos Interactivos (shadcn/ui + Recharts)

#### Gráfico 1: Mes Actual vs Mes Anterior ⭐ (Ancho completo)

**Tipo:** AreaChart comparativo  
**Ubicación:** `col-span-full` (primera fila de gráficos)  
**Altura:** 350px

**Características especiales:**
- **Comparación día a día** entre mes actual y mes anterior
- **Nombres dinámicos** en la leyenda (ej: "Octubre 2025" vs "Septiembre 2025")
- **Botones de período integrados** en el header:
  - Últimos 7 días
  - Últimos 30 días
  - Últimos 3 meses
- **Gradientes suaves** con opacidades graduales (0.5 → 0.2 → 0.02)
- **Contraste alto**:
  - Mes actual: Azul turquesa (#0891b2), línea 2.5px
  - Mes anterior: Gris (#64748b), línea 2px

**Configuración:**
```typescript
const mesActualNombre = format(new Date(), 'MMMM yyyy', { locale: es })
const mesAnteriorNombre = format(subMonths(new Date(), 1), 'MMMM yyyy', { locale: es })

const chartConfigComparativa = {
  actual: {
    label: mesActualNombre.charAt(0).toUpperCase() + mesActualNombre.slice(1),
    color: "#0891b2",
  },
  anterior: {
    label: mesAnteriorNombre.charAt(0).toUpperCase() + mesAnteriorNombre.slice(1),
    color: "#64748b",
  },
} satisfies ChartConfig
```

**Procesamiento de datos:**
- Agrupa ventas por día del mes (1-31)
- Crea dos mapas: `ventasPorDiaMesActual` y `ventasPorDiaMesAnterior`
- Genera array comparativo con estructura `{ dia: "Día N", actual: X, anterior: Y }`
- Filtrado dinámico según botón seleccionado (`slice(-limite)`)

#### Gráfico 2: Ventas por Producto

**Tipo:** BarChart vertical  
**Altura:** 300px  
**Grid:** 2 columnas en desktop

**Características:**
```typescript
const chartConfigProductos = {
  total: {
    label: "Total",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig
```

- Barras con esquinas redondeadas superiores (`radius={[8, 8, 0, 0]}`)
- Eje Y con formato abreviado: `$XXk`
- Ordenado por mayor venta
- Tooltip con formato CLP completo

#### Gráfico 3: Top 10 Comunas

**Tipo:** BarChart horizontal  
**Altura:** 300px  
**Grid:** 2 columnas en desktop

**Características:**
```typescript
const chartConfigComunas = {
  ventas: {
    label: "Ventas",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig
```

- Layout vertical con barras horizontales
- Esquinas redondeadas derechas (`radius={[0, 8, 8, 0]}`)
- Ancho de labels de eje Y: 100px
- Top 10 ordenado descendente

#### Gráfico 4: Top 10 Clientes

**Tipo:** BarChart horizontal  
**Altura:** 400px (más alto para mejor legibilidad)  
**Grid:** 2 columnas en desktop

**Características:**
```typescript
const chartConfigClientes = {
  ventas: {
    label: "Ventas",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig
```

- Nombres truncados a 25 caracteres
- Ancho de labels: 120px
- Ordenado por mayor compra

#### Gráfico 5: Comparativa Año sobre Año

**Tipo:** AreaChart comparativo  
**Altura:** 400px  
**Grid:** 2 columnas en desktop

**Características especiales:**
- Compara **mismo mes** del año actual vs año anterior
- **Botones de período integrados**: 7d / 30d / 3m
- **Nombres dinámicos**: "Octubre 2025" vs "Octubre 2024"
- Misma estética que comparativa mensual
- Query adicional específica para datos del año pasado

**Configuración:**
```typescript
const añoActual = new Date().getFullYear()
const añoAnterior = añoActual - 1
const mesActual = format(new Date(), 'MMMM', { locale: es })

const chartConfigComparativaAnual = {
  actual: {
    label: `${mesActual.charAt(0).toUpperCase() + mesActual.slice(1)} ${añoActual}`,
    color: "#0891b2",
  },
  añoAnterior: {
    label: `${mesActual.charAt(0).toUpperCase() + mesActual.slice(1)} ${añoAnterior}`,
    color: "#64748b",
  },
} satisfies ChartConfig
```

### 4. Responsividad

- **Desktop (> 1024px)**: 
  - Grid de métricas: 4 columnas
  - Grid de gráficos: 2 columnas (excepto gráfico principal)
- **Tablet (768px - 1024px)**: 
  - Grid de métricas: 2 columnas
  - Grid de gráficos: 1 columna
- **Móvil (< 768px)**: 
  - Grid de métricas: 1 columna
  - Grid de gráficos: 1 columna
  - Scroll vertical

---

## 🎨 Interfaz de Usuario

### Componentes shadcn/ui Utilizados

```typescript
// UI Básicos
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

// Gráficos (shadcn/ui wrapper para Recharts)
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from '@/components/ui/chart'
```

### Librerías de Gráficos

```typescript
// Recharts (envueltos por shadcn/ui)
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
```

### Iconografía (Lucide Icons)

```typescript
import { 
  DollarSign,      // Ingresos
  TrendingUp,      // Ticket promedio
  TrendingDown,    // Indicador de caída
  Package,         // Botellones
  Clock,           // Tiempo de entrega
  Users,           // Clientes activos
  MapPin,          // Top comuna
  ShoppingCart,    // Pedidos
  Loader2,         // Loading spinner
  Filter,          // Icono de filtros
  ArrowUpRight,    // Cambio positivo
  ArrowDownRight,  // Cambio negativo
  Building2,       // Ventas empresa
  Home            // Ventas hogar
}
```

### Estructura Visual

```
┌─────────────────────────────────────────────────────────┐
│          FILTROS (Card destacado con borde primario)     │
│  [Período] [Fecha Inicio] [Fecha Fin] [Tipo] [Cliente]  │
└─────────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│ Ingresos │ Ventas   │ Pedidos  │ Botellones│
│ Período  │ por Tipo │ Estado   │ Entregados│
├──────────┼──────────┼──────────┼──────────┤
│ Tiempo   │ Clientes │ Top      │ Ticket   │
│ Promedio │ Activos  │ Comuna   │ Promedio │
└──────────┴──────────┴──────────┴──────────┘

┌────────────────────────────────────────────────────────┐
│  Mes Actual vs Mes Anterior (AreaChart - FULL WIDTH)   │
│  [7d] [30d] [3m]                                       │
└────────────────────────────────────────────────────────┘

┌───────────────────────┬───────────────────────┐
│  Ventas por Producto  │  Top 10 Comunas       │
│  (BarChart)           │  (BarChart Horizontal)│
├───────────────────────┼───────────────────────┤
│  Top 10 Clientes      │  Comparativa Año/Año  │
│  (BarChart Horizontal)│  (AreaChart) [7d][30d]│
└───────────────────────┴───────────────────────┘
```

---

## 💾 Datos y Lógica

### Tablas de Supabase Involucradas

#### Principal: Múltiples tablas con queries directas

A diferencia de la versión anterior que usaba una vista SQL (`3t_dashboard_ventas`), la versión modernizada hace queries directas a las tablas base para mayor flexibilidad:

```typescript
const [
  ordersRes,
  ordersAnterioresRes,
  customersRes,
  addressesRes,
  productsRes,
  allCustomersRes
] = await Promise.all([
  // 1. Pedidos del período actual con relaciones
  supabase
    .from('3t_orders')
    .select('*, customer:3t_customers(*), product:3t_products!product_type(*)')
    .gte('order_date', fechaInicio)
    .lte('order_date', fechaFin),
  
  // 2. Pedidos del período anterior (para comparación)
  supabase
    .from('3t_orders')
    .select('final_price, order_date, delivered_date, status')
    .gte('order_date', format(anteriorInicio, 'yyyy-MM-dd'))
    .lte('order_date', format(anteriorFin, 'yyyy-MM-dd')),
  
  // 3. Clientes activos
  supabase
    .from('3t_customers')
    .select('customer_id, name, customer_type')
    .order('name'),
  
  // 4. Direcciones (para comunas)
  supabase
    .from('3t_addresses')
    .select('address_id, commune'),
  
  // 5. Productos
  supabase
    .from('3t_products')
    .select('product_id, name'),
  
  // 6. Total de clientes en sistema
  supabase
    .from('3t_customers')
    .select('customer_id', { count: 'exact', head: true })
])
```

#### Query Adicional: Año Anterior

```typescript
// Ejecutada después de las queries paralelas (no crítica)
const { data: ordersAñoAnterior } = await supabase
  .from('3t_orders')
  .select('order_date, final_price')
  .gte('order_date', format(inicioMesAñoAnterior, 'yyyy-MM-dd'))
  .lte('order_date', format(finMesAñoAnterior, 'yyyy-MM-dd'))
```

### Optimizaciones de Lookups

Para evitar búsquedas O(n), se crean mapas de lookups O(1):

```typescript
// Mapas para lookups rápidos
const addressMap: Record<string, any> = {}
addressesData.forEach((a: any) => {
  if (a.address_id) addressMap[a.address_id] = a
})

const productMap: Record<string, any> = {}
productsData.forEach((p: any) => {
  if (p.product_id) productMap[p.product_id] = p
})
```

### Procesamiento de Datos para Gráficos

#### Comparativa Mes a Mes

```typescript
// Crear mapas de ventas por día del mes (1-31)
const ventasPorDiaMesActual: Record<number, number> = {}
const ventasPorDiaMesAnterior: Record<number, number> = {}

// Inicializar todos los días del mes
diasMesActual.forEach(dia => {
  const diaMes = dia.getDate()
  ventasPorDiaMesActual[diaMes] = 0
})

// Llenar con datos reales
ordersData.forEach((o: any) => {
  const fecha = new Date(o.order_date)
  if (fecha >= inicioMesActual && fecha <= finMesActual) {
    const diaMes = fecha.getDate()
    ventasPorDiaMesActual[diaMes] += (o.final_price || 0)
  }
})

// Crear array comparativo
const comparativaArr = Array.from({ length: maxDias }, (_, idx) => ({
  dia: `Día ${idx + 1}`,
  actual: Math.round(ventasPorDiaMesActual[idx + 1] || 0),
  anterior: Math.round(ventasPorDiaMesAnterior[idx + 1] || 0)
}))
```

#### Filtrado Dinámico de Período

```typescript
// Filtrado para botones 7d/30d/3m
const comparativaDataFiltrado = (() => {
  if (comparativaData.length === 0) return []
  
  let limite = 30
  if (periodoComparativa === '7d') limite = 7
  else if (periodoComparativa === '3m') limite = 90
  
  return comparativaData.slice(-limite)  // Últimos N días
})()
```

#### Ventas por Producto

```typescript
const ventasPorProductoMap: Record<string, number> = {}
ordersData.forEach((o: any) => {
  const producto = o.product?.name || 'Sin categoría'
  ventasPorProductoMap[producto] = (ventasPorProductoMap[producto] || 0) + (o.final_price || 0)
})

const ventasPorProductoArr = Object.entries(ventasPorProductoMap)
  .map(([producto, total]) => ({ producto, total: Math.round(total) }))
  .sort((a, b) => b.total - a.total)
```

---

## 💻 Código Técnico

### Ubicación
```
/opt/cane/3t/app/dashboard/page.tsx
```

### Tipo de Componente
```typescript
'use client'  // Cliente-side por el uso de hooks y estado

export default function DashboardPage() {
  // ~1,167 líneas de código
}
```

### Estados Principales

```typescript
// Estados de carga y datos
const [loading, setLoading] = useState(true)
const [orders, setOrders] = useState<any[]>([])
const [ordersAnteriores, setOrdersAnteriores] = useState<any[]>([])
const [customers, setCustomers] = useState<any[]>([])
const [metricas, setMetricas] = useState<MetricasType | null>(null)

// Estados de filtros
const [periodo, setPeriodo] = useState<PeriodoTipo>('mes-actual')
const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
const [tipoCliente, setTipoCliente] = useState('todos')
const [clienteId, setClienteId] = useState('todos')

// Estados para gráficos
const [ventasPorDia, setVentasPorDia] = useState<any[]>([])
const [ventasPorProducto, setVentasPorProducto] = useState<any[]>([])
const [top10Comunas, setTop10Comunas] = useState<any[]>([])
const [top10Clientes, setTop10Clientes] = useState<any[]>([])
const [comparativaData, setComparativaData] = useState<any[]>([])
const [comparativaAnualData, setComparativaAnualData] = useState<any[]>([])

// Estados de períodos para gráficos comparativos
const [periodoComparativa, setPeriodoComparativa] = useState<'7d' | '30d' | '3m'>('30d')
const [periodoAnual, setPeriodoAnual] = useState<'7d' | '30d' | '3m'>('30d')
```

### Tipos TypeScript

```typescript
type PeriodoTipo = 'mes-actual' | 'mes-anterior' | 'trimestre' | 'ano' | 'personalizado'

type MetricasType = {
  // Financieras
  totalVentas: number
  totalVentasAnterior: number
  cambioVentas: number
  ventasEmpresa: number
  ventasEmpresaSinIva: number
  ventasHogar: number
  
  // Operacionales
  totalPedidos: number
  pedidosPedido: number
  pedidosRuta: number
  pedidosDespachado: number
  totalBotellones: number
  tiempoPromedioEntrega: number
  
  // Comerciales
  clientesActivos: number
  totalClientes: number
  topComuna: { nombre: string; ventas: number }
  frecuenciaPromedio: number
  ticketPromedio: number
}
```

### Hooks Utilizados

```typescript
useEffect(() => {
  loadDashboardData()
}, [fechaInicio, fechaFin, tipoCliente, clienteId])
// Se ejecuta cada vez que cambia algún filtro
```

### Funciones Clave

#### handlePeriodoChange()
```typescript
const handlePeriodoChange = (value: PeriodoTipo) => {
  setPeriodo(value)
  const hoy = new Date()
  
  switch (value) {
    case 'mes-actual':
      setFechaInicio(format(startOfMonth(hoy), 'yyyy-MM-dd'))
      setFechaFin(format(endOfMonth(hoy), 'yyyy-MM-dd'))
      break
    // ... otros casos
  }
}
```

#### loadDashboardData()
```typescript
const loadDashboardData = async () => {
  setLoading(true)
  try {
    // 1. Calcular fechas del período anterior para comparación
    const diasDiferencia = differenceInDays(fin, inicio) + 1
    const anteriorInicio = subDays(inicio, diasDiferencia)
    const anteriorFin = subDays(fin, diasDiferencia)

    // 2. Ejecutar 6 queries en paralelo
    const [ordersRes, ordersAnterioresRes, ...] = await Promise.all([...])

    // 3. Crear mapas de lookup
    const addressMap = {...}
    const productMap = {...}

    // 4. Calcular métricas
    const totalVentas = ordersData.reduce(...)
    // ... más cálculos

    // 5. Preparar datos para gráficos
    const ventasPorProductoMap = {...}
    // ... más procesamiento

    // 6. Query adicional para año anterior
    const { data: ordersAñoAnterior } = await supabase.from('3t_orders')...

    // 7. Actualizar estados
    setMetricas({...})
    setVentasPorProducto([...])
    // ... más set states

  } catch (error) {
    console.error('Error cargando dashboard:', error)
  } finally {
    setLoading(false)
  }
}
```

### Configuraciones de Gráficos (ChartConfig)

```typescript
// Ejemplo: Gráfico de productos
const chartConfigProductos = {
  total: {
    label: "Total",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

// Ejemplo: Comparativa mensual con nombres dinámicos
const mesActualNombre = format(new Date(), 'MMMM yyyy', { locale: es })
const mesAnteriorNombre = format(subMonths(new Date(), 1), 'MMMM yyyy', { locale: es })

const chartConfigComparativa = {
  actual: {
    label: mesActualNombre.charAt(0).toUpperCase() + mesActualNombre.slice(1),
    color: "#0891b2",
  },
  anterior: {
    label: mesAnteriorNombre.charAt(0).toUpperCase() + mesAnteriorNombre.slice(1),
    color: "#64748b",
  },
} satisfies ChartConfig
```

### Mejoras Estéticas en Gráficos

**Grid y Ejes minimalistas:**
```typescript
<CartesianGrid 
  strokeDasharray="3 3" 
  className="stroke-muted/20"  // Grid muy ligero
  vertical={false}              // Sin líneas verticales
/>
<XAxis 
  fontSize={11}                 // Fuentes más pequeñas
  tickLine={false}              // Sin tick marks
  axisLine={false}              // Sin línea de eje
  className="text-muted-foreground"
/>
<YAxis 
  fontSize={11}
  tickLine={false}
  axisLine={false}
  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
  className="text-muted-foreground"
/>
```

**Gradientes profesionales:**
```typescript
<defs>
  <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#0891b2" stopOpacity={0.5}/>
    <stop offset="50%" stopColor="#0891b2" stopOpacity={0.2}/>
    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.02}/>
  </linearGradient>
</defs>

<Area 
  type="monotone" 
  dataKey="actual" 
  stroke="#0891b2" 
  fill="url(#fillActual)"
  strokeWidth={2.5}
/>
```

---

## 🔄 Flujo de Trabajo

```
Usuario accede a /dashboard
         ↓
   Carga con período "Mes Actual" (default)
         ↓
   Ejecuta 6 queries en paralelo
         ↓
   Procesa datos y calcula métricas
         ↓
   Prepara datos para 5 gráficos
         ↓
   Ejecuta query adicional para año anterior
         ↓
   Renderiza 8 métricas + 5 gráficos
         ↓
   Usuario cambia período o filtro
         ↓
   useEffect detecta cambio
         ↓
   loadDashboardData() re-ejecuta
         ↓
   Actualiza todos los estados
         ↓
   React re-renderiza con nuevos datos
         ↓
   Animaciones de transición suaves
```

---

## 🔗 Relaciones con Otros Módulos

### Consume Datos De:
- ✅ `3t_customers` - Información de clientes y tipos
- ✅ `3t_addresses` - Direcciones y comunas
- ✅ `3t_products` - Información de productos
- ✅ `3t_orders` - Pedidos (principal fuente de datos)

### Conecta Con:
- `/clientes` - Link indirecto (puede ver qué cliente vende más)
- `/pedidos` - Los datos analizados vienen de pedidos
- `/reportes` - Ambos analizan las mismas ventas, comparten estética shadcn/ui

### Módulos Relacionados Técnicamente:
- `/reportes` - Usa el mismo patrón de shadcn/ui Charts
- `/page.tsx` (Home) - Comparte algunas métricas similares

---

## 📋 Ejemplos de Uso

### Caso 1: Análisis Mensual Estándar
```
1. Usuario abre /dashboard (período default: Mes Actual)
2. Ve métricas del mes:
   - $815,500 ingresos (+12.5% vs mes anterior)
   - $535,500 empresa + $280,000 hogar
   - 3.5 pedidos/cliente de frecuencia
   - $45,000 ticket promedio
3. Gráfico principal muestra comparativa día a día con mes anterior
4. Ve que los días 15-20 tuvieron un pico de ventas
5. Identifica que Maipú es la comuna con más ventas ($250,000)
```

### Caso 2: Análisis de un Cliente Específico
```
1. Usuario selecciona filtro "Cliente: Supermercado ABC"
2. Todas las métricas se actualizan para ese cliente:
   - Total: $45,000
   - 8 pedidos en el mes
   - Ticket promedio: $5,625
3. Gráfico de productos muestra que solo compra bidones PC 20L
4. Comparativa muestra patrón de compra: 1 pedido por semana
```

### Caso 3: Análisis Año sobre Año
```
1. Usuario mantiene período "Mes Actual"
2. Scroll hasta gráfico "Comparativa Año sobre Año"
3. Ve comparación Octubre 2025 vs Octubre 2024
4. Observa crecimiento de +35% respecto al año pasado
5. Cambia botón a "7 días" para ver tendencia reciente
6. Identifica que última semana superó año anterior por 50%
```

### Caso 4: Análisis Trimestral de Empresas
```
1. Usuario cambia período a "Último Trimestre"
2. Selecciona tipo cliente "Empresa"
3. Ve ventas totales de empresas en 3 meses
4. Gráfico Top 10 Clientes muestra empresas principales
5. Identifica 3 empresas que representan 60% de ventas empresa
6. Decide enfocar estrategia de retención en esas 3
```

---

## 🐛 Troubleshooting

### Problema: "No hay datos para mostrar"
**Causa:** Rango de fechas sin pedidos

**Solución:**
```typescript
// Ajustar fechas a un período con datos
setPeriodo('mes-anterior')
// o seleccionar rango personalizado con datos conocidos
```

### Problema: Gráficos no cargan / pantalla blanca
**Causa:** Recharts o shadcn/ui Chart components no instalados

**Solución:**
```bash
npm install recharts
# shadcn/ui chart ya viene incluido en el proyecto
```

### Problema: Comparativa anual muestra datos vacíos
**Causa:** No hay datos del mismo mes del año anterior

**Solución:**
- Verificar que existe data histórica en `3t_orders` del año anterior
- Si es primer año de operación, el gráfico mostrará "No hay datos"
- Es comportamiento esperado para sistemas nuevos

### Problema: Botones de período no filtran correctamente
**Causa:** Estado de período no actualizado correctamente

**Solución:**
```typescript
// Verificar que estado está siendo actualizado
console.log('Período actual:', periodoComparativa)

// Verificar que filtrado funciona
console.log('Datos filtrados:', comparativaDataFiltrado.length)
```

### Problema: Métricas muestran valores incorrectos
**Causa:** Cálculo de IVA o filtros mal aplicados

**Solución:**
```typescript
// Para debug, verificar cálculos intermedios
console.log('Ventas empresa sin IVA:', ventasEmpresaSinIva)
console.log('Ventas empresa con IVA:', ventasEmpresa)
console.log('Ratio IVA:', ventasEmpresa / ventasEmpresaSinIva) // Debe ser ~1.19
```

---

## ⚡ Optimizaciones

### Performance
- **Queries paralelas**: 6 queries simultáneas (~500ms)
- **Query no crítica**: Datos año anterior se cargan después
- **Lookups O(1)**: Mapas de direcciones y productos
- **Cálculos eficientes**: Uso de `reduce` y `map`
- **Re-renders mínimos**: Estados organizados estratégicamente

### UX
- **Loading state**: Spinner mientras carga datos
- **Estados vacíos**: Mensajes claros cuando no hay datos
- **Gráficos responsivos**: `ResponsiveContainer` de Recharts
- **Colores consistentes**: Variables CSS de shadcn/ui
- **Transiciones suaves**: Animaciones nativas de React

### Código
- **Tipos TypeScript**: Todo tipado para seguridad
- **Funciones puras**: Fácil testing y debug
- **Comentarios claros**: Código autodocumentado
- **Modular**: Fácil agregar nuevos gráficos

---

## 📚 Referencias

- **shadcn/ui Charts**: [ui.shadcn.com/docs/components/chart](https://ui.shadcn.com/docs/components/chart)
- **Recharts**: [recharts.org](https://recharts.org/)
- **date-fns**: [date-fns.org](https://date-fns.org/)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Formato de números**: [Intl.NumberFormat](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)

---

## 📊 Historial de Cambios

### Versión 2.0 - Octubre 13, 2025
- ✅ Migración completa a shadcn/ui Charts
- ✅ Sistema de filtros de período predefinido
- ✅ Expansión de métricas de 5 a 8 cards
- ✅ 2 nuevos gráficos comparativos (mes a mes + año a año)
- ✅ Botones de período integrados en gráficos
- ✅ Mejoras estéticas profesionales
- ✅ Optimizaciones de queries y performance

### Versión 1.0 - Octubre 11, 2025
- ✅ Dashboard básico con 5 métricas
- ✅ Recharts directo sin shadcn/ui
- ✅ Filtros de fecha personalizada
- ✅ 5 gráficos básicos

---

## 🗺️ 8. Mapas de Análisis Geográfico

**Nueva Sección** (Octubre 13, 2025 - Tarde)

Integración de mapas interactivos al final del dashboard con sincronización de filtros principales.

### Características Generales

**Ubicación:** Al final de todos los gráficos  
**Componente:** `<MapaDashboard />`  
**Props sincronizados:**
- `fechaInicio`: Filtro de fecha inicio del dashboard
- `fechaFin`: Filtro de fecha fin del dashboard
- `tipoCliente`: Tipo de cliente seleccionado ('todos', 'hogar', 'empresa')
- `clienteId`: Cliente específico seleccionado

**Código de Integración:**
```typescript
<MapaDashboard 
  fechaInicio={fechaInicio}
  fechaFin={fechaFin}
  tipoCliente={tipoCliente}
  clienteId={clienteId}
/>
```

---

### Tab 1: Mapa de Calor de Ventas (Default) 🔥

Visualización de densidad de ventas por comuna con gradiente continuo.

**Tecnología:**
- Google Maps JavaScript API
- `google.maps.visualization.HeatmapLayer`
- Gradiente de 10 colores (Azul → Rojo)

**Características:**

1. **HeatmapLayer Configuración:**
```typescript
{
  dissipating: true,
  radius: 50,             // Radio de influencia
  opacity: 0.8,
  maxIntensity: 1.2,
  gradient: [
    'rgba(0, 0, 255, 0)',      // Transparente
    'rgba(0, 0, 255, 1)',      // Azul (LOW)
    'rgba(0, 191, 255, 1)',    // Azul claro
    'rgba(0, 255, 0, 1)',      // Verde
    'rgba(127, 255, 0, 1)',    // Verde-amarillo
    'rgba(255, 255, 0, 1)',    // Amarillo
    'rgba(255, 191, 0, 1)',    // Amarillo-naranja
    'rgba(255, 127, 0, 1)',    // Naranja
    'rgba(255, 63, 0, 1)',     // Naranja-rojo
    'rgba(255, 0, 0, 1)'       // Rojo (HIGH)
  ]
}
```

2. **Generación de Puntos:**
```typescript
// Por cada comuna con ventas:
const numPoints = Math.ceil(weight * 10) + 3  // 3-13 puntos
const radius = 0.015  // ~1.5km

// Distribuir puntos alrededor del centro
for (let i = 0; i < numPoints; i++) {
  const angle = (i / numPoints) * 2 * Math.PI
  const distance = radius * Math.random() * 0.7
  const lat = center.lat + distance * Math.cos(angle)
  const lng = center.lng + distance * Math.sin(angle)
  
  heatmapData.push({
    location: new google.maps.LatLng(lat, lng),
    weight: ventas / maxVentas  // Normalizado 0-1
  })
}
```

3. **Cálculo de Ventas:**
```typescript
// Ventas filtradas por período y tipo de cliente
pedidos.forEach((p: any) => {
  let precioFinal = p.final_price || 0
  
  // IVA automático para empresas
  if (p.customer?.customer_type === 'Empresa') {
    precioFinal = precioFinal * 1.19
  }
  
  ventasMap[comuna] = (ventasMap[comuna] || 0) + precioFinal
})
```

4. **Componentes Visuales:**
- **Leyenda con gradiente**: Barra horizontal con escala de colores
- **Top 5 Comunas**: Lista con badges coloreados por intensidad
- **Estadísticas**: Comunas activas, ventas totales, comuna líder
- **InfoWindows**: Click en comuna muestra ventas y porcentaje

**Coordenadas:**
- 33 comunas de Santiago
- Centros geométricos aproximados
- Archivo: `/lib/comunas-santiago-coords.ts`

---

### Tab 2: Entregas Pendientes 📍

Mapa con markers de pedidos en estado "Pedido" o "Ruta".

**Características:**

1. **Filtros de Estado:**
- Todos: Muestra ambos estados
- Pedido: Solo pedidos nuevos (azul)
- En Ruta: Solo pedidos en ruta (amarillo)

2. **Markers Diferenciados:**
```typescript
const markerColor = pedido.status === 'Pedido' ? '#3B82F6' : '#F59E0B'

const marker = new google.maps.Marker({
  position: { lat, lng },
  icon: {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: markerColor,
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2,
  }
})
```

3. **InfoWindows:**
```html
<div>
  <h3>{customer_name}</h3>
  <p><strong>Dirección:</strong> {raw_address}</p>
  <p><strong>Comuna:</strong> {commune}</p>
  <p><strong>Cantidad:</strong> {quantity} unidades</p>
  <p><strong>Estado:</strong> {status}</p>
</div>
```

4. **Estadísticas Rápidas:**
- Entregas mostradas (según filtro)
- Botellones totales
- Comunas únicas

5. **Auto-zoom:**
```typescript
const bounds = new google.maps.LatLngBounds()
pedidosFiltrados.forEach(pedido => {
  bounds.extend({ lat: pedido.latitude, lng: pedido.longitude })
})
map.fitBounds(bounds)
```

---

### Sincronización con Filtros Principales

**Recarga Automática:**
```typescript
useEffect(() => {
  loadMapData()
}, [fechaInicio, fechaFin, tipoCliente, clienteId])
```

**Queries Filtradas:**
```typescript
let pedidosQuery = supabase
  .from('3t_orders')
  .select('...')
  .in('status', ['Pedido', 'Ruta', 'Despachado'])

// Aplicar filtros de fecha
if (fechaInicio) {
  pedidosQuery = pedidosQuery.gte('order_date', fechaInicio)
}
if (fechaFin) {
  pedidosQuery = pedidosQuery.lte('order_date', fechaFin)
}

// Aplicar filtros de cliente
if (tipoCliente !== 'todos') {
  pedidos = pedidos.filter(p => 
    p.customer?.customer_type === (tipoCliente === 'empresa' ? 'Empresa' : 'Hogar')
  )
}
if (clienteId !== 'todos') {
  pedidos = pedidos.filter(p => p.customer_id === clienteId)
}
```

**Comportamiento:**
1. Usuario cambia filtro en dashboard principal
2. Props se actualizan en `MapaDashboard`
3. `useEffect` detecta cambio en dependencias
4. Se ejecuta `loadMapData()` con nuevos filtros
5. Queries filtradas a Supabase
6. Mapa de calor se regenera con nuevos datos
7. Actualización sin reload de página

---

### Dependencias

**Google Maps API:**
```javascript
// En layout.tsx
<Script
  src="https://maps.googleapis.com/maps/api/js?key=xxx&libraries=places,visualization"
  strategy="lazyOnload"
  id="google-maps-script"
/>
```

**Variable de Entorno:**
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

**Permisos Requeridos:**
- Maps JavaScript API
- Places API
- **Visualization Library** ⭐ (Nuevo - requerido para HeatmapLayer)

---

### Performance

**Tiempos:**
- Carga inicial de datos: ~300-500ms
- Renderizado de mapa de calor: ~500-800ms
- Actualización por cambio de filtro: ~300-500ms
- Total (aproximado): <2 segundos

**Optimizaciones:**
- Queries paralelas con `Promise.all`
- Filtros aplicados en base de datos (no en frontend)
- Mapas de lookup para asociaciones rápidas
- Lazy loading de Google Maps

---

### Troubleshooting Mapas

**Problema: Mapa no se carga**

Solución 1: Verificar Google Maps API Key
```bash
echo $NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

Solución 2: Verificar consola del navegador
```javascript
// Error común: Visualization library no cargada
// Verificar: libraries=places,visualization
```

**Problema: Mapa de calor no se actualiza**

Solución: Verificar dependencias de useEffect
```typescript
useEffect(() => {
  loadMapData()
}, [fechaInicio, fechaFin, tipoCliente, clienteId])  // ✅ Incluir todos
```

**Problema: Coordenadas incorrectas**

Solución: Validar tabla `3t_addresses`
```sql
SELECT address_id, latitude, longitude, commune 
FROM 3t_addresses 
WHERE latitude IS NULL OR longitude IS NULL;
```

---

## 📝 Historial de Versiones

### Versión 2.1 - Octubre 13, 2025 (Tarde)
- ✅ **Integración de Mapas de Análisis Geográfico**
- ✅ Mapa de calor de densidad con HeatmapLayer
- ✅ Mapa de entregas pendientes con filtros
- ✅ Sincronización completa con filtros del dashboard
- ✅ Queries optimizadas con filtros de fecha y cliente
- ✅ Cálculo automático de IVA para empresas
- ✅ 33 comunas de Santiago con coordenadas
- ✅ Gradiente profesional de 10 colores
- ✅ InfoWindows interactivos

### Versión 2.0 - Octubre 13, 2025 (Medianoche)
- ✅ Migración completa a shadcn/ui Charts
- ✅ Expansión de métricas de 5 a 8 cards
- ✅ 2 nuevos gráficos comparativos (mes a mes + año a año)
- ✅ Botones de período integrados en gráficos
- ✅ Mejoras estéticas profesionales
- ✅ Optimizaciones de queries y performance

### Versión 1.0 - Octubre 11, 2025
- ✅ Dashboard básico con 5 métricas
- ✅ Recharts directo sin shadcn/ui
- ✅ Filtros de fecha personalizada
- ✅ 5 gráficos básicos

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación del Módulo: Dashboard**  
**Versión:** 2.1  
**Última actualización:** Octubre 13, 2025 (Tarde)
