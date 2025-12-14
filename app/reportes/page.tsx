'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  FileText, 
  TrendingUp,
  Users,
  Package,
  DollarSign,
  MapPin,
  Eye
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, subQuarters } from 'date-fns'
import { ReporteVentas } from '@/components/reportes/reporte-ventas'
import { ReporteCuentasCobrar } from '@/components/reportes/reporte-cuentas-cobrar'
import { ReporteClientes } from '@/components/reportes/reporte-clientes'
import { ReporteEntregas } from '@/components/reportes/reporte-entregas'
import { ReporteProductos } from '@/components/reportes/reporte-productos'
import { ReporteEjecutivo } from '@/components/reportes/reporte-ejecutivo'
import { RoleGuard } from '@/components/role-guard'

type ReporteId = 'ventas' | 'cuentas' | 'clientes' | 'entregas' | 'productos' | 'ejecutivo'
type PeriodoTipo = 'mes-actual' | 'mes-anterior' | 'trimestre' | 'ano' | 'personalizado'

export default function ReportesPage() {
  const [reporteActivo, setReporteActivo] = useState<ReporteId | null>(null)
  const [periodo, setPeriodo] = useState<PeriodoTipo>('mes-actual')
  const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  // Actualizar fechas según período seleccionado
  const handlePeriodoChange = (value: PeriodoTipo) => {
    setPeriodo(value)
    const hoy = new Date()
    
    switch (value) {
      case 'mes-actual':
        setFechaInicio(format(startOfMonth(hoy), 'yyyy-MM-dd'))
        setFechaFin(format(endOfMonth(hoy), 'yyyy-MM-dd'))
        break
      case 'mes-anterior':
        const mesAnterior = subMonths(hoy, 1)
        setFechaInicio(format(startOfMonth(mesAnterior), 'yyyy-MM-dd'))
        setFechaFin(format(endOfMonth(mesAnterior), 'yyyy-MM-dd'))
        break
      case 'trimestre':
        const trimestreAtras = subQuarters(hoy, 1)
        setFechaInicio(format(trimestreAtras, 'yyyy-MM-dd'))
        setFechaFin(format(hoy, 'yyyy-MM-dd'))
        break
      case 'ano':
        setFechaInicio(format(startOfYear(hoy), 'yyyy-MM-dd'))
        setFechaFin(format(hoy, 'yyyy-MM-dd'))
        break
      case 'personalizado':
        // Mantener las fechas actuales
        break
    }
  }

  const reportTypes = [
    {
      id: 'ventas' as ReporteId,
      title: 'Ventas Mensuales',
      description: 'Análisis completo de ventas con tendencias y desglose por tipo de cliente',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      id: 'cuentas' as ReporteId,
      title: 'Cuentas por Cobrar',
      description: 'Pedidos pendientes de pago con antigüedad y alertas de vencimiento',
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20'
    },
    {
      id: 'clientes' as ReporteId,
      title: 'Análisis de Clientes',
      description: 'Top clientes, frecuencia de compra y clientes inactivos',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      id: 'entregas' as ReporteId,
      title: 'Entregas por Zona',
      description: 'Análisis geográfico de entregas y tiempos promedio por comuna',
      icon: MapPin,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    },
    {
      id: 'productos' as ReporteId,
      title: 'Productos',
      description: 'Productos más vendidos, análisis recarga vs nuevo y tendencias',
      icon: Package,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/20'
    },
    {
      id: 'ejecutivo' as ReporteId,
      title: 'Resumen Ejecutivo',
      description: 'KPIs principales y vista general del negocio (solo PDF)',
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/20'
    }
  ]

  return (
    <RoleGuard allowedRoles={['admin']} showMessage>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
          <p className="text-muted-foreground mt-1">
            Genera y descarga reportes detallados de tu negocio
          </p>
        </div>
      </div>

      {/* Configuración Global */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configuración de Período
          </CardTitle>
          <CardDescription>
            Selecciona el período de tiempo para todos los reportes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="periodo">Período Predefinido</Label>
              <Select value={periodo} onValueChange={(v) => handlePeriodoChange(v as PeriodoTipo)}>
                <SelectTrigger id="periodo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes-actual">Mes Actual</SelectItem>
                  <SelectItem value="mes-anterior">Mes Anterior</SelectItem>
                  <SelectItem value="trimestre">Último Trimestre</SelectItem>
                  <SelectItem value="ano">Año Completo</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
              <Input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value)
                  setPeriodo('personalizado')
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha-fin">Fecha Fin</Label>
              <Input
                id="fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setFechaFin(e.target.value)
                  setPeriodo('personalizado')
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => {
          const Icon = report.icon
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${report.bgColor}`}>
                    <Icon className={`h-6 w-6 ${report.color}`} />
                  </div>
                </div>
                <CardTitle className="mt-4">{report.title}</CardTitle>
                <CardDescription className="min-h-[40px]">{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => setReporteActivo(report.id)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Reporte
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Nota informativa */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground mb-1">Formatos de Exportación</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>PDF:</strong> Ideal para imprimir o compartir. Incluye gráficos y formato profesional.</li>
                <li><strong>Excel:</strong> Perfecto para análisis adicional. Datos editables y múltiples hojas.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modales de Reportes */}
      <ReporteVentas
        open={reporteActivo === 'ventas'}
        onOpenChange={(open) => !open && setReporteActivo(null)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
      />
      
      <ReporteCuentasCobrar
        open={reporteActivo === 'cuentas'}
        onOpenChange={(open) => !open && setReporteActivo(null)}
      />
      
      <ReporteClientes
        open={reporteActivo === 'clientes'}
        onOpenChange={(open) => !open && setReporteActivo(null)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
      />
      
      <ReporteEntregas
        open={reporteActivo === 'entregas'}
        onOpenChange={(open) => !open && setReporteActivo(null)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
      />
      
      <ReporteProductos
        open={reporteActivo === 'productos'}
        onOpenChange={(open) => !open && setReporteActivo(null)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
      />
      
      <ReporteEjecutivo
        open={reporteActivo === 'ejecutivo'}
        onOpenChange={(open) => !open && setReporteActivo(null)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
      />
      </div>
    </RoleGuard>
  )
}

