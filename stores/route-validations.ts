import { create } from 'zustand'
import { ValidationItem } from '@/lib/help/types'
import { RUTAS_HELP } from '@/lib/help/rutas'

interface RouteValidationsState {
  // Estados base
  mapsReady: boolean
  pedidosCount: number
  rutasCount: number
  capacityWarnings: Map<number, number>
  
  // Acciones
  setMapsReady: (ready: boolean) => void
  setPedidosCount: (count: number) => void
  setRutasCount: (count: number) => void
  setCapacityWarning: (rutaId: number, excess: number) => void
  clearCapacityWarning: (rutaId: number) => void
  
  // Selectores derivados
  canOptimize: () => boolean
  getValidationItems: () => ValidationItem[]
  hasCapacityIssues: () => boolean
}

export const useRouteValidationsStore = create<RouteValidationsState>((set, get) => ({
  // Estados iniciales
  mapsReady: false,
  pedidosCount: 0,
  rutasCount: 0,
  capacityWarnings: new Map(),
  
  // Acciones
  setMapsReady: (ready: boolean) => set({ mapsReady: ready }),
  
  setPedidosCount: (count: number) => set({ pedidosCount: count }),
  
  setRutasCount: (count: number) => set({ rutasCount: count }),
  
  setCapacityWarning: (rutaId: number, excess: number) => 
    set((state) => {
      const newWarnings = new Map(state.capacityWarnings)
      newWarnings.set(rutaId, excess)
      return { capacityWarnings: newWarnings }
    }),
  
  clearCapacityWarning: (rutaId: number) =>
    set((state) => {
      const newWarnings = new Map(state.capacityWarnings)
      newWarnings.delete(rutaId)
      return { capacityWarnings: newWarnings }
    }),
  
  // Selectores derivados
  canOptimize: () => {
    const { mapsReady, pedidosCount } = get()
    return mapsReady && pedidosCount >= 2
  },
  
  getValidationItems: () => {
    const { mapsReady, pedidosCount, rutasCount, capacityWarnings } = get()
    
    // Lógica para "Pedidos disponibles":
    // - Si hay rutas creadas con pedidos Y pedidosCount = 0 → TODO BIEN (todos asignados)
    // - Si NO hay rutas Y pedidosCount < 2 → MAL (no hay suficientes para optimizar)
    // - Si hay rutas Y pedidosCount > 0 → INFO (hay pedidos pendientes de asignar)
    const hayPedidosEnRutas = rutasCount > 0
    const todosAsignados = hayPedidosEnRutas && pedidosCount === 0
    const pedidosSuficientes = pedidosCount >= 2
    
    const items: ValidationItem[] = [
      {
        id: 'pedidosStatus',
        label: todosAsignados ? 'Todos los pedidos asignados' : 'Pedidos disponibles',
        valid: todosAsignados || pedidosSuficientes,
        message: todosAsignados 
          ? undefined 
          : pedidosCount === 0 
            ? 'No hay pedidos en estado "Ruta"'
            : pedidosCount < 2 
              ? 'Al menos 2 pedidos para optimizar' 
              : `${pedidosCount} pedidos listos para asignar`,
      },
      {
        id: 'capacityOk',
        label: RUTAS_HELP.validations.capacityOk.label,
        valid: capacityWarnings.size === 0,
        message: capacityWarnings.size > 0 ? RUTAS_HELP.validations.capacityOk.message : undefined,
      },
      {
        id: 'routesCreated',
        label: RUTAS_HELP.validations.routesCreated.label,
        valid: rutasCount > 0,
        message: rutasCount === 0 ? RUTAS_HELP.validations.routesCreated.message : undefined,
      },
    ]
    
    return items
  },
  
  hasCapacityIssues: () => {
    const { capacityWarnings } = get()
    return capacityWarnings.size > 0
  },
}))
