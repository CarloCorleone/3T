import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { authenticateAndAuthorize, errorResponse, successResponse } from '@/lib/api-middleware'
import { logAudit } from '@/lib/permissions'

/**
 * POST /api/admin/users/permissions - Asignar o revocar permiso
 * 
 * Requiere permiso: users.update
 * Body: { userId, permissionId, type: 'grant' | 'revoke' }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticar y autorizar
    const authResult = await authenticateAndAuthorize(request, 'users.update')
    
    if (!authResult.success) {
      return errorResponse(authResult.error, authResult.status)
    }

    const { user: currentUser } = authResult

    // 2. Parsear y validar body
    const body = await request.json()
    const { userId, permissionId, type } = body

    if (!userId || !permissionId || !type) {
      return errorResponse('Faltan campos requeridos', 400, {
        required: ['userId', 'permissionId', 'type']
      })
    }

    if (!['grant', 'revoke'].includes(type)) {
      return errorResponse('type debe ser "grant" o "revoke"', 400)
    }

    // 3. Verificar que el usuario existe
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('3t_users')
      .select('id, nombre')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return errorResponse('Usuario no encontrado', 404)
    }

    // 4. Verificar que el permiso existe
    const { data: permission, error: permError } = await supabaseAdmin
      .from('3t_permissions')
      .select('permission_id, description')
      .eq('permission_id', permissionId)
      .single()

    if (permError || !permission) {
      return errorResponse('Permiso no encontrado', 404)
    }

    // 5. Insertar o actualizar en 3t_user_permissions
    const { error } = await supabaseAdmin
      .from('3t_user_permissions')
      .upsert({
        user_id: userId,
        permission_id: permissionId,
        granted: type === 'grant',  // true para grant, false para revoke
        created_by: currentUser.id
      }, {
        onConflict: 'user_id,permission_id'
      })

    if (error) {
      console.error('Error asignando permiso:', error)
      return errorResponse(`Error al asignar permiso: ${error.message}`, 500)
    }

    // 6. Registrar en auditoría
    await logAudit(
      currentUser.id,
      `permission.${type}`,
      'user_permission',
      userId,
      undefined,
      { permissionId, type }
    )

    return successResponse({
      success: true,
      userId,
      permissionId,
      type
    })
  } catch (error: any) {
    console.error('Error en POST /api/admin/users/permissions:', error)
    return errorResponse(error.message || 'Error interno del servidor', 500)
  }
}

/**
 * DELETE /api/admin/users/permissions?userId=<uuid>&permissionId=<id>
 * 
 * Elimina un permiso personalizado (grant o revoke)
 * Requiere permiso: users.update
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Autenticar y autorizar
    const authResult = await authenticateAndAuthorize(request, 'users.update')
    
    if (!authResult.success) {
      return errorResponse(authResult.error, authResult.status)
    }

    const { user: currentUser } = authResult

    // 2. Obtener parámetros
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const permissionId = searchParams.get('permissionId')

    if (!userId || !permissionId) {
      return errorResponse('userId y permissionId son requeridos', 400)
    }

    // 3. Eliminar de 3t_user_permissions
    const { error } = await supabaseAdmin
      .from('3t_user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission_id', permissionId)

    if (error) {
      console.error('Error eliminando permiso:', error)
      return errorResponse(`Error al eliminar permiso: ${error.message}`, 500)
    }

    // 4. Registrar en auditoría
    await logAudit(
      currentUser.id,
      'permission.removed',
      'user_permission',
      userId,
      { permissionId },
      undefined
    )

    return successResponse({ success: true, userId, permissionId })
  } catch (error: any) {
    console.error('Error en DELETE /api/admin/users/permissions:', error)
    return errorResponse(error.message || 'Error interno del servidor', 500)
  }
}

