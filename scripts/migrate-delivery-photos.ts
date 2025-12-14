#!/usr/bin/env tsx
/**
 * Script de Migración: Imágenes de Pedidos a Supabase Storage
 * 
 * Migra imágenes de entregas desde carpeta local Orders_Images/
 * al bucket público 'delivery-photos' de Supabase Storage
 * 
 * Uso:
 *   npx tsx scripts/migrate-delivery-photos.ts --dry-run   # Prueba sin cambios
 *   npx tsx scripts/migrate-delivery-photos.ts --execute   # Migración real
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// ==================== CONFIGURACIÓN ====================

const IMAGES_DIR = path.join(process.cwd(), 'public/images/Orders_Images')
const BUCKET_NAME = 'delivery-photos'
const LOGS_DIR = path.join(process.cwd(), 'logs')

// Obtener variables de entorno
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
// Usar SERVICE_ROLE_KEY para acceso completo (bypass RLS)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas')
  console.error('Asegúrate de que NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén configuradas')
  process.exit(1)
}

// Inicializar cliente Supabase con SERVICE_ROLE_KEY para bypass de RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ==================== TIPOS ====================

interface MigrationResult {
  filename: string
  order_id: string
  status: 'success' | 'skipped' | 'error' | 'orphan'
  storage_path?: string
  public_url?: string
  old_path: string
  error?: string
}

interface MigrationReport {
  timestamp: string
  mode: 'dry-run' | 'execute'
  total_images: number
  successful: number
  skipped: number
  failed: number
  orphan_photos: number
  details: MigrationResult[]
  errors: string[]
}

// ==================== UTILIDADES ====================

/**
 * Extrae el order_id del nombre de archivo
 * Formato: {order_id}.Delivery Photo.{timestamp}.jpg
 */
function extractOrderId(filename: string): string {
  const match = filename.match(/^([a-f0-9]{8})\./)
  return match ? match[1] : ''
}

/**
 * Crea el timestamp para el log
 */
function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
}

/**
 * Muestra barra de progreso en consola
 */
function showProgress(current: number, total: number, result: MigrationResult) {
  const percent = Math.round((current / total) * 100)
  const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2))
  const status = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : result.status === 'orphan' ? '⚠️' : '⏭️'
  
  process.stdout.write(`\r[${bar}] ${percent}% | ${current}/${total} | ${status} ${result.filename}`)
  
  if (current === total) {
    process.stdout.write('\n')
  }
}

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * Valida que el pedido exista en la base de datos
 */
async function validateOrderExists(orderId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('3t_orders')
    .select('order_id')
    .eq('order_id', orderId)
    .single()
  
  return !!data && !error
}

/**
 * Sube una imagen a Supabase Storage
 */
async function uploadImageToStorage(
  filePath: string,
  filename: string,
  orderId: string,
  dryRun: boolean
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  try {
    if (dryRun) {
      // En dry-run, solo simular
      const timestamp = Date.now()
      const storagePath = `${orderId}-${timestamp}.jpg`
      return { success: true, storagePath }
    }

    // Leer el archivo
    const fileBuffer = await fs.readFile(filePath)
    
    // Generar nombre único para Storage
    const timestamp = Date.now()
    const storagePath = `${orderId}-${timestamp}.jpg`
    
    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, storagePath: data.path }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Actualiza el campo delivery_photo_path en la base de datos
 */
async function updateOrderPhotoPath(
  orderId: string,
  storagePath: string,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (dryRun) {
      // En dry-run, solo simular
      return { success: true }
    }

    const { error } = await supabase
      .from('3t_orders')
      .update({ delivery_photo_path: storagePath })
      .eq('order_id', orderId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene la URL pública de una imagen en Storage
 */
function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath)
  
  return data.publicUrl
}

/**
 * Función principal de migración
 */
async function migratePhotos(dryRun: boolean): Promise<MigrationReport> {
  console.log('\n' + '='.repeat(60))
  console.log(`🚀 Iniciando Migración de Fotos de Pedidos`)
  console.log(`   Modo: ${dryRun ? '🔍 DRY-RUN (sin cambios)' : '⚡ EJECUCIÓN REAL'}`)
  console.log('='.repeat(60) + '\n')

  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'execute',
    total_images: 0,
    successful: 0,
    skipped: 0,
    failed: 0,
    orphan_photos: 0,
    details: [],
    errors: []
  }

  // Verificar que el directorio existe
  if (!existsSync(IMAGES_DIR)) {
    const error = `Directorio no encontrado: ${IMAGES_DIR}`
    console.error(`❌ ${error}`)
    report.errors.push(error)
    return report
  }

  // Leer todas las imágenes
  console.log(`📂 Leyendo imágenes de: ${IMAGES_DIR}`)
  const files = await fs.readdir(IMAGES_DIR)
  const imageFiles = files.filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'))
  
  report.total_images = imageFiles.length
  console.log(`📸 Total de imágenes encontradas: ${imageFiles.length}\n`)

  if (imageFiles.length === 0) {
    console.log('⚠️ No se encontraron imágenes para migrar')
    return report
  }

  // Procesar cada imagen
  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i]
    const filePath = path.join(IMAGES_DIR, filename)
    const orderId = extractOrderId(filename)
    
    const result: MigrationResult = {
      filename,
      order_id: orderId,
      status: 'error',
      old_path: `Orders_Images/${filename}`
    }

    try {
      // Validar que se pudo extraer el order_id
      if (!orderId) {
        result.status = 'skipped'
        result.error = 'No se pudo extraer order_id del nombre de archivo'
        report.skipped++
        report.details.push(result)
        showProgress(i + 1, imageFiles.length, result)
        continue
      }

      // Validar que el pedido existe en BD
      const orderExists = await validateOrderExists(orderId)
      
      if (!orderExists) {
        result.status = 'orphan'
        result.error = 'Pedido no encontrado en base de datos'
        report.orphan_photos++
        report.details.push(result)
        showProgress(i + 1, imageFiles.length, result)
        
        // Subir a carpeta orphan_photos si no está en dry-run
        if (!dryRun) {
          const orphanPath = `orphan_photos/${filename}`
          const fileBuffer = await fs.readFile(filePath)
          await supabase.storage
            .from(BUCKET_NAME)
            .upload(orphanPath, fileBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false
            })
          result.storage_path = orphanPath
        }
        continue
      }

      // Subir imagen a Storage
      const uploadResult = await uploadImageToStorage(filePath, filename, orderId, dryRun)
      
      if (!uploadResult.success) {
        result.status = 'error'
        result.error = uploadResult.error
        report.failed++
        report.errors.push(`${filename}: ${uploadResult.error}`)
        report.details.push(result)
        showProgress(i + 1, imageFiles.length, result)
        continue
      }

      result.storage_path = uploadResult.storagePath!

      // Actualizar BD
      const updateResult = await updateOrderPhotoPath(orderId, uploadResult.storagePath!, dryRun)
      
      if (!updateResult.success) {
        result.status = 'error'
        result.error = `Upload OK pero error en BD: ${updateResult.error}`
        report.failed++
        report.errors.push(`${filename}: ${updateResult.error}`)
        report.details.push(result)
        showProgress(i + 1, imageFiles.length, result)
        continue
      }

      // Éxito
      result.status = 'success'
      result.public_url = getPublicUrl(uploadResult.storagePath!)
      report.successful++
      report.details.push(result)
      
    } catch (error: any) {
      result.status = 'error'
      result.error = error.message
      report.failed++
      report.errors.push(`${filename}: ${error.message}`)
      report.details.push(result)
    }

    showProgress(i + 1, imageFiles.length, result)
  }

  return report
}

/**
 * Guarda el reporte de migración
 */
async function saveReport(report: MigrationReport): Promise<void> {
  // Crear directorio de logs si no existe
  if (!existsSync(LOGS_DIR)) {
    await fs.mkdir(LOGS_DIR, { recursive: true })
  }

  const timestamp = getTimestamp()
  const reportPath = path.join(LOGS_DIR, `migration-report-${report.mode}-${timestamp}.json`)
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Reporte guardado en: ${reportPath}`)
}

/**
 * Muestra resumen de la migración
 */
function showSummary(report: MigrationReport): void {
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN DE MIGRACIÓN')
  console.log('='.repeat(60))
  console.log(`Total de imágenes:      ${report.total_images}`)
  console.log(`✅ Exitosas:            ${report.successful}`)
  console.log(`⚠️  Huérfanas:          ${report.orphan_photos}`)
  console.log(`⏭️  Saltadas:           ${report.skipped}`)
  console.log(`❌ Fallidas:            ${report.failed}`)
  console.log('='.repeat(60))

  if (report.errors.length > 0) {
    console.log('\n❌ ERRORES:')
    report.errors.forEach(error => console.log(`  - ${error}`))
  }

  if (report.orphan_photos > 0) {
    console.log('\n⚠️  IMÁGENES HUÉRFANAS (sin pedido asociado):')
    report.details
      .filter(d => d.status === 'orphan')
      .forEach(d => console.log(`  - ${d.filename} (order_id: ${d.order_id})`))
  }

  console.log()
}

// ==================== MAIN ====================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const execute = args.includes('--execute')

  if (!dryRun && !execute) {
    console.log('❌ Debes especificar --dry-run o --execute')
    console.log('\nUso:')
    console.log('  npx tsx scripts/migrate-delivery-photos.ts --dry-run   # Prueba sin cambios')
    console.log('  npx tsx scripts/migrate-delivery-photos.ts --execute   # Migración real')
    process.exit(1)
  }

  try {
    const report = await migratePhotos(dryRun)
    showSummary(report)
    await saveReport(report)

    if (dryRun) {
      console.log('💡 Esto fue una prueba. Para ejecutar la migración real, usa:')
      console.log('   npx tsx scripts/migrate-delivery-photos.ts --execute\n')
    } else {
      console.log('✅ Migración completada!\n')
    }

    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Error fatal:', error.message)
    process.exit(1)
  }
}

// Ejecutar
main()

