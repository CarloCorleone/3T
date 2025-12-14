'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, type Customer, type Address } from '@/lib/supabase'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Search, Edit, MapPin, Home as HomeIcon, Building, Trash2, AlertCircle } from 'lucide-react'

export default function ClientesPage() {
  const currentUser = useAuthStore(state => state.user)
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  
  // Estados para eliminación de cliente
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [deleteDependencies, setDeleteDependencies] = useState({ addresses: 0, orders: 0 })
  
  // Estados para direcciones
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [deleteAddressDialogOpen, setDeleteAddressDialogOpen] = useState(false)
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null)
  const [addressDependencies, setAddressDependencies] = useState({ orders: 0 })
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
  const autocompleteRef = useRef<any>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)

  // Formulario cliente
  const [formData, setFormData] = useState({
    name: '',
    customer_type: 'Hogar' as 'Hogar' | 'Empresa',
    phone: '',
    email: '',
    business_name: '',
    rut: '',
    contact_name: '',
    price: 2500
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
    loadCustomers()
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

    // Pequeño delay para asegurar que el DOM está listo
    const timer = setTimeout(() => {
      if (!addressInputRef.current) return

      const google = (window as any).google
      if (!google || !google.maps || !google.maps.places) return

      // Crear nueva instancia de Autocomplete
      const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
        componentRestrictions: { country: 'cl' },
        fields: ['formatted_address', 'geometry', 'address_components'],
        types: ['address']
      })

      // Listener para cuando se selecciona un lugar
      const placeChangedListener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        
        if (!place || !place.geometry || !place.geometry.location) {
          return
        }

        // Extraer comuna
        let commune = ''
        if (place.address_components) {
          const communeComponent = place.address_components.find((component: any) =>
            component.types.includes('administrative_area_level_3') ||
            component.types.includes('locality')
          )
          commune = communeComponent ? communeComponent.long_name : ''
        }

        // Actualizar el estado con un pequeño delay para evitar que cierre el modal
        setTimeout(() => {
          const newData = {
            raw_address: place.formatted_address || '',
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            commune: commune,
            directions: addressFormData.directions,
            is_default: addressFormData.is_default
          }

          setAddressFormData(newData)
        }, 50)
      })

      autocompleteRef.current = autocomplete
    }, 300)

    // Cleanup
    return () => {
      clearTimeout(timer)
      if (autocompleteRef.current) {
        const google = (window as any).google
        if (google && google.maps && google.maps.event) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current)
        }
      }
    }
  }, [googleMapsLoaded, addressDialogOpen])

  const loadCustomers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('3t_customers')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Error cargando clientes:', error)
    } else {
      setCustomers(data || [])
    }
    setLoading(false)
  }

  const loadAddresses = async (customerId: string) => {
    const { data, error } = await supabase
      .from('3t_addresses')
      .select('*')
      .eq('customer_id', customerId)
    
    if (error) {
      console.error('Error cargando direcciones:', error)
    } else {
      setAddresses(data || [])
    }
  }

  const handleCreateCustomer = async () => {
    const { data, error } = await supabase
      .from('3t_customers')
      .insert([{
        ...formData,
        customer_id: crypto.randomUUID()
      }])
      .select()
    
    if (error) {
      console.error('Error creando cliente:', error)
      toast({
        variant: 'destructive',
        title: 'Error al crear cliente',
        description: error.message || 'Por favor intenta nuevamente'
      })
    } else {
      if (currentUser && data && data[0]) {
        await logAudit(
          currentUser.id,
          'customer.created',
          'customer',
          data[0].customer_id,
          undefined,
          {
            name: data[0].name,
            customer_type: data[0].customer_type,
            phone: data[0].phone
          }
        )
      }
      toast({
        title: 'Cliente creado',
        description: 'El cliente se creó exitosamente'
      })
      closeDialog()
      loadCustomers()
    }
  }

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return
    
    const { data, error } = await supabase
      .from('3t_customers')
      .update({
        name: formData.name,
        customer_type: formData.customer_type,
        phone: formData.phone,
        email: formData.email,
        business_name: formData.business_name,
        rut: formData.rut,
        contact_name: formData.contact_name,
        price: formData.price
      })
      .eq('customer_id', editingCustomer.customer_id)
      .select()
    
    if (error) {
      console.error('Error actualizando cliente:', error)
      toast({
        variant: 'destructive',
        title: 'Error al actualizar cliente',
        description: error.message
      })
    } else {
      if (currentUser && data && data[0]) {
        await logAudit(
          currentUser.id,
          'customer.updated',
          'customer',
          editingCustomer.customer_id,
          {
            name: editingCustomer.name,
            customer_type: editingCustomer.customer_type,
            phone: editingCustomer.phone
          },
          {
            name: data[0].name,
            customer_type: data[0].customer_type,
            phone: data[0].phone
          }
        )
      }
      toast({
        title: 'Cliente actualizado',
        description: 'Los cambios se guardaron correctamente'
      })
      closeDialog()
      loadCustomers()
    }
  }

  const openEditDialog = async (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name || '',
      customer_type: customer.customer_type || 'Hogar',
      phone: customer.phone || '',
      email: customer.email || '',
      business_name: customer.business_name || '',
      rut: customer.rut || '',
      contact_name: customer.contact_name || '',
      price: customer.price || 2500
    })
    await loadAddresses(customer.customer_id)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingCustomer(null)
    setFormData({
      name: '',
      customer_type: 'Hogar',
      phone: '',
      email: '',
      business_name: '',
      rut: '',
      contact_name: '',
      price: 2500
    })
    setAddresses([])
  }

  const checkCustomerDependencies = async (customerId: string) => {
    const { count: addressCount } = await supabase
      .from('3t_addresses')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
    
    const { count: orderCount } = await supabase
      .from('3t_orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
    
    return {
      addresses: addressCount || 0,
      orders: orderCount || 0
    }
  }

  const openDeleteDialog = async (customer: Customer) => {
    setCustomerToDelete(customer)
    const deps = await checkCustomerDependencies(customer.customer_id)
    setDeleteDependencies(deps)
    setDeleteDialogOpen(true)
  }

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return
    
    const { error } = await supabase
      .from('3t_customers')
      .delete()
      .eq('customer_id', customerToDelete.customer_id)
    
    if (error) {
      console.error('Error eliminando cliente:', error)
      toast({
        variant: 'destructive',
        title: 'Error al eliminar cliente',
        description: error.message
      })
    } else {
      if (currentUser) {
        await logAudit(
          currentUser.id,
          'customer.deleted',
          'customer',
          customerToDelete.customer_id,
          {
            name: customerToDelete.name,
            customer_type: customerToDelete.customer_type,
            phone: customerToDelete.phone
          },
          undefined
        )
      }
      toast({
        title: 'Cliente eliminado',
        description: 'El cliente se eliminó correctamente'
      })
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
      loadCustomers()
    }
  }

  // Funciones para direcciones
  const openAddressDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address)
      setAddressFormData({
        raw_address: address.raw_address || '',
        commune: address.commune || '',
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
        directions: address.directions || '',
        is_default: address.is_default || false
      })
    } else {
      setEditingAddress(null)
      setAddressFormData({
        raw_address: '',
        commune: '',
        latitude: null,
        longitude: null,
        directions: '',
        is_default: addresses.length === 0 // Primera dirección es predeterminada
      })
    }
    setAddressDialogOpen(true)
  }

  const closeAddressDialog = () => {
    setAddressDialogOpen(false)
    setEditingAddress(null)
    setAddressFormData({
      raw_address: '',
      commune: '',
      latitude: null,
      longitude: null,
      directions: '',
      is_default: false
    })
  }

  const handleCreateAddress = async () => {
    if (!editingCustomer) return

    // Si esta dirección es la predeterminada, quitar el flag de las demás
    if (addressFormData.is_default) {
      await supabase
        .from('3t_addresses')
        .update({ is_default: false })
        .eq('customer_id', editingCustomer.customer_id)
    }

    const { error } = await supabase
      .from('3t_addresses')
      .insert([{
        address_id: crypto.randomUUID(),
        customer_id: editingCustomer.customer_id,
        ...addressFormData
      }])
    
    if (error) {
      console.error('Error creando dirección:', error)
      toast({
        variant: 'destructive',
        title: 'Error al crear dirección',
        description: error.message
      })
    } else {
      toast({
        title: 'Dirección creada',
        description: 'La dirección se creó exitosamente'
      })
      closeAddressDialog()
      await loadAddresses(editingCustomer.customer_id)
    }
  }

  const handleUpdateAddress = async () => {
    if (!editingAddress || !editingCustomer) return

    // Si esta dirección es la predeterminada, quitar el flag de las demás
    if (addressFormData.is_default) {
      await supabase
        .from('3t_addresses')
        .update({ is_default: false })
        .eq('customer_id', editingCustomer.customer_id)
        .neq('address_id', editingAddress.address_id)
    }

    const { error } = await supabase
      .from('3t_addresses')
      .update({
        raw_address: addressFormData.raw_address,
        commune: addressFormData.commune,
        latitude: addressFormData.latitude,
        longitude: addressFormData.longitude,
        directions: addressFormData.directions,
        is_default: addressFormData.is_default
      })
      .eq('address_id', editingAddress.address_id)
    
    if (error) {
      console.error('Error actualizando dirección:', error)
      toast({
        variant: 'destructive',
        title: 'Error al actualizar dirección',
        description: error.message
      })
    } else {
      toast({
        title: 'Dirección actualizada',
        description: 'Los cambios se guardaron correctamente'
      })
      closeAddressDialog()
      await loadAddresses(editingCustomer.customer_id)
    }
  }

  const checkAddressDependencies = async (addressId: string) => {
    const { count: orderCount } = await supabase
      .from('3t_orders')
      .select('*', { count: 'exact', head: true })
      .eq('delivery_address_id', addressId)
    
    return { orders: orderCount || 0 }
  }

  const openDeleteAddressDialog = async (address: Address) => {
    setAddressToDelete(address)
    const deps = await checkAddressDependencies(address.address_id)
    setAddressDependencies(deps)
    setDeleteAddressDialogOpen(true)
  }

  const handleDeleteAddress = async () => {
    if (!addressToDelete || !editingCustomer) return
    
    const { error } = await supabase
      .from('3t_addresses')
      .delete()
      .eq('address_id', addressToDelete.address_id)
    
    if (error) {
      console.error('Error eliminando dirección:', error)
      toast({
        variant: 'destructive',
        title: 'Error al eliminar dirección',
        description: error.message
      })
    } else {
      toast({
        title: 'Dirección eliminada',
        description: 'La dirección se eliminó correctamente'
      })
      setDeleteAddressDialogOpen(false)
      setAddressToDelete(null)
      await loadAddresses(editingCustomer.customer_id)
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.rut?.includes(searchTerm) ||
    c.commune?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const canDeleteCustomer = deleteDependencies.addresses === 0 && deleteDependencies.orders === 0
  const canDeleteAddress = addressDependencies.orders === 0

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona clientes y sus direcciones
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? 'Editar Cliente' : 'Crear Nuevo Cliente'}
                </DialogTitle>
                <DialogDescription>
                  {editingCustomer 
                    ? 'Modifica la información del cliente y gestiona sus direcciones' 
                    : 'Completa la información del nuevo cliente'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Nombre completo o razón social"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer_type">Tipo de Cliente *</Label>
                  <Select 
                    value={formData.customer_type}
                    onValueChange={(value: 'Hogar' | 'Empresa') => 
                      setFormData({...formData, customer_type: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hogar">🏠 Hogar</SelectItem>
                      <SelectItem value="Empresa">🏢 Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="cliente@ejemplo.cl"
                    />
                  </div>
                </div>
                {formData.customer_type === 'Empresa' && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="business_name">Razón Social</Label>
                      <Input
                        id="business_name"
                        value={formData.business_name}
                        onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                        placeholder="Empresa S.A."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="rut">RUT</Label>
                        <Input
                          id="rut"
                          value={formData.rut}
                          onChange={(e) => setFormData({...formData, rut: e.target.value})}
                          placeholder="12.345.678-9"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contact_name">Nombre de Contacto</Label>
                        <Input
                          id="contact_name"
                          value={formData.contact_name}
                          onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                          placeholder="Juan Pérez"
                        />
                      </div>
                    </div>
                  </>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="price">Precio Recarga (CLP) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                    placeholder="2500"
                  />
                </div>

                {/* Sección de direcciones (solo en edición) */}
                {editingCustomer && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <Label className="text-base font-semibold">Direcciones Asociadas</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openAddressDialog()}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Agregar Dirección
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {addresses.map((address) => (
                          <Card key={address.address_id} className="bg-muted/30">
                            <CardContent className="pt-4 pb-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <MapPin className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-sm font-medium">{address.raw_address}</span>
                                    {address.is_default && (
                                      <Badge variant="outline" className="text-xs">
                                        Por defecto
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground ml-5">
                                    Comuna: {address.commune}
                                  </p>
                                  {address.directions && (
                                    <p className="text-xs text-muted-foreground ml-5 mt-1">
                                      Indicaciones: {address.directions}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openAddressDialog(address)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteAddressDialog(address)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {addresses.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No hay direcciones registradas
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button 
                  onClick={editingCustomer ? handleUpdateCustomer : handleCreateCustomer} 
                  disabled={!formData.name || (editingCustomer === null && !formData.phone)}
                >
                  {editingCustomer ? 'Actualizar Cliente' : 'Crear Cliente'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Listado de Clientes */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''} registrado{filteredCustomers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, teléfono, RUT o comuna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando clientes...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Comuna</TableHead>
                  <TableHead>Precio Recarga</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.customer_id}>
                    <TableCell className="font-medium">
                      {customer.name}
                      {customer.customer_type === 'Empresa' && customer.contact_name && (
                        <div className="text-sm text-gray-500">
                          Contacto: {customer.contact_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.customer_type === 'Empresa' ? 'default' : 'secondary'}>
                        {customer.customer_type === 'Empresa' ? '🏢 Empresa' : '🏠 Hogar'}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.commune || '-'}</TableCell>
                    <TableCell className="font-mono">
                      ${customer.price?.toLocaleString('es-CL') || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(customer)}
                          title="Editar cliente"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openDeleteDialog(customer)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmación de eliminación de cliente */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar cliente?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el cliente <strong>{customerToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          
          {!canDeleteCustomer && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">No se puede eliminar este cliente</p>
                <p>
                  Este cliente tiene {deleteDependencies.addresses} dirección
                  {deleteDependencies.addresses !== 1 ? 'es' : ''} y {deleteDependencies.orders} pedido
                  {deleteDependencies.orders !== 1 ? 's' : ''} asociados.
                </p>
                <p className="mt-1">Elimina primero las direcciones y pedidos antes de eliminar el cliente.</p>
              </div>
            </div>
          )}
          
          {canDeleteCustomer && (
            <p className="text-sm text-gray-600">
              Esta acción no se puede deshacer.
            </p>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteCustomer}
              disabled={!canDeleteCustomer}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para agregar/editar dirección */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent 
          className="max-w-lg"
          onInteractOutside={(e) => {
            // Verificar si el clic fue en el dropdown de Google Maps
            const target = e.target as HTMLElement
            if (target.closest('.pac-container')) {
              e.preventDefault()
              return
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Editar Dirección' : 'Agregar Nueva Dirección'}
            </DialogTitle>
            <DialogDescription>
              {editingAddress 
                ? 'Modifica los datos de la dirección' 
                : 'Completa la información de la nueva dirección'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="raw_address">Dirección Completa *</Label>
              <Input
                id="raw_address"
                ref={addressInputRef}
                value={addressFormData.raw_address}
                onChange={(e) => setAddressFormData({...addressFormData, raw_address: e.target.value})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                  }
                }}
                placeholder="Comienza a escribir la dirección..."
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">
                Escribe y selecciona de las sugerencias de Google Maps
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="commune">Comuna</Label>
              <Input
                id="commune"
                value={addressFormData.commune}
                onChange={(e) => setAddressFormData({...addressFormData, commune: e.target.value})}
                placeholder="Comuna (se autocompleta)"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="directions">Indicaciones Adicionales</Label>
              <Textarea
                id="directions"
                value={addressFormData.directions}
                onChange={(e) => setAddressFormData({...addressFormData, directions: e.target.value})}
                placeholder="Ej: Casa color azul, portón café..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={addressFormData.is_default}
                onCheckedChange={(checked) => 
                  setAddressFormData({...addressFormData, is_default: checked as boolean})
                }
              />
              <Label 
                htmlFor="is_default"
                className="text-sm font-normal cursor-pointer"
              >
                Establecer como dirección predeterminada
              </Label>
            </div>

            {addressFormData.latitude && addressFormData.longitude && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-xs">
                <p className="font-semibold mb-1">Coordenadas capturadas:</p>
                <p className="text-muted-foreground">
                  Lat: {addressFormData.latitude.toFixed(6)}, Lng: {addressFormData.longitude.toFixed(6)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAddressDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={editingAddress ? handleUpdateAddress : handleCreateAddress}
              disabled={!addressFormData.raw_address || !addressFormData.commune}
            >
              {editingAddress ? 'Actualizar' : 'Crear'} Dirección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación de dirección */}
      <Dialog open={deleteAddressDialogOpen} onOpenChange={setDeleteAddressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar dirección?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta dirección?
              <br />
              <strong className="text-gray-900">{addressToDelete?.raw_address}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {!canDeleteAddress && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">No se puede eliminar esta dirección</p>
                <p>
                  Esta dirección tiene {addressDependencies.orders} pedido
                  {addressDependencies.orders !== 1 ? 's' : ''} asociado
                  {addressDependencies.orders !== 1 ? 's' : ''}.
                </p>
                <p className="mt-1">Elimina primero los pedidos antes de eliminar la dirección.</p>
              </div>
            </div>
          )}
          
          {canDeleteAddress && (
            <p className="text-sm text-gray-600">
              Esta acción no se puede deshacer.
            </p>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteAddressDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteAddress}
              disabled={!canDeleteAddress}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar Dirección
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
