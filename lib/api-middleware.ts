import { NextRequest, NextResponse } from 'next/server'
import { supabase } from './supabase'
import { supabaseAdmin } from './supabase-admin'
import { hasPermission } from './permissions'
import type { Usuario } from './supabase'

/**
 * Resultado de autenticación
 */
type AuthResult = 
  | { success: true; user: Usuario }
  | { success: false; error: string; status: number }

/**
 * Middleware de autenticación para API routes
 * 
 * Extrae y valida el token JWT del header Authorization
 * Verifica que el usuario exista y esté activo
 * 
 * @param request - NextRequest con headers
 * @returns Usuario autenticado o error
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  try {
    // 1. Extraer token del header Authorization
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader) {
      return {
        success: false,
        error: 'No se proporcionó token de autenticación',
        status: 401
      }
    }

    const token = authHeader.replace('Bearer ', '').trim()
    
    if (!token) {
      return {
        success: false,
        error: 'Token inválido',
        status: 401
      }
    }

    // 2. Verificar token con Supabase Auth usando cliente regular
    // Nota: Usamos el cliente regular para validar JWTs de usuarios correctamente
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !authUser) {
      console.error('Error verificando token:', authError)
      return {
        success: false,
        error: 'Token inválido o expirado',
        status: 401
      }
    }

    // 3. Obtener datos completos del usuario desde 3t_users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('3t_users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    if (userError || !userData) {
      console.error('Error obteniendo usuario:', userError)
      return {
        success: false,
        error: 'Usuario no encontrado en el sistema',
        status: 404
      }
    }

    // 4. Verificar que el usuario esté activo
    if (!userData.activo) {
      return {
        success: false,
        error: 'Usuario inactivo',
        status: 403
      }
    }

    return {
      success: true,
      user: userData
    }
  } catch (error: any) {
    console.error('Error en authenticateRequest:', error)
    return {
      success: false,
      error: 'Error interno de autenticación',
      status: 500
    }
  }
}

/**
 * Valida que el usuario tenga un permiso específico
 * 
 * @param userId - ID del usuario
 * @param permission - Permiso requerido (ej: 'users.create')
 * @returns true si tiene el permiso, false en caso contrario
 */
export async function requirePermission(
  userId: string,
  permission: string
): Promise<boolean> {
  try {
    return await hasPermission(userId, permission)
  } catch (error) {
    console.error('Error verificando permiso:', error)
    return false
  }
}

/**
 * Helper para crear respuestas de error consistentes
 */
export function errorResponse(
  error: string,
  status: number = 500,
  details?: any
) {
  return NextResponse.json(
    {
      error,
      ...(details && { details })
    },
    { status }
  )
}

/**
 * Helper para crear respuestas exitosas consistentes
 */
export function successResponse(
  data: any,
  status: number = 200
) {
  return NextResponse.json(
    { data },
    { status }
  )
}

/**
 * Middleware completo: autenticación + verificación de permisos
 * 
 * Uso:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authResult = await authenticateAndAuthorize(request, 'users.create')
 *   if (!authResult.success) {
 *     return errorResponse(authResult.error, authResult.status)
 *   }
 *   
 *   const { user } = authResult
 *   // ... resto del código
 * }
 * ```
 */
export async function authenticateAndAuthorize(
  request: NextRequest,
  requiredPermission: string
): Promise<
  | { success: true; user: Usuario }
  | { success: false; error: string; status: number }
> {
  // 1. Autenticar
  const authResult = await authenticateRequest(request)
  
  if (!authResult.success) {
    return authResult
  }

  // 2. Verificar permiso
  const hasRequiredPermission = await requirePermission(
    authResult.user.id,
    requiredPermission
  )

  if (!hasRequiredPermission) {
    return {
      success: false,
      error: `No tienes permiso para realizar esta acción (requiere: ${requiredPermission})`,
      status: 403
    }
  }

  return {
    success: true,
    user: authResult.user
  }
}

