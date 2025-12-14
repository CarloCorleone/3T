'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ChangePasswordForm } from '@/components/perfil/change-password-form'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { User, Mail, Calendar, Shield, Save, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function PerfilPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    setNombre(user.nombre || '')
    setEmail(user.email || '')
  }, [user, router])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const handleSaveProfile = async () => {
    if (!nombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es requerido',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      // Actualizar nombre en tabla 3t_users
      const { error: updateError } = await supabase
        .from('3t_users')
        .update({ nombre: nombre.trim() })
        .eq('id', user.id)

      if (updateError) throw updateError

      toast({
        title: 'Perfil actualizado',
        description: 'Tus datos han sido guardados exitosamente'
      })

      // Recargar datos del usuario
      const { data: updatedUser } = await supabase
        .from('3t_users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (updatedUser) {
        // Actualizar en el store (si tienes un método para eso)
        // useAuthStore.getState().setUser(updatedUser)
      }
    } catch (error: any) {
      console.error('Error actualizando perfil:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el perfil',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'admin':
        return 'bg-red-500 hover:bg-red-600'
      case 'operador':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'repartidor':
        return 'bg-green-500 hover:bg-green-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  const getRoleLabel = (rol: string) => {
    switch (rol) {
      case 'admin':
        return 'Administrador'
      case 'operador':
        return 'Operador'
      case 'repartidor':
        return 'Repartidor'
      default:
        return rol
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground mt-2">
          Administra tu información personal y configuración de cuenta
        </p>
      </div>

      <div className="grid gap-6">
        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Actualiza tu información de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={loading}
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                El email no puede ser modificado
              </p>
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Badge className={getRoleBadgeColor(user.rol)}>
                  {getRoleLabel(user.rol)}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Miembro desde</Label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(user.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </div>
            </div>

            <Separator />

            <Button onClick={handleSaveProfile} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardContent>
        </Card>

        {/* Seguridad */}
        <ChangePasswordForm />

        {/* Estadísticas de Sesión */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad de Cuenta</CardTitle>
            <CardDescription>
              Información sobre tu actividad en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.last_login_at && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Último inicio de sesión</span>
                <span className="text-sm font-medium">
                  {format(new Date(user.last_login_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                </span>
              </div>
            )}
            {user.login_count !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total de inicios de sesión</span>
                <span className="text-sm font-medium">{user.login_count}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Estado de cuenta</span>
              <Badge variant={user.activo ? 'default' : 'secondary'}>
                {user.activo ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

