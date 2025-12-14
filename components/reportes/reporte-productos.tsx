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
import { Download, FileText, Loader2, Package } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { getProductosAnalisis, calcularProductosResumen } from '@/lib/reportes/queries'
import { exportarProductosExcel } from '@/lib/reportes/excel-generator'
import { generarProductosPDF } from '@/lib/reportes/pdf-generator'
import { ProductoAnalisis, TipoProductoAnalisis, ProductosResumen } from '@/lib/reportes/types'

interface ReporteProductosProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fechaInicio: string
  fechaFin: string
}

const COLORS = ['#0891b2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function ReporteProductos({ open, onOpenChange, fechaInicio, fechaFin }: ReporteProductosProps) {
  const [loading, setLoading] = useState(false)
  const [productos, setProductos] = useState<ProductoAnalisis[]>([])
  const [tiposProducto, setTiposProducto] = useState<TipoProductoAnalisis[]>([])
  const [resumen, setResumen] = useState<ProductosResumen | null>(null)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    if (open) {
      cargarDatos()
    }
  }, [open, fechaInicio, fechaFin])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const { productos: productosData, tiposProducto: tiposData } = await getProductosAnalisis(fechaInicio, fechaFin)
      setProductos(productosData)
      setTiposProducto(tiposData)
      const resumenData = calcularProductosResumen(productosData, tiposData)
      setResumen(resumenData)
    } catch (error) {
      console.error('Error cargando productos:', error)
    }
    setLoading(false)
  }

  const exportarPDF = async () => {
    if (!resumen) return
    setExportando(true)
    try {
      generarProductosPDF(productos, resumen, fechaInicio, fechaFin)
    } catch (error) {
      console.error('Error exportando PDF:', error)
    }
    setExportando(false)
  }

  const exportarExcel = async () => {
    setExportando(true)
    try {
      exportarProductosExcel(productos, tiposProducto, fechaInicio, fechaFin)
    } catch (error) {
      console.error('Error exportando Excel:', error)
    }
    setExportando(false)
  }

  // Datos para gráfico de barras
  const chartDataBarras = productos.map(p => ({
    producto: p.product_name.length > 15 ? p.product_name.substring(0, 15) + '...' : p.product_name,
    vendidos: p.total_vendidos
  }))

  // Datos para gráfico de pie (Recarga vs Nuevo)
  const chartDataPie = tiposProducto.map(t => ({
    name: t.tipo === 'recarga' ? 'Recarga' : 'Nuevo',
    value: t.total_vendidos,
    porcentaje: t.porcentaje
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            Reporte de Productos
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
                    Total Vendidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {resumen?.totalProductosVendidos}
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
                    Más Vendido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-green-600">
                    {resumen?.productoMasVendido}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    % Recarga
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {resumen?.porcentajeRecarga.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Gráfico de Barras - Productos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Productos Más Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      vendidos: {
                        label: 'Vendidos',
                        color: '#f59e0b',
                      },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataBarras}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="producto" fontSize={11} angle={-45} textAnchor="end" height={80} />
                        <YAxis fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="vendidos" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Pie - Recarga vs Nuevo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribución: Recarga vs Nuevo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      recarga: {
                        label: 'Recarga',
                        color: '#0891b2',
                      },
                      nuevo: {
                        label: 'Nuevo',
                        color: '#10b981',
                      },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartDataPie}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, porcentaje }) => `${name}: ${porcentaje.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartDataPie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Tabla de Productos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalle de Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Total Vendidos</TableHead>
                      <TableHead className="text-right">Botellones</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productos.map((producto, index) => (
                      <TableRow key={producto.product_name}>
                        <TableCell className="font-semibold">{index + 1}</TableCell>
                        <TableCell className="text-sm">{producto.product_name}</TableCell>
                        <TableCell className="text-right text-sm">{producto.total_vendidos}</TableCell>
                        <TableCell className="text-right text-sm">{producto.total_botellones}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          ${producto.total_ventas.toLocaleString('es-CL')}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {producto.porcentaje.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Tabla de Tipos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recarga vs Nuevo - Detalle</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Total Vendidos</TableHead>
                      <TableHead className="text-right">Botellones</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiposProducto.map((tipo) => (
                      <TableRow key={tipo.tipo}>
                        <TableCell className="font-medium">
                          {tipo.tipo === 'recarga' ? 'Recarga' : 'Nuevo'}
                        </TableCell>
                        <TableCell className="text-right">{tipo.total_vendidos}</TableCell>
                        <TableCell className="text-right">{tipo.total_botellones}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${tipo.total_ventas.toLocaleString('es-CL')}
                        </TableCell>
                        <TableCell className="text-right">
                          {tipo.porcentaje.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Botones de Exportación */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={exportarExcel}
                disabled={exportando || productos.length === 0}
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
                disabled={exportando || productos.length === 0}
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

