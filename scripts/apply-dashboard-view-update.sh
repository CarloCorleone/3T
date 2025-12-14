#!/bin/bash

# Script para actualizar la vista 3t_dashboard_ventas
# Fecha: 2025-10-28
# Descripción: Actualiza la vista para incluir invoice_number, invoice_date y payment_date

set -euo pipefail

echo "======================================"
echo "Actualizando Vista 3t_dashboard_ventas"
echo "======================================"
echo ""

# Verificar que existe el archivo de migración
MIGRATION_FILE="/opt/cane/3t/migrations/006_update_dashboard_ventas_view.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Archivo de migración no encontrado: $MIGRATION_FILE"
  exit 1
fi

echo "✅ Archivo de migración encontrado"
echo ""
echo "📝 Contenido de la migración:"
echo "--------------------------------------"
cat "$MIGRATION_FILE"
echo "--------------------------------------"
echo ""
echo "⚠️  Esta migración va a:"
echo "   1. Eliminar la vista actual 3t_dashboard_ventas"
echo "   2. Recrearla con las siguientes columnas adicionales:"
echo "      - invoice_number (número de factura)"
echo "      - invoice_date (fecha de facturación)"
echo "      - payment_date (fecha de pago)"
echo "      - details (observaciones del pedido)"
echo ""
echo "🔍 Para aplicar esta migración manualmente:"
echo "   1. Abre Supabase SQL Editor"
echo "   2. Copia y pega el contenido de:"
echo "      $MIGRATION_FILE"
echo "   3. Ejecuta la consulta"
echo ""
echo "✅ Después de aplicar, los números de factura antiguos se mostrarán correctamente"
echo ""
echo "======================================"
echo "Script completado"
echo "======================================"

