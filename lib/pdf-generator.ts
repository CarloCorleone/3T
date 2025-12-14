import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Quote, QuoteItem, IVA_RATE } from './supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Datos de la empresa
const COMPANY_INFO = {
  name: 'Agua Purificada Tres Torres Limitada',
  rut: '76.950.304-8',
  giro: 'Venta de Agua Purificada',
  address: 'Cam. San Alberto Hurtado 13460, Maipú',
  phone: '+56 9 9678 1204',
  email: 'ventas@aguatrestorres.cl',
  logo: '/images/logos/logo-cuadrado-250x250.png',
}

// Colores corporativos modernos (azul agua)
const COLORS = {
  primary: '#0891b2', // Azul turquesa moderno
  primaryDark: '#0e7490', // Azul turquesa oscuro
  accent: '#06b6d4', // Cyan brillante
  text: '#0f172a', // Slate oscuro
  textLight: '#64748b', // Slate medio
  border: '#e2e8f0', // Slate muy claro
  background: '#f8fafc', // Casi blanco
  white: '#ffffff',
  gray: '#94a3b8', // Slate gray
}

/**
 * Formatea un número como moneda chilena (CLP)
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formatea una fecha en formato chileno
 */
function formatDate(dateString: string): string {
  return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", {
    locale: es,
  })
}

/**
 * Carga una imagen y la convierte a Base64
 */
async function loadImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error cargando imagen:', error)
    return ''
  }
}

/**
 * Genera un PDF profesional para un presupuesto
 * @param quote - Datos del presupuesto
 * @param items - Items del presupuesto
 * @returns Blob del PDF generado
 */
export async function generateQuotePDF(
  quote: Quote,
  items: QuoteItem[]
): Promise<Blob> {
  // Crear documento PDF en formato carta
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  let yPosition = margin

  // ============================================
  // BARRA SUPERIOR CON COLOR CORPORATIVO
  // ============================================
  doc.setFillColor(COLORS.primary)
  doc.rect(0, 0, pageWidth, 8, 'F')

  yPosition = 20

  // ============================================
  // CABECERA CON LOGO Y DATOS DE LA EMPRESA
  // ============================================

  // Cargar y agregar logo con mejor calidad
  try {
    const logoBase64 = await loadImageAsBase64(COMPANY_INFO.logo)
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, yPosition, 40, 40)
    }
  } catch (error) {
    console.warn('No se pudo cargar el logo:', error)
  }

  // Datos de la empresa (a la derecha del logo) - Diseño moderno
  const rightColumnX = pageWidth - margin
  
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primary)
  doc.text(COMPANY_INFO.name, rightColumnX, yPosition + 2, {
    align: 'right',
  })

  yPosition += 8
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textLight)
  doc.text(`RUT: ${COMPANY_INFO.rut}`, rightColumnX, yPosition, {
    align: 'right',
  })

  yPosition += 4
  doc.text(`Giro: ${COMPANY_INFO.giro}`, rightColumnX, yPosition, {
    align: 'right',
  })

  yPosition += 4
  doc.text(COMPANY_INFO.address, rightColumnX, yPosition, {
    align: 'right',
  })

  yPosition += 4
  doc.text(`Tel: ${COMPANY_INFO.phone}`, rightColumnX, yPosition, {
    align: 'right',
  })

  yPosition += 4
  doc.setTextColor(COLORS.accent)
  doc.text(COMPANY_INFO.email, rightColumnX, yPosition, {
    align: 'right',
  })

  yPosition += 18

  // ============================================
  // TÍTULO DEL DOCUMENTO - DISEÑO MODERNO
  // ============================================

  // Línea decorativa
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(0.5)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  
  yPosition += 10

  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primary)
  doc.text('PRESUPUESTO', pageWidth / 2, yPosition, { align: 'center' })

  yPosition += 10

  // Caja con información del presupuesto
  const infoBoxY = yPosition
  const infoBoxHeight = 20
  
  // Fondo sutil para la información
  doc.setFillColor(COLORS.background)
  doc.roundedRect(margin, infoBoxY, pageWidth - margin * 2, infoBoxHeight, 2, 2, 'F')
  
  // Número de presupuesto
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.text)
  doc.text(
    `Presupuesto N°: ${quote.quote_number}`,
    pageWidth / 2,
    infoBoxY + 6,
    { align: 'center' }
  )

  // Fecha de emisión
  const createdDate = quote.created_at
    ? formatDate(quote.created_at)
    : formatDate(new Date().toISOString())
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textLight)
  doc.text(
    `Fecha de emisión: ${createdDate}`,
    pageWidth / 2,
    infoBoxY + 11,
    { align: 'center' }
  )

  // Validez destacada
  const validUntilDate = formatDate(quote.valid_until)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.accent)
  doc.text(
    `Válido hasta: ${validUntilDate}`,
    pageWidth / 2,
    infoBoxY + 16,
    { align: 'center' }
  )

  yPosition = infoBoxY + infoBoxHeight + 10

  // ============================================
  // DATOS DEL CLIENTE - DISEÑO MODERNO
  // ============================================

  // Título con barra lateral de color
  doc.setFillColor(COLORS.primary)
  doc.rect(margin, yPosition, 3, 8, 'F')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primary)
  doc.text('DATOS DEL CLIENTE', margin + 6, yPosition + 6)

  yPosition += 12

  // Fondo moderno para datos del cliente
  const clientBoxHeight = 22
  doc.setFillColor(COLORS.white)
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, yPosition, pageWidth - margin * 2, clientBoxHeight, 3, 3, 'FD')

  yPosition += 6

  // Información del cliente con mejor formato
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.text)
  doc.text(`Cliente: `, margin + 5, yPosition)
  
  doc.setFont('helvetica', 'normal')
  doc.text(quote.customer_name, margin + 22, yPosition)

  if (quote.customer_rut) {
    doc.setFont('helvetica', 'bold')
    doc.text(`RUT: `, margin + 100, yPosition)
    doc.setFont('helvetica', 'normal')
    doc.text(quote.customer_rut, margin + 112, yPosition)
  }

  yPosition += 5

  if (quote.customer_email || quote.customer_phone) {
    doc.setFontSize(9)
    doc.setTextColor(COLORS.textLight)
    const contact = []
    if (quote.customer_email) contact.push(quote.customer_email)
    if (quote.customer_phone) contact.push(`Tel: ${quote.customer_phone}`)
    doc.text(contact.join(' | '), margin + 5, yPosition)
    yPosition += 5
  }

  if (quote.customer_address) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(COLORS.textLight)
    doc.text(quote.customer_address, margin + 5, yPosition)
  }

  yPosition += 12

  // ============================================
  // TABLA DE PRODUCTOS
  // ============================================

  // Preparar datos para la tabla
  const tableData = items.map((item) => [
    item.product_name,
    item.product_description || '-',
    item.quantity.toString(),
    formatCurrency(item.unit_price),
    formatCurrency(item.subtotal),
  ])

  autoTable(doc, {
    startY: yPosition,
    head: [['Producto', 'Descripción', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [8, 145, 178], // COLORS.primary en RGB
      textColor: '#ffffff',
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
      minCellHeight: 12,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // COLORS.background en RGB
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' }, // Producto
      1: { cellWidth: 60, textColor: COLORS.textLight }, // Descripción
      2: { cellWidth: 14, halign: 'center' }, // Cantidad
      3: { cellWidth: 32, halign: 'right' }, // Precio Unit.
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }, // Subtotal
    },
    margin: { left: margin, right: margin },
    styles: {
      lineColor: [226, 232, 240], // COLORS.border en RGB
      lineWidth: 0.5,
    },
  })

  // Obtener posición después de la tabla
  yPosition = (doc as any).lastAutoTable.finalY + 10

  // ============================================
  // TOTALES - DISEÑO MODERNO
  // ============================================

  const totalsBoxWidth = 70
  const xTotalsBox = pageWidth - margin - totalsBoxWidth
  const lineHeight = 7

  // Caja para totales con sombra sutil
  doc.setFillColor(COLORS.background)
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(0.5)
  doc.roundedRect(xTotalsBox, yPosition - 4, totalsBoxWidth, 28, 2, 2, 'FD')

  const xLabel = xTotalsBox + 8
  const xValue = pageWidth - margin - 8

  yPosition += 2 // Padding superior

  // Subtotal
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textLight)
  doc.text('Subtotal:', xLabel, yPosition)
  doc.setTextColor(COLORS.text)
  doc.text(formatCurrency(quote.subtotal), xValue, yPosition, {
    align: 'right',
  })

  yPosition += lineHeight

  // IVA
  doc.setTextColor(COLORS.textLight)
  doc.text(`IVA (19%):`, xLabel, yPosition)
  doc.setTextColor(COLORS.text)
  doc.text(formatCurrency(quote.iva_amount), xValue, yPosition, {
    align: 'right',
  })

  yPosition += lineHeight + 1

  // Línea separadora
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(0.5)
  doc.line(xLabel, yPosition, xValue, yPosition)

  yPosition += 4

  // Total destacado
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(COLORS.primary)
  doc.text('TOTAL:', xLabel, yPosition)
  doc.text(formatCurrency(quote.total), xValue, yPosition, {
    align: 'right',
  })

  yPosition += 14

  // ============================================
  // CONDICIONES DE PAGO - DISEÑO MODERNO
  // ============================================

  // Título con icono
  doc.setFillColor(COLORS.primary)
  doc.rect(margin, yPosition, 3, 6, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primary)
  doc.text('CONDICIONES DE PAGO', margin + 6, yPosition + 4)

  yPosition += 10

  // Caja con las condiciones
  doc.setFillColor(COLORS.white)
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, yPosition, pageWidth - margin * 2, 10, 2, 2, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(COLORS.text)
  doc.text(quote.payment_conditions, margin + 5, yPosition + 6)

  yPosition += 14

  // ============================================
  // OBSERVACIONES - DISEÑO MODERNO
  // ============================================

  if (quote.observations) {
    // Título con icono
    doc.setFillColor(COLORS.primary)
    doc.rect(margin, yPosition, 3, 6, 'F')
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(COLORS.primary)
    doc.text('OBSERVACIONES', margin + 6, yPosition + 4)

    yPosition += 10

    // Dividir texto en líneas si es muy largo
    const observationsLines = doc.splitTextToSize(
      quote.observations,
      pageWidth - margin * 2 - 10
    )
    
    const obsHeight = Math.max(12, observationsLines.length * 4 + 6)

    // Caja con las observaciones
    doc.setFillColor(COLORS.white)
    doc.setDrawColor(COLORS.border)
    doc.setLineWidth(0.5)
    doc.roundedRect(margin, yPosition, pageWidth - margin * 2, obsHeight, 2, 2, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(COLORS.textLight)
    doc.text(observationsLines, margin + 5, yPosition + 5)

    yPosition += obsHeight + 5
  }

  // ============================================
  // PIE DE PÁGINA - DISEÑO MODERNO
  // ============================================

  const footerY = pageHeight - 25

  // Barra superior del footer
  doc.setDrawColor(COLORS.primary)
  doc.setLineWidth(1)
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3)

  // Texto del footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textLight)
  doc.text(
    'Gracias por su preferencia. Este presupuesto no constituye una factura.',
    pageWidth / 2,
    footerY + 2,
    { align: 'center' }
  )

  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.text(
    `Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
    pageWidth / 2,
    footerY + 7,
    { align: 'center' }
  )

  // Barra inferior de color
  doc.setFillColor(COLORS.primary)
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F')

  // Convertir a Blob
  const pdfBlob = doc.output('blob')
  return pdfBlob
}

/**
 * Descarga directamente un PDF sin subirlo a Storage
 * @param quote - Datos del presupuesto
 * @param items - Items del presupuesto
 */
export async function downloadQuotePDF(
  quote: Quote,
  items: QuoteItem[]
): Promise<void> {
  const pdfBlob = await generateQuotePDF(quote, items)
  const url = URL.createObjectURL(pdfBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Presupuesto-${quote.quote_number}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

