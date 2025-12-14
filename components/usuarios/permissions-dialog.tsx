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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Shield, Check, X } from 'lucide-react'
import { Usuario, Permission } from '@/lib/supabase'
import {
  getAllPermissions,
  getUserPermissions,
  grantUserPermission,
  revokeUserPermission,
  removeUserPermission,
  type UserPermissions
} from '@/lib/permissions'
import { useAuthStore } from '@/lib/auth-store'

interface PermissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: Usuario | null
  onSuccess: () => void
}

export function PermissionsDialog({ open, onOpenChange, user, onSuccess }: PermissionsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allPermissions, setAllPermissions] = useState<Record<string, Permission[]>>({})
  const [userPerms, setUserPerms] = useState<UserPermissions>({
    rolePermissions: [],
    customPermissions: [],
    revokedPermissions: [],
    effectivePermissions: []
  })
  const [changes, setChanges] = useState<{
    grant: Set<string>
    revoke: Set<string>
    remove: Set<string>
  }>({
    grant: new Set(),
    revoke: new Set(),
    remove: new Set()
  })
  const { toast } = useToast()
  const { user: currentUser } = useAuthStore()

  useEffect(() => {
    if (open && user) {
      loadData()
    }
  }, [open, user])

  const loadData = async () => {
    if (!user) return

    setLoading(true)
    try {
      const [perms, userPermissions] = await Promise.all([
        getAllPermissions(),
        getUserPermissions(user.id)
      ])

      setAllPermissions(perms)
      setUserPerms(userPermissions)
    } catch (error) {
      console.error('Error cargando permisos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los permisos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const isRolePermission = userPerms.rolePermissions.includes(permissionId)
    const isCustomPermission = userPerms.customPermissions.includes(permissionId)
    const isRevoked = userPerms.revokedPermissions.includes(permissionId)

    const newChanges = { ...changes }

    if (isRolePermission) {
      // Es un permiso del rol
      if (checked) {
        // Quitar de revocados si estaba
        newChanges.revoke.delete(permissionId)
        newChanges.remove.add(permissionId)
      } else {
        // Agregar a revocados
        newChanges.revoke.add(permissionId)
        newChanges.remove.delete(permissionId)
      }
    } else {
      // No es permiso del rol
      if (checked) {
        // Otorgar permiso
        newChanges.grant.add(permissionId)
        newChanges.revoke.delete(permissionId)
        newChanges.remove.delete(permissionId)
      } else {
        // Si estaba otorgado, remover
        if (isCustomPermission) {
          newChanges.remove.add(permissionId)
          newChanges.grant.delete(permissionId)
        }
      }
    }

    setChanges(newChanges)
  }

  const isChecked = (permissionId: string): boolean => {
    if (changes.remove.has(permissionId)) {
      return false
    }
    if (changes.grant.has(permissionId)) {
      return true
    }
    if (changes.revoke.has(permissionId)) {
      return false
    }

    return userPerms.effectivePermissions.includes(permissionId)
  }

  const isFromRole = (permissionId: string): boolean => {
    return userPerms.rolePermissions.includes(permissionId)
  }

  const hasChanges = (permissionId: string): boolean => {
    return changes.grant.has(permissionId) || 
           changes.revoke.has(permissionId) || 
           changes.remove.has(permissionId)
  }

  const handleSave = async () => {
    if (!user || !currentUser) return

    setSaving(true)
    try {
      // Aplicar cambios
      for (const permId of changes.grant) {
        await grantUserPermission(user.id, permId, currentUser.id)
      }

      for (const permId of changes.revoke) {
        await revokeUserPermission(user.id, permId, currentUser.id)
      }

      for (const permId of changes.remove) {
        await removeUserPermission(user.id, permId)
      }

      toast({
        title: 'Permisos actualizados',
        description: `Los permisos de ${user.nombre} han sido actualizados`
      })

      setChanges({ grant: new Set(), revoke: new Set(), remove: new Set() })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error guardando permisos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los permisos',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const isAdmin = user.rol === 'admin' || user.role_id === 'admin'
  const totalChanges = changes.grant.size + changes.revoke.size + changes.remove.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestionar Permisos de {user.nombre}
          </DialogTitle>
          <DialogDescription>
            Rol actual: <Badge variant="outline">{user.rol}</Badge>
            {isAdmin && (
              <span className="text-yellow-600 dark:text-yellow-500 ml-2">
                (Este usuario tiene acceso completo como administrador)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div 
            className="flex-1 max-h-[70vh] overflow-y-auto pr-4"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db transparent'
            }}
          >
            <div className="space-y-6 pr-2">
              {Object.entries(allPermissions).map(([module, permissions]) => (
                <div key={module} className="space-y-3">
                  <h4 className="font-semibold text-sm capitalize flex items-center gap-2">
                    {module}
                    <Badge variant="secondary" className="text-xs">
                      {permissions.length} permisos
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
                          checked={isChecked(perm.permission_id)}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(perm.permission_id, checked as boolean)
                          }
                          disabled={isAdmin || saving}
                        />
                        <div className="flex-1 space-y-1 leading-none">
                          <Label
                            htmlFor={perm.permission_id}
                            className="text-sm font-normal cursor-pointer flex items-center gap-2"
                          >
                            {perm.description}
                            {isFromRole(perm.permission_id) && (
                              <Badge variant="outline" className="text-xs">
                                Desde rol
                              </Badge>
                            )}
                            {hasChanges(perm.permission_id) && (
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
          </div>
        )}

        <DialogFooter className="flex-shrink-0 flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {totalChanges > 0 && (
              <span className="text-primary font-medium">
                {totalChanges} {totalChanges === 1 ? 'cambio pendiente' : 'cambios pendientes'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || totalChanges === 0 || isAdmin}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

