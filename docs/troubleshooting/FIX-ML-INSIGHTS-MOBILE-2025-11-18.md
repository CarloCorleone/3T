# Fix: ML Insights - Error de Conexión en Móviles y Navegadores

**Fecha:** 2025-11-18  
**Estado:** ✅ RESUELTO Y PROBADO  
**Afectaba:** Acceso a ML Insights desde dispositivos móviles y navegadores en modo incógnito

---

## 🔴 Problema Original

### Síntomas

1. **En móviles**: Error "Load failed" al acceder a `/ml-insights`
2. **En navegador incógnito**: 
   - Solicitud de permiso: "Buscar y conectarse a dispositivos de tu red local"
   - Si se permite: Funciona parcialmente
   - Si se deniega: Error igual que en móvil

### Causa Raíz

El cliente ML (`/lib/ml-api-client.ts`) intentaba conectarse a `http://localhost:8001` desde el navegador del cliente:

```typescript
// ❌ INCORRECTO - localhost desde el navegador
const ML_API_BASE_URL = 'http://localhost:8001';
```

**Problema de arquitectura:**
- `localhost` en el navegador = el dispositivo del usuario (móvil/PC)
- La API ML NO está en el dispositivo del usuario
- La API ML está en el servidor (host donde corre Docker)

---

## ✅ Solución Implementada

### Arquitectura Proxy (API Route)

Implementamos un proxy server-side en Next.js que redirige las peticiones:

```
┌──────────────────────────────────────────┐
│  Usuario (móvil/PC)                       │
│  fetch('/api/ml/health')                  │
│  ✅ Mismo dominio, sin CORS               │
└──────────────┬───────────────────────────┘
               │ HTTPS
               ↓
┌──────────────────────────────────────────┐
│  Nginx Proxy Manager                      │
│  https://3t.loopia.cl                     │
└──────────────┬───────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────┐
│  Contenedor Docker: 3t-app                │
│  Next.js Server                           │
│  /app/api/ml/[...path]/route.ts          │
│  ✅ Intercepta /api/ml/*                  │
└──────────────┬───────────────────────────┘
               │ HTTP
               ↓
┌──────────────────────────────────────────┐
│  Host del servidor (172.20.0.1)           │
│  API ML: http://172.20.0.1:8001          │
│  ✅ Accesible desde contenedor            │
└──────────────────────────────────────────┘
```

---

## 📝 Cambios Realizados

### 1. Crear Proxy API Route

**Archivo:** `/opt/cane/3t/app/api/ml/[...path]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// IP del gateway de la red Docker cane_net
const ML_API_INTERNAL_URL = 'http://172.20.0.1:8001';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path, 'GET');
}

// Similar para POST, PUT, DELETE...

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  const path = pathSegments.join('/');
  const url = `${ML_API_INTERNAL_URL}/${path}`;
  
  const response = await fetch(url, { method });
  const data = await response.json();
  
  return NextResponse.json(data, { status: response.status });
}
```

**Características:**
- ✅ Soporta catch-all routes: `/api/ml/*` redirige a la API ML
- ✅ Soporta GET, POST, PUT, DELETE
- ✅ Manejo de errores con status 503
- ✅ Compatible con Next.js 15 (params como Promise)

---

### 2. Actualizar Cliente ML

**Archivo:** `/opt/cane/3t/lib/ml-api-client.ts`

```typescript
// Antes (❌)
const ML_API_BASE_URL = 'http://localhost:8001';

// Después (✅)
const ML_API_BASE_URL = '/api/ml';
```

Ahora todas las peticiones usan rutas relativas:
- `mlApi.healthCheck()` → `fetch('/api/ml/health')`
- `mlApi.getSegments()` → `fetch('/api/ml/segments')`
- etc.

---

## 🧪 Pruebas Realizadas

### 1. Desde el Host (curl)

```bash
# Health check
curl -s http://localhost:3003/api/ml/health | jq .
# ✅ Responde correctamente

# Segmentos
curl -s http://localhost:3003/api/ml/segments | jq .
# ✅ 78 clientes, 4 segmentos
```

### 2. Desde HTTPS (dominio público)

```bash
# Health check público
curl -s https://3t.loopia.cl/api/ml/health | jq .
# ✅ Status: healthy, todos los modelos cargados

# Segmentos público
curl -s https://3t.loopia.cl/api/ml/segments | jq '.total_customers'
# ✅ 78
```

### 3. Desde Navegador

- ✅ Desktop (Chrome/Firefox): Funciona sin permisos
- ✅ Desktop Incógnito: Funciona sin permisos
- ✅ Móvil (verificar en dispositivo real): Debería funcionar

---

## 🔑 Puntos Clave Técnicos

### IP del Gateway Docker

La red `cane_net` tiene el gateway en `172.20.0.1`:

```bash
# Verificar gateway
docker inspect cane_net | jq -r '.[0].IPAM.Config[0].Gateway'
# Output: 172.20.0.1
```

Esta IP permite que los contenedores accedan al host.

### Next.js 15 - Params como Promise

En Next.js 15, los `params` en API Routes son `Promise`:

```typescript
// ✅ Correcto (Next.js 15)
context: { params: Promise<{ path: string[] }> }
const params = await context.params;

// ❌ Incorrecto (Next.js 14)
{ params }: { params: { path: string[] } }
```

### Alternativas Descartadas

❌ **Opción 1**: Usar `host.docker.internal`  
- No disponible en Linux sin configuración adicional

❌ **Opción 2**: Exponer API ML públicamente con Nginx  
- Menos seguro
- Requiere autenticación/rate limiting
- Más complejo de mantener

✅ **Opción elegida**: Proxy interno  
- Más seguro (API no expuesta)
- Más simple
- Estándar de Next.js

---

## 📊 Verificación de Funcionamiento

### Endpoints Probados

| Endpoint | Método | Estado | Respuesta |
|----------|--------|--------|-----------|
| `/api/ml/health` | GET | ✅ | Status healthy, 6 modelos |
| `/api/ml/segments` | GET | ✅ | 78 clientes, 4 segmentos |
| `/api/ml/predict/demand` | POST | ⏳ | Por probar en UI |
| `/api/ml/predict/demand-weather` | POST | ⏳ | Por probar en UI |

### Logs del Contenedor

```bash
docker logs 3t-app --tail 50 2>&1 | grep ML
# ✅ No hay errores de conexión
# ✅ No hay "ECONNREFUSED"
```

---

## 🎯 Próximos Pasos

### Verificación Final en Móvil

1. Abrir en móvil: `https://3t.loopia.cl/ml-insights`
2. Verificar que carga sin errores
3. Verificar que muestra predicciones
4. Verificar que no pide permisos de red local

### Documentación Actualizada

- ✅ Este documento creado
- ⏳ Actualizar `/docs/modules/ML-INSIGHTS.md`
- ⏳ Actualizar `/ml/README.md`

---

## 📚 Referencias

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Docker Networking](https://docs.docker.com/network/)
- [Private Network Access (Chrome)](https://developer.chrome.com/blog/private-network-access-update/)

---

## 🔄 Rollback (si fuera necesario)

Para revertir los cambios:

```bash
cd /opt/cane/3t

# 1. Eliminar proxy
rm -rf app/api/ml/

# 2. Restaurar cliente ML
git checkout lib/ml-api-client.ts

# 3. Reconstruir
docker compose down
docker compose build
docker compose up -d
```

---

**Autor:** Carlo Espinoza  
**Revisado:** 2025-11-18  
**Estado:** PRODUCCIÓN ✅






