# 🚀 Guía Rápida - Agua Tres Torres

Resumen ejecutivo para iniciar sesiones de trabajo o troubleshooting.

---

## 📍 Información Esencial

| Item | Valor |
|------|-------|
| **Ubicación** | `/opt/cane/3t/` |
| **URL Producción** | [https://3t.loopia.cl](https://3t.loopia.cl) |
| **Contenedor** | `3t-app` |
| **Puerto Interno** | `3002` |
| **Red Docker** | `cane_net` |
| **Framework** | Next.js 15.5.4 + TypeScript |
| **Base de Datos** | Supabase (PostgreSQL) |
| **URL Supabase** | `https://api.loopia.cl` |
| **Variables Entorno** | `/opt/cane/env/3t.env` |
| **Proxy** | Nginx Proxy Manager → `3t-app:3002` |

---

## ⚡ Comandos Rápidos

### Ver Estado
```bash
# Estado del contenedor
docker ps | grep 3t

# Logs en tiempo real
docker logs -f 3t-app

# Ver qué escucha en el puerto 3002
docker exec 3t-app netstat -tlnp
```

### Gestión del Contenedor
```bash
# Reiniciar
docker restart 3t-app

# Detener
docker compose down

# Levantar
cd /opt/cane/3t
docker compose up -d

# Rebuild completo (con variables de entorno)
cd /opt/cane/3t
docker compose down
docker compose --env-file /opt/cane/env/3t.env build --no-cache
docker compose --env-file /opt/cane/env/3t.env up -d
```

### Troubleshooting
```bash
# Probar conectividad interna
docker run --rm --network cane_net alpine/curl http://3t-app:3002

# Ver variables de entorno
docker exec 3t-app env | grep -E 'PORT|SUPABASE'

# Inspeccionar red
docker network inspect cane_net | grep -A 5 3t-app
```

---

## 🗂️ Estructura de Archivos Clave

```
/opt/cane/3t/
├── app/                    # Rutas Next.js
│   ├── page.tsx           # Home
│   ├── clientes/          # Módulo clientes
│   ├── productos/         # Módulo productos
│   ├── pedidos/           # Módulo pedidos
│   ├── dashboard/         # Dashboard analítico
│   └── mapa/              # Mapa entregas
├── lib/
│   └── supabase.ts        # Cliente Supabase + tipos
├── docker-compose.yml     # Orquestación
├── Dockerfile             # Multi-stage build
└── README.md              # Docs completas
```

---

## 🗄️ Tablas de Base de Datos

| Tabla | Descripción | Relaciones |
|-------|-------------|-----------|
| `3t_customers` | Clientes (hogar/empresa) | 1→N addresses, 1→N orders |
| `3t_addresses` | Direcciones con lat/lng | N→1 customer |
| `3t_products` | Formatos de productos | 1→N orders |
| `3t_orders` | Pedidos completos | N→1 customer, address, product |
| `3t_users` | Usuarios del sistema | - |

**Prefijo**: Todas las tablas empiezan con `3t_`

---

## 🔧 Configuración Nginx Proxy Manager

Si necesitas reconfigurar el proxy:

**Proxy Host: `3t.loopia.cl`**
- **Scheme**: `http`
- **Forward Hostname**: `3t-app`
- **Forward Port**: `3002`
- **Websockets Support**: ✅
- **SSL**: Let's Encrypt + Force SSL

---

## 🐛 Problemas Comunes

### 1. Error 502 Bad Gateway
```bash
# Verificar que el contenedor está corriendo
docker ps | grep 3t-app

# Si no está, levantarlo
cd /opt/cane/3t && docker compose up -d

# Ver por qué falló
docker logs 3t-app
```

### 2. Puerto ocupado
```bash
# Ver qué usa el puerto 3002
lsof -i :3002

# Cambiar puerto en docker-compose.yml y Dockerfile
# Actualizar Nginx Proxy Manager con el nuevo puerto
```

### 3. Variables de entorno no se aplican
```bash
# Las variables deben estar en AMBOS lugares:
# 1. build → args en docker-compose.yml
# 2. runtime → environment en docker-compose.yml

# Rebuild después de cambiar
docker compose build --no-cache
docker compose up -d
```

### 4. Cambios no se reflejan
```bash
# Rebuild forzando recreación
cd /opt/cane/3t
docker compose down
docker rmi 3t-3t-app  # Eliminar imagen vieja
docker compose build --no-cache
docker compose up -d
```

### 5. Error cookies() async (Next.js 15)
```bash
# Error: Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'
# Solución: Cambiar cookies() por await cookies() en auth-middleware.ts

# Verificar build después del cambio
docker compose build --no-cache
```

---

## 📊 Lógica de Negocio Clave

### Cálculo de Precios en Pedidos

```typescript
// Si es recarga (is_refill = true)
unit_price = cliente.precio_recarga  // Desde 3t_customers

// Si es nuevo (is_refill = false)
unit_price = producto.base_price  // Desde 3t_products

// Precio total
total_price = quantity × unit_price

// Precios se almacenan como INTEGER (sin decimales)
// Ejemplo: $5000 se guarda como 5000
```

### Estados de Pedidos

**order_status**:
- `pedido` → Recién creado
- `ruta` → En camino
- `despachado` → Entregado

**payment_status**:
- `pendiente` → No pagado
- `pagado` → Pagado
- `facturado` → Facturado

**payment_type**:
- `efectivo` → Pago en efectivo
- `transferencia` → Pago por transferencia

---

## 📝 Variables de Entorno

### Producción (docker-compose.yml)

```yaml
environment:
  - NODE_ENV=production
  - NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (JWT completo)

build:
  args:
    - NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
    - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (JWT completo)
```

### Desarrollo Local (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 🚦 Health Check

El contenedor tiene un healthcheck configurado:

```bash
# Ver estado de salud
docker inspect 3t-app | grep -A 10 Health

# Healthcheck manual
wget --no-verbose --tries=1 --spider http://localhost:3002/
```

---

## 📈 Métricas del Contenedor

```bash
# Uso de recursos
docker stats 3t-app

# Tamaño de imagen
docker images | grep 3t

# Inspección completa
docker inspect 3t-app
```

---

## 🔄 Workflow de Actualización

```bash
# 1. Navegar al directorio
cd /opt/cane/3t

# 2. Si usas Git, actualizar código
# git pull

# 3. Editar archivos necesarios
# vim app/page.tsx

# 4. Rebuild
docker compose build

# 5. Redesplegar sin downtime
docker compose up -d

# 6. Ver logs para verificar
docker logs -f 3t-app

# 7. Probar en navegador
curl -I https://3t.loopia.cl
```

---

## 🔐 Credenciales Supabase

Ubicación: `/opt/cane/env/mcp-supabase.env`

```bash
# Ver credenciales (requiere permisos)
cat /opt/cane/env/mcp-supabase.env | grep SUPABASE
```

---

## 📞 Endpoints API Importantes

```bash
# Health check de Supabase
curl https://api.loopia.cl/rest/v1/

# Listar clientes (requiere auth)
curl https://api.loopia.cl/rest/v1/3t_customers \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"
```

---

## 🎯 Módulos de la App

| Ruta | Descripción | Funcionalidad |
|------|-------------|---------------|
| `/` | Home | Navegación principal |
| `/clientes` | Gestión de clientes | CRUD completo |
| `/productos` | Gestión de productos | CRUD completo |
| `/pedidos` | Gestión de pedidos | CRUD + cálculo automático |
| `/dashboard` | Dashboard analítico | Métricas + gráficos |
| `/mapa` | Mapa de entregas | Visualización geográfica |

---

## 🛠️ Desarrollo Local

```bash
# 1. Clonar/acceder al proyecto
cd /opt/cane/3t

# 2. Instalar dependencias
npm install

# 3. Crear .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_aqui
EOF

# 4. Iniciar dev server
npm run dev

# 5. Abrir navegador
# http://localhost:3000
```

---

## 📚 Documentación Completa

- **README.md** → Guía general y uso
- **ARQUITECTURA.md** → Detalles técnicos avanzados
- **GUIA-RAPIDA.md** → Este archivo

---

## ✅ Checklist de Salud del Sistema

```bash
# 1. Contenedor corriendo?
docker ps | grep 3t-app
# ✓ Debe mostrar: Up X minutes (healthy)

# 2. Puerto escuchando?
docker exec 3t-app netstat -tlnp | grep 3002
# ✓ Debe mostrar: 0.0.0.0:3002 LISTEN

# 3. Responde internamente?
docker run --rm --network cane_net alpine/curl -s http://3t-app:3002 | head -1
# ✓ Debe mostrar: <!DOCTYPE html>

# 4. Responde externamente?
curl -I https://3t.loopia.cl
# ✓ Debe mostrar: HTTP/2 200

# 5. Supabase accesible?
curl -s https://api.loopia.cl/rest/v1/ | jq
# ✓ Debe mostrar JSON con metadata
```

---

## 🎓 Para Iniciar un Nuevo Chat

Comparte estos archivos con el asistente:
1. Este archivo (`GUIA-RAPIDA.md`)
2. `README.md` (si necesita más detalles)
3. `ARQUITECTURA.md` (para temas técnicos avanzados)
4. `docker-compose.yml` (configuración actual)

**Comando útil**:
```bash
cd /opt/cane/3t
cat GUIA-RAPIDA.md README.md
```

---

**Última actualización**: Octubre 2025

