'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { HeatmapDensidad } from '@/components/heatmap-densidad'
import { Loader2, Map, MapPin, Layers } from 'lucide-react'

interface MapaDashboardProps {
  fechaInicio?: string
  fechaFin?: string
  tipoCliente?: string
  clienteId?: string
}

export function MapaDashboard({ 
  fechaInicio, 
  fechaFin, 
  tipoCliente = 'todos', 
  clienteId = 'todos' 
}: MapaDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
  const [vistaActual, setVistaActual] = useState<'entregas' | 'calor'>('calor')
  
  // Datos para mapa de entregas
  const [pedidosConCoordenadas, setPedidosConCoordenadas] = useState<any[]>([])
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'Pedido' | 'Ruta'>('todos')
  
  // Datos para mapa de calor (ventas por comuna)
  const [ventasPorComuna, setVentasPorComuna] = useState<Record<string, number>>({})

  useEffect(() => {
    loadMapData()
  }, [fechaInicio, fechaFin, tipoCliente, clienteId])

  const loadMapData = async () => {
    setLoading(true)
    try {
      // Construir query base con filtros de fecha
      let pedidosQuery = supabase
        .from('3t_orders')
        .select('order_id, customer_id, quantity, status, delivery_address_id, final_price, product_type, customer:3t_customers(customer_type)')
        .in('status', ['Pedido', 'Ruta', 'Despachado'])
      
      // Aplicar filtros de fecha si están disponibles
      if (fechaInicio) {
        pedidosQuery = pedidosQuery.gte('order_date', fechaInicio)
      }
      if (fechaFin) {
        pedidosQuery = pedidosQuery.lte('order_date', fechaFin)
      }

      // Queries en paralelo
      const [pedidosRes, direccionesRes, clientesRes] = await Promise.all([
        pedidosQuery,
        
        supabase
          .from('3t_addresses')
          .select('address_id, commune, raw_address, latitude, longitude'),
        
        supabase
          .from('3t_customers')
          .select('customer_id, name, customer_type')
      ])

      let pedidos = pedidosRes.data || []
      const direcciones = direccionesRes.data || []
      const clientes = clientesRes.data || []

      // Aplicar filtros de tipo de cliente
      if (tipoCliente !== 'todos') {
        const tipoFiltro = tipoCliente === 'empresa' ? 'Empresa' : 'Hogar'
        pedidos = pedidos.filter((p: any) => p.customer?.customer_type === tipoFiltro)
      }

      // Aplicar filtro de cliente específico
      if (clienteId !== 'todos') {
        pedidos = pedidos.filter((p: any) => p.customer_id === clienteId)
      }

      // Crear mapas para lookups
      const direccionesMap: Record<string, any> = {}
      direcciones.forEach((d: any) => {
        if (d.address_id) direccionesMap[d.address_id] = d
      })

      const clientesMap: Record<string, any> = {}
      clientes.forEach((c: any) => {
        if (c.customer_id) clientesMap[c.customer_id] = c
      })

      // Pedidos con coordenadas (para mapa de entregas) - solo Pedido y Ruta
      const pedidosPendientes = pedidos.filter(p => p.status === 'Pedido' || p.status === 'Ruta')
      const pedidosCoord = pedidosPendientes
        .map(p => {
          const direccion = direccionesMap[p.delivery_address_id]
          if (!direccion?.latitude || !direccion?.longitude) return null

          return {
            order_id: p.order_id,
            customer_name: clientesMap[p.customer_id]?.name || 'Sin nombre',
            quantity: p.quantity,
            status: p.status,
            latitude: Number(direccion.latitude),
            longitude: Number(direccion.longitude),
            commune: direccion.commune,
            raw_address: direccion.raw_address
          }
        })
        .filter(Boolean)

      setPedidosConCoordenadas(pedidosCoord)

      // Ventas por comuna (para mapa de calor) - todos los pedidos filtrados
      const ventasMap: Record<string, number> = {}
      pedidos.forEach((p: any) => {
        const direccion = direccionesMap[p.delivery_address_id]
        const comuna = direccion?.commune
        
        if (comuna) {
          // Calcular precio final con IVA si es empresa
          let precioFinal = p.final_price || 0
          
          if (p.customer?.customer_type === 'Empresa') {
            precioFinal = precioFinal * 1.19
          }
          
          ventasMap[comuna] = (ventasMap[comuna] || 0) + precioFinal
        }
      })

      setVentasPorComuna(ventasMap)

    } catch (error) {
      console.error('Error cargando datos del mapa:', error)
    } finally {
      setLoading(false)
    }
  }

  // Detectar cuando Google Maps esté cargado
  useEffect(() => {
    const checkGoogleMaps = () => {
      const google = (window as any).google
      if (google && google.maps && google.maps.places) {
        setGoogleMapsLoaded(true)
      }
    }

    checkGoogleMaps()
    const interval = setInterval(checkGoogleMaps, 100)
    return () => clearInterval(interval)
  }, [])

  // Renderizar mapa de entregas
  useEffect(() => {
    if (!googleMapsLoaded || vistaActual !== 'entregas' || pedidosConCoordenadas.length === 0) return

    const google = (window as any).google
    if (!google?.maps) return

    const mapElement = document.getElementById('dashboard-map')
    if (!mapElement) return

    const map = new google.maps.Map(mapElement, {
      zoom: 12,
      center: { lat: -33.4489, lng: -70.6693 },
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    })

    const bounds = new google.maps.LatLngBounds()

    // Filtrar pedidos según estado seleccionado
    const pedidosFiltrados = filtroEstado === 'todos' 
      ? pedidosConCoordenadas 
      : pedidosConCoordenadas.filter(p => p.status === filtroEstado)

    pedidosFiltrados.forEach((pedido: any) => {
      const position = { lat: pedido.latitude, lng: pedido.longitude }
      const markerColor = pedido.status === 'Pedido' ? '#3B82F6' : '#F59E0B'

      const marker = new google.maps.Marker({
        position,
        map,
        title: pedido.customer_name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        }
      })

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="font-weight: 600; margin-bottom: 8px;">${pedido.customer_name}</h3>
            <p style="font-size: 14px; margin-bottom: 4px;"><strong>Dirección:</strong> ${pedido.raw_address || 'Sin dirección'}</p>
            <p style="font-size: 14px; margin-bottom: 4px;"><strong>Comuna:</strong> ${pedido.commune}</p>
            <p style="font-size: 14px; margin-bottom: 4px;"><strong>Cantidad:</strong> ${pedido.quantity} unidades</p>
            <p style="font-size: 14px;"><strong>Estado:</strong> <span style="color: ${markerColor};">${pedido.status}</span></p>
          </div>
        `
      })

      marker.addListener('click', () => {
        infoWindow.open(map, marker)
      })

      bounds.extend(position)
    })

    if (pedidosFiltrados.length > 0) {
      map.fitBounds(bounds)
    }
  }, [googleMapsLoaded, vistaActual, pedidosConCoordenadas, filtroEstado])

  const pedidosFiltrados = filtroEstado === 'todos' 
    ? pedidosConCoordenadas 
    : pedidosConCoordenadas.filter(p => p.status === filtroEstado)

  const countPedido = pedidosConCoordenadas.filter(p => p.status === 'Pedido').length
  const countRuta = pedidosConCoordenadas.filter(p => p.status === 'Ruta').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Mapas de Análisis
            </CardTitle>
            <CardDescription>
              Visualización de entregas pendientes y distribución de ventas por comunas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[600px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={vistaActual} onValueChange={(v) => setVistaActual(v as 'entregas' | 'calor')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="calor" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Mapa de Calor de Ventas
              </TabsTrigger>
              <TabsTrigger value="entregas" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Entregas Pendientes
              </TabsTrigger>
            </TabsList>

            {/* Tab: Mapa de Calor de Ventas */}
            <TabsContent value="calor">
              <HeatmapDensidad ventasPorComuna={ventasPorComuna} />
            </TabsContent>

            {/* Tab: Mapa de Entregas */}
            <TabsContent value="entregas" className="space-y-4">
              {/* Filtros */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">Filtrar por estado:</span>
                <Button
                  variant={filtroEstado === 'todos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroEstado('todos')}
                >
                  Todos ({pedidosConCoordenadas.length})
                </Button>
                <Button
                  variant={filtroEstado === 'Pedido' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroEstado('Pedido')}
                  className="flex items-center gap-2"
                >
                  <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                  Pedido ({countPedido})
                </Button>
                <Button
                  variant={filtroEstado === 'Ruta' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroEstado('Ruta')}
                  className="flex items-center gap-2"
                >
                  <span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
                  En Ruta ({countRuta})
                </Button>
              </div>

              {/* Estadísticas rápidas */}
              <div className="grid gap-3 sm:grid-cols-3 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">{pedidosFiltrados.length}</div>
                  <div className="text-xs text-muted-foreground">Entregas mostradas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {pedidosFiltrados.reduce((sum, p) => sum + (p.quantity || 0), 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Botellones totales</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {new Set(pedidosFiltrados.map(p => p.commune)).size}
                  </div>
                  <div className="text-xs text-muted-foreground">Comunas únicas</div>
                </div>
              </div>

              {/* Mapa */}
              {pedidosConCoordenadas.length === 0 ? (
                <div className="flex h-[500px] flex-col items-center justify-center text-muted-foreground border rounded-lg">
                  <MapPin className="h-12 w-12 mb-2" />
                  <p>No hay pedidos con coordenadas</p>
                </div>
              ) : !googleMapsLoaded ? (
                <div className="flex h-[500px] items-center justify-center border rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Cargando mapa...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                    <span>Pedido</span>
                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 ml-2"></span>
                    <span>En Ruta</span>
                  </div>
                  <div 
                    id="dashboard-map" 
                    className="w-full h-[500px] rounded-lg border shadow-sm"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
