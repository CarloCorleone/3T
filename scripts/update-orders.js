#!/usr/bin/env node

/**
 * Script para actualizar la tabla de orders en Supabase
 * Elimina todos los registros existentes e importa los nuevos desde el CSV
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.loopia.cl'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Función para parsear el CSV
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n')
  const headers = lines[0].split(',')
  
  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const row = {}
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim()
      
      // Convertir valores vacíos a null
      if (!value || value === '') {
        row[header] = null
      }
      // Convertir números
      else if (header === 'quantity' || header === 'bottles_returned' || 
               header === 'bottles_delivered' || header === 'final_price' || 
               header === 'botellones_entregados') {
        row[header] = value ? parseInt(value) : null
      }
      // Mantener como string para el resto
      else {
        row[header] = value
      }
    })
    
    data.push(row)
  }
  
  return data
}

// Función principal
async function updateOrders() {
  try {
    console.log('🚀 Iniciando actualización de orders...\n')
    
    // 1. Leer el archivo CSV
    const csvPath = path.join(__dirname, '..', 'orders_formatted_2025-10-08.csv')
    console.log(`📂 Leyendo archivo: ${csvPath}`)
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`El archivo CSV no existe: ${csvPath}`)
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const orders = parseCSV(csvContent)
    
    console.log(`✅ CSV parseado: ${orders.length} orders encontrados\n`)
    
    // 2. Eliminar todos los registros existentes
    console.log('🗑️  Eliminando registros existentes de 3t_orders...')
    const { error: deleteError, count: deletedCount } = await supabase
      .from('3t_orders')
      .delete()
      .neq('order_id', '') // Esto elimina todos los registros
    
    if (deleteError) {
      throw new Error(`Error al eliminar registros: ${deleteError.message}`)
    }
    
    console.log(`✅ Registros eliminados exitosamente\n`)
    
    // 3. Insertar los nuevos registros en lotes de 100
    console.log('📥 Insertando nuevos registros...')
    const batchSize = 100
    let insertedCount = 0
    
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('3t_orders')
        .insert(batch)
      
      if (insertError) {
        console.error(`❌ Error insertando lote ${Math.floor(i / batchSize) + 1}:`, insertError.message)
        throw insertError
      }
      
      insertedCount += batch.length
      const progress = Math.round((insertedCount / orders.length) * 100)
      console.log(`   Progreso: ${insertedCount}/${orders.length} (${progress}%)`)
    }
    
    console.log(`\n✅ ${insertedCount} orders insertados exitosamente!`)
    
    // 4. Verificar el resultado
    const { count, error: countError } = await supabase
      .from('3t_orders')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.warn('⚠️  No se pudo verificar el conteo final:', countError.message)
    } else {
      console.log(`\n📊 Total de orders en la base de datos: ${count}`)
    }
    
    console.log('\n🎉 ¡Actualización completada exitosamente!')
    
  } catch (error) {
    console.error('\n❌ Error durante la actualización:', error.message)
    process.exit(1)
  }
}

// Ejecutar
updateOrders()

