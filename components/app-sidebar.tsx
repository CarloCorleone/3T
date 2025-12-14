"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  Users,
  Package,
  ClipboardList,
  Map,
  Home,
  FileText,
  Route,
  Truck,
  ShoppingCart,
  LogOut,
  User,
  Shield,
  UsersRound,
  Brain
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/lib/auth-store"
import { hasRouteAccess, type UserRole } from "@/lib/route-permissions"
import { Badge } from "@/components/ui/badge"

const menuItems = [
  {
    title: "Inicio",
    icon: Home,
    href: "/",
    roles: ['admin', 'operador', 'repartidor'] as UserRole[],
  },
  {
    title: "Dashboard",
    icon: BarChart3,
    href: "/dashboard",
    roles: ['admin'] as UserRole[],
  },
  {
    title: "Clientes",
    icon: Users,
    href: "/clientes",
    roles: ['admin', 'operador', 'repartidor'] as UserRole[],
  },
  {
    title: "Productos",
    icon: Package,
    href: "/productos",
    roles: ['admin', 'operador', 'repartidor'] as UserRole[],
  },
  {
    title: "Proveedores",
    icon: Truck,
    href: "/proveedores",
    roles: ['admin', 'operador'] as UserRole[],
  },
  {
    title: "Compras",
    icon: ShoppingCart,
    href: "/compras",
    roles: ['admin', 'operador'] as UserRole[],
  },
  {
    title: "Pedidos",
    icon: ClipboardList,
    href: "/pedidos",
    roles: ['admin', 'operador', 'repartidor'] as UserRole[],
  },
  {
    title: "Rutas",
    icon: Route,
    href: "/rutas",
    roles: ['admin', 'operador', 'repartidor'] as UserRole[],
  },
  {
    title: "Mapa",
    icon: Map,
    href: "/mapa",
    roles: ['admin', 'operador', 'repartidor'] as UserRole[],
  },
]

const documentItems = [
  {
    title: "Presupuestos",
    icon: FileText,
    href: "/presupuestos",
    roles: ['admin'] as UserRole[],
  },
  {
    title: "Facturas",
    icon: FileText,
    href: "/facturas",
    roles: ['admin', 'operador'] as UserRole[],
  },
  {
    title: "Reportes",
    icon: FileText,
    href: "/reportes",
    roles: ['admin'] as UserRole[],
  },
]

const mlItems = [
  {
    title: "ML Insights",
    icon: Brain,
    href: "/ml-insights",
    roles: ['admin'] as UserRole[],
    badge: "AI",
  },
]

const adminItems = [
  {
    title: "Usuarios",
    icon: UsersRound,
    href: "/usuarios",
    roles: ['admin'] as UserRole[],
  },
]

// Función helper para obtener el color del badge según rol
function getRoleBadgeVariant(rol: UserRole): "default" | "secondary" | "destructive" {
  switch (rol) {
    case 'admin':
      return 'destructive'
    case 'operador':
      return 'default'
    case 'repartidor':
      return 'secondary'
  }
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuthStore()

  // Filtrar items del menú según rol del usuario
  const visibleMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.rol)
  )

  const visibleDocumentItems = documentItems.filter(item =>
    user && item.roles.includes(user.rol)
  )

  const visibleAdminItems = adminItems.filter(item =>
    user && item.roles.includes(user.rol)
  )

  const visibleMLItems = mlItems.filter(item =>
    user && item.roles.includes(user.rol)
  )

  // Manejar logout
  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  return (
    <Sidebar collapsible="icon">
      {/* Header con información del usuario */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex items-center gap-3 w-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user?.nombre || 'Usuario'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant={user ? getRoleBadgeVariant(user.rol) : 'secondary'}
                      className="text-xs py-0 px-1.5 h-4"
                    >
                      {user?.rol || 'desconocido'}
                    </Badge>
                  </div>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Navegación Principal */}
        {visibleMenuItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMenuItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Documentos */}
        {visibleDocumentItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Documentos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleDocumentItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Machine Learning */}
        {visibleMLItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Machine Learning</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMLItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administración */}
        {visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer con botón de logout */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Cerrar Sesión">
              <LogOut />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>

  )
}

