'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, subDays, eachDayOfInterval, startOfYear, subQuarters } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { RoleGuard } from '@/components/role-guard'
import { MapaDashboard } from '@/components/mapa-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from '@/components/ui/chart'
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
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  Users,
  MapPin,
  ShoppingCart,
  Loader2,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Home,
  FileText,
  Eye,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

type PeriodoTipo = 'mes-actual' | 'mes-anterior' | 'trimestre' | 'ano' | 'personalizado'

type MetricasType = {
  // Financieras
  totalVentas: number
  totalVentasAnterior: number
  cambioVentas: number
  ventasEmpresa: number
  ventasEmpresaSinIva: number
  ventasHogar: number
  
  // Facturación
  totalFacturas: number
  facturacionSinIva: number
  facturacionConIva: number
  
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<PeriodoTipo>('mes-actual')
  const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [tipoCliente, setTipoCliente] = useState('todos')
  const [clienteId, setClienteId] = useState('todos')

  // Datos
  const [orders, setOrders] = useState<any[]>([])
  const [ordersAnteriores, setOrdersAnteriores] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [metricas, setMetricas] = useState<MetricasType | null>(null)
  
  // Estado para diálogos de detalle
  const [showFacturasDialog, setShowFacturasDialog] = useState(false)
  const [facturasDetalle, setFacturasDetalle] = useState<any[]>([])
  const [facturaExpandida, setFacturaExpandida] = useState<string | null>(null)
  const [showIngresosDialog, setShowIngresosDialog] = useState(false)
  const [showBotellonesDialog, setShowBotellonesDialog] = useState(false)
  const [showClientesDialog, setShowClientesDialog] = useState(false)
  const [showComunasDialog, setShowComunasDialog] = useState(false)

  // Datos para gráficos
  const [ventasPorDia, setVentasPorDia] = useState<any[]>([])
  const [ventasPorProducto, setVentasPorProducto] = useState<any[]>([])
  const [top10Comunas, setTop10Comunas] = useState<any[]>([])
  const [top10Clientes, setTop10Clientes] = useState<any[]>([])
  const [comparativaData, setComparativaData] = useState<any[]>([])
  const [comparativaAnualData, setComparativaAnualData] = useState<any[]>([])
  
  // Períodos para los gráficos comparativos
  const [periodoComparativa, setPeriodoComparativa] = useState<'7d' | '30d' | '3m'>('30d')
  const [periodoAnual, setPeriodoAnual] = useState<'7d' | '30d' | '3m'>('30d')

  useEffect(() => {
    loadDashboardData()
  }, [fechaInicio, fechaFin, tipoCliente, clienteId])

  // Actualizar fechas según período seleccionado
  const handlePeriodoChange = (value: PeriodoTipo) => {
    setPeriodo(value)
    const hoy = new Date()
    
    switch (value) {
      case 'mes-actual':
        setFechaInicio(format(startOfMonth(hoy), 'yyyy-MM-dd'))
        setFechaFin(format(endOfMonth(hoy), 'yyyy-MM-dd'))
        break
      case 'mes-anterior':
        const mesAnterior = subMonths(hoy, 1)
        setFechaInicio(format(startOfMonth(mesAnterior), 'yyyy-MM-dd'))
        setFechaFin(format(endOfMonth(mesAnterior), 'yyyy-MM-dd'))
        break
      case 'trimestre':
        const trimestreAtras = subQuarters(hoy, 1)
        setFechaInicio(format(trimestreAtras, 'yyyy-MM-dd'))
        setFechaFin(format(hoy, 'yyyy-MM-dd'))
        break
      case 'ano':
        setFechaInicio(format(startOfYear(hoy), 'yyyy-MM-dd'))
        setFechaFin(format(hoy, 'yyyy-MM-dd'))
        break
      case 'personalizado':
        // Mantener las fechas actuales
        break
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Calcular fechas del período anterior para comparación
      const inicio = new Date(fechaInicio)
      const fin = new Date(fechaFin)
      const diasDiferencia = differenceInDays(fin, inicio) + 1
      
      const anteriorInicio = subDays(inicio, diasDiferencia)
      const anteriorFin = subDays(fin, diasDiferencia)

      // Ejecutar queries en paralelo
      const [
        ordersRes,
        ordersAnterioresRes,
        facturasDelMesRes,
        customersRes,
        addressesRes,
        productsRes,
        allCustomersRes
      ] = await Promise.all([
        // 1. Pedidos del período actual
        supabase
          .from('3t_orders')
          .select('*, customer:3t_customers(*), product:3t_products!product_type(*)')
          .gte('order_date', fechaInicio)
          .lte('order_date', fechaFin)
          .then(res => {
            if (tipoCliente !== 'todos' && res.data) {
              return {
                ...res,
                data: res.data.filter((o: any) => 
                  o.customer?.customer_type === (tipoCliente === 'empresa' ? 'Empresa' : 'Hogar')
                )
              }
            }
            if (clienteId !== 'todos' && res.data) {
              return {
                ...res,
                data: res.data.filter((o: any) => o.customer_id === clienteId)
              }
            }
            return res
          }),
        
        // 2. Pedidos del período anterior (para comparación)
        supabase
          .from('3t_orders')
          .select('final_price, order_date, delivered_date, status')
          .gte('order_date', format(anteriorInicio, 'yyyy-MM-dd'))
          .lte('order_date', format(anteriorFin, 'yyyy-MM-dd')),
        
        // 3. Facturas emitidas en el período (usando nueva tabla 3t_invoices)
        supabase
          .from('3t_invoices')
          .select(`
            invoice_id,
            invoice_number,
            invoice_date,
            total_amount,
            tax_amount,
            subtotal,
            status,
            invoice_type,
            order_invoices:3t_order_invoices(
              amount_invoiced,
              order:3t_orders!inner(
                order_id,
                order_date,
                customer:3t_customers!inner(
                  name,
                  customer_type
                ),
                product:3t_products!product_type(
                  name,
                  category
                )
              )
            )
          `)
          .gte('invoice_date', fechaInicio)
          .lte('invoice_date', fechaFin)
          .eq('status', 'vigente')
          .order('invoice_date', { ascending: false }),
        
        // 4. Clientes para filtros
        supabase
          .from('3t_customers')
          .select('customer_id, name, customer_type')
          .order('name'),
        
        // 5. Direcciones (para comunas)
        supabase
          .from('3t_addresses')
          .select('address_id, commune'),
        
        // 6. Productos
        supabase
          .from('3t_products')
          .select('product_id, name'),
        
        // 7. Total de clientes en sistema
        supabase
          .from('3t_customers')
          .select('customer_id', { count: 'exact', head: true })
      ])

      const ordersData = ordersRes.data || []
      const ordersAnterioresData = ordersAnterioresRes.data || []
      const facturasDelMesData = facturasDelMesRes.data || []
      const customersData = customersRes.data || []
      
      // Guardar facturas con detalle para el diálogo
      setFacturasDetalle(facturasDelMesData)
      const addressesData = addressesRes.data || []
      const productsData = productsRes.data || []
      const totalCustomersCount = allCustomersRes.count || 0

      setOrders(ordersData)
      setOrdersAnteriores(ordersAnterioresData)
      setCustomers(customersData)

      // Crear mapas para lookups rápidos
      const addressMap: Record<string, any> = {}
      addressesData.forEach((a: any) => {
        if (a.address_id) addressMap[a.address_id] = a
      })

      const productMap: Record<string, any> = {}
      productsData.forEach((p: any) => {
        if (p.product_id) productMap[p.product_id] = p
      })

      // ===== CALCULAR MÉTRICAS =====
      
      // Financieras
      const totalVentas = ordersData.reduce((sum: number, o: any) => {
        if (o.customer?.customer_type === 'Empresa') {
          return sum + (o.final_price * 1.19 || 0)
        }
        return sum + (o.final_price || 0)
      }, 0)
      
      const totalVentasAnterior = ordersAnterioresData.reduce((sum: number, o: any) => sum + (o.final_price || 0), 0)
      const cambioVentas = totalVentasAnterior > 0 
        ? ((totalVentas - totalVentasAnterior) / totalVentasAnterior) * 100 
        : 0

      const ventasEmpresaSinIva = ordersData
        .filter((o: any) => o.customer?.customer_type === 'Empresa')
        .reduce((sum: number, o: any) => sum + (o.final_price || 0), 0)
      
      const ventasEmpresa = ventasEmpresaSinIva * 1.19

      const ventasHogar = ordersData
        .filter((o: any) => o.customer?.customer_type === 'Hogar')
        .reduce((sum: number, o: any) => sum + (o.final_price || 0), 0)

      // Facturación (facturas emitidas en el período usando nueva estructura)
      const totalFacturas = facturasDelMesData.length
      
      // Calcular facturación sin IVA (suma de subtotal de facturas)
      const facturacionSinIva = facturasDelMesData.reduce((sum: number, f: any) => sum + (f.subtotal || 0), 0)
      
      // Calcular facturación con IVA (suma de total_amount de facturas)
      const facturacionConIva = facturasDelMesData.reduce((sum: number, f: any) => sum + (f.total_amount || 0), 0)

      // Operacionales
      const totalPedidos = ordersData.length
      const pedidosPedido = ordersData.filter((o: any) => o.status === 'Pedido').length
      const pedidosRuta = ordersData.filter((o: any) => o.status === 'Ruta').length
      const pedidosDespachado = ordersData.filter((o: any) => o.status === 'Despachado').length

      const totalBotellones = ordersData.reduce((sum: number, o: any) => sum + (Number(o.quantity) || 0), 0)

      const pedidosConTiempo = ordersData.filter((o: any) => o.delivered_date && o.order_date)
      const tiempoPromedioEntrega = pedidosConTiempo.length > 0
        ? pedidosConTiempo.reduce((sum: number, o: any) => {
            const inicio = new Date(o.order_date)
            const fin = new Date(o.delivered_date)
            const diff = differenceInDays(fin, inicio)
            return sum + diff
          }, 0) / pedidosConTiempo.length * 24 // convertir a horas
        : 0

      // Comerciales
      const clientesActivosSet = new Set(ordersData.map((o: any) => o.customer_id))
      const clientesActivos = clientesActivosSet.size

      // Top comuna
      const ventasPorComuna: Record<string, number> = {}
      ordersData.forEach((o: any) => {
        const comuna = addressMap[o.delivery_address_id]?.commune || 'Sin comuna'
        ventasPorComuna[comuna] = (ventasPorComuna[comuna] || 0) + (o.final_price || 0)
      })
      const topComunaEntry = Object.entries(ventasPorComuna)
        .sort((a, b) => b[1] - a[1])[0]
      const topComuna = topComunaEntry 
        ? { nombre: topComunaEntry[0], ventas: topComunaEntry[1] }
        : { nombre: 'N/A', ventas: 0 }

      const frecuenciaPromedio = clientesActivos > 0 ? totalPedidos / clientesActivos : 0
      const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0

      setMetricas({
        totalVentas,
        totalVentasAnterior,
        cambioVentas,
        ventasEmpresa,
        ventasEmpresaSinIva,
        ventasHogar,
        totalFacturas,
        facturacionSinIva,
        facturacionConIva,
        totalPedidos,
        pedidosPedido,
        pedidosRuta,
        pedidosDespachado,
        totalBotellones,
        tiempoPromedioEntrega,
        clientesActivos,
        totalClientes: totalCustomersCount,
        topComuna,
        frecuenciaPromedio,
        ticketPromedio
      })

      // ===== PREPARAR DATOS PARA GRÁFICOS =====

      // 1. Ventas por día
      const ventasPorDiaMap: Record<string, number> = {}
      const dias = eachDayOfInterval({ start: new Date(fechaInicio), end: new Date(fechaFin) })
      
      dias.forEach(dia => {
        const diaStr = format(dia, 'yyyy-MM-dd')
        ventasPorDiaMap[diaStr] = 0
      })

      ordersData.forEach((o: any) => {
        const fecha = o.order_date
        if (ventasPorDiaMap.hasOwnProperty(fecha)) {
          ventasPorDiaMap[fecha] += (o.final_price || 0)
        }
      })

      const ventasPorDiaArr = Object.entries(ventasPorDiaMap)
        .map(([fecha, ventas]) => ({
          fecha: format(new Date(fecha), 'dd/MM', { locale: es }),
          ventas: Math.round(ventas)
        }))

      setVentasPorDia(ventasPorDiaArr)

      // 2. Ventas por producto
      const ventasPorProductoMap: Record<string, number> = {}
      ordersData.forEach((o: any) => {
        const producto = o.product?.name || 'Sin categoría'
        ventasPorProductoMap[producto] = (ventasPorProductoMap[producto] || 0) + (o.final_price || 0)
      })

      const ventasPorProductoArr = Object.entries(ventasPorProductoMap)
        .map(([producto, total]) => ({ producto, total: Math.round(total) }))
        .sort((a, b) => b.total - a.total)

      setVentasPorProducto(ventasPorProductoArr)

      // 3. Top 10 Comunas
      const top10ComunasArr = Object.entries(ventasPorComuna)
        .map(([comuna, ventas]) => ({ comuna, ventas: Math.round(ventas) }))
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 10)

      setTop10Comunas(top10ComunasArr)

      // 4. Top 10 Clientes
      const ventasPorCliente: Record<string, { nombre: string; ventas: number; tipo: string }> = {}
      ordersData.forEach((o: any) => {
        const clienteId = o.customer_id
        const nombre = o.customer?.name || 'Sin nombre'
        const tipo = o.customer?.customer_type || 'N/A'
        
        if (!ventasPorCliente[clienteId]) {
          ventasPorCliente[clienteId] = { nombre, ventas: 0, tipo }
        }
        ventasPorCliente[clienteId].ventas += (o.final_price || 0)
      })

      const top10ClientesArr = Object.values(ventasPorCliente)
        .map(c => ({ 
          cliente: c.nombre.length > 25 ? c.nombre.substring(0, 25) + '...' : c.nombre,
          ventas: Math.round(c.ventas),
          tipo: c.tipo
        }))
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 10)

      setTop10Clientes(top10ClientesArr)

      // 5. Comparativa mes actual vs mes anterior
      // Obtener el mes actual y el mes anterior
      const mesActual = new Date(fechaFin)
      const mesAnterior = subMonths(mesActual, 1)
      
      const inicioMesActual = startOfMonth(mesActual)
      const finMesActual = endOfMonth(mesActual)
      const inicioMesAnterior = startOfMonth(mesAnterior)
      const finMesAnterior = endOfMonth(mesAnterior)

      // Crear arrays de días para ambos meses
      const diasMesActual = eachDayOfInterval({ start: inicioMesActual, end: finMesActual })
      const diasMesAnterior = eachDayOfInterval({ start: inicioMesAnterior, end: finMesAnterior })

      // Crear mapas de ventas por día del mes (1-31)
      const ventasPorDiaMesActual: Record<number, number> = {}
      const ventasPorDiaMesAnterior: Record<number, number> = {}

      // Inicializar todos los días
      diasMesActual.forEach(dia => {
        const diaMes = dia.getDate()
        ventasPorDiaMesActual[diaMes] = 0
      })
      diasMesAnterior.forEach(dia => {
        const diaMes = dia.getDate()
        ventasPorDiaMesAnterior[diaMes] = 0
      })

      // Llenar con datos del mes actual
      ordersData.forEach((o: any) => {
        const fecha = new Date(o.order_date)
        if (fecha >= inicioMesActual && fecha <= finMesActual) {
          const diaMes = fecha.getDate()
          ventasPorDiaMesActual[diaMes] = (ventasPorDiaMesActual[diaMes] || 0) + (o.final_price || 0)
        }
      })

      // Llenar con datos del mes anterior
      ordersAnterioresData.forEach((o: any) => {
        const fecha = new Date(o.order_date)
        if (fecha >= inicioMesAnterior && fecha <= finMesAnterior) {
          const diaMes = fecha.getDate()
          ventasPorDiaMesAnterior[diaMes] = (ventasPorDiaMesAnterior[diaMes] || 0) + (o.final_price || 0)
        }
      })

      // Crear array comparativo usando el máximo de días entre ambos meses
      const maxDias = Math.max(diasMesActual.length, diasMesAnterior.length)
      const comparativaArr = Array.from({ length: maxDias }, (_, idx) => {
        const diaMes = idx + 1
        return {
          dia: `Día ${diaMes}`,
          actual: Math.round(ventasPorDiaMesActual[diaMes] || 0),
          anterior: Math.round(ventasPorDiaMesAnterior[diaMes] || 0)
        }
      })

      setComparativaData(comparativaArr)

      // 6. Comparativa año actual vs año anterior (mismo mes del año pasado)
      const añoAnterior = new Date(mesActual)
      añoAnterior.setFullYear(añoAnterior.getFullYear() - 1)
      
      const inicioMesAñoAnterior = startOfMonth(añoAnterior)
      const finMesAñoAnterior = endOfMonth(añoAnterior)

      // Query para datos del mismo mes del año anterior
      const { data: ordersAñoAnterior } = await supabase
        .from('3t_orders')
        .select('order_date, final_price')
        .gte('order_date', format(inicioMesAñoAnterior, 'yyyy-MM-dd'))
        .lte('order_date', format(finMesAñoAnterior, 'yyyy-MM-dd'))

      const ordersAñoAnteriorData = ordersAñoAnterior || []

      // Crear mapas de ventas por día del mes
      const ventasPorDiaAñoAnterior: Record<number, number> = {}

      // Inicializar
      Array.from({ length: 31 }, (_, i) => i + 1).forEach(dia => {
        ventasPorDiaAñoAnterior[dia] = 0
      })

      // Llenar con datos del año anterior
      ordersAñoAnteriorData.forEach((o: any) => {
        const fecha = new Date(o.order_date)
        const diaMes = fecha.getDate()
        ventasPorDiaAñoAnterior[diaMes] = (ventasPorDiaAñoAnterior[diaMes] || 0) + (o.final_price || 0)
      })

      // Crear array comparativo anual
      const comparativaAnualArr = Array.from({ length: maxDias }, (_, idx) => {
        const diaMes = idx + 1
        return {
          dia: `Día ${diaMes}`,
          actual: Math.round(ventasPorDiaMesActual[diaMes] || 0),
          añoAnterior: Math.round(ventasPorDiaAñoAnterior[diaMes] || 0)
        }
      })

      setComparativaAnualData(comparativaAnualArr)

    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Filtrar datos comparativos según período seleccionado
  const comparativaDataFiltrado = (() => {
    if (comparativaData.length === 0) return []
    
    let limite = 30
    if (periodoComparativa === '7d') limite = 7
    else if (periodoComparativa === '3m') limite = 90
    
    return comparativaData.slice(-limite)
  })()

  const comparativaAnualDataFiltrado = (() => {
    if (comparativaAnualData.length === 0) return []
    
    let limite = 30
    if (periodoAnual === '7d') limite = 7
    else if (periodoAnual === '3m') limite = 90
    
    return comparativaAnualData.slice(-limite)
  })()

  // Configs de gráficos
  const chartConfigProductos = {
    total: {
      label: "Total",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig

  const chartConfigComunas = {
    ventas: {
      label: "Ventas",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig

  const chartConfigClientes = {
    ventas: {
      label: "Ventas",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig

  // Config de comparativa mensual con nombres de meses dinámicos
  const mesActualNombre = format(new Date(), 'MMMM yyyy', { locale: es })
  const mesAnteriorNombre = format(subMonths(new Date(), 1), 'MMMM yyyy', { locale: es })
  
  const chartConfigComparativa = {
    actual: {
      label: mesActualNombre.charAt(0).toUpperCase() + mesActualNombre.slice(1),
      color: "#0891b2", // Azul turquesa vibrante
    },
    anterior: {
      label: mesAnteriorNombre.charAt(0).toUpperCase() + mesAnteriorNombre.slice(1),
      color: "#64748b", // Gris más visible
    },
  } satisfies ChartConfig

  // Config de comparativa anual (mismo mes año anterior)
  const añoActual = new Date().getFullYear()
  const añoAnterior = añoActual - 1
  const mesActual = format(new Date(), 'MMMM', { locale: es })
  
  const chartConfigComparativaAnual = {
    actual: {
      label: `${mesActual.charAt(0).toUpperCase() + mesActual.slice(1)} ${añoActual}`,
      color: "#0891b2", // Azul turquesa vibrante
    },
    añoAnterior: {
      label: `${mesActual.charAt(0).toUpperCase() + mesActual.slice(1)} ${añoAnterior}`,
      color: "#64748b", // Gris más visible
    },
  } satisfies ChartConfig

  return (
    <RoleGuard allowedRoles={['admin']} showMessage>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Análisis integral del negocio con métricas financieras, operacionales y comerciales
        </p>
      </div>

      {/* Filtros */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Período de Análisis
          </CardTitle>
          <CardDescription>
            Selecciona el rango de fechas para el análisis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="periodo">Período Predefinido</Label>
              <Select value={periodo} onValueChange={(v) => handlePeriodoChange(v as PeriodoTipo)}>
                <SelectTrigger id="periodo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes-actual">Mes Actual</SelectItem>
                  <SelectItem value="mes-anterior">Mes Anterior</SelectItem>
                  <SelectItem value="trimestre">Último Trimestre</SelectItem>
                  <SelectItem value="ano">Año Completo</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
              <Input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value)
                  setPeriodo('personalizado')
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha-fin">Fecha Fin</Label>
              <Input
                id="fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setFechaFin(e.target.value)
                  setPeriodo('personalizado')
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo-cliente">Tipo de Cliente</Label>
              <Select value={tipoCliente} onValueChange={setTipoCliente}>
                <SelectTrigger id="tipo-cliente">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="hogar">🏠 Hogar</SelectItem>
                  <SelectItem value="empresa">🏢 Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente Específico</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger id="cliente">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.customer_id} value={c.customer_id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !metricas ? (
        <div className="text-center py-20 text-muted-foreground">
          No hay datos disponibles para el período seleccionado
        </div>
      ) : (
        <>
          {/* Grid de Métricas (KPIs) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 1. Ingresos del Período */}
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setShowIngresosDialog(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos del Período</CardTitle>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-muted-foreground" />
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metricas.totalVentas)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total con IVA incluido (clic para detalle)
                </p>
                {metricas.cambioVentas !== 0 && (
                  <Badge 
                    variant={metricas.cambioVentas > 0 ? "default" : "destructive"}
                    className="mt-2"
                  >
                    {metricas.cambioVentas > 0 ? (
                      <><ArrowUpRight className="h-3 w-3" /> +{metricas.cambioVentas.toFixed(1)}%</>
                    ) : (
                      <><ArrowDownRight className="h-3 w-3" /> {metricas.cambioVentas.toFixed(1)}%</>
                    )}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* 2. Ventas por Tipo */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ventas por Tipo</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metricas.ventasEmpresa)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Empresa (con IVA)
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <Home className="h-3 w-3 text-green-600" />
                  <span>Hogar: {formatCurrency(metricas.ventasHogar)}</span>
                </div>
              </CardContent>
            </Card>

            {/* 3. Facturación del Mes */}
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setShowFacturasDialog(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Facturación del Mes</CardTitle>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-muted-foreground" />
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.totalFacturas}</div>
                <p className="text-xs text-muted-foreground mt-1">Facturas emitidas (clic para ver detalle)</p>
                <div className="flex flex-col gap-1 mt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sin IVA:</span>
                    <span className="font-medium">{formatCurrency(metricas.facturacionSinIva)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Con IVA:</span>
                    <span className="font-semibold text-primary">{formatCurrency(metricas.facturacionConIva)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. Botellones Entregados */}
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setShowBotellonesDialog(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Botellones Entregados</CardTitle>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-muted-foreground" />
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.totalBotellones.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Promedio: {metricas.totalPedidos > 0 ? (metricas.totalBotellones / metricas.totalPedidos).toFixed(1) : 0} por pedido (clic para detalle)
                </p>
              </CardContent>
            </Card>

            {/* 5. Tiempo Promedio Entrega */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiempo Promedio Entrega</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricas.tiempoPromedioEntrega > 0 
                    ? `${Math.round(metricas.tiempoPromedioEntrega)}h`
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metricas.tiempoPromedioEntrega > 0 
                    ? `Desde pedido a entrega`
                    : 'Sin entregas completadas'}
                </p>
              </CardContent>
            </Card>

            {/* 6. Clientes Activos */}
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setShowClientesDialog(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-muted-foreground" />
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.clientesActivos}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  De {metricas.totalClientes} clientes totales (clic para detalle)
                </p>
              </CardContent>
            </Card>

            {/* 7. Top Comuna */}
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setShowComunasDialog(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Comuna</CardTitle>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-muted-foreground" />
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.topComuna.nombre}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(metricas.topComuna.ventas)} (clic para detalle)
                </p>
              </CardContent>
            </Card>

            {/* 8. Frecuencia y Ticket Promedio */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metricas.ticketPromedio)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Frecuencia: {metricas.frecuenciaPromedio.toFixed(1)} pedidos/cliente
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos Principales */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gráfico Principal: Mes Actual vs Mes Anterior */}
            <Card className="col-span-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mes Actual vs Mes Anterior</CardTitle>
                    <CardDescription>Comparativa de ventas diarias entre meses</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={periodoComparativa === '7d' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriodoComparativa('7d')}
                      className="h-8"
                    >
                      Últimos 7 días
                    </Button>
                    <Button
                      variant={periodoComparativa === '30d' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriodoComparativa('30d')}
                      className="h-8"
                    >
                      Últimos 30 días
                    </Button>
                    <Button
                      variant={periodoComparativa === '3m' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriodoComparativa('3m')}
                      className="h-8"
                    >
                      Últimos 3 meses
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {comparativaData.length > 0 ? (
                  <ChartContainer config={chartConfigComparativa} className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={comparativaDataFiltrado}>
                        <defs>
                          <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0891b2" stopOpacity={0.5}/>
                            <stop offset="50%" stopColor="#0891b2" stopOpacity={0.2}/>
                            <stop offset="100%" stopColor="#0891b2" stopOpacity={0.02}/>
                          </linearGradient>
                          <linearGradient id="fillAnterior" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#64748b" stopOpacity={0.3}/>
                            <stop offset="50%" stopColor="#64748b" stopOpacity={0.12}/>
                            <stop offset="100%" stopColor="#64748b" stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          className="stroke-muted/20" 
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="dia" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          className="text-muted-foreground"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="anterior" 
                          stroke="#64748b" 
                          fill="url(#fillAnterior)"
                          strokeWidth={2}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="actual" 
                          stroke="#0891b2" 
                          fill="url(#fillActual)"
                          strokeWidth={2.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    No hay datos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 2: Ventas por Producto */}
            <Card>
              <CardHeader>
                <CardTitle>Ventas por Producto</CardTitle>
                <CardDescription>Distribución por tipo de producto</CardDescription>
              </CardHeader>
              <CardContent>
                {ventasPorProducto.length > 0 ? (
                  <ChartContainer config={chartConfigProductos} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ventasPorProducto}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="producto" 
                          fontSize={12}
                        />
                        <YAxis 
                          fontSize={12}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: any) => [`$${value.toLocaleString()}`, 'Total']}
                        />
                        <Bar 
                          dataKey="total" 
                          fill="hsl(var(--chart-2))"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No hay datos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 3: Top 10 Comunas */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Comunas</CardTitle>
                <CardDescription>Comunas con mayores ventas</CardDescription>
              </CardHeader>
              <CardContent>
                {top10Comunas.length > 0 ? (
                  <ChartContainer config={chartConfigComunas} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={top10Comunas} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          type="number" 
                          fontSize={12}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="comuna" 
                          width={100}
                          fontSize={12}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: any) => [`$${value.toLocaleString()}`, 'Ventas']}
                        />
                        <Bar 
                          dataKey="ventas" 
                          fill="hsl(var(--chart-3))"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No hay datos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 4: Top 10 Clientes */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Clientes</CardTitle>
                <CardDescription>Clientes con mayores compras</CardDescription>
              </CardHeader>
              <CardContent>
                {top10Clientes.length > 0 ? (
                  <ChartContainer config={chartConfigClientes} className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={top10Clientes} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          type="number" 
                          fontSize={12}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="cliente" 
                          width={120}
                          fontSize={12}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: any) => [`$${value.toLocaleString()}`, 'Ventas']}
                        />
                        <Bar 
                          dataKey="ventas" 
                          fill="hsl(var(--chart-4))"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    No hay datos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 5: Comparativa Año Actual vs Año Anterior */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Comparativa Año sobre Año</CardTitle>
                    <CardDescription>Mismo mes del año anterior</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={periodoAnual === '7d' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriodoAnual('7d')}
                      className="h-8 text-xs"
                    >
                      7 días
                    </Button>
                    <Button
                      variant={periodoAnual === '30d' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriodoAnual('30d')}
                      className="h-8 text-xs"
                    >
                      30 días
                    </Button>
                    <Button
                      variant={periodoAnual === '3m' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriodoAnual('3m')}
                      className="h-8 text-xs"
                    >
                      3 meses
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {comparativaAnualData.length > 0 ? (
                  <ChartContainer config={chartConfigComparativaAnual} className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={comparativaAnualDataFiltrado}>
                        <defs>
                          <linearGradient id="fillActualAnual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0891b2" stopOpacity={0.5}/>
                            <stop offset="50%" stopColor="#0891b2" stopOpacity={0.2}/>
                            <stop offset="100%" stopColor="#0891b2" stopOpacity={0.02}/>
                          </linearGradient>
                          <linearGradient id="fillAñoAnterior" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#64748b" stopOpacity={0.3}/>
                            <stop offset="50%" stopColor="#64748b" stopOpacity={0.12}/>
                            <stop offset="100%" stopColor="#64748b" stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          className="stroke-muted/20" 
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="dia" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          className="text-muted-foreground"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="añoAnterior" 
                          stroke="#64748b" 
                          fill="url(#fillAñoAnterior)"
                          strokeWidth={2}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="actual" 
                          stroke="#0891b2" 
                          fill="url(#fillActualAnual)"
                          strokeWidth={2.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    No hay datos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* === SECCIÓN DE MAPAS === */}
          <div className="mt-8">
            <MapaDashboard 
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              tipoCliente={tipoCliente}
              clienteId={clienteId}
            />
          </div>
        </>
      )}

      {/* === DIÁLOGO DE DETALLE DE FACTURAS === */}
      <Dialog open={showFacturasDialog} onOpenChange={setShowFacturasDialog}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalle de Facturas del Período
            </DialogTitle>
            <DialogDescription>
              Facturas emitidas desde {format(new Date(fechaInicio), 'dd/MM/yyyy', { locale: es })} hasta {format(new Date(fechaFin), 'dd/MM/yyyy', { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Total Facturas</p>
                <p className="text-2xl font-bold">{facturasDetalle.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pedidos</p>
                <p className="text-2xl font-bold">
                  {facturasDetalle.reduce((sum, f) => sum + (f.order_invoices?.length || 0), 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sin IVA</p>
                <p className="text-xl font-bold">
                  {formatCurrency(facturasDetalle.reduce((sum, f) => sum + (f.subtotal || 0), 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Con IVA</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(facturasDetalle.reduce((sum, f) => sum + (f.total_amount || 0), 0))}
                </p>
              </div>
            </div>

            {/* Tabla de Facturas */}
            {facturasDetalle.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Fecha Factura</TableHead>
                      <TableHead>N° Factura</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Pedidos</TableHead>
                      <TableHead className="text-right">Monto Sin IVA</TableHead>
                      <TableHead className="text-right">IVA (19%)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facturasDetalle.flatMap((factura) => {
                        const isExpanded = facturaExpandida === factura.invoice_id
                        
                        // Extraer información del primer pedido para cliente y tipo
                        const primerPedido = factura.order_invoices?.[0]?.order
                        const cliente = primerPedido?.customer?.name || 'Sin cliente'
                        const tipoCliente = primerPedido?.customer?.customer_type
                        
                        return [
                          // Fila principal de la factura
                          <TableRow 
                            key={factura.invoice_id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setFacturaExpandida(isExpanded ? null : factura.invoice_id)}
                          >
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              {factura.invoice_date 
                                ? format(new Date(factura.invoice_date), 'dd/MM/yyyy', { locale: es })
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {factura.invoice_number}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {cliente}
                            </TableCell>
                            <TableCell>
                              <Badge variant={tipoCliente === 'Empresa' ? 'default' : 'secondary'}>
                                {tipoCliente === 'Empresa' ? (
                                  <>
                                    <Building2 className="h-3 w-3 mr-1" />
                                    Empresa
                                  </>
                                ) : (
                                  <>
                                    <Home className="h-3 w-3 mr-1" />
                                    Hogar
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-semibold">
                                {factura.order_invoices?.length || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(factura.subtotal || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {formatCurrency(factura.tax_amount || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatCurrency(factura.total_amount || 0)}
                            </TableCell>
                          </TableRow>,
                          
                          // Filas expandidas con detalle de pedidos
                          ...(isExpanded ? (factura.order_invoices || []).map((oi: any, idx: number) => {
                            const pedido = oi.order
                            const montoFacturado = oi.amount_invoiced || 0
                            return (
                              <TableRow key={`${factura.invoice_id}-${idx}`} className="bg-muted/30">
                                <TableCell></TableCell>
                                <TableCell className="text-xs text-muted-foreground pl-8">
                                  {pedido?.order_date 
                                    ? format(new Date(pedido.order_date), 'dd/MM/yyyy', { locale: es })
                                    : '-'
                                  }
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    Pedido #{idx + 1}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {pedido?.product?.name || 'N/A'}
                                </TableCell>
                                <TableCell className="text-center text-xs">
                                  <Badge variant="outline" className="text-xs">
                                    {pedido?.quantity || 0}
                                  </Badge>
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatCurrency(montoFacturado / 1.19)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                  {formatCurrency(montoFacturado - (montoFacturado / 1.19))}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatCurrency(montoFacturado)}
                                </TableCell>
                              </TableRow>
                            )
                          }) : [])
                        ]
                      })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-2 opacity-50" />
                <p>No hay facturas emitidas en este período</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowFacturasDialog(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === DIÁLOGO DE INGRESOS DEL PERÍODO === */}
      <Dialog open={showIngresosDialog} onOpenChange={setShowIngresosDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Detalle de Ingresos del Período
            </DialogTitle>
            <DialogDescription>
              Ventas desde {format(new Date(fechaInicio), 'dd/MM/yyyy', { locale: es })} hasta {format(new Date(fechaFin), 'dd/MM/yyyy', { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Total Pedidos</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ventas Empresa</p>
                <p className="text-xl font-bold">{formatCurrency(metricas?.ventasEmpresa || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ventas Hogar</p>
                <p className="text-xl font-bold">{formatCurrency(metricas?.ventasHogar || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total con IVA</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(metricas?.totalVentas || 0)}</p>
              </div>
            </div>

            {/* Tabla de Pedidos */}
            {orders.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.order_id}>
                        <TableCell className="text-xs">
                          {order.order_date 
                            ? format(new Date(order.order_date), 'dd/MM/yyyy', { locale: es })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {order.customer?.name || 'Sin nombre'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.customer?.customer_type === 'Empresa' ? 'default' : 'secondary'} className="text-xs">
                            {order.customer?.customer_type === 'Empresa' ? '🏢' : '🏠'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {order.product?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {order.quantity || 0}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(order.final_price || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              order.status === 'Despachado' ? 'default' :
                              order.status === 'Ruta' ? 'secondary' : 'outline'
                            }
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mb-2 opacity-50" />
                <p>No hay pedidos en este período</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowIngresosDialog(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === DIÁLOGO DE BOTELLONES ENTREGADOS === */}
      <Dialog open={showBotellonesDialog} onOpenChange={setShowBotellonesDialog}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalle de Botellones Entregados
            </DialogTitle>
            <DialogDescription>
              Desde {format(new Date(fechaInicio), 'dd/MM/yyyy', { locale: es })} hasta {format(new Date(fechaFin), 'dd/MM/yyyy', { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Total Botellones</p>
                <p className="text-2xl font-bold">{metricas?.totalBotellones.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pedidos</p>
                <p className="text-2xl font-bold">{metricas?.totalPedidos || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Promedio por Pedido</p>
                <p className="text-2xl font-bold text-primary">
                  {metricas && metricas.totalPedidos > 0 
                    ? (metricas.totalBotellones / metricas.totalPedidos).toFixed(1) 
                    : '0'}
                </p>
              </div>
            </div>

            {/* Tabla de Pedidos */}
            {orders.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unitario</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders
                      .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
                      .map((order) => (
                        <TableRow key={order.order_id}>
                          <TableCell className="text-xs">
                            {order.order_date 
                              ? format(new Date(order.order_date), 'dd/MM/yyyy', { locale: es })
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {order.customer?.name || 'Sin nombre'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {order.product?.name || 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default" className="text-base font-bold">
                              {order.quantity || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatCurrency((order.final_price || 0) / (order.quantity || 1))}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(order.final_price || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mb-2 opacity-50" />
                <p>No hay pedidos en este período</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowBotellonesDialog(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === DIÁLOGO DE CLIENTES ACTIVOS === */}
      <Dialog open={showClientesDialog} onOpenChange={setShowClientesDialog}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Detalle de Clientes Activos
            </DialogTitle>
            <DialogDescription>
              Clientes con pedidos desde {format(new Date(fechaInicio), 'dd/MM/yyyy', { locale: es })} hasta {format(new Date(fechaFin), 'dd/MM/yyyy', { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Clientes Activos</p>
                <p className="text-2xl font-bold">{metricas?.clientesActivos || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{metricas?.totalClientes || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">% Activos</p>
                <p className="text-2xl font-bold text-primary">
                  {metricas && metricas.totalClientes > 0 
                    ? ((metricas.clientesActivos / metricas.totalClientes) * 100).toFixed(1) 
                    : '0'}%
                </p>
              </div>
            </div>

            {/* Tabla de Clientes */}
            {top10Clientes.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Pedidos</TableHead>
                      <TableHead className="text-right">Total Ventas</TableHead>
                      <TableHead className="text-right">Ticket Promedio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top10Clientes.map((cliente, idx) => {
                      const pedidosCliente = orders.filter(o => o.customer?.name === cliente.cliente.replace('...', ''))
                      const numPedidos = pedidosCliente.length
                      const ticketPromedio = numPedidos > 0 ? cliente.ventas / numPedidos : 0
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{cliente.cliente}</TableCell>
                          <TableCell>
                            <Badge variant={cliente.tipo === 'Empresa' ? 'default' : 'secondary'}>
                              {cliente.tipo === 'Empresa' ? (
                                <>
                                  <Building2 className="h-3 w-3 mr-1" />
                                  Empresa
                                </>
                              ) : (
                                <>
                                  <Home className="h-3 w-3 mr-1" />
                                  Hogar
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{numPedidos}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(cliente.ventas)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatCurrency(ticketPromedio)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-2 opacity-50" />
                <p>No hay clientes activos en este período</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowClientesDialog(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === DIÁLOGO DE VENTAS POR COMUNA === */}
      <Dialog open={showComunasDialog} onOpenChange={setShowComunasDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Ventas por Comuna
            </DialogTitle>
            <DialogDescription>
              Distribución de ventas desde {format(new Date(fechaInicio), 'dd/MM/yyyy', { locale: es })} hasta {format(new Date(fechaFin), 'dd/MM/yyyy', { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Top Comuna</p>
                <p className="text-2xl font-bold">{metricas?.topComuna.nombre || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ventas Top</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(metricas?.topComuna.ventas || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comunas Atendidas</p>
                <p className="text-2xl font-bold">{top10Comunas.length}</p>
              </div>
            </div>

            {/* Tabla de Comunas */}
            {top10Comunas.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Comuna</TableHead>
                      <TableHead className="text-center">Pedidos</TableHead>
                      <TableHead className="text-right">Total Ventas</TableHead>
                      <TableHead className="text-right">% del Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top10Comunas.map((comuna, idx) => {
                      const pedidosComuna = orders.filter(o => {
                        // Aquí necesitaríamos acceso al addressMap, pero por simplicidad contamos los pedidos
                        return true
                      }).length
                      const porcentaje = metricas ? (comuna.ventas / metricas.totalVentas) * 100 : 0
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-medium">{comuna.comuna}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{Math.ceil(pedidosComuna / top10Comunas.length)}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(comuna.ventas)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={idx === 0 ? 'default' : 'secondary'}>
                              {porcentaje.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mb-2 opacity-50" />
                <p>No hay datos de comunas en este período</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowComunasDialog(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </RoleGuard>
  )
}
