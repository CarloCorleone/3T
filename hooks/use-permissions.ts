'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { getUserPermissions, type UserPermissions } from '@/lib/permissions'

/**
 * Hook para verificar permisos en componentes React
 * USO EXCLUSIVO EN COMPONENTES CLIENTE
 */
export function usePermissions() {
  const { user } = useAuthStore()
  const [permissions, setPermissions] = useState<UserPermissions>({
    rolePermissions: [],
    customPermissions: [],
    revokedPermissions: [],
    effectivePermissions: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    loadPermissions()
  }, [user])

  const loadPermissions = async () => {
    if (!user) return

    setLoading(true)
    const perms = await getUserPermissions(user.id)
    setPermissions(perms)
    setLoading(false)
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const can = (permission: string): boolean => {
    if (!user) return false
    
    return permissions.effectivePermissions.includes(permission)
  }

  /**
   * Verifica si el usuario tiene ALGUNO de los permisos
   */
  const canAny = (...permissionList: string[]): boolean => {
    if (!user) return false
    
    return permissionList.some(p => permissions.effectivePermissions.includes(p))
  }

  /**
   * Verifica si el usuario tiene TODOS los permisos
   */
  const canAll = (...permissionList: string[]): boolean => {
    if (!user) return false
    
    return permissionList.every(p => permissions.effectivePermissions.includes(p))
  }

  return {
    permissions,
    loading,
    can,
    canAny,
    canAll,
    reload: loadPermissions
  }
}

