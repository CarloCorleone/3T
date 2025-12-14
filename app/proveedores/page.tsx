'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, type Supplier, type SupplierAddress } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import { logAudit } from '@/lib/permissions'
import { useToast } from '@/hooks/use-toast'
import { RoleGuard } from '@/components/role-guard'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Search, Edit, MapPin, Trash2, AlertCircle, Package } from 'lucide-react'

export default function ProveedoresPage() {
  const currentUser = useAuthStore(state => state.user)
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [addresses, setAddresses] = useState<SupplierAddress[]>([])
  
  // Estados para eliminación de proveedor
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)
  const [deleteDependencies, setDeleteDependencies] = useState({ addresses: 0, purchases: 0 })
  
  // Estados para direcciones
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<SupplierAddress | null>(null)
  const [deleteAddressDialogOpen, setDeleteAddressDialogOpen] = useState(false)
  const [addressToDelete, setAddressToDelete] = useState<SupplierAddress | null>(null)
  const [addressDependencies, setAddressDependencies] = useState({ purchases: 0 })
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
  const autocompleteRef = useRef<any>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)

  // Formulario proveedor
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    observations: ''
  })

  // Formulario dirección
  const [addressFormData, setAddressFormData] = useState({
    raw_address: '',
    commune: '',
    latitude: null as number | null,
    longitude: null as number | null,
    directions: '',
    is_default: false
  })

  useEffect(() => {
    loadSuppliers()
  }, [])

  useEffect(() => {
    // Detectar si Google Maps ya está cargado
    const checkGoogleMaps = () => {
      const google = (window as any).google
      if (google && google.maps && google.maps.places) {
        setGoogleMapsLoaded(true)
      }
    }
    
    // Verificar inmediatamente y cada 100ms hasta que esté disponible
    checkGoogleMaps()
    const interval = setInterval(checkGoogleMaps, 100)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!googleMapsLoaded || !addressDialogOpen) {
      return
    }

    const timer = setTimeout(() => {
      if (!addressInputRef.current) return

      const google = (window as any).google
      if (!google || !google.maps || !google.maps.places) return

      const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
        componentRestrictions: { country: 'cl' },
        fields: ['formatted_address', 'geometry', 'address_components'],
        types: ['address']
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        
        if (!place.geometry) {
          console.error('No se encontró la ubicación')
          return
        }

        let commune = ''
        if (place.address_components) {
          for (const component of place.address_components) {
            if (component.types.includes('administrative_area_level_3') || 
                component.types.includes('locality')) {
              commune = component.long_name
              break
            }
          }
        }

        setAddressFormData(prev => ({
          ...prev,
          raw_address: place.formatted_address || '',
          commune: commune,
          latitude: place.geometry?.location?.lat() || null,
          longitude: place.geometry?.location?.lng() || null
        }))
      })

      autocompleteRef.current = autocomplete
    }, 100)

    return () => {
      clearTimeout(timer)
      if (autocompleteRef.current) {
        const google = (window as any).google
        if (google?.maps?.event) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current)
        }
        autocompleteRef.current = null
      }
    }
  }, [googleMapsLoaded, addressDialogOpen])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('3t_suppliers')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error al cargar proveedores:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAddresses = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from('3t_supplier_addresses')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('is_default', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
    } catch (error) {
      console.error('Error al cargar direcciones:', error)
      setAddresses([])
    }
  }

  const generateSupplierId = () => {
    return Math.random().toString(36).substring(2, 10)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingSupplier) {
        const { data, error } = await supabase
          .from('3t_suppliers')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('supplier_id', editingSupplier.supplier_id)
          .select()

        if (error) throw error
        
        if (currentUser && data && data[0]) {
          await logAudit(
            currentUser.id,
            'supplier.updated',
            'supplier',
            editingSupplier.supplier_id,
            {
              name: editingSupplier.name,
              phone: editingSupplier.phone
            },
            {
              name: data[0].name,
              phone: data[0].phone
            }
          )
        }
      } else {
        const newSupplier = {
          supplier_id: generateSupplierId(),
          ...formData
        }

        const { data, error } = await supabase
          .from('3t_suppliers')
          .insert([newSupplier])
          .select()

        if (error) throw error
        
        if (currentUser && data && data[0]) {
          await logAudit(
            currentUser.id,
            'supplier.created',
            'supplier',
            data[0].supplier_id,
            undefined,
            {
              name: data[0].name,
              phone: data[0].phone
            }
          )
        }
      }

      setIsDialogOpen(false)
      resetForm()
      loadSuppliers()
    } catch (error) {
      console.error('Error al guardar proveedor:', error)
      toast({
        variant: 'destructive',
        title: 'Error al guardar proveedor',
        description: 'Por favor intenta nuevamente'
      })
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      observations: supplier.observations || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (supplier: Supplier) => {
    try {
      const { count: addressCount, error: addrError } = await supabase
        .from('3t_supplier_addresses')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', supplier.supplier_id)

      if (addrError) throw addrError

      const { count: purchaseCount, error: purchError } = await supabase
        .from('3t_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', supplier.supplier_id)

      if (purchError) throw purchError

      setDeleteDependencies({ 
        addresses: addressCount || 0, 
        purchases: purchaseCount || 0 
      })
      setSupplierToDelete(supplier)
      setDeleteDialogOpen(true)
    } catch (error) {
      console.error('Error al verificar dependencias:', error)
        toast({
          variant: 'destructive',
          title: 'Error al verificar dependencias',
          description: 'Por favor intenta nuevamente'
        })
    }
  }

  const confirmDelete = async () => {
    if (!supplierToDelete) return

    if (deleteDependencies.purchases > 0) {
        toast({
          variant: 'destructive',
          title: 'No se puede eliminar',
          description: 'Este proveedor tiene compras asociadas'
        })
      return
    }

    try {
      const { error } = await supabase
        .from('3t_suppliers')
        .delete()
        .eq('supplier_id', supplierToDelete.supplier_id)

      if (error) throw error

      if (currentUser) {
        await logAudit(
          currentUser.id,
          'supplier.deleted',
          'supplier',
          supplierToDelete.supplier_id,
          {
            name: supplierToDelete.name,
            phone: supplierToDelete.phone
          },
          undefined
        )
      }

      setDeleteDialogOpen(false)
      setSupplierToDelete(null)
      loadSuppliers()
    } catch (error) {
      console.error('Error al eliminar proveedor:', error)
      toast({
        variant: 'destructive',
        title: 'Error al eliminar proveedor',
        description: 'Por favor intenta nuevamente'
      })
    }
  }

  const handleAddAddress = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setEditingAddress(null)
    setAddressFormData({
      raw_address: '',
      commune: '',
      latitude: null,
      longitude: null,
      directions: '',
      is_default: false
    })
    loadAddresses(supplier.supplier_id)
    setAddressDialogOpen(true)
  }

  const handleEditAddress = (address: SupplierAddress) => {
    setEditingAddress(address)
    setAddressFormData({
      raw_address: address.raw_address || '',
      commune: address.commune || '',
      latitude: address.latitude || null,
      longitude: address.longitude || null,
      directions: address.directions || '',
      is_default: address.is_default || false
    })
  }

  const handleSubmitAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplier) return

    try {
      if (editingAddress) {
        const { error } = await supabase
          .from('3t_supplier_addresses')
          .update({
            ...addressFormData,
            updated_at: new Date().toISOString()
          })
          .eq('address_id', editingAddress.address_id)

        if (error) throw error
      } else {
        const newAddress = {
          supplier_id: selectedSupplier.supplier_id,
          ...addressFormData
        }

        const { error } = await supabase
          .from('3t_supplier_addresses')
          .insert([newAddress])

        if (error) throw error
      }

      setEditingAddress(null)
      setAddressFormData({
        raw_address: '',
        commune: '',
        latitude: null,
        longitude: null,
        directions: '',
        is_default: false
      })
      loadAddresses(selectedSupplier.supplier_id)
    } catch (error) {
      console.error('Error al guardar dirección:', error)
      toast({
        variant: 'destructive',
        title: 'Error al guardar dirección',
        description: 'Por favor intenta nuevamente'
      })
    }
  }

  const handleDeleteAddress = async (address: SupplierAddress) => {
    try {
      const { count, error } = await supabase
        .from('3t_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('address_id', address.address_id)

      if (error) throw error

      setAddressDependencies({ purchases: count || 0 })
      setAddressToDelete(address)
      setDeleteAddressDialogOpen(true)
    } catch (error) {
      console.error('Error al verificar dependencias:', error)
        toast({
          variant: 'destructive',
          title: 'Error al verificar dependencias',
          description: 'Por favor intenta nuevamente'
        })
    }
  }

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return

    if (addressDependencies.purchases > 0) {
        toast({
          variant: 'destructive',
          title: 'No se puede eliminar',
          description: 'Esta dirección tiene compras asociadas'
        })
      return
    }

    try {
      const { error } = await supabase
        .from('3t_supplier_addresses')
        .delete()
        .eq('address_id', addressToDelete.address_id)

      if (error) throw error

      setDeleteAddressDialogOpen(false)
      setAddressToDelete(null)
      if (selectedSupplier) {
        loadAddresses(selectedSupplier.supplier_id)
      }
    } catch (error) {
      console.error('Error al eliminar dirección:', error)
      toast({
        variant: 'destructive',
        title: 'Error al eliminar dirección',
        description: 'Por favor intenta nuevamente'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      observations: ''
    })
    setEditingSupplier(null)
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <RoleGuard allowedRoles={['admin', 'operador']} showMessage>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">Gestiona los proveedores de productos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </DialogTitle>
              <DialogDescription>
                {editingSupplier ? 'Modifica los datos del proveedor' : 'Completa los datos del nuevo proveedor'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nombre del Proveedor *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ej: Distribuidora XYZ"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+56 9 1234 5678"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contacto@proveedor.cl"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="observations">Observaciones</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Notas adicionales sobre el proveedor..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingSupplier ? 'Guardar Cambios' : 'Crear Proveedor'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
          <CardDescription>
            {filteredSuppliers.length} proveedor{filteredSuppliers.length !== 1 ? 'es' : ''} registrado{filteredSuppliers.length !== 1 ? 's' : ''}
          </CardDescription>
          <div className="flex items-center space-x-2 pt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando proveedores...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Direcciones</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.supplier_id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleAddAddress(supplier)}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Ver Direcciones
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(supplier)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Eliminación de Proveedor */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar al proveedor <strong>{supplierToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          
          {deleteDependencies.purchases > 0 ? (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                No se puede eliminar este proveedor porque tiene {deleteDependencies.purchases} compra{deleteDependencies.purchases !== 1 ? 's' : ''} asociada{deleteDependencies.purchases !== 1 ? 's' : ''}.
              </p>
            </div>
          ) : deleteDependencies.addresses > 0 ? (
            <div className="flex items-center gap-2 p-3 bg-muted border rounded-md">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                Este proveedor tiene {deleteDependencies.addresses} dirección{deleteDependencies.addresses !== 1 ? 'es' : ''} asociada{deleteDependencies.addresses !== 1 ? 's' : ''} que también se eliminarán.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            {deleteDependencies.purchases === 0 && (
              <Button variant="destructive" onClick={confirmDelete}>
                Eliminar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Direcciones */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Direcciones de {selectedSupplier?.name}</DialogTitle>
            <DialogDescription>
              Gestiona las direcciones del proveedor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Formulario para agregar/editar dirección */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingAddress ? 'Editar Dirección' : 'Nueva Dirección'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitAddress} className="space-y-4">
                  <div>
                    <Label htmlFor="raw_address">Dirección *</Label>
                    <Input
                      id="raw_address"
                      ref={addressInputRef}
                      value={addressFormData.raw_address}
                      onChange={(e) => setAddressFormData({ ...addressFormData, raw_address: e.target.value })}
                      placeholder="Escribe la dirección..."
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Usa el autocompletado de Google Maps para obtener coordenadas automáticamente
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="commune">Comuna</Label>
                      <Input
                        id="commune"
                        value={addressFormData.commune}
                        onChange={(e) => setAddressFormData({ ...addressFormData, commune: e.target.value })}
                        placeholder="Ej: Santiago"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                      <Checkbox
                        id="is_default"
                        checked={addressFormData.is_default}
                        onCheckedChange={(checked) => 
                          setAddressFormData({ ...addressFormData, is_default: checked as boolean })
                        }
                      />
                      <Label htmlFor="is_default" className="cursor-pointer">
                        Dirección predeterminada
                      </Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="directions">Indicaciones Adicionales</Label>
                    <Textarea
                      id="directions"
                      value={addressFormData.directions}
                      onChange={(e) => setAddressFormData({ ...addressFormData, directions: e.target.value })}
                      placeholder="Ej: Al lado del supermercado, portón azul..."
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingAddress ? 'Actualizar Dirección' : 'Agregar Dirección'}
                    </Button>
                    {editingAddress && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setEditingAddress(null)
                          setAddressFormData({
                            raw_address: '',
                            commune: '',
                            latitude: null,
                            longitude: null,
                            directions: '',
                            is_default: false
                          })
                        }}
                      >
                        Cancelar Edición
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Lista de direcciones existentes */}
            <div className="space-y-3">
              <h3 className="font-semibold">Direcciones Registradas ({addresses.length})</h3>
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay direcciones registradas para este proveedor
                </p>
              ) : (
                addresses.map((address) => (
                  <Card key={address.address_id} className={address.is_default ? 'border-primary' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{address.raw_address}</p>
                          </div>
                          {address.commune && (
                            <p className="text-sm text-muted-foreground">Comuna: {address.commune}</p>
                          )}
                          {address.directions && (
                            <p className="text-sm text-muted-foreground">
                              Indicaciones: {address.directions}
                            </p>
                          )}
                          {address.is_default && (
                            <Badge variant="default">Predeterminada</Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditAddress(address)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAddress(address)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Eliminación de Dirección */}
      <Dialog open={deleteAddressDialogOpen} onOpenChange={setDeleteAddressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirmar Eliminación de Dirección
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta dirección?
            </DialogDescription>
          </DialogHeader>
          
          {addressDependencies.purchases > 0 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                No se puede eliminar esta dirección porque tiene {addressDependencies.purchases} compra{addressDependencies.purchases !== 1 ? 's' : ''} asociada{addressDependencies.purchases !== 1 ? 's' : ''}.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAddressDialogOpen(false)}>
              Cancelar
            </Button>
            {addressDependencies.purchases === 0 && (
              <Button variant="destructive" onClick={confirmDeleteAddress}>
                Eliminar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </RoleGuard>
  )
}

