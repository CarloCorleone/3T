'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'
import { Usuario } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { PermissionGuard } from '@/components/permission-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UsersTable } from '@/components/usuarios/users-table'
import { CreateUserDialog } from '@/components/usuarios/create-user-dialog'
import { EditUserDialog } from '@/components/usuarios/edit-user-dialog'
import { ActivityLogDialog } from '@/components/activity-log-dialog'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Search, Filter, Loader2, AlertCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { logAudit } from '@/lib/permissions'

export default function UsuariosPage() {
  const { user: currentUser } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<Usuario[]>([])
  const [filteredUsers, setFilteredUsers] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<Usuario | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null)
  const [activityLogDialogOpen, setActivityLogDialogOpen] = useState(false)
  const [userForActivityLog, setUserForActivityLog] = useState<Usuario | null>(null)

  useEffect(() => {
    if (!currentUser) {
      router.push('/login')
      return
    }

    // Solo admins pueden acceder
    if (currentUser.rol !== 'admin' && currentUser.role_id !== 'admin') {
      router.push('/')
      return
    }

    loadUsers()
  }, [currentUser, router])

  useEffect(() => {
    applyFilters()
  }, [users, searchQuery, roleFilter, statusFilter])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('3t_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(data || [])
    } catch (error: any) {
      console.error('Error cargando usuarios:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...users]

    // Filtro de búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.nombre?.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      )
    }

    // Filtro de rol
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.rol === roleFilter || u.role_id === roleFilter)
    }

    // Filtro de estado
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active'
      filtered = filtered.filter((u) => u.activo === isActive)
    }

    setFilteredUsers(filtered)
  }

  const handleToggleStatus = async (user: Usuario) => {
    try {
      const newStatus = !user.activo
      
      // Importar el cliente autenticado dinámicamente
      const { authenticatedPatch } = await import('@/lib/api-client')
      
      // Llamar al API route con autenticación
      const result = await authenticatedPatch('/api/admin/users', {
        id: user.id,
        activo: newStatus
      })

      if (result.error) {
        throw new Error(result.error)
      }

      // Registrar en auditoría
      if (currentUser) {
        await logAudit(
          currentUser.id,
          newStatus ? 'user.activated' : 'user.deactivated',
          'user',
          user.id,
          { activo: user.activo },
          { activo: newStatus }
        )
      }

      toast({
        title: newStatus ? 'Usuario activado' : 'Usuario desactivado',
        description: `${user.nombre} ha sido ${newStatus ? 'activado' : 'desactivado'}`
      })

      loadUsers()
    } catch (error: any) {
      console.error('Error actualizando estado:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el estado del usuario',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async () => {
    if (!userToDelete || !currentUser) return

    try {
      // No permitir eliminar el propio usuario
      if (userToDelete.id === currentUser.id) {
        toast({
          title: 'Error',
          description: 'No puedes eliminar tu propia cuenta',
          variant: 'destructive'
        })
        return
      }

      // Importar el cliente autenticado dinámicamente
      const { authenticatedDelete } = await import('@/lib/api-client')
      
      // Llamar al API route con autenticación
      const result = await authenticatedDelete(`/api/admin/users?id=${userToDelete.id}`)

      if (result.error) {
        throw new Error(result.error)
      }

      // Registrar en auditoría
      await logAudit(
        currentUser.id,
        'user.deleted',
        'user',
        userToDelete.id,
        { nombre: userToDelete.nombre, email: userToDelete.email },
        undefined
      )

      toast({
        title: 'Usuario eliminado',
        description: `${userToDelete.nombre} ha sido eliminado del sistema`
      })

      loadUsers()
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (error: any) {
      console.error('Error eliminando usuario:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el usuario',
        variant: 'destructive'
      })
    }
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <PermissionGuard permission="usuarios.ver" redirectTo="/">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-2">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Usuarios del Sistema</CardTitle>
                <CardDescription>
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'} 
                  {searchQuery || roleFilter !== 'all' || statusFilter !== 'all' ? ' (filtrado)' : ''}
                </CardDescription>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="repartidor">Repartidor</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabla */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <UsersTable
                users={filteredUsers}
                onEdit={(user) => {
                  setUserToEdit(user)
                  setEditDialogOpen(true)
                }}
                onDelete={(user) => {
                  setUserToDelete(user)
                  setDeleteDialogOpen(true)
                }}
                onToggleStatus={handleToggleStatus}
                onViewHistory={(user) => {
                  setUserForActivityLog(user)
                  setActivityLogDialogOpen(true)
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Modales */}
        <CreateUserDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={loadUsers}
        />

        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={userToEdit}
          onSuccess={loadUsers}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                ¿Eliminar usuario?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El usuario <strong>{userToDelete?.nombre}</strong> y 
                todos sus datos asociados serán eliminados permanentemente del sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Eliminar Usuario
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de Historial de Actividad */}
        {userForActivityLog && (
          <ActivityLogDialog
            user={userForActivityLog}
            open={activityLogDialogOpen}
            onOpenChange={setActivityLogDialogOpen}
          />
        )}
      </div>
    </PermissionGuard>
  )
}

