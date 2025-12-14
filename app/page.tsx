'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Users, 
  Package, 
  ClipboardList,
  Loader2,
  PackageCheck,
  Truck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  CheckCircle2,
  Camera,
  Route as RouteIcon,
  MapPin,
  ArrowRight
} from 'lucide-react'

export default function Home() {
  const { toast } = useToast()
  const currentUser = useAuthStore(state => state.user)
  const [userName, setUserName] = useState<string>('')
  
  // Estados para métricas
  const [pedidosHoy, setPedidosHoy] = useState(0)
  const [pedidosPendientes, setPedidosPendientes] = useState(0)
  const [clientesHoy, setClientesHoy] = useState(0)
  const [viajesNecesarios, setViajesNecesarios] = useState(0)
  const [totalUnidades, setTotalUnidades] = useState(0)
  const [pedidosEnRuta, setPedidosEnRuta] = useState(0)
  
  // Estados para lista de pedidos en ruta
  const [todosPedidos, setTodosPedidos] = useState<any[]>([])
  const [filtroPedidos, setFiltroPedidos] = useState<'Ruta' | 'Pedido'>('Ruta')
  
  // Estados para modal de despacho
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null)
  const [deliveryNote, setDeliveryNote] = useState('')
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null)
  const [deliveredQuantity, setDeliveredQuantity] = useState(0)
  const [dispatching, setDispatching] = useState(false)
  
  // Estados para productos y observaciones
  const [productosRutaTotales, setProductosRutaTotales] = useState<Record<string, number>>({})
  const [observacionesImportantes, setObservacionesImportantes] = useState<any[]>([])
  
  // Estados para rutas optimizadas
  const [rutasOptimizadas, setRutasOptimizadas] = useState<any[]>([])
  const [totalParadas, setTotalParadas] = useState(0)
  const [totalBotellones, setTotalBotellones] = useState(0)
  
  const [loading, setLoading] = useState(true)
  const [showAllObservaciones, setShowAllObservaciones] = useState(false)

  useEffect(() => {
    loadDashboardData()
    loadUserData()
  }, [])
  
  const loadUserData = async () => {
    try {
      if (currentUser) {
        // Extraer solo el primer nombre (antes del primer espacio)
        const primerNombre = currentUser.nombre?.split(' ')[0] || currentUser.email?.split('@')[0] || 'Usuario'
        setUserName(primerNombre)
      }
    } catch (error) {
      console.error('Error cargando usuario:', error)
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const hoy = format(new Date(), 'yyyy-MM-dd')
      
      // Queries en paralelo
      const [
        pedidosHoyRes,
        pedidosPendientesRes,
        pedidosEnRutaRes,
        pedidosEnPedidoRes,
        pedidosDespachadosHoyRes,
        productosRutaRes,
        clientesRes,
        productosRes,
        rutasGuardadasRes
      ] = await Promise.all([
        // 1. Pedidos de hoy
        supabase
          .from('3t_orders')
          .select('order_id, customer_id')
          .eq('order_date', hoy),
        
        // 2. Pedidos pendientes totales (para métricas)
        supabase
          .from('3t_orders')
          .select('order_id, customer_id, quantity, details, product_type')
          .in('status', ['Pedido', 'Ruta']),
        
        // 3a. Pedidos en Ruta
        supabase
          .from('3t_dashboard_ventas')
          .select('*')
          .eq('status', 'Ruta')
          .order('order_date', { ascending: false }),
        
        // 3b. Pedidos en estado Pedido
        supabase
          .from('3t_dashboard_ventas')
          .select('*')
          .eq('status', 'Pedido')
          .order('order_date', { ascending: false }),
        
        // 3c. Pedidos despachados HOY (para mostrar en verde al final)
        supabase
          .from('3t_dashboard_ventas')
          .select('*')
          .eq('status', 'Despachado')
          .gte('delivered_date', hoy)
          .order('delivered_date', { ascending: false }),
        
        // 4. Productos solo en Ruta (para totales)
        supabase
          .from('3t_orders')
          .select('order_id, product_type, quantity')
          .eq('status', 'Ruta'),
        
        // 5. Clientes
        supabase
          .from('3t_customers')
          .select('customer_id, name'),
          
        // 6. Productos
        supabase
          .from('3t_products')
          .select('product_id, name'),
        
        // 7. Rutas guardadas activas
        supabase
          .from('3t_saved_routes')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
      ])

      const pedidosHoyData = pedidosHoyRes.data || []
      const pedidosPendientesData = pedidosPendientesRes.data || []
      const pedidosEnRutaData = pedidosEnRutaRes.data || []
      const pedidosEnPedidoData = pedidosEnPedidoRes.data || []
      const pedidosDespachadosHoyData = pedidosDespachadosHoyRes.data || []
      const productosRutaData = productosRutaRes.data || []
      const clientes = clientesRes.data || []
      const productos = productosRes.data || []
      const rutasGuardadas = rutasGuardadasRes.data || []
      
      // Combinar pedidos: primero activos (Ruta + Pedido), luego despachados al final
      const todosPedidosData = [
        ...pedidosEnRutaData, 
        ...pedidosEnPedidoData, 
        ...pedidosDespachadosHoyData
      ]
      
      // Crear mapas para lookups rápidos
      const clientesMap: Record<string, string> = {}
      clientes.forEach((c: any) => {
        if (c.customer_id && c.name) clientesMap[c.customer_id] = c.name
      })
      
      const productosMap: Record<string, string> = {}
      productos.forEach((p: any) => {
        if (p.product_id && p.name) productosMap[p.product_id] = p.name
      })

      // === MÉTRICAS PRINCIPALES ===
      setPedidosHoy(pedidosHoyData.length)
      setPedidosPendientes(pedidosPendientesData.length)
      
      const clientesUnicosHoy = new Set(pedidosHoyData.map(p => p.customer_id)).size
      setClientesHoy(clientesUnicosHoy)
      
      // Calcular viajes SOLO con botellones (PC/PET de categoría "Contrato")
      // Consultar order_products para todos los pedidos pendientes
      const pendingOrderIds = pedidosPendientesData.map((o: any) => o.order_id)
      const { data: pendingOrderProductsData } = await supabase
        .from('order_products')
        .select('order_id, product_id, quantity')
        .in('order_id', pendingOrderIds)
      
      let totalBotellonesPendientes = 0
      
      pedidosPendientesData.forEach((pedido: any) => {
        // Verificar si tiene productos en order_products
        const productosDelPedido = (pendingOrderProductsData || []).filter(
          (op: any) => op.order_id === pedido.order_id
        )
        
        if (productosDelPedido.length > 0) {
          // Pedido multi-producto: sumar solo botellones (PC/PET)
          productosDelPedido.forEach((op: any) => {
            const nombreProducto = productosMap[op.product_id]
            if (nombreProducto === 'PC' || nombreProducto === 'PET') {
              totalBotellonesPendientes += (op.quantity || 0)
            }
          })
        } else {
          // Pedido antiguo (single-producto): verificar si es PC o PET
          const nombreProducto = productosMap[pedido.product_type]
          if (nombreProducto === 'PC' || nombreProducto === 'PET') {
            totalBotellonesPendientes += (pedido.quantity || 0)
          }
        }
      })
      
      setTotalUnidades(totalBotellonesPendientes)
      setViajesNecesarios(Math.ceil(totalBotellonesPendientes / 55))

      // === TODOS LOS PEDIDOS (LISTA) ===
      setTodosPedidos(todosPedidosData)
      
      // Contar pedidos en Ruta específicamente
      const pedidosRutaCount = todosPedidosData.filter((p: any) => p.status === 'Ruta').length
      setPedidosEnRuta(pedidosRutaCount)

      // === PRODUCTOS EN RUTA (TOTALES) ===
      // Consultar order_products para pedidos multi-producto
      const orderIds = productosRutaData.map((o: any) => o.order_id)
      const { data: orderProductsData } = await supabase
        .from('order_products')
        .select('order_id, product_id, quantity')
        .in('order_id', orderIds)
      
      const totales: Record<string, number> = {}
      
      // Procesar cada pedido
      productosRutaData.forEach((pedido: any) => {
        // Verificar si tiene productos en order_products
        const productosDelPedido = (orderProductsData || []).filter(
          (op: any) => op.order_id === pedido.order_id
        )
        
        if (productosDelPedido.length > 0) {
          // Pedido multi-producto: usar order_products
          productosDelPedido.forEach((op: any) => {
            const nombreProducto = productosMap[op.product_id] || 'Sin categoría'
            totales[nombreProducto] = (totales[nombreProducto] || 0) + (op.quantity || 0)
          })
        } else {
          // Pedido antiguo (single-producto): usar product_type
          const nombreProducto = productosMap[pedido.product_type] || 'Sin categoría'
          totales[nombreProducto] = (totales[nombreProducto] || 0) + (pedido.quantity || 0)
        }
      })
      
      setProductosRutaTotales(totales)

      // === OBSERVACIONES IMPORTANTES (SOLO ESTADO RUTA) ===
      // Usamos pedidosEnRutaData que ya está filtrado por status='Ruta'
      // y tiene customer_name de la vista 3t_dashboard_ventas
      const observaciones = pedidosEnRutaData
        .filter((p: any) => p.details && p.details.trim() !== '')
        .map((p: any) => ({
          ...p,
          customerName: p.customer_name || 'Sin nombre'
        }))
      
      setObservacionesImportantes(observaciones)
      
      // === RUTAS OPTIMIZADAS ===
      if (rutasGuardadas && rutasGuardadas[0]) {
        const rutasData = rutasGuardadas[0].route_data?.rutas || []
        
        // Procesar cada ruta para contar PET y PC
        const rutasConConteo = rutasData.map((ruta: any) => {
          const conteo = contarProductosPorTipo(ruta.pedidos || [])
          return {
            numero: ruta.numero,
            paradas: ruta.pedidos?.length || 0,
            capacidad: ruta.capacidadUsada || 0,
            pet: conteo.pet,
            pc: conteo.pc
          }
        })
        
        setRutasOptimizadas(rutasConConteo)
        
        // Calcular totales
        const totalParadasCalc = rutasConConteo.reduce((sum: number, r: any) => sum + r.paradas, 0)
        const totalBotelCalc = rutasConConteo.reduce((sum: number, r: any) => sum + r.capacidad, 0)
        setTotalParadas(totalParadasCalc)
        setTotalBotellones(totalBotelCalc)
      } else {
        setRutasOptimizadas([])
        setTotalParadas(0)
        setTotalBotellones(0)
      }

    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Función para contar productos por tipo (PET/PC)
  const contarProductosPorTipo = (pedidos: any[]) => {
    let pet = 0
    let pc = 0
    
    pedidos.forEach(p => {
      const producto = p.raw_data?.product_name || p.productos || ''
      const cantidad = p.cantidadTotal || 0
      
      if (producto.toLowerCase().includes('pet')) {
        pet += cantidad
      } else if (producto.toLowerCase().includes('pc') || producto.toLowerCase().includes('policarbonato')) {
        pc += cantidad
      }
    })
    
    return { pet, pc }
  }

  // Función de subida de foto con compresión y timeout
  const uploadDeliveryPhoto = async (file: File, orderId: string): Promise<string | null> => {
    try {
      // Importar compresión dinámicamente
      const { compressImage } = await import('@/lib/image-compression')
      
      // Comprimir imagen antes de subir (3MB → ~500KB)
      const compressedFile = await compressImage(file)
      
      const fileExt = 'jpg' // Forzar JPG después de compresión
      const fileName = `${orderId}-${Date.now()}.${fileExt}`
      
      // Timeout de 10 segundos para evitar colgado
      const uploadPromise = supabase.storage
        .from('delivery-photos')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), 10000)
      )
      
      const result: any = await Promise.race([uploadPromise, timeoutPromise])
      
      if (result.error) throw result.error
      return result.data?.path || null
    } catch (error) {
      console.error('Error uploading photo:', error)
      // No bloquear despacho si falla subida
      return null
    }
  }

  // Confirmar despacho
  const confirmDelivery = async () => {
    if (!selectedPedido) return

    setDispatching(true)
    
    try {
      let photoPath: string | null = null
      
      // Subir foto si existe (opcional)
      if (deliveryPhoto) {
        photoPath = await uploadDeliveryPhoto(deliveryPhoto, selectedPedido.order_id)
        if (photoPath) {
          toast({
            title: 'Foto guardada',
            description: 'La foto del despacho se guardó correctamente'
          })
        } else {
          toast({
            variant: 'destructive',
            title: 'Advertencia',
            description: 'El pedido se guardó pero la foto no se pudo subir'
          })
        }
      }

      // Actualizar en tabla 3t_orders
      const { error } = await supabase
        .from('3t_orders')
        .update({
          status: 'Despachado',
          delivered_date: new Date().toISOString(),
          details: deliveryNote || null,
          delivery_photo_path: photoPath,
          botellones_entregados: deliveredQuantity
        })
        .eq('order_id', selectedPedido.order_id)
      
      if (error) {
        console.error('Error actualizando pedido:', error)
        throw error
      }
      
      // Cerrar modal y limpiar estados
      setDeliveryDialogOpen(false)
      setSelectedPedido(null)
      setDeliveryNote('')
      setDeliveryPhoto(null)
      setDeliveredQuantity(0)
      
      // Recargar datos
      await loadDashboardData()
      
    } catch (error) {
      console.error('Error al confirmar despacho:', error)
      toast({
        variant: 'destructive',
        title: 'Error al confirmar despacho',
        description: 'Por favor intenta nuevamente'
      })
    } finally {
      setDispatching(false)
    }
  }

  // Abrir modal de despacho
  const handleDespachar = (pedido: any) => {
    setSelectedPedido(pedido)
    setDeliveredQuantity(pedido.quantity || 0)
    setDeliveryNote('')
    setDeliveryPhoto(null)
    setDeliveryDialogOpen(true)
  }

  // Función para obtener saludo según hora
  const getSaludo = () => {
    const hora = new Date().getHours()
    if (hora < 12) return '☀️ Buenos días'
    if (hora < 20) return '🌤️ Buenas tardes'
    return '🌙 Buenas noches'
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* === 1. SALUDO PERSONALIZADO === */}
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  {getSaludo()} {userName || ''}
                </h2>
                <p className="text-lg">
                  Hoy hay un total de{' '}
                  <span className="font-bold text-primary">{pedidosEnRuta} pedidos en ruta</span>
                  {' '}con{' '}
                  {Object.entries(productosRutaTotales).map(([producto, cantidad], idx, arr) => (
                    <span key={producto}>
                      <span className="font-bold text-primary">{cantidad} {producto}</span>
                      {idx < arr.length - 1 && idx < arr.length - 2 && ', '}
                      {idx === arr.length - 2 && ' y '}
                    </span>
                  ))}
                  {' '}para despachar, requiriendo{' '}
                  <span className="font-bold text-primary">{viajesNecesarios} {viajesNecesarios === 1 ? 'viaje' : 'viajes'}</span>.
                </p>
              </div>
              </CardContent>
            </Card>

          {/* === 2. PEDIDOS EN GESTIÓN + PRODUCTOS EN RUTA === */}
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Truck className="h-6 w-6 text-primary" />
                    Pedidos en Gestión
                  </CardTitle>
                  <CardDescription>
                    Lista de pedidos listos para despachar
                  </CardDescription>
                </div>
                {/* Totales de productos a la derecha */}
                <div className="flex items-center gap-4 text-sm">
                  {Object.entries(productosRutaTotales).map(([producto, cantidad]) => (
                    <div key={producto} className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-bold">{cantidad}</span>
                      <span className="text-muted-foreground">{producto}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1 px-3 py-1 bg-primary/20 rounded-full">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="font-bold">{Object.values(productosRutaTotales).reduce((sum, n) => sum + n, 0)}</span>
                    <span className="text-muted-foreground">Total</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={filtroPedidos} onValueChange={(v) => setFiltroPedidos(v as 'Ruta' | 'Pedido')}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="Ruta">En Ruta ({todosPedidos.filter(p => p.status === 'Ruta').length})</TabsTrigger>
                  <TabsTrigger value="Pedido">Pedidos ({todosPedidos.filter(p => p.status === 'Pedido').length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value={filtroPedidos} className="mt-4">
                  {todosPedidos.filter(p => p.status === filtroPedidos || (filtroPedidos === 'Ruta' && p.status === 'Despachado')).length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                      <PackageCheck className="h-12 w-12 mr-2" />
                      <p>No hay pedidos en estado &quot;{filtroPedidos}&quot;</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* Mostrar pedidos activos primero */}
                      {todosPedidos.filter(p => p.status === filtroPedidos).map((pedido) => (
                        <div 
                          key={pedido.order_id} 
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                        >
                          {/* Contenido principal */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Cliente */}
                            <span className="font-medium truncate min-w-[120px]">
                              {pedido.customer_name}
                            </span>
                            
                            {/* Comuna */}
                            <span className="text-sm text-muted-foreground truncate min-w-[80px]">
                              {pedido.commune}
                            </span>
                            
                            {/* Producto y cantidad */}
                            <span className="text-sm font-medium">
                              {pedido.quantity} {pedido.product_name?.includes('PET') ? 'PET' : pedido.product_name?.includes('PC') ? 'PC' : pedido.product_name}
                            </span>
                          </div>
                          
                          {/* Botón despachar */}
                          <Button 
                            onClick={() => handleDespachar(pedido)}
                            size="sm"
                            variant="ghost"
                            className="ml-4 h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/20"
                            disabled={dispatching}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </Button>
                        </div>
                      ))}
                      
                      {/* Separador si hay pedidos despachados */}
                      {filtroPedidos === 'Ruta' && todosPedidos.filter(p => p.status === 'Despachado').length > 0 && (
                        <div className="flex items-center gap-2 my-3">
                          <div className="flex-1 h-px bg-green-200 dark:bg-green-900"></div>
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium px-2">
                            Despachados Hoy
                          </span>
                          <div className="flex-1 h-px bg-green-200 dark:bg-green-900"></div>
                        </div>
                      )}
                      
                      {/* Mostrar pedidos despachados al final EN VERDE */}
                      {filtroPedidos === 'Ruta' && todosPedidos.filter(p => p.status === 'Despachado').map((pedido) => (
                        <div 
                          key={pedido.order_id} 
                          className="flex items-center justify-between p-3 rounded-lg border-2 border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20 transition-colors"
                        >
                          {/* Contenido principal */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Cliente */}
                            <span className="font-medium truncate min-w-[120px] text-green-700 dark:text-green-300">
                              {pedido.customer_name}
                            </span>
                            
                            {/* Comuna */}
                            <span className="text-sm text-green-600 dark:text-green-400 truncate min-w-[80px]">
                              {pedido.commune}
                            </span>
                            
                            {/* Producto y cantidad */}
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              {pedido.quantity} {pedido.product_name?.includes('PET') ? 'PET' : pedido.product_name?.includes('PC') ? 'PC' : pedido.product_name}
                            </span>
                          </div>
                          
                          {/* Ícono de completado */}
                          <div className="ml-4 flex items-center gap-2">
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              Despachado
                            </span>
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              </CardContent>
            </Card>

          {/* === 3. RESUMEN DE RUTAS OPTIMIZADAS === */}
          {rutasOptimizadas.length > 0 && (
            <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RouteIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Rutas Optimizadas del Día
                </CardTitle>
                <CardDescription>
                  Resumen de rutas planificadas con desglose PET/PC
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rutasOptimizadas.map((ruta, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-900"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900">
                          <span className="font-bold text-blue-600 dark:text-blue-400">R{ruta.numero}</span>
                        </div>
                        <div>
                          <p className="font-semibold">
                            {ruta.paradas} {ruta.paradas === 1 ? 'parada' : 'paradas'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {ruta.capacidad} botellones
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{ruta.pet} PET</p>
                          <p className="text-sm font-medium">{ruta.pc} PC</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Totales */}
                  <div className="pt-3 border-t border-blue-200 dark:border-blue-900">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>Total: {rutasOptimizadas.length} {rutasOptimizadas.length === 1 ? 'ruta' : 'rutas'}</span>
                      <span>{totalParadas} paradas</span>
                      <span>{totalBotellones} botellones</span>
                    </div>
                  </div>
                  
                  {/* Botón ver mapa completo */}
                  <div className="flex justify-center mt-4">
                    <Button className="w-full" variant="default" size="lg" asChild>
                      <a href="/rutas" className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Ver Mapa Completo de Rutas
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* === 5. OBSERVACIONES IMPORTANTES === */}
          {observacionesImportantes.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  Observaciones Importantes
                </CardTitle>
                <CardDescription>
                  Pedidos con notas especiales o instrucciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {observacionesImportantes.slice(0, showAllObservaciones ? undefined : 5).map((pedido, idx) => (
                    <div key={idx} className="text-sm p-3 bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-900">
                      <span className="font-medium text-amber-900 dark:text-amber-100">{pedido.customerName}:</span>{' '}
                      <span className="text-gray-700 dark:text-gray-300">{pedido.details}</span>
                    </div>
                  ))}
                  {observacionesImportantes.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setShowAllObservaciones(!showAllObservaciones)}
                    >
                      {showAllObservaciones ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Mostrar menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Ver {observacionesImportantes.length - 5} más
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* === MODAL DE DESPACHO === */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirmar Despacho</DialogTitle>
            <DialogDescription>
              Registra la entrega con foto opcional y notas
            </DialogDescription>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-4">
              {/* Info del pedido */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-2 border">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-semibold text-muted-foreground">Cliente:</div>
                  <div className="font-medium">{selectedPedido.customer_name}</div>
                  
                  <div className="font-semibold text-muted-foreground">Dirección:</div>
                  <div className="text-xs">{selectedPedido.street_address}</div>
                  
                  <div className="font-semibold text-muted-foreground">Comuna:</div>
                  <div>{selectedPedido.commune}</div>
                  
                  <div className="font-semibold text-muted-foreground">Producto:</div>
                  <div className="text-xs">{selectedPedido.product_name}</div>
                  
                  <div className="font-semibold text-muted-foreground">Solicitado:</div>
                  <div className="font-bold">{selectedPedido.quantity} unidades</div>
                        </div>
                      </div>

              {/* Cantidad entregada */}
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
                  max={selectedPedido.quantity}
                  value={deliveredQuantity}
                  onChange={(e) => setDeliveredQuantity(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="font-semibold text-lg"
                />
                      </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="delivery-notes" className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Notas del despacho (opcional)
                </Label>
                <Textarea 
                  id="delivery-notes"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Ej: Recibido por Juan Pérez, entregado en portería..."
                  rows={3}
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
                  onChange={(e) => setDeliveryPhoto(e.target.files?.[0] || null)}
                />
                {deliveryPhoto && (
                  <p className="text-xs text-muted-foreground">
                    Archivo seleccionado: {deliveryPhoto.name}
                  </p>
                )}
                  </div>
                </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeliveryDialogOpen(false)}
              disabled={dispatching}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmDelivery}
              disabled={dispatching || deliveredQuantity <= 0}
            >
              {dispatching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Despacho
        </>
      )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
