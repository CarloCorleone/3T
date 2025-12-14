#!/usr/bin/env node

/**
 * Script para importar orders directamente usando el cliente de Supabase
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function importOrders() {
  try {
    console.log('🚀 Iniciando importación usando Supabase Client...\n')
    
    // Leer el archivo CSV
    const csvPath = path.join(__dirname, '..', 'orders_formatted_2025-10-08.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.trim().split('\n')
    
    console.log(`📂 Total de orders: ${lines.length - 1}\n`)
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim())
    console.log(`📋 Columnas encontradas: ${headers.join(', ')}\n`)
    
    // Función para parsear una línea CSV correctamente
    function parseCSVLine(line) {
      const result = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      result.push(current.trim())
      return result
    }
    
    // Procesar en lotes de 50
    const batchSize = 50
    let imported = 0
    let errors = 0
    
    for (let i = 1; i < lines.length; i += batchSize) {
      const batchLines = lines.slice(i, i + batchSize)
      const batchData = []
      
      for (const line of batchLines) {
        // Parse CSV line correctamente
        const values = parseCSVLine(line)
        const order = {}
        
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j]
          let value = values[j]
          
          // Convertir valores vacíos a null
          if (!value || value === '') {
            order[header] = null
          } else {
            // Convertir números
            if (['quantity', 'bottles_returned', 'bottles_delivered', 'final_price', 'botellones_entregados'].includes(header)) {
              order[header] = value && value !== '' ? parseFloat(value) : null
            } else {
              order[header] = value
            }
          }
        }
        
        batchData.push(order)
      }
      
      // Insertar lote
      console.log(`📤 Importando lote ${Math.floor(i / batchSize) + 1} (${batchData.length} orders)...`)
      
      const { data, error } = await supabase
        .from('3t_orders')
        .insert(batchData)
      
      if (error) {
        console.error(`   ❌ Error en lote: ${error.message}`)
        errors += batchData.length
      } else {
        console.log(`   ✅ Lote importado correctamente`)
        imported += batchData.length
      }
      
      // Pequeña pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`\n✅ Importación completada:`)
    console.log(`   - Importados: ${imported}`)
    console.log(`   - Errores: ${errors}`)
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

// Ejecutar
importOrders()

