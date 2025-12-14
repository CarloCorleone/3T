#!/bin/bash
# Script de deployment para Agua Tres Torres
# Uso: ./scripts/deploy.sh

set -euo pipefail

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando deployment de Agua Tres Torres${NC}\n"

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encuentra package.json${NC}"
    echo "Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# 2. Verificar variables de entorno
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  Advertencia: .env.local no encontrado${NC}"
    echo "Creando .env.local desde .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo -e "${YELLOW}Por favor edita .env.local con tus credenciales${NC}"
        exit 1
    else
        echo -e "${RED}❌ Error: .env.example tampoco existe${NC}"
        exit 1
    fi
fi

# 3. Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker no está corriendo${NC}"
    exit 1
fi

# 4. Verificar que la red cane_net existe
if ! docker network inspect cane_net > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Red cane_net no existe. Creándola...${NC}"
    docker network create cane_net
    echo -e "${GREEN}✓ Red cane_net creada${NC}"
fi

# 5. Detener contenedor actual si existe
if docker ps -a | grep -q agua-tres-torres; then
    echo -e "${YELLOW}Deteniendo contenedor existente...${NC}"
    docker compose down
fi

# 6. Limpiar imágenes antiguas
echo -e "${YELLOW}Limpiando imágenes antiguas...${NC}"
docker image prune -f

# 7. Build de la nueva imagen
echo -e "${GREEN}Building nueva imagen...${NC}"
docker compose build --no-cache

# 8. Iniciar servicio
echo -e "${GREEN}Iniciando servicio...${NC}"
docker compose up -d

# 9. Esperar a que el servicio esté listo
echo -e "${YELLOW}Esperando a que el servicio esté listo...${NC}"
sleep 10

# 10. Verificar estado
if docker ps | grep -q agua-tres-torres; then
    echo -e "\n${GREEN}✅ Deployment exitoso!${NC}\n"
    echo -e "📊 Estado del contenedor:"
    docker compose ps
    echo -e "\n📝 Para ver logs:"
    echo -e "   docker compose logs -f\n"
    echo -e "🌐 Aplicación disponible en:"
    echo -e "   http://localhost:3500\n"
else
    echo -e "\n${RED}❌ Error: El contenedor no está corriendo${NC}\n"
    echo -e "Ver logs con: docker compose logs"
    exit 1
fi

# 11. Mostrar recursos
echo -e "${YELLOW}📈 Uso de recursos:${NC}"
docker stats agua-tres-torres --no-stream

echo -e "\n${GREEN}🎉 Deployment completado!${NC}"

