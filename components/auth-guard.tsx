'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * AuthGuard - Componente que protege rutas requiriendo autenticación
 * 
 * - Verifica autenticación al montar
 * - Redirige a /login si no está autenticado
 * - Permite acceso libre a /login
 * - Muestra loader mientras verifica auth
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, checkAuth } = useAuthStore()

  // Verificar autenticación al cargar el componente
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Manejar redirección basada en estado de auth
  useEffect(() => {
    // Esperar a que termine de cargar
    if (loading) return

    // Permitir acceso a login sin autenticación
    if (pathname === '/login') {
      // Si ya está autenticado en /login, redirigir a inicio
      if (user) {
        router.push('/')
      }
      return
    }

    // Si no está autenticado y no está en login, redirigir a login
    if (!user) {
      router.push('/login')
      return
    }
  }, [loading, user, pathname, router])

  // Mostrar loader mientras verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario y no está en login, no renderizar nada (se redirige)
  if (!user && pathname !== '/login') {
    return null
  }

  // Renderizar contenido protegido
  return <>{children}</>
}


