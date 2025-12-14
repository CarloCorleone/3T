# ⚠️ WebSocket Realtime Deshabilitado - Supabase Self-Hosted

**Fecha:** Octubre 28, 2025  
**Estado:** ✅ RESUELTO  
**Tipo:** Configuración de Infraestructura

---

## 📖 Resumen Ejecutivo

La aplicación Agua Tres Torres generaba errores infinitos de WebSocket en la consola del navegador porque intentaba conectarse al servicio Supabase Realtime, el cual NO está habilitado en la instancia self-hosted de Supabase (`api.loopia.cl`).

**Solución:** Código de Realtime completamente deshabilitado hasta que el servicio sea configurado en el servidor.

---

## 🔴 Problema Original

### Síntomas

**Consola del navegador:**
```
WebSocket connection to 'wss://api.loopia.cl/realtime/v1/websocket?...' failed
[useNotifications] ⚠️ Error en canal realtime: undefined
[useNotifications] ⚠️ Realtime deshabilitado después de 3 intentos.
```

**Repetición:** Los errores se repetían infinitamente, contaminando la consola.

**Impacto:**
- ❌ Logs de consola contaminados (dificulta debugging)
- ❌ Intentos de conexión innecesarios (desperdicio de recursos)
- ⚠️ La funcionalidad de notificaciones NO se veía afectada (nunca funcionó Realtime)

---

## 🔍 Análisis del Problema

### Causa Raíz

**Supabase Self-Hosted NO tiene el servicio Realtime configurado.**

**Evidencia:**

1. **Documentación del proyecto** (`docs/troubleshooting/SOLUCION-CORS-SUPABASE.md`) solo menciona:
   - PostgREST (API REST)
   - Kong (API Gateway)
   - Auth (Autenticación)
   - **NO menciona Realtime**

2. **Configuración de CORS** solo incluye:
   ```yaml
   # PostgREST - CORS configurado ✓
   # Kong - CORS configurado ✓
   # Realtime - NO EXISTE ✗
   ```

3. **Variables de entorno** (`/opt/cane/env/3t.env`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   # No hay variables de Realtime
   ```

4. **Error de WebSocket:** La conexión falla porque el endpoint `wss://api.loopia.cl/realtime/v1/websocket` no existe.

### ¿Por Qué Ocurría?

El hook `use-notifications.ts` intentaba suscribirse a cambios en tiempo real en la tabla `3t_notifications_log` usando el servicio Realtime de Supabase:

```typescript
const channel = supabase
  .channel('notifications-realtime')
  .on('postgres_changes', {...})
  .subscribe()
```

Supabase JS SDK **automáticamente intenta reconectarse** cuando la conexión WebSocket falla, generando intentos infinitos.

---

## 🛠️ Soluciones Intentadas

### ❌ Intento 1: Manejo Graceful con Límite de Reintentos

**Estrategia:** Agregar try-catch y limitar a 3 intentos de reconexión.

**Resultado:** **FALLÓ** ❌

**Por qué no funcionó:**
- El `retryCount` solo contaba errores en el callback
- **Supabase Realtime Client tiene su propio mecanismo de auto-reconexión** que sigue intentando conectar indefinidamente
- El límite de 3 reintentos solo aplicaba a los callbacks de error, no a los intentos de conexión del SDK

**Logs resultantes:**
```
WebSocket connection failed (x∞)
⚠️ Error en canal realtime (x∞)
⚠️ Realtime deshabilitado después de 3 intentos (mensaje aparece pero no detiene conexiones)
```

---

### ✅ Intento 2: Deshabilitar Completamente el Código de Realtime

**Estrategia:** Comentar completamente el código de suscripción a Realtime.

**Resultado:** **EXITOSO** ✅

**Implementación:**

```typescript
// ⚠️ REALTIME DESHABILITADO
// La instancia de Supabase self-hosted no tiene el servicio Realtime configurado.
// Las notificaciones se actualizan mediante refresh manual o al recargar la página.

/* CÓDIGO DE REALTIME (DESHABILITADO)
useEffect(() => {
  let channel = supabase.channel('notifications-realtime')...
  // ... código completo comentado
}, [])
*/

// Log informativo (solo en desarrollo)
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[useNotifications] ℹ️ Realtime deshabilitado. Las notificaciones se actualizan con refresh manual.')
  }
}, [])
```

**Beneficios:**
- ✅ **Cero intentos de conexión WebSocket**
- ✅ **Consola limpia** (sin errores)
- ✅ **App funciona perfectamente** (Realtime nunca fue requerido)
- ✅ **Código preservado** para habilitar en el futuro
- ✅ **Log informativo** en desarrollo

---

## 📦 Archivos Modificados

### 1. `/opt/cane/3t/hooks/use-notifications.ts`

**Cambio:** Código de Realtime completamente comentado.

**Líneas afectadas:** 168-234

**Diff:**
```diff
- // Suscribirse a cambios en tiempo real
  useEffect(() => {
-   let channel: any = null
-   channel = supabase.channel('notifications-realtime')...
-   .subscribe()
+   // ⚠️ REALTIME DESHABILITADO
+   /* CÓDIGO DE REALTIME (DESHABILITADO)
+   ... código completo comentado ...
+   */
+   if (process.env.NODE_ENV === 'development') {
+     console.log('[useNotifications] ℹ️ Realtime deshabilitado.')
+   }
  }, [])
```

### 2. `/opt/cane/3t/docs/CHANGELOG.md`

**Cambio:** Entrada completa documentando el problema y solución.

**Sección:** "Octubre 28, 2025 - Limpieza de Warnings de Consola y Optimizaciones"

---

## ✅ Resultado Final

### Antes (Consola Contaminada)

```
🔴 WebSocket connection failed (intento 1)
⚠️ Error en canal realtime: undefined
🔴 WebSocket connection failed (intento 2)
⚠️ Error en canal realtime: undefined
🔴 WebSocket connection failed (intento 3)
⚠️ Error en canal realtime: undefined
⚠️ Realtime deshabilitado después de 3 intentos
🔴 WebSocket connection failed (intento 4) ← Sigue intentando
⚠️ Error en canal realtime: undefined
... (infinito)
```

### Después (Consola Limpia)

```
ℹ️ Realtime deshabilitado. Las notificaciones se actualizan con refresh manual.
✅ Sesión verificada: Carlo Espinoza - admin
(Sin errores de WebSocket)
```

---

## 🎯 Funcionalidad Actual

### ✅ Lo que SÍ funciona

1. **Carga de notificaciones:** Al abrir el componente se cargan las últimas 50 notificaciones
2. **Refresh manual:** Botón para actualizar notificaciones manualmente
3. **Marcar como leídas:** Funcionalidad completa
4. **Limpiar notificaciones:** Funcionalidad completa
5. **Contador de no leídas:** Funciona correctamente
6. **Actualización al recargar:** Al recargar la página se actualizan

### ❌ Lo que NO funciona (nunca funcionó)

1. **Notificaciones en tiempo real:** NO se actualizan automáticamente cuando se crea una nueva notificación
   - **Razón:** Supabase Realtime no está habilitado en el servidor
   - **Workaround:** Usar refresh manual o recargar página

---

## 🚀 Cómo Habilitar Realtime en el Futuro

Si en el futuro se quiere habilitar las notificaciones en tiempo real, seguir estos pasos:

### Paso 1: Configurar Supabase Realtime en el Servidor

**Archivo:** `/opt/cane/supabase-project-1/docker-compose.yml`

1. Agregar servicio Realtime:
```yaml
services:
  realtime:
    image: supabase/realtime:latest
    environment:
      DB_HOST: supabase-db
      DB_PORT: 5432
      DB_NAME: postgres
      DB_USER: postgres
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_SSL: "false"
      PORT: 4000
      JWT_SECRET: ${JWT_SECRET}
    networks:
      - cane_net
    restart: unless-stopped
```

2. Exponer el servicio en Kong

### Paso 2: Configurar CORS para WebSocket

**Archivo:** `/opt/cane/supabase-project-1/volumes/api/kong.yml`

Agregar configuración de Realtime:
```yaml
- name: realtime
  url: http://realtime:4000/socket
  routes:
    - name: realtime-v1
      paths:
        - /realtime/v1/
  plugins:
    - name: cors
      config:
        origins:
          - https://3t.loopia.cl
        credentials: true
```

### Paso 3: Actualizar Variables de Entorno

**Archivo:** `/opt/cane/env/3t.env`

```bash
# Realtime (si se habilita)
NEXT_PUBLIC_SUPABASE_REALTIME_URL=wss://api.loopia.cl/realtime/v1
```

### Paso 4: Habilitar el Código en la App

**Archivo:** `/opt/cane/3t/hooks/use-notifications.ts`

1. Comentar el log informativo:
```typescript
// useEffect(() => {
//   if (process.env.NODE_ENV === 'development') {
//     console.log('[useNotifications] ℹ️ Realtime deshabilitado.')
//   }
// }, [])
```

2. Descomentar el código de Realtime:
```typescript
/* CÓDIGO DE REALTIME (DESHABILITADO) ← Eliminar esta línea
useEffect(() => {
  let channel: any = null
  
  try {
    channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {...})
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useNotifications] ✅ Suscrito a notificaciones en tiempo real')
        }
      })
  } catch (error) {
    console.warn('[useNotifications] ⚠️ Error configurando realtime:', error)
  }
  
  return () => {
    if (channel) channel.unsubscribe()
  }
}, [])
*/ ← Eliminar esta línea
```

### Paso 5: Reiniciar Servicios

```bash
# Reiniciar Supabase con Realtime
cd /opt/cane/supabase-project-1
docker compose up -d

# Reconstruir app 3t
cd /opt/cane/3t
docker compose build --no-cache
docker compose up -d

# Verificar logs
docker logs -f 3t-app
```

### Paso 6: Verificar Funcionamiento

```bash
# Probar WebSocket
wscat -c "wss://api.loopia.cl/realtime/v1/websocket?apikey=<ANON_KEY>&vsn=1.0.0"

# Debería responder con:
# {"event":"system","payload":{"status":"ok"},"ref":null,"topic":"system"}
```

**Consola del navegador (esperado):**
```
✅ Suscrito a notificaciones en tiempo real
```

---

## 📚 Referencias

### Documentación del Proyecto
- **README.md** - Arquitectura general
- **docs/CHANGELOG.md** - Historial completo de cambios
- **docs/CONFIGURACION-PRODUCCION.md** - Configuración actual
- **docs/troubleshooting/SOLUCION-CORS-SUPABASE.md** - Configuración CORS existente

### Documentación Externa
- [Supabase Realtime Self-Hosting](https://supabase.com/docs/guides/self-hosting/docker#realtime)
- [Supabase JS Client - Realtime](https://supabase.com/docs/reference/javascript/subscribe)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

## 💡 Lecciones Aprendidas

### 1. Auto-Reconexión de Supabase Realtime
**Problema:** Los SDKs modernos implementan auto-reconexión automática.  
**Solución:** No intentar controlar reintentos desde el código; mejor deshabilitar completamente.

### 2. Verificar Infraestructura Antes de Usar Features
**Problema:** Usar Realtime sin verificar si está habilitado en el servidor.  
**Solución:** Revisar la documentación de infraestructura (`CONFIGURACION-PRODUCCION.md`) antes de implementar features que requieren servicios específicos.

### 3. Comentar Código en Lugar de Eliminar
**Problema:** Si eliminas código, es difícil recuperarlo después.  
**Solución:** Comentar con instrucciones claras de cómo habilitarlo en el futuro.

### 4. Logs Informativos
**Problema:** Los usuarios no saben por qué algo no funciona.  
**Solución:** Agregar logs claros explicando el estado actual (ej: "Realtime deshabilitado").

---

## 🔧 Comandos Útiles

### Ver Servicios de Supabase

```bash
cd /opt/cane/supabase-project-1
docker compose ps

# Debería mostrar:
# - supabase-db (PostgreSQL)
# - supabase-kong (API Gateway)
# - rest (PostgREST)
# - auth (GoTrue)
# - storage (Storage API)
# ❌ NO debería mostrar "realtime"
```

### Probar Conectividad REST (funciona)

```bash
curl https://api.loopia.cl/rest/v1/ \
  -H "apikey: $ANON_KEY"

# Responde: {"message":"ok"}
```

### Probar Conectividad WebSocket (falla - esperado)

```bash
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  https://api.loopia.cl/realtime/v1/websocket

# Responde: 404 Not Found (esperado - servicio no existe)
```

---

## ✅ Checklist de Verificación

### Estado Actual (Realtime Deshabilitado)
- [x] Código de Realtime comentado en `use-notifications.ts`
- [x] Log informativo en desarrollo
- [x] Consola sin errores de WebSocket
- [x] Notificaciones funcionan con refresh manual
- [x] Documentación completa del problema
- [x] Instrucciones para habilitar en el futuro

### Para Habilitar Realtime (Futuro)
- [ ] Servicio Realtime configurado en Supabase
- [ ] Puerto WebSocket expuesto en Kong
- [ ] CORS configurado para WebSocket
- [ ] Variables de entorno actualizadas
- [ ] Código descomentado en `use-notifications.ts`
- [ ] Probado con `wscat` o herramienta similar
- [ ] Verificado en consola del navegador

---

**Estado Final:** ✅ RESUELTO - Consola limpia sin errores de WebSocket  
**Documentado por:** Sistema Cane  
**Última actualización:** Octubre 28, 2025

