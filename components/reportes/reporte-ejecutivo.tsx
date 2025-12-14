'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FileText, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { getReporteEjecutivo } from '@/lib/reportes/queries'
import { generarReporteEjecutivoPDF } from '@/lib/reportes/pdf-generator'
import { ReporteEjecutivoData } from '@/lib/reportes/types'

interface ReporteEjecutivoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fechaInicio: string
  fechaFin: string
}

export function ReporteEjecutivo({ open, onOpenChange, fechaInicio, fechaFin }: ReporteEjecutivoProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ReporteEjecutivoData | null>(null)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    if (open) {
      cargarDatos()
    }
  }, [open, fechaInicio, fechaFin])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const reporteData = await getReporteEjecutivo(fechaInicio, fechaFin)
      setData(reporteData)
    } catch (error) {
      console.error('Error cargando reporte ejecutivo:', error)
    }
    setLoading(false)
  }

  const exportarPDF = async () => {
    if (!data) return
    setExportando(true)
    try {
      generarReporteEjecutivoPDF(data)
    } catch (error) {
      console.error('Error exportando PDF:', error)
    }
    setExportando(false)
  }

  const comparativaColor = (data?.resumen.ingresosComparativa || 0) >= 0 ? 'text-green-600' : 'text-red-600'
  const ComparativaIcon = (data?.resumen.ingresosComparativa || 0) >= 0 ? TrendingUp : TrendingDown

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[90vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Resumen Ejecutivo
          </DialogTitle>
          <DialogDescription>
            Período: {fechaInicio} al {fechaFin}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* KPIs Principales */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="col-span-full md:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ingresos Totales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    ${data.resumen.ingresosTotales.toLocaleString('es-CL')}
                  </div>
                  <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${comparativaColor}`}>
                    <ComparativaIcon className="h-4 w-4" />
                    {data.resumen.ingresosComparativa >= 0 ? '+' : ''}
                    {data.resumen.ingresosComparativa.toFixed(1)}% vs período anterior
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pedidos Totales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.resumen.pedidosTotales}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Clientes Activos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.resumen.clientesActivos}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ventas por Tipo y Cuentas por Cobrar */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ventas por Tipo de Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium">Hogar</span>
                      </div>
                      <span className="text-lg font-bold">
                        ${data.ventasPorTipo.hogar.toLocaleString('es-CL')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium">Empresa</span>
                      </div>
                      <span className="text-lg font-bold">
                        ${data.ventasPorTipo.empresa.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cuentas por Cobrar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Total Pendiente
                      </span>
                      <span className="text-2xl font-bold text-red-600">
                        ${data.cuentasPorCobrar.total.toLocaleString('es-CL')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Cantidad de Cuentas
                      </span>
                      <Badge variant="destructive" className="text-lg px-3 py-1">
                        {data.cuentasPorCobrar.cantidad}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top 5 Clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 5 Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Total Compras</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topClientes.map((cliente, index) => (
                      <TableRow key={cliente.customer_id}>
                        <TableCell className="font-semibold">{index + 1}</TableCell>
                        <TableCell className="text-sm">{cliente.name}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant={cliente.customer_type === 'Empresa' ? 'default' : 'secondary'}>
                            {cliente.customer_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{cliente.total_pedidos}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          ${cliente.total_compras.toLocaleString('es-CL')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Top 5 Productos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 5 Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Vendidos</TableHead>
                      <TableHead className="text-right">Total Ventas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProductos.map((producto, index) => (
                      <TableRow key={producto.product_name}>
                        <TableCell className="font-semibold">{index + 1}</TableCell>
                        <TableCell className="text-sm">{producto.product_name}</TableCell>
                        <TableCell className="text-right text-sm">{producto.total_vendidos}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          ${producto.total_ventas.toLocaleString('es-CL')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Botón de Exportación */}
            <div className="flex gap-2 justify-end">
              <Button
                onClick={exportarPDF}
                disabled={exportando}
                size="lg"
              >
                {exportando ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-5 w-5" />
                )}
                Generar PDF Completo
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Este resumen ejecutivo está optimizado para exportar a PDF. 
              Haz clic en el botón superior para generar el documento completo.
            </p>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No hay datos disponibles para el período seleccionado
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

