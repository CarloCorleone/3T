// Tipos para el módulo de reportes

// Período de tiempo para filtros
export type PeriodoTipo = 'mes-actual' | 'mes-anterior' | 'trimestre' | 'ano' | 'personalizado'

export type RangoDeFechas = {
  desde: string
  hasta: string
}

// Reporte de Ventas
export type VentasData = {
  order_id: string
  order_date: string
  delivered_date?: string
  customer_name?: string
  customer_type?: string
  final_price?: number
  quantity?: number
  product_name?: string
  payment_status?: string
  commune?: string
  precio_con_iva?: number
  precio_neto?: number
}

export type VentasResumen = {
  totalVentas: number
  totalVentasHogar: number
  totalVentasEmpresa: number
  totalVentasConIva: number
  totalVentasSinIva: number
  totalPedidos: number
  totalBotellones: number
  ticketPromedio: number
}

// Reporte de Cuentas por Cobrar
export type CuentaPorCobrar = {
  order_id: string
  order_date: string
  customer_id: string
  customer_name: string
  customer_type: string
  customer_phone?: string
  final_price: number
  dias_vencidos: number
  antiguedad: '0-30' | '31-60' | '60+'
}

export type CuentasPorCobrarResumen = {
  totalPorCobrar: number
  cantidadCuentas: number
  rango_0_30: number
  rango_31_60: number
  rango_60_plus: number
}

// Reporte de Clientes
export type ClienteAnalisis = {
  customer_id: string
  name: string
  customer_type: string
  phone?: string
  total_pedidos: number
  total_compras: number
  ticket_promedio: number
  ultimo_pedido?: string
  dias_sin_comprar?: number
  frecuencia_dias?: number
}

export type ClientesResumen = {
  totalClientes: number
  clientesActivos: number
  clientesInactivos: number
  ticketPromedioGeneral: number
}

// Reporte de Entregas por Zona
export type EntregaPorZona = {
  commune: string
  total_entregas: number
  total_botellones: number
  tiempo_promedio_minutos?: number
  total_ventas: number
}

export type EntregasResumen = {
  totalEntregas: number
  totalBotellones: number
  tiempoPromedioGeneral: number
  zonasAtendidas: number
}

// Reporte de Productos
export type ProductoAnalisis = {
  product_name: string
  total_vendidos: number
  total_botellones: number
  total_ventas: number
  porcentaje: number
}

export type TipoProductoAnalisis = {
  tipo: 'recarga' | 'nuevo'
  total_vendidos: number
  total_botellones: number
  total_ventas: number
  porcentaje: number
}

export type ProductosResumen = {
  totalProductosVendidos: number
  totalBotellones: number
  productoMasVendido: string
  porcentajeRecarga: number
  porcentajeNuevo: number
}

// Reporte Ejecutivo
export type ReporteEjecutivoData = {
  periodo: RangoDeFechas
  resumen: {
    ingresosTotales: number
    ingresosComparativa: number
    pedidosTotales: number
    clientesActivos: number
    botellonesTotales: number
  }
  topClientes: ClienteAnalisis[]
  topProductos: ProductoAnalisis[]
  cuentasPorCobrar: {
    total: number
    cantidad: number
  }
  ventasPorTipo: {
    hogar: number
    empresa: number
  }
}

// Formato de exportación
export type FormatoExportacion = 'pdf' | 'excel' | 'csv'

