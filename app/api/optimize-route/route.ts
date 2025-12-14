import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createErrorResponse } from '@/lib/auth-middleware'
import { checkRateLimit, intensiveLimiter, getRateLimitIdentifier } from '@/lib/rate-limit'
import logger, { logApiError, logHttpRequest } from '@/lib/logger'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
const WAREHOUSE_COORDS = { lat: -33.5334497, lng: -70.7651785 } // Inppa, Maipú (Inicio)
const DESTINATION_COORDS = { lat: -33.492359, lng: -70.6563238 } // Teresa Vial 1301, San Miguel (Término)

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // 🔐 VERIFICAR AUTENTICACIÓN
  const authCheck = await requireAuth(request)
  if (!authCheck.authorized) {
    return createErrorResponse(authCheck)
  }

  console.log(`✅ Usuario autenticado: ${authCheck.user?.nombre} (${authCheck.rol})`)
  logger.info('Optimización de ruta iniciada', { userId: authCheck.userId, rol: authCheck.rol })

  // 🚦 VERIFICAR RATE LIMITING
  const identifier = getRateLimitIdentifier(request, authCheck.userId)
  const rateLimitResponse = await checkRateLimit(request, intensiveLimiter, identifier)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const { orders } = await request.json()

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: 'Google Maps API Key no configurada' },
        { status: 500 }
      )
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: 'No hay pedidos para optimizar' },
        { status: 400 }
      )
    }

    // Validar que todos los pedidos tengan coordenadas
    const invalidOrders = orders.filter((o: any) => !o.latitude || !o.longitude)
    if (invalidOrders.length > 0) {
      return NextResponse.json(
        { error: `${invalidOrders.length} pedido(s) no tienen coordenadas válidas` },
        { status: 400 }
      )
    }

    // Limitar a 25 waypoints
    const limitedOrders = orders.length > 25 ? orders.slice(0, 25) : orders

    // Construir waypoints
    const waypoints = limitedOrders
      .map((order: any) => `${order.latitude},${order.longitude}`)
      .join('|')

    // Llamar a Google Maps Directions API
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
    url.searchParams.append('origin', `${WAREHOUSE_COORDS.lat},${WAREHOUSE_COORDS.lng}`)
    url.searchParams.append('destination', `${DESTINATION_COORDS.lat},${DESTINATION_COORDS.lng}`)
    url.searchParams.append('waypoints', `optimize:true|${waypoints}`)
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY)
    url.searchParams.append('mode', 'driving')
    url.searchParams.append('language', 'es')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Google Maps API error:', data)
      return NextResponse.json(
        { error: `Error de Google Maps API: ${data.status} - ${data.error_message || 'Error desconocido'}` },
        { status: 500 }
      )
    }

    const route = data.routes[0]
    const waypointOrder = route.waypoint_order || []

    // Reorganizar los pedidos según el orden optimizado
    const optimizedOrders = waypointOrder.map((index: number, position: number) => ({
      ...limitedOrders[index],
      orderIndex: position + 1
    }))

    // Calcular distancia y duración total
    let totalDistanceMeters = 0
    let totalDurationSeconds = 0

    route.legs.forEach((leg: any) => {
      totalDistanceMeters += leg.distance.value
      totalDurationSeconds += leg.duration.value
    })

    const result = {
      steps: optimizedOrders.map((order: any) => ({
        orderId: order.order_id,
        customerName: order.customer_name,
        address: order.raw_address,
        commune: order.commune,
        quantity: order.quantity,
        latitude: order.latitude,
        longitude: order.longitude,
        orderIndex: order.orderIndex
      })),
      totalDistance: formatDistance(totalDistanceMeters),
      totalDuration: formatDuration(totalDurationSeconds),
      distanceMeters: totalDistanceMeters,
      durationSeconds: totalDurationSeconds,
      polyline: route.overview_polyline?.points,
      waypointOrder
    }

    const duration = Date.now() - startTime
    logger.info('Optimización de ruta completada', {
      userId: authCheck.userId,
      ordersCount: orders.length,
      distance: formatDistance(totalDistanceMeters),
      duration: `${duration}ms`
    })
    logHttpRequest('POST', '/api/optimize-route', 200, duration, authCheck.userId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error en optimize-route:', error)
    logApiError('/api/optimize-route', 'POST', error, authCheck?.userId)
    
    const duration = Date.now() - startTime
    logHttpRequest('POST', '/api/optimize-route', 500, duration, authCheck?.userId)
    
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
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

