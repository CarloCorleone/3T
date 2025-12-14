'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Calendar as CalendarIcon, X, Search } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, subQuarters } from 'date-fns'
import { es } from 'date-fns/locale'
import { CustomerSearch } from '@/components/customer-search'
import { supabase, type Customer } from '@/lib/supabase'

type PeriodoTipo = 'mes-actual' | 'mes-anterior' | 'trimestre' | 'ano' | 'personalizado'

export type InvoiceFilters = {
  startDate: Date | undefined
  endDate: Date | undefined
  customerId: string
  invoiceType: string
  searchTerm: string
}

type InvoiceFiltersProps = {
  filters: InvoiceFilters
  onFiltersChange: (filters: InvoiceFilters) => void
  onClearFilters: () => void
}

export function InvoiceFilters({ filters, onFiltersChange, onClearFilters }: InvoiceFiltersProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [periodo, setPeriodo] = useState<PeriodoTipo>('mes-actual')

  // Cargar lista de clientes
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('3t_customers')
          .select('*')
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

  const handlePeriodoChange = (value: PeriodoTipo) => {
    setPeriodo(value)
    const hoy = new Date()
    
    switch (value) {
      case 'mes-actual':
        onFiltersChange({
          ...filters,
          startDate: startOfMonth(hoy),
          endDate: endOfMonth(hoy)
        })
        break
      case 'mes-anterior':
        const mesAnterior = subMonths(hoy, 1)
        onFiltersChange({
          ...filters,
          startDate: startOfMonth(mesAnterior),
          endDate: endOfMonth(mesAnterior)
        })
        break
      case 'trimestre':
        const trimestreAtras = subQuarters(hoy, 1)
        onFiltersChange({
          ...filters,
          startDate: trimestreAtras,
          endDate: hoy
        })
        break
      case 'ano':
        onFiltersChange({
          ...filters,
          startDate: startOfYear(hoy),
          endDate: hoy
        })
        break
      case 'personalizado':
        // Mantener las fechas actuales
        break
    }
  }

  const handleCustomerSelect = (customer: Customer | null) => {
    onFiltersChange({
      ...filters,
      customerId: customer?.customer_id || ''
    })
  }

  const hasActiveFilters = 
    filters.startDate || 
    filters.endDate || 
    filters.customerId || 
    filters.invoiceType !== 'todos' || 
    filters.searchTerm

  return (
    <div className="space-y-4">
      {/* Filtros Predefinidos */}
      <div className="space-y-2">
        <Label htmlFor="periodo" className="text-foreground">Período Predefinido</Label>
        <Select value={periodo} onValueChange={handlePeriodoChange}>
          <SelectTrigger className="bg-background border-input text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="mes-actual">Mes Actual</SelectItem>
            <SelectItem value="mes-anterior">Mes Anterior</SelectItem>
            <SelectItem value="trimestre">Trimestre</SelectItem>
            <SelectItem value="ano">Año</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Primera fila: Rango de fechas y búsqueda */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fecha inicio */}
          <div className="space-y-2">
            <Label htmlFor="fecha-inicio" className="text-foreground">Fecha inicio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal bg-background border-input text-foreground"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {filters.startDate ? format(filters.startDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) => onFiltersChange({ ...filters, startDate: date })}
                  initialFocus
                  locale={es}
                  className="bg-popover"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fecha fin */}
          <div className="space-y-2">
            <Label htmlFor="fecha-fin" className="text-foreground">Fecha fin</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal bg-background border-input text-foreground"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {filters.endDate ? format(filters.endDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) => onFiltersChange({ ...filters, endDate: date })}
                  initialFocus
                  locale={es}
                  className="bg-popover"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Búsqueda de texto */}
          <div className="space-y-2">
            <Label htmlFor="busqueda" className="text-foreground">Buscar factura/pedido</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="busqueda"
                placeholder="Número de factura o pedido"
                value={filters.searchTerm}
                onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
                className="pl-9 bg-background border-input text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Segunda fila: Cliente, Tipo de factura, Botón limpiar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="cliente" className="text-foreground">Cliente</Label>
            <CustomerSearch
              customers={customers}
              value={filters.customerId}
              onSelect={handleCustomerSelect}
              placeholder={loadingCustomers ? "Cargando clientes..." : "Buscar cliente..."}
            />
          </div>

          {/* Tipo de factura */}
          <div className="space-y-2">
            <Label htmlFor="tipo" className="text-foreground">Tipo de factura</Label>
            <Select 
              value={filters.invoiceType} 
              onValueChange={(value) => onFiltersChange({ ...filters, invoiceType: value })}
            >
              <SelectTrigger className="bg-background border-input text-foreground">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="venta">Venta</SelectItem>
                <SelectItem value="exenta">Exenta</SelectItem>
                <SelectItem value="boleta">Boleta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón limpiar filtros */}
          <div className="space-y-2">
            <Label className="invisible">Acciones</Label>
            <Button
              variant="outline"
              className="w-full"
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        </div>
    </div>
  )
}
