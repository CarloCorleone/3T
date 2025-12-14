# 📂 Migraciones de Base de Datos - Agua Tres Torres

Directorio de migraciones SQL aplicadas al proyecto.

---

## 📋 Migraciones Aplicadas

### 004 - Sistema de Timestamps Automáticos
**Fecha:** 2025-10-20  
**Archivo:** `004_add_status_timestamp_triggers.sql`  
**Estado:** ✅ Aplicado y Testeado

**Cambios:**
- ✅ Campo `invoice_date` agregado a `"3t_orders"`
- ✅ Función `update_order_status_timestamps()` creada
- ✅ Función `update_purchase_status_timestamps()` creada
- ✅ Trigger `trg_update_order_timestamps` creado
- ✅ Trigger `trg_update_purchase_timestamps` creado

**Campos automáticos:**
- `delivered_date` → status = "Despachado"
- `invoice_date` → payment_status = "Facturado"
- `payment_date` → payment_status = "Pagado"
- `completed_date` → status = "Completado" (compras)

**Testing:** Ver `../TESTING-TRIGGERS-RESULTS.md`

---

## 🚀 Cómo Aplicar Migraciones

### Opción 1: Script automático
```bash
cd /opt/cane/3t
./scripts/apply-timestamp-triggers.sh
```

### Opción 2: Usando MCP Supabase en Cursor
```
"Aplica la migración migrations/004_add_status_timestamp_triggers.sql"
```

### Opción 3: Manualmente con psql
```bash
psql $DATABASE_URL -f migrations/004_add_status_timestamp_triggers.sql
```

---

## 📝 Convenciones

- **Formato de nombre:** `XXX_descripcion_corta.sql`
- **Numeración:** Secuencial de 3 dígitos (001, 002, 003...)
- **Estructura:**
  - Comentarios de encabezado
  - Pasos numerados
  - Verificaciones automáticas
  - Resumen final con NOTICE

---

**💧 Agua Tres Torres - Sistema de Gestión**

