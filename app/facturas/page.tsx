'use client'

import { useState, useEffect } from 'react'
import { supabase, type InvoiceWithOrders, type OrderWithInvoices } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import { useToast } from '@/hooks/use-toast'
import { useFacturasRealtime } from '@/hooks/use-facturas-realtime'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, FileText, DollarSign, Receipt, ShoppingCart } from 'lucide-react'
import { InvoiceFilters, type InvoiceFilters as InvoiceFiltersType } from '@/components/facturas/invoice-filters'
import { InvoiceTable } from '@/components/facturas/invoice-table'
import { InvoiceForm } from '@/components/facturas/invoice-form'
import { InvoiceDetailDialog } from '@/components/facturas/invoice-detail-dialog'
import { PendingOrdersTable } from '@/components/facturas/pending-orders-table'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export default function FacturasPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  
  // State
  const [activeTab, setActiveTab] = useState('facturas')
  const [invoices, setInvoices] = useState<InvoiceWithOrders[]>([])
  const [pendingOrders, setPendingOrders] = useState<OrderWithInvoices[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPending, setLoadingPending] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithOrders | null>(null)
  const [invoiceToCancel, setInvoiceToCancel] = useState<InvoiceWithOrders | null>(null)
  const [preselectedOrders, setPreselectedOrders] = useState<OrderWithInvoices[]>([])
  
  // Filters
  const [filters, setFilters] = useState<InvoiceFiltersType>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    customerId: '',
    invoiceType: 'todos',
    searchTerm: ''
  })

  // Metrics
  const [metrics, setMetrics] = useState({
    totalFacturado: 0,
    cantidadPedidosSinFactura: 0,
    montoPedidosSinFactura: 0,
    cantidadFacturas: 0
  })

  useEffect(() => {
    loadInvoices()
  }, [filters])

  useEffect(() => {
    if (activeTab === 'pendientes') {
      loadPendingOrders()
    }
  }, [activeTab])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('v_invoices_with_orders')
        .select('*')
        .order('invoice_date', { ascending: false })

      // Apply filters - CRÍTICO: Filtrar por invoice_date (fecha de emisión)
      if (filters.startDate) {
        query = query.gte('invoice_date', format(filters.startDate, 'yyyy-MM-dd'))
      }
      if (filters.endDate) {
        query = query.lte('invoice_date', format(filters.endDate, 'yyyy-MM-dd'))
      }
      if (filters.invoiceType !== 'todos') {
        query = query.eq('invoice_type', filters.invoiceType)
      }
      if (filters.searchTerm) {
        query = query.or(`invoice_number.ilike.%${filters.searchTerm}%,orders->order_id.ilike.%${filters.searchTerm}%`)
      }

      const { data, error } = await query

      if (error) throw error

      // Filter by customer if selected (needs to be done client-side due to JSON field)
      let filteredData = data || []
      if (filters.customerId) {
        filteredData = filteredData.filter(invoice => 
          invoice.orders.some((order: any) => order.customer_id === filters.customerId)
        )
      }

      setInvoices(filteredData)
      calculateMetrics(filteredData)
    } catch (error: any) {
      toast({
        title: 'Error al cargar facturas',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadPendingOrders = async () => {
    setLoadingPending(true)
    try {
      // Usar la vista optimizada: pedidos de empresas sin invoice_number
      const { data: ordersData, error: ordersError } = await supabase
        .from('v_pending_invoices_empresa')
        .select('*')

      if (ordersError) throw ordersError

      // Transformar al formato esperado por OrderWithInvoices
      const formattedOrders = (ordersData || []).map(order => ({
        order_id: order.order_id,
        order_date: order.order_date,
        final_price: order.final_price,
        customer_name: order.customer_name,
        total_invoiced: 0,
        remaining_to_invoice: order.final_price, // Todo el monto está pendiente
        invoices: []
      }))

      setPendingOrders(formattedOrders)
        
      // Calcular métricas de pedidos sin factura
      const cantidadPedidosSinFactura = formattedOrders.length
      const montoPedidosSinFactura = formattedOrders.reduce(
        (sum, o) => sum + o.final_price,
        0
      )

      setMetrics(prev => ({
        ...prev,
        cantidadPedidosSinFactura,
        montoPedidosSinFactura
      }))
    } catch (error: any) {
      toast({
        title: 'Error al cargar pedidos pendientes',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoadingPending(false)
    }
  }

  const calculateMetrics = (invoices: InvoiceWithOrders[]) => {
    // CRÍTICO: Solo facturas vigentes emitidas en el período según invoice_date
    const vigentes = invoices.filter(i => {
      if (i.status !== 'vigente') return false
      
      // Verificar que la fecha de facturación esté en el rango
      const invoiceDate = new Date(i.invoice_date)
      if (filters.startDate && invoiceDate < filters.startDate) return false
      if (filters.endDate && invoiceDate > filters.endDate) return false
      
      return true
    })

    setMetrics(prev => ({
      ...prev,
      totalFacturado: vigentes.reduce((sum, i) => sum + i.subtotal, 0), // Usar subtotal (sin IVA)
      cantidadFacturas: vigentes.length
    }))
  }

  const handleClearFilters = () => {
    setFilters({
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
      customerId: '',
      invoiceType: 'todos',
      searchTerm: ''
    })
  }

  const handleViewDetails = (invoice: InvoiceWithOrders) => {
    setSelectedInvoice(invoice)
    setShowDetail(true)
  }

  const handleViewPDF = (invoice: InvoiceWithOrders) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank')
    } else {
      toast({
        title: 'PDF no disponible',
        description: 'Esta factura no tiene un PDF asociado',
        variant: 'destructive'
      })
    }
  }

  const handleAnular = (invoice: InvoiceWithOrders) => {
    setInvoiceToCancel(invoice)
  }

  const confirmAnular = async () => {
    if (!invoiceToCancel) return

    try {
      const { error } = await supabase
        .from('3t_invoices')
        .update({ 
          status: 'anulada',
          updated_at: new Date().toISOString()
        })
        .eq('invoice_id', invoiceToCancel.invoice_id)

      if (error) throw error

      toast({
        title: 'Factura anulada',
        description: `La factura ${invoiceToCancel.invoice_number} ha sido anulada`
      })

      // ✅ loadInvoices() eliminado - Realtime (onUpdate) lo maneja automáticamente
      setInvoiceToCancel(null)
      setShowDetail(false)
    } catch (error: any) {
      toast({
        title: 'Error al anular factura',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleCreateInvoiceWithOrders = (orders: OrderWithInvoices[]) => {
    setPreselectedOrders(orders)
    setShowForm(true)
  }

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount)
  }

  // Permission check
  const canManageInvoices = user?.rol === 'admin' || user?.rol === 'operador'

  // Cargar pedidos pendientes al inicializar
  useEffect(() => {
    loadPendingOrders()
  }, [])

  // Integrar Realtime para actualizaciones automáticas
  const { isConnected: realtimeConnected } = useFacturasRealtime({
    onInsert: (newInvoice) => {
      console.log('[Realtime] Nueva factura creada:', newInvoice)
      loadInvoices()
      loadPendingOrders() // También recargar pendientes porque puede haber cambiado
      toast({
        title: '📄 Nueva factura',
        description: 'Factura creada por otro usuario',
      })
    },
    onUpdate: (updatedInvoice) => {
      console.log('[Realtime] Factura actualizada:', updatedInvoice)
      loadInvoices()
      loadPendingOrders() // Recargar pendientes en caso de anulación
      toast({
        title: '✏️ Factura actualizada',
        description: `Cambios en factura ${updatedInvoice.invoice_number || 'sin número'}`,
      })
    },
    onDelete: (deletedInvoice) => {
      console.log('[Realtime] Factura eliminada:', deletedInvoice)
      loadInvoices()
      loadPendingOrders()
      toast({
        title: '🗑️ Factura eliminada',
        description: 'Factura eliminada por otro usuario',
      })
    }
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Facturas</h1>
            <p className="text-muted-foreground">
              Gestión de facturas y documentación tributaria
            </p>
          </div>
          {/* Indicador de conexión Realtime */}
          <Badge variant={realtimeConnected ? "default" : "secondary"} className="h-6">
            {realtimeConnected ? "🟢 En vivo" : "⚪ Sin conexión"}
          </Badge>
        </div>
        {canManageInvoices && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Factura
          </Button>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Facturado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold text-foreground">{formatCLP(metrics.totalFacturado)}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                + IVA {formatCLP(metrics.totalFacturado * 0.19)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Facturas vigentes (sin IVA)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos Sin Facturar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-secondary" />
                <p className="text-2xl font-bold text-foreground">{formatCLP(metrics.montoPedidosSinFactura / 1.19)}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Total {formatCLP(metrics.montoPedidosSinFactura)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Monto neto por facturar
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cantidad Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-orange-500" />
              <p className="text-2xl font-bold text-foreground">{metrics.cantidadPedidosSinFactura}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pedidos sin facturar (empresas)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Facturas Emitidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-foreground">{metrics.cantidadFacturas}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de facturas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Separados */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-foreground">Período de Análisis</CardTitle>
          <CardDescription>Selecciona el rango de fechas para el análisis</CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted">
          <TabsTrigger value="facturas">Facturas Emitidas</TabsTrigger>
          <TabsTrigger value="pendientes">
            Pedidos Por Facturar
            {metrics.cantidadPedidosSinFactura > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                {metrics.cantidadPedidosSinFactura}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facturas" className="space-y-4 mt-6">
          {/* Table */}
          <InvoiceTable
            invoices={invoices}
            loading={loading}
            onViewDetails={handleViewDetails}
            onViewPDF={handleViewPDF}
            onAnular={handleAnular}
          />
        </TabsContent>

        <TabsContent value="pendientes" className="space-y-4 mt-6">
          <PendingOrdersTable
            orders={pendingOrders}
            loading={loadingPending}
            onCreateInvoice={handleCreateInvoiceWithOrders}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {canManageInvoices && (
        <InvoiceForm
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open)
            if (!open) {
              setPreselectedOrders([])
            }
          }}
          onSuccess={() => {
            // ✅ loadInvoices() y loadPendingOrders() eliminados - Realtime lo maneja
            setPreselectedOrders([])
          }}
          preselectedOrders={preselectedOrders}
        />
      )}

      <InvoiceDetailDialog
        invoice={selectedInvoice}
        open={showDetail}
        onOpenChange={setShowDetail}
        onViewPDF={handleViewPDF}
        onAnular={handleAnular}
        onUpdate={() => {
          // ✅ loadInvoices() y loadPendingOrders() eliminados - Realtime lo maneja
        }}
        canEdit={canManageInvoices}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={!!invoiceToCancel} onOpenChange={() => setInvoiceToCancel(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-card-foreground">¿Anular factura?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta acción anulará la factura {invoiceToCancel?.invoice_number}. 
              Los pedidos asociados quedarán disponibles para ser facturados nuevamente.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToCancel(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmAnular} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Anular Factura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
