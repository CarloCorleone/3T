#!/bin/bash
# Script para modo desarrollo

echo "🔧 Iniciando modo DESARROLLO (en paralelo con producción)..."
echo ""
echo "⏸️  Producción permanecerá activa en puerto 3002..."
# docker compose -f docker-compose.yml down 2>/dev/null # COMENTADO: No bajar producción

echo "▶️  Iniciando contenedor de desarrollo..."
docker compose -f docker-compose.dev.yml up -d

echo ""
echo "⏳ Esperando que Next.js inicie..."
sleep 8

echo ""
echo "✅ Modo desarrollo activo!"
echo "🌐 Accede a: https://dev.3t.loopia.cl"
echo "📋 Ver logs: docker logs -f 3t-app-dev"
echo ""
echo "💡 Los cambios en el código se reflejan automáticamente"
echo "🛑 Para detener: docker compose -f docker-compose.dev.yml down"
echo ""
echo "🔥 Hot reload activado - Edita archivos y guarda para ver cambios instantáneos"

