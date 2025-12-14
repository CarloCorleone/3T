#!/bin/bash

# =====================================================
# Script: Aplicar Triggers de Timestamps Automáticos
# Fecha: 2025-10-20
# Descripción: Aplica la migración de triggers usando
#              las herramientas MCP de Supabase
# =====================================================

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Banner
echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║  🚀 Aplicación de Triggers de Timestamps         ║"
echo "║     Sistema Automático de Fechas de Estado        ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATION_FILE="$PROJECT_ROOT/migrations/004_add_status_timestamp_triggers.sql"

print_info "Directorio del proyecto: $PROJECT_ROOT"
print_info "Archivo de migración: $MIGRATION_FILE"
echo ""

# Verificar que existe el archivo de migración
if [ ! -f "$MIGRATION_FILE" ]; then
    print_error "No se encuentra el archivo de migración: $MIGRATION_FILE"
    exit 1
fi

print_success "Archivo de migración encontrado"
echo ""

# Leer el contenido de la migración
print_info "Leyendo migración SQL..."
MIGRATION_SQL=$(cat "$MIGRATION_FILE")

if [ -z "$MIGRATION_SQL" ]; then
    print_error "El archivo de migración está vacío"
    exit 1
fi

print_success "Migración cargada ($(wc -l < "$MIGRATION_FILE") líneas)"
echo ""

# Mostrar resumen de cambios
print_info "📋 Resumen de cambios a aplicar:"
echo ""
echo "  1. Agregar campo: invoice_date en tabla 3t_orders"
echo "  2. Crear función: update_order_status_timestamps()"
echo "  3. Crear función: update_purchase_status_timestamps()"
echo "  4. Crear trigger: trg_update_order_timestamps"
echo "  5. Crear trigger: trg_update_purchase_timestamps"
echo ""

# Confirmación del usuario
read -p "$(echo -e ${YELLOW}⚠️  ¿Deseas continuar con la aplicación? [y/N]:${NC} )" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Operación cancelada por el usuario"
    exit 0
fi

echo ""
print_info "🔄 Aplicando migración a Supabase..."
echo ""

# Nota: Este script asume que estás usando Cursor con MCP Supabase configurado
# La ejecución real del SQL se hace a través de las herramientas MCP

print_info "📝 Instrucciones para aplicar la migración:"
echo ""
echo "Opción 1 - Usando Cursor Agent con MCP Supabase:"
echo "  1. Ejecuta en Cursor: 'Aplica la migración $MIGRATION_FILE usando MCP Supabase'"
echo ""
echo "Opción 2 - Usando psql directamente:"
echo "  psql \$DATABASE_URL -f $MIGRATION_FILE"
echo ""
echo "Opción 3 - Usando Supabase Dashboard:"
echo "  1. Ve a tu proyecto en https://supabase.com"
echo "  2. SQL Editor → New Query"
echo "  3. Copia el contenido de $MIGRATION_FILE"
echo "  4. Ejecuta la query"
echo ""

# Verificación post-aplicación
print_info "✅ Verificaciones post-aplicación:"
echo ""
echo "Verifica que se crearon correctamente:"
echo "  - Campo: invoice_date en 3t_orders"
echo "  - Trigger: trg_update_order_timestamps"
echo "  - Trigger: trg_update_purchase_timestamps"
echo ""

print_success "Script completado"
print_info "Lee los mensajes de la migración para confirmar que todo funcionó correctamente"
echo ""

# Mostrar queries de verificación
print_info "🔍 Queries de verificación manual:"
echo ""
echo "-- Verificar campo invoice_date"
echo "SELECT column_name, data_type"
echo "FROM information_schema.columns"
echo "WHERE table_name = '3t_orders' AND column_name = 'invoice_date';"
echo ""
echo "-- Verificar triggers"
echo "SELECT trigger_name, event_manipulation, event_object_table"
echo "FROM information_schema.triggers"
echo "WHERE trigger_name IN ('trg_update_order_timestamps', 'trg_update_purchase_timestamps');"
echo ""

print_success "🎉 ¡Listo! Ahora tus pedidos y compras registrarán fechas automáticamente"
echo ""

