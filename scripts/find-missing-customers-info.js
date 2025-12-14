#!/usr/bin/env node

/**
 * Buscar información detallada de los clientes faltantes
 */

const fs = require('fs')
const path = require('path')

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

async function main() {
  console.log('\n🔍 BUSCANDO INFORMACIÓN DE CLIENTES FALTANTES\n')
  console.log('='.repeat(80))
  
  // Clientes faltantes
  const missingCustomerIds = [
    'a6c4t3y2', 'q1w4i4y3', 'n9d6n0y0', 'i3p8c6l7', 'l2s3m2r3',
    'e9n1m7v2', 'a0e8q3d7', 'm2y4f5u2', 'r7o5p6r7', '0bdfb391'
  ]
  
  // 1. Buscar en direcciones
  console.log('\n📍 Información de Direcciones:\n')
  
  const dirPath = path.join(__dirname, '..', 'csv', 'Orders - Direcciones.csv')
  const dirContent = fs.readFileSync(dirPath, 'utf-8')
  const dirLines = dirContent.trim().split('\n')
  
  const addressesInfo = {}
  for (let i = 1; i < dirLines.length; i++) {
    const values = parseCSVLine(dirLines[i])
    const customerId = values[1]
    
    if (missingCustomerIds.includes(customerId)) {
      addressesInfo[customerId] = {
        addressId: values[0],
        address: values[2],
        comuna: values[3],
        streetName: values[4],
        streetNumber: values[5]
      }
    }
  }
  
  // 2. Buscar en orders para ver detalles
  console.log('📋 Buscando en Orders para obtener más información...\n')
  
  const ordersPath = path.join(__dirname, '..', 'csv', 'orders_formatted_2025-10-08.csv')
  const ordersContent = fs.readFileSync(ordersPath, 'utf-8')
  const ordersLines = ordersContent.trim().split('\n')
  
  const customerOrders = {}
  for (let i = 1; i < ordersLines.length; i++) {
    const values = parseCSVLine(ordersLines[i])
    const customerId = values[1]
    
    if (missingCustomerIds.includes(customerId)) {
      if (!customerOrders[customerId]) {
        customerOrders[customerId] = {
          orders: [],
          totalBottles: 0,
          totalRevenue: 0
        }
      }
      
      const quantity = parseFloat(values[7]) || 0
      const orderDate = values[11]
      
      customerOrders[customerId].orders.push({
        orderId: values[0],
        date: orderDate,
        quantity: quantity
      })
      customerOrders[customerId].totalBottles += quantity
    }
  }
  
  // Mostrar información completa
  console.log('═'.repeat(80))
  console.log('\n📊 CLIENTES FALTANTES - INFORMACIÓN DETALLADA\n')
  
  missingCustomerIds.forEach((customerId, idx) => {
    console.log(`\n${idx + 1}. Cliente ID: ${customerId}`)
    console.log('   ' + '-'.repeat(75))
    
    // Dirección
    if (addressesInfo[customerId]) {
      const addr = addressesInfo[customerId]
      console.log(`   📍 Dirección Principal:`)
      console.log(`      ${addr.address}`)
      console.log(`      Comuna: ${addr.comuna}`)
    } else {
      console.log(`   📍 Sin dirección registrada`)
    }
    
    // Orders
    if (customerOrders[customerId]) {
      const info = customerOrders[customerId]
      console.log(`\n   📋 Pedidos:`)
      console.log(`      Total orders: ${info.orders.length}`)
      console.log(`      Total botellones: ${info.totalBottles}`)
      console.log(`      Valor estimado: $${(info.totalBottles * 2000).toLocaleString('es-CL')}`)
      
      if (info.orders.length <= 5) {
        console.log(`\n   📅 Historial de pedidos:`)
        info.orders.forEach((order, i) => {
          console.log(`      ${i + 1}. ${order.date} - ${order.quantity} botellones (Order: ${order.orderId})`)
        })
      } else {
        console.log(`\n   📅 Últimos 3 pedidos:`)
        info.orders.slice(-3).forEach((order, i) => {
          console.log(`      ${i + 1}. ${order.date} - ${order.quantity} botellones (Order: ${order.orderId})`)
        })
      }
    } else {
      console.log(`\n   📋 Sin pedidos registrados`)
    }
  })
  
  // Resumen
  console.log('\n' + '═'.repeat(80))
  console.log('\n📊 RESUMEN GENERAL:\n')
  
  const totalOrders = Object.values(customerOrders).reduce((sum, c) => sum + c.orders.length, 0)
  const totalBottles = Object.values(customerOrders).reduce((sum, c) => sum + c.totalBottles, 0)
  const totalRevenue = totalBottles * 2000
  
  console.log(`   Total clientes faltantes: ${missingCustomerIds.length}`)
  console.log(`   Clientes con direcciones: ${Object.keys(addressesInfo).length}`)
  console.log(`   Clientes con orders: ${Object.keys(customerOrders).length}`)
  console.log(`   Total orders perdidos: ${totalOrders}`)
  console.log(`   Total botellones: ${totalBottles}`)
  console.log(`   Valor estimado: $${totalRevenue.toLocaleString('es-CL')}`)
  
  // Priorización
  console.log('\n📈 PRIORIZACIÓN (por volumen de botellones):\n')
  
  const sortedCustomers = Object.entries(customerOrders)
    .sort((a, b) => b[1].totalBottles - a[1].totalBottles)
  
  sortedCustomers.forEach(([id, info], idx) => {
    const addr = addressesInfo[id]
    console.log(`   ${idx + 1}. ${id}`)
    console.log(`      ${info.totalBottles} botellones en ${info.orders.length} orders`)
    if (addr) {
      console.log(`      ${addr.comuna}`)
    }
  })
  
  // Recomendación
  console.log('\n' + '═'.repeat(80))
  console.log('\n🎯 RECOMENDACIÓN:\n')
  
  if (totalBottles > 1000) {
    console.log('   ✅ DEFINITIVAMENTE VALE LA PENA RECUPERAR')
    console.log(`   • Estos clientes representan ${totalBottles} botellones`)
    console.log(`   • Valor aproximado: $${totalRevenue.toLocaleString('es-CL')}`)
    console.log(`   • Son ${Object.keys(customerOrders).length} clientes con historial de compras\n`)
  } else {
    console.log('   ⚠️  Volumen bajo, evaluar si son clientes activos\n')
  }
  
  // Generar reporte CSV para facilitar ingreso
  const reportCsv = ['Cliente ID,Total Orders,Total Botellones,Comuna,Dirección']
  sortedCustomers.forEach(([id, info]) => {
    const addr = addressesInfo[id]
    reportCsv.push(`${id},${info.orders.length},${info.totalBottles},${addr?.comuna || ''},${addr?.address || ''}`)
  })
  
  const reportPath = path.join(__dirname, '..', 'CLIENTES_FALTANTES_DETALLE.csv')
  fs.writeFileSync(reportPath, reportCsv.join('\n'))
  console.log(`📄 Reporte CSV guardado en: ${reportPath}\n`)
}

main()

