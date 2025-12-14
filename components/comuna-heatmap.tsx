'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, TrendingUp } from 'lucide-react'

interface ComunaHeatmapProps {
  pedidosPorComuna: Record<string, number>
  className?: string
}

// Comunas de Santiago y sus colores según intensidad
const COMUNAS_SANTIAGO = [
  { nombre: 'Santiago', zona: 'centro' },
  { nombre: 'Providencia', zona: 'oriente' },
  { nombre: 'Las Condes', zona: 'oriente' },
  { nombre: 'Vitacura', zona: 'oriente' },
  { nombre: 'Lo Barnechea', zona: 'oriente' },
  { nombre: 'Ñuñoa', zona: 'oriente' },
  { nombre: 'La Reina', zona: 'oriente' },
  { nombre: 'Macul', zona: 'oriente' },
  { nombre: 'Peñalolén', zona: 'oriente' },
  { nombre: 'La Florida', zona: 'sur' },
  { nombre: 'Puente Alto', zona: 'sur' },
  { nombre: 'San Bernardo', zona: 'sur' },
  { nombre: 'Maipú', zona: 'poniente' },
  { nombre: 'Pudahuel', zona: 'poniente' },
  { nombre: 'Cerrillos', zona: 'poniente' },
  { nombre: 'Estación Central', zona: 'poniente' },
  { nombre: 'Quinta Normal', zona: 'poniente' },
  { nombre: 'Lo Prado', zona: 'poniente' },
  { nombre: 'Cerro Navia', zona: 'poniente' },
  { nombre: 'Renca', zona: 'poniente' },
  { nombre: 'Quilicura', zona: 'norte' },
  { nombre: 'Huechuraba', zona: 'norte' },
  { nombre: 'Conchalí', zona: 'norte' },
  { nombre: 'Recoleta', zona: 'norte' },
  { nombre: 'Independencia', zona: 'norte' },
  { nombre: 'La Cisterna', zona: 'sur' },
  { nombre: 'San Miguel', zona: 'sur' },
  { nombre: 'San Joaquín', zona: 'sur' },
  { nombre: 'Pedro Aguirre Cerda', zona: 'sur' },
  { nombre: 'Lo Espejo', zona: 'sur' },
  { nombre: 'El Bosque', zona: 'sur' },
  { nombre: 'San Ramón', zona: 'sur' },
  { nombre: 'La Granja', zona: 'sur' },
]

const ZONAS_CONFIG = {
  centro: { color: 'bg-purple-100 border-purple-300 text-purple-900', label: 'Centro', icon: '🏛️' },
  oriente: { color: 'bg-green-100 border-green-300 text-green-900', label: 'Oriente', icon: '🌳' },
  poniente: { color: 'bg-blue-100 border-blue-300 text-blue-900', label: 'Poniente', icon: '🏭' },
  norte: { color: 'bg-amber-100 border-amber-300 text-amber-900', label: 'Norte', icon: '⛰️' },
  sur: { color: 'bg-rose-100 border-rose-300 text-rose-900', label: 'Sur', icon: '🏘️' },
}

export function ComunaHeatmap({ pedidosPorComuna, className = '' }: ComunaHeatmapProps) {
  const { comunasConPedidos, maxPedidos, totalPedidos } = useMemo(() => {
    const data = COMUNAS_SANTIAGO.map(comuna => ({
      ...comuna,
      pedidos: pedidosPorComuna[comuna.nombre] || 0
    }))
    
    const max = Math.max(...data.map(c => c.pedidos), 1)
    const total = data.reduce((sum, c) => sum + c.pedidos, 0)
    
    return {
      comunasConPedidos: data.sort((a, b) => b.pedidos - a.pedidos),
      maxPedidos: max,
      totalPedidos: total
    }
  }, [pedidosPorComuna])

  const getIntensidad = (pedidos: number): string => {
    if (pedidos === 0) return 'bg-gray-100 border-gray-200 text-gray-400'
    
    const porcentaje = (pedidos / maxPedidos) * 100
    
    if (porcentaje >= 80) return 'bg-red-500 border-red-600 text-white font-semibold shadow-lg'
    if (porcentaje >= 60) return 'bg-orange-500 border-orange-600 text-white font-semibold shadow-md'
    if (porcentaje >= 40) return 'bg-yellow-400 border-yellow-500 text-gray-900 font-medium shadow'
    if (porcentaje >= 20) return 'bg-green-300 border-green-400 text-gray-900 font-medium'
    return 'bg-green-100 border-green-200 text-gray-700'
  }

  // Agrupar por zona
  const comunasPorZona = useMemo(() => {
    const grupos: Record<string, typeof comunasConPedidos> = {
      centro: [],
      oriente: [],
      poniente: [],
      norte: [],
      sur: []
    }
    
    comunasConPedidos.forEach(comuna => {
      grupos[comuna.zona].push(comuna)
    })
    
    return grupos
  }, [comunasConPedidos])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Mapa de Calor por Comuna
        </CardTitle>
        <CardDescription>
          Distribución de pedidos por zona geográfica de Santiago
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalPedidos === 0 ? (
          <div className="flex h-[400px] flex-col items-center justify-center text-muted-foreground">
            <MapPin className="h-12 w-12 mb-2" />
            <p>No hay pedidos para mostrar</p>
          </div>
        ) : (
          <>
            {/* Leyenda */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Intensidad:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
                    <span className="text-xs">Sin pedidos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                    <span className="text-xs">Baja</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-yellow-400 border border-yellow-500"></div>
                    <span className="text-xs">Media</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-orange-500 border border-orange-600"></div>
                    <span className="text-xs">Alta</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-red-500 border border-red-600"></div>
                    <span className="text-xs">Muy Alta</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mapa por zonas */}
            <div className="space-y-6">
              {Object.entries(comunasPorZona).map(([zona, comunas]) => {
                const config = ZONAS_CONFIG[zona as keyof typeof ZONAS_CONFIG]
                const totalZona = comunas.reduce((sum, c) => sum + c.pedidos, 0)
                
                if (totalZona === 0) return null
                
                return (
                  <div key={zona} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{config.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {totalZona} {totalZona === 1 ? 'pedido' : 'pedidos'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {comunas
                        .filter(c => c.pedidos > 0)
                        .map((comuna) => (
                          <div
                            key={comuna.nombre}
                            className={`
                              px-3 py-2 rounded-lg border-2 text-center text-sm
                              transition-all hover:scale-105 cursor-pointer
                              ${getIntensidad(comuna.pedidos)}
                            `}
                            title={`${comuna.nombre}: ${comuna.pedidos} ${comuna.pedidos === 1 ? 'pedido' : 'pedidos'}`}
                          >
                            <div className="font-medium truncate">
                              {comuna.nombre}
                            </div>
                            <div className="text-xs mt-1 flex items-center justify-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {comuna.pedidos}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Top 5 comunas */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top 5 Comunas Más Activas
              </h4>
              <div className="space-y-2">
                {comunasConPedidos
                  .filter(c => c.pedidos > 0)
                  .slice(0, 5)
                  .map((comuna, idx) => {
                    const porcentaje = ((comuna.pedidos / totalPedidos) * 100).toFixed(1)
                    return (
                      <div key={comuna.nombre} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{comuna.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {ZONAS_CONFIG[comuna.zona as keyof typeof ZONAS_CONFIG].label}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono">
                            {comuna.pedidos}
                          </Badge>
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {porcentaje}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

