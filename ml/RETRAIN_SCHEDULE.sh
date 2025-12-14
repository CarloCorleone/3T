#!/bin/bash

# Script para programar re-entrenamiento mensual automático
# Configura un cron job para ejecutar el pipeline el día 1 de cada mes

SCRIPT_DIR="/opt/cane/3t/ml"
VENV_PATH="$SCRIPT_DIR/venv"
PYTHON_SCRIPT="$SCRIPT_DIR/src/retrain_pipeline.py"
LOG_FILE="$SCRIPT_DIR/reports/retrain_cron.log"

echo "🔄 Configurando re-entrenamiento automático mensual..."
echo ""

# Verificar que el script de Python existe
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "❌ Error: $PYTHON_SCRIPT no encontrado"
    exit 1
fi

# Verificar que el entorno virtual existe
if [ ! -d "$VENV_PATH" ]; then
    echo "❌ Error: Entorno virtual no encontrado en $VENV_PATH"
    exit 1
fi

# Crear comando cron
CRON_COMMAND="0 2 1 * * cd $SCRIPT_DIR && source $VENV_PATH/bin/activate && python $PYTHON_SCRIPT >> $LOG_FILE 2>&1"

echo "📅 Cron Job que se configurará:"
echo "   → Se ejecutará el día 1 de cada mes a las 02:00 AM"
echo "   → Comando: $CRON_COMMAND"
echo ""

# Agregar cron job (sin duplicar)
(crontab -l 2>/dev/null | grep -v "$PYTHON_SCRIPT"; echo "$CRON_COMMAND") | crontab -

if [ $? -eq 0 ]; then
    echo "✅ Cron job configurado exitosamente"
    echo ""
    echo "📋 Cron jobs actuales:"
    crontab -l | grep -E "retrain_pipeline|Cron"
    echo ""
    echo "💡 Para ver el log de ejecuciones:"
    echo "   tail -f $LOG_FILE"
    echo ""
    echo "🔧 Para editar el cron manualmente:"
    echo "   crontab -e"
    echo ""
    echo "🗑️ Para eliminar el cron job:"
    echo "   crontab -l | grep -v 'retrain_pipeline' | crontab -"
else
    echo "❌ Error al configurar cron job"
    exit 1
fi

echo ""
echo "🧪 ¿Quieres ejecutar una prueba manual ahora? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "⏳ Ejecutando re-entrenamiento de prueba..."
    cd "$SCRIPT_DIR"
    source "$VENV_PATH/bin/activate"
    python "$PYTHON_SCRIPT"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Re-entrenamiento de prueba completado"
        echo "📊 Verifica los reportes en: $SCRIPT_DIR/reports/"
    else
        echo ""
        echo "❌ Error durante el re-entrenamiento de prueba"
        echo "📄 Revisa los logs en: $LOG_FILE"
    fi
fi

echo ""
echo "🎉 Configuración completada"

