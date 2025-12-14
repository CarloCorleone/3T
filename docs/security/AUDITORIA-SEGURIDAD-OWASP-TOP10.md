# 🔐 Auditoría de Seguridad OWASP Top 10
## Aplicación: Agua Tres Torres (3t)
**Fecha:** 16 de Octubre, 2025  
**Auditor:** Análisis Automatizado  
**Versión Evaluada:** 3.0  

---

## 📊 Resumen Ejecutivo

Se realizó una auditoría de seguridad completa de la aplicación 3t basada en las **OWASP Top 10 2021**. Se evaluó el código fuente, configuraciones, arquitectura y prácticas de desarrollo.

### Estado General de Seguridad: ⚠️ **MEDIO-ALTO**

**Puntos Fuertes:** ✅
- Autenticación implementada con Supabase Auth
- Sistema de permisos granular implementado
- Headers de seguridad configurados
- Uso de HTTPS obligatorio
- Variables de entorno externalizadas
- Dockerfile con usuario no-root

**Áreas Críticas que Requieren Atención:** 🔴
- **Falta de validación de datos con esquemas formales (Zod)**
- **Sin Row Level Security (RLS) verificable en Supabase**
- **Tokens sensibles expuestos en el frontend (NEXT_PUBLIC_)**
- **XSS potencial con dangerouslySetInnerHTML**
- **Falta de rate limiting en APIs**
- **Sin protección CSRF explícita**
- **Falta de logging y monitoreo de seguridad**

---

## 🔍 Análisis Detallado por Categoría OWASP

---

### A01:2021 – Broken Access Control (Control de Acceso Roto)

#### 🔴 **Riesgo: ALTO**

#### Vulnerabilidades Identificadas:

**1. Sistema de Permisos No Verificado en Backend**
- **Ubicación:** `app/api/optimize-route/route.ts`, todas las páginas cliente
- **Problema:** Las verificaciones de permisos se hacen SOLO en el frontend con `usePermissions()` y `PermissionGuard`
- **Impacto:** Un atacante puede llamar directamente a la API sin pasar por las verificaciones del frontend
- **Código Vulnerable:**
```typescript
// app/api/optimize-route/route.ts - NO verifica autenticación
export async function POST(request: NextRequest) {
  const { orders } = await request.json()
  // ❌ Sin verificación de sesión o permisos
}
```

**2. Falta de RLS (Row Level Security) en Supabase**
- **Problema:** No se verifica si las políticas RLS están activas en las tablas `3t_*`
- **Impacto:** Un usuario con credenciales válidas podría acceder a datos de otros usuarios
- **Recomendación:** Implementar políticas RLS como:
```sql
-- Ejemplo de política RLS necesaria
ALTER TABLE 3t_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own orders"
ON 3t_orders FOR SELECT
USING (
  -- Solo admins ven todo, otros usuarios ven solo sus pedidos
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND (rol = 'admin' OR id = 3t_orders.created_by)
  )
);
```

**3. API Routes sin Middleware de Autenticación**
- **Ubicación:** `app/api/optimize-route/route.ts`
- **Problema:** No hay middleware que verifique JWT antes de ejecutar lógica
- **Código Recomendado:**
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function POST(request: NextRequest) {
  // ✅ Verificar autenticación primero
  const supabase = createMiddlewareClient({ req: request })
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  // ✅ Verificar permisos
  const { data: hasPermission } = await supabase.rpc('3t_has_permission', {
    p_user: session.user.id,
    p_perm: 'rutas:optimizar'
  })
  
  if (!hasPermission) {
    return NextResponse.json({ error: 'Permiso denegado' }, { status: 403 })
  }
  
  // Continuar con lógica...
}
```

**4. Falta de Validación de IDs en Queries**
- **Problema:** No se valida que el usuario tenga acceso al recurso solicitado
- **Ejemplo:**
```typescript
// ❌ Vulnerable: cualquier usuario puede acceder a cualquier pedido
const { data } = await supabase
  .from('3t_orders')
  .select('*')
  .eq('order_id', orderIdFromUrl)

// ✅ Correcto: verificar permisos o usar RLS
```

#### Recomendaciones:

1. **CRÍTICO:** Implementar middleware de autenticación en todas las API routes
2. **CRÍTICO:** Activar y configurar Row Level Security en todas las tablas Supabase
3. **ALTO:** Agregar validación de permisos en backend, no solo frontend
4. **MEDIO:** Implementar audit logs para accesos a recursos sensibles

---

### A02:2021 – Cryptographic Failures (Fallos Criptográficos)

#### 🟡 **Riesgo: MEDIO**

#### Vulnerabilidades Identificadas:

**1. Tokens Expuestos en Variables NEXT_PUBLIC**
- **Ubicación:** `lib/supabase.ts`
- **Problema:** Las keys de Supabase están en variables `NEXT_PUBLIC_*`, lo que las expone en el bundle del cliente
- **Código Actual:**
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```
- **Explicación:** Esto es parcialmente aceptable para Supabase (el anon key está diseñado para ser público), PERO solo si RLS está correctamente configurado
- **Riesgo:** Si RLS no está activo, el anon key permite acceso directo a la base de datos

**2. Google Maps API Key Expuesta**
- **Ubicación:** `app/layout.tsx`, `app/api/optimize-route/route.ts`
- **Problema:** La API key está en el frontend sin restricciones verificables
- **Código:**
```typescript
src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&libraries=places,visualization`}
```
- **Mitigación Actual:** Según `.cursorrules`, está restringida por HTTP Referrers
- **Recomendación:** Verificar activamente que las restricciones están aplicadas

**3. Falta de HTTPS Enforcement en Código**
- **Estado:** Confiado a Nginx Proxy Manager
- **Recomendación:** Agregar verificación programática:
```typescript
// middleware.ts (crear)
export function middleware(request: NextRequest) {
  // Forzar HTTPS en producción
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') !== 'https'
  ) {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.url}`,
      301
    )
  }
}
```

**4. Sin Rotación de Secrets**
- **Problema:** No hay proceso documentado para rotar API keys y tokens
- **Recomendación:** Documentar y automatizar rotación trimestral

#### Recomendaciones:

1. **CRÍTICO:** Verificar que RLS está activo en todas las tablas antes de usar anon key
2. **ALTO:** Implementar backend proxy para Google Maps API (evitar exponer key)
3. **MEDIO:** Agregar verificación de HTTPS en middleware
4. **BAJO:** Documentar proceso de rotación de secrets

---

### A03:2021 – Injection (Inyección)

#### 🟢 **Riesgo: BAJO**

#### Análisis:

**✅ Puntos Fuertes:**

1. **Uso de Supabase Client Library**
   - Todas las queries usan el cliente de Supabase con queries parametrizadas
   - No se encontró SQL crudo o string concatenation
   ```typescript
   // ✅ Seguro: Queries parametrizadas
   const { data } = await supabase
     .from('3t_orders')
     .select('*')
     .eq('customer_id', customerId) // Parametrizado automáticamente
   ```

2. **Sin eval() o innerHTML encontrados (solo 2 casos controlados)**

**⚠️ Vulnerabilidades Identificadas:**

**1. XSS Potencial con dangerouslySetInnerHTML**
- **Ubicación:** `components/help/SimplePopover.tsx:185`
- **Código Vulnerable:**
```typescript
<li
  key={index}
  className="flex gap-2"
  dangerouslySetInnerHTML={{ __html: step }} // ❌ XSS si step viene de usuario
/>
```
- **Análisis:** Los `steps` vienen de `lib/help/constants.ts` (constantes hardcodeadas), NO de usuario
- **Riesgo Actual:** BAJO (fuente controlada)
- **Recomendación:** Sanitizar por precaución o reemplazar con ReactNode

**2. Falta de Validación de Input con Esquemas**
- **Problema:** No se usa Zod u otra librería de validación de esquemas
- **Impacto:** Validación manual propensa a errores
- **Código Actual:**
```typescript
// ❌ Validación manual básica
if (!email.trim()) {
  setError('El email es requerido')
  return false
}
if (password.length < 6) {
  setError('La contraseña debe tener al menos 6 caracteres')
  return false
}
```

**Código Recomendado con Zod:**
```typescript
import { z } from 'zod'

// Definir esquema
const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email requerido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

// Validar
try {
  const validated = loginSchema.parse({ email, password })
  // Usar validated.email, validated.password (garantizado válido)
} catch (error) {
  if (error instanceof z.ZodError) {
    setError(error.errors[0].message)
  }
}
```

**3. Validación UUID Manual**
- **Ubicación:** `app/presupuestos/page.tsx:122`
- **Código:**
```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (quoteDataWithoutItems.customer_id && !uuidRegex.test(quoteDataWithoutItems.customer_id)) {
  quoteDataWithoutItems.customer_id = null
}
```
- **Problema:** Regex puede ser insuficiente, mejor usar librería
- **Recomendación:** Usar `z.string().uuid()` de Zod

#### Recomendaciones:

1. **ALTO:** Implementar Zod para validación de todos los formularios y APIs
2. **MEDIO:** Sanitizar HTML en `dangerouslySetInnerHTML` con DOMPurify
3. **BAJO:** Reemplazar regex UUID con validadores de librería

---

### A04:2021 – Insecure Design (Diseño Inseguro)

#### 🟡 **Riesgo: MEDIO**

#### Vulnerabilidades Identificadas:

**1. Sin Rate Limiting en APIs**
- **Problema:** No hay límite de requests por IP/usuario
- **Impacto:** Vulnerable a ataques de fuerza bruta en login y DDoS
- **Recomendación:** Implementar rate limiting con `@upstash/ratelimit`:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests por 10 segundos
})

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)
  
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  // ...
}
```

**2. Sin Protección CSRF Explícita**
- **Problema:** Next.js no incluye tokens CSRF por defecto en API routes
- **Mitigación Actual:** SameSite cookies (configurado en Supabase)
- **Recomendación:** Agregar verificación de origen:
```typescript
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = ['https://3t.loopia.cl', 'https://dev.3t.loopia.cl']
  
  if (!origin || !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ...
}
```

**3. Sin Timeouts en Requests Externos**
- **Ubicación:** `app/api/optimize-route/route.ts:51`
- **Código:**
```typescript
const response = await fetch(url.toString())
// ❌ Sin timeout, puede colgar indefinidamente
```
- **Recomendación:**
```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

try {
  const response = await fetch(url.toString(), { signal: controller.signal })
  // ...
} catch (error) {
  if (error.name === 'AbortError') {
    return NextResponse.json({ error: 'Request timeout' }, { status: 504 })
  }
} finally {
  clearTimeout(timeout)
}
```

**4. Falta de Validación de Tamaño de Payload**
- **Configurado en:** `next.config.ts:22`
```typescript
serverActions: {
  bodySizeLimit: '2mb',
}
```
- **✅ Bien configurado para Server Actions**
- **⚠️ Falta para API Routes:** Agregar validación explícita

#### Recomendaciones:

1. **CRÍTICO:** Implementar rate limiting en todas las API routes
2. **ALTO:** Agregar protección CSRF con verificación de origen
3. **MEDIO:** Implementar timeouts en todas las llamadas externas
4. **BAJO:** Validar tamaño de payload en API routes

---

### A05:2021 – Security Misconfiguration (Configuración de Seguridad Incorrecta)

#### 🟢 **Riesgo: BAJO-MEDIO**

#### Análisis:

**✅ Puntos Fuertes:**

1. **Headers de Seguridad Configurados**
   - **Ubicación:** `next.config.ts:25-48`
   ```typescript
   headers: [
     { key: 'X-Frame-Options', value: 'SAMEORIGIN' }, // ✅
     { key: 'X-Content-Type-Options', value: 'nosniff' }, // ✅
     { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, // ✅
     { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }, // ✅
   ]
   ```

2. **Powered-By Header Deshabilitado**
   ```typescript
   poweredByHeader: false, // ✅ Oculta versión de Next.js
   ```

3. **Dockerfile con Usuario No-Root**
   - **Ubicación:** `Dockerfile:40-54`
   ```dockerfile
   RUN adduser --system --uid 1001 nextjs
   USER nextjs # ✅ No corre como root
   ```

4. **Gitignore Configurado**
   - **Ubicación:** `.gitignore`
   - ✅ `.env` está ignorado
   - ✅ `node_modules` ignorado

**⚠️ Vulnerabilidades Identificadas:**

**1. Headers de Seguridad Faltantes**
- **Falta CSP (Content Security Policy):**
```typescript
// Agregar en next.config.ts headers:
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.loopia.cl https://maps.googleapis.com",
    "frame-src 'self'",
  ].join('; ')
}
```

- **Falta HSTS (HTTP Strict Transport Security):**
```typescript
{
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains; preload'
}
```

**2. Telemetry Deshabilitada pero No Documentada**
- **Ubicación:** `Dockerfile:28,38`
```dockerfile
ENV NEXT_TELEMETRY_DISABLED=1
```
- ✅ Correcto (privacidad)
- ⚠️ Debería estar documentado en README

**3. Sin Verificación de Integridad en Dependencias**
- **Problema:** `package-lock.json` existe pero no se verifica con `npm audit`
- **Recomendación:** Agregar a CI/CD:
```bash
npm audit --audit-level=high
npm audit fix
```

**4. Variables de Entorno No Validadas al Inicio**
- **Problema:** Si falta una variable crítica, falla en runtime
- **Recomendación:** Validar al inicio con Zod:
```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1),
})

export const env = envSchema.parse(process.env)
```

#### Recomendaciones:

1. **ALTO:** Agregar CSP (Content Security Policy) header
2. **ALTO:** Agregar HSTS header
3. **MEDIO:** Implementar `npm audit` en pre-commit hook
4. **MEDIO:** Validar variables de entorno al inicio con Zod
5. **BAJO:** Documentar configuraciones de seguridad en README

---

### A06:2021 – Vulnerable and Outdated Components (Componentes Vulnerables y Desactualizados)

#### 🟢 **Riesgo: BAJO**

#### Análisis de Dependencias:

**Dependencias Principales (package.json):**

✅ **Actualizadas y Sin CVEs Conocidas Críticas:**
- `next`: 15.5.4 (última versión estable)
- `react`: 19.1.0 (versión más reciente)
- `@supabase/supabase-js`: 2.74.0 (actualizada)
- `typescript`: 5.9.3 (actualizada)
- `zod`: 4.1.12 (última versión)

⚠️ **Posibles Riesgos:**
- **leaflet**: ^1.9.4 - verificar si hay updates
- **jspdf**: ^3.0.3 - verificar vulnerabilidades conocidas

#### Verificación Requerida:

```bash
# Ejecutar en el proyecto
cd /opt/cane/3t
npm audit
npm outdated
```

#### Recomendaciones:

1. **CRÍTICO:** Ejecutar `npm audit` y revisar vulnerabilidades
2. **ALTO:** Configurar Dependabot o Renovate para actualizaciones automáticas
3. **MEDIO:** Establecer política de actualización mensual de dependencias
4. **BAJO:** Agregar badge de seguridad en README

---

### A07:2021 – Identification and Authentication Failures (Fallos de Identificación y Autenticación)

#### 🟡 **Riesgo: MEDIO**

#### Vulnerabilidades Identificadas:

**1. Sin Máximo de Intentos de Login**
- **Ubicación:** `app/login/page.tsx`
- **Problema:** No hay límite de intentos fallidos
- **Impacto:** Vulnerable a ataques de fuerza bruta
- **Recomendación:** Implementar bloqueo temporal:
```typescript
// Usar localStorage o base de datos
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutos

const [loginAttempts, setLoginAttempts] = useState(0)
const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // Verificar bloqueo
  if (lockoutUntil && Date.now() < lockoutUntil) {
    const remaining = Math.ceil((lockoutUntil - Date.now()) / 60000)
    setError(`Cuenta bloqueada. Intenta en ${remaining} minutos.`)
    return
  }
  
  try {
    await signIn(email, password)
    setLoginAttempts(0) // Reset en login exitoso
  } catch (error) {
    const newAttempts = loginAttempts + 1
    setLoginAttempts(newAttempts)
    
    if (newAttempts >= MAX_ATTEMPTS) {
      setLockoutUntil(Date.now() + LOCKOUT_TIME)
      setError(`Demasiados intentos fallidos. Bloqueado por 15 minutos.`)
    }
  }
}
```

**2. Sin MFA (Multi-Factor Authentication)**
- **Estado:** No implementado
- **Impacto:** Una contraseña comprometida da acceso completo
- **Recomendación:** Implementar MFA con Supabase:
```typescript
// Habilitar MFA en Supabase
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
})
```

**3. Políticas de Contraseña Débiles**
- **Ubicación:** `app/login/page.tsx:49`
- **Código Actual:**
```typescript
if (password.length < 6) {
  setError('La contraseña debe tener al menos 6 caracteres')
  return false
}
```
- **Problema:** Solo valida longitud, no complejidad
- **Recomendación:**
```typescript
const passwordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Debe contener una mayúscula')
  .regex(/[a-z]/, 'Debe contener una minúscula')
  .regex(/[0-9]/, 'Debe contener un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener un carácter especial')
```

**4. Sesiones Sin Expiración Automática**
- **Problema:** No se detecta inactividad del usuario
- **Recomendación:** Implementar auto-logout:
```typescript
// components/auth-guard.tsx
useEffect(() => {
  let inactivityTimer: NodeJS.Timeout
  
  const resetTimer = () => {
    clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      signOut()
      router.push('/login?reason=inactivity')
    }, 30 * 60 * 1000) // 30 minutos
  }
  
  // Eventos de actividad
  window.addEventListener('mousemove', resetTimer)
  window.addEventListener('keypress', resetTimer)
  
  resetTimer()
  
  return () => {
    clearTimeout(inactivityTimer)
    window.removeEventListener('mousemove', resetTimer)
    window.removeEventListener('keypress', resetTimer)
  }
}, [])
```

**5. Sin Prevención de Credential Stuffing**
- **Problema:** No hay verificación contra listas de credenciales comprometidas
- **Recomendación:** Integrar con Have I Been Pwned API

#### Recomendaciones:

1. **CRÍTICO:** Implementar rate limiting y bloqueo de cuenta por intentos fallidos
2. **ALTO:** Implementar MFA obligatorio para rol admin
3. **ALTO:** Fortalecer políticas de contraseña (longitud mínima 8, complejidad)
4. **MEDIO:** Implementar auto-logout por inactividad
5. **BAJO:** Verificar contraseñas contra bases de datos de breaches

---

### A08:2021 – Software and Data Integrity Failures (Fallos de Integridad de Software y Datos)

#### 🟡 **Riesgo: MEDIO**

#### Vulnerabilidades Identificadas:

**1. Sin Verificación de Integridad en Scripts Externos**
- **Ubicación:** `app/layout.tsx:76`
- **Código:**
```typescript
<Script
  src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&libraries=places,visualization`}
  strategy="lazyOnload"
  id="google-maps-script"
/>
```
- **Problema:** No usa SRI (Subresource Integrity)
- **Limitación:** Google Maps API no publica hashes SRI (CDN dinámico)
- **Mitigación Parcial:** HTTPS verifica certificado del servidor
- **Recomendación:** Monitorear contenido cargado con CSP

**2. Sin Auditoría de Cambios Críticos**
- **Estado:** Existe tabla `3t_audit_log` y función `logAudit()` en `lib/permissions.ts:314`
- ✅ **Implementado** para cambios de permisos
- ⚠️ **Falta:** No se registran cambios en pedidos, clientes, productos
- **Recomendación:** Expandir audit logging:
```typescript
// Agregar a cada operación CRUD crítica
await logAudit(
  userId,
  'order.created',
  'order',
  orderId,
  undefined, // oldValue
  newOrderData
)
```

**3. Sin Firma Digital en PDFs Generados**
- **Ubicación:** `lib/pdf-generator.ts`
- **Problema:** Los PDFs generados (presupuestos) no tienen firma digital
- **Impacto:** Posible modificación sin detección
- **Recomendación:** Implementar firma digital con certificado

**4. Sin Backup Verification**
- **Problema:** No se verifica que los backups (mencionados en reglas) son válidos
- **Recomendación:** Implementar pruebas de restauración periódicas

**5. Falta de Versionado en Cambios de Base de Datos**
- **Problema:** No hay sistema de migraciones documentado
- **Recomendación:** Usar herramientas como Prisma Migrate o Supabase Migrations

#### Recomendaciones:

1. **ALTO:** Expandir audit logging a todas las operaciones CRUD críticas
2. **MEDIO:** Implementar firma digital en PDFs generados
3. **MEDIO:** Documentar y automatizar verificación de backups
4. **BAJO:** Implementar sistema de migraciones versionadas

---

### A09:2021 – Security Logging and Monitoring Failures (Fallos de Registro y Monitoreo)

#### 🔴 **Riesgo: ALTO**

#### Vulnerabilidades Identificadas:

**1. Sin Sistema de Logging Centralizado**
- **Estado Actual:** Solo `console.log()` y `console.error()`
- **Problema:** Logs se pierden al reiniciar contenedor
- **Impacto:** Imposible detectar ataques o investigar incidentes
- **Recomendación:** Implementar Winston o Pino con almacenamiento persistente:
```typescript
// lib/logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: '/logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/logs/combined.log' }),
    // Opcional: Enviar a servicio externo (Sentry, Datadog)
  ],
})

// Usar en lugar de console.log
logger.info('User logged in', { userId, ip, timestamp })
logger.error('Auth failed', { email, reason, ip })
```

**2. Sin Monitoreo de Eventos de Seguridad**
- **Eventos NO Registrados:**
  - ❌ Intentos de login fallidos
  - ❌ Cambios de permisos
  - ❌ Accesos denegados
  - ❌ Operaciones críticas (eliminar datos)
  - ❌ Errores de autenticación
- **Recomendación:** Registrar TODOS los eventos de seguridad:
```typescript
// Eventos a registrar
const SECURITY_EVENTS = {
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILED: 'auth.login.failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_PASSWORD_CHANGED: 'auth.password.changed',
  PERMISSION_GRANTED: 'permission.granted',
  PERMISSION_REVOKED: 'permission.revoked',
  ACCESS_DENIED: 'access.denied',
  DATA_CREATED: 'data.created',
  DATA_UPDATED: 'data.updated',
  DATA_DELETED: 'data.deleted',
  API_ERROR: 'api.error',
}
```

**3. Sin Alertas Automáticas**
- **Problema:** No hay notificaciones para eventos críticos
- **Recomendación:** Implementar alertas para:
  - 5+ intentos de login fallidos en 5 minutos
  - Acceso desde IP desconocida (admin)
  - Errores 5xx en producción
  - Cambios en permisos de admin
- **Herramientas:** Slack webhooks, email, PagerDuty

**4. Sin Dashboard de Seguridad**
- **Problema:** No hay visualización de métricas de seguridad
- **Recomendación:** Crear página `/admin/security` con:
  - Logins recientes
  - Intentos fallidos
  - Cambios de permisos
  - Accesos denegados
  - Errores de API

**5. Información Sensible en Logs**
- **Ubicación:** Múltiples archivos con `console.log`
- **Problema:** Potencial exposición de datos sensibles
- **Ejemplo de Código Peligroso:**
```typescript
console.log('Login datos:', { email, password }) // ❌ NUNCA logear passwords
```
- **Recomendación:** Sanitizar logs:
```typescript
const sanitizeForLog = (data: any) => {
  const sanitized = { ...data }
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret']
  sensitiveKeys.forEach(key => {
    if (sanitized[key]) sanitized[key] = '[REDACTED]'
  })
  return sanitized
}

logger.info('Login attempt', sanitizeForLog({ email, password }))
// Output: Login attempt { email: 'user@example.com', password: '[REDACTED]' }
```

#### Recomendaciones:

1. **CRÍTICO:** Implementar sistema de logging centralizado (Winston + archivo persistente)
2. **CRÍTICO:** Registrar TODOS los eventos de seguridad con contexto completo
3. **ALTO:** Implementar alertas automáticas para eventos críticos
4. **MEDIO:** Crear dashboard de monitoreo de seguridad
5. **MEDIO:** Auditar y sanitizar logs existentes para remover información sensible

---

### A10:2021 – Server-Side Request Forgery (SSRF)

#### 🟢 **Riesgo: BAJO**

#### Análisis:

**Llamadas Externas Identificadas:**

1. **Google Maps Directions API**
   - **Ubicación:** `app/api/optimize-route/route.ts:51`
   - **Código:**
   ```typescript
   const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
   url.searchParams.append('origin', `${WAREHOUSE_COORDS.lat},${WAREHOUSE_COORDS.lng}`)
   url.searchParams.append('destination', `${DESTINATION_COORDS.lat},${DESTINATION_COORDS.lng}`)
   url.searchParams.append('waypoints', `optimize:true|${waypoints}`)
   
   const response = await fetch(url.toString())
   ```
   - **Análisis:**
     - ✅ URL hardcodeada (`maps.googleapis.com`)
     - ✅ Coordenadas hardcodeadas para origen/destino
     - ⚠️ `waypoints` construido desde input de usuario (`orders`)
   
   - **Vulnerabilidad Potencial:**
     - Si un atacante puede inyectar coordenadas maliciosas en `orders.latitude/longitude`
     - Podría forzar requests a ubicaciones no deseadas
     - **Mitigación Actual:** Validación básica en línea 26-32
   
   - **Recomendación:** Validar coordenadas estrictamente:
   ```typescript
   const isValidCoordinate = (lat: number, lng: number): boolean => {
     return (
       typeof lat === 'number' &&
       typeof lng === 'number' &&
       lat >= -90 && lat <= 90 &&
       lng >= -180 && lng <= 180 &&
       !isNaN(lat) && !isNaN(lng)
     )
   }
   
   // Validar cada coordenada
   const invalidCoords = orders.filter(
     o => !isValidCoordinate(o.latitude, o.longitude)
   )
   if (invalidCoords.length > 0) {
     return NextResponse.json(
       { error: 'Coordenadas inválidas detectadas' },
       { status: 400 }
     )
   }
   ```

**2. Supabase API Calls**
   - **Análisis:**
     - ✅ URL configurada por variable de entorno
     - ✅ No acepta URL arbitraria de usuario
     - ✅ Cliente Supabase maneja validaciones internas

**Sin SSRF Crítico Detectado**

#### Recomendaciones:

1. **MEDIO:** Validar estrictamente coordenadas GPS en API de optimización
2. **BAJO:** Implementar whitelist de dominios permitidos para fetch
3. **BAJO:** Agregar timeout a todas las llamadas externas (ya mencionado en A04)

---

## 📋 Resumen de Recomendaciones Priorizadas

### 🔴 **Críticas (Implementar Inmediatamente)**

1. **Implementar autenticación y permisos en backend** (A01)
   - Agregar middleware de autenticación en todas las API routes
   - Verificar sesión JWT antes de ejecutar lógica

2. **Activar Row Level Security (RLS) en Supabase** (A01)
   - Crear políticas RLS para todas las tablas `3t_*`
   - Verificar que RLS está activo antes de usar anon key

3. **Implementar Rate Limiting** (A04, A07)
   - Agregar límite de requests en login y APIs
   - Bloqueo temporal por intentos fallidos

4. **Sistema de Logging Centralizado** (A09)
   - Implementar Winston con almacenamiento persistente
   - Registrar eventos de seguridad (login, accesos, cambios)

5. **Ejecutar npm audit** (A06)
   - Identificar y resolver vulnerabilidades en dependencias
   - Configurar actualizaciones automáticas

---

### 🟡 **Altas (Implementar en 1-2 Semanas)**

6. **Validación con Zod** (A03)
   - Reemplazar validación manual con esquemas Zod
   - Aplicar en formularios y APIs

7. **Headers CSP y HSTS** (A05)
   - Agregar Content-Security-Policy
   - Agregar HTTP Strict Transport Security

8. **Backend Proxy para Google Maps** (A02)
   - Evitar exponer API key en frontend
   - Crear endpoint `/api/maps/autocomplete`

9. **Protección CSRF** (A04)
   - Agregar verificación de origen en APIs
   - Implementar tokens CSRF si es necesario

10. **MFA para Administradores** (A07)
    - Implementar autenticación de dos factores
    - Hacer obligatorio para rol admin

11. **Expandir Audit Logging** (A08)
    - Registrar cambios en pedidos, clientes, productos
    - Crear dashboard de auditoría

---

### 🟢 **Medias (Implementar en 1 Mes)**

12. **Políticas de Contraseña Fuertes** (A07)
    - Mínimo 8 caracteres, complejidad requerida
    - Verificar contra bases de datos de breaches

13. **Auto-logout por Inactividad** (A07)
    - Cerrar sesión automáticamente después de 30 min

14. **Timeouts en Requests Externos** (A04)
    - Agregar timeouts de 10s en todas las llamadas fetch

15. **Alertas Automáticas de Seguridad** (A09)
    - Notificaciones Slack/Email para eventos críticos

16. **Sanitizar dangerouslySetInnerHTML** (A03)
    - Usar DOMPurify o reemplazar con ReactNode

17. **Firma Digital en PDFs** (A08)
    - Agregar firma digital a presupuestos generados

---

### 🔵 **Bajas (Implementar Cuando Sea Posible)**

18. **Validar Variables de Entorno al Inicio** (A05)
19. **Dashboard de Seguridad** (A09)
20. **Documentar Rotación de Secrets** (A02)
21. **Validar Backups Periódicamente** (A08)
22. **Sistema de Migraciones Versionadas** (A08)
23. **Whitelist de Dominios para Fetch** (A10)

---

## 🛠️ Implementación Sugerida: Paso a Paso

### Fase 1: Seguridad Backend (Semana 1-2)

```bash
# 1. Crear middleware de autenticación
touch /opt/cane/3t/lib/auth-middleware.ts

# 2. Configurar RLS en Supabase
# Conectar a Supabase y ejecutar scripts SQL

# 3. Instalar dependencias de seguridad
cd /opt/cane/3t
npm install zod @upstash/ratelimit @upstash/redis winston

# 4. Ejecutar audit de dependencias
npm audit
npm audit fix
```

### Fase 2: Validación y Logging (Semana 3-4)

```bash
# 5. Implementar Zod en formularios
# Crear esquemas en lib/schemas/

# 6. Configurar Winston logger
touch /opt/cane/3t/lib/logger.ts

# 7. Agregar eventos de seguridad
# Modificar componentes para registrar eventos
```

### Fase 3: Headers y Protecciones (Semana 5-6)

```bash
# 8. Agregar headers CSP y HSTS
# Modificar next.config.ts

# 9. Crear proxy para Google Maps
touch /opt/cane/3t/app/api/maps/autocomplete/route.ts

# 10. Implementar rate limiting
# Modificar API routes
```

---

## 📄 Checklist de Verificación

### Antes de Producción

- [ ] RLS activo en todas las tablas Supabase
- [ ] Middleware de autenticación en todas las API routes
- [ ] Rate limiting configurado
- [ ] npm audit sin vulnerabilidades HIGH/CRITICAL
- [ ] Headers CSP y HSTS configurados
- [ ] Logging de eventos de seguridad activo
- [ ] MFA habilitado para admins
- [ ] Validación Zod en todos los formularios
- [ ] Timeouts en requests externos
- [ ] Variables de entorno validadas al inicio
- [ ] Backups verificados y funcionales

---

## 📞 Contacto y Soporte

Para dudas sobre implementación de estas recomendaciones:
- Revisar documentación de cada herramienta mencionada
- Consultar OWASP Top 10: https://owasp.org/Top10/
- Documentación Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security

---

**Fecha de Auditoría:** 16 de Octubre, 2025  
**Próxima Revisión Sugerida:** 16 de Enero, 2026 (3 meses)

---

## 🎓 Recursos Adicionales

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Supabase Security Guide](https://supabase.com/docs/guides/security)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Content Security Policy Reference](https://content-security-policy.com/)

---

**Fin del Informe**

