#!/bin/bash
set -euo pipefail

cd /opt/cane/3t/ml

echo "🚀 Deploying ML API..."

# Detener contenedor si existe
docker-compose down 2>/dev/null || true

# Build
echo "📦 Building Docker image..."
docker-compose build --no-cache

# Start
echo "🏃 Starting container..."
docker-compose up -d

# Wait for health check
echo "⏳ Waiting for health check..."
sleep 10

# Verify
if docker ps | grep -q "3t-ml-api"; then
    echo "✅ ML API deployed successfully"
    echo "📊 API running on http://localhost:8001"
    echo ""
    echo "📋 Logs (últimas 20 líneas):"
    docker logs 3t-ml-api --tail=20
    echo ""
    echo "🔍 Health check:"
    curl -f http://localhost:8001/health 2>/dev/null || echo "⚠️  Health check falló (normal si modelos no están entrenados aún)"
else
    echo "❌ Deployment failed"
    echo "📋 Logs completos:"
    docker logs 3t-ml-api
    exit 1
fi

