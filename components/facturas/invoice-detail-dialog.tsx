'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { FileText, Ban, X, Edit2, Save, Calendar as CalendarIcon, Upload, Search } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase, type InvoiceWithOrders } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import { useToast } from '@/hooks/use-toast'

type InvoiceDetailDialogProps = {
  invoice: InvoiceWithOrders | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewPDF: (invoice: InvoiceWithOrders) => void
  onAnular: (invoice: InvoiceWithOrders) => void
  onUpdate: () => void
  canEdit: boolean
}

export function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
  onViewPDF,
  onAnular,
  onUpdate,
  canEdit
}: InvoiceDetailDialogProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  // Estados de edición
  const [editedNumber, setEditedNumber] = useState('')
  const [editedDate, setEditedDate] = useState<Date | undefined>(undefined)
  const [editedType, setEditedType] = useState('')
  const [editedNotes, setEditedNotes] = useState('')
  const [editedPdfFile, setEditedPdfFile] = useState<File | null>(null)
  const [editedCustomerId, setEditedCustomerId] = useState<string>('')
  
  // Estados para selector de cliente
  const [customers, setCustomers] = useState<any[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  
  // Cargar clientes cuando se abre el diálogo
  useEffect(() => {
    if (open && invoice) {
      loadCustomers()
    }
  }, [open, invoice])
  
  if (!invoice) return null

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount)
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
      console.error('Error al cargar clientes:', error)
    } finally {
      setLoadingCustomers(false)
    }
  }

  const handleStartEdit = () => {
    const customerId = (invoice as any).customer_id || ''
    setEditedNumber(invoice.invoice_number)
    setEditedDate(new Date(invoice.invoice_date))
    setEditedType(invoice.invoice_type)
    setEditedNotes(invoice.notes || '')
    setEditedPdfFile(null)
    setEditedCustomerId(customerId)
    setIsEditing(true)
    loadCustomers() // Cargar clientes al iniciar edición
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedPdfFile(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Tipo de archivo inválido',
        description: 'Solo se permiten archivos PDF',
        variant: 'destructive'
      })
      return
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo no puede superar 5MB',
        variant: 'destructive'
      })
      return
    }

    setEditedPdfFile(file)
  }

  const recalculateAmounts = (type: string, subtotal: number) => {
    if (type === 'exenta') {
      return {
        subtotal,
        tax_amount: 0,
        total_amount: subtotal
      }
    }
    
    // Para venta y boleta, aplicar IVA del 19%
    const taxAmount = subtotal * 0.19
    return {
      subtotal,
      tax_amount: taxAmount,
      total_amount: subtotal + taxAmount
    }
  }

  const handleSave = async () => {
    if (!invoice || !user) return

    // Validaciones
    if (!editedNumber.trim()) {
      toast({
        title: 'Error de validación',
        description: 'El número de factura es requerido',
        variant: 'destructive'
      })
      return
    }

    if (!editedDate) {
      toast({
        title: 'Error de validación',
        description: 'La fecha es requerida',
        variant: 'destructive'
      })
      return
    }

    setIsSaving(true)

    try {
      // Verificar unicidad del número de factura (si cambió)
      if (editedNumber !== invoice.invoice_number) {
        const { data: existing, error: checkError } = await supabase
          .from('3t_invoices')
          .select('invoice_id')
          .eq('invoice_number', editedNumber)
          .neq('invoice_id', invoice.invoice_id)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError
        }

        if (existing) {
          toast({
            title: 'Número duplicado',
            description: 'Ya existe una factura con ese número',
            variant: 'destructive'
          })
          setIsSaving(false)
          return
        }
      }

      // Recalcular montos si cambió el tipo
      const amounts = editedType !== invoice.invoice_type
        ? recalculateAmounts(editedType, invoice.subtotal)
        : {
            subtotal: invoice.subtotal,
            tax_amount: invoice.tax_amount,
            total_amount: invoice.total_amount
          }

      // Subir PDF si hay uno nuevo
      let pdfUrl = invoice.pdf_url
      if (editedPdfFile) {
        setIsUploading(true)
        
        // Eliminar PDF anterior si existe
        if (invoice.pdf_url) {
          const oldPath = invoice.pdf_url.split('/').pop()
          if (oldPath) {
            await supabase.storage
              .from('documents')
              .remove([`invoices/${oldPath}`])
          }
        }

        // Subir nuevo PDF
        const fileName = `${editedNumber}-${Date.now()}.pdf`
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('documents')
          .upload(`invoices/${fileName}`, editedPdfFile)

        if (uploadError) throw uploadError

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(`invoices/${fileName}`)
        
        pdfUrl = urlData.publicUrl
        setIsUploading(false)
      }

      // Actualizar factura
      const { error: updateError } = await supabase
        .from('3t_invoices')
        .update({
          invoice_number: editedNumber,
          invoice_date: format(editedDate, 'yyyy-MM-dd'),
          invoice_type: editedType,
          notes: editedNotes || null,
          pdf_url: pdfUrl,
          customer_id: editedCustomerId || null,
          ...amounts,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('invoice_id', invoice.invoice_id)

      if (updateError) throw updateError

      toast({
        title: 'Factura actualizada',
        description: 'Los cambios se guardaron correctamente'
      })

      setIsEditing(false)
      
      // Cerrar el diálogo primero
      onOpenChange(false)
      
      // Luego actualizar la lista con un pequeño delay para asegurar que la vista SQL se actualice
      setTimeout(() => {
        onUpdate()
      }, 100)
      
    } catch (error: any) {
      console.error('Error al guardar factura:', error)
      toast({
        title: 'Error al guardar',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
      setIsUploading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vigente':
        return <Badge variant="default">Vigente</Badge>
      case 'pendiente':
        return <Badge variant="secondary">Pendiente</Badge>
      case 'anulada':
        return <Badge variant="destructive">Anulada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      venta: 'Venta',
      exenta: 'Exenta',
      boleta: 'Boleta'
    }
    return <Badge variant="outline">{labels[type] || type}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-card-foreground text-2xl">
              Detalle de Factura
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {isEditing ? (
            // MODO EDICIÓN
            <>
              {/* Campos editables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Número de factura */}
                <div className="space-y-2">
                  <Label htmlFor="edit-number" className="text-foreground">Número de Factura *</Label>
                  <Input
                    id="edit-number"
                    value={editedNumber}
                    onChange={(e) => setEditedNumber(e.target.value)}
                    placeholder="Ingrese número de factura"
                    className="bg-background border-input text-foreground"
                  />
                </div>

                {/* Fecha de emisión */}
                <div className="space-y-2">
                  <Label htmlFor="edit-date" className="text-foreground">Fecha de Emisión *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-background border-input text-foreground"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {editedDate ? format(editedDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                      <Calendar
                        mode="single"
                        selected={editedDate}
                        onSelect={setEditedDate}
                        initialFocus
                        locale={es}
                        className="bg-popover"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tipo de factura */}
                <div className="space-y-2">
                  <Label htmlFor="edit-type" className="text-foreground">Tipo de Factura *</Label>
                  <Select value={editedType} onValueChange={setEditedType}>
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="venta">Venta</SelectItem>
                      <SelectItem value="exenta">Exenta</SelectItem>
                      <SelectItem value="boleta">Boleta</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {editedType !== invoice.invoice_type && 'Los montos se recalcularán al guardar'}
                  </p>
                </div>

                {/* Cliente */}
                <div className="space-y-2">
                  <Label className="text-foreground">Cliente</Label>
                  <Popover open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between bg-background border-input text-foreground"
                      >
                        <span className="truncate">
                          {editedCustomerId 
                            ? customers.find(c => c.customer_id === editedCustomerId)?.name || 'Seleccionar cliente'
                            : 'Sin cliente asignado'
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
                            <CommandItem
                              onSelect={() => {
                                setEditedCustomerId('')
                                setShowCustomerSearch(false)
                                setCustomerSearch('')
                              }}
                              className="cursor-pointer hover:bg-muted"
                            >
                              <span className="text-sm text-muted-foreground italic">Sin cliente</span>
                            </CommandItem>
                            {customers
                              .filter(customer => {
                                const search = (customerSearch || '').toLowerCase()
                                const name = (customer.name || '').toLowerCase()
                                const rut = (customer.rut || '').toLowerCase()
                                return name.includes(search) || rut.includes(search)
                              })
                              .map((customer) => (
                                <CommandItem
                                  key={customer.customer_id}
                                  onSelect={() => {
                                    setEditedCustomerId(customer.customer_id)
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
                  {editedCustomerId && (
                    <div className="text-xs text-muted-foreground">
                      RUT: {customers.find(c => c.customer_id === editedCustomerId)?.rut}
                    </div>
                  )}
                </div>

                {/* Subir PDF */}
                <div className="space-y-2">
                  <Label htmlFor="edit-pdf" className="text-foreground">
                    {invoice.pdf_url ? 'Reemplazar PDF' : 'Subir PDF'}
                  </Label>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {editedPdfFile ? editedPdfFile.name : 'Seleccionar archivo'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF, máximo 5MB
                  </p>
                </div>
              </div>

              {/* Notas editables */}
              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="text-foreground">Notas</Label>
                <Textarea
                  id="edit-notes"
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="bg-background border-input text-foreground"
                />
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(invoice.status)}
                {getTypeBadge(editedType)}
              </div>
            </>
          ) : (
            // MODO VISUALIZACIÓN
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número de Factura</p>
                  <p className="text-2xl font-bold text-foreground">{invoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Fecha de Emisión</p>
                  <p className="text-lg font-medium text-foreground">
                    {format(new Date(invoice.invoice_date), 'dd MMMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(invoice.status)}
                {getTypeBadge(invoice.invoice_type)}
              </div>

              {/* Cliente asociado */}
              {(invoice as any).customer_id && (
                <div className="bg-muted/20 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Cliente Asociado</p>
                  <p className="text-sm font-medium text-foreground">
                    {customers.find(c => c.customer_id === (invoice as any).customer_id)?.name || 'Cargando...'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    RUT: {customers.find(c => c.customer_id === (invoice as any).customer_id)?.rut || '-'}
                  </p>
                </div>
              )}
            </>
          )}

          <Separator className="bg-border" />

          {/* Montos */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium text-foreground">{formatCLP(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA (19%):</span>
              <span className="font-medium text-foreground">{formatCLP(invoice.tax_amount)}</span>
            </div>
            <Separator className="bg-border" />
            <div className="flex justify-between">
              <span className="text-lg font-bold text-foreground">Total:</span>
              <span className="text-lg font-bold text-foreground">{formatCLP(invoice.total_amount)}</span>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Pedidos incluidos */}
          <div>
            <h3 className="text-lg font-semibold text-card-foreground mb-3">
              Pedidos Incluidos ({invoice.orders.length})
            </h3>
            {invoice.orders.length > 0 ? (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-muted/50">
                      <TableHead className="text-muted-foreground">ID Pedido</TableHead>
                      <TableHead className="text-muted-foreground">Fecha</TableHead>
                      <TableHead className="text-muted-foreground">Cliente</TableHead>
                      <TableHead className="text-muted-foreground">Producto</TableHead>
                      <TableHead className="text-right text-muted-foreground">Monto Facturado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.orders.map((order, index) => (
                      <TableRow key={index} className="border-border hover:bg-muted/50">
                        <TableCell className="font-mono text-sm text-foreground">{order.order_id}</TableCell>
                        <TableCell className="text-foreground">
                          {format(new Date(order.order_date), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="text-foreground">{order.customer_name}</TableCell>
                        <TableCell className="text-foreground">{order.product_name}</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatCLP(order.amount_invoiced)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg p-4 text-center text-muted-foreground">
                Factura sin pedidos asociados
              </div>
            )}
          </div>

          {/* Notas (solo en modo visualización) */}
          {!isEditing && invoice.notes && (
            <>
              <Separator className="bg-border" />
              <div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Notas</h3>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Timeline */}
          <Separator className="bg-border" />
          <div>
            <h3 className="text-lg font-semibold text-card-foreground mb-3">Historial</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <div>
                  <p className="text-foreground">
                    Factura creada el{' '}
                    <span className="font-medium">
                      {format(new Date(invoice.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                    </span>
                  </p>
                </div>
              </div>
              {invoice.updated_at && invoice.updated_at !== invoice.created_at && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground mt-1.5" />
                  <div>
                    <p className="text-foreground">
                      Última modificación el{' '}
                      <span className="font-medium">
                        {format(new Date(invoice.updated_at), 'dd MMM yyyy HH:mm', { locale: es })}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || isUploading}
                >
                  {isSaving ? (
                    <>Guardando...</>
                  ) : isUploading ? (
                    <>Subiendo PDF...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {canEdit && invoice.status === 'vigente' && (
                  <Button
                    variant="outline"
                    onClick={handleStartEdit}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Editar Factura
                  </Button>
                )}
                {invoice.pdf_url && (
                  <Button
                    variant="outline"
                    onClick={() => onViewPDF(invoice)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Ver PDF
                  </Button>
                )}
                {invoice.status === 'vigente' && canEdit && (
                  <Button
                    variant="destructive"
                    onClick={() => onAnular(invoice)}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Anular Factura
                  </Button>
                )}
                <Button onClick={() => onOpenChange(false)}>
                  Cerrar
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
