'use client'

import { useAuthStore } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, Settings, LogOut, Users } from 'lucide-react'

export function UserMenu() {
  const { user, signOut } = useAuthStore()
  const router = useRouter()

  if (!user) return null

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

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
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'operador':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'repartidor':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
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

  const getRoleAvatar = (rol: string): string => {
    const avatarMap: Record<string, string> = {
      admin: '/images/avatares/admin.png',
      operador: '/images/avatares/operacion.png',
      repartidor: '/images/avatares/repartidor.png',
    }
    return avatarMap[rol] || ''
  }

  const isAdmin = user.rol === 'admin' || user.role_id === 'admin'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
          <Avatar className="h-9 w-9 border-2 border-primary/10">
            <AvatarImage 
              src={getRoleAvatar(user.rol || user.role_id || '')} 
              alt={`Avatar ${user.rol || user.role_id}`}
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(user.nombre || user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium leading-none">{user.nombre || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {getRoleLabel(user.rol || user.role_id || '')}
            </p>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.nombre || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <Badge 
              variant="outline" 
              className={`mt-2 w-fit ${getRoleBadgeColor(user.rol || user.role_id || '')}`}
            >
              {getRoleLabel(user.rol || user.role_id || '')}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/perfil')}>
          <User className="mr-2 h-4 w-4" />
          <span>Mi Perfil</span>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuItem onClick={() => router.push('/usuarios')}>
              <Users className="mr-2 h-4 w-4" />
              <span>Gestionar Usuarios</span>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

