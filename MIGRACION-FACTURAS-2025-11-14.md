# 📋 Migración: Reparación Módulo de Facturas
**Fecha:** 14 de noviembre de 2025  
**Estado:** ✅ Implementación completa - Requiere ejecución de SQL

---

## 🎯 Resumen de Cambios

### Problemas Solucionados

1. ✅ **Pedidos internos en pendientes de facturar**
   - Los pedidos con `payment_status = 'Interno'` (retiros de insumos) ya NO aparecen como pendientes

2. ✅ **Sistema de múltiples facturas por pedido**
   - Ahora se pueden crear múltiples facturas reales para un mismo pedido
   - Ejemplo: Pedido #15467aae → Factura 3517 ($62.500) + Factura 3535 ($162.500)
   - Cada factura aparece como registro independiente en la base de datos

3. ✅ **Filtros predefinidos**
   - Mes Actual, Mes Anterior, Trimestre, Año, Personalizado
   - Card de filtros separada del contenedor de tabs

4. ✅ **Filtrado por fecha de facturación**
   - Card "Total Facturado" ahora filtra por `invoice_date` (fecha de emisión)
   - No por `order_date` (fecha del pedido)

---

## 🔧 Migración SQL Requerida

### ⚠️ IMPORTANTE: Ejecutar en Supabase SQL Editor

Ejecuta el siguiente SQL en el editor SQL de Supabase:

```sql
-- ====================================================================
-- Migración: Excluir pedidos internos de vista de pendientes
-- Fecha: 2025-11-14
-- Descripción: Actualiza v_pending_invoices_empresa para excluir 
--              pedidos con payment_status = 'Interno'
-- ====================================================================

-- Eliminar vista existente
DROP VIEW IF EXISTS v_pending_invoices_empresa;

-- Recrear vista con filtro adicional
CREATE VIEW v_pending_invoices_empresa AS
SELECT 
  o.order_id, 
  o.order_date, 
  o.final_price,
  o.customer_id, 
  c.name AS customer_name,
  c.customer_type, 
  o.payment_status, 
  o.invoice_number
FROM "3t_orders" o
INNER JOIN "3t_customers" c ON o.customer_id = c.customer_id
WHERE 
  c.customer_type = 'Empresa'
  AND o.invoice_number IS NULL
  AND o.payment_status != 'Interno'  -- ⭐ NUEVO: Excluir pedidos internos
ORDER BY o.order_date DESC;

-- Comentario descriptivo
COMMENT ON VIEW v_pending_invoices_empresa IS 
'Vista de pedidos de empresas pendientes de facturar. Excluye pedidos con payment_status = Interno (retiros de proveedores).';
```

### ✅ Verificación

Después de ejecutar la migración, verifica que:

```sql
-- Debe retornar 0 filas (no hay pedidos internos pendientes)
SELECT COUNT(*) 
FROM v_pending_invoices_empresa 
WHERE payment_status = 'Interno';

-- Verificar que la vista funciona correctamente
SELECT order_id, customer_name, final_price, payment_status
FROM v_pending_invoices_empresa
LIMIT 10;
```

---

## 📝 Archivos Modificados

### 1. `components/facturas/invoice-form.tsx` ⭐ NUEVO SISTEMA
**Cambios principales:**
- ✅ Nuevo tipo `InvoiceEntry` para gestionar múltiples facturas
- ✅ Toggle "Múltiples Facturas" con UI completa
- ✅ Funciones: `addInvoiceEntry()`, `removeInvoiceEntry()`, `updateInvoiceEntry()`
- ✅ Validación: suma de facturas no puede exceder el total de pedidos
- ✅ Distribución proporcional de pedidos entre facturas
- ✅ Indicador visual de total disponible vs. total distribuido

**UI Nueva:**
- Card de gestión de facturas con badges numerados
- Campos por factura: número, fecha, monto, notas
- Botón "Agregar Factura" para múltiples entradas
- Validación en tiempo real con alertas visuales

### 2. `components/facturas/invoice-filters.tsx`
**Cambios principales:**
- ✅ Nuevo tipo `PeriodoTipo` con 5 opciones
- ✅ Select de períodos predefinidos
- ✅ Función `handlePeriodoChange()` que actualiza fechas automáticamente
- ✅ Integración con date-fns para cálculos de fechas

**Períodos disponibles:**
- Mes Actual
- Mes Anterior
- Trimestre (últimos 3 meses)
- Año (desde inicio de año)
- Personalizado (manual)

### 3. `app/facturas/page.tsx`
**Cambios principales:**
- ✅ Card de filtros separada del componente Tabs
- ✅ Filtrado por `invoice_date` en lugar de `order_date`
- ✅ Función `calculateMetrics()` actualizada para verificar fecha de facturación
- ✅ Comentarios `// CRÍTICO` para marcar lógica importante

**Estructura nueva:**
```
Header
↓
Métricas (4 cards)
↓
Card de Filtros (separada) ⭐ NUEVO
↓
Tabs (Facturas Emitidas | Pedidos Por Facturar)
```

---

## 🧪 Casos de Prueba

### Caso 1: Pedidos Internos NO Aparecen
```sql
-- Crear pedido interno de prueba
INSERT INTO "3t_orders" (order_id, customer_id, payment_status, final_price)
VALUES ('TEST-INTERNO', '[customer_id]', 'Interno', 50000);

-- Verificar que NO aparece en pendientes
SELECT * FROM v_pending_invoices_empresa WHERE order_id = 'TEST-INTERNO';
-- Debe retornar 0 filas ✅
```

### Caso 2: Crear Múltiples Facturas (Ejemplo: Pedido #15467aae)

**Escenario:**
- Pedido #15467aae: $225.000 (25 recargas + 25 botellones nuevos)
- Dividir en 2 facturas:
  - Factura 3517: $62.500 (recargas)
  - Factura 3535: $162.500 (botellones nuevos)

**Pasos:**
1. Ir a `/facturas`
2. Click en "Nueva Factura"
3. Seleccionar pedido #15467aae
4. Activar toggle "Múltiples Facturas"
5. Configurar factura 1:
   - Número: 3517
   - Fecha: 26 oct 2025
   - Monto: 62500
   - Notas: Recargas
6. Click "Agregar Factura"
7. Configurar factura 2:
   - Número: 3535
   - Fecha: 26 oct 2025
   - Monto: 162500
   - Notas: Botellones nuevos
8. Verificar: Total distribuido = $225.000 ✅
9. Guardar

**Resultado esperado:**
- 2 facturas creadas en `3t_invoices`
- 2 filas en tabla de facturas emitidas
- Ambos montos reflejados en métricas
- Pedido #15467aae marcado como facturado

### Caso 3: Filtros Predefinidos
1. Ir a `/facturas`
2. Seleccionar "Mes Anterior" en filtros
3. Verificar que fechas se actualizan automáticamente
4. Verificar que facturas filtradas corresponden al mes anterior

### Caso 4: Filtrado por Fecha de Facturación
1. Crear factura con fecha de hoy
2. Cambiar filtro a "Mes Anterior"
3. Verificar que la factura de hoy NO aparece ✅
4. Cambiar filtro a "Mes Actual"
5. Verificar que la factura de hoy SÍ aparece ✅

---

## 📊 Estructura de Datos

### Antes (Problema)
```
3t_orders:
  order_id: 15467aae
  invoice_number: "3517-3535" ❌ Solo texto
  final_price: 225000

3t_invoices:
  - Factura 3517 (existe)
  - Factura 3535 ❌ NO EXISTE → Monto no se refleja
```

### Después (Solución)
```
3t_orders:
  order_id: 15467aae
  invoice_number: null (se maneja en tabla de relación)
  final_price: 225000

3t_invoices:
  - Factura 3517: subtotal=$52,521, total=$62,500
  - Factura 3535: subtotal=$136,555, total=$162,500

3t_order_invoices:
  - {order: 15467aae, invoice: 3517, amount: 52521}
  - {order: 15467aae, invoice: 3535, amount: 136555}
```

---

## 🚀 Despliegue

### 1. Ejecutar Migración SQL
```bash
# Ir a Supabase Dashboard
# SQL Editor → New Query
# Pegar el SQL de arriba
# Run → Verificar éxito
```

### 2. Verificar Frontend
```bash
cd /opt/cane/3t
./dev.sh  # o ./prod.sh
```

### 3. Probar Funcionalidades
- [ ] Pedidos internos NO aparecen en pendientes
- [ ] Se pueden crear múltiples facturas
- [ ] Filtros predefinidos funcionan
- [ ] Total facturado usa invoice_date

---

## ⚠️ Notas Importantes

### Compatibilidad Retroactiva
- ✅ El sistema soporta facturas únicas (modo tradicional)
- ✅ El sistema soporta múltiples facturas (modo nuevo)
- ✅ Facturas antiguas siguen funcionando sin cambios

### Validaciones Implementadas
1. ✅ No se pueden crear facturas con números duplicados
2. ✅ La suma de múltiples facturas no puede exceder el total del pedido
3. ✅ Todas las facturas deben tener número, fecha y monto > 0
4. ✅ Al menos una factura si modo múltiple está activado

### Performance
- ✅ Vista SQL optimizada con índices existentes
- ✅ Queries paralelas para métricas
- ✅ Filtrado client-side solo cuando necesario

---

## 📞 Soporte

Si encuentras algún problema:
1. Verificar que la migración SQL se ejecutó correctamente
2. Verificar logs del contenedor: `./logs-prod.sh`
3. Verificar errores de linter: ninguno encontrado ✅

---

**Implementado por:** AI Assistant  
**Fecha:** 14 de noviembre de 2025  
**Versión:** 3.2.0

