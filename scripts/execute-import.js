#!/usr/bin/env node

/**
 * Script para ejecutar la importación usando el archivo SQL generado
 * Divide en lotes para evitar timeouts
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

async function executeImport() {
  try {
    console.log('🚀 Ejecutando importación de orders...\n')
    
    // Leer el archivo SQL
    const sqlFilePath = path.join(__dirname, '..', 'import-orders.sql')
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8')
    const statements = sqlContent.split(';').filter(s => s.trim())
    
    console.log(`📝 Total de statements: ${statements.length}\n`)
    
    // Ejecutar en lotes de 50
    const batchSize = 50
    const totalBatches = Math.ceil(statements.length / batchSize)
    
    for (let i = 0; i < statements.length; i += batchSize) {
      const batchNum = Math.floor(i / batchSize) + 1
      const batch = statements.slice(i, i + batchSize)
      const batchSQL = batch.join(';') + ';'
      
      // Guardar en archivo temporal
      const tempFile = path.join(__dirname, '..', `batch-${batchNum}.sql`)
      fs.writeFileSync(tempFile, batchSQL)
      
      console.log(`📤 Ejecutando lote ${batchNum}/${totalBatches} (${batch.length} statements)...`)
      
      // Aquí necesitarías ejecutar usando el MCP
      // Por ahora solo mostramos el progreso
      
      // Limpiar archivo temporal
      fs.unlinkSync(tempFile)
    }
    
    console.log('\n✅ Todos los lotes procesados')
    console.log('⚠️  Nota: Ejecuta manualmente usando el MCP de Supabase')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

executeImport()

