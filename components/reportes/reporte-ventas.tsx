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
import { Download, FileText, Loader2, TrendingUp } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { getVentasData, calcularVentasResumen } from '@/lib/reportes/queries'
import { exportarVentasExcel } from '@/lib/reportes/excel-generator'
import { generarVentasPDF } from '@/lib/reportes/pdf-generator'
import { VentasData, VentasResumen } from '@/lib/reportes/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ReporteVentasProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fechaInicio: string
  fechaFin: string
}

export function ReporteVentas({ open, onOpenChange, fechaInicio, fechaFin }: ReporteVentasProps) {
  const [loading, setLoading] = useState(false)
  const [ventas, setVentas] = useState<VentasData[]>([])
  const [resumen, setResumen] = useState<VentasResumen | null>(null)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    if (open) {
      cargarDatos()
    }
  }, [open, fechaInicio, fechaFin])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const data = await getVentasData(fechaInicio, fechaFin)
      setVentas(data)
      const resumenData = calcularVentasResumen(data)
      setResumen(resumenData)
    } catch (error) {
      console.error('Error cargando ventas:', error)
    }
    setLoading(false)
  }

  const exportarPDF = async () => {
    if (!resumen) return
    setExportando(true)
    try {
      generarVentasPDF(ventas, resumen, fechaInicio, fechaFin)
    } catch (error) {
      console.error('Error exportando PDF:', error)
    }
    setExportando(false)
  }

  const exportarExcel = async () => {
    setExportando(true)
    try {
      exportarVentasExcel(ventas, fechaInicio, fechaFin)
    } catch (error) {
      console.error('Error exportando Excel:', error)
    }
    setExportando(false)
  }

  // Preparar datos para gráfico de líneas (ventas por día)
  const ventasPorDia = ventas.reduce((acc, v) => {
    const fecha = v.order_date
    if (!acc[fecha]) {
      acc[fecha] = 0
    }
    acc[fecha] += v.final_price || 0
    return acc
  }, {} as Record<string, number>)

  const chartDataLinea = Object.entries(ventasPorDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, total]) => ({
      fecha: format(new Date(fecha), 'dd/MMM', { locale: es }),
      total: Math.round(total)
    }))

  // Preparar datos para gráfico de barras (por tipo de cliente)
  const chartDataBarras = [
    {
      tipo: 'Hogar',
      ventas: resumen?.totalVentasHogar || 0
    },
    {
      tipo: 'Empresa',
      ventas: resumen?.totalVentasEmpresa || 0
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Reporte de Ventas
          </DialogTitle>
          <DialogDescription>
            Período: {fechaInicio} al {fechaFin}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Métricas Clave */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Ventas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${resumen?.totalVentas.toLocaleString('es-CL')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Pedidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {resumen?.totalPedidos}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Botellones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {resumen?.totalBotellones}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ticket Promedio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${Math.round(resumen?.ticketPromedio || 0).toLocaleString('es-CL')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Gráfico de Líneas - Tendencia */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tendencia de Ventas Diarias</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      total: {
                        label: 'Ventas',
                        color: '#0891b2',
                      },
                    }}
                    className="h-[200px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartDataLinea}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fecha" fontSize={12} />
                        <YAxis fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#0891b2"
                          strokeWidth={2}
                          dot={{ fill: '#0891b2' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Barras - Por Tipo de Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ventas por Tipo de Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      ventas: {
                        label: 'Ventas',
                        color: '#10b981',
                      },
                    }}
                    className="h-[200px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataBarras}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="tipo" fontSize={12} />
                        <YAxis fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="ventas" fill="#10b981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Tabla de Detalles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalle de Ventas (últimas 20)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cant.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventas.slice(0, 20).map((venta) => (
                        <TableRow key={venta.order_id}>
                          <TableCell className="text-sm">
                            {format(new Date(venta.order_date), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="text-sm">{venta.customer_name || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{venta.customer_type || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{venta.product_name || 'N/A'}</TableCell>
                          <TableCell className="text-right text-sm">{venta.quantity || 0}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            ${(venta.final_price || 0).toLocaleString('es-CL')}
                          </TableCell>
                          <TableCell className="text-sm">{venta.payment_status || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {ventas.length > 20 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Mostrando 20 de {ventas.length} ventas. Exporta el reporte para ver todos los datos.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Botones de Exportación */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={exportarExcel}
                disabled={exportando || ventas.length === 0}
              >
                {exportando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar Excel
              </Button>
              <Button
                onClick={exportarPDF}
                disabled={exportando || ventas.length === 0}
              >
                {exportando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Exportar PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

