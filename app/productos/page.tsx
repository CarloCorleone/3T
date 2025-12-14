'use client'

import { useState, useEffect } from 'react'
import { supabase, type Product } from '@/lib/supabase'
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
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, Package, Edit, Trash2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ProductosPage() {
  const currentUser = useAuthStore(state => state.user)
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  // Formulario nuevo/editar producto
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price_neto: 0,
    pv_iva_inc: 0
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('3t_products')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Error cargando productos:', error)
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }

  const handleCreateProduct = async () => {
    const { data, error } = await supabase
      .from('3t_products')
      .insert([{
        product_id: crypto.randomUUID(),
        name: formData.name,
        category: formData.category,
        price_neto: formData.price_neto,
        image_url: null
        // pv_iva_inc NO se inserta - es columna generada
      }])
      .select()
    
    if (error) {
      console.error('Error creando producto:', error)
      toast({
        variant: 'destructive',
        title: 'Error al crear producto',
        description: error.message
      })
    } else {
      if (currentUser && data && data[0]) {
        await logAudit(
          currentUser.id,
          'product.created',
          'product',
          data[0].product_id,
          undefined,
          {
            name: data[0].name,
            category: data[0].category,
            price_neto: data[0].price_neto
          }
        )
      }
      toast({
        title: 'Producto creado',
        description: 'El producto se creó exitosamente'
      })
      closeDialog()
      loadProducts()
    }
  }

  const handleUpdateProduct = async () => {
    if (!editingProduct) return
    
    const { data, error } = await supabase
      .from('3t_products')
      .update({
        name: formData.name,
        category: formData.category,
        price_neto: formData.price_neto
        // pv_iva_inc NO se actualiza - es columna generada
      })
      .eq('product_id', editingProduct.product_id)
      .select()
    
    if (error) {
      console.error('Error actualizando producto:', error)
      toast({
        variant: 'destructive',
        title: 'Error al actualizar producto',
        description: error.message
      })
    } else {
      if (currentUser && data && data[0]) {
        await logAudit(
          currentUser.id,
          'product.updated',
          'product',
          editingProduct.product_id,
          {
            name: editingProduct.name,
            category: editingProduct.category,
            price_neto: editingProduct.price_neto
          },
          {
            name: data[0].name,
            category: data[0].category,
            price_neto: data[0].price_neto
          }
        )
      }
      toast({
        title: 'Producto actualizado',
        description: 'Los cambios se guardaron correctamente'
      })
      closeDialog()
      loadProducts()
    }
  }

  const handleDeleteProduct = async () => {
    if (!productToDelete) return
    
    const { error } = await supabase
      .from('3t_products')
      .delete()
      .eq('product_id', productToDelete.product_id)
    
    if (error) {
      console.error('Error eliminando producto:', error)
      toast({
        variant: 'destructive',
        title: 'Error al eliminar producto',
        description: error.message
      })
    } else {
      if (currentUser) {
        await logAudit(
          currentUser.id,
          'product.deleted',
          'product',
          productToDelete.product_id,
          {
            name: productToDelete.name,
            category: productToDelete.category,
            price_neto: productToDelete.price_neto
          },
          undefined
        )
      }
      toast({
        title: 'Producto eliminado',
        description: 'El producto se eliminó correctamente'
      })
      setDeleteDialogOpen(false)
      setProductToDelete(null)
      loadProducts()
    }
  }

  const openDeleteDialog = (product: Product) => {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name || '',
      category: product.category || '',
      price_neto: product.price_neto || 0,
      pv_iva_inc: product.pv_iva_inc || 0
    })
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      category: '',
      price_neto: 0,
      pv_iva_inc: 0
    })
  }

  const isContractProduct = formData.category?.toLowerCase().includes('contrato')
  
  const isFormValid = () => {
    if (!formData.name || !formData.category) return false
    // Para productos "Contrato", permitir precio 0
    if (isContractProduct) return true
    // Para otros productos, requiere precio > 0
    return formData.price_neto > 0
  }

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Productos</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona formatos y precios de productos
          </p>
        </div>
        <div className="flex gap-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}</DialogTitle>
                  <DialogDescription>
                    {editingProduct ? 'Modifica la información del producto' : 'Completa la información del nuevo producto'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nombre del Producto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Botellón 20L, Bidón 5L, etc."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      placeholder="Venta, Contrato, Recarga, etc."
                    />
                  </div>
                  
                  {isContractProduct && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-900">
                        Los productos de <strong>Contrato</strong> usan el precio específico de cada cliente (columna <code className="bg-blue-100 px-1 rounded">price</code> en tabla clientes). 
                        Puedes dejar el precio en 0 o poner un precio referencial.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid gap-2">
                    <Label htmlFor="price_neto">
                      Precio Neto (CLP) {!isContractProduct && '*'}
                    </Label>
                    <Input
                      id="price_neto"
                      type="number"
                      value={formData.price_neto}
                      onChange={(e) => {
                        const price = parseFloat(e.target.value) || 0
                        setFormData({
                          ...formData, 
                          price_neto: price,
                          pv_iva_inc: Math.round(price * 1.19)
                        })
                      }}
                      placeholder={isContractProduct ? "0 (precio según cliente)" : "2100"}
                    />
                    {!isContractProduct && (
                      <p className="text-sm text-gray-500">
                        Precio con IVA: ${Math.round(formData.price_neto * 1.19).toLocaleString('es-CL')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={editingProduct ? handleUpdateProduct : handleCreateProduct} 
                    disabled={!isFormValid()}
                  >
                    {editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Listado de Productos */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Listado de Productos</CardTitle>
            <CardDescription>
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabla */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">Cargando productos...</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Precio Neto</TableHead>
                    <TableHead className="text-right">Precio + IVA</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const isContractCategory = product.category?.toLowerCase().includes('contrato')
                    return (
                      <TableRow key={product.product_id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {isContractCategory ? (
                            <span className="text-blue-600 italic">Según cliente</span>
                          ) : (
                            `$${product.price_neto?.toLocaleString('es-CL') || '-'}`
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {isContractCategory ? (
                            <span className="text-blue-600 italic">Según cliente</span>
                          ) : (
                            `$${product.pv_iva_inc?.toLocaleString('es-CL') || '-'}`
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openEditDialog(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openDeleteDialog(product)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
              <DialogTitle>¿Eliminar producto?</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar el producto <strong>{productToDelete?.name}</strong>?
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleDeleteProduct}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}

