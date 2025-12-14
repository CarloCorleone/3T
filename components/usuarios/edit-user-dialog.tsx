'use client'

import { useState, useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { supabase, type Usuario, type Permission } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User, Shield, Key } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import {
  getAllPermissions,
  getUserPermissions,
  grantUserPermission,
  revokeUserPermission,
  removeUserPermission,
  logAudit,
  type UserPermissions
} from '@/lib/permissions'

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: Usuario | null
  onSuccess: () => void
}

export function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'permisos'>('general')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { user: currentUser } = useAuthStore()

  // Estado para pestaña General
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<'admin' | 'operador' | 'repartidor'>('operador')
  const [activo, setActivo] = useState(true)
  const [resetPassword, setResetPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  // Estado para pestaña Permisos
  const [allPermissions, setAllPermissions] = useState<Record<string, Permission[]>>({})
  const [userPerms, setUserPerms] = useState<UserPermissions>({
    rolePermissions: [],
    customPermissions: [],
    revokedPermissions: [],
    effectivePermissions: []
  })
  const [permissionChanges, setPermissionChanges] = useState<{
    grant: Set<string>
    revoke: Set<string>
    remove: Set<string>
  }>({
    grant: new Set(),
    revoke: new Set(),
    remove: new Set()
  })

  // Cargar datos cuando se abre el diálogo
  useEffect(() => {
    if (open && user) {
      loadUserData()
    } else if (!open) {
      // Resetear estado al cerrar
      resetForm()
    }
  }, [open, user])

  const loadUserData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Cargar datos generales
      setNombre(user.nombre || '')
      setRol(user.rol as 'admin' | 'operador' | 'repartidor')
      setActivo(user.activo ?? true)
      setResetPassword(false)
      setNewPassword('')

      // Cargar permisos
      const [perms, userPermissions] = await Promise.all([
        getAllPermissions(),
        getUserPermissions(user.id)
      ])

      setAllPermissions(perms)
      setUserPerms(userPermissions)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del usuario',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setNombre('')
    setRol('operador')
    setActivo(true)
    setResetPassword(false)
    setNewPassword('')
    setPermissionChanges({ grant: new Set(), revoke: new Set(), remove: new Set() })
    setActiveTab('general')
  }

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const isRolePermission = userPerms.rolePermissions.includes(permissionId)
    const isCustomPermission = userPerms.customPermissions.includes(permissionId)
    const isInEffectivePerms = userPerms.effectivePermissions.includes(permissionId)

    const newChanges = { ...permissionChanges }

    if (checked) {
      // MARCAR: Otorgar permiso
      newChanges.grant.add(permissionId)
      newChanges.revoke.delete(permissionId)
      newChanges.remove.delete(permissionId)
    } else {
      // DESMARCAR: Quitar permiso
      if (newChanges.grant.has(permissionId)) {
        // Era un grant pendiente → simplemente quitarlo
        newChanges.grant.delete(permissionId)
      } else if (isRolePermission) {
        // Es del rol → revocar
        newChanges.revoke.add(permissionId)
        newChanges.remove.delete(permissionId)
      } else if (isCustomPermission || isInEffectivePerms) {
        // Es custom o efectivo → remover
        newChanges.remove.add(permissionId)
        newChanges.revoke.delete(permissionId)
      }
    }

    setPermissionChanges(newChanges)
  }

  const isPermissionChecked = (permissionId: string): boolean => {
    if (permissionChanges.remove.has(permissionId)) {
      return false
    }
    if (permissionChanges.grant.has(permissionId)) {
      return true
    }
    if (permissionChanges.revoke.has(permissionId)) {
      return false
    }

    return userPerms.effectivePermissions.includes(permissionId)
  }

  const isFromRole = (permissionId: string): boolean => {
    return userPerms.rolePermissions.includes(permissionId)
  }

  const hasPermissionChanges = (permissionId: string): boolean => {
    return permissionChanges.grant.has(permissionId) || 
           permissionChanges.revoke.has(permissionId) || 
           permissionChanges.remove.has(permissionId)
  }

  const validateForm = (): string | null => {
    if (!nombre.trim()) {
      return 'El nombre es requerido'
    }

    if (resetPassword && newPassword.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres'
    }

    // Validar que no se edite el propio rol a uno inferior
    if (currentUser && user && currentUser.id === user.id && currentUser.rol === 'admin' && rol !== 'admin') {
      return 'No puedes cambiar tu propio rol de administrador'
    }

    // Validar que no se desactive la propia cuenta
    if (currentUser && user && currentUser.id === user.id && !activo) {
      return 'No puedes desactivar tu propia cuenta'
    }

    return null
  }

  const handleSave = async () => {
    if (!user || !currentUser) return

    const validationError = validateForm()
    if (validationError) {
      toast({
        title: 'Error de validación',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      // Guardar valores anteriores para auditoría
      const oldValues = {
        nombre: user.nombre,
        rol: user.rol,
        activo: user.activo
      }

      // 1. Actualizar información general usando API route con autenticación
      const { authenticatedPatch } = await import('@/lib/api-client')
      
      const updateResult = await authenticatedPatch('/api/admin/users', {
        id: user.id,
        nombre: nombre.trim(),
        rol: rol,
        activo: activo
      })

      if (updateResult.error) {
        throw new Error(updateResult.error)
      }

      // 2. Resetear contraseña si está marcado
      if (resetPassword && newPassword) {
        const { authenticatedPatch } = await import('@/lib/api-client')
        
        const result = await authenticatedPatch('/api/admin/users/password', {
          userId: user.id,
          newPassword: newPassword
        })
        
        if (result.error) {
          toast({
            title: 'Advertencia',
            description: `Usuario actualizado pero no se pudo resetear la contraseña: ${result.error}`,
            variant: 'destructive'
          })
          // No lanzar error para permitir que se guarden otros cambios
        }
      }

      // 3. Guardar cambios de permisos
      const totalPermChanges = permissionChanges.grant.size + permissionChanges.revoke.size + permissionChanges.remove.size
      
      if (totalPermChanges > 0) {
        const { authenticatedPost, authenticatedDelete } = await import('@/lib/api-client')
        
        // Grant permissions
        for (const permId of permissionChanges.grant) {
          const result = await authenticatedPost('/api/admin/users/permissions', {
            userId: user.id,
            permissionId: permId,
            type: 'grant'
          })
          if (result.error) {
            throw new Error(`Error otorgando permiso: ${result.error}`)
          }
        }

        // Revoke permissions
        for (const permId of permissionChanges.revoke) {
          const result = await authenticatedPost('/api/admin/users/permissions', {
            userId: user.id,
            permissionId: permId,
            type: 'revoke'
          })
          if (result.error) {
            throw new Error(`Error revocando permiso: ${result.error}`)
          }
        }

        // Remove custom permissions
        for (const permId of permissionChanges.remove) {
          const result = await authenticatedDelete(
            `/api/admin/users/permissions?userId=${user.id}&permissionId=${permId}`
          )
          if (result.error) {
            throw new Error(`Error eliminando permiso: ${result.error}`)
          }
        }
      }

      // 4. Registrar en auditoría
      const newValues = {
        nombre: nombre.trim(),
        rol: rol,
        activo: activo,
        ...(resetPassword && { password_reset: true }),
        ...(totalPermChanges > 0 && { permissions_modified: totalPermChanges })
      }

      await logAudit(
        currentUser.id,
        'user.updated',
        'user',
        user.id,
        oldValues,
        newValues
      )

      toast({
        title: 'Usuario actualizado',
        description: `${nombre} ha sido actualizado exitosamente`
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error actualizando usuario:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el usuario',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const isAdmin = user.rol === 'admin' || user.role_id === 'admin'
  const totalChanges = permissionChanges.grant.size + permissionChanges.revoke.size + permissionChanges.remove.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Editar Usuario
          </DialogTitle>
          <DialogDescription>
            Modificar información y permisos de <strong>{user.nombre}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'general' | 'permisos')} className="flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="permisos" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Permisos
                  {totalChanges > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {totalChanges}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* PESTAÑA GENERAL */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  {/* Nombre */}
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre Completo</Label>
                    <Input
                      id="nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Juan Pérez"
                      disabled={saving}
                    />
                  </div>

                  {/* Email (solo lectura) */}
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      El email no se puede modificar
                    </p>
                  </div>

                  {/* Rol */}
                  <div className="grid gap-2">
                    <Label htmlFor="rol">Rol</Label>
                    <Select 
                      value={rol} 
                      onValueChange={(value: any) => setRol(value)} 
                      disabled={saving}
                    >
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

                  {/* Estado activo */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="activo">Estado del Usuario</Label>
                      <p className="text-xs text-muted-foreground">
                        {activo ? 'Usuario activo en el sistema' : 'Usuario desactivado'}
                      </p>
                    </div>
                    <Switch
                      id="activo"
                      checked={activo}
                      onCheckedChange={setActivo}
                      disabled={saving}
                    />
                  </div>

                  <Separator className="my-2" />

                  {/* Sección de contraseña */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-semibold">Contraseña</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="resetPassword"
                        checked={resetPassword}
                        onCheckedChange={(checked) => {
                          setResetPassword(checked as boolean)
                          if (!checked) setNewPassword('')
                        }}
                        disabled={saving}
                      />
                      <Label
                        htmlFor="resetPassword"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Resetear contraseña
                      </Label>
                    </div>

                    {resetPassword && (
                      <div className="grid gap-2 pl-6">
                        <Label htmlFor="newPassword">Nueva Contraseña</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          disabled={saving}
                          minLength={6}
                        />
                        <p className="text-xs text-muted-foreground">
                          El usuario deberá cambiar esta contraseña al iniciar sesión
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* PESTAÑA PERMISOS */}
              <TabsContent value="permisos" className="mt-4">
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">
                        Rol actual: <Badge variant="outline">{user.rol}</Badge>
                      </p>
                      {isAdmin && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Este usuario tiene acceso completo como administrador
                        </p>
                      )}
                    </div>
                    {totalChanges > 0 && (
                      <Badge variant="secondary">
                        {totalChanges} {totalChanges === 1 ? 'cambio' : 'cambios'}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator className="mb-4" />

                <div 
                  className="max-h-[50vh] overflow-y-auto pr-4 space-y-6"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'hsl(var(--border)) transparent'
                  }}
                >
                  {Object.entries(allPermissions).map(([module, permissions]) => (
                    <div key={module} className="space-y-3">
                      <h4 className="font-semibold text-sm capitalize flex items-center gap-2">
                        {module}
                        <Badge variant="secondary" className="text-xs">
                          {permissions.length}
                        </Badge>
                      </h4>
                      <div className="grid gap-3 pl-4">
                        {permissions.map((perm) => (
                          <div
                            key={perm.permission_id}
                            className="flex items-start space-x-3 space-y-0"
                          >
                            <Checkbox
                              id={perm.permission_id}
                              checked={isPermissionChecked(perm.permission_id)}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(perm.permission_id, checked as boolean)
                              }
                              disabled={isAdmin || saving}
                            />
                            <div className="flex-1 space-y-1 leading-none">
                              <Label
                                htmlFor={perm.permission_id}
                                className="text-sm font-normal cursor-pointer flex items-center gap-2 flex-wrap"
                              >
                                {perm.description}
                                {isFromRole(perm.permission_id) && (
                                  <Badge variant="outline" className="text-xs">
                                    Desde rol
                                  </Badge>
                                )}
                                {hasPermissionChanges(perm.permission_id) && (
                                  <Badge variant="secondary" className="text-xs">
                                    Modificado
                                  </Badge>
                                )}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {perm.permission_id}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Separator />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

