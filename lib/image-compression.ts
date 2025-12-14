/**
 * Utilidades para Compresión de Imágenes
 * 
 * Comprime imágenes del lado del cliente antes de subirlas a Supabase Storage
 * para optimizar almacenamiento y velocidad de carga.
 */

import imageCompression from 'browser-image-compression'

/**
 * Opciones de compresión optimizadas para fotos de despacho
 * 
 * Configuración balanceada entre calidad y tamaño:
 * - Tamaño objetivo: ~500-800KB
 * - Resolución máxima: 1920x1920px (suficiente para documentos legibles)
 * - Calidad: 0.8 (80%) - excelente calidad visual
 */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.8,              // Máximo 800KB (vs 3MB actuales)
  maxWidthOrHeight: 1920,       // Máximo 1920px de ancho/alto
  useWebWorker: true,           // Usar Web Worker para no bloquear UI
  quality: 0.8,                 // 80% de calidad (muy buena)
  fileType: 'image/jpeg',       // Forzar JPEG (mejor compresión que PNG)
  initialQuality: 0.8,          // Calidad inicial
}

/**
 * Comprime una imagen antes de subirla
 * 
 * @param file - Archivo de imagen original
 * @returns Archivo comprimido listo para upload
 * 
 * @example
 * ```typescript
 * const file = event.target.files[0]
 * const compressed = await compressImage(file)
 * // compressed ahora pesa ~500-800KB en lugar de 3MB
 * ```
 */
export async function compressImage(file: File): Promise<File> {
  try {
    // Comprimir imagen
    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS)
    return compressedFile
  } catch (error) {
    console.error('❌ Error comprimiendo imagen:', error)
    // Si falla la compresión, devolver original
    return file
  }
}

/**
 * Valida que un archivo sea una imagen válida
 * 
 * @param file - Archivo a validar
 * @returns true si es una imagen válida
 */
export function isValidImage(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 10 * 1024 * 1024 // 10MB máximo antes de comprimir
  
  if (!validTypes.includes(file.type)) {
    console.error('❌ Tipo de archivo no válido:', file.type)
    return false
  }
  
  if (file.size > maxSize) {
    console.error('❌ Archivo demasiado grande:', `${(file.size / 1024 / 1024).toFixed(2)} MB`)
    return false
  }
  
  return true
}

/**
 * Formatea el tamaño de un archivo para mostrar
 * 
 * @param bytes - Tamaño en bytes
 * @returns String formateado (ej: "1.5 MB", "800 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

