import { HelpContents } from './types'

/**
 * Contenidos de ayuda para el módulo de Rutas
 */
export const RUTAS_HELP: HelpContents = {
  tooltips: {
    optimizar: 'Agrupa automáticamente los pedidos en rutas equilibradas considerando capacidad y proximidad geográfica',
    agregarRuta: 'Crea una ruta vacía para organizar manualmente los pedidos arrastrándolos',
    recargar: 'Recarga los pedidos en estado "Ruta" desde la base de datos',
    maps: 'Abre esta ruta en Google Maps para navegación',
    eliminarRuta: 'Elimina esta ruta y devuelve todos sus pedidos a disponibles',
    despachar: 'Marca este pedido como despachado. Se abrirá un modal para confirmar la entrega',
    capacidad: 'Capacidad máxima por ruta: 55 botellones',
    dragPedido: 'Arrastra este pedido a una ruta para asignarlo',
    colapsarRuta: 'Expandir/colapsar detalles de la ruta',
    filtroRuta: 'Filtra el mapa para mostrar solo esta ruta',
    toggleLineas: 'Mostrar/ocultar las líneas de trazado de rutas en el mapa',
  },
  
  popovers: {
    comoUsar: {
      title: 'Cómo usar el módulo de Rutas',
      description: 'Organiza y optimiza las entregas diarias de forma eficiente',
      steps: [
        '1️⃣ Los pedidos con estado "Ruta" aparecen automáticamente como disponibles',
        '2️⃣ Arrastra pedidos desde disponibles hacia las rutas o usa "Optimizar Rutas"',
        '3️⃣ El sistema agrupa por capacidad (máx. 55 botellones) y proximidad geográfica',
        '4️⃣ Reordena pedidos dentro de cada ruta arrastrándolos',
        '5️⃣ Usa el botón "Maps" para abrir la ruta en Google Maps para navegación',
        '6️⃣ Marca pedidos como despachados con el botón ✓ al completar la entrega',
      ],
    },
    pedidosDisponibles: {
      title: 'Pedidos Disponibles',
      description: 'Estos pedidos están listos para ser asignados a rutas',
      steps: [
        '🔵 Azul = Entregas a clientes',
        '🟠 Naranja = Compras a proveedores (van primero en la ruta)',
        '🎨 Borde de color = Comuna del pedido (para agrupar visualmente)',
        '↔️ Arrastra cada pedido a una ruta para asignarlo',
      ],
    },
    mapa: {
      title: 'Mapa Interactivo',
      description: 'Visualiza todas las ubicaciones y rutas optimizadas',
      steps: [
        '🟢 Verde = Bodega (punto de inicio y llegada)',
        '🟠 Naranja = Proveedores (compras)',
        '🔵 Azul = Clientes (entregas)',
        'Los números indican el orden de las paradas en cada ruta',
        'Usa los filtros para ver rutas específicas',
      ],
    },
  },
  
  disabledReasons: {
    needTwoOrders: 'Se necesitan al menos 2 pedidos disponibles para optimizar',
    mapsNotReady: 'Google Maps está cargando, espera un momento',
    noOrders: 'No hay pedidos en estado "Ruta". Ve al módulo Pedidos y cambia el estado',
  },
  
  validations: {
    mapsReady: {
      id: 'mapsReady',
      label: 'Google Maps cargado',
      valid: false,
      message: 'Necesario para calcular rutas optimizadas',
    },
    hasOrders: {
      id: 'hasOrders',
      label: 'Pedidos disponibles',
      valid: false,
      message: 'Al menos 2 pedidos para optimizar',
    },
    capacityOk: {
      id: 'capacityOk',
      label: 'Capacidad dentro del límite',
      valid: false,
      message: 'Ninguna ruta excede 55 botellones',
    },
    routesCreated: {
      id: 'routesCreated',
      label: 'Rutas creadas',
      valid: false,
      message: 'Al menos una ruta para organizar',
    },
  },
}

