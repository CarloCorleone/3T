# 🚀 Instalación Completa - Agua Tres Torres

Guía completa paso a paso para implementar el sistema desde cero en un nuevo servidor.

---

## 📋 Índice

1. [Pre-requisitos](#-pre-requisitos)
2. [Preparación del Servidor](#-preparación-del-servidor)
3. [Configuración de Supabase](#-configuración-de-supabase)
4. [Configuración de Google Maps API](#-configuración-de-google-maps-api)
5. [Instalación de Docker](#-instalación-de-docker)
6. [Configuración de Nginx Proxy Manager](#-configuración-de-nginx-proxy-manager)
7. [Despliegue de la Aplicación](#-despliegue-de-la-aplicación)
8. [Verificación y Pruebas](#-verificación-y-pruebas)
9. [Mantenimiento](#-mantenimiento)
10. [Troubleshooting](#-troubleshooting)

---

## 🎯 Pre-requisitos

### Infraestructura Necesaria

| Recurso | Especificación | Notas |
|---------|---------------|-------|
| **Servidor** | VPS Linux (Ubuntu 20.04+) | 2 GB RAM mínimo, 4 GB recomendado |
| **Almacenamiento** | 20 GB mínimo | Para Docker, imágenes y logs |
| **Dominio** | Dominio propio | Para SSL/HTTPS |
| **IP Pública** | IP estática | Para apuntar el dominio |
| **Puerto 80/443** | Abiertos | Para HTTP/HTTPS |

### Servicios Externos

- **Supabase**: Cuenta gratuita o de pago
- **Google Cloud Platform**: Cuenta con Google Maps API
- **DNS**: Acceso para configurar registros A/CNAME

### Conocimientos Requeridos

- ✅ Acceso SSH a servidor Linux
- ✅ Comandos básicos de terminal
- ✅ Conceptos de Docker y contenedores
- ✅ Configuración DNS básica

---

## 🖥️ Preparación del Servidor

### 1. Actualizar Sistema Operativo

```bash
# Conectarse al servidor via SSH
ssh root@tu-servidor-ip

# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar utilidades básicas
sudo apt install -y curl wget git vim ufw net-tools
```

### 2. Configurar Firewall

```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verificar reglas
sudo ufw status
```

**Salida esperada:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                     ALLOW       Anywhere
```

### 3. Crear Estructura de Directorios

```bash
# Crear directorio principal del proyecto
sudo mkdir -p /opt/cane/3t
sudo mkdir -p /opt/cane/env
sudo mkdir -p /opt/cane/volumes/3t
sudo mkdir -p /opt/cane/backups

# Asignar permisos
sudo chown -R $USER:$USER /opt/cane

# Navegar al directorio
cd /opt/cane/3t
```

---

## 🗄️ Configuración de Supabase

### 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Click en "Start your project"
3. Crea una cuenta o inicia sesión
4. Click en "New Project"
5. Configuración:
   - **Name**: `agua-tres-torres` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura (guárdala)
   - **Region**: South America (São Paulo) - más cercano a Chile
   - **Pricing Plan**: Free (o Pro si necesitas más recursos)
6. Click en "Create new project"
7. Espera 2-3 minutos mientras se crea el proyecto

### 2. Obtener Credenciales

Una vez creado el proyecto:

1. Ve a **Settings** (⚙️) → **API**
2. Copia las siguientes credenciales:

```bash
# Project URL
https://tu-proyecto-id.supabase.co

# Anon (public) key
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...

# Service role key (¡NUNCA expongas esta clave!)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
```

3. Guárdalas en un lugar seguro temporalmente

### 3. Crear Tablas de Base de Datos

Ve a **SQL Editor** en Supabase y ejecuta el siguiente script:

```sql
-- =====================================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS
-- Agua Tres Torres - Sistema de Gestión
-- =====================================================

-- Tabla: Clientes
CREATE TABLE IF NOT EXISTS public.3t_customers (
    customer_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    customer_type TEXT CHECK (customer_type IN ('Hogar', 'Empresa')),
    phone TEXT,
    email TEXT,
    price INTEGER DEFAULT 3000, -- Precio de recarga en CLP
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: Direcciones
CREATE TABLE IF NOT EXISTS public.3t_addresses (
    address_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.3t_customers(customer_id) ON DELETE CASCADE,
    raw_address TEXT NOT NULL, -- Dirección completa formateada
    commune TEXT, -- Comuna
    street_name TEXT,
    street_number TEXT,
    apartment TEXT,
    directions TEXT, -- Indicaciones adicionales
    region TEXT DEFAULT 'Región Metropolitana',
    latitude NUMERIC(10, 8), -- Coordenadas GPS
    longitude NUMERIC(11, 8),
    maps_link TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: Productos
CREATE TABLE IF NOT EXISTS public.3t_products (
    product_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('Contrato', 'Venta')),
    price_neto INTEGER NOT NULL, -- Precio neto en CLP
    pv_iva_inc INTEGER GENERATED ALWAYS AS (CAST(price_neto * 1.19 AS INTEGER)) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: Pedidos
CREATE TABLE IF NOT EXISTS public.3t_orders (
    order_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.3t_customers(customer_id) ON DELETE RESTRICT,
    delivery_address_id UUID REFERENCES public.3t_addresses(address_id) ON DELETE RESTRICT,
    product_type UUID NOT NULL REFERENCES public.3t_products(product_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    botellones_entregados INTEGER,
    status TEXT CHECK (status IN ('Pedido', 'Ruta', 'Despachado')) DEFAULT 'Pedido',
    payment_status TEXT CHECK (payment_status IN ('Pendiente', 'Pagado', 'Facturado')) DEFAULT 'Pendiente',
    payment_type TEXT CHECK (payment_type IN ('Efectivo', 'Transferencia')),
    final_price INTEGER,
    order_date DATE DEFAULT CURRENT_DATE,
    delivered_date TIMESTAMP WITH TIME ZONE,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: Usuarios del sistema
CREATE TABLE IF NOT EXISTS public.3t_users (
    user_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT CHECK (role IN ('admin', 'conductor', 'vendedor')) DEFAULT 'conductor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON public.3t_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.3t_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_address ON public.3t_orders(delivery_address_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.3t_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.3t_orders(status);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.3t_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.3t_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.3t_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.3t_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.3t_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calcular precio final automáticamente
CREATE OR REPLACE FUNCTION set_final_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  qty         INTEGER;
  unit_price  INTEGER;
  cat         TEXT;
BEGIN
  -- Usar botellones_entregados si existe, sino usar quantity
  qty := COALESCE(NEW.botellones_entregados, NEW.quantity);
  
  -- Obtener categoría del producto
  SELECT p.category
    INTO cat
  FROM   public.3t_products p
  WHERE  p.product_id = NEW.product_type;
  
  -- Si es "Venta", usar precio del producto con IVA
  IF cat = 'Venta' THEN
    SELECT p.pv_iva_inc
      INTO unit_price
    FROM   public.3t_products p
    WHERE  p.product_id = NEW.product_type;
  -- Si es "Contrato", usar precio del cliente
  ELSE
    SELECT c.price
      INTO unit_price
    FROM   public.3t_customers c
    WHERE  c.customer_id = NEW.customer_id;
  END IF;
  
  -- Calcular precio final
  NEW.final_price := unit_price * qty;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_final_price
BEFORE INSERT OR UPDATE ON public.3t_orders
FOR EACH ROW
EXECUTE FUNCTION set_final_price();

-- Habilitar Row Level Security (opcional, para producción)
-- ALTER TABLE public.3t_customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.3t_addresses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.3t_products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.3t_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.3t_users ENABLE ROW LEVEL SECURITY;

-- Políticas de ejemplo (ajustar según necesidades)
-- CREATE POLICY "Permitir lectura pública"
--   ON public.3t_customers FOR SELECT
--   USING (true);

COMMENT ON TABLE public.3t_customers IS 'Clientes del sistema - Hogar y Empresa';
COMMENT ON TABLE public.3t_addresses IS 'Direcciones de entrega - Múltiples por cliente';
COMMENT ON TABLE public.3t_products IS 'Productos disponibles - Contrato y Venta';
COMMENT ON TABLE public.3t_orders IS 'Pedidos con cálculo automático de precios';
COMMENT ON TABLE public.3t_users IS 'Usuarios del sistema con roles';
```

4. Click en **RUN** para ejecutar el script
5. Verifica que todas las tablas se crearon correctamente:
   - Ve a **Table Editor**
   - Deberías ver: `3t_customers`, `3t_addresses`, `3t_products`, `3t_orders`, `3t_users`

### 4. Datos de Ejemplo (Opcional)

Si quieres probar con datos de ejemplo:

```sql
-- Insertar cliente de ejemplo
INSERT INTO public.3t_customers (name, customer_type, phone, email, price)
VALUES ('Cliente de Prueba', 'Hogar', '+56912345678', 'prueba@ejemplo.cl', 3000);

-- Insertar producto de ejemplo
INSERT INTO public.3t_products (name, category, price_neto)
VALUES ('Botellón 20L', 'Venta', 5000);

-- El campo pv_iva_inc se calculará automáticamente como 5950
```

---

## 🗺️ Configuración de Google Maps API

### 1. Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Click en el selector de proyectos (arriba a la izquierda)
4. Click en "Nuevo proyecto"
5. Configuración:
   - **Nombre**: `agua-tres-torres-maps`
   - **Organización**: (dejar por defecto)
6. Click en "Crear"

### 2. Habilitar Facturación

**Nota:** Google Maps requiere tarjeta de crédito, pero ofrece $200 USD gratis/mes.

1. Ve al menú ☰ → "Facturación"
2. Click en "Vincular una cuenta de facturación"
3. Completa información de pago
4. ✅ No se te cobrará si te mantienes bajo el límite gratuito

### 3. Habilitar APIs Necesarias

1. Ve al menú ☰ → "APIs y servicios" → "Biblioteca"
2. Busca y habilita **UNA POR UNA**:

| API | Uso | Obligatorio |
|-----|-----|-------------|
| **Maps JavaScript API** | Mapas interactivos | ✅ Sí |
| **Places API** | Autocompletado de direcciones | ✅ Sí |
| **Directions API** | Optimización de rutas | ✅ Sí |
| **Distance Matrix API** | Cálculo de distancias | ✅ Sí |
| **Geocoding API** | Conversión dirección ↔ coordenadas | ✅ Sí |

**⚠️ IMPORTANTE**: Habilita **"Places API"** (la versión antigua), **NO** "Places API (New)"

### 4. Crear API Key

1. Ve a "APIs y servicios" → "Credenciales"
2. Click en "+ CREAR CREDENCIALES"
3. Selecciona "Clave de API"
4. Se generará una API Key: `AIzaSy...`
5. **¡No cierres aún!** Ahora vamos a restringirla por seguridad

### 5. Restringir API Key

1. Click en el nombre de la API Key recién creada
2. En "Restricciones de aplicación":
   - Selecciona **"Referentes HTTP (sitios web)"**
   - Agrega los siguientes referentes:
     ```
     https://3t.loopia.cl/*
     https://tu-dominio.cl/*
     http://localhost:3000/*
     http://localhost:3002/*
     ```
3. En "Restricciones de API":
   - Selecciona **"Restringir clave"**
   - Marca las 5 APIs habilitadas anteriormente:
     - Maps JavaScript API ✅
     - Places API ✅
     - Directions API ✅
     - Distance Matrix API ✅
     - Geocoding API ✅
4. Click en "GUARDAR"

### 6. Verificar Configuración

```bash
# Probar que la API Key funciona (desde tu computadora local)
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Santiago+Chile&key=TU_API_KEY"

# Deberías recibir un JSON con coordenadas de Santiago
```

### 7. Guardar API Key

Guarda la API Key temporalmente, la usaremos más adelante en las variables de entorno.

**Ejemplo:**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAXrpiBCEo9uNd_ohkLNakm1VzlmKbV1p0
```

---

## 🐳 Instalación de Docker

### 1. Desinstalar Versiones Antiguas (si existen)

```bash
sudo apt remove docker docker-engine docker.io containerd runc
```

### 2. Instalar Docker

```bash
# Actualizar índice de paquetes
sudo apt update

# Instalar dependencias
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Agregar clave GPG oficial de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Agregar repositorio de Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Actualizar índice de paquetes nuevamente
sudo apt update

# Instalar Docker Engine
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verificar instalación
docker --version
# Salida esperada: Docker version 24.0.x, build ...
```

### 3. Configurar Permisos de Usuario

```bash
# Agregar usuario actual al grupo docker
sudo usermod -aG docker $USER

# Aplicar cambios sin cerrar sesión
newgrp docker

# Verificar que funciona sin sudo
docker ps
# Debería mostrar lista vacía de contenedores, sin errores
```

### 4. Instalar Docker Compose

```bash
# Verificar instalación de Docker Compose (viene con Docker Engine moderno)
docker compose version
# Salida esperada: Docker Compose version v2.x.x

# Si no está instalado, instalarlo manualmente:
# sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
# sudo chmod +x /usr/local/bin/docker-compose
```

### 5. Crear Red Docker Compartida

```bash
# Crear red para comunicación entre contenedores
docker network create cane_net

# Verificar que se creó
docker network ls | grep cane_net
# Salida esperada: una línea con "cane_net"
```

### 6. Habilitar Docker al Inicio

```bash
# Habilitar servicio Docker
sudo systemctl enable docker
sudo systemctl enable containerd

# Verificar estado
sudo systemctl status docker
# Debe decir "active (running)"
```

---

## 🌐 Configuración de Nginx Proxy Manager

### 1. Instalar Nginx Proxy Manager

```bash
# Crear directorio para Nginx Proxy Manager
cd /opt/cane
mkdir -p nginx-proxy-manager
cd nginx-proxy-manager

# Crear docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  nginx-proxy-manager:
    image: 'jc21/nginx-proxy-manager:latest'
    container_name: nginx-proxy-manager-app
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
      - '81:81'  # Puerto admin
    environment:
      DB_SQLITE_FILE: "/data/database.sqlite"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - cane_net

networks:
  cane_net:
    external: true
EOF

# Levantar Nginx Proxy Manager
docker compose up -d

# Verificar que está corriendo
docker ps | grep nginx-proxy-manager
# Debe mostrar el contenedor con estado "Up"
```

### 2. Acceder al Panel de Administración

1. Abre en tu navegador: `http://TU_IP_SERVIDOR:81`
2. **Login inicial:**
   - Email: `admin@example.com`
   - Password: `changeme`
3. Te pedirá cambiar las credenciales
4. Configura tus datos:
   - **Email**: tu email real
   - **Password**: contraseña segura (guárdala)

### 3. Configurar DNS

Antes de continuar, configura tu dominio:

1. Ve al panel de tu proveedor de dominio (GoDaddy, Namecheap, etc.)
2. Crea un registro A:
   ```
   Tipo: A
   Nombre: 3t
   Valor: TU_IP_SERVIDOR
   TTL: 3600
   ```
3. Espera 5-10 minutos para propagación
4. Verifica:
   ```bash
   nslookup 3t.tu-dominio.cl
   # Debe mostrar tu IP del servidor
   ```

### 4. Crear Proxy Host en NPM

**Nota:** Haremos esto DESPUÉS de desplegar la aplicación, cuando el contenedor `3t-app` esté corriendo.

---

## 📦 Despliegue de la Aplicación

### 1. Clonar o Subir el Código

**Opción A: Si tienes Git configurado**
```bash
cd /opt/cane/3t
git clone https://tu-repositorio/agua-tres-torres.git .
```

**Opción B: Subir archivos manualmente**
```bash
# Desde tu computadora local, comprimir el proyecto
cd /ruta/a/tu/proyecto
tar -czf 3t-app.tar.gz .

# Subir al servidor con SCP
scp 3t-app.tar.gz root@TU_IP_SERVIDOR:/opt/cane/3t/

# En el servidor, extraer
cd /opt/cane/3t
tar -xzf 3t-app.tar.gz
rm 3t-app.tar.gz
```

**Opción C: Crear desde cero** (si sigues este tutorial)

La estructura completa de archivos está documentada en el `README.md` del proyecto.

### 2. Crear Archivo de Variables de Entorno

```bash
# Crear archivo .env centralizado
cat > /opt/cane/env/3t.env << 'EOF'
# ===================================================
# VARIABLES DE ENTORNO - AGUA TRES TORRES
# ===================================================

# Entorno
NODE_ENV=production
PORT=3002
NEXT_TELEMETRY_DISABLED=1

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...

# Hostname y Puerto
HOSTNAME=0.0.0.0
EOF

# Proteger el archivo
chmod 600 /opt/cane/env/3t.env
```

**⚠️ IMPORTANTE**: Reemplaza los valores con:
- Tu URL real de Supabase
- Tu Anon Key real de Supabase
- Tu API Key real de Google Maps

### 3. Verificar docker-compose.yml

Asegúrate de que `/opt/cane/3t/docker-compose.yml` existe y contiene:

```yaml
services:
  3t-app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
        - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
        - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
    container_name: 3t-app
    expose:
      - "3002"
    env_file:
      - /opt/cane/env/3t.env
    networks:
      - cane_net
    restart: unless-stopped
    volumes:
      - ./public:/app/public:ro
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3002/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  cane_net:
    external: true
```

### 4. Verificar Dockerfile

Asegúrate de que `/opt/cane/3t/Dockerfile` existe (ver contenido en README.md).

### 5. Build de la Aplicación

```bash
cd /opt/cane/3t

# Cargar variables de entorno
set -a && source /opt/cane/env/3t.env && set +a

# Build (puede tomar 5-10 minutos)
docker compose build

# Observa el output, debe terminar con:
# => exporting to image
# => writing image sha256:...
# => naming to docker.io/library/3t-3t-app
```

### 6. Levantar Contenedor

```bash
# Levantar en segundo plano
docker compose up -d

# Ver logs en tiempo real
docker logs -f 3t-app

# Salida esperada:
# ▲ Next.js 15.5.4
# - Local:        http://0.0.0.0:3002
# - Network:      http://0.0.0.0:3002
# ✓ Ready in XXXms
```

### 7. Verificar Contenedor

```bash
# Ver contenedores corriendo
docker ps | grep 3t-app

# Salida esperada:
# CONTAINER ID   IMAGE          STATUS           PORTS      NAMES
# abc123...      3t-3t-app      Up 1 minute      3002/tcp   3t-app

# Verificar health check
docker inspect 3t-app | grep -A 5 "Health"
# Debe mostrar "Status": "healthy" después de 40 segundos
```

### 8. Probar Acceso Interno

```bash
# Desde la red Docker
docker run --rm --network cane_net alpine/curl -s http://3t-app:3002 | head -20

# Debe mostrar HTML de la página principal
```

---

## 🔒 Configurar HTTPS con Nginx Proxy Manager

### 1. Crear Proxy Host

1. Ve al panel de NPM: `http://TU_IP:81`
2. Login con tus credenciales
3. Click en "Hosts" → "Proxy Hosts"
4. Click en "Add Proxy Host"

**Pestaña Details:**
```
Domain Names: 3t.tu-dominio.cl
Scheme: http
Forward Hostname / IP: 3t-app
Forward Port: 3002

☑ Cache Assets
☑ Block Common Exploits
☑ Websockets Support
```

5. Click en la pestaña "SSL"

**Pestaña SSL:**
```
SSL Certificate: Request a new SSL Certificate

☑ Force SSL
☑ HTTP/2 Support
☑ HSTS Enabled

Email Address: tu-email@ejemplo.com
☑ I Agree to the Let's Encrypt Terms of Service
```

6. Click en "Save"
7. Espera 30-60 segundos mientras se genera el certificado SSL

### 2. Verificar HTTPS

```bash
# Probar acceso HTTPS
curl -I https://3t.tu-dominio.cl

# Salida esperada:
# HTTP/2 200
# content-type: text/html
# ...
```

---

## ✅ Verificación y Pruebas

### 1. Checklist de Verificación

```bash
# 1. Servidor
✓ Sistema actualizado
✓ Firewall configurado
✓ Directorios creados

# 2. Supabase
✓ Proyecto creado
✓ Tablas creadas
✓ Credenciales guardadas

# 3. Google Maps
✓ APIs habilitadas
✓ API Key creada y restringida
✓ API Key guardada

# 4. Docker
✓ Docker instalado
✓ Docker Compose instalado
✓ Red cane_net creada

# 5. Nginx Proxy Manager
✓ NPM instalado
✓ DNS configurado
✓ Proxy Host creado
✓ SSL activo

# 6. Aplicación
✓ Código desplegado
✓ Variables configuradas
✓ Build exitoso
✓ Contenedor corriendo
✓ Health check OK
```

### 2. Pruebas Funcionales

```bash
# 1. Acceder a la aplicación
https://3t.tu-dominio.cl

# Deberías ver la página principal con el dashboard

# 2. Probar módulos principales
https://3t.tu-dominio.cl/clientes
https://3t.tu-dominio.cl/productos
https://3t.tu-dominio.cl/pedidos
https://3t.tu-dominio.cl/dashboard
https://3t.tu-dominio.cl/rutas
https://3t.tu-dominio.cl/mapa

# Cada página debe cargar sin errores

# 3. Probar autocompletado de direcciones
# - Ve a /clientes
# - Click en editar un cliente
# - Click en "Agregar Dirección"
# - Escribe una dirección en Chile
# - Deberían aparecer sugerencias de Google Maps

# 4. Verificar conexión a Supabase
# - Los datos de clientes, productos y pedidos deben cargarse
# - Si no hay datos, las tablas se mostrarán vacías (esto es normal)
```

### 3. Verificar Logs

```bash
# Logs de la aplicación
docker logs 3t-app --tail 100

# No debe haber errores críticos
# Pueden aparecer warnings, pero no "ERROR" o "FATAL"

# Logs de Nginx Proxy Manager
docker logs nginx-proxy-manager-app --tail 100
```

---

## 🔧 Mantenimiento

### Comandos Útiles

```bash
# Ver estado de contenedores
docker ps

# Ver logs en tiempo real
docker logs -f 3t-app

# Reiniciar aplicación
cd /opt/cane/3t && docker compose restart

# Detener aplicación
docker compose down

# Actualizar aplicación (después de cambios en código)
cd /opt/cane/3t
docker compose build
docker compose up -d

# Ver uso de recursos
docker stats 3t-app

# Limpiar imágenes antiguas
docker image prune -a

# Backup de configuración
tar -czf /opt/cane/backups/3t-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  /opt/cane/3t/
```

### Monitoreo

```bash
# Crear script de monitoreo
cat > /opt/cane/3t/check-health.sh << 'EOF'
#!/bin/bash
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' 3t-app)
if [ "$HEALTH" != "healthy" ]; then
    echo "⚠️ 3t-app no está saludable: $HEALTH"
    docker restart 3t-app
fi
EOF

chmod +x /opt/cane/3t/check-health.sh

# Agregar a crontab (ejecutar cada 5 minutos)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/cane/3t/check-health.sh") | crontab -
```

### Backups Automáticos

```bash
# Crear script de backup
cat > /opt/cane/scripts/backup-3t.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/cane/backups"
mkdir -p $BACKUP_DIR

# Backup de configuración
tar -czf $BACKUP_DIR/3t-config-$DATE.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  /opt/cane/3t/

# Eliminar backups antiguos (más de 7 días)
find $BACKUP_DIR -name "3t-config-*.tar.gz" -mtime +7 -delete

echo "✅ Backup completado: 3t-config-$DATE.tar.gz"
EOF

chmod +x /opt/cane/scripts/backup-3t.sh

# Ejecutar backup diario a las 3 AM
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/cane/scripts/backup-3t.sh") | crontab -
```

---

## 🚨 Troubleshooting

### Problema: Build Falla

```bash
# Síntomas:
# - docker compose build da error
# - "ERROR [internal] load metadata for..."

# Solución:
# 1. Verificar conexión a internet
ping -c 3 docker.io

# 2. Limpiar cache de Docker
docker system prune -a

# 3. Intentar build nuevamente
docker compose build --no-cache
```

### Problema: Contenedor No Inicia

```bash
# Síntomas:
# - docker compose up -d no muestra el contenedor
# - docker ps no lista 3t-app

# Solución:
# 1. Ver logs de error
docker compose logs

# 2. Verificar variables de entorno
cat /opt/cane/env/3t.env

# 3. Verificar que la red existe
docker network ls | grep cane_net

# 4. Reintentar
docker compose down
docker compose up -d
```

### Problema: Error 502 Bad Gateway

```bash
# Síntomas:
# - Navegador muestra "502 Bad Gateway"
# - NPM no puede alcanzar 3t-app

# Solución:
# 1. Verificar que el contenedor está corriendo
docker ps | grep 3t-app

# 2. Verificar health check
docker inspect 3t-app | grep -A 5 Health

# 3. Probar conexión interna
docker run --rm --network cane_net alpine/curl http://3t-app:3002

# 4. Revisar configuración de NPM
# - Forward Hostname debe ser: 3t-app (no localhost)
# - Forward Port debe ser: 3002
```

### Problema: Supabase Connection Error

```bash
# Síntomas:
# - La app carga pero no muestra datos
# - Console del navegador: "Failed to fetch"
# - Logs: "SupabaseAuthError" o "NetworkError"

# Solución:
# 1. Verificar variables de entorno
docker exec 3t-app env | grep SUPABASE

# 2. Probar conexión a Supabase
curl -I https://tu-proyecto-id.supabase.co

# 3. Verificar Anon Key en Supabase Dashboard
# - Settings → API → anon key debe coincidir

# 4. Rebuild si es necesario
docker compose down
docker compose build
docker compose up -d
```

### Problema: Google Maps No Funciona

```bash
# Síntomas:
# - Autocompletado no aparece
# - Mapa no carga
# - Console: "Google Maps API error"

# Solución:
# 1. Verificar API Key
docker exec 3t-app env | grep GOOGLE_MAPS

# 2. Verificar que las APIs están habilitadas:
# - Ve a Google Cloud Console
# - APIs y servicios → Biblioteca
# - Verifica: Maps JavaScript API, Places API, etc.

# 3. Verificar restricciones de la API Key:
# - HTTP referrers debe incluir tu dominio
# - Ejemplo: https://3t.tu-dominio.cl/*

# 4. Rebuild con nueva API Key
docker compose down
# Editar /opt/cane/env/3t.env con nueva API Key
docker compose build
docker compose up -d
```

### Problema: SSL Certificate Error

```bash
# Síntomas:
# - Navegador muestra "Your connection is not private"
# - NPM muestra error al crear certificado SSL

# Solución:
# 1. Verificar que DNS está configurado correctamente
nslookup 3t.tu-dominio.cl

# 2. Verificar puerto 80 accesible (Let's Encrypt lo necesita)
curl -I http://3t.tu-dominio.cl

# 3. Eliminar y recrear Proxy Host en NPM
# - Delete el Proxy Host existente
# - Crear uno nuevo
# - Esperar 1-2 minutos

# 4. Verificar logs de NPM
docker logs nginx-proxy-manager-app | grep -i error
```

---

## 📚 Recursos Adicionales

### Documentación del Proyecto

- **README.md**: Documentación principal
- **docs/INDEX.md**: Índice maestro de toda la documentación
- **docs/GETTING-STARTED.md**: Guía de inicio rápido
- **docs/ARQUITECTURA.md**: Detalles técnicos profundos
- **docs/CHANGELOG.md**: Historial de cambios

### Documentación Externa

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Proxy Manager](https://nginxproxymanager.com/guide/)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)

---

## ✅ Checklist Final

Antes de dar por finalizada la instalación:

- [ ] Servidor configurado y actualizado
- [ ] Firewall activo y configurado
- [ ] Docker y Docker Compose instalados
- [ ] Red `cane_net` creada
- [ ] Nginx Proxy Manager instalado y configurado
- [ ] Supabase: Proyecto creado y tablas configuradas
- [ ] Google Maps: API Key creada y restringida
- [ ] Variables de entorno configuradas en `/opt/cane/env/3t.env`
- [ ] DNS configurado apuntando al servidor
- [ ] Código de la aplicación desplegado
- [ ] Build de Docker exitoso
- [ ] Contenedor `3t-app` corriendo y saludable
- [ ] Proxy Host en NPM configurado
- [ ] SSL/HTTPS funcionando
- [ ] Aplicación accesible en `https://tu-dominio.cl`
- [ ] Todos los módulos cargando correctamente
- [ ] Autocompletado de direcciones funcionando
- [ ] Conexión a Supabase verificada
- [ ] Logs sin errores críticos
- [ ] Backups automáticos configurados
- [ ] Monitoreo configurado

---

## 🎉 ¡Felicitaciones!

Has completado la instalación completa de **Agua Tres Torres**.

El sistema ahora está:
- ✅ Desplegado en producción
- ✅ Accesible vía HTTPS
- ✅ Conectado a Supabase
- ✅ Integrado con Google Maps
- ✅ Monitoreado y respaldado

**Próximos pasos sugeridos:**
1. Importar datos iniciales (clientes, productos, pedidos)
2. Capacitar usuarios en el uso del sistema
3. Configurar alertas de monitoreo adicionales
4. Personalizar colores y logos según tu marca
5. Configurar backups de base de datos en Supabase

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación de Instalación v1.0**  
**Última actualización:** Octubre 9, 2025

**¿Problemas durante la instalación?** Revisa la sección de Troubleshooting o consulta la documentación completa en `/docs/INDEX.md`


