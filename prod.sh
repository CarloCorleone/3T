#!/bin/bash
# Script para modo producción

echo "🚀 Cambiando a modo PRODUCCIÓN..."
echo ""
echo "⏸️  Modo desarrollo permanecerá activo..."
# docker compose -f docker-compose.dev.yml down 2>/dev/null # COMENTADO: No bajar desarrollo

echo "🔨 Construyendo imagen de producción..."
docker compose -f docker-compose.yml build

echo "▶️  Iniciando contenedor de producción..."
docker compose -f docker-compose.yml up -d

echo ""
echo "⏳ Esperando health check..."
sleep 10

echo ""
docker ps | grep 3t-app

echo ""
echo "✅ Modo producción activo!"
echo "🌐 Accede a: https://3t.loopia.cl"
echo "📋 Ver logs: docker logs -f 3t-app"

