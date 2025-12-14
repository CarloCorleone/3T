#!/bin/bash
# Script para iniciar la API ML

cd /opt/cane/3t/ml
source venv/bin/activate

echo "🚀 Iniciando API ML Agua Tres Torres..."
echo "📍 URL: http://localhost:8001"
echo "📚 Docs: http://localhost:8001/docs"
echo ""

python api/main.py
