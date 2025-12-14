'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Map, TrendingUp } from 'lucide-react'
import { COMUNAS_COORDS, SANTIAGO_CENTER } from '@/lib/comunas-santiago-coords'

interface HeatmapGeograficoProps {
  ventasPorComuna: Record<string, number>
  className?: string
}

export function HeatmapGeografico({ ventasPorComuna, className = '' }: HeatmapGeograficoProps) {
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
  const [map, setMap] = useState<any>(null)

  // Detectar cuando Google Maps esté cargado
  useEffect(() => {
    const checkGoogleMaps = () => {
      const google = (window as any).google
      if (google && google.maps) {
        setGoogleMapsLoaded(true)
      }
    }

    checkGoogleMaps()
    const interval = setInterval(checkGoogleMaps, 100)
    return () => clearInterval(interval)
  }, [])

  // Calcular intensidades
  const maxVentas = Math.max(...Object.values(ventasPorComuna), 1)
  const totalVentas = Object.values(ventasPorComuna).reduce((sum, v) => sum + v, 0)

  // Top 5 comunas
  const topComunas = Object.entries(ventasPorComuna)
    .map(([comuna, ventas]) => ({ comuna, ventas }))
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 5)

  // Función para obtener color según intensidad
  const getColor = (ventas: number): string => {
    if (ventas === 0) return '#E5E7EB' // Gris claro

    const porcentaje = (ventas / maxVentas) * 100

    if (porcentaje >= 80) return '#DC2626' // Rojo fuerte
    if (porcentaje >= 60) return '#F97316' // Naranja
    if (porcentaje >= 40) return '#FBBF24' // Amarillo
    if (porcentaje >= 20) return '#A3E635' // Verde-amarillo
    return '#4ADE80' // Verde
  }

  // Renderizar mapa con polígonos
  useEffect(() => {
    if (!googleMapsLoaded) return

    const google = (window as any).google
    if (!google?.maps) return

    const mapElement = document.getElementById('heatmap-geografico')
    if (!mapElement) return

    // Crear mapa
    const newMap = new google.maps.Map(mapElement, {
      zoom: 11,
      center: SANTIAGO_CENTER,
      mapTypeId: 'terrain',
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'administrative',
          elementType: 'geometry',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'poi',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'transit',
          stylers: [{ visibility: 'off' }]
        }
      ]
    })

    setMap(newMap)

    // Dibujar polígonos de comunas
    Object.entries(COMUNAS_COORDS).forEach(([comuna, coords]) => {
      const ventas = ventasPorComuna[comuna] || 0
      const color = getColor(ventas)

      const polygon = new google.maps.Polygon({
        paths: coords,
        strokeColor: '#374151',
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: color,
        fillOpacity: 0.6,
        map: newMap
      })

      // InfoWindow para mostrar detalles al hacer clic
      const infoWindow = new google.maps.InfoWindow()

      polygon.addListener('click', (event: any) => {
        const porcentaje = totalVentas > 0 ? ((ventas / totalVentas) * 100).toFixed(1) : '0'
        
        infoWindow.setContent(`
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: #111827;">${comuna}</h3>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #6B7280; font-size: 14px;">Ventas:</span>
                <span style="font-weight: 600; font-size: 14px; color: #111827;">$${ventas.toLocaleString('es-CL')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #6B7280; font-size: 14px;">% del total:</span>
                <span style="font-weight: 600; font-size: 14px; color: ${color};">${porcentaje}%</span>
              </div>
            </div>
          </div>
        `)
        infoWindow.setPosition(event.latLng)
        infoWindow.open(newMap)
      })

      // Efecto hover
      polygon.addListener('mouseover', () => {
        polygon.setOptions({
          strokeWeight: 2,
          fillOpacity: 0.8
        })
      })

      polygon.addListener('mouseout', () => {
        polygon.setOptions({
          strokeWeight: 1,
          fillOpacity: 0.6
        })
      })
    })

  }, [googleMapsLoaded, ventasPorComuna, maxVentas, totalVentas])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          Mapa de Calor de Ventas por Comuna
        </CardTitle>
        <CardDescription>
          Distribución geográfica de ventas en Santiago
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalVentas === 0 ? (
          <div className="flex h-[600px] flex-col items-center justify-center text-muted-foreground">
            <Map className="h-12 w-12 mb-2" />
            <p>No hay datos de ventas para mostrar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Leyenda de colores */}
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
              <h4 className="font-semibold text-sm mb-3">Leyenda - Intensidad de Ventas</h4>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: '#E5E7EB' }}></div>
                  <span className="text-xs">Sin ventas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: '#4ADE80' }}></div>
                  <span className="text-xs">Baja (0-20%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: '#A3E635' }}></div>
                  <span className="text-xs">Media-baja (20-40%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: '#FBBF24' }}></div>
                  <span className="text-xs">Media (40-60%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: '#F97316' }}></div>
                  <span className="text-xs">Alta (60-80%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: '#DC2626' }}></div>
                  <span className="text-xs">Muy alta (80-100%)</span>
                </div>
              </div>
            </div>

            {/* Mapa */}
            {!googleMapsLoaded ? (
              <div className="flex h-[600px] items-center justify-center border rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Cargando mapa...</span>
              </div>
            ) : (
              <div 
                id="heatmap-geografico" 
                className="w-full h-[600px] rounded-lg border shadow-md"
              />
            )}

            {/* Top 5 Comunas */}
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top 5 Comunas Más Vendedoras
              </h4>
              <div className="space-y-2">
                {topComunas.map((item, idx) => {
                  const porcentaje = ((item.ventas / totalVentas) * 100).toFixed(1)
                  const color = getColor(item.ventas)
                  
                  return (
                    <div 
                      key={item.comuna} 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                        style={{ backgroundColor: color }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.comuna}</div>
                        <div className="text-xs text-muted-foreground">
                          ${item.ventas.toLocaleString('es-CL')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className="font-mono"
                          style={{ backgroundColor: `${color}20`, color: color, borderColor: color }}
                        >
                          {porcentaje}%
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Object.keys(ventasPorComuna).filter(k => ventasPorComuna[k] > 0).length}
                </div>
                <div className="text-xs text-muted-foreground">Comunas activas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  ${totalVentas.toLocaleString('es-CL')}
                </div>
                <div className="text-xs text-muted-foreground">Ventas totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  ${topComunas[0] ? topComunas[0].ventas.toLocaleString('es-CL') : '0'}
                </div>
                <div className="text-xs text-muted-foreground">Comuna líder</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

