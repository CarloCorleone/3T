'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Calendar as CalendarIcon, Plus, X, Trash2, Search, Upload, FileCheck } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase, type OrderWithInvoices, IVA_RATE } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

type InvoiceFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  preselectedOrders?: OrderWithInvoices[]
}

type OrderProduct = {
  id: string
  product_id: string
  product_name: string
  quantity: number
  price_neto: number
  total: number
}

type OrderSelection = {
  order_id: string
  customer_name: string
  order_date: string
  final_price: number
  remaining_to_invoice: number
  amount_to_invoice: number
  products: OrderProduct[]
}

type InvoiceEntry = {
  id: string
  invoice_number: string
  invoice_date: Date
  amount: number
  notes: string
  selectedProducts: OrderProduct[] // Productos incluidos en esta factura
}

export function InvoiceForm({ open, onOpenChange, onSuccess, preselectedOrders = [] }: InvoiceFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [searchingOrders, setSearchingOrders] = useState(false)
  const [isIndependent, setIsIndependent] = useState(false)
  const [uploadingPDF, setUploadingPDF] = useState(false)
  const [multipleInvoices, setMultipleInvoices] = useState(false)
  
  // Form state - mantener para compatibilidad con factura única
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date())
  const [invoiceType, setInvoiceType] = useState<'venta' | 'exenta' | 'boleta'>('venta')
  const [status, setStatus] = useState<'vigente' | 'pendiente' | 'anulada'>('vigente')
  const [notes, setNotes] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  
  // Customer selection for independent invoices
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [customers, setCustomers] = useState<any[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  
  // Multiple invoices state
  const [invoiceEntries, setInvoiceEntries] = useState<InvoiceEntry[]>([
    { id: '1', invoice_number: '', invoice_date: new Date(), amount: 0, notes: '', selectedProducts: [] }
  ])
  
  // Order selection
  const [availableOrders, setAvailableOrders] = useState<OrderWithInvoices[]>([])
  const [selectedOrders, setSelectedOrders] = useState<OrderSelection[]>([])
  const [orderSearch, setOrderSearch] = useState('')
  const [showOrderSearch, setShowOrderSearch] = useState(false)
  
  // Calculated totals
  const [manualTotal, setManualTotal] = useState('')
  
  useEffect(() => {
    if (open && !isIndependent) {
      loadAvailableOrders()
    }
  }, [open, isIndependent])

  useEffect(() => {
    if (open && isIndependent) {
      loadCustomers()
    }
  }, [open, isIndependent])

  // Función para cargar productos de un pedido
  const loadOrderProducts = async (orderId: string): Promise<OrderProduct[]> => {
    try {
      const { data, error } = await supabase
        .from('order_products')
        .select(`
          id,
          product_id,
          quantity,
          price_neto,
          total,
          3t_products!inner (
            name
          )
        `)
        .eq('order_id', orderId)

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item['3t_products'].name,
        quantity: item.quantity,
        price_neto: parseFloat(item.price_neto),
        total: item.total
      }))
    } catch (error: any) {
      console.error('Error al cargar productos del pedido:', error)
      return []
    }
  }

  // Cargar pedidos pre-seleccionados cuando se abre el form
  useEffect(() => {
    if (open && preselectedOrders.length > 0) {
      const loadPreselectedOrders = async () => {
        const ordersWithProducts = await Promise.all(
          preselectedOrders.map(async (order) => {
            const products = await loadOrderProducts(order.order_id)
            return {
              order_id: order.order_id,
              customer_name: order.customer_name,
              order_date: order.order_date,
              final_price: order.final_price,
              remaining_to_invoice: order.remaining_to_invoice,
              amount_to_invoice: order.remaining_to_invoice,
              products
            }
          })
        )
        setSelectedOrders(ordersWithProducts)
      }
      loadPreselectedOrders()
    }
  }, [open, preselectedOrders])

  const loadAvailableOrders = async () => {
    setSearchingOrders(true)
    try {
      const { data, error} = await supabase
        .from('v_orders_with_invoices')
        .select('*')
        .gt('remaining_to_invoice', 0)
        .order('order_date', { ascending: false })
        .limit(100)

      if (error) throw error
      setAvailableOrders(data || [])
    } catch (error: any) {
      toast({
        title: 'Error al cargar pedidos',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setSearchingOrders(false)
    }
  }

  const loadCustomers = async () => {
    setLoadingCustomers(true)
    try {
      const { data, error } = await supabase
        .from('3t_customers')
        .select('customer_id, name, rut, customer_type')
        .eq('customer_type', 'Empresa')
        .order('name', { ascending: true })
        .limit(200)

      if (error) throw error
      setCustomers(data || [])
    } catch (error: any) {
      toast({
        title: 'Error al cargar clientes',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoadingCustomers(false)
    }
  }

  const addOrder = async (order: OrderWithInvoices) => {
    if (!order || !order.order_id) return

    if ((selectedOrders || []).find(o => o.order_id === order.order_id)) {
      toast({
        title: 'Pedido ya agregado',
        description: 'Este pedido ya está en la lista',
        variant: 'destructive'
      })
      return
    }

    // Cargar productos del pedido
    const products = await loadOrderProducts(order.order_id)

    setSelectedOrders([...(selectedOrders || []), {
      order_id: order.order_id,
      customer_name: order.customer_name,
      order_date: order.order_date,
      final_price: order.final_price,
      remaining_to_invoice: order.remaining_to_invoice,
      amount_to_invoice: order.remaining_to_invoice,
      products
    }])
    setShowOrderSearch(false)
    setOrderSearch('')
  }

  const removeOrder = (orderId: string) => {
    setSelectedOrders((selectedOrders || []).filter(o => o.order_id !== orderId))
  }

  const updateOrderAmount = (orderId: string, amount: number) => {
    setSelectedOrders((selectedOrders || []).map(o => 
      o.order_id === orderId ? { ...o, amount_to_invoice: amount } : o
    ))
  }

  const addInvoiceEntry = () => {
    const newId = (Math.max(...invoiceEntries.map(i => parseInt(i.id) || 0)) + 1).toString()
    setInvoiceEntries([...invoiceEntries, {
      id: newId,
      invoice_number: '',
      invoice_date: new Date(),
      amount: 0,
      notes: '',
      selectedProducts: []
    }])
  }

  const removeInvoiceEntry = (id: string) => {
    if (invoiceEntries.length === 1) {
      toast({
        title: 'No se puede eliminar',
        description: 'Debe haber al menos una factura',
        variant: 'destructive'
      })
      return
    }
    setInvoiceEntries(invoiceEntries.filter(entry => entry.id !== id))
  }

  const updateInvoiceEntry = (id: string, field: keyof InvoiceEntry, value: any) => {
    setInvoiceEntries(invoiceEntries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ))
  }

  // Agregar/remover producto de una factura
  const toggleProductInInvoice = (invoiceEntryId: string, product: OrderProduct) => {
    setInvoiceEntries(invoiceEntries.map(entry => {
      if (entry.id !== invoiceEntryId) return entry

      const isSelected = entry.selectedProducts.some(p => p.id === product.id)
      const updatedProducts = isSelected
        ? entry.selectedProducts.filter(p => p.id !== product.id)
        : [...entry.selectedProducts, product]

      // Calcular el nuevo monto basado en productos seleccionados
      const newAmount = updatedProducts.reduce((sum, p) => sum + p.total, 0)

      return {
        ...entry,
        selectedProducts: updatedProducts,
        amount: newAmount
      }
    }))
  }

  // Obtener todos los productos de los pedidos seleccionados
  const getAllAvailableProducts = (): OrderProduct[] => {
    return selectedOrders.flatMap(order => order.products)
  }

  // Verificar si un producto ya está asignado a otra factura
  const isProductAssigned = (productId: string, currentInvoiceId: string): boolean => {
    return invoiceEntries.some(entry => 
      entry.id !== currentInvoiceId && 
      entry.selectedProducts.some(p => p.id === productId)
    )
  }

  const getTotalOrderAmount = () => {
    return selectedOrders.reduce((sum, o) => sum + o.remaining_to_invoice, 0)
  }

  const getTotalInvoicesAmount = () => {
    return invoiceEntries.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  }

  const calculateTotals = () => {
    if (isIndependent) {
      const total = parseFloat(manualTotal) || 0
      const subtotal = invoiceType === 'exenta' ? total : total / (1 + IVA_RATE)
      const tax = invoiceType === 'exenta' ? 0 : total - subtotal
      return { subtotal, tax, total }
    }
    
    if (multipleInvoices) {
      // Para múltiples facturas, sumar los montos de cada entrada
      const total = getTotalInvoicesAmount()
      const subtotal = invoiceType === 'exenta' ? total : total / (1 + IVA_RATE)
      const tax = invoiceType === 'exenta' ? 0 : total - subtotal
      return { subtotal, tax, total }
    }
    
    const total = selectedOrders.reduce((sum, o) => sum + o.amount_to_invoice, 0)
    const subtotal = invoiceType === 'exenta' ? total : total / (1 + IVA_RATE)
    const tax = invoiceType === 'exenta' ? 0 : total - subtotal
    return { subtotal, tax, total }
  }

  const validateForm = (): string | null => {
    if (multipleInvoices) {
      // Validación para múltiples facturas
      for (const entry of invoiceEntries) {
        if (!entry.invoice_number.trim()) {
          return 'Todas las facturas deben tener un número'
        }
        if (!entry.invoice_date) {
          return 'Todas las facturas deben tener una fecha'
        }
        if (entry.amount <= 0) {
          return `La factura ${entry.invoice_number} debe tener un monto mayor a 0`
        }
      }

      // Verificar que la suma de facturas no exceda el total de pedidos
      const totalPedidos = getTotalOrderAmount()
      const totalFacturas = getTotalInvoicesAmount()
      if (totalFacturas > totalPedidos) {
        return `El total de las facturas (${formatCLP(totalFacturas)}) excede el total de los pedidos (${formatCLP(totalPedidos)})`
      }

      if (selectedOrders.length === 0) {
        return 'Debe seleccionar al menos un pedido'
      }

      return null
    }

    // Validación para factura única (lógica original)
    if (!invoiceNumber.trim()) {
      return 'Debe ingresar un número de factura'
    }
    
    if (!invoiceDate) {
      return 'Debe seleccionar una fecha de emisión'
    }

    if (!isIndependent && selectedOrders.length === 0) {
      return 'Debe seleccionar al menos un pedido o marcar como factura independiente'
    }

    if (isIndependent && !manualTotal) {
      return 'Debe ingresar el monto total de la factura'
    }

    if (isIndependent && !selectedCustomer) {
      return 'Debe seleccionar un cliente para la factura'
    }

    if (!isIndependent) {
      for (const order of selectedOrders) {
        if (order.amount_to_invoice <= 0) {
          return `El monto del pedido ${order.order_id} debe ser mayor a 0`
        }
        if (order.amount_to_invoice > order.remaining_to_invoice) {
          return `El monto del pedido ${order.order_id} excede el saldo pendiente`
        }
      }
    }

    return null
  }

  const handlePDFUpload = async (file: File): Promise<string | null> => {
    try {
      setUploadingPDF(true)
      const fileName = `invoice_${invoiceNumber}_${Date.now()}.pdf`
      const filePath = `invoices/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error: any) {
      toast({
        title: 'Error al subir PDF',
        description: error.message,
        variant: 'destructive'
      })
      return null
    } finally {
      setUploadingPDF(false)
    }
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      toast({
        title: 'Error de validación',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      if (multipleInvoices) {
        // Crear múltiples facturas
        const createdInvoices = []
        
        for (const entry of invoiceEntries) {
          // Verificar que el número no exista en facturas vigentes o pendientes
          const { data: existing } = await supabase
            .from('3t_invoices')
            .select('invoice_id, status')
            .eq('invoice_number', entry.invoice_number)
            .in('status', ['vigente', 'pendiente'])
            .maybeSingle()

          if (existing) {
            throw new Error(`El número de factura ${entry.invoice_number} ya existe como ${existing.status}`)
          }

          // Calcular totales para esta factura
          const entryTotal = entry.amount
          const entrySubtotal = invoiceType === 'exenta' ? entryTotal : entryTotal / (1 + IVA_RATE)
          const entryTax = invoiceType === 'exenta' ? 0 : entryTotal - entrySubtotal

          // Crear factura
          const { data: invoice, error: invoiceError } = await supabase
            .from('3t_invoices')
            .insert({
              invoice_number: entry.invoice_number,
              invoice_date: format(entry.invoice_date, 'yyyy-MM-dd'),
              subtotal: entrySubtotal,
              tax_amount: entryTax,
              total_amount: entryTotal,
              status,
              invoice_type: invoiceType,
              notes: entry.notes.trim() || null,
              pdf_url: null
            })
            .select()
            .single()

          if (invoiceError) throw invoiceError
          createdInvoices.push(invoice)
        }

        // Distribuir pedidos proporcionalmente entre las facturas
        if (selectedOrders.length > 0) {
          const totalInvoices = getTotalInvoicesAmount()
          
          for (let i = 0; i < createdInvoices.length; i++) {
            const invoice = createdInvoices[i]
            const entry = invoiceEntries[i]
            const proportion = entry.amount / totalInvoices

            // Crear relaciones con pedidos (distribuido proporcionalmente)
            const orderInvoices = selectedOrders.map(order => ({
              order_id: order.order_id,
              invoice_id: invoice.invoice_id,
              amount_invoiced: order.remaining_to_invoice * proportion
            }))

            const { error: relationError } = await supabase
              .from('3t_order_invoices')
              .insert(orderInvoices)

            if (relationError) throw relationError
          }
        }

        toast({
          title: 'Facturas creadas',
          description: `${createdInvoices.length} facturas creadas exitosamente`
        })
      } else {
        // Lógica original para factura única
        const totals = calculateTotals()
        
        // Verificar si el número de factura ya existe en facturas vigentes o pendientes
        const { data: existing } = await supabase
          .from('3t_invoices')
          .select('invoice_id, status')
          .eq('invoice_number', invoiceNumber)
          .in('status', ['vigente', 'pendiente'])
          .maybeSingle()

        if (existing) {
          throw new Error(`El número de factura ya existe como ${existing.status}`)
        }

        // Subir PDF si existe
        let uploadedPdfUrl = pdfUrl
        if (pdfFile) {
          const url = await handlePDFUpload(pdfFile)
          if (url) {
            uploadedPdfUrl = url
          }
        }

        // Crear factura
        const { data: invoice, error: invoiceError } = await supabase
          .from('3t_invoices')
          .insert({
            invoice_number: invoiceNumber,
            invoice_date: format(invoiceDate, 'yyyy-MM-dd'),
            subtotal: totals.subtotal,
            tax_amount: totals.tax,
            total_amount: totals.total,
            status,
            invoice_type: invoiceType,
            notes: notes.trim() || null,
            pdf_url: uploadedPdfUrl || null,
            customer_id: isIndependent ? selectedCustomer : null
          })
          .select()
          .single()

        if (invoiceError) throw invoiceError

        // Si no es independiente, crear relaciones con pedidos
        if (!isIndependent && selectedOrders.length > 0) {
          const orderInvoices = selectedOrders.map(order => ({
            order_id: order.order_id,
            invoice_id: invoice.invoice_id,
            amount_invoiced: order.amount_to_invoice
          }))

          const { error: relationError } = await supabase
            .from('3t_order_invoices')
            .insert(orderInvoices)

          if (relationError) throw relationError
        }

        toast({
          title: 'Factura creada',
          description: `Factura ${invoiceNumber} creada exitosamente`
        })
      }

      resetForm()
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error al crear factura',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setInvoiceNumber('')
    setInvoiceDate(new Date())
    setInvoiceType('venta')
    setStatus('vigente')
    setNotes('')
    setSelectedOrders([])
    setIsIndependent(false)
    setMultipleInvoices(false)
    setInvoiceEntries([{ id: '1', invoice_number: '', invoice_date: new Date(), amount: 0, notes: '', selectedProducts: [] }])
    setManualTotal('')
    setPdfFile(null)
    setPdfUrl('')
    setSelectedCustomer('')
    setCustomerSearch('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Formato inválido',
          description: 'Solo se permiten archivos PDF',
          variant: 'destructive'
        })
        return
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast({
          title: 'Archivo muy grande',
          description: 'El PDF no debe superar los 5MB',
          variant: 'destructive'
        })
        return
      }
      setPdfFile(file)
    }
  }

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount)
  }

  const filteredOrders = (availableOrders || []).filter(order =>
    order?.order_id?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    order?.customer_name?.toLowerCase().includes(orderSearch.toLowerCase())
  )

  const totals = calculateTotals()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-card-foreground text-2xl">Nueva Factura</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Complete los datos para crear una nueva factura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-number" className="text-foreground">
                Número de Factura *
              </Label>
              <Input
                id="invoice-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ej: 001-001-0000123"
                className="bg-background border-input text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-date" className="text-foreground">
                Fecha de Emisión *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-background border-input text-foreground"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {format(invoiceDate, 'PPP', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={invoiceDate}
                    onSelect={(date) => date && setInvoiceDate(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-type" className="text-foreground">Tipo de Factura</Label>
              <Select value={invoiceType} onValueChange={(v: any) => setInvoiceType(v)}>
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="venta">Venta (con IVA)</SelectItem>
                  <SelectItem value="exenta">Exenta</SelectItem>
                  <SelectItem value="boleta">Boleta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-foreground">Estado</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Toggle factura independiente */}
          <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-foreground font-medium">Factura sin pedidos</Label>
              <p className="text-sm text-muted-foreground">
                Crear factura independiente sin asociar a pedidos
              </p>
            </div>
            <Switch
              checked={isIndependent}
              onCheckedChange={(checked) => {
                setIsIndependent(checked)
                if (checked) {
                  setMultipleInvoices(false) // Desactivar múltiples facturas si se activa independiente
                  setSelectedOrders([]) // Limpiar pedidos seleccionados
                }
              }}
            />
          </div>

          {/* Toggle múltiples facturas */}
          {!isIndependent && (
            <div className="flex items-center justify-between bg-primary/10 p-4 rounded-lg border border-primary/30">
              <div className="space-y-0.5">
                <Label className="text-foreground font-medium">Múltiples Facturas</Label>
                <p className="text-sm text-muted-foreground">
                  Crear varias facturas para los mismos pedidos (ej: recargas + botellones nuevos)
                </p>
              </div>
              <Switch
                checked={multipleInvoices}
                onCheckedChange={(checked) => {
                  setMultipleInvoices(checked)
                  if (checked) {
                    setIsIndependent(false) // Desactivar independiente si se activa múltiples
                  }
                }}
              />
            </div>
          )}

          {/* Selección de pedidos o monto manual */}
          {!isIndependent ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground font-medium">Pedidos a Facturar</Label>
                  <Popover open={showOrderSearch} onOpenChange={setShowOrderSearch}>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Pedido
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 bg-popover border-border" align="end">
                      <Command className="bg-popover">
                        <CommandInput 
                          placeholder="Buscar pedido..." 
                          value={orderSearch}
                          onValueChange={setOrderSearch}
                          className="text-foreground"
                        />
                        <CommandList>
                          <CommandEmpty className="text-muted-foreground">
                            {searchingOrders ? 'Buscando...' : 'No se encontraron pedidos'}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredOrders.map((order) => (
                              <CommandItem
                                key={order.order_id}
                                onSelect={() => addOrder(order)}
                                className="cursor-pointer hover:bg-muted"
                              >
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-sm text-foreground">{order.order_id}</span>
                                    <Badge variant="outline">{order.customer_name}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{format(new Date(order.order_date), 'dd MMM yyyy', { locale: es })}</span>
                                    <span className="font-medium">
                                      Pendiente: {formatCLP(order.remaining_to_invoice)}
                                    </span>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedOrders.length > 0 ? (
                  <div className="space-y-2 border border-border rounded-lg p-3 bg-muted/20">
                    {selectedOrders.map((order) => (
                      <div key={order.order_id} className="flex items-center gap-3 bg-background p-3 rounded border border-border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-foreground">{order.order_id}</span>
                            <Badge variant="outline" className="text-xs">{order.customer_name}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Pendiente: {formatCLP(order.remaining_to_invoice)} de {formatCLP(order.final_price)}
                          </p>
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            value={order.amount_to_invoice}
                            onChange={(e) => updateOrderAmount(order.order_id, parseFloat(e.target.value) || 0)}
                            className="text-right bg-background border-input text-foreground"
                            max={order.remaining_to_invoice}
                            min={0}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOrder(order.order_id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-lg p-8 text-center bg-muted/20">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No hay pedidos seleccionados. Haz clic en "Agregar Pedido" para comenzar.
                    </p>
                  </div>
                )}
              </div>

              {/* Gestión de Múltiples Facturas */}
              {multipleInvoices && selectedOrders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground font-medium">Facturas a Emitir</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Distribuye el monto total entre múltiples facturas
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={addInvoiceEntry}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Factura
                    </Button>
                  </div>

                  {/* Indicador de distribución */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total disponible:</span>
                      <span className="font-medium text-foreground">{formatCLP(getTotalOrderAmount())}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-muted-foreground">Total distribuido:</span>
                      <span className={`font-bold ${getTotalInvoicesAmount() > getTotalOrderAmount() ? 'text-destructive' : 'text-primary'}`}>
                        {formatCLP(getTotalInvoicesAmount())}
                      </span>
                    </div>
                    {getTotalInvoicesAmount() > getTotalOrderAmount() && (
                      <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        El total distribuido excede el monto disponible
                      </p>
                    )}
                  </div>

                  {/* Lista de facturas */}
                  <div className="space-y-3">
                    {invoiceEntries.map((entry, index) => (
                      <div key={entry.id} className="border border-border rounded-lg p-4 bg-background space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Factura {index + 1}</Badge>
                          {invoiceEntries.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeInvoiceEntry(entry.id)}
                              className="h-7 w-7 text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm text-foreground">Número de Factura *</Label>
                            <Input
                              value={entry.invoice_number}
                              onChange={(e) => updateInvoiceEntry(entry.id, 'invoice_number', e.target.value)}
                              placeholder="Ej: 3517"
                              className="bg-background border-input text-foreground"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm text-foreground">Fecha *</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal bg-background border-input text-foreground"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {format(entry.invoice_date, 'dd MMM yyyy', { locale: es })}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                                <Calendar
                                  mode="single"
                                  selected={entry.invoice_date}
                                  onSelect={(date) => date && updateInvoiceEntry(entry.id, 'invoice_date', date)}
                                  initialFocus
                                  locale={es}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-foreground">Productos a Facturar *</Label>
                          <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                            {getAllAvailableProducts().length > 0 ? (
                              getAllAvailableProducts().map((product) => {
                                const isSelected = entry.selectedProducts.some(p => p.id === product.id)
                                const isAssignedElsewhere = isProductAssigned(product.id, entry.id)
                                
                                return (
                                  <div 
                                    key={product.id} 
                                    className={`flex items-center gap-3 p-2 rounded ${
                                      isAssignedElsewhere ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted'
                                    }`}
                                    onClick={() => !isAssignedElsewhere && toggleProductInInvoice(entry.id, product)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                      disabled={isAssignedElsewhere}
                                      className="h-4 w-4"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm text-foreground">{product.product_name}</span>
                                        <Badge variant="secondary" className="text-xs">{product.quantity} un.</Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {formatCLP(product.price_neto)} × {product.quantity} = {formatCLP(product.total)}
                                      </p>
                                    </div>
                                    {isAssignedElsewhere && (
                                      <Badge variant="outline" className="text-xs">Asignado</Badge>
                                    )}
                                  </div>
                                )
                              })
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No hay productos disponibles
                              </p>
                            )}
                          </div>
                          {entry.selectedProducts.length > 0 && (
                            <div className="bg-primary/10 p-2 rounded text-sm">
                              <span className="text-muted-foreground">Monto calculado: </span>
                              <span className="font-bold text-primary">{formatCLP(entry.amount)}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-foreground">Notas (opcional)</Label>
                          <Textarea
                            value={entry.notes}
                            onChange={(e) => updateInvoiceEntry(entry.id, 'notes', e.target.value)}
                            placeholder="Ej: Recargas / Botellones nuevos"
                            rows={2}
                            className="bg-background border-input text-foreground"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {/* Selector de Cliente */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Cliente *</Label>
                <Popover open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between bg-background border-input text-foreground"
                    >
                      <span className="truncate">
                        {selectedCustomer 
                          ? customers.find(c => c.customer_id === selectedCustomer)?.name || 'Seleccionar cliente'
                          : 'Seleccionar cliente'
                        }
                      </span>
                      <Search className="ml-2 h-4 w-4 text-muted-foreground shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 bg-popover border-border" align="start">
                    <Command className="bg-popover">
                      <CommandInput 
                        placeholder="Buscar cliente..." 
                        value={customerSearch}
                        onValueChange={setCustomerSearch}
                        className="text-foreground"
                      />
                      <CommandList>
                        <CommandEmpty className="text-muted-foreground">
                          {loadingCustomers ? 'Cargando clientes...' : 'No se encontraron clientes'}
                        </CommandEmpty>
                        <CommandGroup>
                          {customers
                            .filter(customer => {
                              const search = (customerSearch || '').toLowerCase()
                              return customer.name.toLowerCase().includes(search) ||
                                     customer.rut.toLowerCase().includes(search)
                            })
                            .map((customer) => (
                              <CommandItem
                                key={customer.customer_id}
                                onSelect={() => {
                                  setSelectedCustomer(customer.customer_id)
                                  setShowCustomerSearch(false)
                                  setCustomerSearch('')
                                }}
                                className="cursor-pointer hover:bg-muted"
                              >
                                <div className="flex flex-col gap-1 w-full">
                                  <span className="font-medium text-sm text-foreground">{customer.name}</span>
                                  <span className="text-xs text-muted-foreground">RUT: {customer.rut}</span>
                                </div>
                              </CommandItem>
                            ))
                          }
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedCustomer && (
                  <div className="text-xs text-muted-foreground">
                    Cliente seleccionado: {customers.find(c => c.customer_id === selectedCustomer)?.rut}
                  </div>
                )}
              </div>

              {/* Monto Total */}
              <div className="space-y-2">
                <Label htmlFor="manual-total" className="text-foreground">Monto Total (CLP) *</Label>
                <Input
                  id="manual-total"
                  type="number"
                  value={manualTotal}
                  onChange={(e) => setManualTotal(e.target.value)}
                  placeholder="Ingrese el monto total"
                  className="bg-background border-input text-foreground"
                />
              </div>
            </div>
          )}

          <Separator className="bg-border" />

          {/* Resumen de totales */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium text-foreground">{formatCLP(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA (19%):</span>
              <span className="font-medium text-foreground">{formatCLP(totals.tax)}</span>
            </div>
            <Separator className="bg-border" />
            <div className="flex justify-between">
              <span className="text-lg font-bold text-foreground">Total:</span>
              <span className="text-lg font-bold text-primary">{formatCLP(totals.total)}</span>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones adicionales..."
              rows={3}
              className="bg-background border-input text-foreground"
            />
          </div>

          {/* Upload PDF */}
          <div className="space-y-2">
            <Label htmlFor="pdf-upload" className="text-foreground">PDF de la Factura (opcional)</Label>
            <div className="flex items-center gap-3">
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-background border border-input rounded-md hover:bg-muted transition-colors">
                  {pdfFile ? (
                    <>
                      <FileCheck className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-foreground">{pdfFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Seleccionar PDF</span>
                    </>
                  )}
                </div>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {pdfFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPdfFile(null)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Formato: PDF | Tamaño máximo: 5MB
            </p>
          </div>

          <Separator className="bg-border" />

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || uploadingPDF}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || uploadingPDF}>
              {uploadingPDF ? 'Subiendo PDF...' : loading ? 'Creando...' : 'Crear Factura'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
