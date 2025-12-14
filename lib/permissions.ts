import { supabase, type Usuario, type Permission, type UserPermission } from './supabase'

/**
 * Estructura de permisos de un usuario
 */
export type UserPermissions = {
  rolePermissions: string[]        // Permisos heredados del rol
  customPermissions: string[]      // Permisos personalizados otorgados
  revokedPermissions: string[]     // Permisos revocados
  effectivePermissions: string[]   // Permisos finales (rol + custom - revoked)
}

/**
 * Obtiene los permisos efectivos de un usuario desde la base de datos
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  try {
    // 1. Obtener usuario con su rol
    const { data: user, error: userError } = await supabase
      .from('3t_users')
      .select('role_id, rol')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('Error obteniendo usuario:', userError)
      return {
        rolePermissions: [],
        customPermissions: [],
        revokedPermissions: [],
        effectivePermissions: []
      }
    }

    const roleId = user.role_id || user.rol

    // 2. Si es admin, retornar acceso total (verificar con función SQL después)
    if (roleId === 'admin') {
      // Admin tiene todos los permisos
      const { data: allPerms } = await supabase
        .from('3t_permissions')
        .select('permission_id')

      return {
        rolePermissions: allPerms?.map(p => p.permission_id) || [],
        customPermissions: [],
        revokedPermissions: [],
        effectivePermissions: allPerms?.map(p => p.permission_id) || []
      }
    }

    // 3. Obtener permisos del rol
    const { data: rolePerms, error: rolePermsError } = await supabase
      .from('3t_role_permissions')
      .select('permission_id')
      .eq('role_id', roleId)

    const rolePermissions = rolePerms?.map(p => p.permission_id) || []

    // 4. Obtener permisos personalizados del usuario
    const { data: userPerms, error: userPermsError } = await supabase
      .from('3t_user_permissions')
      .select('permission_id, granted')
      .eq('user_id', userId)

    const customPermissions = userPerms
      ?.filter(p => p.granted)
      .map(p => p.permission_id) || []

    const revokedPermissions = userPerms
      ?.filter(p => !p.granted)
      .map(p => p.permission_id) || []

    // 5. Calcular permisos efectivos: (rol + custom) - revoked
    const effectiveSet = new Set([...rolePermissions, ...customPermissions])
    revokedPermissions.forEach(p => effectiveSet.delete(p))
    const effectivePermissions = Array.from(effectiveSet)

    return {
      rolePermissions,
      customPermissions,
      revokedPermissions,
      effectivePermissions
    }
  } catch (error) {
    console.error('Error obteniendo permisos:', error)
    return {
      rolePermissions: [],
      customPermissions: [],
      revokedPermissions: [],
      effectivePermissions: []
    }
  }
}

/**
 * Verifica si un usuario tiene un permiso específico usando la función SQL centralizada
 * Nota: Usa el cliente regular de Supabase. La función RPC se ejecuta en el servidor
 * de Supabase con los permisos del usuario autenticado.
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('3t_has_permission', {
      p_user: userId,
      p_perm: permission
    })

    if (error) {
      console.error('Error verificando permiso:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Error en hasPermission:', error)
    return false
  }
}

/**
 * Obtiene todos los permisos disponibles del sistema agrupados por módulo
 */
export async function getAllPermissions(): Promise<Record<string, Permission[]>> {
  try {
    const { data, error } = await supabase
      .from('3t_permissions')
      .select('*')
      .order('module, action')

    if (error) {
      console.error('Error obteniendo permisos:', error)
      return {}
    }

    // Agrupar por módulo
    const grouped: Record<string, Permission[]> = {}
    data?.forEach(perm => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = []
      }
      grouped[perm.module].push(perm)
    })

    return grouped
  } catch (error) {
    console.error('Error en getAllPermissions:', error)
    return {}
  }
}

/**
 * Otorga un permiso personalizado a un usuario
 */
export async function grantUserPermission(
  userId: string,
  permissionId: string,
  createdBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('3t_user_permissions')
      .upsert({
        user_id: userId,
        permission_id: permissionId,
        granted: true,
        created_by: createdBy
      }, {
        onConflict: 'user_id,permission_id'
      })

    if (error) {
      console.error('Error otorgando permiso:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error en grantUserPermission:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Revoca un permiso de un usuario
 */
export async function revokeUserPermission(
  userId: string,
  permissionId: string,
  createdBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('3t_user_permissions')
      .upsert({
        user_id: userId,
        permission_id: permissionId,
        granted: false,
        created_by: createdBy
      }, {
        onConflict: 'user_id,permission_id'
      })

    if (error) {
      console.error('Error revocando permiso:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error en revokeUserPermission:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Elimina un permiso personalizado de un usuario (lo devuelve al estado del rol)
 */
export async function removeUserPermission(
  userId: string,
  permissionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('3t_user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission_id', permissionId)

    if (error) {
      console.error('Error eliminando permiso personalizado:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error en removeUserPermission:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Registra una acción en el log de auditoría
 * Usa el cliente normal de Supabase (con RLS) ya que hay una política que permite
 * a usuarios autenticados insertar sus propios logs
 */
export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue?: Record<string, any>,
  newValue?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase.from('3t_audit_log').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue
    })
    
    if (error) {
      console.error('❌ Error guardando auditoría:', error)
    }
  } catch (error) {
    console.error('❌ Error en logAudit:', error)
  }
}

/**
 * Obtiene el historial de auditoría de un usuario
 */
export async function getUserAuditLog(userId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('3t_audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error obteniendo audit log:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error en getUserAuditLog:', error)
    return []
  }
}

/**
 * Obtiene el Activity Log de un usuario (todas las acciones que realizó)
 * @param userId - ID del usuario que realizó las acciones
 * @param limit - Número máximo de registros a retornar
 * @param offset - Offset para paginación
 * @param startDate - Fecha de inicio (filtro opcional)
 * @param endDate - Fecha de fin (filtro opcional)
 */
export async function getActivityLog(
  userId: string,
  limit = 50,
  offset = 0,
  startDate?: Date,
  endDate?: Date
): Promise<{ data: any[]; count: number; error: any }> {
  try {
    let query = supabase
      .from('3t_audit_log')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrar por rango de fechas si se proporcionan
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error obteniendo activity log:', error)
      return { data: [], count: 0, error }
    }

    return { data: data || [], count: count || 0, error: null }
  } catch (error) {
    console.error('Error en getActivityLog:', error)
    return { data: [], count: 0, error }
  }
}

