# ✅ Solución Implementada - Conexión 3t a Supabase

**Fecha**: Octubre 8, 2025  
**Estado**: ✅ RESUELTO

---

## 🎯 Problema Original

La aplicación **Agua Tres Torres** (3t) no podía conectarse a Supabase debido a errores de CORS:

```
Access to fetch at 'https://api.loopia.cl/rest/v1/3t_customers?select=*'
from origin 'https://3t.loopia.cl' has been blocked by CORS policy
```

---

## 🔍 Diagnóstico

### Problemas Identificados

1. **Variables de entorno hardcodeadas** en `docker-compose.yml` (violaba estándares del proyecto)
2. **CORS no configurado** para el dominio `https://3t.loopia.cl` en:
   - PostgREST (servicio REST de Supabase)
   - Kong API Gateway (configuración en `kong.yml`)

---

## 🛠️ Solución Implementada

### 1. Migración de Variables de Entorno

**Archivo creado**: `/opt/cane/env/3t.env`

```bash
# CONFIGURACIÓN NODE
NODE_ENV=production
PORT=3002

# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# TELEMETRÍA
NEXT_TELEMETRY_DISABLED=1
```

**Modificación**: `/opt/cane/3t/docker-compose.yml`

```yaml
services:
  3t-app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
        - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    container_name: 3t-app
    expose:
      - "3002"
    env_file:
      - /opt/cane/env/3t.env  # ← Nuevo: carga variables desde archivo
    networks:
      - cane_net
    restart: unless-stopped
```

### 2. Configuración de CORS en PostgREST

**Archivo modificado**: `/opt/cane/supabase-project-1/docker-compose.yml`

**Servicio `rest` (PostgREST)**:
```yaml
environment:
  PGRST_CORS_DOMAIN: https://costos.loopia.cl,https://3t.loopia.cl,http://localhost:3000,http://127.0.0.1:3000
```

**Cambio**: Agregado `https://3t.loopia.cl` a la lista de dominios permitidos.

### 3. Configuración de CORS en Kong

**Archivo modificado**: `/opt/cane/supabase-project-1/volumes/api/kong.yml`

**Cambio aplicado en 3 secciones**:
```yaml
# Sección: REST API (rest-v1)
- name: cors
  config:
    origins:
      - https://costos.loopia.cl
      - https://3t.loopia.cl  # ← Agregado
    methods:
      - GET
      - POST
      - OPTIONS
      - DELETE
      - PATCH
    headers:
      - Authorization
      - Content-Type
      - apikey
      - x-client-info
      - accept-profile
      - content-profile
      - prefer
    credentials: true
    max_age: 3600

# Sección: Storage Público (storage-v1-public)
- name: cors
  config:
    origins:
      - https://costos.loopia.cl
      - https://3t.loopia.cl  # ← Agregado

# Sección: Storage Privado (storage-v1)
- name: cors
  config:
    origins:
      - https://costos.loopia.cl
      - https://3t.loopia.cl  # ← Agregado
```

---

## 🔄 Comandos Ejecutados

```bash
# 1. Crear archivo de variables de entorno
nano /opt/cane/env/3t.env

# 2. Actualizar docker-compose.yml
nano /opt/cane/3t/docker-compose.yml

# 3. Detener y reconstruir contenedor 3t
cd /opt/cane/3t
docker compose down
docker compose --env-file /opt/cane/env/3t.env build --no-cache
docker compose --env-file /opt/cane/env/3t.env up -d

# 4. Actualizar CORS en PostgREST
nano /opt/cane/supabase-project-1/docker-compose.yml

# 5. Actualizar CORS en Kong
nano /opt/cane/supabase-project-1/volumes/api/kong.yml

# 6. Reiniciar servicios de Supabase
cd /opt/cane/supabase-project-1
docker compose restart kong rest
```

---

## ✅ Verificación Final

### 1. Variables de Entorno Cargadas

```bash
$ docker exec 3t-app env | grep SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. CORS Funcionando

```bash
$ curl -H "Origin: https://3t.loopia.cl" \
       -H "apikey: eyJhbGci..." \
       https://api.loopia.cl/rest/v1/ -I

HTTP/2 200
access-control-allow-origin: https://3t.loopia.cl ✅
access-control-allow-credentials: true ✅
access-control-expose-headers: Content-Encoding, Content-Location...
```

### 3. Preflight OPTIONS Funcionando

```bash
$ curl -X OPTIONS \
       -H "Origin: https://3t.loopia.cl" \
       -H "Access-Control-Request-Method: GET" \
       -H "Access-Control-Request-Headers: apikey,authorization" \
       https://api.loopia.cl/rest/v1/ -I

access-control-allow-origin: https://3t.loopia.cl ✅
access-control-allow-methods: GET,POST,OPTIONS,DELETE,PATCH ✅
access-control-allow-headers: Authorization,Content-Type,apikey... ✅
access-control-max-age: 3600 ✅
```

### 4. Kong Leyendo Configuración Correcta

```bash
$ docker exec supabase-kong cat /home/kong/kong.yml | grep -A 2 "origins:"
          origins:
            - https://costos.loopia.cl
            - https://3t.loopia.cl  ✅
```

---

## 📚 Lecciones Aprendidas

### 1. Arquitectura de Supabase Self-Hosted

```
Navegador → Nginx Proxy Manager → 3t-app (Docker)
                ↓
            Kong API Gateway (puerto 8000)
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
PostgREST              GoTrue (Auth)
(REST API)             (Autenticación)
    ↓                       ↓
    └──────────┬────────────┘
               ↓
          PostgreSQL
```

### 2. Puntos Clave de CORS en Supabase

- **Dos lugares de configuración**:
  1. **Kong** (`kong.yml`): API Gateway que intercepta todas las peticiones
  2. **PostgREST** (`PGRST_CORS_DOMAIN`): Servicio REST que sirve la API

- **Ambos deben estar configurados**: Si solo configuras uno, CORS seguirá fallando

- **Kong procesa las peticiones OPTIONS**: El navegador hace peticiones "preflight" OPTIONS antes de GET/POST para verificar CORS

### 3. Variables de Entorno en Next.js + Docker

- **`NEXT_PUBLIC_*`**: Variables públicas accesibles en el navegador
  - Deben estar en **build time** (args del Dockerfile)
  - Y en **runtime** (env_file del compose)

- **Sin prefijo**: Variables privadas solo del servidor
  - Solo necesitan estar en runtime

### 4. Estándares del Proyecto Cane

✅ **Correcto**:
```yaml
env_file:
  - /opt/cane/env/servicio.env
```

❌ **Incorrecto** (hardcoded):
```yaml
environment:
  - API_KEY=abc123...
```

---

## 🔧 Para Agregar Nuevos Dominios

Si necesitas agregar otro dominio (ej: `https://nueva-app.loopia.cl`):

### 1. Actualizar CORS en PostgREST

```bash
# Editar docker-compose.yml
nano /opt/cane/supabase-project-1/docker-compose.yml

# Buscar PGRST_CORS_DOMAIN y agregar el nuevo dominio
PGRST_CORS_DOMAIN: https://costos.loopia.cl,https://3t.loopia.cl,https://nueva-app.loopia.cl
```

### 2. Actualizar CORS en Kong

```bash
# Editar kong.yml
nano /opt/cane/supabase-project-1/volumes/api/kong.yml

# Buscar todas las secciones "origins:" y agregar el nuevo dominio
origins:
  - https://costos.loopia.cl
  - https://3t.loopia.cl
  - https://nueva-app.loopia.cl  # ← Nuevo

# Nota: Hay 3 secciones en el archivo:
# - rest-v1 (API REST)
# - storage-v1-public (Storage público)
# - storage-v1 (Storage privado)
```

### 3. Reiniciar Servicios

```bash
cd /opt/cane/supabase-project-1
docker compose restart kong rest
```

### 4. Verificar

```bash
curl -H "Origin: https://nueva-app.loopia.cl" \
     -H "apikey: <ANON_KEY>" \
     https://api.loopia.cl/rest/v1/ -I | grep access-control-allow-origin
```

---

## 📖 Referencias

### Documentación del Proyecto

- **README.md**: Guía completa de la app 3t
- **conexion-app-supabase.md**: Documentación detallada de cómo se conectó el proyecto Reciclar
- **CAMBIOS-CONFIGURACION.md**: Cambios técnicos realizados

### Archivos Modificados

```
/opt/cane/
├── env/
│   └── 3t.env                               # ← Nuevo
├── 3t/
│   └── docker-compose.yml                   # ← Modificado
└── supabase-project-1/
    ├── docker-compose.yml                   # ← Modificado (PostgREST)
    └── volumes/
        └── api/
            └── kong.yml                     # ← Modificado (Kong)
```

---

## 🎯 Resultado Final

✅ **Variables de entorno**: Externalizadas en `/opt/cane/env/3t.env`  
✅ **CORS en PostgREST**: Configurado para `https://3t.loopia.cl`  
✅ **CORS en Kong**: Configurado en las 3 secciones relevantes  
✅ **Contenedor 3t-app**: Reconstruido y corriendo  
✅ **Conexión Supabase**: Funcionando sin errores de CORS  
✅ **App accesible**: https://3t.loopia.cl responde correctamente  

---

**Documentado por**: Sistema Cane  
**Última actualización**: Octubre 8, 2025  
**Estado**: ✅ RESUELTO Y DOCUMENTADO

