import { supabase } from '@/lib/supabase'
import {
  VentasData,
  VentasResumen,
  CuentaPorCobrar,
  CuentasPorCobrarResumen,
  ClienteAnalisis,
  ClientesResumen,
  EntregaPorZona,
  EntregasResumen,
  ProductoAnalisis,
  TipoProductoAnalisis,
  ProductosResumen,
  ReporteEjecutivoData,
  RangoDeFechas
} from './types'

// ============================================
// REPORTE DE VENTAS
// ============================================

export async function getVentasData(fechaInicio: string, fechaFin: string): Promise<VentasData[]> {
  const { data, error } = await supabase
    .from('3t_dashboard_ventas')
    .select('*')
    .gte('order_date', fechaInicio)
    .lte('order_date', fechaFin)
    .order('order_date', { ascending: false })

  if (error) {
    console.error('Error obteniendo ventas:', error)
    throw error
  }

  return data || []
}

export function calcularVentasResumen(ventas: VentasData[]): VentasResumen {
  const totalVentas = ventas.reduce((sum, v) => sum + (v.final_price || 0), 0)
  const totalVentasHogar = ventas
    .filter(v => v.customer_type === 'Hogar')
    .reduce((sum, v) => sum + (v.final_price || 0), 0)
  const totalVentasEmpresa = ventas
    .filter(v => v.customer_type === 'Empresa')
    .reduce((sum, v) => sum + (v.final_price || 0), 0)
  const totalVentasConIva = ventas
    .filter(v => v.customer_type === 'Empresa')
    .reduce((sum, v) => sum + (v.precio_con_iva || 0), 0)
  const totalVentasSinIva = ventas
    .filter(v => v.customer_type === 'Empresa')
    .reduce((sum, v) => sum + (v.precio_neto || 0), 0)
  const totalPedidos = ventas.length
  const totalBotellones = ventas.reduce((sum, v) => sum + (v.quantity || 0), 0)
  const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0

  return {
    totalVentas,
    totalVentasHogar,
    totalVentasEmpresa,
    totalVentasConIva,
    totalVentasSinIva,
    totalPedidos,
    totalBotellones,
    ticketPromedio
  }
}

// ============================================
// REPORTE DE CUENTAS POR COBRAR
// ============================================

export async function getCuentasPorCobrar(): Promise<CuentaPorCobrar[]> {
  const { data, error } = await supabase
    .from('3t_orders')
    .select(`
      order_id,
      order_date,
      customer_id,
      final_price,
      customer:3t_customers(
        name,
        customer_type,
        phone
      )
    `)
    .eq('payment_status', 'Pendiente')
    .order('order_date', { ascending: true })

  if (error) {
    console.error('Error obteniendo cuentas por cobrar:', error)
    throw error
  }

  const hoy = new Date()
  
  return (data || []).map((item: any) => {
    const fechaPedido = new Date(item.order_date)
    const diasVencidos = Math.floor((hoy.getTime() - fechaPedido.getTime()) / (1000 * 60 * 60 * 24))
    
    let antiguedad: '0-30' | '31-60' | '60+' = '0-30'
    if (diasVencidos > 60) antiguedad = '60+'
    else if (diasVencidos > 30) antiguedad = '31-60'

    return {
      order_id: item.order_id,
      order_date: item.order_date,
      customer_id: item.customer_id,
      customer_name: item.customer?.name || 'Sin nombre',
      customer_type: item.customer?.customer_type || 'N/A',
      customer_phone: item.customer?.phone,
      final_price: item.final_price || 0,
      dias_vencidos: diasVencidos,
      antiguedad
    }
  })
}

export function calcularCuentasPorCobrarResumen(cuentas: CuentaPorCobrar[]): CuentasPorCobrarResumen {
  return {
    totalPorCobrar: cuentas.reduce((sum, c) => sum + c.final_price, 0),
    cantidadCuentas: cuentas.length,
    rango_0_30: cuentas.filter(c => c.antiguedad === '0-30').reduce((sum, c) => sum + c.final_price, 0),
    rango_31_60: cuentas.filter(c => c.antiguedad === '31-60').reduce((sum, c) => sum + c.final_price, 0),
    rango_60_plus: cuentas.filter(c => c.antiguedad === '60+').reduce((sum, c) => sum + c.final_price, 0)
  }
}

// ============================================
// REPORTE DE CLIENTES
// ============================================

export async function getClientesAnalisis(fechaInicio: string, fechaFin: string): Promise<ClienteAnalisis[]> {
  // Obtener todos los clientes
  const { data: clientes, error: errorClientes } = await supabase
    .from('3t_customers')
    .select('customer_id, name, customer_type, phone')

  if (errorClientes) {
    console.error('Error obteniendo clientes:', errorClientes)
    throw errorClientes
  }

  // Obtener pedidos del período
  const { data: pedidos, error: errorPedidos } = await supabase
    .from('3t_orders')
    .select('customer_id, order_date, final_price')
    .gte('order_date', fechaInicio)
    .lte('order_date', fechaFin)

  if (errorPedidos) {
    console.error('Error obteniendo pedidos:', errorPedidos)
    throw errorPedidos
  }

  const hoy = new Date()

  // Agrupar pedidos por cliente
  const clientesMap = new Map<string, ClienteAnalisis>()

  clientes?.forEach(cliente => {
    const pedidosCliente = pedidos?.filter(p => p.customer_id === cliente.customer_id) || []
    const totalCompras = pedidosCliente.reduce((sum, p) => sum + (p.final_price || 0), 0)
    const totalPedidos = pedidosCliente.length
    const ticketPromedio = totalPedidos > 0 ? totalCompras / totalPedidos : 0

    // Calcular último pedido y días sin comprar
    let ultimoPedido: string | undefined
    let diasSinComprar: number | undefined
    let frecuenciaDias: number | undefined

    if (pedidosCliente.length > 0) {
      const fechas = pedidosCliente.map(p => new Date(p.order_date)).sort((a, b) => b.getTime() - a.getTime())
      ultimoPedido = fechas[0].toISOString().split('T')[0]
      diasSinComprar = Math.floor((hoy.getTime() - fechas[0].getTime()) / (1000 * 60 * 60 * 24))

      // Calcular frecuencia promedio entre pedidos
      if (fechas.length > 1) {
        const primeraFecha = fechas[fechas.length - 1]
        const ultimaFecha = fechas[0]
        const diasTotales = Math.floor((ultimaFecha.getTime() - primeraFecha.getTime()) / (1000 * 60 * 60 * 24))
        frecuenciaDias = Math.floor(diasTotales / (fechas.length - 1))
      }
    }

    clientesMap.set(cliente.customer_id, {
      customer_id: cliente.customer_id,
      name: cliente.name || 'Sin nombre',
      customer_type: cliente.customer_type || 'N/A',
      phone: cliente.phone,
      total_pedidos: totalPedidos,
      total_compras: totalCompras,
      ticket_promedio: ticketPromedio,
      ultimo_pedido: ultimoPedido,
      dias_sin_comprar: diasSinComprar,
      frecuencia_dias: frecuenciaDias
    })
  })

  return Array.from(clientesMap.values())
    .sort((a, b) => b.total_compras - a.total_compras)
}

export function calcularClientesResumen(clientes: ClienteAnalisis[]): ClientesResumen {
  const clientesActivos = clientes.filter(c => c.total_pedidos > 0)
  const clientesInactivos = clientes.filter(c => c.total_pedidos === 0 || (c.dias_sin_comprar && c.dias_sin_comprar > 30))
  const totalCompras = clientesActivos.reduce((sum, c) => sum + c.total_compras, 0)
  const totalPedidos = clientesActivos.reduce((sum, c) => sum + c.total_pedidos, 0)

  return {
    totalClientes: clientes.length,
    clientesActivos: clientesActivos.length,
    clientesInactivos: clientesInactivos.length,
    ticketPromedioGeneral: totalPedidos > 0 ? totalCompras / totalPedidos : 0
  }
}

// ============================================
// REPORTE DE ENTREGAS POR ZONA
// ============================================

export async function getEntregasPorZona(fechaInicio: string, fechaFin: string): Promise<EntregaPorZona[]> {
  const { data, error } = await supabase
    .from('3t_dashboard_ventas')
    .select('commune, quantity, final_price, tiempo_entrega_minutos, status')
    .gte('order_date', fechaInicio)
    .lte('order_date', fechaFin)
    .eq('status', 'Despachado')

  if (error) {
    console.error('Error obteniendo entregas por zona:', error)
    throw error
  }

  // Agrupar por comuna
  const zonasMap = new Map<string, EntregaPorZona>()

  data?.forEach(item => {
    const comuna = item.commune || 'Sin especificar'
    
    if (!zonasMap.has(comuna)) {
      zonasMap.set(comuna, {
        commune: comuna,
        total_entregas: 0,
        total_botellones: 0,
        tiempo_promedio_minutos: 0,
        total_ventas: 0
      })
    }

    const zona = zonasMap.get(comuna)!
    zona.total_entregas += 1
    zona.total_botellones += item.quantity || 0
    zona.total_ventas += item.final_price || 0
  })

  // Calcular tiempo promedio
  const tiempos = new Map<string, number[]>()
  data?.forEach(item => {
    const comuna = item.commune || 'Sin especificar'
    if (item.tiempo_entrega_minutos) {
      if (!tiempos.has(comuna)) {
        tiempos.set(comuna, [])
      }
      tiempos.get(comuna)!.push(item.tiempo_entrega_minutos)
    }
  })

  tiempos.forEach((valores, comuna) => {
    const zona = zonasMap.get(comuna)
    if (zona && valores.length > 0) {
      zona.tiempo_promedio_minutos = Math.round(valores.reduce((a, b) => a + b, 0) / valores.length)
    }
  })

  return Array.from(zonasMap.values())
    .sort((a, b) => b.total_entregas - a.total_entregas)
}

export function calcularEntregasResumen(entregas: EntregaPorZona[]): EntregasResumen {
  const totalEntregas = entregas.reduce((sum, e) => sum + e.total_entregas, 0)
  const totalBotellones = entregas.reduce((sum, e) => sum + e.total_botellones, 0)
  const tiemposValidos = entregas.filter(e => e.tiempo_promedio_minutos && e.tiempo_promedio_minutos > 0)
  const tiempoPromedioGeneral = tiemposValidos.length > 0
    ? Math.round(tiemposValidos.reduce((sum, e) => sum + (e.tiempo_promedio_minutos || 0), 0) / tiemposValidos.length)
    : 0

  return {
    totalEntregas,
    totalBotellones,
    tiempoPromedioGeneral,
    zonasAtendidas: entregas.length
  }
}

// ============================================
// REPORTE DE PRODUCTOS
// ============================================

export async function getProductosAnalisis(fechaInicio: string, fechaFin: string): Promise<{
  productos: ProductoAnalisis[]
  tiposProducto: TipoProductoAnalisis[]
}> {
  const { data, error } = await supabase
    .from('3t_orders')
    .select(`
      order_id,
      quantity,
      final_price,
      order_type,
      product:3t_products(
        name
      )
    `)
    .gte('order_date', fechaInicio)
    .lte('order_date', fechaFin)

  if (error) {
    console.error('Error obteniendo productos:', error)
    throw error
  }

  // Agrupar por producto
  const productosMap = new Map<string, ProductoAnalisis>()
  const tiposMap = new Map<string, TipoProductoAnalisis>()

  let totalVentasGeneral = 0

  data?.forEach((item: any) => {
    const productoNombre = item.product?.name || 'Sin especificar'
    const precio = item.final_price || 0
    const cantidad = item.quantity || 0

    totalVentasGeneral += precio

    // Productos
    if (!productosMap.has(productoNombre)) {
      productosMap.set(productoNombre, {
        product_name: productoNombre,
        total_vendidos: 0,
        total_botellones: 0,
        total_ventas: 0,
        porcentaje: 0
      })
    }

    const producto = productosMap.get(productoNombre)!
    producto.total_vendidos += 1
    producto.total_botellones += cantidad
    producto.total_ventas += precio

    // Tipos de producto (recarga vs nuevo)
    const tipo = item.order_type === 'recarga' ? 'recarga' : 'nuevo'
    if (!tiposMap.has(tipo)) {
      tiposMap.set(tipo, {
        tipo: tipo as 'recarga' | 'nuevo',
        total_vendidos: 0,
        total_botellones: 0,
        total_ventas: 0,
        porcentaje: 0
      })
    }

    const tipoProducto = tiposMap.get(tipo)!
    tipoProducto.total_vendidos += 1
    tipoProducto.total_botellones += cantidad
    tipoProducto.total_ventas += precio
  })

  // Calcular porcentajes
  const productos = Array.from(productosMap.values()).map(p => ({
    ...p,
    porcentaje: totalVentasGeneral > 0 ? (p.total_ventas / totalVentasGeneral) * 100 : 0
  })).sort((a, b) => b.total_ventas - a.total_ventas)

  const tiposProducto = Array.from(tiposMap.values()).map(t => ({
    ...t,
    porcentaje: totalVentasGeneral > 0 ? (t.total_ventas / totalVentasGeneral) * 100 : 0
  }))

  return { productos, tiposProducto }
}

export function calcularProductosResumen(
  productos: ProductoAnalisis[],
  tiposProducto: TipoProductoAnalisis[]
): ProductosResumen {
  const totalProductosVendidos = productos.reduce((sum, p) => sum + p.total_vendidos, 0)
  const totalBotellones = productos.reduce((sum, p) => sum + p.total_botellones, 0)
  const productoMasVendido = productos.length > 0 ? productos[0].product_name : 'N/A'
  
  const recarga = tiposProducto.find(t => t.tipo === 'recarga')
  const nuevo = tiposProducto.find(t => t.tipo === 'nuevo')
  
  return {
    totalProductosVendidos,
    totalBotellones,
    productoMasVendido,
    porcentajeRecarga: recarga?.porcentaje || 0,
    porcentajeNuevo: nuevo?.porcentaje || 0
  }
}

// ============================================
// REPORTE EJECUTIVO
// ============================================

export async function getReporteEjecutivo(fechaInicio: string, fechaFin: string): Promise<ReporteEjecutivoData> {
  // Obtener datos necesarios en paralelo
  const [ventas, clientes, cuentas, { productos }] = await Promise.all([
    getVentasData(fechaInicio, fechaFin),
    getClientesAnalisis(fechaInicio, fechaFin),
    getCuentasPorCobrar(),
    getProductosAnalisis(fechaInicio, fechaFin)
  ])

  const ventasResumen = calcularVentasResumen(ventas)
  const cuentasResumen = calcularCuentasPorCobrarResumen(cuentas)
  const clientesActivos = clientes.filter(c => c.total_pedidos > 0)

  // Calcular ingresos del período anterior para comparativa
  const diasPeriodo = Math.floor((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24))
  const fechaInicioAnterior = new Date(new Date(fechaInicio).getTime() - diasPeriodo * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const fechaFinAnterior = new Date(new Date(fechaFin).getTime() - diasPeriodo * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  const ventasAnteriores = await getVentasData(fechaInicioAnterior, fechaFinAnterior)
  const ventasResumenAnterior = calcularVentasResumen(ventasAnteriores)
  
  const ingresosComparativa = ventasResumenAnterior.totalVentas > 0
    ? ((ventasResumen.totalVentas - ventasResumenAnterior.totalVentas) / ventasResumenAnterior.totalVentas) * 100
    : 0

  return {
    periodo: { desde: fechaInicio, hasta: fechaFin },
    resumen: {
      ingresosTotales: ventasResumen.totalVentas,
      ingresosComparativa,
      pedidosTotales: ventasResumen.totalPedidos,
      clientesActivos: clientesActivos.length,
      botellonesTotales: ventasResumen.totalBotellones
    },
    topClientes: clientes.slice(0, 5),
    topProductos: productos.slice(0, 5),
    cuentasPorCobrar: {
      total: cuentasResumen.totalPorCobrar,
      cantidad: cuentasResumen.cantidadCuentas
    },
    ventasPorTipo: {
      hogar: ventasResumen.totalVentasHogar,
      empresa: ventasResumen.totalVentasEmpresa
    }
  }
}

