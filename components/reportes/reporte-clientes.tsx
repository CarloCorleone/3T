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
import { Download, FileText, Loader2, Users } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { getClientesAnalisis, calcularClientesResumen } from '@/lib/reportes/queries'
import { exportarClientesExcel } from '@/lib/reportes/excel-generator'
import { generarClientesPDF } from '@/lib/reportes/pdf-generator'
import { ClienteAnalisis, ClientesResumen } from '@/lib/reportes/types'

interface ReporteClientesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fechaInicio: string
  fechaFin: string
}

export function ReporteClientes({ open, onOpenChange, fechaInicio, fechaFin }: ReporteClientesProps) {
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<ClienteAnalisis[]>([])
  const [resumen, setResumen] = useState<ClientesResumen | null>(null)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    if (open) {
      cargarDatos()
    }
  }, [open, fechaInicio, fechaFin])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const data = await getClientesAnalisis(fechaInicio, fechaFin)
      setClientes(data)
      const resumenData = calcularClientesResumen(data)
      setResumen(resumenData)
    } catch (error) {
      console.error('Error cargando clientes:', error)
    }
    setLoading(false)
  }

  const exportarPDF = async () => {
    if (!resumen) return
    setExportando(true)
    try {
      generarClientesPDF(clientes, resumen, fechaInicio, fechaFin)
    } catch (error) {
      console.error('Error exportando PDF:', error)
    }
    setExportando(false)
  }

  const exportarExcel = async () => {
    setExportando(true)
    try {
      exportarClientesExcel(clientes, fechaInicio, fechaFin)
    } catch (error) {
      console.error('Error exportando Excel:', error)
    }
    setExportando(false)
  }

  // Top 10 clientes para gráfico
  const top10 = clientes.slice(0, 10)
  const chartData = top10.map(c => ({
    nombre: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name,
    compras: c.total_compras
  }))

  const clientesInactivos = clientes.filter(c => c.total_pedidos === 0 || (c.dias_sin_comprar && c.dias_sin_comprar > 30))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Reporte de Clientes
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
                    Total Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {resumen?.totalClientes}
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
                  <div className="text-2xl font-bold text-green-600">
                    {resumen?.clientesActivos}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Clientes Inactivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {resumen?.clientesInactivos}
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
                    ${Math.round(resumen?.ticketPromedioGeneral || 0).toLocaleString('es-CL')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico Top 10 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 Clientes por Compras</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    compras: {
                      label: 'Compras',
                      color: '#10b981',
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis type="category" dataKey="nombre" fontSize={10} width={120} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="compras" fill="#10b981" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Tabla Top 10 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 Clientes - Detalle</CardTitle>
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
                      <TableHead className="text-right">Ticket Prom.</TableHead>
                      <TableHead>Último Pedido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top10.map((cliente, index) => (
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
                        <TableCell className="text-right text-sm">
                          ${Math.round(cliente.ticket_promedio).toLocaleString('es-CL')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {cliente.ultimo_pedido || 'Nunca'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Clientes Inactivos */}
            {clientesInactivos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Clientes Inactivos ({clientesInactivos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Último Pedido</TableHead>
                          <TableHead className="text-right">Días sin Comprar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientesInactivos.slice(0, 10).map((cliente) => (
                          <TableRow key={cliente.customer_id}>
                            <TableCell className="text-sm">{cliente.name}</TableCell>
                            <TableCell className="text-sm">{cliente.customer_type}</TableCell>
                            <TableCell className="text-sm">{cliente.phone || 'N/A'}</TableCell>
                            <TableCell className="text-sm">{cliente.ultimo_pedido || 'Nunca'}</TableCell>
                            <TableCell className="text-right text-sm text-amber-600 font-medium">
                              {cliente.dias_sin_comprar || 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {clientesInactivos.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Mostrando 10 de {clientesInactivos.length} clientes inactivos. Exporta para ver todos.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Botones de Exportación */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={exportarExcel}
                disabled={exportando || clientes.length === 0}
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
                disabled={exportando || clientes.length === 0}
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

