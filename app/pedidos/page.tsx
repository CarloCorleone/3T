'use client'

import { useState, useEffect } from 'react'
import { supabase, type Order, type Customer, type Address, type Product } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import { logAudit } from '@/lib/permissions'
import { useToast } from '@/hooks/use-toast'
import { usePedidosRealtime } from '@/hooks/use-pedidos-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Search, ClipboardList, CheckCircle, Truck, Package as PackageIcon, Edit, Trash2, Eye, Filter, AlertCircle, Calendar, FileText, DollarSign, Camera, Share2, Copy } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CustomerSearch } from '@/components/customer-search'
import { CarritoProductos, type ProductoCarrito } from '@/components/carrito-productos'
import { getChileDateString, formatDateForDisplay } from '@/lib/date-utils'

export default function PedidosPage() {
  const { user: currentUser } = useAuthStore()
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('todos')
  const [editingOrder, setEditingOrder] = useState<any | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null)
  const [productosCarrito, setProductosCarrito] = useState<ProductoCarrito[]>([])
  const [orderProducts, setOrderProducts] = useState<Record<string, any[]>>({})
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [orderForDetails, setOrderForDetails] = useState<any | null>(null)
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string | null>(null)

  // Formulario nuevo pedido
  const [formData, setFormData] = useState({
    customer_id: '',
    delivery_address_id: '',
    details: '',
    status: 'Pedido' as 'Pedido' | 'Ruta' | 'Despachado',
    payment_status: 'Pendiente' as 'Pendiente' | 'Pagado' | 'Facturado' | 'Interno',
    payment_type: 'Transferencia' as 'Efectivo' | 'Transferencia',
    order_date: getChileDateString(),
    invoice_number: ''
  })

  useEffect(() => {
    loadOrders()
    loadCustomers()
    loadProducts()
  }, [])

  useEffect(() => {
    if (formData.customer_id) {
      loadAddresses(formData.customer_id)
    }
  }, [formData.customer_id])

  // Debounce para búsqueda
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadOrders()
    }, 500) // Espera 500ms después de que el usuario deja de escribir
    
    return () => clearTimeout(delayDebounce)
  }, [searchTerm, soloPendientes])

  // Suscripción Realtime a cambios en pedidos
  const { isConnected: realtimeConnected } = usePedidosRealtime({
    onInsert: (newOrder) => {
      console.log('[Pedidos] Nuevo pedido creado:', newOrder)
      // Recargar pedidos para obtener datos completos con JOINs
      loadOrders()
      toast({
        title: '📦 Nuevo pedido',
        description: `Pedido creado por otro usuario`,
      })
    },
    onUpdate: (updatedOrder) => {
      console.log('[Pedidos] Pedido actualizado:', updatedOrder)
      // Recargar pedidos para obtener datos completos con JOINs
      loadOrders()
      toast({
        title: '✏️ Pedido actualizado',
        description: `Cambios en pedido ${updatedOrder.order_id || 'sin ID'}`,
      })
    },
    onDelete: (deletedOrder) => {
      console.log('[Pedidos] Pedido eliminado:', deletedOrder)
      // Remover del array local
      setOrders(prev => prev.filter(order => 
        order.order_id !== deletedOrder.order_id
      ))
      toast({
        title: '🗑️ Pedido eliminado',
        description: `Pedido eliminado por otro usuario`,
      })
    }
  })

  const loadOrders = async () => {
    setLoading(true)
    
    let query = supabase
      .from('3t_dashboard_ventas')
      .select('*')
      .order('order_date', { ascending: false })
    
    // Si hay búsqueda o filtro de pendientes, NO limitar y buscar en TODOS los pedidos
    const hayFiltros = (searchTerm && searchTerm.trim()) || soloPendientes
    
    if (searchTerm && searchTerm.trim()) {
      // Búsqueda por nombre de cliente o ID de pedido
      query = query.or(`customer_name.ilike.%${searchTerm}%,order_id.ilike.%${searchTerm}%`)
    }
    
    if (soloPendientes) {
      // Filtrar solo pedidos con pago pendiente
      query = query.eq('payment_status', 'Pendiente')
    }
    
    // Solo aplicar límite si NO hay filtros activos
    if (!hayFiltros) {
      query = query.limit(100) // Limitar a últimos 100 solo cuando no hay filtros
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error cargando pedidos:', error)
      setLoading(false)
      return
    }
    
    // Ordenar pedidos: primero por estado (Ruta > Pedido > Despachado), luego por fecha
    const sortedOrders = (data || []).sort((a, b) => {
      // Definir prioridad de estados
      const statusPriority = { 'Ruta': 1, 'Pedido': 2, 'Despachado': 3 }
      const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 4
      const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 4
      
      // Si tienen diferente prioridad de estado, ordenar por estado
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      // Si tienen la misma prioridad, ordenar por fecha (más reciente primero)
      return new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
    })
    
    setOrders(sortedOrders)
    
    // Cargar productos por pedido en lotes pequeños para evitar URL demasiado larga
    const orderIds = (data || []).map(o => o.order_id)
    if (orderIds.length > 0) {
      // Procesar en lotes de 50 order_ids a la vez
      const batchSize = 50
      const productsByOrder: Record<string, any[]> = {}
      
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batch = orderIds.slice(i, i + batchSize)
        const { data: productsData } = await supabase
          .from('order_products')
          .select('*, product:product_id(name)')
          .in('order_id', batch)
        
        // Agrupar productos por order_id
        if (productsData) {
          productsData.forEach(op => {
            if (!productsByOrder[op.order_id]) {
              productsByOrder[op.order_id] = []
            }
            productsByOrder[op.order_id].push(op)
          })
        }
      }
      
      setOrderProducts(productsByOrder)
    }
    
    setLoading(false)
  }

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('3t_customers')
      .select('*')
      .order('name')
    setCustomers(data || [])
  }

  const loadAddresses = async (customerId: string) => {
    const { data } = await supabase
      .from('3t_addresses')
      .select('*')
      .eq('customer_id', customerId)
    setAddresses(data || [])
    
    // Seleccionar dirección por defecto si existe, o la primera si no hay default
    const defaultAddress = data?.find(a => a.is_default)
    const addressToSelect = defaultAddress || data?.[0]
    
    if (addressToSelect) {
      setFormData(prev => ({ ...prev, delivery_address_id: addressToSelect.address_id }))
    }
  }

  const loadProducts = async () => {
    const { data } = await supabase
      .from('3t_products')
      .select('*')
      .order('name')
    setProducts(data || [])
  }

  const handleCreateOrder = async () => {
    if (productosCarrito.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes agregar al menos un producto al pedido'
      })
      return
    }

    const orderId = crypto.randomUUID().substring(0, 8)
    
    // Calcular precio total sumando todos los productos
    const precioTotal = productosCarrito.reduce((sum, p) => sum + p.subtotal, 0)
    
    // 1. Crear el pedido principal
    const newOrder = {
      order_id: orderId,
      customer_id: formData.customer_id,
      delivery_address_id: formData.delivery_address_id,
      product_type: productosCarrito[0].product_id, // Producto principal para compatibilidad
      quantity: productosCarrito.reduce((sum, p) => sum + p.quantity, 0), // Total de productos
      final_price: precioTotal,
      details: formData.details,
      status: formData.status,
      payment_status: formData.payment_status,
      payment_type: formData.payment_type,
      order_date: formData.order_date,
      order_type: productosCarrito[0].order_type,
      invoice_number: formData.invoice_number || null
    }

    const { data: orderData, error: orderError } = await supabase
      .from('3t_orders')
      .insert([newOrder])
      .select()
    
    if (orderError) {
      console.error('Error creando pedido:', orderError)
      toast({
        variant: 'destructive',
        title: 'Error al crear pedido',
        description: orderError.message
      })
      return
    }

    // 2. Insertar productos en order_products
    const orderProducts = productosCarrito.map(p => ({
      id: crypto.randomUUID(),
      order_id: orderId,
      product_id: p.product_id,
      quantity: Math.floor(p.quantity), // Asegurar integer
      price_neto: Math.floor(p.precio_unitario) // Asegurar numeric como integer
      // total se calcula automáticamente en la BD (quantity * price_neto)
    }))

    console.log('Insertando productos:', orderProducts)

    const { data: insertedProducts, error: productsError } = await supabase
      .from('order_products')
      .insert(orderProducts)
      .select()
    
    if (productsError) {
      console.error('Error insertando productos:', productsError)
      console.error('Detalles del error:', JSON.stringify(productsError, null, 2))
      toast({
        variant: 'destructive',
        title: 'Error al insertar productos',
        description: productsError.message
      })
      // Intentar eliminar el pedido creado para mantener consistencia
      await supabase.from('3t_orders').delete().eq('order_id', orderId)
      return
    }
    
    console.log('Productos insertados exitosamente:', insertedProducts)

    // 3. Actualizar el precio total del pedido ahora que los productos están insertados
    // El trigger detectará que hay productos en order_products y NO recalculará
    const { error: updateError } = await supabase
      .from('3t_orders')
      .update({ final_price: precioTotal })
      .eq('order_id', orderId)
    
    if (updateError) {
      console.error('Error actualizando precio total:', updateError)
    }

    // Auditar creación del pedido
    if (currentUser) {
      const customer = customers.find(c => c.customer_id === formData.customer_id)
      await logAudit(
        currentUser.id,
        'order.created',
        'order',
        orderId,
        undefined,
        {
          order_id: orderId,
          customer_name: customer?.name || 'Cliente desconocido',
          total_products: productosCarrito.length,
          quantity: newOrder.quantity,
          final_price: precioTotal,
          status: formData.status
        }
      )
    }

    toast({
      title: 'Pedido creado exitosamente',
      description: `Se creó el pedido con ${productosCarrito.length} producto(s)`
    })
    closeDialog()
    // loadOrders() eliminado: Realtime detectará el INSERT automáticamente
  }

  const handleUpdateOrder = async () => {
    if (!editingOrder) return
    
    if (productosCarrito.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes agregar al menos un producto al pedido'
      })
      return
    }

    // Calcular precio total sumando todos los productos
    const precioTotal = productosCarrito.reduce((sum, p) => sum + p.subtotal, 0)
    
    const updatedOrder = {
      customer_id: formData.customer_id,
      delivery_address_id: formData.delivery_address_id,
      product_type: productosCarrito[0].product_id, // Producto principal
      quantity: productosCarrito.reduce((sum, p) => sum + p.quantity, 0),
      final_price: precioTotal,
      details: formData.details,
      status: formData.status,
      payment_status: formData.payment_status,
      payment_type: formData.payment_type,
      order_date: formData.order_date,
      order_type: productosCarrito[0].order_type,
      invoice_number: formData.invoice_number || null
    }

    console.log('Actualizando pedido:', editingOrder.order_id, updatedOrder)

    const { data, error } = await supabase
      .from('3t_orders')
      .update(updatedOrder)
      .eq('order_id', editingOrder.order_id)
      .select()
    
    if (error) {
      console.error('Error actualizando pedido:', error)
      toast({
        variant: 'destructive',
        title: 'Error al actualizar pedido',
        description: error.message
      })
      return
    }

    // Eliminar productos anteriores
    await supabase
      .from('order_products')
      .delete()
      .eq('order_id', editingOrder.order_id)

    // Insertar nuevos productos
    const orderProducts = productosCarrito.map(p => ({
      id: crypto.randomUUID(),
      order_id: editingOrder.order_id,
      product_id: p.product_id,
      quantity: Math.floor(p.quantity), // Asegurar integer
      price_neto: Math.floor(p.precio_unitario) // Asegurar numeric como integer
      // total se calcula automáticamente en la BD (quantity * price_neto)
    }))

    console.log('Actualizando productos:', orderProducts)

    const { error: productsError } = await supabase
      .from('order_products')
      .insert(orderProducts)
    
    if (productsError) {
      console.error('Error actualizando productos:', productsError)
      console.error('Detalles del error:', JSON.stringify(productsError, null, 2))
      toast({
        variant: 'destructive',
        title: 'Error al actualizar productos',
        description: productsError.message
      })
      return
    }

    console.log('Pedido actualizado:', data)
    
    // Actualizar el precio total del pedido ahora que los productos están insertados
    // El trigger detectará que hay productos en order_products y NO recalculará
    const { error: updatePriceError } = await supabase
      .from('3t_orders')
      .update({ final_price: precioTotal })
      .eq('order_id', editingOrder.order_id)
    
    if (updatePriceError) {
      console.error('Error actualizando precio total:', updatePriceError)
    }
    
    // Auditar actualización del pedido
    if (currentUser) {
      const customer = customers.find(c => c.customer_id === formData.customer_id)
      await logAudit(
        currentUser.id,
        'order.updated',
        'order',
        editingOrder.order_id,
        {
          status: editingOrder.status,
          payment_status: editingOrder.payment_status,
          final_price: editingOrder.final_price
        },
        {
          order_id: editingOrder.order_id,
          customer_name: customer?.name || 'Cliente desconocido',
          status: formData.status,
          payment_status: formData.payment_status,
          final_price: precioTotal
        }
      )
    }
    
    toast({
      title: 'Pedido actualizado exitosamente',
      description: `Se actualizó el pedido con ${productosCarrito.length} producto(s)`
    })
    closeDialog()
    // loadOrders() eliminado: Realtime detectará el UPDATE automáticamente
  }

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return
    
    const { error } = await supabase
      .from('3t_orders')
      .delete()
      .eq('order_id', orderToDelete.order_id)
    
    if (error) {
      console.error('Error eliminando pedido:', error)
      toast({
        variant: 'destructive',
        title: 'Error al eliminar pedido',
        description: error.message
      })
    } else {
      // Auditar eliminación del pedido
      if (currentUser) {
        await logAudit(
          currentUser.id,
          'order.deleted',
          'order',
          orderToDelete.order_id,
          {
            order_id: orderToDelete.order_id,
            customer_name: orderToDelete.customer_name || 'Cliente desconocido',
            final_price: orderToDelete.final_price,
            status: orderToDelete.status
          },
          undefined
        )
      }
      
      toast({
        title: 'Pedido eliminado',
        description: 'El pedido se eliminó correctamente'
      })
      setDeleteDialogOpen(false)
      setOrderToDelete(null)
      // loadOrders() eliminado: Realtime detectará el DELETE automáticamente
    }
  }

  const openEditDialog = async (order: any) => {
    console.log('Abriendo edición para pedido:', order)
    
    // Cargar el pedido completo desde la tabla 3t_orders
    const { data: fullOrder, error: orderError } = await supabase
      .from('3t_orders')
      .select('*')
      .eq('order_id', order.order_id)
      .single()
    
    if (orderError || !fullOrder) {
      console.error('Error cargando pedido completo:', orderError)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al cargar los datos del pedido'
      })
      return
    }
    
    console.log('Pedido completo cargado:', fullOrder)
    setEditingOrder(fullOrder)
    
    // Cargar las direcciones del cliente
    const { data: addressesData } = await supabase
      .from('3t_addresses')
      .select('*')
      .eq('customer_id', fullOrder.customer_id)
    
    setAddresses(addressesData || [])
    
    // Cargar productos del pedido desde order_products
    const { data: orderProductsData } = await supabase
      .from('order_products')
      .select('*, product:product_id(name)')
      .eq('order_id', order.order_id)
    
    console.log('Productos del pedido:', orderProductsData)
    
    let productosInicial: ProductoCarrito[] = []
    
    if (orderProductsData && orderProductsData.length > 0) {
      // Pedido con múltiples productos (nuevo formato)
      productosInicial = orderProductsData.map((op: any) => {
        const product = products.find(p => p.product_id === op.product_id)
        // Determinar tipo de orden basado en el precio
        let orderType: 'recarga' | 'nuevo' | 'compras' = 'nuevo'
        if (op.price_neto === 0) {
          orderType = 'compras'
        } else {
          const customer = customers.find(c => c.customer_id === fullOrder.customer_id)
          if (customer && customer.price === op.price_neto) {
            orderType = 'recarga'
          }
        }
        
        return {
          product_id: op.product_id,
          product_name: product?.name || op.product?.name || 'Producto',
          quantity: op.quantity,
          precio_unitario: op.price_neto,
          subtotal: op.total || (op.price_neto * op.quantity),
          order_type: orderType
        }
      })
    } else {
      // Pedido viejo con solo product_type (formato antiguo)
      const product = products.find(p => p.product_id === fullOrder.product_type)
      if (product) {
        let orderType: 'recarga' | 'nuevo' | 'compras' = fullOrder.order_type || 'nuevo'
        productosInicial = [{
          product_id: fullOrder.product_type,
          product_name: product.name || 'Producto',
          quantity: fullOrder.quantity || 1,
          precio_unitario: fullOrder.final_price && fullOrder.quantity ? Math.round(fullOrder.final_price / fullOrder.quantity) : 0,
          subtotal: fullOrder.final_price || 0,
          order_type: orderType
        }]
      }
    }
    
    console.log('Productos iniciales para carrito:', productosInicial)
    setProductosCarrito(productosInicial)
    
    // Establecer el formulario
    setFormData({
      customer_id: fullOrder.customer_id,
      delivery_address_id: fullOrder.delivery_address_id || '',
      details: fullOrder.details || '',
      status: fullOrder.status || 'Pedido',
      payment_status: fullOrder.payment_status || 'Pendiente',
      payment_type: fullOrder.payment_type || 'Efectivo',
      order_date: fullOrder.order_date || getChileDateString(),
      invoice_number: fullOrder.invoice_number || ''
    })
    
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (order: any) => {
    setOrderToDelete(order)
    setDeleteDialogOpen(true)
  }

  const openDetailsDialog = async (order: any) => {
    setOrderForDetails(order)
    setDeliveryPhotoUrl(null) // Reset primero
    setDetailsDialogOpen(true)
    
    // Cargar foto de despacho si existe
    if (order.delivery_photo_path) {
      try {
        const { data } = supabase.storage
          .from('delivery-photos')
          .getPublicUrl(order.delivery_photo_path)
        
        if (data?.publicUrl) {
          setDeliveryPhotoUrl(data.publicUrl)
        } else {
          console.error('❌ No se pudo generar URL pública')
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo cargar la foto del despacho'
          })
        }
      } catch (error) {
        console.error('❌ Error cargando foto:', error)
      }
    }
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingOrder(null)
    resetForm()
  }

  const closeDetailsDialog = () => {
    setDetailsDialogOpen(false)
    setOrderForDetails(null)
    setDeliveryPhotoUrl(null)
  }

  const resetForm = () => {
    setFormData({
      customer_id: '',
      delivery_address_id: '',
      details: '',
      status: 'Pedido',
      payment_status: 'Pendiente',
      payment_type: 'Transferencia',
      order_date: getChileDateString(),
      invoice_number: ''
    })
    setAddresses([])
    setProductosCarrito([])
  }

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const updates: any = { status: newStatus }
    
    if (newStatus === 'Despachado') {
      updates.delivered_date = getChileDateString()
      updates.delivery_datetime = new Date().toISOString()
    }

    // Obtener el pedido actual para la auditoría
    const currentOrder = orders.find(o => o.order_id === orderId)

    const { error } = await supabase
      .from('3t_orders')
      .update(updates)
      .eq('order_id', orderId)
    
    if (error) {
      console.error('Error actualizando pedido:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al actualizar el estado del pedido'
      })
    } else {
      // Auditar cambio de estado
      if (currentUser && currentOrder) {
        await logAudit(
          currentUser.id,
          'order.status_changed',
          'order',
          orderId,
          {
            status: currentOrder.status
          },
          {
            order_id: orderId,
            status: newStatus,
            customer_name: currentOrder.customer_name || 'Cliente desconocido'
          }
        )
      }
      
      // loadOrders() eliminado: Realtime detectará el UPDATE automáticamente
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.order_id?.includes(searchTerm)
    
    const matchesTab = activeTab === 'todos' || 
      (activeTab === 'pedidos' && o.status === 'Pedido') ||
      (activeTab === 'ruta' && o.status === 'Ruta') ||
      (activeTab === 'despachado' && o.status === 'Despachado')
    
    return matchesSearch && matchesTab
  })

  const stats = {
    total: orders.length,
    pedidos: orders.filter(o => o.status === 'Pedido').length,
    ruta: orders.filter(o => o.status === 'Ruta').length,
    despachado: orders.filter(o => o.status === 'Despachado').length
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pedidos</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona pedidos y entregas
          </p>
        </div>
        <div className="flex gap-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Pedido
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingOrder ? 'Editar Pedido' : 'Crear Nuevo Pedido'}</DialogTitle>
                  <DialogDescription>
                    {editingOrder ? 'Modifica la información del pedido' : 'Completa la información del pedido'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Cliente */}
                  <div className="grid gap-2">
                    <Label htmlFor="customer">Cliente *</Label>
                    <CustomerSearch
                      customers={customers}
                      value={formData.customer_id}
                      onSelect={(customer) => {
                        setFormData({...formData, customer_id: customer?.customer_id || ''})
                      }}
                      placeholder="Buscar cliente..."
                    />
                  </div>

                  {/* Dirección */}
                  {formData.customer_id && (
                    <div className="grid gap-2">
                      <Label htmlFor="address">Dirección de entrega *</Label>
                      <Select 
                        value={formData.delivery_address_id}
                        onValueChange={(value) => setFormData({...formData, delivery_address_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar dirección" />
                        </SelectTrigger>
                        <SelectContent>
                          {addresses.map((a) => (
                            <SelectItem key={a.address_id} value={a.address_id}>
                              {a.raw_address} {a.is_default && '(Por defecto)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {addresses.length === 0 && (
                        <p className="text-sm text-yellow-600">
                          Este cliente no tiene direcciones registradas
                        </p>
                      )}
                    </div>
                  )}

                  {/* Carrito de Productos */}
                  {formData.customer_id && (
                    <CarritoProductos
                      products={products}
                      customer={customers.find(c => c.customer_id === formData.customer_id) || null}
                      productosIniciales={productosCarrito}
                      onChange={setProductosCarrito}
                    />
                  )}

                  {/* Observaciones */}
                  <div className="grid gap-2">
                    <Label htmlFor="details">Observaciones</Label>
                    <Textarea
                      id="details"
                      value={formData.details}
                      onChange={(e) => setFormData({...formData, details: e.target.value})}
                      placeholder="Notas adicionales sobre el pedido..."
                      rows={3}
                    />
                  </div>

                  {/* Estados */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="status">Estado del pedido</Label>
                      <Select 
                        value={formData.status}
                        onValueChange={(value: any) => setFormData({...formData, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pedido">📋 Pedido</SelectItem>
                          <SelectItem value="Ruta">🚚 En Ruta</SelectItem>
                          <SelectItem value="Despachado">✅ Despachado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="payment_status">Estado de pago</Label>
                      <Select 
                        value={formData.payment_status}
                        onValueChange={(value: any) => setFormData({...formData, payment_status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">⏳ Pendiente</SelectItem>
                          <SelectItem value="Pagado">💵 Pagado</SelectItem>
                          <SelectItem value="Facturado">📄 Facturado</SelectItem>
                          <SelectItem value="Interno">🏢 Interno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="payment_type">Tipo de pago</Label>
                    <Select 
                      value={formData.payment_type}
                      onValueChange={(value: any) => setFormData({...formData, payment_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo">💵 Efectivo</SelectItem>
                        <SelectItem value="Transferencia">🏦 Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campo de número de factura - solo visible cuando payment_status es "Facturado" */}
                  {formData.payment_status === 'Facturado' && (
                    <div className="grid gap-2">
                      <Label htmlFor="invoice_number">Número de Factura</Label>
                      <Input
                        id="invoice_number"
                        placeholder="Ej: F-2025-001"
                        value={formData.invoice_number}
                        onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                      />
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="order_date">Fecha del pedido</Label>
                    <Input
                      id="order_date"
                      type="date"
                      value={formData.order_date}
                      onChange={(e) => setFormData({...formData, order_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={editingOrder ? handleUpdateOrder : handleCreateOrder} 
                    disabled={!formData.customer_id || !formData.delivery_address_id || productosCarrito.length === 0}
                  >
                    {editingOrder ? 'Actualizar Pedido' : 'Crear Pedido'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Listado de Pedidos */}
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Pedidos</CardTitle>
              <Badge variant={realtimeConnected ? "default" : "secondary"} className="ml-2">
                {realtimeConnected ? "🟢 En vivo" : "⚪ Sin conexión"}
              </Badge>
            </div>
            <CardDescription>
              {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Búsqueda y Filtros */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por cliente o ID de pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/30 rounded-md">
                <Filter className="h-4 w-4 text-primary" />
                <Label htmlFor="solo-pendientes" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                  Solo Pendientes
                </Label>
                <Switch
                  id="solo-pendientes"
                  checked={soloPendientes}
                  onCheckedChange={setSoloPendientes}
                />
              </div>
            </div>
            
            {/* Indicador de resultados */}
            {((searchTerm && searchTerm.trim()) || soloPendientes) && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span>
                  Mostrando <strong>{filteredOrders.length}</strong> resultado(s) 
                  {searchTerm && searchTerm.trim() && ` para "${searchTerm}"`}
                  {soloPendientes && ' con pago pendiente'}
                  {' '}<span className="text-primary font-medium">(búsqueda en todos los pedidos)</span>
                </span>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="pedidos">Pedidos ({stats.pedidos})</TabsTrigger>
                <TabsTrigger value="ruta">En Ruta ({stats.ruta})</TabsTrigger>
                <TabsTrigger value="despachado">Despachados ({stats.despachado})</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Tabla */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">Cargando pedidos...</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>N° Factura</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const productsInOrder = orderProducts[order.order_id] || []
                      const hasMultipleProducts = productsInOrder.length > 0
                      
                      return (
                      <TableRow key={order.order_id}>
                        <TableCell className="font-mono text-sm">{order.order_id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer_name}</div>
                            <div className="text-sm text-gray-500">{order.commune}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasMultipleProducts ? (
                            <div>
                              <div className="font-medium">{productsInOrder[0].product?.name || order.product_name}</div>
                              {productsInOrder.length > 1 && (
                                <div className="text-xs text-blue-600">
                                  +{productsInOrder.length - 1} más
                                </div>
                              )}
                            </div>
                          ) : (
                            order.product_name
                          )}
                        </TableCell>
                        <TableCell>
                          {hasMultipleProducts ? (
                            <span title={`${productsInOrder.length} productos distintos`}>
                              {productsInOrder.reduce((sum, p) => sum + p.quantity, 0)} unidades
                            </span>
                          ) : (
                            order.quantity
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          ${order.final_price?.toLocaleString('es-CL')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              order.status === 'Despachado' ? 'default' : 
                              order.status === 'Ruta' ? 'secondary' : 
                              'outline'
                            }
                          >
                            {order.status === 'Pedido' && '📋'}
                            {order.status === 'Ruta' && '🚚'}
                            {order.status === 'Despachado' && '✅'}
                            {' '}{order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              order.payment_status === 'Pagado' || order.payment_status === 'Facturado' ? 
                              'default' : 'outline'
                            }
                          >
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.invoice_number ? (
                            <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {order.invoice_number}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateForDisplay(order.order_date)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end items-center">
                            {hasMultipleProducts && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openDetailsDialog(order)}
                                title="Ver detalles"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openEditDialog(order)}
                              title="Editar pedido"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openDeleteDialog(order)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar pedido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            {order.status !== 'Despachado' && (
                              <Select 
                                value={order.status}
                                onValueChange={(value) => handleUpdateOrderStatus(order.order_id, value)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pedido">📋 Pedido</SelectItem>
                                  <SelectItem value="Ruta">🚚 En Ruta</SelectItem>
                                  <SelectItem value="Despachado">✅ Despachado</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diálogo de confirmación de eliminación */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar pedido?</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar el pedido <strong>#{orderToDelete?.order_id}</strong> del cliente <strong>{orderToDelete?.customer_name}</strong>?
                <br />
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleDeleteOrder}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar Pedido
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de detalles del pedido */}
        <Dialog open={detailsDialogOpen} onOpenChange={(open) => !open && closeDetailsDialog()}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Detalles del Pedido #{orderForDetails?.order_id}</DialogTitle>
              <DialogDescription>
                Información completa del pedido y productos incluidos
              </DialogDescription>
            </DialogHeader>
            {orderForDetails && (
              <div className="space-y-4 overflow-y-auto pr-2">
                {/* Información del pedido */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Cliente</p>
                      <p className="font-medium">{orderForDetails.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dirección</p>
                      <p className="font-medium">{orderForDetails.raw_address}</p>
                      <p className="text-sm text-gray-500">{orderForDetails.commune}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fecha Pedido</p>
                      <p className="font-medium">
                        {formatDateForDisplay(orderForDetails.order_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estado</p>
                      <Badge 
                        variant={
                          orderForDetails.status === 'Despachado' ? 'default' : 
                          orderForDetails.status === 'Ruta' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {orderForDetails.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estado de Pago</p>
                      <Badge variant={orderForDetails.payment_status === 'Pagado' || orderForDetails.payment_status === 'Facturado' ? 'default' : 'outline'}>
                        {orderForDetails.payment_status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tipo de Pago</p>
                      <p className="font-medium">{orderForDetails.payment_type}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Productos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Productos del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderProducts[orderForDetails.order_id]?.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead className="text-right">Precio Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderProducts[orderForDetails.order_id].map((op, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{op.product?.name || 'Producto'}</TableCell>
                              <TableCell className="text-right">{op.quantity}</TableCell>
                              <TableCell className="text-right font-mono">
                                ${op.price_neto?.toLocaleString('es-CL')}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                ${(op.total || op.price_neto * op.quantity)?.toLocaleString('es-CL')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p>{orderForDetails.product_name}</p>
                        <p className="text-sm">Cantidad: {orderForDetails.quantity}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Total */}
                <Card className="bg-primary/10 border-primary/30">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">Total del Pedido:</span>
                      <span className="font-mono font-bold text-2xl text-primary">
                        ${orderForDetails.final_price?.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Observaciones */}
                {orderForDetails.details && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Observaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{orderForDetails.details}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Historial del Pedido */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Historial del Pedido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Fecha de Pedido */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10 dark:bg-primary/20">
                            <Calendar className="h-4 w-4 text-primary dark:text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Fecha de Pedido</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Cuando se creó el pedido</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">
                            {formatDateForDisplay(orderForDetails.order_date)}
                          </span>
                          <Badge variant="default" className="bg-green-500 dark:bg-green-600">✓</Badge>
                        </div>
                      </div>

                      {/* Fecha de Despacho */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                            <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Fecha de Despacho</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Cuando se entregó el pedido</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {orderForDetails.delivered_date ? (
                            <>
                              <span className="font-mono font-semibold">
                                {formatDateForDisplay(orderForDetails.delivered_date)}
                              </span>
                              <Badge variant="default" className="bg-green-500 dark:bg-green-600">✓</Badge>
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 font-medium">Pendiente</span>
                          )}
                        </div>
                      </div>

                      {/* Fecha de Facturación */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                            <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Fecha de Facturación</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Cuando se emitió la factura</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {orderForDetails.invoice_date ? (
                            <>
                              <span className="font-mono font-semibold">
                                {formatDateForDisplay(orderForDetails.invoice_date)}
                              </span>
                              <Badge variant="default" className="bg-green-500 dark:bg-green-600">✓</Badge>
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 font-medium">
                              {orderForDetails.payment_status === 'Facturado' ? 'Sin fecha' : 'No aplica'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fecha de Pago */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Fecha de Pago</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Cuando se recibió el pago</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {orderForDetails.payment_date ? (
                            <>
                              <span className="font-mono font-semibold">
                                {formatDateForDisplay(orderForDetails.payment_date)}
                              </span>
                              <Badge variant="default" className="bg-green-500 dark:bg-green-600">✓</Badge>
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 font-medium">
                              {orderForDetails.payment_status === 'Pagado' ? 'Sin fecha' : 'Pendiente'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Foto de Despacho */}
                {orderForDetails.delivery_photo_path && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Foto de Despacho
                        </CardTitle>
                        {deliveryPhotoUrl && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(deliveryPhotoUrl)
                                toast({
                                  title: 'URL copiada',
                                  description: 'El enlace de la foto se copió al portapapeles'
                                })
                              }}
                              title="Copiar enlace"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  // Descargar la imagen como blob
                                  const response = await fetch(deliveryPhotoUrl)
                                  const blob = await response.blob()
                                  const file = new File(
                                    [blob], 
                                    `pedido-${orderForDetails.order_id}.jpg`, 
                                    { type: 'image/jpeg' }
                                  )
                                  
                                  // Intentar compartir la imagen directamente
                                  if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                    await navigator.share({
                                      title: `Foto de Despacho - Pedido #${orderForDetails.order_id}`,
                                      text: `Foto del despacho del pedido #${orderForDetails.order_id}`,
                                      files: [file]
                                    })
                                  } else {
                                    // Fallback: abrir WhatsApp Web con la URL
                                    const mensaje = `Foto del despacho del pedido #${orderForDetails.order_id}: ${deliveryPhotoUrl}`
                                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
                                    window.open(whatsappUrl, '_blank')
                                  }
                                } catch (error) {
                                  console.log('Error al compartir:', error)
                                  toast({
                                    variant: 'destructive',
                                    title: 'Error al compartir',
                                    description: 'No se pudo compartir la foto. Usa el botón de copiar enlace.'
                                  })
                                }
                              }}
                              title="Compartir foto por WhatsApp"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {deliveryPhotoUrl ? (
                        <>
                          <div className="relative w-full h-[400px] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <img
                              src={deliveryPhotoUrl}
                              alt="Foto de despacho"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                            Foto tomada al momento de la entrega
                          </p>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-[200px] bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Cargando foto...
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t mt-4 shrink-0">
              <Button variant="outline" onClick={closeDetailsDialog}>
                Cerrar
              </Button>
              <Button onClick={() => {
                closeDetailsDialog()
                openEditDialog(orderForDetails)
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Editar Pedido
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}

