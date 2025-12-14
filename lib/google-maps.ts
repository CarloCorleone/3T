// Utilidades para integración con Google Maps API

export interface Waypoint {
  location: {
    lat: number
    lng: number
  }
  stopover: boolean
}

export interface RouteStep {
  orderId: string
  customerName: string
  address: string
  commune: string
  quantity: number
  latitude: number
  longitude: number
  orderIndex: number
  productName?: string
}

export interface OptimizedRoute {
  steps: RouteStep[]
  totalDistance: string
  totalDuration: string
  distanceMeters: number
  durationSeconds: number
  polyline?: string
  waypointOrder: number[]
}

export interface RouteGroup {
  routeNumber: number
  routes: OptimizedRoute[]
  totalBottles: number
  orders: any[]
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
const WAREHOUSE_ADDRESS = 'Inppa, Maipú, Chile'
const WAREHOUSE_COORDS = { lat: -33.5334497, lng: -70.7651785 } // Inppa, Maipú (Inicio)
const DESTINATION_ADDRESS = 'Teresa Vial 1301, San Miguel, Chile'
const DESTINATION_COORDS = { lat: -33.492359, lng: -70.6563238 } // Teresa Vial 1301, San Miguel (Término)

/**
 * Calcula la ruta optimizada usando Google Maps Directions Service (desde el cliente)
 */
export async function calculateOptimizedRoute(
  orders: any[],
  origin = WAREHOUSE_COORDS,
  destination = DESTINATION_COORDS
): Promise<OptimizedRoute> {
  if (orders.length === 0) {
    throw new Error('No hay pedidos para optimizar')
  }

  // Validar que todos los pedidos tengan coordenadas
  const invalidOrders = orders.filter(o => !o.latitude || !o.longitude)
  if (invalidOrders.length > 0) {
    throw new Error(`${invalidOrders.length} pedido(s) no tienen coordenadas válidas`)
  }

  // Limitar a 25 waypoints (limitación de Google Maps API)
  if (orders.length > 25) {
    console.warn('Google Maps API limita a 25 waypoints. Usando solo los primeros 25 pedidos.')
    orders = orders.slice(0, 25)
  }

  try {
    // Esperar a que Google Maps esté cargado
    if (typeof window === 'undefined' || !(window as any).google || !(window as any).google.maps) {
      throw new Error('Google Maps no está cargado. Recarga la página.')
    }

    const google = (window as any).google
    const directionsService = new google.maps.DirectionsService()

    // Construir waypoints
    const waypoints = orders.map(order => ({
      location: new google.maps.LatLng(order.latitude, order.longitude),
      stopover: true
    }))

    // Hacer la petición
    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(origin.lat, origin.lng),
      destination: new google.maps.LatLng(destination.lat, destination.lng),
      waypoints: waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING
    }

    // Promisificar la callback
    const result = await new Promise<any>((resolve, reject) => {
      directionsService.route(request, (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result)
        } else {
          reject(new Error(`Error de Google Maps: ${status}`))
        }
      })
    })

    const route = result.routes[0]
    const waypointOrder = route.waypoint_order || []

    // Reorganizar los pedidos según el orden optimizado
    const optimizedOrders = waypointOrder.map((index: number, position: number) => ({
      ...orders[index],
      orderIndex: position + 1
    }))

    // Calcular distancia y duración total
    let totalDistanceMeters = 0
    let totalDurationSeconds = 0

    route.legs.forEach((leg: any) => {
      if (leg.distance && leg.duration) {
        totalDistanceMeters += leg.distance.value
        totalDurationSeconds += leg.duration.value
      }
    })

    const optimizedRoute: OptimizedRoute = {
      steps: optimizedOrders.map((order: any) => ({
        orderId: order.order_id,
        customerName: order.customer_name,
        address: order.raw_address,
        commune: order.commune,
        quantity: order.quantity,
        latitude: order.latitude,
        longitude: order.longitude,
        orderIndex: order.orderIndex,
        productName: order.product_name
      })),
      totalDistance: formatDistance(totalDistanceMeters),
      totalDuration: formatDuration(totalDurationSeconds),
      distanceMeters: totalDistanceMeters,
      durationSeconds: totalDurationSeconds,
      polyline: route.overview_polyline,
      waypointOrder
    }

    return optimizedRoute
  } catch (error: any) {
    console.error('Error calculando ruta optimizada:', error)
    throw error
  }
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes} min`
}

/**
 * Agrupa pedidos en múltiples rutas si exceden la capacidad de 55 botellones
 * Intenta agrupar por comuna para optimizar
 */
export function groupOrdersByCapacity(orders: any[], maxCapacity = 55): RouteGroup[] {
  if (orders.length === 0) return []

  // Calcular total de botellones
  const totalBottles = orders.reduce((sum, order) => sum + (order.quantity || 0), 0)

  // Si cabe en un solo viaje, retornar grupo único
  if (totalBottles <= maxCapacity) {
    return [{
      routeNumber: 1,
      routes: [],
      totalBottles,
      orders
    }]
  }

  // Agrupar por comuna
  const ordersByCommune: { [key: string]: any[] } = {}
  orders.forEach(order => {
    const commune = order.commune || 'Sin Comuna'
    if (!ordersByCommune[commune]) {
      ordersByCommune[commune] = []
    }
    ordersByCommune[commune].push(order)
  })

  // Calcular botellones por comuna
  const communeBottles = Object.entries(ordersByCommune).map(([commune, orders]) => ({
    commune,
    orders,
    bottles: orders.reduce((sum, o) => sum + (o.quantity || 0), 0)
  }))

  // Ordenar comunas por cantidad de botellones (de mayor a menor)
  communeBottles.sort((a, b) => b.bottles - a.bottles)

  // Crear grupos de rutas
  const routeGroups: RouteGroup[] = []
  let currentGroup: any[] = []
  let currentBottles = 0
  let routeNumber = 1

  communeBottles.forEach(({ commune, orders, bottles }) => {
    // Si esta comuna sola excede la capacidad, dividirla
    if (bottles > maxCapacity) {
      // Primero, vaciar el grupo actual si tiene algo
      if (currentGroup.length > 0) {
        routeGroups.push({
          routeNumber: routeNumber++,
          routes: [],
          totalBottles: currentBottles,
          orders: currentGroup
        })
        currentGroup = []
        currentBottles = 0
      }

      // Dividir los pedidos de esta comuna en múltiples grupos
      let tempGroup: any[] = []
      let tempBottles = 0

      orders.forEach(order => {
        if (tempBottles + order.quantity > maxCapacity) {
          // Crear nuevo grupo con lo acumulado
          routeGroups.push({
            routeNumber: routeNumber++,
            routes: [],
            totalBottles: tempBottles,
            orders: tempGroup
          })
          tempGroup = [order]
          tempBottles = order.quantity
        } else {
          tempGroup.push(order)
          tempBottles += order.quantity
        }
      })

      // Agregar el último grupo temporal si tiene pedidos
      if (tempGroup.length > 0) {
        routeGroups.push({
          routeNumber: routeNumber++,
          routes: [],
          totalBottles: tempBottles,
          orders: tempGroup
        })
      }
    } else {
      // Verificar si cabe en el grupo actual
      if (currentBottles + bottles <= maxCapacity) {
        currentGroup.push(...orders)
        currentBottles += bottles
      } else {
        // Crear nuevo grupo con lo acumulado
        if (currentGroup.length > 0) {
          routeGroups.push({
            routeNumber: routeNumber++,
            routes: [],
            totalBottles: currentBottles,
            orders: currentGroup
          })
        }
        // Iniciar nuevo grupo con esta comuna
        currentGroup = [...orders]
        currentBottles = bottles
      }
    }
  })

  // Agregar el último grupo si tiene pedidos
  if (currentGroup.length > 0) {
    routeGroups.push({
      routeNumber: routeNumber++,
      routes: [],
      totalBottles: currentBottles,
      orders: currentGroup
    })
  }

  return routeGroups
}

/**
 * Genera URL de Google Maps para navegación con múltiples waypoints
 */
export function getGoogleMapsNavigationUrl(
  route: OptimizedRoute, 
  destinationCoords?: { lat: number, lng: number }
): string {
  const origin = `${WAREHOUSE_COORDS.lat},${WAREHOUSE_COORDS.lng}`
  
  // Si no se especifica destino, usar DESTINATION_COORDS por defecto
  const finalDestination = destinationCoords || DESTINATION_COORDS
  const destination = `${finalDestination.lat},${finalDestination.lng}`
  
  const waypoints = route.steps
    .map(step => `${step.latitude},${step.longitude}`)
    .join('|')

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
}


/**
 * Calcula distancia euclidiana entre dos puntos (fallback cuando Google API falla)
 */
export function calculateEuclideanDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export { WAREHOUSE_ADDRESS, WAREHOUSE_COORDS, DESTINATION_ADDRESS, DESTINATION_COORDS }

