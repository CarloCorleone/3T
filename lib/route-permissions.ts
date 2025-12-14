// Configuración de permisos por ruta
// Define qué roles pueden acceder a cada ruta del sistema

export const ROUTE_PERMISSIONS = {
  // Rutas accesibles para todos los roles autenticados
  '/': { 
    roles: ['admin', 'operador', 'repartidor'],
    description: 'Dashboard operacional - Información del día'
  },
  '/clientes': { 
    roles: ['admin', 'operador', 'repartidor'],
    description: 'Gestión de clientes'
  },
  '/productos': { 
    roles: ['admin', 'operador', 'repartidor'],
    description: 'Catálogo de productos'
  },
  '/pedidos': { 
    roles: ['admin', 'operador', 'repartidor'],
    description: 'Gestión de pedidos'
  },
  '/rutas': { 
    roles: ['admin', 'operador', 'repartidor'],
    description: 'Optimizador de rutas'
  },
  '/mapa': { 
    roles: ['admin', 'operador', 'repartidor'],
    description: 'Mapa de entregas'
  },
  
  // Rutas solo para admin y operador
  '/proveedores': { 
    roles: ['admin', 'operador'],
    description: 'Gestión de proveedores'
  },
  '/compras': { 
    roles: ['admin', 'operador'],
    description: 'Órdenes de compra'
  },
  
  // Rutas solo para admin
  '/presupuestos': { 
    roles: ['admin'],
    description: 'Generación de presupuestos PDF'
  },
  '/reportes': { 
    roles: ['admin'],
    description: 'Reportes ejecutivos'
  },
  '/dashboard': { 
    roles: ['admin'],
    description: 'Dashboard ejecutivo con análisis'
  },
} as const

export type RoutePermissions = typeof ROUTE_PERMISSIONS
export type AppRoute = keyof RoutePermissions
export type UserRole = 'admin' | 'operador' | 'repartidor'

// Función helper para verificar si un usuario tiene acceso a una ruta
export function hasRouteAccess(route: string, userRole: UserRole): boolean {
  const routeConfig = ROUTE_PERMISSIONS[route as AppRoute]
  
  if (!routeConfig) {
    // Si la ruta no está en la configuración, permitir acceso por defecto
    return true
  }
  
  return (routeConfig.roles as readonly UserRole[]).includes(userRole)
}

// Función helper para obtener rutas accesibles por rol
export function getAccessibleRoutes(userRole: UserRole): AppRoute[] {
  return Object.keys(ROUTE_PERMISSIONS).filter(route => 
    hasRouteAccess(route, userRole)
  ) as AppRoute[]
}


