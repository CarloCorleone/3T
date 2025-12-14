'use client'

import { useState } from 'react'
import { Usuario } from '@/lib/supabase'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Edit, MoreVertical, Trash2, History } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface UsersTableProps {
  users: Usuario[]
  onEdit: (user: Usuario) => void
  onDelete: (user: Usuario) => void
  onToggleStatus: (user: Usuario) => void
  onViewHistory: (user: Usuario) => void
}

export function UsersTable({
  users,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewHistory
}: UsersTableProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'admin':
        return 'bg-red-500 hover:bg-red-600 text-white'
      case 'operador':
        return 'bg-blue-500 hover:bg-blue-600 text-white'
      case 'repartidor':
        return 'bg-green-500 hover:bg-green-600 text-white'
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white'
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

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No se encontraron usuarios
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Último acceso</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(user.nombre || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.nombre}</p>
                    {user.login_count !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {user.login_count} {user.login_count === 1 ? 'inicio' : 'inicios'} de sesión
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge className={getRoleBadgeColor(user.rol)}>
                  {getRoleLabel(user.rol)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={user.activo}
                    onCheckedChange={() => onToggleStatus(user)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {user.last_login_at ? (
                  <span className="text-sm">
                    {format(new Date(user.last_login_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Nunca</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewHistory(user)}>
                      <History className="mr-2 h-4 w-4" />
                      Ver Historial
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(user)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

