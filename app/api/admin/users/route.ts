import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { authenticateAndAuthorize, errorResponse, successResponse } from '@/lib/api-middleware'
import { logAudit } from '@/lib/permissions'

/**
 * POST /api/admin/users - Crear nuevo usuario
 * 
 * Requiere permiso: users.create
 * Body: { email, nombre, rol, activo? }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticar y autorizar
    const authResult = await authenticateAndAuthorize(request, 'users.create')
    
    if (!authResult.success) {
      return errorResponse(authResult.error, authResult.status)
    }

    const { user: currentUser } = authResult

    // 2. Parsear y validar body
    const body = await request.json()
    const { email, nombre, password, rol, activo } = body

    // Validaciones
    if (!email || !nombre || !password || !rol) {
      return errorResponse(
        'Faltan campos requeridos',
        400,
        { required: ['email', 'nombre', 'password', 'rol'] }
      )
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return errorResponse('La contraseña debe tener al menos 6 caracteres', 400)
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return errorResponse('Formato de email inválido', 400)
    }

    // Validar rol
    const rolesValidos = ['admin', 'operador', 'repartidor']
    if (!rolesValidos.includes(rol)) {
      return errorResponse(
        'Rol inválido',
        400,
        { validRoles: rolesValidos }
      )
    }

    // 3. Crear usuario en Supabase Auth primero
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true,  // Auto-confirmar email
      user_metadata: {
        nombre: nombre.trim()
      }
    })

    if (authError) {
      console.error('Error creando usuario en auth:', authError)
      return errorResponse(`Error al crear usuario: ${authError.message}`, 500)
    }

    if (!authData.user) {
      return errorResponse('Error al crear usuario en el sistema de autenticación', 500)
    }

    // 4. Crear usuario en 3t_users con el mismo UUID
    const { data, error } = await supabaseAdmin
      .from('3t_users')
      .insert({
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        nombre: nombre.trim(),
        rol: rol,
        role_id: rol,
        activo: activo ?? true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creando usuario en 3t_users:', error)
      // Si falla la creación en 3t_users, eliminar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return errorResponse(`Error al crear usuario: ${error.message}`, 500)
    }

    // 5. Registrar en auditoría
    await logAudit(
      currentUser.id,
      'user.created',
      'user',
      data.id,
      undefined,
      { email: data.email, nombre: data.nombre, rol: data.rol }
    )

    return successResponse(data, 201)
  } catch (error: any) {
    console.error('Error en POST /api/admin/users:', error)
    return errorResponse(
      error.message || 'Error interno del servidor',
      500
    )
  }
}

/**
 * PATCH /api/admin/users - Actualizar usuario existente
 * 
 * Requiere permiso: users.update
 * Body: { id, nombre?, rol?, activo? }
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
    const { id, nombre, rol, activo } = body

    if (!id) {
      return errorResponse('ID de usuario requerido', 400)
    }

    // 3. Verificar que el usuario existe
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('3t_users')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingUser) {
      return errorResponse('Usuario no encontrado', 404)
    }

    // 4. Validaciones adicionales
    // No permitir desactivar la propia cuenta
    if (activo === false && id === currentUser.id) {
      return errorResponse(
        'No puedes desactivar tu propia cuenta',
        400
      )
    }

    // Validar rol si se proporciona
    if (rol !== undefined) {
      const rolesValidos = ['admin', 'operador', 'repartidor']
      if (!rolesValidos.includes(rol)) {
        return errorResponse(
          'Rol inválido',
          400,
          { validRoles: rolesValidos }
        )
      }
    }

    // 5. Preparar datos de actualización
    const updateData: any = {}
    if (nombre !== undefined) updateData.nombre = nombre.trim()
    if (rol !== undefined) {
      updateData.rol = rol
      updateData.role_id = rol
    }
    if (activo !== undefined) updateData.activo = activo

    // Si no hay cambios, retornar sin actualizar
    if (Object.keys(updateData).length === 0) {
      return successResponse(existingUser)
    }

    // 6. Actualizar usuario
    const { data, error } = await supabaseAdmin
      .from('3t_users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error actualizando usuario:', error)
      return errorResponse(`Error al actualizar usuario: ${error.message}`, 500)
    }

    // 7. Registrar en auditoría
    await logAudit(
      currentUser.id,
      'user.updated',
      'user',
      id,
      { nombre: existingUser.nombre, rol: existingUser.rol, activo: existingUser.activo },
      updateData
    )

    return successResponse(data)
  } catch (error: any) {
    console.error('Error en PATCH /api/admin/users:', error)
    return errorResponse(
      error.message || 'Error interno del servidor',
      500
    )
  }
}

/**
 * DELETE /api/admin/users?id=<uuid> - Eliminar usuario
 * 
 * Requiere permiso: users.delete
 * Query: id (UUID del usuario a eliminar)
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Autenticar y autorizar
    const authResult = await authenticateAndAuthorize(request, 'users.delete')
    
    if (!authResult.success) {
      return errorResponse(authResult.error, authResult.status)
    }

    const { user: currentUser } = authResult

    // 2. Obtener ID del query parameter
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('ID de usuario requerido', 400)
    }

    // 3. Verificar que el usuario existe
    const { data: userToDelete, error: fetchError } = await supabaseAdmin
      .from('3t_users')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !userToDelete) {
      return errorResponse('Usuario no encontrado', 404)
    }

    // 4. Validaciones adicionales
    // No permitir eliminar la propia cuenta
    if (id === currentUser.id) {
      return errorResponse(
        'No puedes eliminar tu propia cuenta',
        400
      )
    }

    // No permitir eliminar el último admin
    if (userToDelete.rol === 'admin') {
      const { count } = await supabaseAdmin
        .from('3t_users')
        .select('id', { count: 'exact', head: true })
        .eq('rol', 'admin')
        .eq('activo', true)

      if (count !== null && count <= 1) {
        return errorResponse(
          'No puedes eliminar el último administrador del sistema',
          400
        )
      }
    }

    // 5. Eliminar usuario
    const { error } = await supabaseAdmin
      .from('3t_users')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error eliminando usuario:', error)
      return errorResponse(`Error al eliminar usuario: ${error.message}`, 500)
    }

    // 6. Registrar en auditoría
    await logAudit(
      currentUser.id,
      'user.deleted',
      'user',
      id,
      { email: userToDelete.email, nombre: userToDelete.nombre, rol: userToDelete.rol },
      undefined
    )

    return successResponse({ success: true, id })
  } catch (error: any) {
    console.error('Error en DELETE /api/admin/users:', error)
    return errorResponse(
      error.message || 'Error interno del servidor',
      500
    )
  }
}

