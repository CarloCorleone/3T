#!/bin/bash
set -euo pipefail

#===============================================================================
# Script: ensure-prod.sh
# Descripción: Asegura que la aplicación 3t esté en modo producción
# Uso: ./ensure-prod.sh
# Cron: 0 6 * * * /opt/cane/3t/scripts/ensure-prod.sh
#===============================================================================

# Directorio del proyecto
PROJECT_DIR="/opt/cane/3t"
LOGS_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOGS_DIR}/ensure-prod.log"

# Crear directorio de logs si no existe
mkdir -p "$LOGS_DIR"

# Rotación de logs: mantener solo las últimas 5 copias
rotate_logs() {
    if [ -f "$LOG_FILE" ]; then
        # Obtener tamaño del archivo en bytes
        SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo "0")
        
        # Si el archivo es mayor a 5MB, rotar
        if [ "$SIZE" -gt 5242880 ]; then
            local DATE_SUFFIX=$(date '+%Y-%m-%d-%H%M%S')
            mv "$LOG_FILE" "${LOGS_DIR}/ensure-prod-${DATE_SUFFIX}.log"
            
            # Mantener solo las últimas 5 copias rotadas
            cd "$LOGS_DIR"
            ls -t ensure-prod-*.log 2>/dev/null | tail -n +6 | xargs -r rm -f
        fi
    fi
}

# Rotar logs antes de empezar
rotate_logs

# Redirigir todo el output al log
exec >> "$LOG_FILE" 2>&1

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Timestamp para logs
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=================================================="
echo "[$TIMESTAMP] 🔍 Verificando estado de Agua 3T"
echo "=================================================="

# Cambiar al directorio del proyecto
cd "$PROJECT_DIR"

# Función para verificar si un contenedor está corriendo
container_running() {
    local container_name=$1
    docker ps --filter "name=$container_name" --filter "status=running" --format '{{.Names}}' | grep -q "^${container_name}$"
}

# Verificar contenedor de producción
if container_running "3t-app"; then
    echo -e "${GREEN}✅ Contenedor de producción (3t-app) está corriendo${NC}"
    PROD_STATUS="running"
else
    echo -e "${RED}❌ Contenedor de producción (3t-app) NO está corriendo${NC}"
    PROD_STATUS="stopped"
fi

# Verificar contenedor de desarrollo
if container_running "3t-app-dev"; then
    echo -e "${YELLOW}⚠️  Contenedor de desarrollo (3t-app-dev) está corriendo${NC}"
    DEV_STATUS="running"
else
    echo "ℹ️  Contenedor de desarrollo (3t-app-dev) está detenido"
    DEV_STATUS="stopped"
fi

# Acción: Asegurar producción
if [ "$PROD_STATUS" = "stopped" ]; then
    echo ""
    echo "[$TIMESTAMP] 🚀 Iniciando modo producción..."
    
    # Detener desarrollo si está corriendo
    if [ "$DEV_STATUS" = "running" ]; then
        echo "  → Deteniendo contenedor de desarrollo..."
        docker compose -f docker-compose.dev.yml down 2>/dev/null || true
    fi
    
    # Iniciar producción
    echo "  → Iniciando contenedor de producción..."
    docker compose -f docker-compose.yml up -d
    
    # Esperar 10 segundos para que arranque
    echo "  → Esperando arranque del contenedor..."
    sleep 10
    
    # Verificar que arrancó correctamente
    if container_running "3t-app"; then
        echo -e "${GREEN}✅ Producción iniciada correctamente${NC}"
        
        # Verificar health check
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' 3t-app 2>/dev/null || echo "no-healthcheck")
        echo "  → Health status: $HEALTH"
        
    else
        echo -e "${RED}❌ Error: No se pudo iniciar el contenedor de producción${NC}"
        echo "  → Revisando logs..."
        docker logs --tail 20 3t-app 2>&1 || echo "No se pudieron obtener logs"
        exit 1
    fi
    
elif [ "$DEV_STATUS" = "running" ]; then
    echo ""
    echo "[$TIMESTAMP] 🔄 Cambiando de desarrollo a producción..."
    
    # Detener desarrollo
    echo "  → Deteniendo contenedor de desarrollo..."
    docker compose -f docker-compose.dev.yml down
    
    # Iniciar producción
    echo "  → Iniciando contenedor de producción..."
    docker compose -f docker-compose.yml up -d
    
    # Esperar 10 segundos
    echo "  → Esperando arranque del contenedor..."
    sleep 10
    
    # Verificar
    if container_running "3t-app"; then
        echo -e "${GREEN}✅ Cambio a producción completado${NC}"
    else
        echo -e "${RED}❌ Error en el cambio a producción${NC}"
        exit 1
    fi
    
else
    echo ""
    echo -e "${GREEN}✅ Sistema OK: Producción corriendo, desarrollo detenido${NC}"
fi

# Resumen final
echo ""
echo "=================================================="
echo "[$TIMESTAMP] 📊 Estado Final:"
echo "=================================================="
docker ps --filter "name=3t-app" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Error obteniendo estado"

echo ""
echo -e "${GREEN}✅ Verificación completada${NC}"
echo "🌐 Aplicación disponible en: https://3t.loopia.cl"
echo ""

