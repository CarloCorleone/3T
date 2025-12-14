import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { authenticateAndAuthorize, errorResponse, successResponse } from '@/lib/api-middleware'
import { logAudit } from '@/lib/permissions'

/**
 * PATCH /api/admin/users/password - Resetear contraseña de usuario
 * 
 * Requiere permiso: users.update
 * Body: { userId, newPassword }
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. Autenticar y autorizar
    const authResult = await authenticateAndAuthorize(request, 'users.update')
    
    if (!authResult.success) {
      return errorResponse(authResult.error, authResult.status)
    }

    const { user: currentUser } = authResult

    // 2. Parsear y validar body
    const body = await request.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return errorResponse('userId y newPassword son requeridos', 400)
    }

    // Validar longitud de contraseña
    if (newPassword.length < 6) {
      return errorResponse('La contraseña debe tener al menos 6 caracteres', 400)
    }

    // 3. Verificar que el usuario existe
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('3t_users')
      .select('id, nombre, email')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return errorResponse('Usuario no encontrado', 404)
    }

    // 4. Actualizar contraseña usando Auth Admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (error) {
      console.error('Error actualizando contraseña:', error)
      return errorResponse(`Error al actualizar contraseña: ${error.message}`, 500)
    }

    // 5. Registrar en auditoría
    await logAudit(
      currentUser.id,
      'user.password_reset',
      'user',
      userId,
      undefined,
      { reset_by: currentUser.id }
    )

    return successResponse({
      success: true,
      userId,
      message: 'Contraseña actualizada exitosamente'
    })
  } catch (error: any) {
    console.error('Error en PATCH /api/admin/users/password:', error)
    return errorResponse(error.message || 'Error interno del servidor', 500)
  }
}

