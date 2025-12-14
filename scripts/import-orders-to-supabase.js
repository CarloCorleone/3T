#!/usr/bin/env node

/**
 * Script para importar orders desde CSV a Supabase usando SQL directo
 */

const fs = require('fs')
const path = require('path')

// Función para escapar valores SQL
function escapeSQLValue(value, type) {
  if (!value || value === '') {
    return 'NULL'
  }
  
  // Para números
  if (type === 'number') {
    return value
  }
  
  // Para strings y fechas, escapar comillas
  const escaped = value.replace(/'/g, "''")
  return `'${escaped}'`
}

// Función para parsear una línea del CSV respetando comillas
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

// Función principal
async function importOrders() {
  try {
    console.log('🚀 Iniciando importación de orders...\n')
    
    // Leer el archivo CSV
    const csvPath = path.join(__dirname, '..', 'orders_formatted_2025-10-08.csv')
    console.log(`📂 Leyendo archivo: ${csvPath}`)
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`El archivo CSV no existe: ${csvPath}`)
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.trim().split('\n')
    
    console.log(`✅ Archivo leído: ${lines.length - 1} orders encontrados\n`)
    
    // Generar SQL INSERT statements
    const headers = parseCSVLine(lines[0])
    const sqlStatements = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      
      // Construir los valores para cada columna
      const sqlValues = []
      
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j]
        const value = values[j]
        
        // Determinar el tipo y escapar apropiadamente
        if (header === 'quantity' || header === 'bottles_returned' || 
            header === 'bottles_delivered' || header === 'final_price') {
          sqlValues.push(value && value !== '' ? value : 'NULL')
        } else if (header === 'botellones_entregados') {
          sqlValues.push(value && value !== '' ? value : 'NULL')
        } else {
          sqlValues.push(escapeSQLValue(value, 'string'))
        }
      }
      
      const insertSQL = `INSERT INTO public."3t_orders" (${headers.join(', ')}) VALUES (${sqlValues.join(', ')});`
      sqlStatements.push(insertSQL)
    }
    
    // Guardar los statements en un archivo temporal
    const sqlFilePath = path.join(__dirname, '..', 'import-orders.sql')
    fs.writeFileSync(sqlFilePath, sqlStatements.join('\n'))
    
    console.log(`✅ SQL generado: ${sqlStatements.length} statements`)
    console.log(`📝 Archivo SQL guardado en: ${sqlFilePath}`)
    console.log('\n🔧 Para importar, ejecuta:')
    console.log(`   Usa el MCP de Supabase para ejecutar el archivo SQL\n`)
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

// Ejecutar
importOrders()

