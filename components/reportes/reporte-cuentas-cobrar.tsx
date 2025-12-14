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
import { Download, FileText, Loader2, AlertCircle, DollarSign } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { getCuentasPorCobrar, calcularCuentasPorCobrarResumen } from '@/lib/reportes/queries'
import { exportarCuentasPorCobrarExcel } from '@/lib/reportes/excel-generator'
import { generarCuentasPorCobrarPDF } from '@/lib/reportes/pdf-generator'
import { CuentaPorCobrar, CuentasPorCobrarResumen } from '@/lib/reportes/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ReporteCuentasCobrarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReporteCuentasCobrar({ open, onOpenChange }: ReporteCuentasCobrarProps) {
  const [loading, setLoading] = useState(false)
  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([])
  const [resumen, setResumen] = useState<CuentasPorCobrarResumen | null>(null)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    if (open) {
      cargarDatos()
    }
  }, [open])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const data = await getCuentasPorCobrar()
      setCuentas(data)
      const resumenData = calcularCuentasPorCobrarResumen(data)
      setResumen(resumenData)
    } catch (error) {
      console.error('Error cargando cuentas por cobrar:', error)
    }
    setLoading(false)
  }

  const exportarPDF = async () => {
    if (!resumen) return
    setExportando(true)
    try {
      generarCuentasPorCobrarPDF(cuentas, resumen)
    } catch (error) {
      console.error('Error exportando PDF:', error)
    }
    setExportando(false)
  }

  const exportarExcel = async () => {
    setExportando(true)
    try {
      exportarCuentasPorCobrarExcel(cuentas)
    } catch (error) {
      console.error('Error exportando Excel:', error)
    }
    setExportando(false)
  }

  // Preparar datos para gráfico de barras (por antigüedad)
  const chartData = [
    {
      rango: '0-30 días',
      monto: resumen?.rango_0_30 || 0
    },
    {
      rango: '31-60 días',
      monto: resumen?.rango_31_60 || 0
    },
    {
      rango: '+60 días',
      monto: resumen?.rango_60_plus || 0
    }
  ]

  // Top 5 deudores
  const topDeudores = cuentas
    .reduce((acc, cuenta) => {
      const existing = acc.find(c => c.customer_id === cuenta.customer_id)
      if (existing) {
        existing.total += cuenta.final_price
        existing.cantidad += 1
      } else {
        acc.push({
          customer_id: cuenta.customer_id,
          customer_name: cuenta.customer_name,
          total: cuenta.final_price,
          cantidad: 1
        })
      }
      return acc
    }, [] as Array<{ customer_id: string, customer_name: string, total: number, cantidad: number }>)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const cuentasVencidas = cuentas.filter(c => c.antiguedad === '60+')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-red-600" />
            Cuentas por Cobrar
          </DialogTitle>
          <DialogDescription>
            Estado actual de cuentas pendientes de pago
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Alerta si hay cuentas muy vencidas */}
            {cuentasVencidas.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">
                    Atención: {cuentasVencidas.length} cuenta(s) con más de 60 días vencidos
                  </span>
                </div>
              </div>
            )}

            {/* Métricas Clave */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total por Cobrar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ${resumen?.totalPorCobrar.toLocaleString('es-CL')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cantidad Cuentas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {resumen?.cantidadCuentas}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    0-30 días
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${resumen?.rango_0_30.toLocaleString('es-CL')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    +60 días
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ${resumen?.rango_60_plus.toLocaleString('es-CL')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Gráfico por Antigüedad */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribución por Antigüedad</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      monto: {
                        label: 'Monto',
                        color: '#ef4444',
                      },
                    }}
                    className="h-[200px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rango" fontSize={12} />
                        <YAxis fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="monto" fill="#ef4444" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Top 5 Deudores */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top 5 Deudores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topDeudores.map((deudor, index) => (
                      <div key={deudor.customer_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-muted-foreground">
                            #{index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{deudor.customer_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {deudor.cantidad} cuenta(s)
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-red-600">
                          ${deudor.total.toLocaleString('es-CL')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabla de Detalles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalle de Cuentas Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="text-right">Días</TableHead>
                        <TableHead>Antigüedad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuentas.map((cuenta) => (
                        <TableRow key={cuenta.order_id}>
                          <TableCell className="text-sm">
                            {format(new Date(cuenta.order_date), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="text-sm">{cuenta.customer_name}</TableCell>
                          <TableCell className="text-sm">{cuenta.customer_type}</TableCell>
                          <TableCell className="text-sm">{cuenta.customer_phone || 'N/A'}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            ${cuenta.final_price.toLocaleString('es-CL')}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {cuenta.dias_vencidos}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                cuenta.antiguedad === '60+' ? 'destructive' :
                                cuenta.antiguedad === '31-60' ? 'default' : 
                                'secondary'
                              }
                            >
                              {cuenta.antiguedad}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Botones de Exportación */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={exportarExcel}
                disabled={exportando || cuentas.length === 0}
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
                disabled={exportando || cuentas.length === 0}
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

