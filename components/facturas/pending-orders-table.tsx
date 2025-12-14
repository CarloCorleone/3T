'use client'

import { useState, useEffect, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { FileDown, Receipt, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CustomerSearch } from '@/components/customer-search'
import { supabase, type OrderWithInvoices, type Customer } from '@/lib/supabase'
import * as XLSX from 'xlsx'

type PendingOrdersTableProps = {
  orders: OrderWithInvoices[]
  loading: boolean
  onCreateInvoice: (selectedOrders: OrderWithInvoices[]) => void
}

export function PendingOrdersTable({ orders, loading, onCreateInvoice }: PendingOrdersTableProps) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')

  // Cargar lista de clientes tipo Empresa
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('3t_customers')
          .select('*')
          .eq('customer_type', 'Empresa')
          .order('name', { ascending: true })

        if (error) throw error
        setCustomers(data || [])
      } catch (error) {
        console.error('Error al cargar clientes:', error)
      } finally {
        setLoadingCustomers(false)
      }
    }

    loadCustomers()
  }, [])

  // Filtrar pedidos por cliente seleccionado
  const filteredOrders = useMemo(() => {
    if (!selectedCustomerId) return orders
    return orders.filter(order => order.customer_name === selectedCustomerId)
  }, [orders, selectedCustomerId])

  // Limpiar selección cuando cambia el filtro
  useEffect(() => {
    setSelectedOrders(new Set())
  }, [selectedCustomerId])

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(filteredOrders.map(o => o.order_id)))
    } else {
      setSelectedOrders(new Set())
    }
  }

  const handleClearFilter = () => {
    setSelectedCustomerId('')
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders)
    if (checked) {
      newSelected.add(orderId)
    } else {
      newSelected.delete(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const handleCreateInvoice = () => {
    const selected = filteredOrders.filter(o => selectedOrders.has(o.order_id))
    onCreateInvoice(selected)
    setSelectedOrders(new Set())
  }

  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomerId(customer?.name || '')
  }

  const handleExportToExcel = () => {
    const exportData = filteredOrders.map(order => ({
      'ID Pedido': order.order_id,
      'Fecha': format(new Date(order.order_date), 'dd/MM/yyyy', { locale: es }),
      'Cliente': order.customer_name,
      'Monto Total': order.final_price,
      'Monto Pendiente': order.remaining_to_invoice,
      'Estado': 'Sin Facturar'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos Sin Facturar')
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 15 }, // ID Pedido
      { wch: 12 }, // Fecha
      { wch: 30 }, // Cliente
      { wch: 15 }, // Monto Total
      { wch: 15 }, // Monto Pendiente
      { wch: 15 }  // Estado
    ]
    ws['!cols'] = colWidths
    
    XLSX.writeFile(wb, `pedidos-sin-facturar-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  if (loading) {
    return (
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-muted/50">
              <TableHead className="w-12"></TableHead>
              <TableHead className="text-muted-foreground">ID Pedido</TableHead>
              <TableHead className="text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-right text-muted-foreground">Monto Neto</TableHead>
              <TableHead className="text-right text-muted-foreground">Total con IVA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i} className="border-border">
                <TableCell colSpan={6}>
                  <Skeleton className="h-8 w-full bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center">
        <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No hay pedidos pendientes de facturar</p>
        <p className="text-sm text-muted-foreground mt-1">
          Todos los pedidos de empresas están facturados
        </p>
      </div>
    )
  }

  const selectedCount = selectedOrders.size
  const selectedTotal = filteredOrders
    .filter(o => selectedOrders.has(o.order_id))
    .reduce((sum, o) => sum + o.remaining_to_invoice, 0)

  return (
    <div className="space-y-4">
      {/* Barra de filtro por cliente */}
      <div className="bg-muted/20 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cliente-filter" className="text-foreground">Filtrar por cliente</Label>
            <CustomerSearch
              customers={customers}
              value={customers.find(c => c.name === selectedCustomerId)?.customer_id || ''}
              onSelect={handleCustomerSelect}
              placeholder={loadingCustomers ? "Cargando clientes..." : "Buscar cliente..."}
            />
          </div>
          {selectedCustomerId && (
            <div className="space-y-2">
              <Label className="invisible">Acciones</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleClearFilter}
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar filtro
              </Button>
            </div>
          )}
        </div>
        {selectedCustomerId && (
          <p className="text-sm text-muted-foreground mt-2">
            Mostrando {filteredOrders.length} pedido(s) de <span className="font-semibold">{selectedCustomerId}</span>
          </p>
        )}
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
        <div className="flex items-center gap-4">
          <p className="text-sm text-foreground">
            {selectedCount > 0 ? (
              <>
                <span className="font-bold">{selectedCount}</span> pedido(s) seleccionado(s) ·{' '}
                <span className="font-bold">{formatCLP(selectedTotal)}</span>
              </>
            ) : (
              'Selecciona pedidos para facturar'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToExcel}
            disabled={filteredOrders.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar a Excel
          </Button>
          {selectedCount > 0 && (
            <Button
              size="sm"
              onClick={handleCreateInvoice}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Crear Factura ({selectedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="text-muted-foreground">ID Pedido</TableHead>
              <TableHead className="text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-right text-muted-foreground">
                <div className="flex flex-col items-end">
                  <span className="text-base font-semibold text-foreground">Monto Neto</span>
                  <span className="text-xs text-muted-foreground">(sin IVA)</span>
                </div>
              </TableHead>
              <TableHead className="text-right text-muted-foreground">
                <div className="flex flex-col items-end">
                  <span className="text-sm">Total con IVA</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 && selectedCustomerId ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">No hay pedidos para el cliente seleccionado</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const montoNeto = order.remaining_to_invoice / 1.19
                const montoConIVA = order.remaining_to_invoice
                
                return (
                  <TableRow
                    key={order.order_id}
                    className="border-border hover:bg-muted/50"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.has(order.order_id)}
                        onCheckedChange={(checked) => handleSelectOrder(order.order_id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm text-foreground">
                      {order.order_id}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {format(new Date(order.order_date), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customer_name}</span>
                        <Badge variant="outline" className="w-fit text-xs mt-1">Empresa</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-base font-bold text-foreground">{formatCLP(montoNeto)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-muted-foreground">{formatCLP(montoConIVA)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

