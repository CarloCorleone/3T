# Context: Experto Full-Stack en Sistema Completo Agua Tres Torres (3t)

Eres un experto full-stack especializado en el sistema completo de Agua Tres Torres. Dominas Next.js, n8n, Supabase PostgreSQL, Docker y todas las integraciones del proyecto. Tu misión es construir, modificar y mantener la infraestructura completa con máxima calidad y siguiendo las convenciones del proyecto.

## CRÍTICO: Visión General del Proyecto

**Proyecto:** Sistema web completo para gestión de pedidos, clientes, productos y entregas de agua purificada.

**Stack Tecnológico:**
- **Frontend:** Next.js 15.5.4 + TypeScript + TailwindCSS + shadcn/ui
- **Backend:** Supabase PostgreSQL (auto-hospedado)
- **Automatización:** n8n (workflows e IA)
- **Infraestructura:** Docker + Docker Compose + Nginx Proxy Manager
- **Red:** `cane_net` (red Docker compartida)

---

## Arquitectura de Infraestructura

### Diagrama de Contenedores

```
┌─────────────────────────────────────────────────────────┐
│                   Internet (HTTPS)                       │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ Puerto 443 (HTTPS)
                         │
              ┌──────────▼──────────┐
              │  Nginx Proxy Mgr    │
              │  (openresty)        │
              │  Container          │
              └──────────┬──────────┘
                         │
                         │ cane_net (red interna)
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
│   3t-app     │  │   n8n       │  │  Supabase  │
│   (Next.js)  │  │   (auto)    │  │  (auto)    │
│   Port: 3002 │  │   Port:5678 │  │  Port:5432 │
│   Prod/Dev   │  │             │  │            │
└──────────────┘  └─────────────┘  └────────────┘
     │                    │              │
     └────────────────────┴──────────────┘
            Comunicación vía hostname
            (3t-app, n8n, supabase)
```

### Dominios Configurados

| Servicio | Dominio | Contenedor | Puerto Interno |
|----------|---------|------------|----------------|
| **Producción** | https://3t.loopia.cl | 3t-app | 3002 |
| **Desarrollo** | https://dev.3t.loopia.cl | 3t-app-dev | 3001 |
| **n8n** | https://n8n.loopia.cl | n8n | 5678 |
| **Supabase API** | https://api.loopia.cl | supabase | 3000 (REST) |

---

## Configuración Docker

### Estructura de Directorios

```
/opt/cane/
├── 3t/                           # Proyecto principal
│   ├── docker-compose.yml        # Producción
│   ├── docker-compose.dev.yml    # Desarrollo
│   ├── Dockerfile                # Multi-stage build
│   ├── .dockerignore
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── app/                      # Next.js App Router
│   ├── components/               # Componentes React
│   ├── lib/                      # Utilidades
│   ├── hooks/                    # Custom hooks
│   ├── types/                    # TypeScript types
│   ├── public/                   # Assets estáticos
│   ├── docs/                     # Documentación
│   ├── scripts/                  # Scripts de utilidad
│   └── logs/                     # Logs de producción
├── env/
│   └── 3t.env                    # Variables de entorno
└── volumes/
    └── 3t/                       # Volúmenes persistentes
```

### docker-compose.yml (Producción)

```yaml
# ===================================================
# DOCKER COMPOSE - AGUA TRES TORRES (3T) - PRODUCCIÓN
# ===================================================
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
      - "3002"  # Solo interno, no expuesto al host
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

### docker-compose.dev.yml (Desarrollo)

```yaml
# ===================================================
# DOCKER COMPOSE - AGUA TRES TORRES (3T) - DESARROLLO
# ===================================================
services:
  3t-app-dev:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps  # Solo hasta stage deps
    container_name: 3t-app-dev
    command: npm run dev
    expose:
      - "3001"
    env_file:
      - /opt/cane/env/3t.env
    environment:
      - PORT=3001
      - NODE_ENV=development
    networks:
      - cane_net
    restart: unless-stopped
    volumes:
      - .:/app                      # Hot reload
      - /app/node_modules           # Proteger node_modules
      - /app/.next                  # Proteger .next
    working_dir: /app

networks:
  cane_net:
    external: true
```

### Dockerfile Multi-Stage

```dockerfile
# ===================================================
# DOCKERFILE MULTI-STAGE - AGUA TRES TORRES (3T)
# ===================================================
# Stage 1: Base - Node 20 Alpine
FROM node:20-alpine AS base

# Stage 2: Deps - Instalar dependencias
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 3: Builder - Build de Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments (variables en tiempo de build)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 4: Runner - Imagen de producción final
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos de producción
COPY --from=builder /app/public ./public
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Variables de Entorno (/opt/cane/env/3t.env)

```bash
# ===================================================
# CONFIGURACIÓN - AGUA TRES TORRES (3T)
# ===================================================
# Ubicación: /opt/cane/env/3t.env
# Usado por: /opt/cane/3t/docker-compose.yml
# ===================================================

# === CONFIGURACIÓN NODE ===
NODE_ENV=production
PORT=3002

# === SUPABASE ===
# IMPORTANTE: NEXT_PUBLIC_* es requerido por Next.js para exponer al cliente
NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# === GOOGLE MAPS API ===
# Para optimización de rutas de entrega
# APIs habilitadas: Directions API, Distance Matrix API, Places API (old)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...

# === CHATBOT N8N ===
# Webhook URL para el chatbot con IA
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.loopia.cl/webhook/3t-chat-v3

# === TELEMETRÍA ===
NEXT_TELEMETRY_DISABLED=1
```

---

## Schema de Base de Datos (Completo)

### ⚠️ REGLA CRÍTICA: TABLAS CON NÚMEROS

**TODAS las tablas empiezan con "3t_" (número) y PostgreSQL REQUIERE comillas dobles:**

```sql
-- ✅ CORRECTO
SELECT * FROM "3t_orders" LIMIT 10;

-- ❌ INCORRECTO - ERROR DE SINTAXIS
SELECT * FROM 3t_orders LIMIT 10;
```

### Tablas Principales (14 total)

#### 1. "3t_customers" - Clientes
```sql
customer_id TEXT PK
name TEXT
business_name TEXT
rut TEXT
customer_type TEXT ('Hogar', 'Empresa')
email TEXT
phone TEXT
address_id TEXT → "3t_addresses"
commune TEXT
product_format TEXT ('PC', 'PET')
price NUMERIC
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### 2. "3t_addresses" - Direcciones
```sql
address_id TEXT PK
customer_id TEXT → "3t_customers"
raw_address TEXT
street_name TEXT
street_number INTEGER
apartment TEXT
commune TEXT
region TEXT
directions TEXT
is_default BOOLEAN
latitude NUMERIC
longitude NUMERIC
maps_link TEXT
created_at TIMESTAMPTZ
```

#### 3. "3t_orders" - Pedidos
```sql
order_id TEXT PK
customer_id TEXT → "3t_customers"
delivery_address_id TEXT → "3t_addresses"
status TEXT ('Pedido', 'Ruta', 'Despachado')
order_type TEXT ('Venta', 'Préstamo')
product_type TEXT
quantity NUMERIC
bottles_delivered NUMERIC
bottles_returned NUMERIC
payment_status TEXT ('Pendiente', 'Pagado', 'Facturado', 'Interno')
payment_type TEXT ('Efectivo', 'Transferencia', 'Débito', 'Crédito')
final_price NUMERIC
invoice_number TEXT
order_date DATE
delivered_date DATE
payment_date DATE
delivery_datetime TIMESTAMP
details TEXT
warehouse TEXT
delivery_photo_path TEXT
created_at TIMESTAMPTZ
```

#### 4. "3t_products" - Productos
```sql
product_id TEXT PK
name TEXT
category TEXT
image_url TEXT
price_neto NUMERIC
pv_iva_inc INTEGER
created_at TIMESTAMPTZ
```

#### 5. "3t_suppliers" - Proveedores
```sql
supplier_id TEXT PK
name TEXT
phone TEXT
email TEXT
observations TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### 6. "3t_supplier_addresses" - Direcciones de Proveedores
```sql
address_id UUID PK
supplier_id TEXT → "3t_suppliers"
raw_address TEXT
street_name TEXT
commune TEXT
region TEXT
is_default BOOLEAN
latitude NUMERIC
longitude NUMERIC
```

#### 7. "3t_purchases" - Compras a Proveedores
```sql
purchase_id TEXT PK
supplier_id TEXT → "3t_suppliers"
address_id UUID → "3t_supplier_addresses"
status TEXT ('Pedido', 'Ruta', 'Despachado')
supplier_order_number TEXT
final_price NUMERIC
purchase_date DATE
completed_date DATE
observations TEXT
created_at TIMESTAMPTZ
```

#### 8. "3t_purchase_products" - Detalle de Compras
```sql
id UUID PK
purchase_id TEXT → "3t_purchases"
product_id TEXT → "3t_products"
quantity INTEGER
unit_price NUMERIC
total INTEGER
```

#### 9. "3t_quotes" - Presupuestos
```sql
quote_id UUID PK
quote_number TEXT
customer_id UUID → "3t_customers"
customer_name TEXT
customer_rut TEXT
customer_email TEXT
customer_phone TEXT
customer_address TEXT
address_id TEXT → "3t_addresses"
subtotal INTEGER
iva_amount INTEGER
total INTEGER
payment_conditions TEXT
valid_until DATE
status TEXT
pdf_url TEXT
observations TEXT
created_at TIMESTAMPTZ
```

#### 10. "3t_quote_items" - Items de Presupuestos
```sql
item_id UUID PK
quote_id UUID → "3t_quotes"
product_id UUID → "3t_products"
product_name TEXT
product_description TEXT
quantity INTEGER
unit_price INTEGER
subtotal INTEGER
order_index INTEGER
```

#### 11. "3t_users" - Usuarios del Sistema
```sql
user_id UUID PK
email TEXT UNIQUE
full_name TEXT
role TEXT ('admin', 'vendedor', 'despachador', 'visualizador')
created_at TIMESTAMPTZ
last_login TIMESTAMPTZ
```

#### 12. "3t_user_permissions" - Permisos Granulares
```sql
id UUID PK
user_id UUID → "3t_users"
module TEXT
can_view BOOLEAN
can_create BOOLEAN
can_edit BOOLEAN
can_delete BOOLEAN
```

#### 13. "3t_chatbot_memory" - Memoria del Chatbot
```sql
id SERIAL PK
session_id TEXT
role TEXT ('human', 'ai')
content TEXT
created_at TIMESTAMPTZ
```

#### 14. "3t_dashboard_ventas" - Vista de Ventas (VIEW)
```sql
-- Vista pre-calculada para dashboard
-- Incluye JOINs optimizados de orders, customers, addresses, products
```

### Índices Importantes

```sql
-- Índices para performance
CREATE INDEX idx_orders_customer ON "3t_orders"(customer_id);
CREATE INDEX idx_orders_status ON "3t_orders"(status);
CREATE INDEX idx_orders_date ON "3t_orders"(order_date);
CREATE INDEX idx_orders_payment ON "3t_orders"(payment_status);
CREATE INDEX idx_addresses_customer ON "3t_addresses"(customer_id);
CREATE INDEX idx_chatbot_session ON "3t_chatbot_memory"(session_id);
```

---

## Módulos de la Aplicación

### 1. Home (Dashboard Ejecutivo)
**Ruta:** `/`  
**Componente:** `app/page.tsx`

**Características:**
- Métricas consolidadas (4 KPIs principales)
- Gráfico comparativo de ventas (mes actual vs anterior)
- Pedidos pendientes por despachar
- Top 10 comunas por ventas
- 10 queries optimizadas en paralelo (~500ms)

**Queries principales:**
```typescript
// Ejecutadas en paralelo con Promise.all()
const queries = [
  getIngresosMesActual(),
  getClientesActivos(),
  getPedidosHoy(),
  getTotalProductos(),
  getVentasSemanales(),
  getPedidosPendientes(),
  getTopComunas(),
  getComparativoMesAnterior()
];
```

### 2. Clientes
**Ruta:** `/clientes`  
**Componente:** `app/clientes/page.tsx`

**Características:**
- CRUD completo de clientes
- Gestión de múltiples direcciones por cliente
- Autocompletado de direcciones (Google Places API)
- Captura automática de coordenadas (lat/lng)
- Designación de dirección predeterminada
- Validación de dependencias (evita eliminar si tiene pedidos)

### 3. Productos
**Ruta:** `/productos`  
**Componente:** `app/productos/page.tsx`

**Características:**
- CRUD de productos
- Categorías: PC, PET, Dispensadores, Otros
- Precios con/sin IVA
- Imágenes de productos

### 4. Pedidos
**Ruta:** `/pedidos`  
**Componente:** `app/pedidos/page.tsx`

**Características:**
- **Pedidos multi-producto** (múltiples productos en un solo pedido)
- Auto-detección de tipo (recarga/nuevo/compras)
- Carrito visual con subtotales
- Cálculo automático de precios
- Estados: Pedido, Ruta, Despachado
- Estados de pago: Pendiente, Pagado, Facturado, Interno
- Compatible con pedidos antiguos (1 producto)

### 5. Rutas
**Ruta:** `/rutas`  
**Componente:** `app/rutas/page.tsx`

**Características:**
- Optimización de rutas con Google Maps Directions API
- Integración de compras y entregas en la misma ruta
- Agrupación automática por capacidad (55 botellones máx)
- División inteligente en múltiples rutas
- Mapa nativo de Google Maps con marcadores
- Botón para abrir en Google Maps (navegación)

### 6. Compras
**Ruta:** `/compras`  
**Componente:** `app/compras/page.tsx`

**Características:**
- Órdenes de compra multi-producto
- Historial de precios por proveedor
- Estados: Pedido, Ruta, Completado
- Integración con optimizador de rutas

### 7. Proveedores
**Ruta:** `/proveedores`  
**Componente:** `app/proveedores/page.tsx`

**Características:**
- CRUD completo de proveedores
- Múltiples direcciones por proveedor
- Contacto y observaciones

### 8. Dashboard Analítico
**Ruta:** `/dashboard`  
**Componente:** `app/dashboard/page.tsx`

**Características:**
- Filtros por período (Mes Actual, Trimestre, Año, Personalizado)
- 8 métricas KPI balanceadas
- Gráficos con shadcn/ui Chart components
- Comparativas año sobre año

### 9. Mapa
**Ruta:** `/mapa`  
**Componente:** `app/mapa/page.tsx`

**Características:**
- Visualización geográfica con Leaflet.js
- Filtros por fecha, estado, tipo de cliente
- Estadísticas en tiempo real

### 10. Presupuestos
**Ruta:** `/presupuestos`  
**Componente:** `app/presupuestos/page.tsx`

**Características:**
- Generación de presupuestos multi-producto
- Exportación a PDF con branding
- Gestión de condiciones de pago

### 11. Chatbot
**Acceso:** `Ctrl + K` (global)  
**Componente:** `components/chat-widget.tsx`

**Características:**
- Widget flotante responsive
- Consultas en lenguaje natural
- Integración con n8n + Claude/GPT
- Rate limiting (5 req/min)
- Memoria conversacional persistente

---

## Scripts de Deployment

### prod.sh - Deploy a Producción

```bash
#!/bin/bash
# ===================================================
# DEPLOY PRODUCCIÓN - AGUA TRES TORRES (3T)
# ===================================================
set -euo pipefail

echo "🚀 Iniciando deploy a producción..."

cd /opt/cane/3t

# Detener contenedor actual
echo "⏹️  Deteniendo contenedor actual..."
docker compose down

# Rebuild con cache
echo "🔨 Building imagen Docker..."
docker compose build

# Levantar contenedor
echo "▶️  Levantando contenedor..."
docker compose up -d

# Verificar estado
echo "✅ Verificando estado..."
docker ps | grep 3t-app

echo ""
echo "✅ Deploy completado!"
echo "🌐 URL: https://3t.loopia.cl"
echo "📋 Logs: docker logs -f 3t-app"
```

### dev.sh - Deploy a Desarrollo

```bash
#!/bin/bash
# ===================================================
# DEPLOY DESARROLLO - AGUA TRES TORRES (3T)
# ===================================================
set -euo pipefail

echo "🔧 Iniciando modo desarrollo..."

cd /opt/cane/3t

# Detener contenedor de desarrollo
echo "⏹️  Deteniendo contenedor de desarrollo..."
docker compose -f docker-compose.dev.yml down

# Levantar contenedor con hot reload
echo "▶️  Levantando contenedor con hot reload..."
docker compose -f docker-compose.dev.yml up -d

# Verificar estado
echo "✅ Verificando estado..."
docker ps | grep 3t-app-dev

echo ""
echo "✅ Modo desarrollo activado!"
echo "🌐 URL: https://dev.3t.loopia.cl"
echo "🔥 Hot reload: activo"
echo "📋 Logs: ./logs-dev.sh"
```

---

## Integración con n8n

### Webhooks Disponibles

| Webhook | Propósito | Método | Autenticación |
|---------|-----------|--------|---------------|
| `/3t-chat-v3` | Chatbot con IA | POST | JWT (frontend) |
| `/nuevo-pedido` | Notificaciones de pedidos | POST | X-API-Key |
| `/recordatorio-pago` | Trigger automatizado | - | Schedule |

### Workflow de Notificación de Pedido Nuevo

**Trigger:** Webhook POST desde frontend al crear pedido

**Flujo:**
```
Nuevo Pedido (Frontend)
  ↓ POST /api/orders
Supabase INSERT
  ↓ Trigger n8n webhook
Workflow n8n
  ├─ Consultar datos cliente
  ├─ Formatear mensaje
  └─ Enviar WhatsApp/Email
```

### Workflow de Chatbot

**Trigger:** Widget frontend (Ctrl+K)

**Flujo:**
```
Usuario escribe pregunta
  ↓ POST /api/chat (con JWT)
API Route valida y reenvía
  ↓ POST https://n8n.loopia.cl/webhook/3t-chat-v3
Workflow n8n
  ├─ Claude Sonnet 4.5 (AI Agent)
  ├─ Tool: Postgres Direct Query
  ├─ Memoria: Postgres Chat Memory
  └─ Respuesta formateada
  ↓
Frontend muestra respuesta
```

---

## Convenciones de Código

### TypeScript

```typescript
// Tipos en archivos separados
// types/index.ts
export interface Customer {
  customer_id: string;
  name: string;
  customer_type: 'Hogar' | 'Empresa';
  phone: string;
  email: string;
}

// Componentes con tipos explícitos
interface Props {
  customer: Customer;
  onEdit: (id: string) => void;
}

export default function CustomerCard({ customer, onEdit }: Props) {
  // ...
}
```

### Supabase Queries

```typescript
// lib/supabase.ts - Cliente singleton
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Queries con tipos
const { data, error } = await supabase
  .from('3t_customers')
  .select(`
    *,
    address:3t_addresses!address_id (*)
  `)
  .eq('customer_type', 'Empresa')
  .order('name');

if (error) {
  console.error('Error:', error);
  return;
}
```

### Componentes shadcn/ui

```typescript
// Usar componentes de shadcn/ui consistentemente
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Dialogs para modales
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
```

### Naming Conventions

- **Archivos:** `kebab-case.tsx` (ej: `customer-card.tsx`)
- **Componentes:** `PascalCase` (ej: `CustomerCard`)
- **Funciones:** `camelCase` (ej: `fetchCustomers`)
- **Constantes:** `UPPER_SNAKE_CASE` (ej: `MAX_ORDERS`)
- **Tipos/Interfaces:** `PascalCase` (ej: `Customer`, `OrderStatus`)

---

## Comandos Útiles

### Docker

```bash
# Ver logs de producción
docker logs -f 3t-app

# Ver logs de desarrollo
docker logs -f 3t-app-dev

# Entrar al contenedor
docker exec -it 3t-app sh

# Ver uso de recursos
docker stats 3t-app

# Rebuild sin caché
docker compose build --no-cache

# Ver redes
docker network ls
docker network inspect cane_net
```

### Next.js

```bash
# Modo desarrollo local (sin Docker)
npm run dev

# Build de producción
npm run build

# Iniciar servidor de producción
npm start

# Linter
npm run lint

# Type check
npx tsc --noEmit
```

### Supabase

```bash
# CLI de Supabase (si está instalado)
supabase start
supabase status
supabase db reset

# Generar tipos TypeScript
supabase gen types typescript --local > types/database.types.ts
```

---

## Troubleshooting Común

### Problema 1: Error 502 Bad Gateway
**Causa:** Contenedor no responde o no está en red correcta
**Solución:**
```bash
# Verificar que contenedor está corriendo
docker ps | grep 3t-app

# Verificar que está en cane_net
docker network inspect cane_net

# Verificar logs
docker logs 3t-app

# Reiniciar
docker compose restart
```

### Problema 2: Variables de entorno no se aplican
**Causa:** Build cache antiguo
**Solución:**
```bash
# Rebuild sin caché
docker compose down
docker compose build --no-cache --build-arg NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
docker compose up -d
```

### Problema 3: Hot reload no funciona en desarrollo
**Causa:** Volúmenes no montados correctamente
**Solución:**
```bash
# Verificar volúmenes en docker-compose.dev.yml
volumes:
  - .:/app                    # Debe estar presente
  - /app/node_modules         # Debe estar presente
  - /app/.next                # Debe estar presente
```

### Problema 4: Chatbot no responde
**Causa:** Webhook URL incorrecta o workflow n8n inactivo
**Solución:**
```bash
# Verificar variable
grep N8N_WEBHOOK /opt/cane/env/3t.env

# Verificar workflow activo en n8n
# https://n8n.loopia.cl/workflows

# Test manual del webhook
curl -X POST https://n8n.loopia.cl/webhook/3t-chat-v3 \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","sessionId":"test","message":"Hola"}'
```

### Problema 5: Error de SQL "tabla no existe"
**Causa:** Olvidaste comillas dobles en tabla con número
**Solución:**
```sql
-- ❌ INCORRECTO
SELECT * FROM 3t_orders;

-- ✅ CORRECTO
SELECT * FROM "3t_orders";
```

---

## Checklist de Deployment Completo

### Pre-Deployment
- [ ] Todas las variables de entorno configuradas en `/opt/cane/env/3t.env`
- [ ] Credenciales de Supabase válidas
- [ ] API Key de Google Maps configurada
- [ ] Webhook URL de n8n actualizada
- [ ] Red Docker `cane_net` existe
- [ ] Nginx Proxy Manager configurado (proxy hosts)
- [ ] Certificados SSL válidos (Let's Encrypt)

### Build
- [ ] Build de producción sin errores
- [ ] Imagen Docker creada correctamente
- [ ] Variables de entorno inyectadas en build

### Deployment
- [ ] Contenedor arrancado exitosamente
- [ ] Healthcheck pasa (status: healthy)
- [ ] Puerto 3002 expuesto internamente
- [ ] Conectado a red `cane_net`

### Post-Deployment
- [ ] Aplicación accesible vía HTTPS
- [ ] Autenticación funciona (Supabase Auth)
- [ ] Queries a base de datos funcionan
- [ ] Chatbot responde correctamente
- [ ] Google Maps carga (rutas, clientes)
- [ ] Sin errores en logs
- [ ] Monitoreo activo (Uptime Kuma si disponible)

---

## Output Format Requerido

Cuando trabajes en el proyecto, proporciona:

1. **Código completo** con tipos TypeScript
2. **Configuración Docker** si aplica
3. **Queries SQL** con comillas dobles en tablas "3t_*"
4. **Variables de entorno** necesarias
5. **Comandos de test** para validar cambios
6. **Documentación** de nuevas funcionalidades
7. **Actualización de CHANGELOG.md** si es cambio significativo

---

## Recursos y Documentación

### Documentación del Proyecto

```
/opt/cane/3t/docs/
├── INDEX.md                    # Índice maestro
├── GETTING-STARTED.md          # Inicio rápido
├── ARQUITECTURA.md             # Arquitectura técnica
├── DEPLOYMENT.md               # Guía de deployment
├── modules/                    # Documentación por módulo
│   ├── HOME.md
│   ├── DASHBOARD.md
│   ├── CLIENTES.md
│   ├── PEDIDOS.md
│   ├── RUTAS.md
│   ├── CHATBOT.md
│   └── ...
└── troubleshooting/            # Soluciones a problemas comunes
```

### Links Útiles

- **Aplicación:** https://3t.loopia.cl
- **Desarrollo:** https://dev.3t.loopia.cl
- **n8n:** https://n8n.loopia.cl
- **Supabase:** https://api.loopia.cl
- **Documentación Next.js:** https://nextjs.org/docs
- **shadcn/ui:** https://ui.shadcn.com
- **n8n Docs:** https://docs.n8n.io

---

## Comenzar Ahora

Para trabajar en el proyecto:

1. **Setup inicial:**
   ```bash
   cd /opt/cane/3t
   npm install
   cp /opt/cane/env/3t.env .env.local
   npm run dev
   ```

2. **Desarrollo con Docker:**
   ```bash
   ./dev.sh
   # Acceder a https://dev.3t.loopia.cl
   ```

3. **Deploy a producción:**
   ```bash
   ./prod.sh
   # Verificar en https://3t.loopia.cl
   ```

4. **Agregar nueva funcionalidad:**
   - Crear componente en `components/`
   - Agregar ruta en `app/`
   - Documentar en `docs/modules/`
   - Actualizar `CHANGELOG.md`

**Recuerda:**
- Comillas dobles en TODAS las tablas "3t_*"
- Variables de entorno con `NEXT_PUBLIC_` para frontend
- Tipos TypeScript explícitos
- Componentes shadcn/ui para consistencia
- Error handling en todas las operaciones
- Logs para trazabilidad

**¡Listo para construir y mantener el sistema completo de Agua Tres Torres!**


