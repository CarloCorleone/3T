# ✅ Solución - Error cookies() async en Next.js 15

**Fecha**: Octubre 15, 2025  
**Estado**: ✅ RESUELTO  
**Tipo**: Breaking Change de Next.js 15

---

## 🎯 Problema Original

Error de TypeScript que impedía el build de producción:

```
./lib/auth-middleware.ts:39:32
Type error: Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'.

  37 |         cookies: {
  38 |           get(name: string) {
> 39 |             return cookieStore.get(name)?.value
    40 |           },
  41 |         },
```

**Síntomas:**
- ❌ Build de producción falla
- ❌ Error de TypeScript en `auth-middleware.ts`
- ❌ Deploy a producción imposible
- ❌ Cambios de desarrollo no se reflejan en producción

---

## 🔍 Diagnóstico

### Causa Raíz

**Breaking Change de Next.js 15:**
En Next.js 15, varias funciones del servidor se volvieron **asíncronas** para mejorar el rendimiento:

| Función | Next.js 14 | Next.js 15 |
|---------|------------|------------|
| `cookies()` | Síncrona | `await cookies()` |
| `headers()` | Síncrona | `await headers()` |
| `searchParams` | Síncrona | `await searchParams` |

### Archivos Afectados

**Archivo principal:** `/opt/cane/3t/lib/auth-middleware.ts`

**Funciones afectadas:**
1. `requireAuth()` - Línea 30
2. `requirePermission()` - Línea 128

---

## 🛠️ Solución Implementada

### 1. Corrección en `requireAuth()`

**Antes (Next.js 14):**
```typescript
export async function requireAuth(request: NextRequest): Promise<AuthCheckResult> {
  try {
    const cookieStore = cookies()  // ❌ Síncrono

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
```

**Después (Next.js 15):**
```typescript
export async function requireAuth(request: NextRequest): Promise<AuthCheckResult> {
  try {
    const cookieStore = await cookies()  // ✅ Asíncrono

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
```

### 2. Corrección en `requirePermission()`

**Antes (Next.js 14):**
```typescript
  try {
    const cookieStore = cookies()  // ❌ Síncrono
    
    const supabase = createServerClient(
      // ... configuración
    )
```

**Después (Next.js 15):**
```typescript
  try {
    const cookieStore = await cookies()  // ✅ Asíncrono
    
    const supabase = createServerClient(
      // ... configuración
    )
```

---

## 🔄 Comandos de Verificación

### 1. Verificar Build

```bash
cd /opt/cane/3t
docker compose build --no-cache
```

**Resultado esperado:**
```
✓ Compiled successfully in 71s
✓ Finished writing to disk in 62ms
```

### 2. Verificar Deploy

```bash
cd /opt/cane/3t
./prod.sh
```

**Resultado esperado:**
```
✅ Modo producción activo!
🌐 Accede a: https://3t.loopia.cl
```

### 3. Verificar Contenedor

```bash
docker ps | grep 3t-app
```

**Resultado esperado:**
```
3t-app    Up X minutes (healthy)   3002/tcp
```

### 4. Verificar Aplicación

```bash
docker run --rm --network cane_net alpine/curl -s http://3t-app:3002 | head -1
```

**Resultado esperado:**
```
<!DOCTYPE html>
```

---

## 📚 Contexto Técnico

### Breaking Changes de Next.js 15

**Motivación:** Mejoras de rendimiento en el servidor
- Las funciones del servidor ahora son asíncronas
- Permite mejor manejo de streams y optimizaciones
- Mejor integración con React Server Components

### Impacto en el Proyecto

**Archivos que pueden necesitar corrección:**
- ✅ `lib/auth-middleware.ts` - Corregido
- ⚠️ Cualquier middleware personalizado
- ⚠️ API routes que usen `cookies()` o `headers()`

### Patrón de Migración

**Para cualquier función que use cookies:**

```typescript
// ❌ Patrón antiguo (Next.js 14)
const cookieStore = cookies()
const headerStore = headers()

// ✅ Patrón nuevo (Next.js 15)
const cookieStore = await cookies()
const headerStore = await headers()
```

---

## 🚨 Prevención

### 1. Actualizar Dependencias

```bash
# Verificar versión de Next.js
npm list next

# Si es necesario, actualizar
npm install next@latest
```

### 2. Revisar Código

**Buscar usos de funciones del servidor:**
```bash
# Buscar usos de cookies()
grep -r "cookies()" app/ lib/

# Buscar usos de headers()
grep -r "headers()" app/ lib/
```

### 3. Testing

**Probar en desarrollo:**
```bash
cd /opt/cane/3t
./dev.sh
# Verificar que no hay errores en consola
```

**Probar build:**
```bash
cd /opt/cane/3t
docker compose build
# Verificar que compila sin errores
```

---

## 🔧 Para Futuras Actualizaciones

### Checklist de Migración Next.js

- [ ] Revisar `cookies()` → `await cookies()`
- [ ] Revisar `headers()` → `await headers()`
- [ ] Revisar `searchParams` → `await searchParams`
- [ ] Probar build de desarrollo
- [ ] Probar build de producción
- [ ] Verificar deploy
- [ ] Probar funcionalidad

### Comandos de Verificación

```bash
# 1. Build de desarrollo
npm run build

# 2. Build de producción
docker compose build --no-cache

# 3. Deploy
./prod.sh

# 4. Verificar salud
docker ps | grep 3t-app
```

---

## 📖 Referencias

### Documentación Oficial

- [Next.js 15 Breaking Changes](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [Server Functions Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15#server-functions)

### Archivos del Proyecto

- **CHANGELOG.md** - Historial completo de cambios
- **GUIA-RAPIDA.md** - Comandos de troubleshooting
- **DEPLOYMENT.md** - Guía de deployment

---

## 🎯 Resultado Final

✅ **Build exitoso**: TypeScript compila sin errores  
✅ **Deploy funcional**: Contenedor `3t-app` corriendo  
✅ **Aplicación accesible**: https://3t.loopia.cl responde  
✅ **Cambios reflejados**: Modo desarrollo → producción funcional  

---

**Documentado por**: Sistema Cane  
**Última actualización**: Octubre 15, 2025  
**Estado**: ✅ RESUELTO Y DOCUMENTADO
