#!/bin/bash

# Script para ejecutar ejemplo de A/B Testing

SCRIPT_DIR="/opt/cane/3t/ml"
VENV_PATH="$SCRIPT_DIR/venv"
PYTHON_SCRIPT="$SCRIPT_DIR/src/ab_testing_framework.py"

echo "🧪 A/B Testing Framework - Ejemplo de Uso"
echo "=========================================="
echo ""

# Verificar entorno virtual
if [ ! -d "$VENV_PATH" ]; then
    echo "❌ Error: Entorno virtual no encontrado en $VENV_PATH"
    exit 1
fi

# Activar entorno virtual
source "$VENV_PATH/bin/activate"

# Ejecutar ejemplo
echo "⏳ Ejecutando ejemplo de experimento A/B..."
echo ""

python "$PYTHON_SCRIPT"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Ejemplo ejecutado exitosamente"
    echo ""
    echo "📂 Archivos generados:"
    echo "   → Experimentos: $SCRIPT_DIR/experiments/"
    echo "   → Reportes: $SCRIPT_DIR/reports/ab_tests/"
    echo ""
    echo "💡 Para integrar con producción:"
    echo "   1. Conectar con Supabase para obtener customer_ids reales"
    echo "   2. Registrar outcomes desde la app 3T cuando se crean pedidos"
    echo "   3. Calcular métricas al finalizar el experimento"
    echo ""
    echo "📚 Consulta la guía completa: $SCRIPT_DIR/docs/AB_TESTING_GUIDE.md"
else
    echo ""
    echo "❌ Error durante la ejecución"
    exit 1
fi

