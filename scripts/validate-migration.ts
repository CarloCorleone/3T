#!/usr/bin/env tsx
/**
 * Script de Validación Post-Migración
 * 
 * Valida que todas las imágenes migradas:
 * - Existan en Supabase Storage
 * - Sean accesibles públicamente
 * - Tengan referencias correctas en la BD
 * 
 * Uso:
 *   npx tsx scripts/validate-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'

// ==================== CONFIGURACIÓN ====================

const BUCKET_NAME = 'delivery-photos'
const LOGS_DIR = path.join(process.cwd(), 'logs')

// Obtener variables de entorno
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
// Usar SERVICE_ROLE_KEY para acceso completo (bypass RLS)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ==================== TIPOS ====================

interface ValidationResult {
  order_id: string
  delivery_photo_path: string
  exists_in_storage: boolean
  is_accessible: boolean
  public_url?: string
  status: 'ok' | 'error' | 'warning'
  error?: string
}

interface ValidationReport {
  timestamp: string
  total_orders: number
  validated: number
  ok: number
  errors: number
  warnings: number
  results: ValidationResult[]
}

// ==================== FUNCIONES ====================

/**
 * Obtiene todos los pedidos con fotos
 */
async function getOrdersWithPhotos(): Promise<any[]> {
  const { data, error } = await supabase
    .from('3t_orders')
    .select('order_id, delivery_photo_path')
    .not('delivery_photo_path', 'is', null)
    .order('order_id')
  
  if (error) {
    throw new Error(`Error obteniendo pedidos: ${error.message}`)
  }
  
  return data || []
}

/**
 * Valida que una imagen existe en Storage
 */
async function validateImageExists(path: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 1,
        search: path
      })
    
    return !error && data && data.length > 0
  } catch (error) {
    return false
  }
}

/**
 * Valida que una imagen es accesible públicamente
 */
async function validateImageAccessible(path: string): Promise<{ accessible: boolean; url?: string }> {
  try {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)
    
    if (!data?.publicUrl) {
      return { accessible: false }
    }
    
    // Intentar hacer fetch de la imagen
    const response = await fetch(data.publicUrl, { method: 'HEAD' })
    
    return {
      accessible: response.ok,
      url: data.publicUrl
    }
  } catch (error) {
    return { accessible: false }
  }
}

/**
 * Valida un pedido
 */
async function validateOrder(order: any): Promise<ValidationResult> {
  const result: ValidationResult = {
    order_id: order.order_id,
    delivery_photo_path: order.delivery_photo_path,
    exists_in_storage: false,
    is_accessible: false,
    status: 'error'
  }

  try {
    // Validar formato antiguo (debería estar migrado)
    if (order.delivery_photo_path.startsWith('Orders_Images/')) {
      result.status = 'warning'
      result.error = 'Aún usa formato antiguo - NO MIGRADO'
      return result
    }

    // Validar existencia en Storage
    result.exists_in_storage = await validateImageExists(order.delivery_photo_path)
    
    if (!result.exists_in_storage) {
      result.error = 'Imagen no encontrada en Storage'
      return result
    }

    // Validar accesibilidad pública
    const accessResult = await validateImageAccessible(order.delivery_photo_path)
    result.is_accessible = accessResult.accessible
    result.public_url = accessResult.url

    if (!result.is_accessible) {
      result.error = 'Imagen no es accesible públicamente'
      return result
    }

    // Todo OK
    result.status = 'ok'
    return result

  } catch (error: any) {
    result.error = error.message
    return result
  }
}

/**
 * Función principal de validación
 */
async function validateMigration(): Promise<ValidationReport> {
  console.log('\n' + '='.repeat(60))
  console.log('🔍 Validando Migración de Fotos')
  console.log('='.repeat(60) + '\n')

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    total_orders: 0,
    validated: 0,
    ok: 0,
    errors: 0,
    warnings: 0,
    results: []
  }

  // Obtener todos los pedidos con fotos
  console.log('📂 Obteniendo pedidos con fotos...')
  const orders = await getOrdersWithPhotos()
  report.total_orders = orders.length
  console.log(`📸 Total de pedidos con fotos: ${orders.length}\n`)

  if (orders.length === 0) {
    console.log('⚠️ No se encontraron pedidos con fotos')
    return report
  }

  // Validar cada pedido
  console.log('🔍 Validando imágenes...\n')
  
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]
    const result = await validateOrder(order)
    report.results.push(result)
    report.validated++

    // Actualizar contadores
    if (result.status === 'ok') {
      report.ok++
      process.stdout.write(`\r[${i + 1}/${orders.length}] ✅ ${result.order_id}`)
    } else if (result.status === 'warning') {
      report.warnings++
      process.stdout.write(`\r[${i + 1}/${orders.length}] ⚠️  ${result.order_id} - ${result.error}`)
      console.log() // Nueva línea
    } else {
      report.errors++
      process.stdout.write(`\r[${i + 1}/${orders.length}] ❌ ${result.order_id} - ${result.error}`)
      console.log() // Nueva línea
    }
  }

  console.log('\n')
  return report
}

/**
 * Guarda el reporte de validación
 */
async function saveReport(report: ValidationReport): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const reportPath = path.join(LOGS_DIR, `validation-report-${timestamp}.json`)
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  return reportPath
}

/**
 * Muestra resumen de validación
 */
function showSummary(report: ValidationReport): void {
  console.log('='.repeat(60))
  console.log('📊 RESUMEN DE VALIDACIÓN')
  console.log('='.repeat(60))
  console.log(`Total de pedidos con fotos:  ${report.total_orders}`)
  console.log(`✅ Válidos:                  ${report.ok}`)
  console.log(`⚠️  Advertencias:            ${report.warnings}`)
  console.log(`❌ Errores:                  ${report.errors}`)
  console.log('='.repeat(60))

  // Mostrar pedidos no migrados
  const notMigrated = report.results.filter(r => r.status === 'warning')
  if (notMigrated.length > 0) {
    console.log('\n⚠️  PEDIDOS NO MIGRADOS (formato antiguo):')
    notMigrated.forEach(r => {
      console.log(`  - ${r.order_id}: ${r.delivery_photo_path}`)
    })
  }

  // Mostrar errores
  const errors = report.results.filter(r => r.status === 'error')
  if (errors.length > 0) {
    console.log('\n❌ ERRORES:')
    errors.forEach(r => {
      console.log(`  - ${r.order_id}: ${r.error}`)
    })
  }

  // Resumen final
  console.log()
  if (report.ok === report.total_orders) {
    console.log('🎉 ¡Todas las imágenes están correctamente migradas!')
  } else if (report.warnings > 0) {
    console.log(`⚠️  Hay ${report.warnings} pedido(s) que necesitan ser migrados`)
  } else if (report.errors > 0) {
    console.log(`❌ Hay ${report.errors} error(es) que necesitan ser corregidos`)
  }
  console.log()
}

// ==================== MAIN ====================

async function main() {
  try {
    const report = await validateMigration()
    const reportPath = await saveReport(report)
    showSummary(report)
    
    console.log(`📄 Reporte guardado en: ${reportPath}\n`)
    
    // Exit code según resultado
    if (report.errors > 0) {
      process.exit(1)
    } else if (report.warnings > 0) {
      process.exit(2)
    } else {
      process.exit(0)
    }
  } catch (error: any) {
    console.error('\n❌ Error fatal:', error.message)
    process.exit(1)
  }
}

main()

