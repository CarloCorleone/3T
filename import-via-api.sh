#!/bin/bash
set -e

echo "🚀 Importando Workflows de Chat 3T a n8n..."
echo ""

# Configuración de n8n (ajusta según tu setup)
N8N_HOST="${N8N_HOST:-http://localhost:5678}"
N8N_API_KEY="${N8N_API_KEY:-}"

# Array de workflows a importar
workflows=(
    "/tmp/import_M2vrCNU9HR1Dvyle.json:Chat 3T"
    "/tmp/import_RK8QUHf5UHMGLtAI.json:Chat 3T copy"
    "/tmp/import_Zhh5cz6K9ud4WmcO.json:Chat 3T Pro - Con Gráficos"
    "/tmp/import_qCISojqHcn9JCxKu.json:Chat 3T Pro - Con Redis Memory"
)

success=0
failed=0

for workflow in "${workflows[@]}"; do
    IFS=':' read -r filepath name <<< "$workflow"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Importando: $name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ ! -f "$filepath" ]; then
        echo "❌ Archivo no encontrado: $filepath"
        ((failed++))
        continue
    fi
    
    # Importar usando curl
    response=$(curl -s -X POST \
        "${N8N_HOST}/api/v1/workflows" \
        -H "Content-Type: application/json" \
        -d @"$filepath" \
        2>&1)
    
    if echo "$response" | grep -q '"id"'; then
        workflow_id=$(echo "$response" | jq -r '.id' 2>/dev/null || echo "unknown")
        echo "✅ Importado exitosamente"
        echo "   ID: $workflow_id"
        echo "   URL: ${N8N_HOST}/workflow/$workflow_id"
        ((success++))
    else
        echo "❌ Error al importar"
        echo "   Respuesta: $response"
        ((failed++))
    fi
    
    echo ""
    sleep 1
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resumen:"
echo "   ✅ Exitosos: $success"
echo "   ❌ Fallidos: $failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

