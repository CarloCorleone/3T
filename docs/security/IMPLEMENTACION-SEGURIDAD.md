# 🔐 Guía de Implementación: Correcciones de Seguridad
## Código Listo para Implementar

Este documento contiene código listo para usar para implementar las correcciones críticas identificadas en la auditoría OWASP Top 10.

---

## 📋 Tabla de Contenidos

1. [Middleware de Autenticación](#1-middleware-de-autenticación)
2. [Row Level Security (RLS)](#2-row-level-security-rls)
3. [Rate Limiting](#3-rate-limiting)
4. [Validación con Zod](#4-validación-con-zod)
5. [Sistema de Logging](#5-sistema-de-logging)
6. [Headers de Seguridad](#6-headers-de-seguridad)
7. [Protección CSRF](#7-protección-csrf)
8. [Auto-logout por Inactividad](#8-auto-logout-por-inactividad)

---

## 1. Middleware de Autenticación

### Crear: `lib/auth-middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export interface AuthContext {
  userId: string
  email: string
  role: string
}

/**
 * Middleware para verificar autenticación en API routes
 * Uso:
 *   const auth = await requireAuth(request)
 *   if (!auth.userId) return NextResponse.json({ error: auth.error }, { status: 401 })
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ userId?: string; email?: string; role?: string; error?: string; status?: number }> {
  try {
    const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() })
    
    // Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return { 
        error: 'No autorizado - sesión inválida', 
        status: 401 
      }
    }
    
    // Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('3t_users')
      .select('id, email, rol')
      .eq('id', session.user.id)
      .single()
    
    if (userError || !userData) {
      return { 
        error: 'Usuario no encontrado', 
        status: 403 
      }
    }
    
    if (!userData.activo) {
      return { 
        error: 'Usuario inactivo', 
        status: 403 
      }
    }
    
    return {
      userId: userData.id,
      email: userData.email,
      role: userData.rol
    }
  } catch (error) {
    console.error('Error en requireAuth:', error)
    return { 
      error: 'Error de autenticación', 
      status: 500 
    }
  }
}

/**
 * Middleware para verificar permiso específico
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<{ authorized: boolean; userId?: string; error?: string; status?: number }> {
  const auth = await requireAuth(request)
  
  if (!auth.userId) {
    return { authorized: false, error: auth.error, status: auth.status }
  }
  
  try {
    const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() })
    
    // Verificar permiso
    const { data, error } = await supabase.rpc('3t_has_permission', {
      p_user: auth.userId,
      p_perm: permission
    })
    
    if (error) {
      return { 
        authorized: false, 
        error: 'Error verificando permisos', 
        status: 500 
      }
    }
    
    if (!data) {
      return { 
        authorized: false, 
        error: 'Permiso denegado', 
        status: 403 
      }
    }
    
    return { authorized: true, userId: auth.userId }
  } catch (error) {
    console.error('Error en requirePermission:', error)
    return { 
      authorized: false, 
      error: 'Error verificando permisos', 
      status: 500 
    }
  }
}
```

### Uso en API Route

**Actualizar: `app/api/optimize-route/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  // ✅ NUEVO: Verificar autenticación y permisos
  const authCheck = await requirePermission(request, 'rutas:optimizar')
  
  if (!authCheck.authorized) {
    logger.warn('Intento no autorizado de optimizar ruta', {
      error: authCheck.error,
      ip: request.ip,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status || 403 }
    )
  }
  
  const userId = authCheck.userId!
  
  try {
    const { orders } = await request.json()
    
    // Log de auditoría
    logger.info('Optimización de ruta solicitada', {
      userId,
      orderCount: orders.length,
      timestamp: new Date().toISOString()
    })
    
    // ... resto de la lógica existente ...
    
  } catch (error: any) {
    logger.error('Error en optimize-route', {
      userId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

---

## 2. Row Level Security (RLS)

### Scripts SQL para Supabase

**Ejecutar en Supabase SQL Editor:**

```sql
-- =====================================================
-- ACTIVAR RLS EN TODAS LAS TABLAS 3T
-- =====================================================

-- Pedidos
ALTER TABLE 3t_orders ENABLE ROW LEVEL SECURITY;

-- Clientes
ALTER TABLE 3t_customers ENABLE ROW LEVEL SECURITY;

-- Direcciones
ALTER TABLE 3t_addresses ENABLE ROW LEVEL SECURITY;

-- Productos
ALTER TABLE 3t_products ENABLE ROW LEVEL SECURITY;

-- Presupuestos
ALTER TABLE 3t_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_quote_items ENABLE ROW LEVEL SECURITY;

-- Usuarios (ya debería tener RLS)
ALTER TABLE 3t_users ENABLE ROW LEVEL SECURITY;

-- Proveedores
ALTER TABLE 3t_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_supplier_addresses ENABLE ROW LEVEL SECURITY;

-- Compras
ALTER TABLE 3t_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_purchase_products ENABLE ROW LEVEL SECURITY;

-- Rutas
ALTER TABLE 3t_saved_routes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE ACCESO PARA PEDIDOS
-- =====================================================

-- Admin ve todo
CREATE POLICY "Admins tienen acceso completo a pedidos"
ON 3t_orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
  )
);

-- Operadores y repartidores ven solo pedidos activos
CREATE POLICY "Operadores ven todos los pedidos"
ON 3t_orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('operador', 'repartidor')
  )
);

-- Operadores pueden crear/actualizar
CREATE POLICY "Operadores pueden modificar pedidos"
ON 3t_orders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

CREATE POLICY "Operadores pueden actualizar pedidos"
ON 3t_orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador', 'repartidor')
  )
);

-- =====================================================
-- POLÍTICAS DE ACCESO PARA CLIENTES
-- =====================================================

CREATE POLICY "Usuarios autenticados ven clientes"
ON 3t_customers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Admin y operadores modifican clientes"
ON 3t_customers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol IN ('admin', 'operador')
  )
);

-- =====================================================
-- POLÍTICAS DE ACCESO PARA PRODUCTOS
-- =====================================================

CREATE POLICY "Todos ven productos"
ON 3t_products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Solo admin modifica productos"
ON 3t_products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
  )
);

-- =====================================================
-- POLÍTICAS DE ACCESO PARA USUARIOS
-- =====================================================

CREATE POLICY "Usuarios ven su propio perfil"
ON 3t_users FOR SELECT
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
  )
);

CREATE POLICY "Solo admin modifica usuarios"
ON 3t_users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM 3t_users 
    WHERE id = auth.uid() 
    AND rol = 'admin'
  )
);

-- =====================================================
-- VERIFICAR POLÍTICAS ACTIVAS
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename LIKE '3t_%'
ORDER BY tablename, policyname;

-- =====================================================
-- FUNCIÓN HELPER: Verificar si RLS está activo
-- =====================================================

CREATE OR REPLACE FUNCTION check_rls_enabled()
RETURNS TABLE(table_name text, rls_enabled boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text,
    c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
  AND c.relname LIKE '3t_%'
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar verificación
SELECT * FROM check_rls_enabled();
```

---

## 3. Rate Limiting

### Opción A: Con Upstash Redis (Recomendado)

**1. Instalar dependencias:**

```bash
npm install @upstash/ratelimit @upstash/redis
```

**2. Configurar variables de entorno:**

Agregar a `/opt/cane/env/3t.env`:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**3. Crear: `lib/rate-limit.ts`**

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Configurar Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

// Rate limiters por tipo de endpoint
export const rateLimiters = {
  // Login: 5 intentos por 15 minutos
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: '@ratelimit/login',
  }),
  
  // API general: 100 requests por minuto
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: '@ratelimit/api',
  }),
  
  // API intensiva (optimización rutas): 10 por minuto
  intensive: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: '@ratelimit/intensive',
  }),
}

/**
 * Helper para aplicar rate limiting
 */
export async function applyRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<{ success: boolean; limit: number; remaining: number; reset: Date }> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)
  
  return { success, limit, remaining, reset: new Date(reset) }
}
```

**4. Uso en API Route:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters, applyRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Obtener identificador (IP o userId)
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1'
  
  // Aplicar rate limit
  const rateLimit = await applyRateLimit(ip, rateLimiters.api)
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { 
        error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
        retryAfter: rateLimit.reset.toISOString(),
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toISOString(),
          'Retry-After': Math.ceil((rateLimit.reset.getTime() - Date.now()) / 1000).toString(),
        }
      }
    )
  }
  
  // Continuar con lógica normal...
}
```

### Opción B: Rate Limiting en Memoria (Sin Redis)

**Crear: `lib/rate-limit-memory.ts`**

```typescript
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

/**
 * Rate limiting simple en memoria
 * Límite: máximo de requests en ventana de tiempo
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)
  
  // Si no existe o expiró, crear nueva entrada
  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs
    }
    rateLimitMap.set(identifier, newEntry)
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(newEntry.resetAt)
    }
  }
  
  // Si ya alcanzó el límite
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt)
    }
  }
  
  // Incrementar contador
  entry.count++
  rateLimitMap.set(identifier, entry)
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: new Date(entry.resetAt)
  }
}

// Limpiar entradas expiradas cada 10 minutos
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 10 * 60 * 1000)
```

---

## 4. Validación con Zod

### Crear: `lib/schemas/auth.schema.ts`

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Formato de email inválido')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
})

export const createUserSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  rol: z.enum(['admin', 'operador', 'repartidor'], {
    errorMap: () => ({ message: 'Rol inválido' })
  }),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
```

### Crear: `lib/schemas/orders.schema.ts`

```typescript
import { z } from 'zod'

export const createOrderSchema = z.object({
  customer_id: z.string().uuid('ID de cliente inválido'),
  delivery_address_id: z.string().uuid('ID de dirección inválido'),
  product_id: z.string().uuid('ID de producto inválido'),
  quantity: z.number().int().positive('Cantidad debe ser positiva').max(100, 'Cantidad máxima: 100'),
  order_type: z.enum(['recarga', 'nuevo', 'compras']),
  payment_type: z.enum(['Efectivo', 'Transferencia']),
  final_price: z.number().nonnegative('Precio debe ser no negativo'),
  details: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

export const updateOrderSchema = createOrderSchema.partial().extend({
  order_id: z.string().uuid('ID de pedido inválido'),
  status: z.enum(['Pedido', 'Ruta', 'Despachado']).optional(),
  payment_status: z.enum(['Pendiente', 'Pagado', 'Facturado', 'Interno']).optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>
```

### Uso en Componente

**Actualizar: `app/login/page.tsx`**

```typescript
'use client'

import { loginSchema, type LoginInput } from '@/lib/schemas/auth.schema'
import { ZodError } from 'zod'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({})
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    // ✅ Validar con Zod
    try {
      const validated = loginSchema.parse({ email, password })
      
      // Usar datos validados
      await signIn(validated.email, validated.password)
      router.push('/')
      
    } catch (error) {
      if (error instanceof ZodError) {
        // Mostrar errores de validación
        const fieldErrors: Partial<Record<keyof LoginInput, string>> = {}
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof LoginInput] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        // Error de autenticación
        setError(error.message || 'Error al iniciar sesión')
      }
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
      
      <Button type="submit">Iniciar Sesión</Button>
    </form>
  )
}
```

### Uso en API Route

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createOrderSchema } from '@/lib/schemas/orders.schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ✅ Validar con Zod
    const validated = createOrderSchema.parse(body)
    
    // Usar datos validados (garantizado correcto)
    const { data, error } = await supabase
      .from('3t_orders')
      .insert([validated])
    
    if (error) throw error
    
    return NextResponse.json({ success: true, data })
    
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    )
  }
}
```

---

## 5. Sistema de Logging

### Instalar Winston

```bash
npm install winston
```

### Crear: `lib/logger.ts`

```typescript
import winston from 'winston'
import path from 'path'

const isProduction = process.env.NODE_ENV === 'production'

// Formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Crear logger
export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: customFormat,
  defaultMeta: { service: '3t-app' },
  transports: [
    // Errores en archivo separado
    new winston.transports.File({ 
      filename: '/opt/cane/3t/logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Todos los logs
    new winston.transports.File({ 
      filename: '/opt/cane/3t/logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
    
    // Eventos de seguridad
    new winston.transports.File({ 
      filename: '/opt/cane/3t/logs/security.log',
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
})

// En desarrollo, también mostrar en consola
if (!isProduction) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}

// Helpers para eventos de seguridad
export const securityLogger = {
  loginSuccess: (userId: string, email: string, ip: string) => {
    logger.info('Login exitoso', {
      event: 'auth.login.success',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString()
    })
  },
  
  loginFailed: (email: string, reason: string, ip: string) => {
    logger.warn('Login fallido', {
      event: 'auth.login.failed',
      email,
      reason,
      ip,
      timestamp: new Date().toISOString()
    })
  },
  
  accessDenied: (userId: string, resource: string, reason: string) => {
    logger.warn('Acceso denegado', {
      event: 'access.denied',
      userId,
      resource,
      reason,
      timestamp: new Date().toISOString()
    })
  },
  
  permissionChanged: (adminId: string, targetUserId: string, permission: string, granted: boolean) => {
    logger.info('Cambio de permiso', {
      event: 'permission.changed',
      adminId,
      targetUserId,
      permission,
      granted,
      timestamp: new Date().toISOString()
    })
  },
  
  dataDeleted: (userId: string, entityType: string, entityId: string) => {
    logger.warn('Datos eliminados', {
      event: 'data.deleted',
      userId,
      entityType,
      entityId,
      timestamp: new Date().toISOString()
    })
  },
}

// Sanitizar datos sensibles antes de logear
export function sanitizeForLog<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data }
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization']
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]'
    }
  }
  
  return sanitized
}
```

### Crear directorio de logs

```bash
mkdir -p /opt/cane/3t/logs
chmod 755 /opt/cane/3t/logs
```

### Actualizar `.gitignore`

```gitignore
# Logs
/logs/*.log
```

### Uso del Logger

```typescript
import { logger, securityLogger, sanitizeForLog } from '@/lib/logger'

// Login exitoso
securityLogger.loginSuccess(user.id, user.email, request.ip)

// Login fallido
securityLogger.loginFailed(email, 'Contraseña incorrecta', request.ip)

// Acceso denegado
securityLogger.accessDenied(userId, 'pedidos:eliminar', 'Sin permiso')

// Log general con sanitización
logger.info('Solicitud recibida', sanitizeForLog({
  method: request.method,
  url: request.url,
  body: requestBody, // Se sanitizará automáticamente
}))

// Error con stack trace
try {
  // ...
} catch (error) {
  logger.error('Error procesando pedido', {
    error: error.message,
    stack: error.stack,
    userId,
  })
}
```

---

## 6. Headers de Seguridad

### Actualizar: `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'db.loopia.cl',
      },
    ],
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // ✅ Headers de seguridad mejorados
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevenir clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          
          // Prevenir MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          
          // Política de referrer
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          
          // Permisos de navegador
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          
          // ✅ NUEVO: Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://api.loopia.cl https://db.loopia.cl https://maps.googleapis.com",
              "frame-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          
          // ✅ NUEVO: HTTP Strict Transport Security
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          
          // ✅ NUEVO: XSS Protection (legacy pero útil)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Nota sobre CSP:** Si encuentras problemas con `'unsafe-inline'` o `'unsafe-eval'`, puedes usar nonces. Ver [Next.js CSP docs](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy).

---

## 7. Protección CSRF

### Crear: `lib/csrf.ts`

```typescript
import { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://3t.loopia.cl',
  'https://dev.3t.loopia.cl',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'] : []),
]

/**
 * Verificar origen de la solicitud (protección CSRF)
 */
export function verifyOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // Si es una solicitud del mismo origen, permitir
  if (!origin && !referer) {
    return true // Request del mismo dominio (no CORS)
  }
  
  // Verificar origin header
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return true
  }
  
  // Verificar referer header (fallback)
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      if (ALLOWED_ORIGINS.some(allowed => refererUrl.origin === allowed)) {
        return true
      }
    } catch {
      return false
    }
  }
  
  return false
}

/**
 * Middleware helper para protección CSRF
 */
export function requireSameOrigin(request: NextRequest) {
  if (!verifyOrigin(request)) {
    return {
      valid: false,
      error: 'Origen no permitido',
      status: 403
    }
  }
  
  return { valid: true }
}
```

### Uso en API Route

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireSameOrigin } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  // ✅ Verificar origen
  const csrfCheck = requireSameOrigin(request)
  
  if (!csrfCheck.valid) {
    return NextResponse.json(
      { error: csrfCheck.error },
      { status: csrfCheck.status }
    )
  }
  
  // Continuar con lógica normal...
}
```

---

## 8. Auto-logout por Inactividad

### Actualizar: `components/auth-guard.tsx`

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Loader2 } from 'lucide-react'
import { logger } from '@/lib/logger'

interface AuthGuardProps {
  children: React.ReactNode
}

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutos

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, checkAuth, signOut } = useAuthStore()
  const inactivityTimerRef = useRef<NodeJS.Timeout>()

  // Verificar autenticación al cargar
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // ✅ NUEVO: Auto-logout por inactividad
  useEffect(() => {
    if (!user) return

    const handleActivity = () => {
      // Limpiar timer anterior
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }

      // Crear nuevo timer
      inactivityTimerRef.current = setTimeout(async () => {
        logger.info('Auto-logout por inactividad', {
          userId: user.id,
          email: user.email,
          timestamp: new Date().toISOString()
        })
        
        await signOut()
        router.push('/login?reason=inactivity')
      }, INACTIVITY_TIMEOUT)
    }

    // Eventos que resetean el timer
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    
    // Registrar listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Iniciar timer
    handleActivity()

    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [user, signOut, router])

  // Manejar redirección basada en estado de auth
  useEffect(() => {
    if (loading) return

    if (pathname === '/login') {
      if (user) {
        router.push('/')
      }
      return
    }

    if (!user) {
      router.push('/login')
      return
    }
  }, [loading, user, pathname, router])

  // Mostrar loader mientras verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!user && pathname !== '/login') {
    return null
  }

  return <>{children}</>
}
```

### Actualizar: `app/login/page.tsx`

Agregar mensaje cuando se redirige por inactividad:

```typescript
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('')
  
  useEffect(() => {
    const reason = searchParams.get('reason')
    if (reason === 'inactivity') {
      setMessage('Tu sesión expiró por inactividad. Por favor inicia sesión nuevamente.')
    }
  }, [searchParams])
  
  return (
    <div>
      {message && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">{message}</p>
        </div>
      )}
      
      {/* Resto del formulario */}
    </div>
  )
}
```

---

## 📋 Checklist de Implementación

Marca cada item una vez implementado:

### Críticas (Semana 1)
- [ ] Middleware de autenticación en API routes
- [ ] RLS activo en todas las tablas Supabase
- [ ] Rate limiting básico implementado
- [ ] npm audit ejecutado y vulnerabilidades resueltas
- [ ] Sistema de logging con Winston

### Altas (Semana 2-3)
- [ ] Validación con Zod en formularios principales
- [ ] Headers CSP y HSTS configurados
- [ ] Protección CSRF en APIs
- [ ] Auto-logout por inactividad

### Medias (Semana 4)
- [ ] Alertas automáticas configuradas
- [ ] Audit logging expandido
- [ ] Políticas de contraseña fuertes
- [ ] Timeouts en requests externos

---

## 🔄 Próximos Pasos

1. **Revisar y adaptar** el código a tus necesidades específicas
2. **Probar en desarrollo** antes de llevar a producción
3. **Documentar** las implementaciones en tu README
4. **Monitorear** logs y métricas después del despliegue
5. **Iterar** basándote en los resultados observados

---

## 📚 Referencias

- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Zod Documentation](https://zod.dev/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Upstash Rate Limiting](https://github.com/upstash/ratelimit)

---

**¡Buena suerte con la implementación! 🚀**

