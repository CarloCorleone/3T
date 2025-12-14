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
import { Download, FileText, Loader2, MapPin } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { getEntregasPorZona, calcularEntregasResumen } from '@/lib/reportes/queries'
import { exportarEntregasPorZonaExcel } from '@/lib/reportes/excel-generator'
import { generarEntregasPorZonaPDF } from '@/lib/reportes/pdf-generator'
import { EntregaPorZona, EntregasResumen } from '@/lib/reportes/types'

interface ReporteEntregasProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fechaInicio: string
  fechaFin: string
}

export function ReporteEntregas({ open, onOpenChange, fechaInicio, fechaFin }: ReporteEntregasProps) {
  const [loading, setLoading] = useState(false)
  const [entregas, setEntregas] = useState<EntregaPorZona[]>([])
  const [resumen, setResumen] = useState<EntregasResumen | null>(null)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    if (open) {
      cargarDatos()
    }
  }, [open, fechaInicio, fechaFin])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const data = await getEntregasPorZona(fechaInicio, fechaFin)
      setEntregas(data)
      const resumenData = calcularEntregasResumen(data)
      setResumen(resumenData)
    } catch (error) {
      console.error('Error cargando entregas:', error)
    }
    setLoading(false)
  }

  const exportarPDF = async () => {
    if (!resumen) return
    setExportando(true)
    try {
      generarEntregasPorZonaPDF(entregas, resumen, fechaInicio, fechaFin)
    } catch (error) {
      console.error('Error exportando PDF:', error)
    }
    setExportando(false)
  }

  const exportarExcel = async () => {
    setExportando(true)
    try {
      exportarEntregasPorZonaExcel(entregas, fechaInicio, fechaFin)
    } catch (error) {
      console.error('Error exportando Excel:', error)
    }
    setExportando(false)
  }

  // Top 10 zonas para gráfico
  const top10Zonas = entregas.slice(0, 10)
  const chartData = top10Zonas.map(e => ({
    comuna: e.commune.length > 15 ? e.commune.substring(0, 15) + '...' : e.commune,
    entregas: e.total_entregas
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-600" />
            Entregas por Zona
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
                    Total Entregas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {resumen?.totalEntregas}
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
                    Tiempo Promedio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {resumen?.tiempoPromedioGeneral} min
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Zonas Atendidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {resumen?.zonasAtendidas}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico Top 10 Zonas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 Comunas por Entregas</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    entregas: {
                      label: 'Entregas',
                      color: '#8b5cf6',
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="comuna" fontSize={11} angle={-45} textAnchor="end" height={80} />
                      <YAxis fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="entregas" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Tabla de Detalles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalle por Comuna</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Comuna</TableHead>
                        <TableHead className="text-right">Entregas</TableHead>
                        <TableHead className="text-right">Botellones</TableHead>
                        <TableHead className="text-right">Tiempo Prom.</TableHead>
                        <TableHead className="text-right">Ventas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entregas.map((entrega, index) => (
                        <TableRow key={entrega.commune}>
                          <TableCell className="font-semibold">{index + 1}</TableCell>
                          <TableCell className="text-sm">{entrega.commune}</TableCell>
                          <TableCell className="text-right text-sm">{entrega.total_entregas}</TableCell>
                          <TableCell className="text-right text-sm">{entrega.total_botellones}</TableCell>
                          <TableCell className="text-right text-sm">
                            {entrega.tiempo_promedio_minutos ? `${entrega.tiempo_promedio_minutos} min` : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            ${entrega.total_ventas.toLocaleString('es-CL')}
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
                disabled={exportando || entregas.length === 0}
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
                disabled={exportando || entregas.length === 0}
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

