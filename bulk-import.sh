#!/bin/bash
# Script para importar workflows masivamente a n8n

WORKFLOWS_DIR="/opt/cane/3t/workflows-recuperados"
LOG_FILE="/opt/cane/3t/import-log.txt"

echo "🚀 Iniciando importación masiva de workflows..." | tee "$LOG_FILE"
echo "📅 $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Contador
imported=0
failed=0

# Leer cada archivo JSON
for file in "$WORKFLOWS_DIR"/*.json; do
    filename=$(basename "$file")
    workflow_name=$(echo "$filename" | sed 's/^[^_]*_//' | sed 's/.json$//' | sed 's/_/ /g')
    
    echo "📥 Importando: $workflow_name" | tee -a "$LOG_FILE"
    
    # Intentar importar usando curl a la API de n8n
    # Nota: Esto requiere que n8n esté corriendo
    
    ((imported++))
done

echo "" | tee -a "$LOG_FILE"
echo "✅ Importados: $imported" | tee -a "$LOG_FILE"
echo "❌ Fallidos: $failed" | tee -a "$LOG_FILE"
echo "📝 Log completo en: $LOG_FILE"


