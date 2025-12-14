'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MapPin, Filter, Home, Building, Calendar as CalendarIcon, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// Coordenadas de la bodega
const WAREHOUSE_COORDS = { lat: -33.4489, lng: -70.6693 }

// Colores por comuna
const getComunaColor = (comuna: string): string => {
  const colors: Record<string, string> = {
    'Las Condes': '#3b82f6',
    'Providencia': '#8b5cf6',
    'Ñuñoa': '#06b6d4',
    'La Reina': '#10b981',
    'Vitacura': '#f59e0b',
    'Lo Barnechea': '#ef4444',
    'Santiago': '#84cc16',
    'Maipú': '#f97316',
    'default': '#6b7280'
  }
  return colors[comuna] || colors.default
}

// Colores por estado
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Pedido': '#f59e0b',
    'Ruta': '#3b82f6',
    'Despachado': '#10b981',
    'default': '#6b7280'
  }
  return colors[status] || colors.default
}

export default function MapaPage() {
  const [entregas, setEntregas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [tipoClienteFiltro, setTipoClienteFiltro] = useState('todos')
  const [fechaFiltro, setFechaFiltro] = useState<Date | undefined>(undefined)
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])

  useEffect(() => {
    // Verificar si Google Maps está cargado
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

  useEffect(() => {
    loadEntregas()
  }, [estadoFiltro, tipoClienteFiltro, fechaFiltro])

  useEffect(() => {
    if (googleMapsLoaded && entregas.length > 0) {
      renderMap()
    }
  }, [googleMapsLoaded, entregas])

  const loadEntregas = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('3t_dashboard_ventas')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      // Aplicar filtros
      if (estadoFiltro !== 'todos') {
        query = query.eq('status', estadoFiltro)
      }

      if (tipoClienteFiltro !== 'todos') {
        query = query.eq('customer_type', tipoClienteFiltro)
      }

      if (fechaFiltro) {
        const fechaStr = format(fechaFiltro, 'yyyy-MM-dd')
        query = query.eq('order_date', fechaStr)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error cargando entregas:', error)
        return
      }

      setEntregas(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderMap = () => {
    if (!googleMapsLoaded || !entregas.length) return

    const mapElement = document.getElementById('map')
    if (!mapElement) return

    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    // Crear mapa
    mapRef.current = new google.maps.Map(mapElement, {
      zoom: 12,
      center: WAREHOUSE_COORDS,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    })

    const bounds = new google.maps.LatLngBounds()

    // Marcador de bodega
    const warehouseMarker = new google.maps.Marker({
      position: WAREHOUSE_COORDS,
      map: mapRef.current,
      label: {
        text: 'B',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold'
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 16,
        fillColor: '#16a34a',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2,
      },
      title: 'Bodega'
    })

    bounds.extend(WAREHOUSE_COORDS)

    // Agrupar entregas por comuna
    const entregasPorComuna: Record<string, any[]> = {}
    entregas.forEach(entrega => {
      const comuna = entrega.commune || 'Sin comuna'
      if (!entregasPorComuna[comuna]) {
        entregasPorComuna[comuna] = []
      }
      entregasPorComuna[comuna].push(entrega)
    })

    // Crear marcadores agrupados
    Object.entries(entregasPorComuna).forEach(([comuna, entregasComuna]) => {
      const comunaColor = getComunaColor(comuna)
      
      entregasComuna.forEach((entrega, index) => {
        const statusColor = getStatusColor(entrega.status)
        const markerColor = entrega.status === 'Despachado' ? '#10b981' : statusColor

        const marker = new google.maps.Marker({
          position: { lat: entrega.latitude, lng: entrega.longitude },
          map: mapRef.current,
          label: {
            text: entrega.status === 'Despachado' ? '✓' : '•',
            color: 'white',
            fontSize: '12px'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: markerColor,
            fillOpacity: 0.8,
            strokeColor: 'white',
            strokeWeight: 2,
          },
          title: `${entrega.customer_name} - ${entrega.status}`
        })

        // Info window
        const infoContent = `
          <div style="padding: 12px; min-width: 250px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="width: 12px; height: 12px; background-color: ${markerColor}; border-radius: 50%;"></div>
              <strong style="color: ${markerColor};">${entrega.status}</strong>
            </div>
            <p style="margin: 0 0 4px 0; font-weight: bold; color: #1f2937;">
              ${entrega.customer_name}
            </p>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">
              ${entrega.product_name} x${entrega.quantity}
            </p>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">
              ${entrega.commune}
            </p>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
              $${entrega.final_price?.toLocaleString('es-CL')}
            </p>
            <div style="display: flex; gap: 4px;">
              <a href="/pedidos" style="
                background-color: #3b82f6; 
                color: white; 
                padding: 4px 8px; 
                border-radius: 4px; 
                text-decoration: none; 
                font-size: 12px;
              ">Ver Pedido</a>
            </div>
          </div>
        `

        const infoWindow = new google.maps.InfoWindow({
          content: infoContent,
        })

        marker.addListener('click', () => {
          infoWindow.open(mapRef.current, marker)
        })

        markersRef.current.push(marker)
        bounds.extend({ lat: entrega.latitude, lng: entrega.longitude })
      })
    })

    // Ajustar vista para mostrar todos los marcadores
    if (bounds.isEmpty()) {
      mapRef.current.setCenter(WAREHOUSE_COORDS)
      mapRef.current.setZoom(12)
    } else {
      mapRef.current.fitBounds(bounds)
      
      // Limitar zoom máximo
      google.maps.event.addListenerOnce(mapRef.current, 'bounds_changed', () => {
        const zoom = mapRef.current?.getZoom()
        if (zoom && zoom > 15) {
          mapRef.current?.setZoom(15)
        }
      })
    }
  }

  const filteredEntregas = entregas.filter(entrega => {
    if (estadoFiltro !== 'todos' && entrega.status !== estadoFiltro) return false
    if (tipoClienteFiltro !== 'todos' && entrega.customer_type !== tipoClienteFiltro) return false
    if (fechaFiltro) {
      const fechaStr = format(fechaFiltro, 'yyyy-MM-dd')
      if (entrega.order_date !== fechaStr) return false
    }
    return true
  })

  const stats = {
    total: filteredEntregas.length,
    pedidos: filteredEntregas.filter(e => e.status === 'Pedido').length,
    ruta: filteredEntregas.filter(e => e.status === 'Ruta').length,
    despachado: filteredEntregas.filter(e => e.status === 'Despachado').length,
    residencial: filteredEntregas.filter(e => e.customer_type === 'Residencial').length,
    comercial: filteredEntregas.filter(e => e.customer_type === 'Comercial').length,
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa de Entregas</h1>
          <p className="text-muted-foreground">
            Visualización geográfica de entregas y despachos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="Pedido">📋 Pedido</SelectItem>
                  <SelectItem value="Ruta">🚚 En Ruta</SelectItem>
                  <SelectItem value="Despachado">✅ Despachado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Cliente</Label>
              <Select value={tipoClienteFiltro} onValueChange={setTipoClienteFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="Residencial">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Residencial
                    </div>
                  </SelectItem>
                  <SelectItem value="Comercial">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Comercial
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fechaFiltro && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaFiltro ? format(fechaFiltro, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fechaFiltro}
                    onSelect={setFechaFiltro}
                    initialFocus
                  />
                  {fechaFiltro && (
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setFechaFiltro(undefined)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Limpiar filtro
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Entregas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pedidos}</div>
            <p className="text-xs text-muted-foreground">Pedidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.ruta}</div>
            <p className="text-xs text-muted-foreground">En Ruta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.despachado}</div>
            <p className="text-xs text-muted-foreground">Despachados</p>
          </CardContent>
        </Card>
      </div>

      {/* Mapa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Entregas
          </CardTitle>
          <CardDescription>
            {filteredEntregas.length} entregas mostradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {loading ? (
              <div className="flex h-[500px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !googleMapsLoaded ? (
              <div className="flex h-[500px] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p>Cargando Google Maps...</p>
                </div>
              </div>
            ) : (
              <div id="map" className="h-[500px] w-full rounded-lg border" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}