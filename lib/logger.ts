/**
 * Sistema de Logging con Winston
 * Registra eventos de seguridad, errores y acciones importantes
 * 
 * Niveles de Log:
 * - error: Errores críticos
 * - warn: Advertencias
 * - info: Información general
 * - http: Requests HTTP
 * - debug: Debugging (solo desarrollo)
 * 
 * Archivos generados:
 * - logs/error.log: Solo errores
 * - logs/combined.log: Todos los logs
 * - logs/security.log: Eventos de seguridad
 */

import winston from 'winston'
import path from 'path'

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Formato para consola (más legible)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`
    
    // Agregar metadata si existe
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`
    }
    
    return log
  })
)

// Crear logger principal
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: '3t-app' },
  transports: [
    // Errores críticos en archivo separado
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Todos los logs en archivo combinado
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
})

// En desarrollo, también mostrar en consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  )
}

// Logger específico para seguridad
export const securityLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: '3t-security' },
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'security.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
})

// En desarrollo, security logs también en consola
if (process.env.NODE_ENV !== 'production') {
  securityLogger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  )
}

/**
 * Helpers para logging de eventos específicos
 */

/**
 * Log de login exitoso
 */
export function logLogin(userId: string, email: string, ip?: string) {
  securityLogger.info('Login exitoso', {
    event: 'login_success',
    userId,
    email,
    ip: ip || 'unknown',
    timestamp: new Date().toISOString(),
  })
}

/**
 * Log de login fallido
 */
export function logLoginFailed(email: string, reason: string, ip?: string) {
  securityLogger.warn('Login fallido', {
    event: 'login_failed',
    email,
    reason,
    ip: ip || 'unknown',
    timestamp: new Date().toISOString(),
  })
}

/**
 * Log de logout
 */
export function logLogout(userId: string, email: string) {
  securityLogger.info('Logout', {
    event: 'logout',
    userId,
    email,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Log de acceso no autorizado
 */
export function logUnauthorizedAccess(
  path: string,
  userId?: string,
  reason?: string,
  ip?: string
) {
  securityLogger.warn('Acceso no autorizado', {
    event: 'unauthorized_access',
    path,
    userId: userId || 'anonymous',
    reason: reason || 'unknown',
    ip: ip || 'unknown',
    timestamp: new Date().toISOString(),
  })
}

/**
 * Log de rate limit excedido
 */
export function logRateLimitExceeded(
  identifier: string,
  path: string,
  limit: number
) {
  securityLogger.warn('Rate limit excedido', {
    event: 'rate_limit_exceeded',
    identifier,
    path,
    limit,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Log de error en API
 */
export function logApiError(
  path: string,
  method: string,
  error: Error,
  userId?: string
) {
  logger.error('Error en API', {
    event: 'api_error',
    path,
    method,
    error: error.message,
    stack: error.stack,
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString(),
  })
}

/**
 * Log de acción administrativa
 */
export function logAdminAction(
  userId: string,
  action: string,
  target?: string,
  details?: any
) {
  securityLogger.info('Acción administrativa', {
    event: 'admin_action',
    userId,
    action,
    target,
    details,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Log genérico de seguridad
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, any>
) {
  securityLogger.info(event, {
    ...details,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Sanitizar datos sensibles antes de logging
 * Remueve passwords, tokens, etc.
 */
export function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sanitized = { ...data }
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'session',
  ]

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase()
    
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key])
    }
  }

  return sanitized
}

/**
 * Wrapper para logging de requests HTTP
 */
export function logHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: string
) {
  logger.http('HTTP Request', {
    method,
    path,
    statusCode,
    duration,
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString(),
  })
}

export default logger
















