# 🔧 Solución: Error de Build con VAPID Keys

**Fecha:** 28 de octubre de 2025  
**Estado:** ✅ Resuelto  
**Tipo:** Build Error / Arquitectura

---

## 🚨 Síntoma del Problema

Al intentar compilar la aplicación con `docker compose build`, el build falla con:

```
Error: No key set vapidDetails.publicKey
Failed to collect page data for /api/notifications/push
Build error occurred
```

---

## 🔍 Diagnóstico

### Causa Raíz

El sistema de notificaciones push intentaba inicializar las claves VAPID en **build time** cuando solo están disponibles en **runtime**.

**Flujo del problema:**

1. Next.js ejecuta código **top-level** durante el build para optimización
2. El archivo `app/api/notifications/push/route.ts` ejecutaba `webpush.setVapidDetails()` fuera de funciones
3. Las variables `VAPID_PRIVATE_KEY` y `VAPID_EMAIL` NO están disponibles en build time
4. Solo las variables `NEXT_PUBLIC_*` se pasan al build como `ARG` en el Dockerfile
5. Resultado: `webpush.setVapidDetails()` recibe `undefined` → Error

### ¿Por qué las variables no están disponibles?

**Dockerfile solo pasa estas variables al build:**
```dockerfile
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

**Variables que NO se pasan (por seguridad):**
- `VAPID_PRIVATE_KEY` ❌
- `VAPID_EMAIL` ❌
- `SUPABASE_SERVICE_ROLE_KEY` ❌

---

## ✅ Solución: Lazy Initialization

### Cambio Implementado

**Archivo:** `app/api/notifications/push/route.ts`

#### ❌ ANTES (Incorrecto - Build Time)

```typescript
import webpush from 'web-push'

// ❌ Se ejecuta durante el BUILD
const vapidDetails = {
  subject: process.env.VAPID_EMAIL || 'mailto:admin@3t.loopia.cl',
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!
}

webpush.setVapidDetails(
  vapidDetails.subject,
  vapidDetails.publicKey,
  vapidDetails.privateKey
)

export async function POST(request: NextRequest) {
  // ... código
}
```

#### ✅ DESPUÉS (Correcto - Runtime)

```typescript
import webpush from 'web-push'

// ✅ Flag para inicializar solo una vez
let vapidConfigured = false

// ✅ Función helper que se ejecuta en RUNTIME
function ensureVapidConfigured() {
  if (!vapidConfigured) {
    const subject = process.env.VAPID_EMAIL || 'mailto:admin@3t.loopia.cl'
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    
    if (!publicKey || !privateKey) {
      throw new Error('VAPID keys no configuradas')
    }
    
    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidConfigured = true
  }
}

export async function POST(request: NextRequest) {
  try {
    // ✅ Inicializar en runtime, no en build time
    ensureVapidConfigured()
    
    // ... resto del código
  }
}
```

### Ventajas de esta Solución

1. ✅ **Se ejecuta en runtime** - Las variables de entorno están disponibles
2. ✅ **Más seguro** - No expone claves privadas en el build
3. ✅ **Eficiente** - Solo se configura una vez (flag `vapidConfigured`)
4. ✅ **Patrón estándar** - Recomendado por Next.js para configuración sensible
5. ✅ **Sin cambios en Dockerfile** - No necesita pasar claves privadas como ARG

---

## 🔧 Otros Errores Relacionados Corregidos

### 1. Error de Tipos en `logAudit()`

**Archivo:** `app/pedidos/page.tsx`

```typescript
// ❌ ANTES: null no es asignable
await logAudit(userId, action, entity, id, null, data)

// ✅ DESPUÉS: usar undefined
await logAudit(userId, action, entity, id, undefined, data)
```

### 2. Error de Tipos en Push Notifications

**Archivo:** `lib/push-notifications.ts`

```typescript
// ❌ ANTES: Uint8Array no compatible
applicationServerKey: applicationServerKey

// ✅ DESPUÉS: cast explícito
applicationServerKey: applicationServerKey as BufferSource
```

```typescript
// ❌ ANTES: tipo no definido
actions?: NotificationAction[]

// ✅ DESPUÉS: tipo inline
actions?: Array<{ action: string; title: string; icon?: string }>
```

---

## 🎯 Cómo Prevenir este Error

### Regla General

**NUNCA inicialices servicios externos en top-level si dependen de variables de entorno que no son `NEXT_PUBLIC_*`**

### ✅ Patrón Correcto

```typescript
// ✅ CORRECTO: Lazy initialization
let serviceConfigured = false

function ensureServiceConfigured() {
  if (!serviceConfigured) {
    // Inicializar servicio con variables de entorno
    serviceConfigured = true
  }
}

export async function handler() {
  ensureServiceConfigured() // Se ejecuta en runtime
  // ... usar servicio
}
```

### ❌ Patrón Incorrecto

```typescript
// ❌ INCORRECTO: Inicialización en top-level
const service = initializeService({
  apiKey: process.env.SECRET_API_KEY // ⚠️ No disponible en build time
})

export async function handler() {
  // ... usar servicio
}
```

---

## 📊 Verificación de la Solución

### Comandos para Verificar

```bash
# 1. Build de la aplicación
cd /opt/cane/3t
docker compose build

# 2. Verificar que el build es exitoso
# Debe mostrar: ✓ Compiled successfully

# 3. Iniciar contenedor
docker compose up -d

# 4. Verificar logs
docker logs -f 3t-app

# 5. Verificar health check
docker ps | grep 3t-app
# Debe mostrar: (healthy)
```

### Resultado Esperado

```
✓ Compiled successfully in 66s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (26/26)
✓ Finalizing page optimization

Container: 3t-app
Estado: Up (healthy)
Ready in 221ms
```

---

## 🎓 Lecciones Aprendidas

1. **Build Time vs Runtime**
   - Next.js ejecuta código top-level durante el build
   - Variables de entorno sensibles NO están disponibles en build time
   - Usar lazy initialization para servicios externos

2. **Variables de Entorno en Docker**
   - Solo las variables `NEXT_PUBLIC_*` se pasan como `ARG` al build
   - Variables privadas (API keys, secrets) solo están disponibles en runtime
   - No pasar claves privadas como `ARG` por seguridad

3. **TypeScript Strict Mode**
   - Ayuda a detectar errores de tipos antes del build
   - `null` vs `undefined` importa en tipos estrictos
   - Usar casts explícitos cuando sea necesario

4. **Patrón Lazy Initialization**
   - Inicializar servicios en runtime, no en build time
   - Usar flag para inicializar solo una vez
   - Validar que las variables existen antes de usar

---

## 📚 Referencias

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Docker Build Arguments](https://docs.docker.com/engine/reference/builder/#arg)
- [Web Push Protocol - VAPID](https://datatracker.ietf.org/doc/html/rfc8030)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)

---

## 🔗 Documentos Relacionados

- [CHANGELOG.md](../CHANGELOG.md) - Historial completo de cambios
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Guía de deployment
- [ARQUITECTURA.md](../ARQUITECTURA.md) - Arquitectura técnica

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación de Troubleshooting**  
**Última actualización:** Octubre 28, 2025

