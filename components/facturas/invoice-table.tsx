'use client'

import { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, FileText, Ban, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { InvoiceWithOrders } from '@/lib/supabase'

type SortField = 'date' | 'number' | 'customer'
type SortOrder = 'asc' | 'desc' | null

type InvoiceTableProps = {
  invoices: InvoiceWithOrders[]
  loading: boolean
  onViewDetails: (invoice: InvoiceWithOrders) => void
  onViewPDF: (invoice: InvoiceWithOrders) => void
  onAnular: (invoice: InvoiceWithOrders) => void
}

export function InvoiceTable({ invoices, loading, onViewDetails, onViewPDF, onAnular }: InvoiceTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount)
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

  const getUniqueCustomers = (invoice: InvoiceWithOrders) => {
    // ✅ Primero verificar si la factura tiene un cliente directo asignado
    if ((invoice as any).customer_name) {
      return (invoice as any).customer_name
    }
    
    // ✅ Si no, buscar en los pedidos asociados
    const orders = invoice.orders || []
    const uniqueNames = [...new Set(orders.map(o => o.customer_name).filter(Boolean))]
    
    if (uniqueNames.length === 0) return 'Sin cliente'
    if (uniqueNames.length === 1) return uniqueNames[0]
    if (uniqueNames.length === 2) return `${uniqueNames[0]}, ${uniqueNames[1]}`
    return `${uniqueNames[0]}, ${uniqueNames[1]} +${uniqueNames.length - 2} más`
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Ciclo: asc -> desc -> null
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else if (sortOrder === 'desc') {
        setSortOrder(null)
        setSortField(null)
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
    }
    if (sortOrder === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4 text-primary" />
    }
    return <ArrowDown className="ml-2 h-4 w-4 text-primary" />
  }

  const sortedInvoices = useMemo(() => {
    if (!sortField || !sortOrder) return invoices

    return [...invoices].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'date':
          comparison = new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime()
          break
        case 'number':
          comparison = a.invoice_number.localeCompare(b.invoice_number, undefined, { numeric: true })
          break
        case 'customer':
          const customerA = getUniqueCustomers(a)
          const customerB = getUniqueCustomers(b)
          comparison = customerA.localeCompare(customerB)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [invoices, sortField, sortOrder])

  if (loading) {
    return (
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-muted/50">
              <TableHead>
                <div className="flex items-center text-muted-foreground">Fecha</div>
              </TableHead>
              <TableHead>
                <div className="flex items-center text-muted-foreground">N° Factura</div>
              </TableHead>
              <TableHead>
                <div className="flex items-center text-muted-foreground">Cliente(s)</div>
              </TableHead>
              <TableHead className="text-muted-foreground">Pedidos</TableHead>
              <TableHead className="text-right">
                <div className="flex flex-col items-end">
                  <span className="text-base font-semibold text-foreground">Subtotal</span>
                  <span className="text-xs text-muted-foreground">(sin IVA)</span>
                </div>
              </TableHead>
              <TableHead className="text-right text-muted-foreground">
                <div className="flex flex-col items-end">
                  <span className="text-sm">Total</span>
                  <span className="text-xs">(con IVA)</span>
                </div>
              </TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-center text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i} className="border-border">
                <TableCell colSpan={8}>
                  <Skeleton className="h-8 w-full bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No se encontraron facturas con los filtros aplicados</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-muted/50">
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('date')}
                className="flex items-center px-0 hover:bg-transparent"
              >
                <span className="text-muted-foreground">Fecha</span>
                {getSortIcon('date')}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('number')}
                className="flex items-center px-0 hover:bg-transparent"
              >
                <span className="text-muted-foreground">N° Factura</span>
                {getSortIcon('number')}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('customer')}
                className="flex items-center px-0 hover:bg-transparent"
              >
                <span className="text-muted-foreground">Cliente(s)</span>
                {getSortIcon('customer')}
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground">Pedidos</TableHead>
            <TableHead className="text-right">
              <div className="flex flex-col items-end">
                <span className="text-base font-semibold text-foreground">Subtotal</span>
                <span className="text-xs text-muted-foreground">(sin IVA)</span>
              </div>
            </TableHead>
            <TableHead className="text-right text-muted-foreground">
              <div className="flex flex-col items-end">
                <span className="text-sm">Total</span>
                <span className="text-xs text-muted-foreground">(con IVA)</span>
              </div>
            </TableHead>
            <TableHead className="text-muted-foreground">Estado</TableHead>
            <TableHead className="text-center text-muted-foreground">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvoices.map((invoice) => (
            <TableRow
              key={invoice.invoice_id}
              className="border-border hover:bg-muted/50 cursor-pointer"
              onClick={() => onViewDetails(invoice)}
            >
              <TableCell className="text-foreground">
                {format(new Date(invoice.invoice_date), 'dd MMM yyyy', { locale: es })}
              </TableCell>
              <TableCell className="text-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{invoice.invoice_number}</span>
                  {getTypeBadge(invoice.invoice_type)}
                </div>
              </TableCell>
              <TableCell className="text-foreground max-w-[200px] truncate">
                {getUniqueCustomers(invoice)}
              </TableCell>
              <TableCell className="text-foreground">
                <span className="text-sm">{invoice.orders.length} pedido(s)</span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end">
                  <span className="text-base font-bold text-foreground">{formatCLP(invoice.subtotal)}</span>
                  <span className="text-xs text-muted-foreground">+ IVA {formatCLP(invoice.tax_amount)}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-foreground">{formatCLP(invoice.total_amount)}</span>
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(invoice.status)}
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      onViewDetails(invoice)
                    }}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </DropdownMenuItem>
                    {invoice.pdf_url && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        onViewPDF(invoice)
                      }}>
                        <FileText className="mr-2 h-4 w-4" />
                        Ver PDF
                      </DropdownMenuItem>
                    )}
                    {invoice.status === 'vigente' && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onAnular(invoice)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Anular factura
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
