'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/role-guard'
import { supabase, type Purchase, type Supplier, type SupplierAddress, type Product, type PurchaseProduct } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import { logAudit } from '@/lib/permissions'
import { useToast } from '@/hooks/use-toast'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, Package, Edit, Trash2, Eye, AlertCircle, History } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ComprasPage() {
  const currentUser = useAuthStore(state => state.user)
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [addresses, setAddresses] = useState<SupplierAddress[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<any | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [purchaseToDelete, setPurchaseToDelete] = useState<any | null>(null)
  const [purchaseProducts, setPurchaseProducts] = useState<Record<string, any[]>>({})
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [purchaseForDetails, setPurchaseForDetails] = useState<any | null>(null)
  const [priceHistoryDialog, setPriceHistoryDialog] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<string>('')
  const [priceHistory, setPriceHistory] = useState<any[]>([])

  // Carrito de productos
  const [productosCarrito, setProductosCarrito] = useState<Array<{
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
  }>>([])

  // Formulario nueva compra
  const [formData, setFormData] = useState({
    supplier_id: '',
    address_id: '',
    supplier_order_number: '',
    observations: '',
    status: 'Pedido' as 'Pedido' | 'Ruta' | 'Completado',
    purchase_date: format(new Date(), 'yyyy-MM-dd')
  })

  useEffect(() => {
    loadPurchases()
    loadSuppliers()
    loadProducts()
  }, [])

  useEffect(() => {
    if (formData.supplier_id) {
      loadAddresses(formData.supplier_id)
    }
  }, [formData.supplier_id])

  const loadPurchases = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('3t_purchases')
      .select(`
        *,
        supplier:supplier_id(name),
        address:address_id(raw_address, commune)
      `)
      .order('purchase_date', { ascending: false })
    
    if (error) {
      console.error('Error cargando compras:', error)
      setLoading(false)
      return
    }
    
    setPurchases(data || [])
    
    // Cargar productos por compra
    const purchaseIds = (data || []).map(p => p.purchase_id)
    if (purchaseIds.length > 0) {
      const { data: productsData } = await supabase
        .from('3t_purchase_products')
        .select('*, product:product_id(name)')
        .in('purchase_id', purchaseIds)
      
      const productsByPurchase: Record<string, any[]> = {}
      if (productsData) {
        productsData.forEach(pp => {
          if (!productsByPurchase[pp.purchase_id]) {
            productsByPurchase[pp.purchase_id] = []
          }
          productsByPurchase[pp.purchase_id].push(pp)
        })
      }
      
      setPurchaseProducts(productsByPurchase)
    }
    
    setLoading(false)
  }

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from('3t_suppliers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error cargando proveedores:', error)
      return
    }

    setSuppliers(data || [])
  }

  const loadAddresses = async (supplierId: string) => {
    const { data, error } = await supabase
      .from('3t_supplier_addresses')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('is_default', { ascending: false })

    if (error) {
      console.error('Error cargando direcciones:', error)
      setAddresses([])
      return
    }

    setAddresses(data || [])

    // Auto-seleccionar dirección predeterminada
    const defaultAddress = data?.find(addr => addr.is_default)
    if (defaultAddress && !formData.address_id) {
      setFormData(prev => ({ ...prev, address_id: defaultAddress.address_id }))
    }
  }

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('3t_products')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error cargando productos:', error)
      return
    }

    setProducts(data || [])
  }

  const loadPriceHistory = async (supplierId: string, productId: string) => {
    const { data, error } = await supabase
      .from('3t_supplier_price_history')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('product_id', productId)
      .order('recorded_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error cargando historial de precios:', error)
      return
    }

    setPriceHistory(data || [])
  }

  const generatePurchaseId = () => {
    return Math.random().toString(36).substring(2, 10)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (productosCarrito.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes agregar al menos un producto'
      })
      return
    }

    const totalPrice = productosCarrito.reduce((sum, p) => sum + p.subtotal, 0)

    try {
      const purchaseId = editingPurchase ? editingPurchase.purchase_id : generatePurchaseId()

      if (editingPurchase) {
        // Actualizar compra existente
        const { data: updatedData, error: purchaseError } = await supabase
          .from('3t_purchases')
          .update({
            supplier_id: formData.supplier_id,
            address_id: formData.address_id || null,
            supplier_order_number: formData.supplier_order_number || null,
            status: formData.status,
            purchase_date: formData.purchase_date,
            final_price: totalPrice,
            observations: formData.observations || null,
            updated_at: new Date().toISOString()
          })
          .eq('purchase_id', editingPurchase.purchase_id)
          .select()

        if (purchaseError) throw purchaseError

        // Eliminar productos anteriores
        const { error: deleteError } = await supabase
          .from('3t_purchase_products')
          .delete()
          .eq('purchase_id', editingPurchase.purchase_id)

        if (deleteError) throw deleteError
        
        if (currentUser) {
          const supplier = suppliers.find(s => s.supplier_id === formData.supplier_id)
          await logAudit(
            currentUser.id,
            'purchase.updated',
            'purchase',
            editingPurchase.purchase_id,
            {
              supplier_id: editingPurchase.supplier_id,
              status: editingPurchase.status,
              final_price: editingPurchase.final_price
            },
            {
              supplier_name: supplier?.name,
              status: formData.status,
              final_price: totalPrice
            }
          )
        }

      } else {
        // Crear nueva compra
        const newPurchase = {
          purchase_id: purchaseId,
          supplier_id: formData.supplier_id,
          address_id: formData.address_id || null,
          supplier_order_number: formData.supplier_order_number || null,
          status: formData.status,
          purchase_date: formData.purchase_date,
          final_price: totalPrice,
          observations: formData.observations || null
        }

        const { data, error: purchaseError } = await supabase
          .from('3t_purchases')
          .insert([newPurchase])
          .select()

        if (purchaseError) throw purchaseError
        
        if (currentUser && data && data[0]) {
          const supplier = suppliers.find(s => s.supplier_id === formData.supplier_id)
          await logAudit(
            currentUser.id,
            'purchase.created',
            'purchase',
            data[0].purchase_id,
            undefined,
            {
              supplier_name: supplier?.name,
              status: formData.status,
              final_price: totalPrice
            }
          )
        }
      }

      // Insertar productos
      const purchaseProductsData = productosCarrito.map(p => ({
        purchase_id: purchaseId,
        product_id: p.product_id,
        quantity: p.quantity,
        unit_price: p.unit_price
      }))

      const { error: productsError } = await supabase
        .from('3t_purchase_products')
        .insert(purchaseProductsData)

      if (productsError) throw productsError

      // Registrar precios en historial
      const priceHistoryData = productosCarrito.map(p => ({
        supplier_id: formData.supplier_id,
        product_id: p.product_id,
        price: p.unit_price,
        purchase_id: purchaseId
      }))

      const { error: historyError } = await supabase
        .from('3t_supplier_price_history')
        .insert(priceHistoryData)

      if (historyError) console.error('Error guardando historial de precios:', historyError)

      setIsDialogOpen(false)
      resetForm()
      loadPurchases()
    } catch (error) {
      console.error('Error al guardar compra:', error)
      toast({
        variant: 'destructive',
        title: 'Error al guardar compra',
        description: 'Por favor intenta nuevamente'
      })
    }
  }

  const handleEdit = async (purchase: any) => {
    setEditingPurchase(purchase)
    setFormData({
      supplier_id: purchase.supplier_id,
      address_id: purchase.address_id || '',
      supplier_order_number: purchase.supplier_order_number || '',
      observations: purchase.observations || '',
      status: purchase.status,
      purchase_date: format(new Date(purchase.purchase_date), 'yyyy-MM-dd')
    })

    // Cargar productos de la compra
    const { data: productsData } = await supabase
      .from('3t_purchase_products')
      .select('*, product:product_id(name)')
      .eq('purchase_id', purchase.purchase_id)

    if (productsData) {
      const cartProducts = productsData.map(pp => ({
        product_id: pp.product_id,
        product_name: pp.product?.name || '',
        quantity: pp.quantity,
        unit_price: Number(pp.unit_price),
        subtotal: Number(pp.total)
      }))
      setProductosCarrito(cartProducts)
    }

    setIsDialogOpen(true)
  }

  const handleDelete = async (purchase: any) => {
    setPurchaseToDelete(purchase)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!purchaseToDelete) return

    try {
      const { error } = await supabase
        .from('3t_purchases')
        .delete()
        .eq('purchase_id', purchaseToDelete.purchase_id)

      if (error) throw error

      if (currentUser) {
        await logAudit(
          currentUser.id,
          'purchase.deleted',
          'purchase',
          purchaseToDelete.purchase_id,
          {
            supplier_name: purchaseToDelete.supplier?.name,
            status: purchaseToDelete.status,
            final_price: purchaseToDelete.final_price
          },
          undefined
        )
      }

      setDeleteDialogOpen(false)
      setPurchaseToDelete(null)
      loadPurchases()
    } catch (error) {
      console.error('Error al eliminar compra:', error)
      toast({
        variant: 'destructive',
        title: 'Error al eliminar compra',
        description: 'Por favor intenta nuevamente'
      })
    }
  }

  const handleViewDetails = async (purchase: any) => {
    const { data: productsData } = await supabase
      .from('3t_purchase_products')
      .select('*, product:product_id(name)')
      .eq('purchase_id', purchase.purchase_id)

    setPurchaseForDetails({ ...purchase, products: productsData || [] })
    setDetailsDialogOpen(true)
  }

  const handleShowPriceHistory = (productId: string) => {
    if (!formData.supplier_id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Selecciona un proveedor primero'
      })
      return
    }
    setSelectedProductForHistory(productId)
    loadPriceHistory(formData.supplier_id, productId)
    setPriceHistoryDialog(true)
  }

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      address_id: '',
      supplier_order_number: '',
      observations: '',
      status: 'Pedido',
      purchase_date: format(new Date(), 'yyyy-MM-dd')
    })
    setProductosCarrito([])
    setEditingPurchase(null)
    setAddresses([])
  }

  const filteredPurchases = purchases.filter(purchase =>
    purchase.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.supplier_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.purchase_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const agregarProducto = (productId: string, quantity: number, unitPrice: number) => {
    const product = products.find(p => p.product_id === productId)
    if (!product) return

    const productoExistente = productosCarrito.find(p => p.product_id === productId)
    if (productoExistente) {
      toast({
        variant: 'destructive',
        title: 'Producto duplicado',
        description: 'Este producto ya está en el carrito'
      })
      return
    }

    const nuevoProducto = {
      product_id: productId,
      product_name: product.name || '',
      quantity,
      unit_price: unitPrice,
      subtotal: quantity * unitPrice
    }

    setProductosCarrito([...productosCarrito, nuevoProducto])
  }

  const actualizarCantidad = (productId: string, nuevaCantidad: number) => {
    setProductosCarrito(productosCarrito.map(p =>
      p.product_id === productId
        ? { ...p, quantity: nuevaCantidad, subtotal: nuevaCantidad * p.unit_price }
        : p
    ))
  }

  const actualizarPrecio = (productId: string, nuevoPrecio: number) => {
    setProductosCarrito(productosCarrito.map(p =>
      p.product_id === productId
        ? { ...p, unit_price: nuevoPrecio, subtotal: p.quantity * nuevoPrecio }
        : p
    ))
  }

  const eliminarProducto = (productId: string) => {
    setProductosCarrito(productosCarrito.filter(p => p.product_id !== productId))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pedido':
        return <Badge variant="secondary">Pedido</Badge>
      case 'Ruta':
        return <Badge className="bg-yellow-500">Ruta</Badge>
      case 'Completado':
        return <Badge className="bg-green-500">Completado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const totalCarrito = productosCarrito.reduce((sum, p) => sum + p.subtotal, 0)

  return (
    <RoleGuard allowedRoles={['admin', 'operador']} showMessage>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Compras</h1>
          <p className="text-muted-foreground">Gestiona las órdenes de compra a proveedores</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Compra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPurchase ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
              </DialogTitle>
              <DialogDescription>
                {editingPurchase ? 'Modifica la orden de compra' : 'Crea una nueva orden de compra'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier_id">Proveedor *</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, supplier_id: value, address_id: '' })
                      setAddresses([])
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.supplier_id} value={supplier.supplier_id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="address_id">Dirección</Label>
                  <Select
                    value={formData.address_id}
                    onValueChange={(value) => setFormData({ ...formData, address_id: value })}
                    disabled={!formData.supplier_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una dirección" />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((address) => (
                        <SelectItem key={address.address_id} value={address.address_id}>
                          {address.raw_address} {address.is_default && '(Predeterminada)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="supplier_order_number">Nº Orden del Proveedor</Label>
                  <Input
                    id="supplier_order_number"
                    value={formData.supplier_order_number}
                    onChange={(e) => setFormData({ ...formData, supplier_order_number: e.target.value })}
                    placeholder="OC-12345"
                  />
                </div>

                <div>
                  <Label htmlFor="purchase_date">Fecha de Compra *</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pedido">Pedido</SelectItem>
                      <SelectItem value="Ruta">Ruta</SelectItem>
                      <SelectItem value="Completado">Completado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="observations">Observaciones</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Notas adicionales..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Carrito de Productos */}
              <Card>
                <CardHeader>
                  <CardTitle>Productos de la Compra</CardTitle>
                  <CardDescription>
                    Agrega los productos que deseas comprar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Agregar Producto */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Producto</Label>
                      <Select
                        value=""
                        onValueChange={(value) => {
                          const cantidad = 1
                          const precioUnitario = 0
                          agregarProducto(value, cantidad, precioUnitario)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.filter(p => !productosCarrito.find(pc => pc.product_id === p.product_id)).map((product) => (
                            <SelectItem key={product.product_id} value={product.product_id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Lista de Productos en el Carrito */}
                  {productosCarrito.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Precio Unitario</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productosCarrito.map((producto) => (
                          <TableRow key={producto.product_id}>
                            <TableCell className="font-medium">{producto.product_name}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                value={producto.quantity}
                                onChange={(e) => actualizarCantidad(producto.product_id, parseInt(e.target.value) || 1)}
                                onFocus={(e) => e.target.select()}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  value={producto.unit_price}
                                  onChange={(e) => actualizarPrecio(producto.product_id, parseFloat(e.target.value) || 0)}
                                  className="w-28"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleShowPriceHistory(producto.product_id)}
                                  title="Ver historial de precios"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>${producto.subtotal.toLocaleString('es-CL')}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => eliminarProducto(producto.product_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                          <TableCell className="font-bold">${totalCarrito.toLocaleString('es-CL')}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}

                  {productosCarrito.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No hay productos en la orden. Selecciona un producto para agregar.
                    </p>
                  )}
                </CardContent>
              </Card>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={productosCarrito.length === 0}>
                  {editingPurchase ? 'Guardar Cambios' : 'Crear Orden'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra</CardTitle>
          <CardDescription>
            {filteredPurchases.length} orden{filteredPurchases.length !== 1 ? 'es' : ''} de compra registrada{filteredPurchases.length !== 1 ? 's' : ''}
          </CardDescription>
          <div className="flex items-center space-x-2 pt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por proveedor o número de orden..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando órdenes...</p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron órdenes' : 'No hay órdenes de compra registradas'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Nº Orden</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => {
                  const products = purchaseProducts[purchase.purchase_id] || []
                  return (
                    <TableRow key={purchase.purchase_id}>
                      <TableCell>
                        {format(new Date(purchase.purchase_date), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">{purchase.supplier?.name}</TableCell>
                      <TableCell>{purchase.supplier_order_number || '-'}</TableCell>
                      <TableCell>
                        {products.length} producto{products.length !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell>${purchase.final_price?.toLocaleString('es-CL') || '0'}</TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(purchase)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(purchase)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(purchase)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalles */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de la Orden de Compra</DialogTitle>
          </DialogHeader>
          {purchaseForDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Proveedor</Label>
                  <p className="font-medium">{purchaseForDetails.supplier?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha</Label>
                  <p>{format(new Date(purchaseForDetails.purchase_date), 'dd/MM/yyyy', { locale: es })}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nº Orden Proveedor</Label>
                  <p>{purchaseForDetails.supplier_order_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-1">{getStatusBadge(purchaseForDetails.status)}</div>
                </div>
              </div>

              {purchaseForDetails.address?.raw_address && (
                <div>
                  <Label className="text-muted-foreground">Dirección</Label>
                  <p>{purchaseForDetails.address.raw_address}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground mb-2">Productos</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseForDetails.products?.map((pp: any) => (
                      <TableRow key={pp.id}>
                        <TableCell>{pp.product?.name}</TableCell>
                        <TableCell>{pp.quantity}</TableCell>
                        <TableCell>${Number(pp.unit_price).toLocaleString('es-CL')}</TableCell>
                        <TableCell>${Number(pp.total).toLocaleString('es-CL')}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                      <TableCell className="font-bold">
                        ${Number(purchaseForDetails.final_price).toLocaleString('es-CL')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {purchaseForDetails.observations && (
                <div>
                  <Label className="text-muted-foreground">Observaciones</Label>
                  <p className="text-sm">{purchaseForDetails.observations}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta orden de compra?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-3 bg-muted border rounded-md">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">
              Esta acción no se puede deshacer. Se eliminarán todos los productos asociados.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Historial de Precios */}
      <Dialog open={priceHistoryDialog} onOpenChange={setPriceHistoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historial de Precios</DialogTitle>
            <DialogDescription>
              Últimos precios registrados con este proveedor
            </DialogDescription>
          </DialogHeader>
          {priceHistory.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay historial de precios para este producto
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceHistory.map((history) => (
                  <TableRow key={history.id}>
                    <TableCell>
                      {format(new Date(history.recorded_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${Number(history.price).toLocaleString('es-CL')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </RoleGuard>
  )
}

