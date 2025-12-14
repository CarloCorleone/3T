# ============================================
# Dockerfile - Entorno ML para Agua Tres Torres
# ============================================
# Imagen base con Python 3.10 (compatible con scikit-learn, XGBoost, Prophet)
FROM python:3.10-slim

# Metadata
LABEL maintainer="Proyecto Cane - 3T ML"
LABEL version="1.0.0"
LABEL description="Contenedor ML para predicciones de demanda, churn, rutas y precios dinámicos"

# Variables de entorno
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar requirements.txt primero (para cache de Docker)
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY src/ ./src/
COPY api/ ./api/

# Crear directorios para datos y modelos
RUN mkdir -p /app/data/raw /app/data/processed /app/models /app/notebooks

# Exponer puerto para FastAPI (cuando se implemente)
EXPOSE 8001

# Usuario no-root para seguridad
RUN useradd -m -u 1000 mluser && chown -R mluser:mluser /app
USER mluser

# Comando por defecto: bash interactivo (se sobreescribe en docker-compose)
CMD ["/bin/bash"]

