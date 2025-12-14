'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, Droplets } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const { signIn, user, loading: authLoading } = useAuthStore()

  // Si ya está autenticado, redirigir a inicio
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Validación básica
  const validateForm = (): boolean => {
    setError('')
    
    if (!email.trim()) {
      setError('El email es requerido')
      return false
    }
    
    if (!email.includes('@')) {
      setError('Ingresa un email válido')
      return false
    }
    
    if (!password) {
      setError('La contraseña es requerida')
      return false
    }
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    
    return true
  }

  // Manejar submit del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      await signIn(email, password)
      // Redirigir a inicio después del login exitoso
      router.push('/')
    } catch (error: any) {
      console.error('Error en login:', error)
      
      // Mensajes de error más amigables
      if (error.message?.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos')
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Debes confirmar tu email antes de iniciar sesión')
      } else if (error.message?.includes('No se encontró el perfil')) {
        setError('Usuario no autorizado para acceder al sistema')
      } else {
        setError(error.message || 'Error al iniciar sesión. Intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Mostrar loader mientras verifica auth inicial
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative h-20 w-20">
              <Image
                src="/images/logos/logo-cuadrado-250x250.png"
                alt="Agua Tres Torres"
                width={80}
                height={80}
                className="rounded-lg object-contain"
                priority
              />
            </div>
          </div>
          
          <div>
            <CardTitle className="text-2xl font-bold">
              Agua Tres Torres
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Sistema de Gestión
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Campo Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
                {error}
              </div>
            )}

            {/* Botón Submit */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
          
          {/* Footer info */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>Sistema de gestión de pedidos y entregas</p>
            <p className="mt-1">v3.0 - 2025</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


