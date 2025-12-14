import * as XLSX from 'xlsx'
import {
  VentasData,
  CuentaPorCobrar,
  ClienteAnalisis,
  EntregaPorZona,
  ProductoAnalisis,
  TipoProductoAnalisis
} from './types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Utilidad para formatear moneda
function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-CL')}`
}

// ============================================
// REPORTE DE VENTAS - EXCEL
// ============================================

export function exportarVentasExcel(
  ventas: VentasData[],
  fechaInicio: string,
  fechaFin: string
) {
  // Preparar datos para Excel
  const datosExcel = ventas.map(v => ({
    'Fecha Pedido': v.order_date,
    'Fecha Entrega': v.delivered_date || 'Pendiente',
    'Cliente': v.customer_name || 'N/A',
    'Tipo Cliente': v.customer_type || 'N/A',
    'Producto': v.product_name || 'N/A',
    'Cantidad': v.quantity || 0,
    'Precio Total': v.final_price || 0,
    'Precio con IVA': v.precio_con_iva || 0,
    'Precio Neto': v.precio_neto || 0,
    'Estado Pago': v.payment_status || 'N/A',
    'Comuna': v.commune || 'N/A'
  }))

  // Crear workbook y worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datosExcel)

  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas')

  // Generar y descargar archivo
  const nombreArchivo = `reporte-ventas-${fechaInicio}-${fechaFin}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

// ============================================
// REPORTE DE CUENTAS POR COBRAR - EXCEL
// ============================================

export function exportarCuentasPorCobrarExcel(cuentas: CuentaPorCobrar[]) {
  const datosExcel = cuentas.map(c => ({
    'Fecha Pedido': c.order_date,
    'Cliente': c.customer_name,
    'Tipo Cliente': c.customer_type,
    'Teléfono': c.customer_phone || 'N/A',
    'Monto Pendiente': c.final_price,
    'Días Vencidos': c.dias_vencidos,
    'Antigüedad': c.antiguedad
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datosExcel)
  XLSX.utils.book_append_sheet(wb, ws, 'Cuentas por Cobrar')

  const nombreArchivo = `cuentas-por-cobrar-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

// ============================================
// REPORTE DE CLIENTES - EXCEL
// ============================================

export function exportarClientesExcel(
  clientes: ClienteAnalisis[],
  fechaInicio: string,
  fechaFin: string
) {
  const datosExcel = clientes.map(c => ({
    'Nombre': c.name,
    'Tipo': c.customer_type,
    'Teléfono': c.phone || 'N/A',
    'Total Pedidos': c.total_pedidos,
    'Total Compras': c.total_compras,
    'Ticket Promedio': Math.round(c.ticket_promedio),
    'Último Pedido': c.ultimo_pedido || 'Nunca',
    'Días sin Comprar': c.dias_sin_comprar || 'N/A',
    'Frecuencia (días)': c.frecuencia_dias || 'N/A'
  }))

  const wb = XLSX.utils.book_new()
  
  // Hoja 1: Todos los clientes
  const ws1 = XLSX.utils.json_to_sheet(datosExcel)
  XLSX.utils.book_append_sheet(wb, ws1, 'Todos los Clientes')

  // Hoja 2: Top 10
  const top10 = datosExcel.slice(0, 10)
  const ws2 = XLSX.utils.json_to_sheet(top10)
  XLSX.utils.book_append_sheet(wb, ws2, 'Top 10')

  // Hoja 3: Clientes Inactivos
  const inactivos = clientes
    .filter(c => c.total_pedidos === 0 || (c.dias_sin_comprar && c.dias_sin_comprar > 30))
    .map(c => ({
      'Nombre': c.name,
      'Tipo': c.customer_type,
      'Teléfono': c.phone || 'N/A',
      'Último Pedido': c.ultimo_pedido || 'Nunca',
      'Días sin Comprar': c.dias_sin_comprar || 'N/A'
    }))
  const ws3 = XLSX.utils.json_to_sheet(inactivos)
  XLSX.utils.book_append_sheet(wb, ws3, 'Clientes Inactivos')

  const nombreArchivo = `reporte-clientes-${fechaInicio}-${fechaFin}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

// ============================================
// REPORTE DE ENTREGAS POR ZONA - EXCEL
// ============================================

export function exportarEntregasPorZonaExcel(
  entregas: EntregaPorZona[],
  fechaInicio: string,
  fechaFin: string
) {
  const datosExcel = entregas.map(e => ({
    'Comuna': e.commune,
    'Total Entregas': e.total_entregas,
    'Total Botellones': e.total_botellones,
    'Tiempo Promedio (min)': e.tiempo_promedio_minutos || 'N/A',
    'Total Ventas': e.total_ventas
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datosExcel)
  XLSX.utils.book_append_sheet(wb, ws, 'Entregas por Zona')

  const nombreArchivo = `entregas-por-zona-${fechaInicio}-${fechaFin}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

// ============================================
// REPORTE DE PRODUCTOS - EXCEL
// ============================================

export function exportarProductosExcel(
  productos: ProductoAnalisis[],
  tiposProducto: TipoProductoAnalisis[],
  fechaInicio: string,
  fechaFin: string
) {
  const wb = XLSX.utils.book_new()

  // Hoja 1: Productos
  const datosProductos = productos.map(p => ({
    'Producto': p.product_name,
    'Total Vendidos': p.total_vendidos,
    'Total Botellones': p.total_botellones,
    'Total Ventas': p.total_ventas,
    'Porcentaje': `${p.porcentaje.toFixed(1)}%`
  }))
  const ws1 = XLSX.utils.json_to_sheet(datosProductos)
  XLSX.utils.book_append_sheet(wb, ws1, 'Productos')

  // Hoja 2: Tipos (Recarga vs Nuevo)
  const datosTipos = tiposProducto.map(t => ({
    'Tipo': t.tipo === 'recarga' ? 'Recarga' : 'Nuevo',
    'Total Vendidos': t.total_vendidos,
    'Total Botellones': t.total_botellones,
    'Total Ventas': t.total_ventas,
    'Porcentaje': `${t.porcentaje.toFixed(1)}%`
  }))
  const ws2 = XLSX.utils.json_to_sheet(datosTipos)
  XLSX.utils.book_append_sheet(wb, ws2, 'Recarga vs Nuevo')

  const nombreArchivo = `reporte-productos-${fechaInicio}-${fechaFin}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

