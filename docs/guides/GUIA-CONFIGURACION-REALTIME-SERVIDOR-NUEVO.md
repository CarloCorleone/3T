# 🔴 Guía Completa: Configurar Supabase Realtime en un Servidor Nuevo

**Fecha de Creación:** Noviembre 19, 2025  
**Basado en:** Implementación exitosa en proyecto 3t (Agua Tres Torres)  
**Autor:** Sistema Cane  
**Propósito:** Replicar configuración de Realtime en otro stack/servidor

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Contexto: Lo que se hizo en 3t](#contexto-lo-que-se-hizo-en-3t)
3. [Problemas Encontrados y Soluciones](#problemas-encontrados-y-soluciones)
4. [Requisitos Previos](#requisitos-previos)
5. [Paso 1: Configurar Supabase Realtime](#paso-1-configurar-supabase-realtime)
6. [Paso 2: Generar JWT Válidos con Campo exp](#paso-2-generar-jwt-válidos-con-campo-exp)
7. [Paso 3: Configurar Kong para WebSocket](#paso-3-configurar-kong-para-websocket)
8. [Paso 4: Configurar CORS](#paso-4-configurar-cors)
9. [Paso 5: Variables de Entorno](#paso-5-variables-de-entorno)
10. [Paso 6: Publicar Tablas en Realtime](#paso-6-publicar-tablas-en-realtime)
11. [Paso 7: Implementar en Frontend](#paso-7-implementar-en-frontend)
12. [Verificación y Testing](#verificación-y-testing)
13. [Troubleshooting](#troubleshooting)

---

## 📖 Resumen Ejecutivo

Esta guía documenta cómo activar y configurar **Supabase Realtime** en un servidor con Supabase self-hosted, basándose en la implementación exitosa del proyecto **Agua Tres Torres**.

**Tiempo estimado:** 1-2 horas  
**Nivel de dificultad:** Medio-Alto  
**Servicios afectados:** Supabase (PostgreSQL, Kong, Realtime), Aplicación Frontend

### Lo que lograrás

- ✅ Servicio Realtime operativo en Supabase self-hosted
- ✅ WebSocket funcionando en `wss://api.tudominio.com/realtime/v1/websocket`
- ✅ JWT válidos con campo `exp` (expiration)
- ✅ CORS configurado para tu dominio
- ✅ Actualizaciones en tiempo real en tu aplicación
- ✅ Sincronización automática entre múltiples usuarios

---

## 🎯 Contexto: Lo que se hizo en 3t

### Estado Inicial (Octubre 2025)

- ❌ **Realtime NO estaba habilitado** en Supabase self-hosted
- ❌ WebSocket fallaba con errores 403 Forbidden
- ❌ JWT inválidos (sin campo `exp`)
- ⚠️ Sistema funcionaba solo con polling manual

### Implementación (Noviembre 2025)

1. **Agregado servicio Realtime** al `docker-compose.yml` de Supabase
2. **Regenerados JWT** con campo `exp` (expiration time)
3. **Configurado Kong** para exponer WebSocket
4. **Configurado CORS** para permitir conexiones desde `https://3t.loopia.cl`
5. **Publicadas tablas** en `supabase_realtime` publication
6. **Creado hook `usePedidosRealtime`** para manejar actualizaciones
7. **Limpiado código innecesario** (eliminadas 4 llamadas redundantes a `loadOrders`)

### Resultado

- ✅ **Realtime funcionando** en tabla `3t_orders`
- ✅ Sincronización en < 2 segundos entre pestañas
- ✅ Notificaciones toast automáticas
- ✅ Indicador visual de conexión en vivo
- ✅ Reducción de código y mejor UX

---

## ⚠️ Problemas Encontrados y Soluciones

### Problema 1: JWT sin campo `exp` → WebSocket 403 Forbidden

#### Síntoma
```
WebSocket connection to 'wss://api.loopia.cl/realtime/v1/websocket?...' failed: 403 Forbidden
[Realtime] ❌ Error en canal: CHANNEL_ERROR
```

#### Causa Raíz
Los JWT generados inicialmente **no incluían el campo `exp` (expiration time)**, que es **requerido por Supabase Realtime** para validar tokens.

**JWT inválido (sin `exp`):**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
{
  "role": "anon",
  "iat": 1698451200
}
```

**JWT válido (con `exp`):**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
{
  "role": "anon",
  "iat": 1698451200,
  "exp": 1730073600  // ← CAMPO REQUERIDO
}
```

#### Solución
**Regenerar TODOS los JWT** (ANON_KEY y SERVICE_ROLE_KEY) usando herramientas que incluyan el campo `exp` automáticamente:

- **Opción 1:** https://jwt.io (manual, agregar campo `exp` manualmente)
- **Opción 2:** https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys (recomendado)
- **Opción 3:** Script automatizado (ver Paso 2)

---

### Problema 2: CORS no configurado para WebSocket

#### Síntoma
```
Access to XMLHttpRequest at 'wss://api.loopia.cl/realtime/v1/websocket' 
from origin 'https://3t.loopia.cl' has been blocked by CORS policy
```

#### Causa
Kong necesita configuración CORS específica para el endpoint de Realtime, **separada** de la configuración de REST API.

#### Solución
Agregar sección de Realtime en `kong.yml` con configuración CORS:

```yaml
- name: realtime-v1
  url: http://realtime-dev.supabase-realtime:4000/socket
  routes:
    - name: realtime-v1
      paths:
        - /realtime/v1/
  plugins:
    - name: cors
      config:
        origins:
          - https://3t.loopia.cl  # Tu dominio aquí
          - http://localhost:3000
        credentials: true
        headers:
          - Authorization
          - apikey
          - x-client-info
```

---

### Problema 3: Tablas no publicadas en Realtime

#### Síntoma
```
[Realtime] Error: relation "public.3t_orders" not found
```

#### Causa
Por defecto, **ninguna tabla** está publicada en Realtime. Debes agregarlas manualmente.

#### Solución
```sql
-- Publicar tabla específica
ALTER PUBLICATION supabase_realtime ADD TABLE "3t_orders";

-- Verificar tablas publicadas
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

---

## ✅ Requisitos Previos

### En el Servidor

- [x] **Supabase self-hosted** funcionando (PostgreSQL, Kong, PostgREST, Auth)
- [x] **Docker y Docker Compose** instalados
- [x] **Red Docker compartida** (ej: `cane_net`)
- [x] **Nginx Proxy Manager** o reverse proxy configurado
- [x] **Dominio con SSL** (ej: `api.tudominio.com`)

### En la Aplicación

- [x] **Cliente Supabase** (`@supabase/supabase-js`) instalado
- [x] **Variables de entorno** configuradas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [x] **React o framework compatible** con hooks

---

## 🚀 Paso 1: Configurar Supabase Realtime

### 1.1. Editar `docker-compose.yml` de Supabase

**Ubicación:** `/opt/cane/supabase-project-1/docker-compose.yml` (o tu ruta)

**Agregar servicio Realtime:**

```yaml
services:
  # ... otros servicios ...

  realtime:
    container_name: realtime-dev.supabase-realtime
    image: supabase/realtime:v2.34.47  # Usar versión estable
    restart: unless-stopped
    
    # Límites de memoria (Realtime tiene memory leaks)
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    
    depends_on:
      db:
        condition: service_healthy
      analytics:
        condition: service_healthy
    
    healthcheck:
      test:
        [
          "CMD",
          "curl",
          "-sSfL",
          "--head",
          "-o",
          "/dev/null",
          "-H",
          "Authorization: Bearer ${ANON_KEY}",
          "http://localhost:4000/api/tenants/realtime-dev/health"
        ]
      timeout: 5s
      interval: 5s
      retries: 3
    
    environment:
      PORT: 4000
      DB_HOST: ${POSTGRES_HOST}
      DB_PORT: ${POSTGRES_PORT}
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: ${POSTGRES_DB}
      DB_AFTER_CONNECT_QUERY: 'SET search_path TO _realtime'
      DB_ENC_KEY: supabaserealtime
      API_JWT_SECRET: ${JWT_SECRET}
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      ERL_AFLAGS: -proto_dist inet_tcp
      DNS_NODES: "''"
      RLIMIT_NOFILE: "10000"
      APP_NAME: realtime
      SEED_SELF_HOST: true
      RUN_JANITOR: true
    
    networks:
      - cane_net  # Tu red Docker
```

**Notas importantes:**

- `container_name` debe ser **exactamente** `realtime-dev.supabase-realtime` (Realtime construye tenant ID desde el subdomain)
- Límites de memoria son **importantes** (Realtime tiene memory leaks conocidos en beam.smp)
- `SEED_SELF_HOST: true` crea el tenant automáticamente

---

## 🔑 Paso 2: Generar JWT Válidos con Campo `exp`

### 2.1. ¿Por qué necesitas regenerar?

Si tu Supabase fue configurado antes de activar Realtime, es probable que tus JWT **NO tengan el campo `exp`**, que es **obligatorio** para Realtime.

### 2.2. Verificar JWT actuales

```bash
# Leer ANON_KEY actual
cat /opt/cane/env/mcp-supabase.env | grep ANON_KEY

# Decodificar en https://jwt.io
# Buscar campo "exp" en el payload
```

**Si NO tiene `exp`, debes regenerar.**

### 2.3. Opción 1: Usar script automatizado (Recomendado)

**Crear archivo:** `/tmp/generate-supabase-jwt.sh`

```bash
#!/bin/bash

# Variables
JWT_SECRET="tu-jwt-secret-aqui"  # Mismo que JWT_SECRET en .env
EXPIRATION_YEARS=10  # JWT válido por 10 años

# Fecha de emisión (ahora)
IAT=$(date +%s)

# Fecha de expiración (10 años desde ahora)
EXP=$(($IAT + ($EXPIRATION_YEARS * 365 * 24 * 60 * 60)))

echo "Generando JWT con:"
echo "  IAT (issued at): $IAT"
echo "  EXP (expiration): $EXP"
echo ""

# Generar ANON_KEY
ANON_PAYLOAD=$(echo -n '{"role":"anon","iss":"supabase","iat":'$IAT',"exp":'$EXP'}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
ANON_HEADER=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
ANON_SIGNATURE=$(echo -n "${ANON_HEADER}.${ANON_PAYLOAD}" | openssl dgst -binary -sha256 -hmac "$JWT_SECRET" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
ANON_KEY="${ANON_HEADER}.${ANON_PAYLOAD}.${ANON_SIGNATURE}"

echo "ANON_KEY:"
echo "$ANON_KEY"
echo ""

# Generar SERVICE_ROLE_KEY
SERVICE_PAYLOAD=$(echo -n '{"role":"service_role","iss":"supabase","iat":'$IAT',"exp":'$EXP'}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
SERVICE_HEADER=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
SERVICE_SIGNATURE=$(echo -n "${SERVICE_HEADER}.${SERVICE_PAYLOAD}" | openssl dgst -binary -sha256 -hmac "$JWT_SECRET" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
SERVICE_ROLE_KEY="${SERVICE_HEADER}.${SERVICE_PAYLOAD}.${SERVICE_SIGNATURE}"

echo "SERVICE_ROLE_KEY:"
echo "$SERVICE_ROLE_KEY"
```

**Ejecutar:**

```bash
chmod +x /tmp/generate-supabase-jwt.sh
bash /tmp/generate-supabase-jwt.sh
```

### 2.4. Opción 2: Usar jwt.io (Manual)

1. Ve a https://jwt.io
2. Selecciona algoritmo: **HS256**
3. En **PAYLOAD**, pega:

```json
{
  "role": "anon",
  "iss": "supabase",
  "iat": 1698451200,
  "exp": 1730073600
}
```

**Cálculo de `exp`:**
```bash
# Fecha actual en segundos
date +%s

# Agregar 10 años (315360000 segundos)
echo $(($(date +%s) + 315360000))
```

4. En **VERIFY SIGNATURE**, pega tu `JWT_SECRET`
5. Copia el JWT generado

**Repetir para `service_role`:**

```json
{
  "role": "service_role",
  "iss": "supabase",
  "iat": 1698451200,
  "exp": 1730073600
}
```

### 2.5. Actualizar variables de entorno

**Archivo:** `/opt/cane/env/mcp-supabase.env` (o tu ubicación)

```bash
# Supabase JWT
JWT_SECRET=tu-secret-original  # NO cambiar
ANON_KEY=eyJhbGci... # NUEVO JWT con exp
SERVICE_ROLE_KEY=eyJhbGci... # NUEVO JWT con exp
```

**⚠️ IMPORTANTE:**

- **NO cambies `JWT_SECRET`** (si lo cambias, invalidas sesiones de usuarios)
- Solo reemplaza `ANON_KEY` y `SERVICE_ROLE_KEY`
- Guarda backup de los valores anteriores por seguridad

### 2.6. Actualizar en aplicaciones

**Todas las aplicaciones** que usen estos JWT deben actualizarse:

```bash
# Ejemplo: Aplicación 3t
nano /opt/cane/env/3t.env

# Actualizar:
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... # NUEVO JWT con exp
```

---

## 🌐 Paso 3: Configurar Kong para WebSocket

### 3.1. Editar configuración de Kong

**Archivo:** `/opt/cane/supabase-project-1/volumes/api/kong.yml`

**Agregar al final (después de las secciones existentes):**

```yaml
## Realtime
- name: realtime-v1
  url: http://realtime-dev.supabase-realtime:4000/socket
  routes:
    - name: realtime-v1
      strip_path: true
      paths:
        - /realtime/v1/
  plugins:
    - name: cors
      config:
        origins:
          - https://3t.loopia.cl  # ← Cambia por tu dominio
          - https://tu-app.tudominio.com
          - http://localhost:3000  # Para desarrollo
          - http://127.0.0.1:3000
        methods:
          - GET
          - HEAD
          - PUT
          - PATCH
          - POST
          - DELETE
          - OPTIONS
        headers:
          - Authorization
          - Content-Type
          - apikey
          - x-client-info
        exposed_headers:
          - X-Request-Id
        credentials: true
        max_age: 3600
```

**Notas:**

- `url` debe apuntar al contenedor Realtime: `http://realtime-dev.supabase-realtime:4000/socket`
- `strip_path: true` es **importante** para que la ruta se pase correctamente
- Agrega **todos** los dominios desde donde accederás (producción, desarrollo, localhost)

---

## 🔒 Paso 4: Configurar CORS

### 4.1. CORS en PostgREST

**Archivo:** `/opt/cane/supabase-project-1/docker-compose.yml`

**Buscar servicio `rest` y actualizar:**

```yaml
rest:
  # ...
  environment:
    # ...
    PGRST_CORS_DOMAIN: https://costos.loopia.cl,https://3t.loopia.cl,https://tu-app.tudominio.com,http://localhost:3000,http://127.0.0.1:3000
```

### 4.2. Verificar CORS en secciones de Storage (si usas)

**En mismo archivo `kong.yml`, buscar secciones:**

- `storage-v1-public`
- `storage-v1`

**Agregar tu dominio a cada una:**

```yaml
- name: cors
  config:
    origins:
      - https://costos.loopia.cl
      - https://3t.loopia.cl
      - https://tu-app.tudominio.com  # ← Agregar
```

---

## ⚙️ Paso 5: Variables de Entorno

### 5.1. Verificar archivo de variables de Supabase

**Archivo:** `/opt/cane/supabase-project-1/.env`

**Asegurar que existan:**

```bash
# PostgreSQL
POSTGRES_HOST=supabase-db
POSTGRES_DB=postgres
POSTGRES_PASSWORD=tu-password-seguro

# JWT (con campo exp - ver Paso 2)
JWT_SECRET=tu-jwt-secret
JWT_EXPIRY=3600
ANON_KEY=eyJhbGci... # CON CAMPO EXP
SERVICE_ROLE_KEY=eyJhbGci... # CON CAMPO EXP

# Realtime
SECRET_KEY_BASE=$(openssl rand -base64 32)

# API Externa
API_EXTERNAL_URL=https://api.tudominio.com
SUPABASE_PUBLIC_URL=https://api.tudominio.com
```

### 5.2. Generar SECRET_KEY_BASE (si no existe)

```bash
openssl rand -base64 32
```

Agregar resultado a `.env`:

```bash
SECRET_KEY_BASE=AbCdEf123456...
```

---

## 📊 Paso 6: Publicar Tablas en Realtime

### 6.1. Conectar a PostgreSQL

```bash
# Opción 1: Desde contenedor
docker exec -it supabase-db psql -U postgres -d postgres

# Opción 2: Desde MCP (si está configurado)
# Usar herramientas MCP de Supabase
```

### 6.2. Verificar publicación actual

```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**Si está vacía**, significa que NO hay tablas publicadas.

### 6.3. Publicar tablas necesarias

```sql
-- Publicar tablas individualmente
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."3t_orders";
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."3t_customers";
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."3t_routes";

-- O publicar todas las tablas de un esquema (usar con precaución)
-- ALTER PUBLICATION supabase_realtime ADD TABLES IN SCHEMA public;
```

**⚠️ Seguridad:**

- Solo publica tablas que **necesitas en tiempo real**
- Realtime respeta RLS (Row Level Security), pero consume más recursos
- Evita publicar tablas con datos sensibles innecesarios

### 6.4. Verificar tablas publicadas

```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

**Salida esperada:**

```
 schemaname |   tablename
------------+---------------
 public     | 3t_customers
 public     | 3t_orders
 public     | 3t_routes
```

---

## 🎨 Paso 7: Implementar en Frontend

### 7.1. Crear hook personalizado

**Archivo:** `/hooks/use-orders-realtime.ts` (ejemplo)

```typescript
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseOrdersRealtimeProps {
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

interface UseOrdersRealtimeReturn {
  isConnected: boolean
}

export function useOrdersRealtime({
  onInsert,
  onUpdate,
  onDelete
}: UseOrdersRealtimeProps): UseOrdersRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false)
  
  // useRef para evitar re-suscripciones innecesarias
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)
  
  // Actualizar refs cuando cambien los callbacks
  useEffect(() => {
    onInsertRef.current = onInsert
    onUpdateRef.current = onUpdate
    onDeleteRef.current = onDelete
  }, [onInsert, onUpdate, onDelete])
  
  useEffect(() => {
    let channel: RealtimeChannel | null = null
    
    try {
      console.log('[Realtime Orders] Iniciando suscripción...')
      
      channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: '3t_orders'  // Cambiar por tu tabla
          },
          (payload) => {
            console.log('[Realtime Orders] Cambio detectado:', payload.eventType)
            
            if (payload.eventType === 'INSERT' && onInsertRef.current) {
              onInsertRef.current(payload.new)
            } else if (payload.eventType === 'UPDATE' && onUpdateRef.current) {
              onUpdateRef.current(payload.new)
            } else if (payload.eventType === 'DELETE' && onDeleteRef.current) {
              onDeleteRef.current(payload.old)
            }
          }
        )
        .subscribe((status, err) => {
          console.log('[Realtime Orders] Estado:', status)
          
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime Orders] ✅ Suscrito')
            setIsConnected(true)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('[Realtime Orders] ❌ Error:', status, err)
            setIsConnected(false)
          }
        })
    } catch (error) {
      console.error('[Realtime Orders] Error:', error)
      setIsConnected(false)
    }
    
    return () => {
      if (channel) {
        console.log('[Realtime Orders] Desuscribiendo...')
        channel.unsubscribe()
        setIsConnected(false)
      }
    }
  }, []) // ⚠️ CRÍTICO: Array vacío para suscribir solo 1 vez
  
  return { isConnected }
}
```

### 7.2. Integrar en componente

**Archivo:** `/app/orders/page.tsx` (ejemplo)

```typescript
'use client'

import { useOrdersRealtime } from '@/hooks/use-orders-realtime'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export default function OrdersPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState([])

  // Función para cargar datos
  const loadOrders = async () => {
    const { data } = await supabase.from('3t_orders').select('*')
    setOrders(data || [])
  }

  // Hook Realtime
  const { isConnected } = useOrdersRealtime({
    onInsert: (newOrder) => {
      console.log('Nuevo pedido:', newOrder)
      loadOrders()  // Recargar para obtener datos con JOINs
      toast({
        title: '📦 Nuevo pedido',
        description: 'Pedido creado por otro usuario',
      })
    },
    onUpdate: (updatedOrder) => {
      console.log('Pedido actualizado:', updatedOrder)
      loadOrders()
      toast({
        title: '✏️ Pedido actualizado',
        description: `Cambios en pedido ${updatedOrder.id}`,
      })
    },
    onDelete: (deletedOrder) => {
      console.log('Pedido eliminado:', deletedOrder)
      setOrders(prev => prev.filter(o => o.id !== deletedOrder.id))
      toast({
        title: '🗑️ Pedido eliminado',
        description: 'Pedido eliminado por otro usuario',
      })
    }
  })

  // Cargar datos iniciales
  useEffect(() => {
    loadOrders()
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1>Lista de Pedidos</h1>
        
        {/* Indicador de conexión */}
        <Badge variant={isConnected ? "default" : "secondary"}>
          {isConnected ? "🟢 En vivo" : "⚪ Sin conexión"}
        </Badge>
      </div>
      
      {/* Tu contenido aquí */}
    </div>
  )
}
```

---

## ✅ Verificación y Testing

### 8.1. Reiniciar servicios

```bash
# 1. Reiniciar Supabase completo
cd /opt/cane/supabase-project-1
docker compose down
docker compose up -d

# 2. Ver logs de Realtime
docker logs -f realtime-dev.supabase-realtime

# Buscar:
# "Finished setting up tenant: realtime-dev"
# "Successfully subscribed to PostgreSQL logical replication"

# 3. Reconstruir aplicación frontend
cd /opt/cane/tu-app
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 8.2. Verificar salud de Realtime

```bash
# Healthcheck del contenedor
docker inspect realtime-dev.supabase-realtime | grep -A 5 '"Health"'

# Debería mostrar: "Status": "healthy"
```

### 8.3. Probar WebSocket manualmente

**Opción 1: wscat (instalar si no lo tienes)**

```bash
npm install -g wscat

# Conectar a WebSocket
wscat -c "wss://api.tudominio.com/realtime/v1/websocket?apikey=TU_ANON_KEY&vsn=1.0.0"

# Debería responder:
# Connected (press CTRL+C to quit)
# < {"event":"system","payload":{"status":"ok"},"ref":null,"topic":"system"}
```

**Opción 2: Navegador (DevTools)**

1. Abrir https://tu-app.tudominio.com
2. Abrir DevTools → Console
3. Ejecutar:

```javascript
const ws = new WebSocket('wss://api.tudominio.com/realtime/v1/websocket?apikey=TU_ANON_KEY&vsn=1.0.0')
ws.onopen = () => console.log('✅ WebSocket conectado')
ws.onerror = (e) => console.error('❌ Error WebSocket:', e)
ws.onmessage = (m) => console.log('📨 Mensaje:', m.data)
```

### 8.4. Probar actualización en tiempo real

1. **Abrir app en 2 pestañas diferentes**
2. **Verificar en consola** de ambas:
   ```
   [Realtime Orders] Iniciando suscripción...
   [Realtime Orders] Estado: SUBSCRIBED
   [Realtime Orders] ✅ Suscrito
   ```
3. **Crear un registro** en Pestaña 1
4. **Ver aparecer en Pestaña 2** (< 2 segundos)
5. **Ver notificación toast** en Pestaña 2

### 8.5. Verificar logs de Supabase

```bash
# Logs de Realtime
docker logs realtime-dev.supabase-realtime --tail 100

# Logs de Kong (para ver requests WebSocket)
docker logs supabase-kong --tail 100 | grep realtime

# Logs de PostgreSQL (para ver replication)
docker logs supabase-db --tail 100 | grep logical
```

---

## 🔧 Troubleshooting

### Error 1: WebSocket 403 Forbidden

**Síntoma:**
```
WebSocket connection failed: 403 Forbidden
```

**Causas posibles:**

1. **JWT sin campo `exp`**
   ```bash
   # Verificar JWT
   echo "TU_ANON_KEY" | cut -d. -f2 | base64 -d | jq .
   
   # Debe mostrar campo "exp"
   # Si no lo tiene, regenerar (ver Paso 2)
   ```

2. **JWT_SECRET incorrecto**
   ```bash
   # Verificar que sea el mismo en todos los servicios
   docker exec supabase-kong env | grep JWT_SECRET
   docker exec realtime-dev.supabase-realtime env | grep API_JWT_SECRET
   docker exec supabase-rest env | grep PGRST_JWT_SECRET
   
   # Todos deben ser iguales
   ```

3. **ANON_KEY no actualizado**
   ```bash
   # Verificar variable en aplicación
   docker exec tu-app env | grep NEXT_PUBLIC_SUPABASE_ANON_KEY
   
   # Debe coincidir con ANON_KEY en Supabase
   ```

---

### Error 2: WebSocket 404 Not Found

**Síntoma:**
```
GET wss://api.tudominio.com/realtime/v1/websocket 404
```

**Causas posibles:**

1. **Kong no expone ruta de Realtime**
   ```bash
   # Verificar kong.yml
   docker exec supabase-kong cat /home/kong/kong.yml | grep -A 10 "realtime-v1"
   
   # Debe existir sección realtime-v1
   ```

2. **Kong no reiniciado después de cambios**
   ```bash
   cd /opt/cane/supabase-project-1
   docker compose restart kong
   
   # Ver logs
   docker logs supabase-kong --tail 50
   ```

3. **Realtime no está corriendo**
   ```bash
   docker ps | grep realtime
   
   # Si no aparece:
   docker compose up -d realtime
   ```

---

### Error 3: CORS Error

**Síntoma:**
```
Access to XMLHttpRequest at 'wss://...' from origin 'https://tu-app.com' 
has been blocked by CORS policy
```

**Solución:**

1. **Verificar CORS en kong.yml**
   ```bash
   docker exec supabase-kong cat /home/kong/kong.yml | grep -A 15 "realtime-v1"
   
   # Buscar sección "cors" con tu dominio
   ```

2. **Agregar dominio si falta**
   ```yaml
   # En kong.yml, sección realtime-v1
   - name: cors
     config:
       origins:
         - https://tu-app.tudominio.com  # ← Agregar
   ```

3. **Reiniciar Kong**
   ```bash
   docker compose restart kong
   ```

4. **Verificar con curl**
   ```bash
   curl -H "Origin: https://tu-app.tudominio.com" \
        -H "apikey: TU_ANON_KEY" \
        https://api.tudominio.com/realtime/v1/health -I
   
   # Buscar header:
   # access-control-allow-origin: https://tu-app.tudominio.com
   ```

---

### Error 4: relation not found

**Síntoma:**
```
[Realtime] Error: relation "public.3t_orders" not found
```

**Solución:**

```sql
-- Conectar a PostgreSQL
docker exec -it supabase-db psql -U postgres -d postgres

-- Publicar tabla
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."3t_orders";

-- Verificar
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

---

### Error 5: Bucle infinito SUBSCRIBED → CLOSED

**Síntoma:**
```
[Realtime] Estado: SUBSCRIBED
[Realtime] Estado: CLOSED
[Realtime] Estado: SUBSCRIBED
... (se repite infinitamente)
```

**Causa:** Callbacks en dependencias de `useEffect`

**Solución:**

```typescript
// ❌ INCORRECTO
useEffect(() => {
  // suscripción...
}, [onInsert, onUpdate, onDelete])  // ← Causa re-suscripciones

// ✅ CORRECTO
const onInsertRef = useRef(onInsert)
const onUpdateRef = useRef(onUpdate)
const onDeleteRef = useRef(onDelete)

useEffect(() => {
  onInsertRef.current = onInsert
  onUpdateRef.current = onUpdate
  onDeleteRef.current = onDelete
}, [onInsert, onUpdate, onDelete])

useEffect(() => {
  // usar refs en lugar de callbacks directos
  // ...
}, [])  // ← Array vacío
```

---

### Error 6: Realtime consume mucha memoria

**Síntoma:**
```
Container realtime-dev.supabase-realtime is using 800MB+ of memory
```

**Causa:** Memory leak conocido en `beam.smp` (Elixir VM)

**Solución temporal:**

1. **Limitar memoria en docker-compose.yml**
   ```yaml
   realtime:
     deploy:
       resources:
         limits:
           memory: 512M
   ```

2. **Crear cron para reiniciar periódicamente**
   ```bash
   # Editar crontab
   sudo crontab -e
   
   # Agregar línea (reiniciar cada 6 horas)
   0 */6 * * * cd /opt/cane/supabase-project-1 && docker compose restart realtime
   ```

**Solución permanente:** Actualizar a versión más reciente de Realtime cuando esté disponible

---

## 📚 Recursos Adicionales

### Documentación Oficial

- [Supabase Realtime Self-Hosting](https://supabase.com/docs/guides/self-hosting/docker#realtime)
- [Supabase Realtime JS Client](https://supabase.com/docs/reference/javascript/subscribe)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)

### Archivos de Referencia (Proyecto 3t)

- `/opt/cane/3t/hooks/use-pedidos-realtime.ts` - Hook de ejemplo
- `/opt/cane/3t/app/pedidos/page.tsx` - Integración en página
- `/opt/cane/3t/docs/guides/GUIA-IMPLEMENTACION-REALTIME.md` - Guía original
- `/opt/cane/supabase-project-1/docker-compose.yml` - Configuración Supabase
- `/opt/cane/supabase-project-1/volumes/api/kong.yml` - Configuración Kong

### Herramientas Útiles

- **jwt.io** - Decodificar/generar JWT
- **wscat** - Cliente WebSocket CLI
- **DevTools** - Debugging WebSocket en navegador

---

## 📋 Checklist Final

### Configuración Supabase

- [ ] Servicio Realtime agregado a `docker-compose.yml`
- [ ] JWT regenerados con campo `exp`
- [ ] Variables de entorno actualizadas (`ANON_KEY`, `SERVICE_ROLE_KEY`)
- [ ] Kong configurado con sección `realtime-v1`
- [ ] CORS configurado para tu dominio
- [ ] Tablas publicadas en `supabase_realtime`
- [ ] Servicios reiniciados (`docker compose down && docker compose up -d`)

### Configuración Aplicación

- [ ] Hook Realtime creado (`use-[modulo]-realtime.ts`)
- [ ] Hook integrado en componente
- [ ] Indicador visual de conexión agregado
- [ ] Notificaciones toast configuradas
- [ ] Variables de entorno actualizadas con nuevo `ANON_KEY`
- [ ] Aplicación reconstruida (`docker compose build --no-cache`)

### Testing

- [ ] Contenedor Realtime en estado `healthy`
- [ ] WebSocket responde con `wscat` o DevTools
- [ ] Logs de Realtime muestran "Successfully subscribed"
- [ ] Prueba en 2 pestañas: cambio aparece en < 2 segundos
- [ ] Notificaciones toast funcionan
- [ ] Indicador "🟢 En vivo" aparece

### Documentación

- [ ] Configuración documentada en README o similar
- [ ] Variables de entorno respaldadas
- [ ] JWT antiguos guardados como backup
- [ ] Troubleshooting documentado para el equipo

---

## 🎯 Resultado Esperado

Al completar esta guía, deberías tener:

✅ **Supabase Realtime funcionando** en tu servidor self-hosted  
✅ **WebSocket operativo** en `wss://api.tudominio.com/realtime/v1/websocket`  
✅ **JWT válidos** con campo `exp` para autenticación  
✅ **CORS configurado** para tus dominios  
✅ **Tablas publicadas** en Realtime  
✅ **Frontend integrado** con hook personalizado  
✅ **Sincronización en tiempo real** < 2 segundos  
✅ **Indicadores visuales** de estado de conexión  
✅ **Notificaciones** automáticas de cambios  

---

## 🙏 Créditos

Esta guía está basada en la implementación exitosa de Supabase Realtime en el proyecto **Agua Tres Torres (3t)**, desarrollado por el Sistema Cane.

**Implementación original:** Noviembre 2025  
**Documentación:** Noviembre 19, 2025  
**Versión:** 1.0  

---

## 💬 Soporte

Si encuentras problemas:

1. Revisa la sección [Troubleshooting](#troubleshooting)
2. Verifica logs de servicios:
   ```bash
   docker logs realtime-dev.supabase-realtime
   docker logs supabase-kong
   docker logs tu-app
   ```
3. Consulta documentación oficial de Supabase
4. Revisa archivos de referencia del proyecto 3t

---

**¿Preguntas? Consulta la documentación del proyecto 3t en `/opt/cane/3t/docs/`**

✅ **Guía completa lista para usar.**





