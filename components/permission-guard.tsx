'use client'

import { usePermissions } from '@/hooks/use-permissions'
import { useAuthStore } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

interface PermissionGuardProps {
  permission: string
  children: ReactNode
  fallback?: ReactNode
  redirectTo?: string
}

/**
 * Componente que protege contenido basado en permisos
 * Si el usuario no tiene el permiso, puede mostrar un fallback o redirigir
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
  redirectTo
}: PermissionGuardProps) {
  const { can, loading } = usePermissions()
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !can(permission) && redirectTo) {
      router.push(redirectTo)
    }
  }, [loading, can, permission, redirectTo, router])

  // Mostrar loading mientras se verifican permisos
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Si no está autenticado
  if (!user) {
    return fallback || (
      <div className="p-4 text-center text-muted-foreground">
        Debes iniciar sesión para acceder a este contenido
      </div>
    )
  }

  // Si tiene permiso, mostrar contenido
  if (can(permission)) {
    return <>{children}</>
  }

  // Si no tiene permiso, mostrar fallback
  return fallback || (
    <div className="p-4 text-center text-muted-foreground">
      No tienes permisos para acceder a este contenido
    </div>
  )
}

