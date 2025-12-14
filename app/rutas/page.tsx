'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { 
  MapPin, 
  Truck, 
  Navigation,
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Camera,
  FileText,
  GripVertical,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Route as RouteIcon,
  HelpCircle
} from 'lucide-react'
import { 
  SimpleTooltip, 
  SimplePopover, 
  DisabledButtonHelper, 
  SimpleValidationPanel 
} from '@/components/help'
import { useRouteValidationsStore } from '@/stores/route-validations'
import { RUTAS_HELP } from '@/lib/help/rutas'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { 
  calculateOptimizedRoute, 
  groupOrdersByCapacity, 
  WAREHOUSE_ADDRESS,
  WAREHOUSE_COORDS,
  DESTINATION_ADDRESS,
  DESTINATION_COORDS,
  type OptimizedRoute
} from '@/lib/google-maps'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const MAX_CAPACITY = 55

// Tipos
interface Pedido {
  id: string
  tipo: 'entrega' | 'compra'
  cliente: string
  direccion: string
  comuna: string
  productos: string
  cantidadTotal: number
  latitude: number
  longitude: number
  raw_data: any
}

interface Ruta {
  numero: number
  pedidos: Pedido[]
  capacidadUsada: number
  rutaOptimizada?: OptimizedRoute
}

// Colores por comuna (hex para inline styles que funcionan en dark mode)
const COLORES_COMUNA: Record<string, string> = {
  'San Miguel': '#10b981',    // emerald-500
  'Maipú': '#3b82f6',         // blue-500
  'Pudahuel': '#22c55e',      // green-500
  'Cerrillos': '#a855f7',     // purple-500
  'Cerro Navia': '#f97316',   // orange-500
  'Quinta Normal': '#ec4899', // pink-500
  'Estación Central': '#6366f1', // indigo-500
  'Quilicura': '#06b6d4',     // cyan-500
  'Renca': '#f59e0b',         // amber-500
  'Lo Prado': '#f43f5e',      // rose-500
  'Lampa': '#ef4444',         // red-500
  'default': '#9ca3af'        // gray-400
}

// Obtener color de borde por comuna
const getComunaColor = (comuna: string): string => {
  return COLORES_COMUNA[comuna] || COLORES_COMUNA.default
}

// Colores por ruta
const getRouteColor = (routeNumber: number): string => {
  const colors = ['#2563eb', '#9333ea', '#ea580c', '#059669', '#dc2626', '#ca8a04']
  return colors[(routeNumber - 1) % colors.length]
}

// Componente: Tarjeta de Pedido Disponible (Draggable) - COMPACTA
function TarjetaPedidoDisponible({ pedido }: { pedido: Pedido }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pedido-${pedido.id}`,
    data: { tipo: 'pedido-disponible', pedido }
  })
  
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab'
  }
  
  const isCompra = pedido.tipo === 'compra'
  const comunaColor = getComunaColor(pedido.comuna)
  
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: comunaColor,
        borderLeftWidth: '4px'
      }}
      {...listeners}
      {...attributes}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg border-r border-t border-b",
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-all hover:scale-105",
        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      )}
    >
      <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold">{isCompra ? '🟠' : '🔵'}</span>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{pedido.cliente}</span>
          <span className="text-xs text-muted-foreground">{pedido.productos}</span>
        </div>
        {!isCompra && (
          <Badge variant="secondary" className="ml-2 text-xs">
            {pedido.cantidadTotal}
          </Badge>
        )}
      </div>
    </div>
  )
}

// Componente: Pedido en Ruta (Sortable - reordena dentro de ruta)
function PedidoEnRuta({ pedido, onMarcarDespachado, isDispatched }: { 
  pedido: Pedido
  onMarcarDespachado: () => void
  isDispatched: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `pedido-${pedido.id}`,
    data: { tipo: 'pedido-en-ruta', pedido }
  })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  
  const isCompra = pedido.tipo === 'compra'
  
  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-2 p-2 rounded border",
        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
        isDispatched && "bg-green-50 dark:bg-green-900/20 opacity-60"
      )}
    >
      {!isDispatched && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">{pedido.cliente}</p>
        <p className="text-xs text-muted-foreground truncate">{pedido.direccion}</p>
        <p className="text-xs font-medium mt-1 text-gray-700 dark:text-gray-300">{pedido.productos}</p>
        {!isCompra && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {pedido.cantidadTotal} bot.
              </Badge>
            )}
          </div>
      {!isDispatched && (
              <Button
                size="sm"
                variant="outline"
                onClick={onMarcarDespachado}
                className="flex-shrink-0"
                title={RUTAS_HELP.tooltips.despachar}
              >
                <CheckCircle2 className="w-3 h-3" />
              </Button>
              )}
            </div>
  )
}

// Componente: Card de Ruta (Droppable)
function CardRuta({ 
  ruta, 
  isExpanded, 
  capacityWarning,
  onToggle, 
  onEliminar,
  onMarcarDespachado,
  dispatchedOrders
}: { 
  ruta: Ruta
  isExpanded: boolean
  capacityWarning: number
  onToggle: () => void
  onEliminar: () => void
  onMarcarDespachado: (pedido: Pedido) => void
  dispatchedOrders: Set<string>
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `ruta-${ruta.numero}`,
    data: { tipo: 'ruta', rutaNumero: ruta.numero }
  })
  
  const routeColor = getRouteColor(ruta.numero)
  
  // Generar URL de Google Maps
  const generarURLGoogleMaps = (): string => {
    if (ruta.pedidos.length === 0) return '#'
    
    const waypoints = ruta.pedidos
      .map(p => `${p.latitude},${p.longitude}`)
      .join('|')
    
    return `https://www.google.com/maps/dir/?api=1&origin=${WAREHOUSE_COORDS.lat},${WAREHOUSE_COORDS.lng}&destination=${WAREHOUSE_COORDS.lat},${WAREHOUSE_COORDS.lng}&waypoints=${waypoints}&travelmode=driving`
  }
  
  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        "shadow-md transition-all",
        isOver && "ring-2 ring-blue-500 ring-offset-2",
        capacityWarning > 0 && "border-orange-300"
      )}
      style={{ borderLeftWidth: '4px', borderLeftColor: routeColor }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="secondary" 
                  className="text-sm"
                  style={{ backgroundColor: routeColor + '20', color: routeColor, borderColor: routeColor }}
                >
                Ruta {ruta.numero}
                </Badge>
                <span className="text-base font-semibold">
                {ruta.pedidos.length} paradas
                </span>
              <Badge variant="outline" className={cn(
                capacityWarning > 0 && "bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400"
              )}>
                {ruta.capacidadUsada}/{MAX_CAPACITY}
              </Badge>
              {ruta.rutaOptimizada?.totalDistance && (
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400">
                  📏 {ruta.rutaOptimizada.totalDistance}
                </Badge>
              )}
              </CardTitle>
            {capacityWarning > 0 && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                  ⚠️ Capacidad excedida: +{capacityWarning} botellones
                  </AlertDescription>
                </Alert>
              )}
            </div>
          <div className="flex gap-1 flex-shrink-0">
            {ruta.pedidos.length > 0 && (
              <SimpleTooltip content="Abre esta ruta en Google Maps para navegación">
                <Button asChild size="sm" variant="outline">
                  <a 
                    href={generarURLGoogleMaps()}
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    Maps
                  </a>
                </Button>
              </SimpleTooltip>
            )}
            <SimpleTooltip content="Expandir/colapsar detalles de la ruta">
              <Button 
                size="sm" 
                variant="ghost"
                onClick={onToggle}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </SimpleTooltip>
            <SimpleTooltip content="Eliminar esta ruta y devolver pedidos a disponibles">
              <Button 
                size="sm" 
                variant="ghost"
                onClick={onEliminar}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </SimpleTooltip>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {ruta.pedidos.length > 0 ? (
              <SortableContext
              items={ruta.pedidos.map(p => `pedido-${p.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                {ruta.pedidos.map((pedido) => (
                  <PedidoEnRuta
                    key={pedido.id}
                    pedido={pedido}
                    onMarcarDespachado={() => onMarcarDespachado(pedido)}
                    isDispatched={dispatchedOrders.has(pedido.id)}
                    />
                  ))}
                </div>
              </SortableContext>
          ) : (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Arrastra pedidos aquí</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default function RutasPage() {
  const { toast } = useToast()
  
  // Estados principales
  const [pedidosDisponibles, setPedidosDisponibles] = useState<Pedido[]>([])
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [loading, setLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
  const [expandedRoutes, setExpandedRoutes] = useState<Set<number>>(new Set())
  const [dispatchedOrders, setDispatchedOrders] = useState<Set<string>>(new Set())
  
  // Store de validaciones
  const validationsStore = useRouteValidationsStore()
  
  // Estados para drag & drop
  const [activePedido, setActivePedido] = useState<Pedido | null>(null)
  
  // Estados para modal de despacho
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null)
  const [deliveryNote, setDeliveryNote] = useState('')
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [dispatching, setDispatching] = useState(false)
  const [deliveredQuantity, setDeliveredQuantity] = useState<number>(0)
  
  // Referencias
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rutasRef = useRef<Ruta[]>([]) // Mantener referencia actualizada de rutas
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const directionsRenderersRef = useRef<any[]>([]) // Para almacenar las polylines de rutas
  const [mapRefreshKey, setMapRefreshKey] = useState(0)
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<number | 'all'>('all')
  const [showRouteLines, setShowRouteLines] = useState(true) // Toggle para mostrar/ocultar líneas de rutas
  
  // Sensors para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Verificar carga de Google Maps
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

  // Sincronizar estado con store de validaciones
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    validationsStore.setMapsReady(googleMapsLoaded)
  }, [googleMapsLoaded])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    validationsStore.setPedidosCount(pedidosDisponibles.length)
  }, [pedidosDisponibles.length])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    validationsStore.setRutasCount(rutas.length)
  }, [rutas.length])

  // Sincronizar warnings de capacidad
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    rutas.forEach(ruta => {
      const warning = Math.max(0, ruta.capacidadUsada - MAX_CAPACITY)
      if (warning > 0) {
        validationsStore.setCapacityWarning(ruta.numero, warning)
      } else {
        validationsStore.clearCapacityWarning(ruta.numero)
      }
    })
  }, [rutas])

  // Mantener rutasRef actualizada
  useEffect(() => {
    rutasRef.current = rutas
  }, [rutas])

  // Cargar pedidos y rutas guardadas al iniciar
  useEffect(() => {
    cargarPedidosYCompras()
    
    return () => {
      // Si hay un guardado pendiente, ejecutarlo inmediatamente antes de salir
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        console.log('💾 Guardando cambios pendientes antes de salir...')
        guardarRutasInmediatamente()
      }
    }
  }, [])

  // Suscripción Realtime a cambios en pedidos (Deshabilitado temporalmente por problemas de WebSocket)
  // La funcionalidad de despacho seguirá funcionando, pero sin actualizaciones en tiempo real
  // Los cambios se verán al recargar la página
  
  // useEffect(() => {
  //   const subscription = supabase
  //     .channel('rutas-cambios')
  //     .on('postgres_changes', 
  //       { 
  //         event: 'UPDATE', 
  //         schema: 'public', 
  //         table: '3t_orders',
  //         filter: 'status=eq.Despachado'
  //       },
  //       (payload) => {
  //         console.log('📦 Pedido despachado en tiempo real:', payload.new.order_id)
  //         actualizarVistaSinPedido(payload.new.order_id)
  //       }
  //     )
  //     .subscribe()
    
  //   return () => {
  //     subscription.unsubscribe()
  //   }
  // }, [])

  // Renderizar mapa unificado (con debounce para evitar renders innecesarios)
  useEffect(() => {
    if (!googleMapsLoaded) return
    
    // Mostrar mapa si hay pedidos disponibles O rutas con pedidos
    const hayPedidos = pedidosDisponibles.length > 0 || rutas.some(r => r.pedidos.length > 0)
    if (!hayPedidos) return

    const google = (window as any).google
    if (!google || !google.maps) return

    // Debounce de 300ms para evitar múltiples renders
    const timeoutId = setTimeout(() => {
      console.log('🗺️ Renderizando mapa unificado')
      
      const mapElement = document.getElementById('unified-map')
      if (!mapElement) return
    
    // Limpiar marcadores y polylines anteriores
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []
    
    directionsRenderersRef.current.forEach(renderer => renderer.setMap(null))
    directionsRenderersRef.current = []
    
    // Crear o reutilizar mapa
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapElement, {
        zoom: 12,
        center: WAREHOUSE_COORDS,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })
    }

    const bounds = new google.maps.LatLngBounds()

    // Marcador de inicio (bodega)
    const warehouseMarker = new google.maps.Marker({
      position: WAREHOUSE_COORDS,
      map: mapRef.current,
      label: {
        text: 'B',
        color: 'white',
        fontWeight: 'bold',
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 16,
        fillColor: '#16a34a',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2,
      },
      title: 'Bodega',
    })
    bounds.extend(warehouseMarker.getPosition()!)
    markersRef.current.push(warehouseMarker)

    const warehouseInfo = new google.maps.InfoWindow({
      content: `
        <div style="padding: 12px; min-width: 200px;">
          <p style="font-weight: bold; color: #16a34a; margin: 0 0 8px 0; font-size: 15px;">
            🚚 Bodega
          </p>
          <p style="margin: 0; font-size: 13px; color: #374151;">
            ${WAREHOUSE_ADDRESS}
          </p>
        </div>
      `,
    })
    warehouseMarker.addListener('click', () => {
      warehouseInfo.open(mapRef.current, warehouseMarker)
    })

    // Marcadores de pedidos disponibles (sin asignar a ruta)
    pedidosDisponibles.forEach((pedido) => {
      const isCompra = pedido.tipo === 'compra'
      const comunaColor = getComunaColor(pedido.comuna)
      
      const marker = new google.maps.Marker({
        position: { lat: pedido.latitude, lng: pedido.longitude },
        map: mapRef.current,
        label: {
          text: '•',
          color: 'white',
          fontWeight: 'bold',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: comunaColor,
          fillOpacity: 0.8,
          strokeColor: 'white',
          strokeWeight: 2,
        },
        title: `${pedido.cliente} - ${pedido.comuna}`,
      })

      bounds.extend(marker.getPosition()!)
      markersRef.current.push(marker)

      const infoContent = `
        <div style="padding: 12px; min-width: 250px;">
          <p style="font-weight: bold; color: ${comunaColor}; margin: 0 0 8px 0; font-size: 14px;">
            ${isCompra ? '🟠 COMPRA' : '📦 PEDIDO'} - Disponible
          </p>
          <p style="font-weight: 600; margin: 0 0 4px 0; font-size: 13px;">
            ${pedido.cliente}
          </p>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #4b5563;">
            ${pedido.direccion}
          </p>
          <p style="margin: 0; font-size: 12px;">
            <strong>Comuna:</strong> ${pedido.comuna}
          </p>
          <p style="margin: 8px 0 0 0; padding: 8px; background: #f3f4f6; border-left: 3px solid ${comunaColor}; font-size: 13px; font-weight: 600;">
            ${pedido.productos}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #6b7280; font-style: italic;">
            ⓘ Arrastra este pedido a una ruta para asignarlo
          </p>
        </div>
      `
      
      const infoWindow = new google.maps.InfoWindow({
        content: infoContent,
      })

      marker.addListener('click', () => {
        infoWindow.open(mapRef.current, marker)
      })
    })

    // Marcadores de paradas por ruta
    rutas.filter(r => r.pedidos.length > 0).forEach((ruta) => {
      const routeColor = getRouteColor(ruta.numero)
      const isVisible = selectedRouteFilter === 'all' || selectedRouteFilter === ruta.numero
      
      ruta.pedidos.forEach((pedido, idx) => {
        const isCompra = pedido.tipo === 'compra'
        const markerColor = isCompra ? '#f97316' : routeColor
        
        const marker = new google.maps.Marker({
          position: { lat: pedido.latitude, lng: pedido.longitude },
          map: mapRef.current,
          label: {
            text: `${idx + 1}`,
            color: 'white',
            fontWeight: 'bold',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: markerColor,
            fillOpacity: isVisible ? 1 : 0.3,
            strokeColor: 'white',
            strokeWeight: 2,
          },
          title: isCompra ? `🟠 COMPRA: ${pedido.cliente}` : pedido.cliente,
          visible: isVisible,
        })

        bounds.extend(marker.getPosition()!)
        markersRef.current.push(marker)

        const infoContent = isCompra 
          ? `
            <div style="padding: 12px; min-width: 250px;">
              <p style="font-weight: bold; color: #f97316; margin: 0 0 8px 0; font-size: 14px;">
                🟠 COMPRA - Ruta ${ruta.numero} - Parada ${idx + 1}
              </p>
              <p style="font-weight: 600; margin: 0 0 4px 0; font-size: 13px;">
                ${pedido.cliente}
              </p>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #4b5563;">
                ${pedido.direccion}
              </p>
              <p style="margin: 0; font-size: 12px;">
                <strong>Comuna:</strong> ${pedido.comuna}
              </p>
              <p style="margin: 8px 0 0 0; padding: 8px; background: #fef3c7; border-left: 3px solid #f59e0b; font-size: 12px; font-weight: 600;">
                📦 ${pedido.productos}
              </p>
            </div>
          `
          : `
            <div style="padding: 12px; min-width: 250px;">
              <p style="font-weight: bold; color: ${routeColor}; margin: 0 0 8px 0; font-size: 14px;">
                Ruta ${ruta.numero} - Parada ${idx + 1}
              </p>
              <p style="font-weight: 600; margin: 0 0 4px 0; font-size: 13px;">
                ${pedido.cliente}
              </p>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #4b5563;">
                ${pedido.direccion}
              </p>
              <p style="margin: 0; font-size: 12px;">
                <strong>Comuna:</strong> ${pedido.comuna}
              </p>
              <p style="margin: 8px 0 0 0; padding: 8px; background: #dbeafe; border-left: 3px solid ${routeColor}; font-size: 13px; font-weight: 600;">
                ${pedido.productos}
              </p>
            </div>
          `
        
        const infoWindow = new google.maps.InfoWindow({
          content: infoContent,
        })

        marker.addListener('click', () => {
          infoWindow.open(mapRef.current, marker)
        })
      })
    })

    // Dibujar rutas con polylines usando Directions API (si está habilitado)
    if (showRouteLines) {
      const directionsService = new google.maps.DirectionsService()
      
      rutas.filter(r => r.pedidos.length > 0).forEach(async (ruta) => {
        const routeColor = getRouteColor(ruta.numero)
        const isVisible = selectedRouteFilter === 'all' || selectedRouteFilter === ruta.numero
        
        if (!isVisible) return // No dibujar rutas no visibles
      
      // Preparar waypoints (todos los pedidos de la ruta)
      const waypoints = ruta.pedidos.map(pedido => ({
        location: { lat: pedido.latitude, lng: pedido.longitude },
        stopover: true
      }))
      
      if (waypoints.length === 0) return
      
      // Configurar origen y destino
      const origin = WAREHOUSE_COORDS
      const destination = WAREHOUSE_COORDS
      
      try {
        // Solicitar ruta optimizada a la Directions API
        const result = await directionsService.route({
          origin,
          destination,
          waypoints,
          optimizeWaypoints: false, // Ya están optimizados desde nuestra lógica
          travelMode: google.maps.TravelMode.DRIVING,
        })
        
        // Crear renderer para esta ruta con color específico
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map: mapRef.current,
          directions: result,
          suppressMarkers: true, // No mostrar marcadores por defecto (ya tenemos los nuestros)
          polylineOptions: {
            strokeColor: routeColor,
            strokeWeight: 4,
            strokeOpacity: 0.7,
          },
          preserveViewport: true, // No ajustar automáticamente el viewport
        })
        
        directionsRenderersRef.current.push(directionsRenderer)
        
        console.log(`✅ Ruta ${ruta.numero} dibujada con ${ruta.pedidos.length} paradas`)
      } catch (error) {
        console.error(`Error dibujando ruta ${ruta.numero}:`, error)
      }
    })
    }

    // Ajustar mapa para mostrar todos los marcadores
    if (selectedRouteFilter === 'all') {
      mapRef.current.fitBounds(bounds)
    } else {
      const filteredBounds = new google.maps.LatLngBounds()
      filteredBounds.extend(WAREHOUSE_COORDS)
      
      const selectedRuta = rutas.find(r => r.numero === selectedRouteFilter && r.pedidos.length > 0)
      selectedRuta?.pedidos.forEach((pedido) => {
        filteredBounds.extend({ lat: pedido.latitude, lng: pedido.longitude })
      })
      
      mapRef.current.fitBounds(filteredBounds)
    }

    // Agregar padding
    google.maps.event.addListenerOnce(mapRef.current, 'bounds_changed', () => {
      const zoom = mapRef.current.getZoom()
      if (zoom && zoom > 15) {
        mapRef.current.setZoom(15)
      }
    })
    }, 300) // Debounce de 300ms
    
    return () => clearTimeout(timeoutId)
  }, [rutas, pedidosDisponibles, googleMapsLoaded, mapRefreshKey, selectedRouteFilter, showRouteLines])

  // Función para actualizar vista sin pedido despachado
  const actualizarVistaSinPedido = (orderId: string) => {
    // Remover de pedidos disponibles
    setPedidosDisponibles(prev => prev.filter(p => p.id !== orderId))
    
    // Remover de rutas
    setRutas(prev => prev.map(ruta => ({
      ...ruta,
      pedidos: ruta.pedidos.filter(p => p.id !== orderId),
      capacidadUsada: ruta.pedidos
        .filter(p => p.id !== orderId)
        .reduce((sum, p) => sum + p.cantidadTotal, 0)
    })))
    
    // Agregar a despachados
    setDispatchedOrders(prev => new Set(prev).add(orderId))
  }

  // Cargar pedidos y compras desde Supabase
  const cargarPedidosYCompras = async (forceReload = false) => {
    setLoading(true)
    setError(null)
    
    try {
      // Si es force reload, limpiar rutas actuales primero y resetear mapa
      if (forceReload) {
        console.log('🔄 Force reload: limpiando rutas existentes...')
        setRutas([])
        setExpandedRoutes(new Set())
        
        // Limpiar completamente el mapa para re-inicializarlo
        if (mapRef.current) {
          console.log('🗺️ Limpiando instancia del mapa...')
          mapRef.current = null
        }
        markersRef.current.forEach(marker => marker?.setMap(null))
        markersRef.current = []
        directionsRenderersRef.current.forEach(renderer => renderer?.setMap(null))
        directionsRenderersRef.current = []
      }
      
      // 1. SIEMPRE cargar pedidos frescos desde la BD primero
      console.log('📦 Cargando pedidos y compras desde BD...')
      
      // Cargar datos desde la vista dashboard (más confiable)
      const { data: pedidos, error: pedidosError } = await supabase
        .from('3t_dashboard_ventas')
        .select('*')
        .eq('status', 'Ruta')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
      
      if (pedidosError) {
        console.error('❌ Error al cargar pedidos:', pedidosError)
        throw new Error(`Error al cargar pedidos: ${pedidosError.message}`)
      }
      
      // Cargar compras con queries simples
      const { data: compras, error: comprasError } = await supabase
        .from('3t_purchases')
        .select('*')
        .eq('status', 'Ruta')
        .not('address_id', 'is', null)
      
      if (comprasError) {
        console.error('❌ Error al cargar compras:', comprasError)
      }
      
      // Consultar order_products para pedidos multi-producto
      const orderIds = (pedidos || []).map((p: any) => p.order_id)
      const { data: orderProductsData } = await supabase
        .from('order_products')
        .select('order_id, product_id, quantity')
        .in('order_id', orderIds)
      
      // Cargar todos los productos para mapear IDs a nombres
      const { data: productosData } = await supabase
        .from('3t_products')
        .select('product_id, name')
      
      const productosMap: Record<string, string> = {}
      productosData?.forEach((p: any) => {
        productosMap[p.product_id] = p.name
      })
      
      // Transformar pedidos al formato unificado
      const pedidosTransformados: Pedido[] = (pedidos || []).map(p => {
        // Verificar si tiene productos en order_products
        const productosDelPedido = (orderProductsData || []).filter(
          (op: any) => op.order_id === p.order_id
        )
        
        let cantidadBotellones = 0
        let descripcionProductos = ''
        
        if (productosDelPedido.length > 0) {
          // Pedido multi-producto: calcular solo botellones (PC/PET)
          const detalles: string[] = []
          productosDelPedido.forEach((op: any) => {
            const nombreProducto = productosMap[op.product_id] || 'Producto'
            detalles.push(`${nombreProducto} (x${op.quantity})`)
            
            // Solo contar PC y PET para capacidad
            if (nombreProducto === 'PC' || nombreProducto === 'PET') {
              cantidadBotellones += op.quantity
            }
          })
          descripcionProductos = detalles.join(' + ')
        } else {
          // Pedido antiguo (single-producto)
          const nombreProducto = p.product_name || 'Producto'
          descripcionProductos = `${nombreProducto} (x${p.quantity || 0})`
          
          // Solo contar si es PC o PET
          if (nombreProducto === 'PC' || nombreProducto === 'PET') {
            cantidadBotellones = p.quantity || 0
          }
        }
        
        return {
          id: p.order_id,
          tipo: 'entrega',
          cliente: p.customer_name || 'Sin nombre',
          direccion: p.raw_address || 'Sin dirección',
          comuna: p.commune || 'Sin comuna',
          productos: descripcionProductos,
          cantidadTotal: cantidadBotellones,
          latitude: p.latitude || 0,
          longitude: p.longitude || 0,
          raw_data: p
        }
      })
      
      // Transformar compras al formato unificado (sin joins)
      const comprasTransformadas: Pedido[] = []
      
      for (const compra of (compras || [])) {
        // Cargar datos relacionados individualmente
        const { data: supplier } = await supabase
          .from('3t_suppliers')
          .select('name')
          .eq('supplier_id', compra.supplier_id)
          .single()
        
        const { data: address } = await supabase
          .from('3t_supplier_addresses')
          .select('raw_address, commune, latitude, longitude')
          .eq('address_id', compra.address_id)
          .single()
        
        const { data: purchaseProducts } = await supabase
          .from('3t_purchase_products')
          .select(`
            quantity,
            product:3t_products(name)
          `)
          .eq('purchase_id', compra.purchase_id)
        
        const productos_summary = (purchaseProducts || [])
          .map((pp: any) => `${pp.product?.name || 'Producto'} (x${pp.quantity})`)
          .join(', ') || 'Sin productos'
        
        comprasTransformadas.push({
          id: compra.purchase_id,
          tipo: 'compra',
          cliente: supplier?.name || 'Proveedor',
          direccion: address?.raw_address || 'Sin dirección',
          comuna: address?.commune || 'Sin comuna',
          productos: productos_summary,
          cantidadTotal: 0, // Compras no cuentan para capacidad
          latitude: address?.latitude || WAREHOUSE_COORDS.lat,
          longitude: address?.longitude || WAREHOUSE_COORDS.lng,
          raw_data: compra
        })
      }
      
      // Combinar todos los pedidos
      const todosPedidos = [...comprasTransformadas, ...pedidosTransformados]
      console.log(`✅ ${todosPedidos.length} pedidos cargados (${comprasTransformadas.length} compras + ${pedidosTransformados.length} entregas)`)
      
      // 2. DESPUÉS intentar cargar rutas guardadas (si no es force reload)
      if (!forceReload) {
        const { data: savedRoute, error: savedError } = await supabase
          .from('3t_saved_routes')
          .select('*')
          .eq('is_active', true)
          .single()
        
        if (!savedError && savedRoute && savedRoute.route_data.rutas) {
          console.log('📂 Ruta guardada encontrada, restaurando...')
          const rutasCargadas = savedRoute.route_data.rutas as Ruta[]
          
          // Contar pedidos en rutas guardadas
          const totalPedidosEnRutas = rutasCargadas.reduce((sum, r) => sum + r.pedidos.length, 0)
          console.log(`   └─ ${rutasCargadas.length} rutas con ${totalPedidosEnRutas} pedidos`)
          
          setRutas(rutasCargadas)
          
          // 3. Filtrar pedidos disponibles (ahora SÍ hay pedidos cargados)
          const pedidosEnRutas = new Set(
            rutasCargadas.flatMap(ruta => ruta.pedidos.map(p => p.id))
          )
          const pedidosDisponiblesFiltrados = todosPedidos.filter(p => !pedidosEnRutas.has(p.id))
          setPedidosDisponibles(pedidosDisponiblesFiltrados)
          
          console.log(`   └─ ${pedidosDisponiblesFiltrados.length} pedidos quedan disponibles`)
          
          // Expandir todas las rutas con pedidos
          const rutasConPedidos = rutasCargadas
            .filter((r: Ruta) => r.pedidos.length > 0)
            .map((r: Ruta) => r.numero)
          setExpandedRoutes(new Set(rutasConPedidos))
          
          console.log('✅ Rutas restauradas exitosamente')
          setLoading(false)
          return
        } else {
          console.log('ℹ️ No hay rutas guardadas, mostrando todos los pedidos como disponibles')
        }
      } else {
        console.log('🔄 Force reload activado: mostrando todos los pedidos como disponibles')
      }
      
      // 4. Si no hay ruta guardada o es force reload, mostrar todos como disponibles
      setPedidosDisponibles(todosPedidos)
      
      // Si es force reload, forzar re-render del mapa después de que React actualice el estado
      if (forceReload) {
        // Usar setTimeout para ejecutar DESPUÉS de que React procese los cambios de estado
        setTimeout(() => {
          console.log('🗺️ Forzando re-render del mapa')
          setMapRefreshKey(prev => prev + 1)
        }, 100)
      }
      
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  // Agrupar pedidos por comuna
  const pedidosPorComuna = pedidosDisponibles.reduce((acc, pedido) => {
    const comuna = pedido.comuna
    if (!acc[comuna]) acc[comuna] = []
    acc[comuna].push(pedido)
    return acc
  }, {} as Record<string, Pedido[]>)

  // Handlers de drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeData = active.data.current
    
    if (activeData?.pedido) {
      setActivePedido(activeData.pedido)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActivePedido(null)
    
    if (!over) return
    
    const activeData = active.data.current
    const overData = over.data.current
    
    // CASO 1: Arrastrar desde pedidos disponibles a una ruta
    if (activeData?.tipo === 'pedido-disponible' && overData?.tipo === 'ruta') {
      const pedido = activeData.pedido
      const rutaDestinoNum = overData.rutaNumero
      
      // Mover pedido
      setPedidosDisponibles(prev => prev.filter(p => p.id !== pedido.id))
      
      // Actualizar estado
      setRutas(prev => prev.map(r => 
        r.numero === rutaDestinoNum
          ? {
              ...r,
              pedidos: [...r.pedidos, pedido],
              capacidadUsada: r.capacidadUsada + pedido.cantidadTotal
            }
          : r
      ))
      
      // Recalcular km usando rutasRef (estado actualizado)
      setTimeout(async () => {
        const rutasActualizadas = rutasRef.current
        const rutaActual = rutasActualizadas.find(r => r.numero === rutaDestinoNum)
        
        if (rutaActual && rutaActual.pedidos.length >= 2) {
          try {
            const rutaConKm = await recalcularKilometrosRuta(rutaActual)
            setRutas(prev => prev.map(r => 
              r.numero === rutaConKm.numero ? rutaConKm : r
            ))
            guardarRutasAutomaticamente()
          } catch (error) {
            console.error('Error recalculando km:', error)
          }
        }
      }, 100)
      
      setMapRefreshKey(prev => prev + 1)
    }
    
    // CASO 2: Reordenar pedidos dentro de la misma ruta
    if (activeData?.tipo === 'pedido-en-ruta' && overData?.tipo === 'pedido-en-ruta') {
      const pedidoId = activeData.pedido.id
      const overPedidoId = overData.pedido.id
      
      let rutaNumeroModificado: number | null = null
      
      setRutas(prev => prev.map(ruta => {
        const oldIndex = ruta.pedidos.findIndex(p => p.id === pedidoId)
        const newIndex = ruta.pedidos.findIndex(p => p.id === overPedidoId)
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newPedidos = arrayMove(ruta.pedidos, oldIndex, newIndex)
          rutaNumeroModificado = ruta.numero
          return { ...ruta, pedidos: newPedidos }
        }
        return ruta
      }))
      
      // Recalcular km usando rutasRef
      if (rutaNumeroModificado !== null) {
        setTimeout(async () => {
          const rutasActualizadas = rutasRef.current
          const rutaActual = rutasActualizadas.find(r => r.numero === rutaNumeroModificado)
          
          if (rutaActual && rutaActual.pedidos.length >= 2) {
            try {
              const rutaConKm = await recalcularKilometrosRuta(rutaActual)
              setRutas(prev => prev.map(r => 
                r.numero === rutaConKm.numero ? rutaConKm : r
              ))
              guardarRutasAutomaticamente()
            } catch (error) {
              console.error('Error recalculando km:', error)
            }
          }
        }, 100)
      }
      
      setMapRefreshKey(prev => prev + 1)
    }
    
    // CASO 3: Mover pedido de una ruta a otra ruta
    if (activeData?.tipo === 'pedido-en-ruta' && overData?.tipo === 'ruta') {
      const pedido = activeData.pedido
      const rutaDestinoNum = overData.rutaNumero
      
      // Encontrar las rutas afectadas ANTES de actualizar estado
      const rutaOrigen = rutas.find(r => r.pedidos.some(p => p.id === pedido.id))
      const rutaDestino = rutas.find(r => r.numero === rutaDestinoNum)
      
      if (!rutaOrigen || !rutaDestino) return
      
      // Actualizar estado primero
      setRutas(prev => prev.map(ruta => {
        // Remover de ruta origen
        if (ruta.numero === rutaOrigen.numero) {
          return { 
            ...ruta, 
            pedidos: ruta.pedidos.filter(p => p.id !== pedido.id),
            capacidadUsada: ruta.capacidadUsada - pedido.cantidadTotal
          }
        }
      
        // Agregar a ruta destino
        if (ruta.numero === rutaDestinoNum) {
          return { 
            ...ruta, 
            pedidos: [...ruta.pedidos, pedido],
            capacidadUsada: ruta.capacidadUsada + pedido.cantidadTotal
          }
        }
        
        return ruta
      }))
      
      // Recalcular km usando el estado ACTUALIZADO de rutas
      // Usar setTimeout para asegurar que React ya actualizó el estado
      setTimeout(async () => {
        const rutasActualizadas = rutasRef.current
        const rutaOrigenActual = rutasActualizadas.find(r => r.numero === rutaOrigen.numero)
        const rutaDestinoActual = rutasActualizadas.find(r => r.numero === rutaDestinoNum)
        
        try {
          const [rutaOrigenConKm, rutaDestinoConKm] = await Promise.all([
            rutaOrigenActual && rutaOrigenActual.pedidos.length >= 2 
              ? recalcularKilometrosRuta(rutaOrigenActual)
              : rutaOrigenActual,
            rutaDestinoActual && rutaDestinoActual.pedidos.length >= 2
              ? recalcularKilometrosRuta(rutaDestinoActual) 
              : rutaDestinoActual
          ])
          
          setRutas(prev => prev.map(r => {
            if (rutaOrigenConKm && r.numero === rutaOrigenConKm.numero) return rutaOrigenConKm
            if (rutaDestinoConKm && r.numero === rutaDestinoConKm.numero) return rutaDestinoConKm
            return r
          }))
          
          guardarRutasAutomaticamente()
        } catch (error) {
          console.error('Error recalculando km:', error)
        }
      }, 100) // 100ms para asegurar que el estado se actualizó
      
      setMapRefreshKey(prev => prev + 1)
    }
  }
    
  // Guardar rutas inmediatamente (sin debounce)
  const guardarRutasInmediatamente = async () => {
    try {
      // Usar rutasRef.current para obtener el estado más reciente
      const rutasActuales = rutasRef.current
      
      // No guardar si no hay rutas con pedidos
      if (rutasActuales.length === 0 || rutasActuales.every(r => r.pedidos.length === 0)) {
        console.log('ℹ️ No hay rutas con pedidos para guardar')
        return
      }
      
      // Invalidar ruta anterior
      await supabase
        .from('3t_saved_routes')
        .update({ is_active: false })
        .eq('is_active', true)
      
      // Guardar nueva ruta
      const { error } = await supabase
        .from('3t_saved_routes')
        .insert({
          route_data: { rutas: rutasActuales },
          total_orders: rutasActuales.reduce((sum, r) => sum + r.pedidos.length, 0),
          total_routes: rutasActuales.length,
          is_active: true
        })
      
      if (error) throw error
      
      console.log('✅ Ruta guardada')
    } catch (err: any) {
      console.error('Error guardando ruta:', err)
      setError(`Error al guardar: ${err.message}`)
    }
  }
  
  // Guardar rutas automáticamente con debounce
  const guardarRutasAutomaticamente = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      guardarRutasInmediatamente()
    }, 2000) // Debounce de 2 segundos para evitar guardados excesivos
  }

  // Agregar nueva ruta vacía
  const handleAgregarRuta = () => {
    const nuevoNumero = rutas.length + 1
    const nuevaRuta: Ruta = {
      numero: nuevoNumero,
      pedidos: [],
      capacidadUsada: 0
    }
    
    setRutas(prev => [...prev, nuevaRuta])
    setExpandedRoutes(prev => new Set(prev).add(nuevoNumero))
    setMapRefreshKey(prev => prev + 1)
    guardarRutasAutomaticamente()
  }

  // Eliminar ruta y devolver pedidos a disponibles
  const handleEliminarRuta = (rutaNumero: number) => {
    const rutaAEliminar = rutas.find(r => r.numero === rutaNumero)
    if (!rutaAEliminar) return
    
    // Devolver pedidos a disponibles
    setPedidosDisponibles(prev => [...prev, ...rutaAEliminar.pedidos])
    
    // Eliminar ruta y renumerar
    const rutasFiltradas = rutas
      .filter(r => r.numero !== rutaNumero)
      .map((r, idx) => ({ ...r, numero: idx + 1 }))
    
    setRutas(rutasFiltradas)
    setMapRefreshKey(prev => prev + 1)
    guardarRutasAutomaticamente()
  }

  // Optimizar rutas automáticamente
  const handleOptimizarRutas = async () => {
    if (pedidosDisponibles.length < 2) {
      setError('Se necesitan al menos 2 pedidos para optimizar')
      return
    }

    if (!googleMapsLoaded) {
      setError('Google Maps aún se está cargando. Espera un momento e intenta de nuevo.')
      return
    }

    setOptimizing(true)
    setError(null)

    try {
      // Agrupar por capacidad
      const ordersData = pedidosDisponibles.map(p => ({
        order_id: p.id,
        quantity: p.cantidadTotal,
        commune: p.comuna,
        latitude: p.latitude,
        longitude: p.longitude,
        customer_name: p.cliente,
        raw_address: p.direccion
      }))
      
      const groups = groupOrdersByCapacity(ordersData, MAX_CAPACITY)
      
      console.log(`📊 Optimizando ${groups.length} rutas con Google Maps...`)
      
      // Crear rutas optimizadas con Google Maps (calcular km y orden óptimo)
      const nuevasRutas: Ruta[] = []
      
      for (let idx = 0; idx < groups.length; idx++) {
        const group = groups[idx]
        
        try {
          // Calcular ruta optimizada con Google Maps
          const rutaOptimizada = await calculateOptimizedRoute(group.orders)
          
          // Reordenar pedidos según el orden optimizado
          const pedidosOrdenados = rutaOptimizada.steps.map(step => 
            pedidosDisponibles.find(p => p.id === step.orderId)!
          ).filter(Boolean)
          
          nuevasRutas.push({
            numero: idx + 1,
            pedidos: pedidosOrdenados,
            capacidadUsada: group.totalBottles,
            rutaOptimizada: rutaOptimizada // ✅ Guardar info de km
          })
          
          console.log(`  ✅ Ruta ${idx + 1}: ${rutaOptimizada.totalDistance} - ${rutaOptimizada.totalDuration}`)
        } catch (error) {
          console.warn(`⚠️ Error optimizando ruta ${idx + 1}, usando orden por defecto:`, error)
          // Si falla Google Maps, crear ruta sin optimizar
          const pedidosDeGrupo = group.orders.map(o => 
            pedidosDisponibles.find(p => p.id === o.order_id)!
          ).filter(Boolean)
          
          nuevasRutas.push({
            numero: idx + 1,
            pedidos: pedidosDeGrupo,
            capacidadUsada: group.totalBottles
          })
        }
      }
      
      setRutas(nuevasRutas)
      setPedidosDisponibles([])
      
      // Expandir todas las rutas
      setExpandedRoutes(new Set(nuevasRutas.map(r => r.numero)))
      
    setMapRefreshKey(prev => prev + 1)
      guardarRutasAutomaticamente()
      
      console.log(`✅ ${nuevasRutas.length} rutas optimizadas con kilómetros calculados`)
      
    } catch (err: any) {
      console.error('Error en optimización:', err)
      setError(err.message || 'Error al optimizar rutas')
    } finally {
      setOptimizing(false)
    }
  }

  // Recalcular kilómetros de una ruta específica
  const recalcularKilometrosRuta = async (ruta: Ruta) => {
    if (ruta.pedidos.length < 2) {
      // Si tiene menos de 2 pedidos, no hay ruta que calcular
      return ruta
    }
    
    if (!googleMapsLoaded) {
      console.warn('Google Maps no está cargado, no se pueden calcular km')
      return ruta
    }
    
    try {
      const ordersData = ruta.pedidos.map(p => ({
        order_id: p.id,
        quantity: p.cantidadTotal,
        commune: p.comuna,
        latitude: p.latitude,
        longitude: p.longitude,
        customer_name: p.cliente,
        raw_address: p.direccion
      }))
      
      const rutaOptimizada = await calculateOptimizedRoute(ordersData)
      
      console.log(`📏 Ruta ${ruta.numero} recalculada: ${rutaOptimizada.totalDistance}`)
      
      return {
        ...ruta,
        rutaOptimizada
      }
    } catch (error) {
      console.warn(`Error recalculando km de Ruta ${ruta.numero}:`, error)
      return ruta
    }
  }

  // Toggle expandir ruta
  const toggleRouteExpanded = (rutaNumero: number) => {
    setExpandedRoutes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rutaNumero)) {
        newSet.delete(rutaNumero)
      } else {
        newSet.add(rutaNumero)
      }
      return newSet
    })
  }

  // Calcular warnings de capacidad
  const getCapacityWarning = (ruta: Ruta): number => {
    return Math.max(0, ruta.capacidadUsada - MAX_CAPACITY)
  }

  // Modal de despacho
  const openDeliveryDialog = (pedido: Pedido) => {
    setSelectedPedido(pedido)
    setDeliveryNote('')
    setDeliveryPhoto(null)
    setPhotoPreview(null)
    setDeliveredQuantity(pedido.cantidadTotal || 0)
    setDeliveryDialogOpen(true)
  }

  const closeDeliveryDialog = () => {
    setDeliveryDialogOpen(false)
    setSelectedPedido(null)
    setDeliveryNote('')
    setDeliveryPhoto(null)
    setPhotoPreview(null)
    setDeliveredQuantity(0)
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setDeliveryPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadDeliveryPhoto = async (file: File, orderId: string): Promise<string | null> => {
    try {
      // Importar compresión dinámicamente
      const { compressImage } = await import('@/lib/image-compression')
      
      // Comprimir imagen antes de subir (3MB → ~500KB)
      const compressedFile = await compressImage(file)
      
      const fileExt = 'jpg' // Forzar JPG después de compresión
      const fileName = `${orderId}-${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('delivery-photos')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        })
      
      if (error) throw error
      return data.path
    } catch (error) {
      console.error('Error uploading photo:', error)
      return null
    }
  }

  const confirmDelivery = async () => {
    if (!selectedPedido) return

    setDispatching(true)
    setError(null) // Limpiar errores previos
    
    try {
      let photoPath: string | null = null
      
      if (deliveryPhoto) {
        photoPath = await uploadDeliveryPhoto(deliveryPhoto, selectedPedido.id)
        if (!photoPath) {
          throw new Error('Error al subir la foto')
        }
      }
      
      // Encontrar la ruta a la que pertenece el pedido para obtener los km
      const rutaDelPedido = rutas.find(r => r.pedidos.some(p => p.id === selectedPedido.id))
      let distanciaKm: number | null = null
      
      if (rutaDelPedido?.rutaOptimizada?.distanceMeters) {
        // Convertir metros a kilómetros con 2 decimales
        distanciaKm = Math.round((rutaDelPedido.rutaOptimizada.distanceMeters / 1000) * 100) / 100
      }
      
      // Actualizar en la tabla correspondiente
      if (selectedPedido.tipo === 'entrega') {
        const { error } = await supabase
          .from('3t_orders')
          .update({
            status: 'Despachado',
            delivered_date: new Date().toISOString(),
            details: deliveryNote || null,
            delivery_photo_path: photoPath,
            botellones_entregados: deliveredQuantity,
            route_distance_km: distanciaKm // Guardar kilómetros de la ruta
          })
          .eq('order_id', selectedPedido.id)
        
        if (error) {
          console.error('Error actualizando pedido:', error)
          throw error
        }
      } else {
        const { error } = await supabase
          .from('3t_purchases')
          .update({
            status: 'Completado',
            details: deliveryNote || null
          })
          .eq('purchase_id', selectedPedido.id)
        
        if (error) {
          console.error('Error actualizando compra:', error)
          throw error
        }
      }

      actualizarVistaSinPedido(selectedPedido.id)
      
      // Guardar rutas actualizadas en BD para persistir cambios
      await guardarRutasAutomaticamente()
      
      closeDeliveryDialog()
      
      // Mostrar toast de confirmación
      toast({
        title: '✅ Pedido despachado',
        description: 'El pedido se marcó como despachado exitosamente',
      })
      
    } catch (error: any) {
      console.error('Error al confirmar despacho:', error)
      setError(`Error: ${error.message}`)
      // No cerrar el modal si hay error para que el usuario pueda reintentar
    } finally {
      setDispatching(false)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
        <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">Gestión de Rutas</h2>
              <SimplePopover
                title={RUTAS_HELP.popovers.comoUsar.title}
                description={RUTAS_HELP.popovers.comoUsar.description}
                steps={RUTAS_HELP.popovers.comoUsar.steps}
                module="rutas"
                helpKey="comoUsarRutas"
                place="header"
                trigger={
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                }
              />
            </div>
          <p className="text-muted-foreground mt-1">
              Arrastra pedidos a las rutas o usa optimización automática
            </p>
          </div>
          <div className="flex gap-2">
            <SimpleTooltip content={RUTAS_HELP.tooltips.recargar}>
              <Button 
                onClick={() => cargarPedidosYCompras(true)} 
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recargar
              </Button>
            </SimpleTooltip>
            <DisabledButtonHelper
              disabled={!validationsStore.canOptimize() || optimizing}
              reason={
                !googleMapsLoaded 
                  ? RUTAS_HELP.disabledReasons.mapsNotReady
                  : pedidosDisponibles.length < 2 
                    ? RUTAS_HELP.disabledReasons.needTwoOrders
                    : undefined
              }
              requirements={[
                !googleMapsLoaded && "Espera a que Google Maps termine de cargar",
                pedidosDisponibles.length < 2 && `Necesitas al menos 2 pedidos (tienes ${pedidosDisponibles.length})`
              ].filter(Boolean) as string[]}
            >
              <Button 
                onClick={handleOptimizarRutas}
                disabled={!validationsStore.canOptimize() || optimizing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Optimizando...
                  </>
                ) : (
                  <>
                    <RouteIcon className="w-4 h-4 mr-2" />
                    Optimizar Rutas
                  </>
                )}
              </Button>
            </DisabledButtonHelper>
          </div>
      </div>

      {/* Error */}
      {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
      )}

      {/* Loading */}
      {loading && (
          <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
            <p>Cargando pedidos...</p>
            </div>
        )}

        {/* Sección Superior: Pedidos Disponibles Agrupados por Comuna */}
        {!loading && Object.keys(pedidosPorComuna).length > 0 && (
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle>Pedidos Disponibles ({pedidosDisponibles.length})</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      title={RUTAS_HELP.popovers.pedidosDisponibles.title}
                    >
                      <HelpCircle className="w-3 h-3" />
                    </Button>
                  </div>
                  <CardDescription className="mt-2 text-xs flex flex-wrap gap-x-3 gap-y-1">
                    {Object.keys(pedidosPorComuna).sort().map((comuna) => (
                      <span key={comuna} className="flex items-center gap-1">
                        <span 
                          className="w-3 h-3 rounded-sm" 
                          style={{ 
                            borderLeft: `4px solid ${getComunaColor(comuna)}`
                          }}
                        ></span>
                        <span>{comuna}</span>
                      </span>
                    ))}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  {pedidosDisponibles.reduce((sum, p) => sum + p.cantidadTotal, 0)} botellones total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {pedidosDisponibles.map(pedido => (
                  <TarjetaPedidoDisponible key={pedido.id} pedido={pedido} />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

        {/* Sin pedidos disponibles */}
        {!loading && pedidosDisponibles.length === 0 && rutas.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">No hay pedidos en ruta</p>
              <p className="text-sm">Los pedidos en estado "Ruta" aparecerán aquí automáticamente</p>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Sección Inferior: Rutas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">
                Rutas ({rutas.length})
              </h3>
              <SimplePopover
                title="Gestión de Rutas"
                description="Crea y organiza rutas para las entregas diarias"
                steps={[
                  '• Haz clic en "agregar ruta" para crear una ruta vacía',
                  '• Arrastra pedidos desde "Pedidos Disponibles" a la ruta',
                  '• Usa "Optimizar Rutas" para agrupar automáticamente por proximidad',
                  '• La capacidad máxima es de 55 botellones por ruta',
                ]}
                module="rutas"
                helpKey="gestionRutas"
                place="rutas-section"
                trigger={
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                }
              />
            </div>
            <SimpleTooltip content="Crea una ruta vacía para organizar manualmente los pedidos">
              <Button 
                onClick={handleAgregarRuta}
                variant="outline"
                size="lg"
                className="border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600"
              >
                <Plus className="w-5 h-5 mr-2" />
                agregar ruta
              </Button>
            </SimpleTooltip>
          </div>
          
          {rutas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rutas.map(ruta => (
                <CardRuta
                  key={ruta.numero}
                  ruta={ruta}
                  isExpanded={expandedRoutes.has(ruta.numero)}
                  capacityWarning={getCapacityWarning(ruta)}
                  onToggle={() => toggleRouteExpanded(ruta.numero)}
                  onEliminar={() => handleEliminarRuta(ruta.numero)}
                  onMarcarDespachado={openDeliveryDialog}
                        dispatchedOrders={dispatchedOrders}
                      />
              ))}
            </div>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <RouteIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No hay rutas creadas</p>
                  <p className="text-sm mt-2">Haz clic en "agregar ruta" o arrastra pedidos aquí</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mapa Unificado */}
        {(pedidosDisponibles.length > 0 || (rutas.length > 0 && rutas.some(r => r.pedidos.length > 0))) && (
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle>Mapa de Ubicaciones</CardTitle>
                  <CardDescription>Visualiza todos los pedidos disponibles y las rutas organizadas</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filtros de ruta (solo si hay rutas) */}
                  {rutas.some(r => r.pedidos.length > 0) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <SimpleTooltip content="Mostrar todas las rutas en el mapa">
                        <Button 
                          size="sm"
                          variant={selectedRouteFilter === 'all' ? 'default' : 'outline'}
                          onClick={() => setSelectedRouteFilter('all')}
                        >
                          Todas las Rutas
                        </Button>
                      </SimpleTooltip>
                  {rutas.filter(r => r.pedidos.length > 0).map((ruta) => (
                        <SimpleTooltip key={ruta.numero} content={`Mostrar solo los pedidos de la Ruta ${ruta.numero} en el mapa`}>
                          <Button 
                            size="sm"
                            variant={selectedRouteFilter === ruta.numero ? 'default' : 'outline'}
                            onClick={() => setSelectedRouteFilter(ruta.numero)}
                            style={
                              selectedRouteFilter === ruta.numero 
                                ? { backgroundColor: getRouteColor(ruta.numero), borderColor: getRouteColor(ruta.numero) }
                                : { borderColor: getRouteColor(ruta.numero), color: getRouteColor(ruta.numero) }
                            }
                          >
                            Ruta {ruta.numero}
                          </Button>
                        </SimpleTooltip>
                      ))}
                      
                      {/* Toggle para mostrar/ocultar líneas de ruta */}
                      <div className="ml-auto flex items-center gap-2">
                        <SimpleTooltip content={showRouteLines ? "Ocultar las líneas trazadas de las rutas en el mapa" : "Mostrar las líneas trazadas de las rutas en el mapa"}>
                          <Button
                            size="sm"
                            variant={showRouteLines ? 'default' : 'outline'}
                            onClick={() => setShowRouteLines(!showRouteLines)}
                            className={showRouteLines ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            {showRouteLines ? '✓ Rutas Trazadas' : '○ Mostrar Rutas'}
                          </Button>
                        </SimpleTooltip>
                      </div>
                    </div>
                  )}
                  
                  {/* Mensaje informativo si solo hay pedidos disponibles */}
                  {pedidosDisponibles.length > 0 && !rutas.some(r => r.pedidos.length > 0) && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">📍 Mostrando ubicaciones de pedidos disponibles</p>
                      <p className="text-xs mt-1">Arrastra los pedidos a rutas o usa "Optimizar Rutas" para organizarlos automáticamente</p>
                    </div>
                  )}
                  
                  {/* Mapa único */}
                  <div 
                    id="unified-map"
                    className="h-[600px] md:h-[700px] w-full rounded-lg overflow-hidden border"
                  ></div>
                </CardContent>
              </Card>
        )}

        {/* DragOverlay */}
        <DragOverlay>
          {activePedido ? (
            <Card className="shadow-lg rotate-3 cursor-grabbing">
              <CardContent className="p-3">
                <p className="font-semibold text-sm">{activePedido.cliente}</p>
                <p className="text-xs text-muted-foreground">{activePedido.productos}</p>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>

      {/* Modal de Confirmación de Despacho */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirmar Despacho</DialogTitle>
            <DialogDescription>
              Registra la entrega con una foto y nota opcional
            </DialogDescription>
          </DialogHeader>
          
            {selectedPedido && (
            <div className="space-y-4">
              {/* Info del pedido */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-2 border">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-semibold text-muted-foreground">Cliente:</div>
                    <div className="font-medium">{selectedPedido.cliente}</div>
                  
                  <div className="font-semibold text-muted-foreground">Dirección:</div>
                    <div className="text-xs">{selectedPedido.direccion}</div>
                  
                  <div className="font-semibold text-muted-foreground">Comuna:</div>
                    <div>{selectedPedido.comuna}</div>
                  
                    <div className="font-semibold text-muted-foreground">Productos:</div>
                    <div className="text-xs">{selectedPedido.productos}</div>
                  
                    {selectedPedido.tipo === 'entrega' && (
                      <>
                  <div className="font-semibold text-muted-foreground">Solicitado:</div>
                        <div className="font-bold">{selectedPedido.cantidadTotal} unidades</div>
                      </>
                    )}
                </div>
              </div>

                {/* Cantidad entregada (solo para entregas) */}
                {selectedPedido.tipo === 'entrega' && (
              <div className="space-y-2">
                <Label htmlFor="delivered-quantity" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Cantidad entregada
                </Label>
                <Input 
                  id="delivered-quantity"
                  type="number"
                  inputMode="numeric"
                  min="0"
                      max={selectedPedido.cantidadTotal}
                  value={deliveredQuantity}
                  onChange={(e) => setDeliveredQuantity(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="font-semibold text-lg"
                />
              </div>
                )}

              {/* Nota opcional */}
              <div className="space-y-2">
                <Label htmlFor="delivery-note" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Nota de entrega (opcional)
                </Label>
                <Textarea 
                  id="delivery-note"
                  placeholder="Ej: Cliente no estaba, dejado con conserje..."
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Foto */}
              <div className="space-y-2">
                <Label htmlFor="delivery-photo" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Foto de entrega (opcional)
                </Label>
                <Input 
                  id="delivery-photo"
                  type="file" 
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="cursor-pointer"
                />
                {photoPreview && (
                  <div className="mt-2 relative">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={closeDeliveryDialog}
              disabled={dispatching}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmDelivery} 
              disabled={dispatching}
            >
              {dispatching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Despacho
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel de Validaciones */}
      <SimpleValidationPanel
        items={validationsStore.getValidationItems()}
        defaultOpen={false}
        position="bottom-right"
      />
    </div>
    </DndContext>
  )
}
