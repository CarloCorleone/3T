'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'
import { type Product, type Customer } from '@/lib/supabase'

export interface ProductoCarrito {
  product_id: string
  product_name: string
  quantity: number
  precio_unitario: number
  subtotal: number
  order_type: 'recarga' | 'nuevo' | 'compras'
}

interface CarritoProductosProps {
  products: Product[]
  customer: Customer | null
  productosIniciales?: ProductoCarrito[]
  onChange: (productos: ProductoCarrito[]) => void
}

export function CarritoProductos({ 
  products, 
  customer, 
  productosIniciales = [],
  onChange 
}: CarritoProductosProps) {
  const [productosCarrito, setProductosCarrito] = useState<ProductoCarrito[]>(productosIniciales)
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('')
  const [cantidad, setCantidad] = useState<number>(1)
  const [tipoOrden, setTipoOrden] = useState<'recarga' | 'nuevo' | 'compras'>('nuevo')

  useEffect(() => {
    onChange(productosCarrito)
  }, [productosCarrito, onChange])

  // Reset tipo de orden al cambiar de producto para evitar que se mantenga el anterior
  useEffect(() => {
    if (productoSeleccionado) {
      // Auto-detectar tipo según producto y cliente
      const product = products.find(p => p.product_id === productoSeleccionado)
      if (product) {
        const esPCoPET = product.name?.toLowerCase().includes('pc') || 
                        product.name?.toLowerCase().includes('pet') ||
                        product.category?.toLowerCase().includes('botellón')
        
        // Si es PC/PET y el cliente tiene precio, sugerir recarga
        if (esPCoPET && customer && customer.price && customer.price > 0) {
          setTipoOrden('recarga')
        } else {
          // Para otros productos, siempre nuevo por defecto
          setTipoOrden('nuevo')
        }
      }
    }
  }, [productoSeleccionado, products, customer])

  const calcularPrecioUnitario = (productId: string, tipo: 'recarga' | 'nuevo' | 'compras'): number => {
    if (tipo === 'compras') return 0
    
    if (tipo === 'recarga' && customer) {
      return customer.price || 0
    }
    
    if (tipo === 'nuevo') {
      const product = products.find(p => p.product_id === productId)
      return product?.price_neto || 0
    }
    
    return 0
  }

  const agregarProducto = () => {
    if (!productoSeleccionado) return

    const product = products.find(p => p.product_id === productoSeleccionado)
    if (!product) return

    // Verificar si el producto ya está en el carrito
    const productoExistente = productosCarrito.find(p => p.product_id === productoSeleccionado)
    if (productoExistente) {
      alert('Este producto ya está en el carrito. Puedes modificar su cantidad directamente.')
      return
    }

    const precioUnitario = calcularPrecioUnitario(productoSeleccionado, tipoOrden)
    const nuevoProducto: ProductoCarrito = {
      product_id: productoSeleccionado,
      product_name: product.name || '',
      quantity: cantidad,
      precio_unitario: precioUnitario,
      subtotal: precioUnitario * cantidad,
      order_type: tipoOrden
    }

    setProductosCarrito([...productosCarrito, nuevoProducto])
    
    // Reset form (tipo se reseteará automáticamente por el useEffect)
    setProductoSeleccionado('')
    setCantidad(1)
    setTipoOrden('nuevo') // Reset explícito a nuevo por defecto
  }

  const actualizarCantidad = (productId: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return
    
    setProductosCarrito(productosCarrito.map(p => 
      p.product_id === productId 
        ? { ...p, quantity: nuevaCantidad, subtotal: p.precio_unitario * nuevaCantidad }
        : p
    ))
  }

  const eliminarProducto = (productId: string) => {
    setProductosCarrito(productosCarrito.filter(p => p.product_id !== productId))
  }

  const calcularTotal = () => {
    return productosCarrito.reduce((sum, p) => sum + p.subtotal, 0)
  }

  return (
    <div className="space-y-4">
      {/* Formulario para agregar productos */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Tipo de pedido *</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={tipoOrden === 'recarga' ? 'default' : 'outline'}
                  onClick={() => setTipoOrden('recarga')}
                  size="sm"
                >
                  🔄 Recarga
                </Button>
                <Button
                  type="button"
                  variant={tipoOrden === 'nuevo' ? 'default' : 'outline'}
                  onClick={() => setTipoOrden('nuevo')}
                  size="sm"
                >
                  🆕 Nuevo
                </Button>
                <Button
                  type="button"
                  variant={tipoOrden === 'compras' ? 'default' : 'outline'}
                  onClick={() => setTipoOrden('compras')}
                  size="sm"
                >
                  🛒 Compras
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                💡 El tipo se selecciona automáticamente según el producto. Puedes cambiarlo si necesitas.
              </p>
            </div>

            <div className="grid grid-cols-[1fr,auto,auto] gap-2">
              <div className="grid gap-2">
                <Label htmlFor="product">Producto</Label>
                <Select value={productoSeleccionado} onValueChange={setProductoSeleccionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.product_id} value={p.product_id}>
                        {p.name} - ${p.price_neto?.toLocaleString('es-CL')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                  onFocus={(e) => e.target.select()}
                  className="w-24"
                />
              </div>

              <div className="grid gap-2">
                <Label>&nbsp;</Label>
                <Button 
                  type="button"
                  onClick={agregarProducto}
                  disabled={!productoSeleccionado}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>

            {tipoOrden === 'compras' && (
              <p className="text-xs text-blue-600">
                💡 Tipo "Compras": El precio será automáticamente $0 (sin costo)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de productos en el carrito */}
      {productosCarrito.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Productos en el pedido</h3>
              
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="w-[100px]">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productosCarrito.map((producto) => (
                      <TableRow key={producto.product_id}>
                        <TableCell className="font-medium">{producto.product_name}</TableCell>
                        <TableCell>
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {producto.order_type === 'recarga' && '🔄 Recarga'}
                            {producto.order_type === 'nuevo' && '🆕 Nuevo'}
                            {producto.order_type === 'compras' && '🛒 Compras'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={producto.quantity}
                            onChange={(e) => actualizarCantidad(producto.product_id, parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${producto.precio_unitario.toLocaleString('es-CL')}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          ${producto.subtotal.toLocaleString('es-CL')}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarProducto(producto.product_id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Total */}
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Total del Pedido:</span>
                  <span className="font-mono font-bold text-2xl text-primary">
                    ${calcularTotal().toLocaleString('es-CL')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {productosCarrito.length === 0 && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          <PackageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No hay productos agregados</p>
          <p className="text-sm">Selecciona un producto y agrégalo al pedido</p>
        </div>
      )}
    </div>
  )
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  )
}

