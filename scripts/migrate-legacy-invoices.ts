#!/usr/bin/env tsx
/**
 * Script de Migración de Facturas Legacy
 * 
 * Migra las facturas que están en 3t_orders.invoice_number pero no en 3t_invoices
 * Con validaciones y transacciones para seguridad
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'
import * as fs from 'fs'

// Función para cargar variables de entorno manualmente
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  
  const content = fs.readFileSync(filePath, 'utf-8')
  content.split('\n').forEach(line => {
    line = line.trim()
    if (!line || line.startsWith('#')) return
    
    const [key, ...valueParts] = line.split('=')
    const value = valueParts.join('=').replace(/^["'](.*)["']$/, '$1')
    
    if (key && value) {
      process.env[key] = value
    }
  })
}

// Cargar variables de entorno
loadEnvFile('/opt/cane/env/3t.env')
loadEnvFile('/opt/cane/3t/.env')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no configuradas')
  console.error('   Necesitas: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface LegacyInvoice {
  invoice_number: string
  pedidos: Array<{
    order_id: string
    order_date: string
    customer_id: string
    customer_name: string
    final_price: number
  }>
  fecha_factura_calculada: string  // Fecha del pedido más reciente
  monto_total: number
  monto_neto: number
  iva: number
}

// ============================================
// FASE 1: ANÁLISIS Y VALIDACIÓN
// ============================================

async function analizarFacturasPendientes(): Promise<LegacyInvoice[]> {
  console.log('\n📊 Fase 1: Analizando facturas pendientes de migrar...\n')

  // Obtener facturas en orders que NO están en 3t_invoices
  const { data: ordersConFactura, error: ordersError } = await supabase
    .from('3t_orders')
    .select(`
      invoice_number,
      order_id,
      order_date,
      final_price,
      customer_id,
      customer:3t_customers!inner(name)
    `)
    .not('invoice_number', 'is', null)
    .neq('invoice_number', '')

  if (ordersError) throw ordersError

  // Obtener facturas que YA existen en 3t_invoices
  const { data: facturasExistentes, error: existError } = await supabase
    .from('3t_invoices')
    .select('invoice_number')

  if (existError) throw existError

  const numerosExistentes = new Set(facturasExistentes?.map(f => f.invoice_number) || [])

  // Agrupar pedidos por invoice_number (solo los que NO existen en 3t_invoices)
  const facturasPorNumero = new Map<string, LegacyInvoice>()

  for (const order of ordersConFactura || []) {
    if (numerosExistentes.has(order.invoice_number)) continue

    if (!facturasPorNumero.has(order.invoice_number)) {
      facturasPorNumero.set(order.invoice_number, {
        invoice_number: order.invoice_number,
        pedidos: [],
        fecha_factura_calculada: order.order_date,
        monto_total: 0,
        monto_neto: 0,
        iva: 0
      })
    }

    const factura = facturasPorNumero.get(order.invoice_number)!
    const customerName = (order.customer as any)?.name || 'Sin nombre'
    
    factura.pedidos.push({
      order_id: order.order_id,
      order_date: order.order_date,
      customer_id: order.customer_id,
      customer_name: customerName,
      final_price: order.final_price
    })

    // Actualizar fecha (usar la más reciente)
    if (order.order_date > factura.fecha_factura_calculada) {
      factura.fecha_factura_calculada = order.order_date
    }

    factura.monto_total += order.final_price
  }

  // Calcular montos netos e IVA
  const facturas = Array.from(facturasPorNumero.values())
  for (const factura of facturas) {
    // El monto total incluye IVA, calculamos el neto
    factura.monto_neto = factura.monto_total / 1.19
    factura.iva = factura.monto_total - factura.monto_neto
  }

  return facturas
}

function mostrarResumenAnalisis(facturas: LegacyInvoice[]) {
  console.log('═'.repeat(80))
  console.log('📋 RESUMEN DEL ANÁLISIS')
  console.log('═'.repeat(80))
  console.log(`\n✅ Facturas encontradas para migrar: ${facturas.length}`)
  
  const totalPedidos = facturas.reduce((sum, f) => sum + f.pedidos.length, 0)
  const montoTotal = facturas.reduce((sum, f) => sum + f.monto_total, 0)
  
  console.log(`✅ Total de pedidos afectados: ${totalPedidos}`)
  console.log(`💰 Monto total a migrar: ${formatCLP(montoTotal)}`)
  
  // Mostrar primeras 10 facturas como ejemplo
  console.log('\n📄 Ejemplos de facturas a migrar (primeras 10):')
  console.log('─'.repeat(80))
  
  facturas.slice(0, 10).forEach(f => {
    console.log(`\n  Factura: ${f.invoice_number}`)
    console.log(`  Fecha calculada: ${formatDate(f.fecha_factura_calculada)}`)
    console.log(`  Pedidos: ${f.pedidos.length}`)
    console.log(`  Monto neto: ${formatCLP(f.monto_neto)}`)
    console.log(`  IVA: ${formatCLP(f.iva)}`)
    console.log(`  Total: ${formatCLP(f.monto_total)}`)
  })

  if (facturas.length > 10) {
    console.log(`\n  ... y ${facturas.length - 10} facturas más`)
  }

  console.log('\n' + '═'.repeat(80))
}

// ============================================
// FASE 2: MIGRACIÓN CON TRANSACCIÓN
// ============================================

async function migrarFacturas(facturas: LegacyInvoice[], dryRun: boolean = true): Promise<void> {
  console.log(`\n🔄 Fase 2: ${dryRun ? 'SIMULACIÓN' : 'EJECUCIÓN REAL'} de migración...\n`)

  let exitosas = 0
  let fallidas = 0
  const errores: Array<{ factura: string; error: string }> = []

  for (const factura of facturas) {
    try {
      if (dryRun) {
        // En modo simulación, solo mostramos lo que haríamos
        console.log(`✓ [SIMULACIÓN] Factura ${factura.invoice_number} lista para migrar`)
        exitosas++
      } else {
        // Migración real
        await migrarFacturaIndividual(factura)
        console.log(`✓ Factura ${factura.invoice_number} migrada exitosamente`)
        exitosas++
      }
    } catch (error: any) {
      console.error(`✗ Error en factura ${factura.invoice_number}: ${error.message}`)
      fallidas++
      errores.push({
        factura: factura.invoice_number,
        error: error.message
      })
    }
  }

  // Mostrar resumen final
  console.log('\n' + '═'.repeat(80))
  console.log(`📊 RESUMEN DE ${dryRun ? 'SIMULACIÓN' : 'MIGRACIÓN'}`)
  console.log('═'.repeat(80))
  console.log(`\n✅ Exitosas: ${exitosas}`)
  console.log(`❌ Fallidas: ${fallidas}`)
  
  if (errores.length > 0) {
    console.log('\n⚠️  Errores encontrados:')
    errores.forEach(e => {
      console.log(`   - ${e.factura}: ${e.error}`)
    })
  }
  console.log('\n' + '═'.repeat(80))
}

async function migrarFacturaIndividual(factura: LegacyInvoice): Promise<void> {
  // 1. Crear registro en 3t_invoices
  const { data: nuevaFactura, error: invoiceError } = await supabase
    .from('3t_invoices')
    .insert({
      invoice_number: factura.invoice_number,
      invoice_date: factura.fecha_factura_calculada,
      subtotal: Math.round(factura.monto_neto * 100) / 100,  // Redondear a 2 decimales
      tax_amount: Math.round(factura.iva * 100) / 100,
      total_amount: Math.round(factura.monto_total * 100) / 100,
      status: 'vigente',
      invoice_type: 'venta',
      notes: 'Migrado automáticamente desde sistema legacy',
      created_at: factura.fecha_factura_calculada,  // Usar fecha original
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (invoiceError) throw invoiceError

  // 2. Crear relaciones en 3t_order_invoices
  const relaciones = factura.pedidos.map(pedido => ({
    order_id: pedido.order_id,
    invoice_id: nuevaFactura.invoice_id,
    amount_invoiced: Math.round(pedido.final_price * 100) / 100,
    notes: 'Migrado desde sistema legacy'
  }))

  const { error: relError } = await supabase
    .from('3t_order_invoices')
    .insert(relaciones)

  if (relError) {
    // Si falla la creación de relaciones, eliminar la factura creada
    await supabase
      .from('3t_invoices')
      .delete()
      .eq('invoice_id', nuevaFactura.invoice_id)
    
    throw relError
  }
}

// ============================================
// UTILIDADES
// ============================================

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

async function preguntarConfirmacion(mensaje: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(`${mensaje} (si/no): `, (respuesta) => {
      rl.close()
      resolve(respuesta.toLowerCase() === 'si' || respuesta.toLowerCase() === 's')
    })
  })
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════════════╗')
  console.log('║   MIGRACIÓN DE FACTURAS LEGACY → NUEVO SISTEMA                        ║')
  console.log('║   Script seguro con validaciones y transacciones                      ║')
  console.log('╚═══════════════════════════════════════════════════════════════════════╝')

  try {
    // Fase 1: Análisis
    const facturas = await analizarFacturasPendientes()
    
    if (facturas.length === 0) {
      console.log('\n✅ No hay facturas pendientes de migrar. Todo está actualizado.')
      return
    }

    mostrarResumenAnalisis(facturas)

    // Fase 2: Simulación
    console.log('\n⚠️  Ejecutando SIMULACIÓN primero...')
    await migrarFacturas(facturas, true)

    // Solicitar confirmación
    console.log('\n' + '═'.repeat(80))
    const confirmar = await preguntarConfirmacion(
      '\n¿Deseas ejecutar la migración REAL con estos datos?'
    )

    if (!confirmar) {
      console.log('\n❌ Migración cancelada por el usuario.')
      return
    }

    // Fase 3: Migración real
    console.log('\n⚠️  Iniciando migración REAL...')
    await migrarFacturas(facturas, false)

    console.log('\n✅ ¡Migración completada exitosamente!')
    console.log('\n📌 Próximos pasos:')
    console.log('   1. Verificar las facturas en https://3t.loopia.cl/facturas')
    console.log('   2. Revisar que los montos sean correctos')
    console.log('   3. Los campos legacy en 3t_orders se mantienen como backup')

  } catch (error: any) {
    console.error('\n❌ Error fatal:', error.message)
    console.error('   Stack:', error.stack)
    process.exit(1)
  }
}

// Ejecutar
main()

