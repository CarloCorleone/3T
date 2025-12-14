'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { type UserRole } from '@/lib/route-permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallbackUrl?: string
  showMessage?: boolean
}

/**
 * RoleGuard - Componente que protege contenido por rol de usuario
 * 
 * @param allowedRoles - Roles permitidos para ver el contenido
 * @param fallbackUrl - URL a redirigir si no tiene permiso (default: '/')
 * @param showMessage - Mostrar mensaje de acceso denegado en lugar de redirigir
 */
export function RoleGuard({ 
  children, 
  allowedRoles,
  fallbackUrl = '/',
  showMessage = false
}: RoleGuardProps) {
  const { user } = useAuthStore()
  const router = useRouter()

  const hasAccess = user && allowedRoles.includes(user.rol)

  useEffect(() => {
    // Solo redirigir si no tiene acceso y no se debe mostrar mensaje
    if (user && !hasAccess && !showMessage) {
      console.warn(`❌ Acceso denegado: rol ${user.rol} no permitido`)
      router.push(fallbackUrl)
    }
  }, [user, hasAccess, showMessage, fallbackUrl, router])

  // Si no tiene acceso
  if (!hasAccess) {
    // Mostrar mensaje de acceso denegado si está configurado
    if (showMessage) {
      return (
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Acceso Denegado</CardTitle>
              <CardDescription>
                No tienes permisos para acceder a esta sección
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground text-center space-y-2">
                <p>
                  Tu rol actual: <strong>{user?.rol || 'desconocido'}</strong>
                </p>
                <p>
                  Roles permitidos: <strong>{allowedRoles.join(', ')}</strong>
                </p>
              </div>
              <Button 
                onClick={() => router.push(fallbackUrl)} 
                className="w-full"
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    // Si no se debe mostrar mensaje, no renderizar nada (se redirige)
    return null
  }

  // Renderizar contenido si tiene acceso
  return <>{children}</>
}


