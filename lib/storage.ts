import { supabase } from './supabase'

/**
 * Sube un archivo PDF de presupuesto a Supabase Storage
 * @param pdfBlob - Blob del PDF generado
 * @param quoteNumber - Número del presupuesto (ej: "PRE-2025-001")
 * @returns URL pública del PDF o null si hay error
 */
export async function uploadQuotePDF(
  pdfBlob: Blob,
  quoteNumber: string
): Promise<string | null> {
  try {
    const year = new Date().getFullYear()
    const filePath = `presupuestos/${year}/${quoteNumber}.pdf`

    console.log('📤 Subiendo PDF a Supabase Storage:', filePath)

    // Subir archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('presupuestos_pdf')
      .upload(filePath, pdfBlob, {
        cacheControl: '0', // No cachear para evitar mostrar PDFs antiguos
        upsert: true, // Permitir sobrescribir si ya existe
        contentType: 'application/pdf',
      })

    if (uploadError) {
      console.error('❌ Error al subir PDF:', uploadError)
      throw uploadError
    }

    console.log('✅ PDF subido exitosamente:', uploadData)

    // Obtener URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('presupuestos_pdf')
      .getPublicUrl(filePath)

    // Agregar timestamp para evitar caché del navegador
    const timestamp = Date.now()
    const publicUrl = `${urlData.publicUrl}?t=${timestamp}`

    console.log('📎 URL pública generada:', publicUrl)
    return publicUrl
  } catch (error) {
    console.error('❌ Error en uploadQuotePDF:', error)
    return null
  }
}

/**
 * Elimina un archivo PDF de presupuesto de Supabase Storage
 * @param pdfUrl - URL completa del PDF o ruta relativa
 * @returns true si se eliminó correctamente, false si hubo error
 */
export async function deleteQuotePDF(pdfUrl: string): Promise<boolean> {
  try {
    if (!pdfUrl) return false

    // Extraer la ruta del archivo desde la URL
    const urlParts = pdfUrl.split('/presupuestos_pdf/')
    if (urlParts.length < 2) {
      console.error('❌ URL inválida para eliminar:', pdfUrl)
      return false
    }

    const filePath = urlParts[1]

    console.log('🗑️ Eliminando PDF de Storage:', filePath)

    const { error } = await supabase.storage
      .from('presupuestos_pdf')
      .remove([filePath])

    if (error) {
      console.error('❌ Error al eliminar PDF:', error)
      return false
    }

    console.log('✅ PDF eliminado exitosamente')
    return true
  } catch (error) {
    console.error('❌ Error en deleteQuotePDF:', error)
    return false
  }
}

/**
 * Descarga un PDF desde una URL
 * @param url - URL del PDF
 * @param filename - Nombre del archivo para la descarga
 */
export function downloadPDF(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}


