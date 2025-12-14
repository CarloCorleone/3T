'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { logAudit } from '@/lib/permissions'
import { useAuthStore } from '@/lib/auth-store'

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<'admin' | 'operador' | 'repartidor'>('operador')
  const [activo, setActivo] = useState(true)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user: currentUser } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim() || !email.trim() || !password.trim()) {
      toast({
        title: 'Error',
        description: 'Todos los campos son requeridos',
        variant: 'destructive'
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      // Importar el cliente autenticado dinámicamente
      const { authenticatedPost } = await import('@/lib/api-client')
      
      // Llamar al API route con autenticación
      const result = await authenticatedPost('/api/admin/users', {
        email: email.trim().toLowerCase(),
        nombre: nombre.trim(),
        password: password,
        rol,
        activo
      })

      if (result.error) {
        throw new Error(result.error)
      }

      const newUser = result.data

      // Registrar en auditoría
      if (currentUser && newUser) {
        await logAudit(
          currentUser.id,
          'user.created',
          'user',
          newUser.id,
          undefined,
          { nombre, email, rol, activo }
        )
      }

      toast({
        title: 'Usuario creado',
        description: `El usuario ${nombre} ha sido creado exitosamente.`
      })

      // Limpiar formulario
      setNombre('')
      setEmail('')
      setPassword('')
      setRol('operador')
      setActivo(true)

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error creando usuario:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el usuario',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Completa los datos del nuevo usuario del sistema
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre Completo</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Pérez"
                disabled={loading}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@ejemplo.com"
                disabled={loading}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña Temporal</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                El usuario deberá cambiar esta contraseña al iniciar sesión
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rol">Rol</Label>
              <Select value={rol} onValueChange={(value: any) => setRol(value)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="repartidor">Repartidor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="activo">Estado del Usuario</Label>
                <p className="text-xs text-muted-foreground">
                  {activo ? 'Usuario activo' : 'Usuario inactivo'}
                </p>
              </div>
              <Switch
                id="activo"
                checked={activo}
                onCheckedChange={setActivo}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

