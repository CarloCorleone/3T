import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  ProductosResumen,
  ReporteEjecutivoData
} from './types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Colores corporativos
const COLORS = {
  primary: '#0891b2',
  primaryDark: '#0e7490',
  text: '#1f2937',
  textLight: '#6b7280',
  border: '#e5e7eb'
}

// Utilidad para formatear moneda
function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-CL')}`
}

// Función para agregar header corporativo
function addHeader(doc: jsPDF, title: string) {
  // Título
  doc.setFontSize(20)
  doc.setTextColor(COLORS.primaryDark)
  doc.text(title, 20, 25)

  // Subtítulo empresa
  doc.setFontSize(12)
  doc.setTextColor(COLORS.textLight)
  doc.text('Agua Tres Torres', 20, 33)

  // Fecha generación
  doc.setFontSize(10)
  doc.setTextColor(COLORS.textLight)
  doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 20, 40)

  // Línea separadora
  doc.setDrawColor(COLORS.primary)
  doc.setLineWidth(0.5)
  doc.line(20, 45, 190, 45)

  return 50 // Retorna posición Y donde continuar
}

// Función para agregar footer
function addFooter(doc: jsPDF, pageNumber: number) {
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(COLORS.textLight)
  doc.text(`Página ${pageNumber}`, 105, pageHeight - 10, { align: 'center' })
  doc.text('Agua Tres Torres - Sistema de Gestión', 105, pageHeight - 6, { align: 'center' })
}

// ============================================
// REPORTE DE VENTAS - PDF
// ============================================

export function generarVentasPDF(
  ventas: VentasData[],
  resumen: VentasResumen,
  fechaInicio: string,
  fechaFin: string
) {
  const doc = new jsPDF()
  let yPos = addHeader(doc, 'Reporte de Ventas')

  // Período
  doc.setFontSize(11)
  doc.setTextColor(COLORS.text)
  yPos += 5
  doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 20, yPos)
  yPos += 10

  // Resumen de métricas
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Resumen General', 20, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setTextColor(COLORS.text)
  
  const metricas = [
    ['Total Ventas:', formatCurrency(resumen.totalVentas)],
    ['Ventas Hogar:', formatCurrency(resumen.totalVentasHogar)],
    ['Ventas Empresa:', formatCurrency(resumen.totalVentasEmpresa)],
    ['Ventas con IVA:', formatCurrency(resumen.totalVentasConIva)],
    ['Ventas sin IVA:', formatCurrency(resumen.totalVentasSinIva)],
    ['Total Pedidos:', resumen.totalPedidos.toString()],
    ['Total Botellones:', resumen.totalBotellones.toString()],
    ['Ticket Promedio:', formatCurrency(resumen.ticketPromedio)]
  ]

  metricas.forEach(([label, value]) => {
    doc.text(label, 25, yPos)
    doc.text(value, 100, yPos)
    yPos += 6
  })

  yPos += 5

  // Tabla de ventas detalladas
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Detalle de Ventas', 20, yPos)
  yPos += 5

  const tableData = ventas.slice(0, 50).map(v => [
    v.order_date,
    v.customer_name || 'N/A',
    v.customer_type || 'N/A',
    v.product_name || 'N/A',
    (v.quantity || 0).toString(),
    formatCurrency(v.final_price || 0),
    v.payment_status || 'N/A'
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Fecha', 'Cliente', 'Tipo', 'Producto', 'Cant.', 'Total', 'Estado']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primaryDark,
      textColor: '#ffffff',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.text
    },
    alternateRowStyles: {
      fillColor: '#f9fafb'
    },
    margin: { left: 20, right: 20 }
  })

  if (ventas.length > 50) {
    const finalY = (doc as any).lastAutoTable.finalY + 5
    doc.setFontSize(9)
    doc.setTextColor(COLORS.textLight)
    doc.text(`Mostrando primeras 50 de ${ventas.length} ventas`, 20, finalY)
  }

  addFooter(doc, 1)

  // Descargar
  doc.save(`reporte-ventas-${fechaInicio}-${fechaFin}.pdf`)
}

// ============================================
// REPORTE DE CUENTAS POR COBRAR - PDF
// ============================================

export function generarCuentasPorCobrarPDF(
  cuentas: CuentaPorCobrar[],
  resumen: CuentasPorCobrarResumen
) {
  const doc = new jsPDF()
  let yPos = addHeader(doc, 'Cuentas por Cobrar')

  // Fecha actual
  yPos += 5
  doc.setFontSize(11)
  doc.setTextColor(COLORS.text)
  doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy', { locale: es })}`, 20, yPos)
  yPos += 10

  // Resumen
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Resumen', 20, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setTextColor(COLORS.text)

  const metricas = [
    ['Total por Cobrar:', formatCurrency(resumen.totalPorCobrar)],
    ['Cantidad de Cuentas:', resumen.cantidadCuentas.toString()],
    ['0-30 días:', formatCurrency(resumen.rango_0_30)],
    ['31-60 días:', formatCurrency(resumen.rango_31_60)],
    ['Más de 60 días:', formatCurrency(resumen.rango_60_plus)]
  ]

  metricas.forEach(([label, value]) => {
    doc.text(label, 25, yPos)
    doc.text(value, 100, yPos)
    yPos += 6
  })

  yPos += 5

  // Alertas
  const cuentasVencidas = cuentas.filter(c => c.antiguedad === '60+')
  if (cuentasVencidas.length > 0) {
    doc.setFillColor(254, 226, 226) // red-100
    doc.rect(20, yPos, 170, 10, 'F')
    doc.setFontSize(10)
    doc.setTextColor(185, 28, 28) // red-700
    doc.text(`⚠️ Atención: ${cuentasVencidas.length} cuentas con más de 60 días vencidos`, 25, yPos + 6)
    yPos += 15
  }

  // Tabla de cuentas
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Detalle de Cuentas', 20, yPos)
  yPos += 5

  const tableData = cuentas.map(c => [
    c.order_date,
    c.customer_name,
    c.customer_type,
    formatCurrency(c.final_price),
    c.dias_vencidos.toString(),
    c.antiguedad
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Fecha Pedido', 'Cliente', 'Tipo', 'Monto', 'Días', 'Antigüedad']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primaryDark,
      textColor: '#ffffff',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.text
    },
    alternateRowStyles: {
      fillColor: '#f9fafb'
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data: any) => {
      // Resaltar cuentas muy vencidas
      if (data.section === 'body' && data.column.index === 5) {
        const antiguedad = data.cell.raw
        if (antiguedad === '60+') {
          data.cell.styles.textColor = [185, 28, 28] // red-700
          data.cell.styles.fontStyle = 'bold'
        } else if (antiguedad === '31-60') {
          data.cell.styles.textColor = [217, 119, 6] // amber-600
        }
      }
    }
  })

  addFooter(doc, 1)

  // Descargar
  doc.save(`cuentas-por-cobrar-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

// ============================================
// REPORTE DE CLIENTES - PDF
// ============================================

export function generarClientesPDF(
  clientes: ClienteAnalisis[],
  resumen: ClientesResumen,
  fechaInicio: string,
  fechaFin: string
) {
  const doc = new jsPDF()
  let yPos = addHeader(doc, 'Reporte de Clientes')

  // Período
  yPos += 5
  doc.setFontSize(11)
  doc.setTextColor(COLORS.text)
  doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 20, yPos)
  yPos += 10

  // Resumen
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Resumen General', 20, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setTextColor(COLORS.text)

  const metricas = [
    ['Total Clientes:', resumen.totalClientes.toString()],
    ['Clientes Activos:', resumen.clientesActivos.toString()],
    ['Clientes Inactivos:', resumen.clientesInactivos.toString()],
    ['Ticket Promedio:', formatCurrency(resumen.ticketPromedioGeneral)]
  ]

  metricas.forEach(([label, value]) => {
    doc.text(label, 25, yPos)
    doc.text(value, 100, yPos)
    yPos += 6
  })

  yPos += 10

  // Top 10 Clientes
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Top 10 Clientes', 20, yPos)
  yPos += 5

  const top10 = clientes.slice(0, 10)
  const tableData = top10.map((c, index) => [
    (index + 1).toString(),
    c.name,
    c.customer_type,
    c.total_pedidos.toString(),
    formatCurrency(c.total_compras),
    formatCurrency(c.ticket_promedio)
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Cliente', 'Tipo', 'Pedidos', 'Total Compras', 'Ticket Prom.']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primaryDark,
      textColor: '#ffffff',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.text
    },
    alternateRowStyles: {
      fillColor: '#f9fafb'
    },
    margin: { left: 20, right: 20 }
  })

  addFooter(doc, 1)

  // Descargar
  doc.save(`reporte-clientes-${fechaInicio}-${fechaFin}.pdf`)
}

// ============================================
// REPORTE DE ENTREGAS POR ZONA - PDF
// ============================================

export function generarEntregasPorZonaPDF(
  entregas: EntregaPorZona[],
  resumen: EntregasResumen,
  fechaInicio: string,
  fechaFin: string
) {
  const doc = new jsPDF()
  let yPos = addHeader(doc, 'Entregas por Zona')

  // Período
  yPos += 5
  doc.setFontSize(11)
  doc.setTextColor(COLORS.text)
  doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 20, yPos)
  yPos += 10

  // Resumen
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Resumen General', 20, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setTextColor(COLORS.text)

  const metricas = [
    ['Total Entregas:', resumen.totalEntregas.toString()],
    ['Total Botellones:', resumen.totalBotellones.toString()],
    ['Tiempo Promedio:', `${resumen.tiempoPromedioGeneral} min`],
    ['Zonas Atendidas:', resumen.zonasAtendidas.toString()]
  ]

  metricas.forEach(([label, value]) => {
    doc.text(label, 25, yPos)
    doc.text(value, 100, yPos)
    yPos += 6
  })

  yPos += 10

  // Tabla de zonas
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Detalle por Comuna', 20, yPos)
  yPos += 5

  const tableData = entregas.map(e => [
    e.commune,
    e.total_entregas.toString(),
    e.total_botellones.toString(),
    e.tiempo_promedio_minutos ? `${e.tiempo_promedio_minutos} min` : 'N/A',
    formatCurrency(e.total_ventas)
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Comuna', 'Entregas', 'Botellones', 'Tiempo Prom.', 'Ventas']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primaryDark,
      textColor: '#ffffff',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.text
    },
    alternateRowStyles: {
      fillColor: '#f9fafb'
    },
    margin: { left: 20, right: 20 }
  })

  addFooter(doc, 1)

  // Descargar
  doc.save(`entregas-por-zona-${fechaInicio}-${fechaFin}.pdf`)
}

// ============================================
// REPORTE DE PRODUCTOS - PDF
// ============================================

export function generarProductosPDF(
  productos: ProductoAnalisis[],
  resumen: ProductosResumen,
  fechaInicio: string,
  fechaFin: string
) {
  const doc = new jsPDF()
  let yPos = addHeader(doc, 'Reporte de Productos')

  // Período
  yPos += 5
  doc.setFontSize(11)
  doc.setTextColor(COLORS.text)
  doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 20, yPos)
  yPos += 10

  // Resumen
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Resumen General', 20, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setTextColor(COLORS.text)

  const metricas = [
    ['Total Productos Vendidos:', resumen.totalProductosVendidos.toString()],
    ['Total Botellones:', resumen.totalBotellones.toString()],
    ['Producto Más Vendido:', resumen.productoMasVendido],
    ['% Recarga:', `${resumen.porcentajeRecarga.toFixed(1)}%`],
    ['% Nuevo:', `${resumen.porcentajeNuevo.toFixed(1)}%`]
  ]

  metricas.forEach(([label, value]) => {
    doc.text(label, 25, yPos)
    doc.text(value, 100, yPos)
    yPos += 6
  })

  yPos += 10

  // Tabla de productos
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Detalle de Productos', 20, yPos)
  yPos += 5

  const tableData = productos.map(p => [
    p.product_name,
    p.total_vendidos.toString(),
    p.total_botellones.toString(),
    formatCurrency(p.total_ventas),
    `${p.porcentaje.toFixed(1)}%`
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Producto', 'Vendidos', 'Botellones', 'Ventas', '%']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primaryDark,
      textColor: '#ffffff',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.text
    },
    alternateRowStyles: {
      fillColor: '#f9fafb'
    },
    margin: { left: 20, right: 20 }
  })

  addFooter(doc, 1)

  // Descargar
  doc.save(`reporte-productos-${fechaInicio}-${fechaFin}.pdf`)
}

// ============================================
// REPORTE EJECUTIVO - PDF
// ============================================

export function generarReporteEjecutivoPDF(data: ReporteEjecutivoData) {
  const doc = new jsPDF()
  let yPos = addHeader(doc, 'Resumen Ejecutivo')

  // Período
  yPos += 5
  doc.setFontSize(11)
  doc.setTextColor(COLORS.text)
  doc.text(`Período: ${data.periodo.desde} al ${data.periodo.hasta}`, 20, yPos)
  yPos += 15

  // KPIs Principales
  doc.setFontSize(16)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Indicadores Clave', 20, yPos)
  yPos += 10

  doc.setFontSize(11)
  doc.setTextColor(COLORS.text)

  const kpis = [
    ['Ingresos Totales:', formatCurrency(data.resumen.ingresosTotales)],
    ['Comparativa Período Anterior:', `${data.resumen.ingresosComparativa >= 0 ? '+' : ''}${data.resumen.ingresosComparativa.toFixed(1)}%`],
    ['Pedidos Totales:', data.resumen.pedidosTotales.toString()],
    ['Clientes Activos:', data.resumen.clientesActivos.toString()],
    ['Botellones Entregados:', data.resumen.botellonesTotales.toString()]
  ]

  kpis.forEach(([label, value]) => {
    doc.text(label, 25, yPos)
    doc.text(value, 110, yPos)
    yPos += 7
  })

  yPos += 10

  // Ventas por Tipo de Cliente
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Ventas por Tipo de Cliente', 20, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.text(`Hogar: ${formatCurrency(data.ventasPorTipo.hogar)}`, 25, yPos)
  yPos += 6
  doc.text(`Empresa: ${formatCurrency(data.ventasPorTipo.empresa)}`, 25, yPos)
  yPos += 12

  // Cuentas por Cobrar
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Cuentas por Cobrar', 20, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setTextColor(COLORS.text)
  doc.text(`Total Pendiente: ${formatCurrency(data.cuentasPorCobrar.total)}`, 25, yPos)
  yPos += 6
  doc.text(`Cantidad de Cuentas: ${data.cuentasPorCobrar.cantidad}`, 25, yPos)
  yPos += 12

  // Top 5 Clientes
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Top 5 Clientes', 20, yPos)
  yPos += 5

  const clientesData = data.topClientes.map((c, i) => [
    (i + 1).toString(),
    c.name,
    c.total_pedidos.toString(),
    formatCurrency(c.total_compras)
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Cliente', 'Pedidos', 'Total']],
    body: clientesData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primaryDark,
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8
    },
    margin: { left: 20, right: 20 }
  })

  yPos = (doc as any).lastAutoTable.finalY + 10

  // Top 5 Productos
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primaryDark)
  doc.text('Top 5 Productos', 20, yPos)
  yPos += 5

  const productosData = data.topProductos.map((p, i) => [
    (i + 1).toString(),
    p.product_name,
    p.total_vendidos.toString(),
    formatCurrency(p.total_ventas)
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Producto', 'Vendidos', 'Total']],
    body: productosData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primaryDark,
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8
    },
    margin: { left: 20, right: 20 }
  })

  addFooter(doc, 1)

  // Descargar
  doc.save(`resumen-ejecutivo-${data.periodo.desde}-${data.periodo.hasta}.pdf`)
}

