/**
 * Script de Validación de Migración de Facturas
 * 
 * Verifica la integridad de la migración de datos desde 3t_orders
 * a las nuevas tablas 3t_invoices y 3t_order_invoices.
 * 
 * Uso:
 *   npx tsx scripts/validate-invoice-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { format } from 'date-fns'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY requeridas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface ValidationResult {
  check: string
  status: 'OK' | 'WARNING' | 'ERROR'
  message: string
  details?: any
}

const results: ValidationResult[] = []

async function validateMigration() {
  console.log('🔍 Iniciando validación de migración de facturas...\n')

  // 1. Verificar que existen las tablas
  console.log('📋 Verificando existencia de tablas...')
  try {
    const { data: invoices, error: errInvoices } = await supabase
      .from('3t_invoices')
      .select('invoice_id')
      .limit(1)
    
    const { data: orderInvoices, error: errOrderInvoices } = await supabase
      .from('3t_order_invoices')
      .select('id')
      .limit(1)

    if (errInvoices || errOrderInvoices) {
      results.push({
        check: 'Existencia de tablas',
        status: 'ERROR',
        message: 'Las tablas nuevas no existen o no son accesibles',
        details: { errInvoices, errOrderInvoices }
      })
      console.log('❌ ERROR: Tablas no encontradas\n')
      return
    }

    results.push({
      check: 'Existencia de tablas',
      status: 'OK',
      message: 'Tablas 3t_invoices y 3t_order_invoices existen'
    })
    console.log('✅ Tablas encontradas\n')
  } catch (error) {
    results.push({
      check: 'Existencia de tablas',
      status: 'ERROR',
      message: 'Error al verificar tablas',
      details: error
    })
    console.log('❌ ERROR en verificación de tablas\n')
    return
  }

  // 2. Contar registros migrados
  console.log('📊 Contando registros...')
  const { data: ordersWithInvoice } = await supabase
    .from('3t_orders')
    .select('order_id, invoice_number, invoice_date, final_price', { count: 'exact' })
    .not('invoice_number', 'is', null)
    .neq('invoice_number', '')

  const { data: invoicesCreated, count: invoicesCount } = await supabase
    .from('3t_invoices')
    .select('*', { count: 'exact' })

  const { data: orderInvoicesCreated, count: orderInvoicesCount } = await supabase
    .from('3t_order_invoices')
    .select('*', { count: 'exact' })

  const ordersWithInvoiceCount = ordersWithInvoice?.length || 0
  const uniqueInvoiceNumbers = new Set(ordersWithInvoice?.map(o => o.invoice_number)).size

  console.log(`  - Pedidos con factura en 3t_orders: ${ordersWithInvoiceCount}`)
  console.log(`  - Números de factura únicos: ${uniqueInvoiceNumbers}`)
  console.log(`  - Facturas en 3t_invoices: ${invoicesCount || 0}`)
  console.log(`  - Relaciones en 3t_order_invoices: ${orderInvoicesCount || 0}\n`)

  // 3. Verificar que todas las facturas únicas fueron migradas
  if (uniqueInvoiceNumbers === (invoicesCount || 0)) {
    results.push({
      check: 'Facturas únicas migradas',
      status: 'OK',
      message: `Todas las ${uniqueInvoiceNumbers} facturas únicas fueron migradas`
    })
    console.log('✅ Todas las facturas únicas fueron migradas\n')
  } else {
    results.push({
      check: 'Facturas únicas migradas',
      status: 'WARNING',
      message: `Diferencia detectada: ${uniqueInvoiceNumbers} únicos vs ${invoicesCount} migrados`,
      details: { uniqueInvoiceNumbers, invoicesCount }
    })
    console.log('⚠️  WARNING: Diferencia en cantidad de facturas\n')
  }

  // 4. Verificar que todas las relaciones fueron creadas
  if (ordersWithInvoiceCount === (orderInvoicesCount || 0)) {
    results.push({
      check: 'Relaciones pedido-factura',
      status: 'OK',
      message: `Todas las ${ordersWithInvoiceCount} relaciones fueron creadas`
    })
    console.log('✅ Todas las relaciones pedido-factura fueron creadas\n')
  } else {
    results.push({
      check: 'Relaciones pedido-factura',
      status: 'ERROR',
      message: `Diferencia: ${ordersWithInvoiceCount} pedidos con factura vs ${orderInvoicesCount} relaciones`,
      details: { ordersWithInvoiceCount, orderInvoicesCount }
    })
    console.log('❌ ERROR: Faltan relaciones pedido-factura\n')
  }

  // 5. Verificar integridad de montos
  console.log('💰 Verificando integridad de montos...')
  const inconsistencias: any[] = []

  if (invoicesCreated && orderInvoicesCreated) {
    for (const invoice of invoicesCreated) {
      // Sumar montos de los pedidos asociados a esta factura
      const relaciones = orderInvoicesCreated.filter(oi => oi.invoice_id === invoice.invoice_id)
      const sumaPedidos = relaciones.reduce((sum, oi) => sum + (oi.amount_invoiced || 0), 0)
      const totalFactura = invoice.total_amount

      // Permitir diferencia de 1 peso por redondeo
      if (Math.abs(sumaPedidos - totalFactura) > 1) {
        inconsistencias.push({
          invoice_number: invoice.invoice_number,
          total_factura: totalFactura,
          suma_pedidos: sumaPedidos,
          diferencia: totalFactura - sumaPedidos
        })
      }
    }
  }

  if (inconsistencias.length === 0) {
    results.push({
      check: 'Integridad de montos',
      status: 'OK',
      message: 'Todos los montos coinciden entre facturas y pedidos'
    })
    console.log('✅ Integridad de montos verificada\n')
  } else {
    results.push({
      check: 'Integridad de montos',
      status: 'WARNING',
      message: `${inconsistencias.length} facturas con diferencias de monto`,
      details: inconsistencias
    })
    console.log(`⚠️  WARNING: ${inconsistencias.length} inconsistencias de monto encontradas\n`)
  }

  // 6. Verificar números de factura duplicados
  console.log('🔢 Verificando duplicados...')
  const { data: duplicates } = await supabase
    .from('3t_invoices')
    .select('invoice_number')
    .order('invoice_number')

  const duplicateNumbers: string[] = []
  const seen = new Map<string, number>()

  duplicates?.forEach(inv => {
    const count = seen.get(inv.invoice_number) || 0
    seen.set(inv.invoice_number, count + 1)
  })

  seen.forEach((count, number) => {
    if (count > 1) {
      duplicateNumbers.push(`${number} (${count} veces)`)
    }
  })

  if (duplicateNumbers.length === 0) {
    results.push({
      check: 'Números de factura únicos',
      status: 'OK',
      message: 'No hay números de factura duplicados'
    })
    console.log('✅ No hay números de factura duplicados\n')
  } else {
    results.push({
      check: 'Números de factura únicos',
      status: 'ERROR',
      message: `${duplicateNumbers.length} números duplicados encontrados`,
      details: duplicateNumbers
    })
    console.log('❌ ERROR: Números de factura duplicados encontrados\n')
  }

  // 7. Verificar facturas sin pedidos asociados
  console.log('🔗 Verificando facturas sin pedidos...')
  const facturasOrfanas: string[] = []

  if (invoicesCreated && orderInvoicesCreated) {
    for (const invoice of invoicesCreated) {
      const tienePedidos = orderInvoicesCreated.some(oi => oi.invoice_id === invoice.invoice_id)
      if (!tienePedidos) {
        facturasOrfanas.push(invoice.invoice_number)
      }
    }
  }

  if (facturasOrfanas.length === 0) {
    results.push({
      check: 'Facturas sin pedidos',
      status: 'OK',
      message: 'Todas las facturas tienen al menos un pedido asociado'
    })
    console.log('✅ Todas las facturas tienen pedidos asociados\n')
  } else {
    results.push({
      check: 'Facturas sin pedidos',
      status: 'WARNING',
      message: `${facturasOrfanas.length} facturas sin pedidos asociados`,
      details: facturasOrfanas
    })
    console.log(`⚠️  WARNING: ${facturasOrfanas.length} facturas sin pedidos\n`)
  }

  // Generar resumen
  console.log('=' .repeat(60))
  console.log('📊 RESUMEN DE VALIDACIÓN')
  console.log('=' .repeat(60))

  const okCount = results.filter(r => r.status === 'OK').length
  const warningCount = results.filter(r => r.status === 'WARNING').length
  const errorCount = results.filter(r => r.status === 'ERROR').length

  console.log(`✅ OK: ${okCount}`)
  console.log(`⚠️  WARNING: ${warningCount}`)
  console.log(`❌ ERROR: ${errorCount}`)
  console.log('')

  results.forEach(result => {
    const icon = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️ ' : '❌'
    console.log(`${icon} ${result.check}: ${result.message}`)
    if (result.details) {
      console.log(`   Detalles: ${JSON.stringify(result.details, null, 2).slice(0, 200)}...`)
    }
  })

  // Guardar reporte en archivo
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
  const reportPath = `./validation-report-${timestamp}.json`
  
  writeFileSync(reportPath, JSON.stringify({
    fecha: new Date().toISOString(),
    resumen: { okCount, warningCount, errorCount },
    resultados: results
  }, null, 2))

  console.log(`\n📄 Reporte guardado en: ${reportPath}`)

  // Exit code según resultado
  if (errorCount > 0) {
    console.log('\n❌ Validación FALLIDA - Se encontraron errores')
    process.exit(1)
  } else if (warningCount > 0) {
    console.log('\n⚠️  Validación COMPLETADA con advertencias')
    process.exit(0)
  } else {
    console.log('\n✅ Validación EXITOSA - Todo correcto')
    process.exit(0)
  }
}

// Ejecutar validación
validateMigration().catch(error => {
  console.error('❌ Error fatal en validación:', error)
  process.exit(1)
})

