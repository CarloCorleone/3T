/**
 * Script de Sincronización de Facturas desde CSV
 * 
 * Importa facturas desde un archivo CSV exportado del SII u otro sistema
 * y las crea en el sistema con sus relaciones a pedidos.
 * 
 * Uso:
 *   npx tsx scripts/sync-invoices-from-csv.ts --file facturas.csv
 *   npx tsx scripts/sync-invoices-from-csv.ts --file facturas.csv --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { format, parse, isValid } from 'date-fns'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno requeridas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Argumentos de línea de comandos
const args = process.argv.slice(2)
const fileArg = args.find(arg => arg.startsWith('--file='))
const isDryRun = args.includes('--dry-run')

if (!fileArg) {
  console.error('❌ Error: Debes especificar el archivo CSV')
  console.log('\nUso:')
  console.log('  npx tsx scripts/sync-invoices-from-csv.ts --file=facturas.csv')
  console.log('  npx tsx scripts/sync-invoices-from-csv.ts --file=facturas.csv --dry-run')
  process.exit(1)
}

const csvFile = fileArg.split('=')[1]

type CSVRow = {
  numero_factura: string
  fecha: string
  rut_cliente?: string
  nombre_cliente?: string
  monto_neto: string
  monto_iva: string
  monto_total: string
  tipo?: string  // venta, exenta, boleta
  notas?: string
}

async function syncInvoices() {
  console.log('🔄 Sincronización de Facturas desde CSV')
  console.log('=' .repeat(60))
  
  if (isDryRun) {
    console.log('⚠️  MODO DRY-RUN: No se harán cambios en la base de datos\n')
  }

  // Leer archivo CSV
  console.log(`📄 Leyendo archivo: ${csvFile}`)
  let csvContent: string
  try {
    csvContent = readFileSync(csvFile, 'utf-8')
  } catch (error) {
    console.error(`❌ Error al leer archivo: ${error}`)
    process.exit(1)
  }

  // Parsear CSV (asumiendo separación por comas)
  const lines = csvContent.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  
  console.log(`📋 Headers detectados: ${headers.join(', ')}`)
  
  const rows: CSVRow[] = lines.slice(1).map((line, index) => {
    const values = line.split(',')
    const row: any = {}
    headers.forEach((header, i) => {
      row[header.replace(/\s+/g, '_')] = values[i]?.trim() || ''
    })
    return row as CSVRow
  })

  console.log(`\n📊 Total de registros en CSV: ${rows.length}\n`)

  // Estadísticas
  let created = 0
  let skipped = 0
  let errors = 0
  const errorDetails: any[] = []

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2 // +2 porque línea 1 es header y el índice empieza en 0
    
    try {
      // Validar campos requeridos
      if (!row.numero_factura || !row.fecha || !row.monto_total) {
        console.log(`⚠️  Fila ${rowNumber}: Campos requeridos faltantes, omitiendo`)
        skipped++
        continue
      }

      // Parsear fecha
      let invoiceDate: Date
      try {
        // Intentar varios formatos comunes
        const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'MM/dd/yyyy']
        let parsed: Date | null = null
        
        for (const fmt of formats) {
          try {
            parsed = parse(row.fecha, fmt, new Date())
            if (isValid(parsed)) break
          } catch {}
        }
        
        if (!parsed || !isValid(parsed)) {
          throw new Error(`Formato de fecha inválido: ${row.fecha}`)
        }
        
        invoiceDate = parsed
      } catch (error) {
        console.log(`❌ Fila ${rowNumber}: Error en fecha - ${error}`)
        errors++
        errorDetails.push({ row: rowNumber, error: 'Fecha inválida', data: row })
        continue
      }

      // Parsear montos
      const parseAmount = (str: string): number => {
        return parseFloat(str.replace(/[^\d.-]/g, ''))
      }

      const totalAmount = parseAmount(row.monto_total)
      const taxAmount = row.monto_iva ? parseAmount(row.monto_iva) : totalAmount * 0.19
      const subtotal = row.monto_neto ? parseAmount(row.monto_neto) : totalAmount - taxAmount

      if (isNaN(totalAmount) || totalAmount <= 0) {
        console.log(`❌ Fila ${rowNumber}: Monto total inválido`)
        errors++
        errorDetails.push({ row: rowNumber, error: 'Monto inválido', data: row })
        continue
      }

      // Verificar si la factura ya existe
      const { data: existing } = await supabase
        .from('3t_invoices')
        .select('invoice_id')
        .eq('invoice_number', row.numero_factura)
        .single()

      if (existing) {
        console.log(`⏭️  Fila ${rowNumber}: Factura ${row.numero_factura} ya existe, omitiendo`)
        skipped++
        continue
      }

      // Buscar pedidos del cliente para asociar
      let ordersToLink: any[] = []
      
      if (row.rut_cliente || row.nombre_cliente) {
        const { data: customers } = await supabase
          .from('3t_customers')
          .select('customer_id, name')
          .or(`rut.eq.${row.rut_cliente || ''},name.ilike.%${row.nombre_cliente || ''}%`)
          .limit(5)

        if (customers && customers.length > 0) {
          // Buscar pedidos del cliente en fechas cercanas a la factura
          const startDate = format(new Date(invoiceDate.getTime() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
          const endDate = format(new Date(invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

          const customerIds = customers.map(c => c.customer_id)

          const { data: orders } = await supabase
            .from('3t_orders')
            .select('order_id, final_price')
            .in('customer_id', customerIds)
            .gte('order_date', startDate)
            .lte('order_date', endDate)
            .eq('payment_status', 'Pagado')

          if (orders && orders.length > 0) {
            // Intentar hacer match por monto
            ordersToLink = orders.filter(o => {
              const diff = Math.abs((o.final_price * 1.19) - totalAmount)
              return diff < 100 // Diferencia menor a $100
            })
          }
        }
      }

      // Crear factura
      if (!isDryRun) {
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('3t_invoices')
          .insert({
            invoice_number: row.numero_factura,
            invoice_date: format(invoiceDate, 'yyyy-MM-dd'),
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: 'vigente',
            invoice_type: row.tipo || 'venta',
            notes: row.notas || `Importado desde CSV el ${format(new Date(), 'yyyy-MM-dd')}`
          })
          .select()
          .single()

        if (invoiceError) {
          console.log(`❌ Fila ${rowNumber}: Error al crear factura - ${invoiceError.message}`)
          errors++
          errorDetails.push({ row: rowNumber, error: invoiceError.message, data: row })
          continue
        }

        // Crear relaciones con pedidos (si se encontraron)
        if (ordersToLink.length > 0) {
          const relations = ordersToLink.map(order => ({
            order_id: order.order_id,
            invoice_id: newInvoice.invoice_id,
            amount_invoiced: order.final_price
          }))

          const { error: relError } = await supabase
            .from('3t_order_invoices')
            .insert(relations)

          if (relError) {
            console.log(`⚠️  Fila ${rowNumber}: Factura creada pero error en relaciones - ${relError.message}`)
          } else {
            console.log(`✅ Fila ${rowNumber}: Factura ${row.numero_factura} creada y asociada a ${ordersToLink.length} pedido(s)`)
          }
        } else {
          console.log(`✅ Fila ${rowNumber}: Factura ${row.numero_factura} creada (sin pedidos asociados)`)
        }
        
        created++
      } else {
        // Dry run: solo simular
        console.log(`[DRY-RUN] Fila ${rowNumber}: Crearía factura ${row.numero_factura} (${format(invoiceDate, 'dd/MM/yyyy')}) por ${totalAmount}`)
        if (ordersToLink.length > 0) {
          console.log(`          Asociaría con ${ordersToLink.length} pedido(s)`)
        }
        created++
      }

    } catch (error: any) {
      console.log(`❌ Fila ${rowNumber}: Error inesperado - ${error.message}`)
      errors++
      errorDetails.push({ row: rowNumber, error: error.message, data: row })
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN DE SINCRONIZACIÓN')
  console.log('='.repeat(60))
  console.log(`Total registros: ${rows.length}`)
  console.log(`✅ Creadas: ${created}`)
  console.log(`⏭️  Omitidas: ${skipped}`)
  console.log(`❌ Errores: ${errors}`)

  if (errorDetails.length > 0) {
    console.log('\n⚠️  ERRORES DETALLADOS:')
    errorDetails.forEach(err => {
      console.log(`  Fila ${err.row}: ${err.error}`)
      console.log(`    Datos: ${JSON.stringify(err.data)}`)
    })
  }

  if (isDryRun) {
    console.log('\n⚠️  Esto fue una simulación. Ejecuta sin --dry-run para aplicar cambios.')
  }

  process.exit(errors > 0 ? 1 : 0)
}

// Ejecutar
syncInvoices().catch(error => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})

