/**
 * Rate Limiting con Upstash Redis
 * Protege contra ataques de fuerza bruta y DDoS
 * 
 * CONFIGURACIÓN REQUERIDA:
 * 1. Crear cuenta en https://upstash.com (gratis)
 * 2. Crear base de datos Redis
 * 3. Agregar credenciales en /opt/cane/env/3t.env:
 *    UPSTASH_REDIS_REST_URL=https://...
 *    UPSTASH_REDIS_REST_TOKEN=...
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { logRateLimitExceeded } from './logger'

// Verificar si Upstash está configurado
const isConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Crear cliente Redis solo si está configurado
const redis = isConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

/**
 * Rate Limiter para login
 * Límite: 5 intentos por 15 minutos
 */
export const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: '@3t/ratelimit/login',
    })
  : null

/**
 * Rate Limiter para API calls generales
 * Límite: 100 requests por minuto
 */
export const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: '@3t/ratelimit/api',
    })
  : null

/**
 * Rate Limiter para operaciones intensivas (e.g. optimización de rutas)
 * Límite: 10 requests por minuto
 */
export const intensiveLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: '@3t/ratelimit/intensive',
    })
  : null

/**
 * Helper para obtener identificador único del request
 * Usa IP o userId según disponibilidad
 */
export function getRateLimitIdentifier(
  request: NextRequest,
  userId?: string
): string {
  // Preferir userId si está disponible
  if (userId) {
    return `user:${userId}`
  }

  // Obtener IP del request
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || 'unknown'

  return `ip:${ip}`
}

/**
 * Middleware para aplicar rate limiting a un request
 * Retorna null si está OK, o NextResponse con error 429 si excedió el límite
 */
export async function checkRateLimit(
  request: NextRequest,
  limiter: Ratelimit | null,
  identifier: string
): Promise<NextResponse | null> {
  // Si no hay limiter configurado, permitir el request (modo desarrollo)
  if (!limiter) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Rate limiting deshabilitado (Upstash no configurado)')
    }
    return null
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      console.warn(`🚫 Rate limit excedido: ${identifier}`)
      logRateLimitExceeded(identifier, request.nextUrl.pathname, limit)
      
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
          rateLimitExceeded: true,
          limit,
          remaining: 0,
          resetInSeconds: Math.ceil((reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // Log para monitoreo (solo si quedan pocos requests)
    if (remaining < 5) {
      console.warn(`⚠️  Rate limit cerca del límite: ${identifier} - Restantes: ${remaining}/${limit}`)
    }

    return null
  } catch (error) {
    console.error('❌ Error en rate limiting:', error)
    // En caso de error, permitir el request (fail open)
    return null
  }
}

/**
 * Ejemplo de uso en API route:
 * 
 * export async function POST(request: NextRequest) {
 *   // Aplicar rate limiting
 *   const rateLimitResponse = await checkRateLimit(
 *     request,
 *     intensiveLimiter,
 *     getRateLimitIdentifier(request)
 *   )
 *   if (rateLimitResponse) {
 *     return rateLimitResponse
 *   }
 * 
 *   // Continuar con la lógica normal...
 * }
 */

/**
 * Verificar si Upstash está configurado
 */
export function isRateLimitingEnabled(): boolean {
  return isConfigured
}

/**
 * Obtener estadísticas de rate limiting (solo para admins)
 */
export async function getRateLimitStats(identifier: string): Promise<{
  configured: boolean
  stats?: {
    limit: number
    remaining: number
    resetInSeconds: number
  }
}> {
  if (!redis || !apiLimiter) {
    return { configured: false }
  }

  try {
    const { limit, remaining, reset } = await apiLimiter.limit(identifier)
    
    return {
      configured: true,
      stats: {
        limit,
        remaining,
        resetInSeconds: Math.ceil((reset - Date.now()) / 1000),
      },
    }
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de rate limiting:', error)
    return { configured: false }
  }
}

