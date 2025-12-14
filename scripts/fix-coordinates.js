#!/usr/bin/env node

/**
 * Script para corregir las coordenadas en 3t_addresses
 * Problema: Las coordenadas se importaron con coma decimal (formato europeo)
 * y PostgreSQL las interpretó como enteros
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.loopia.cl'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Función para parsear línea CSV (maneja comillas y comas)
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

async function fixCoordinates() {
  console.log('\n🔧 Corrigiendo coordenadas en 3t_addresses\n')
  
  // Leer CSV
  const csvPath = path.join(__dirname, '..', 'csv', 'Orders - Direcciones.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.trim().split('\n')
  
  console.log(`📄 Leyendo ${lines.length - 1} direcciones del CSV...\n`)
  
  let updated = 0
  let errors = 0
  let skipped = 0
  
  // Procesar cada línea (saltar header)
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    
    const addressId = values[0]
    const latitudStr = values[9]  // columna "latitud"
    const longitudStr = values[10] // columna "longitud"
    
    // Convertir formato europeo (coma) a formato SQL (punto)
    const latitude = latitudStr ? parseFloat(latitudStr.replace(/"/g, '').replace(',', '.')) : null
    const longitude = longitudStr ? parseFloat(longitudStr.replace(/"/g, '').replace(',', '.')) : null
    
    if (!addressId || !latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.log(`   ⚠️  Línea ${i + 1}: Datos incompletos o inválidos`)
      skipped++
      continue
    }
    
    // Actualizar en base de datos
    const { error } = await supabase
      .from('3t_addresses')
      .update({
        latitude: latitude,
        longitude: longitude
      })
      .eq('address_id', addressId)
    
    if (error) {
      console.log(`   ❌ Error en ${addressId}: ${error.message}`)
      errors++
    } else {
      updated++
      if (updated % 10 === 0) {
        console.log(`   ✓ Procesadas ${updated} direcciones...`)
      }
    }
  }
  
  console.log(`\n✅ Corrección completada:`)
  console.log(`   - Actualizadas: ${updated}`)
  console.log(`   - Errores: ${errors}`)
  console.log(`   - Omitidas: ${skipped}`)
  console.log()
}

// Ejecutar
fixCoordinates().catch(error => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})


