/**
 * Middleware de Autenticación para API Routes
 * Verifica que el usuario esté autenticado con Supabase Auth
 * y tenga un perfil válido en 3t_users
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logUnauthorizedAccess, sanitizeData } from './logger'

/**
 * Resultado de la verificación de autenticación
 */
export interface AuthCheckResult {
  authorized: boolean
  status: number
  error?: string
  userId?: string
  rol?: 'admin' | 'operador' | 'repartidor'
  user?: any
}

/**
 * Verifica que el usuario esté autenticado
 * Retorna información del usuario si está autenticado, o error si no lo está
 */
export async function requireAuth(request: NextRequest): Promise<AuthCheckResult> {
  try {
    const cookieStore = await cookies()

    // Crear cliente Supabase en servidor
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

    // Verificar sesión activa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('❌ Error verificando sesión:', sessionError)
      logUnauthorizedAccess(request.nextUrl.pathname, undefined, 'session_error')
      return {
        authorized: false,
        status: 401,
        error: 'Error verificando autenticación'
      }
    }

    if (!session?.user) {
      logUnauthorizedAccess(request.nextUrl.pathname, undefined, 'no_session')
      return {
        authorized: false,
        status: 401,
        error: 'No autenticado. Por favor inicia sesión.'
      }
    }

    // Verificar que el usuario exista en 3t_users y esté activo
    const { data: userData, error: userError } = await supabase
      .from('3t_users')
      .select('id, email, nombre, rol, activo')
      .eq('id', session.user.id)
      .single()

    if (userError || !userData) {
      console.error('❌ Error obteniendo datos de usuario:', userError)
      logUnauthorizedAccess(request.nextUrl.pathname, session.user.id, 'user_not_found')
      return {
        authorized: false,
        status: 403,
        error: 'Usuario no encontrado en el sistema'
      }
    }

    if (!userData.activo) {
      logUnauthorizedAccess(request.nextUrl.pathname, userData.id, 'user_inactive')
      return {
        authorized: false,
        status: 403,
        error: 'Usuario inactivo. Contacta al administrador.'
      }
    }

    // Usuario autenticado y activo
    return {
      authorized: true,
      status: 200,
      userId: userData.id,
      rol: userData.rol as 'admin' | 'operador' | 'repartidor',
      user: userData
    }

  } catch (error) {
    console.error('❌ Error en requireAuth:', error)
    return {
      authorized: false,
      status: 500,
      error: 'Error interno del servidor'
    }
  }
}

/**
 * Verifica que el usuario esté autenticado Y tenga un permiso específico
 * Usa la función RPC 3t_has_permission que ya existe en Supabase
 */
export async function requirePermission(
  request: NextRequest, 
  permission: string
): Promise<AuthCheckResult> {
  // Primero verificar autenticación
  const authCheck = await requireAuth(request)
  
  if (!authCheck.authorized) {
    return authCheck
  }

  try {
    const cookieStore = await cookies()
    
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

    // Verificar permiso usando función RPC existente
    const { data: hasPermission, error: permError } = await supabase
      .rpc('3t_has_permission', {
        p_user_id: authCheck.userId,
        p_permission_id: permission
      })

    if (permError) {
      console.error('❌ Error verificando permiso:', permError)
      return {
        authorized: false,
        status: 500,
        error: 'Error verificando permisos'
      }
    }

    if (!hasPermission) {
      return {
        authorized: false,
        status: 403,
        error: `No tienes permiso para: ${permission}`
      }
    }

    // Usuario autenticado y con permiso
    return authCheck

  } catch (error) {
    console.error('❌ Error en requirePermission:', error)
    return {
      authorized: false,
      status: 500,
      error: 'Error interno del servidor'
    }
  }
}

/**
 * Verifica que el usuario sea admin
 * Atajo para acciones que solo puede realizar un admin
 */
export async function requireAdmin(request: NextRequest): Promise<AuthCheckResult> {
  const authCheck = await requireAuth(request)
  
  if (!authCheck.authorized) {
    return authCheck
  }

  if (authCheck.rol !== 'admin') {
    return {
      authorized: false,
      status: 403,
      error: 'Solo administradores pueden realizar esta acción'
    }
  }

  return authCheck
}

/**
 * Helper para crear respuesta de error con logging
 */
export function createErrorResponse(authCheck: AuthCheckResult): NextResponse {
  // Logging estructurado para prevenir format string injection
  console.error('🚫 Auth Error:', { 
    status: authCheck.status, 
    error: authCheck.error 
  })
  
  return NextResponse.json(
    { 
      error: authCheck.error,
      authenticated: false 
    },
    { status: authCheck.status }
  )
}

