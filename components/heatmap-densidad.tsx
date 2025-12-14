'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Map, TrendingUp, Flame } from 'lucide-react'
import { SANTIAGO_CENTER } from '@/lib/comunas-santiago-coords'

interface HeatmapDensidadProps {
  ventasPorComuna: Record<string, number>
  className?: string
}

// Coordenadas centrales aproximadas de las comunas de Santiago
const COMUNAS_CENTERS: Record<string, { lat: number; lng: number }> = {
  'Santiago': { lat: -33.4372, lng: -70.6506 },
  'Providencia': { lat: -33.4264, lng: -70.6105 },
  'Las Condes': { lat: -33.4126, lng: -70.5693 },
  'Vitacura': { lat: -33.3826, lng: -70.5760 },
  'Lo Barnechea': { lat: -33.3482, lng: -70.5107 },
  'Ñuñoa': { lat: -33.4576, lng: -70.5986 },
  'La Reina': { lat: -33.4499, lng: -70.5412 },
  'Macul': { lat: -33.4879, lng: -70.5980 },
  'Peñalolén': { lat: -33.4965, lng: -70.5455 },
  'La Florida': { lat: -33.5246, lng: -70.5993 },
  'Puente Alto': { lat: -33.6105, lng: -70.5758 },
  'San Bernardo': { lat: -33.5927, lng: -70.7003 },
  'La Cisterna': { lat: -33.5326, lng: -70.6616 },
  'San Miguel': { lat: -33.4976, lng: -70.6518 },
  'San Joaquín': { lat: -33.4971, lng: -70.6274 },
  'Pedro Aguirre Cerda': { lat: -33.4891, lng: -70.6734 },
  'Lo Espejo': { lat: -33.5189, lng: -70.6841 },
  'El Bosque': { lat: -33.5632, lng: -70.6768 },
  'San Ramón': { lat: -33.5350, lng: -70.6393 },
  'La Granja': { lat: -33.5397, lng: -70.6187 },
  'Maipú': { lat: -33.5085, lng: -70.7574 },
  'Pudahuel': { lat: -33.4408, lng: -70.7642 },
  'Cerrillos': { lat: -33.4971, lng: -70.7089 },
  'Estación Central': { lat: -33.4594, lng: -70.6829 },
  'Quinta Normal': { lat: -33.4381, lng: -70.6988 },
  'Lo Prado': { lat: -33.4452, lng: -70.7248 },
  'Cerro Navia': { lat: -33.4237, lng: -70.7332 },
  'Renca': { lat: -33.4038, lng: -70.7218 },
  'Quilicura': { lat: -33.3603, lng: -70.7357 },
  'Huechuraba': { lat: -33.3741, lng: -70.6391 },
  'Conchalí': { lat: -33.3902, lng: -70.6741 },
  'Recoleta': { lat: -33.4106, lng: -70.6403 },
  'Independencia': { lat: -33.4205, lng: -70.6640 },
}

export function HeatmapDensidad({ ventasPorComuna, className = '' }: HeatmapDensidadProps) {
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
  const [map, setMap] = useState<any>(null)
  const [heatmap, setHeatmap] = useState<any>(null)

  // Detectar cuando Google Maps esté cargado
  useEffect(() => {
    const checkGoogleMaps = () => {
      const google = (window as any).google
      if (google && google.maps && google.maps.visualization) {
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

  // Renderizar mapa con heatmap de densidad
  useEffect(() => {
    if (!googleMapsLoaded || totalVentas === 0) return

    const google = (window as any).google
    if (!google?.maps?.visualization) return

    const mapElement = document.getElementById('heatmap-densidad')
    if (!mapElement) return

    // Crear mapa
    const newMap = new google.maps.Map(mapElement, {
      zoom: 11,
      center: SANTIAGO_CENTER,
      mapTypeId: 'roadmap',
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
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

    // Crear puntos con peso para el heatmap
    const heatmapData: any[] = []
    
    Object.entries(ventasPorComuna).forEach(([comuna, ventas]) => {
      const center = COMUNAS_CENTERS[comuna]
      if (!center || ventas === 0) return

      // Normalizar el peso (0-1) basado en las ventas
      const weight = ventas / maxVentas

      // Crear múltiples puntos alrededor del centro para mayor densidad visual
      // Esto simula mejor la distribución de ventas en el área
      const numPoints = Math.ceil(weight * 10) + 3 // Entre 3 y 13 puntos según intensidad
      const radius = 0.015 // Radio en grados (~1.5km)

      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI
        const distance = radius * Math.random() * 0.7 // Variar la distancia
        
        const lat = center.lat + distance * Math.cos(angle)
        const lng = center.lng + distance * Math.sin(angle)

        heatmapData.push({
          location: new google.maps.LatLng(lat, lng),
          weight: weight
        })
      }

      // Agregar un punto central con más peso
      heatmapData.push({
        location: new google.maps.LatLng(center.lat, center.lng),
        weight: weight * 1.5
      })
    })

    // Crear el heatmap layer
    const heatmapLayer = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      dissipating: true,
      radius: 50, // Radio de influencia de cada punto
      opacity: 0.8,
      // Gradiente de colores: azul → cian → verde → amarillo → naranja → rojo
      gradient: [
        'rgba(0, 0, 255, 0)',      // Transparente
        'rgba(0, 0, 255, 1)',      // Azul (LOW)
        'rgba(0, 191, 255, 1)',    // Azul claro
        'rgba(0, 255, 0, 1)',      // Verde
        'rgba(127, 255, 0, 1)',    // Verde-amarillo
        'rgba(255, 255, 0, 1)',    // Amarillo
        'rgba(255, 191, 0, 1)',    // Amarillo-naranja
        'rgba(255, 127, 0, 1)',    // Naranja
        'rgba(255, 63, 0, 1)',     // Naranja-rojo
        'rgba(255, 0, 0, 1)'       // Rojo (HIGH)
      ],
      maxIntensity: 1.2, // Ajustar la intensidad máxima
    })

    heatmapLayer.setMap(newMap)
    setHeatmap(heatmapLayer)

    // Agregar marcadores transparentes para mostrar nombres al hacer clic
    Object.entries(ventasPorComuna).forEach(([comuna, ventas]) => {
      const center = COMUNAS_CENTERS[comuna]
      if (!center || ventas === 0) return

      const marker = new google.maps.Marker({
        position: center,
        map: newMap,
        title: comuna,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 0.1,
          fillColor: 'transparent',
          fillOpacity: 0,
          strokeWeight: 0,
        }
      })

      const infoWindow = new google.maps.InfoWindow()

      marker.addListener('click', () => {
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
                <span style="font-weight: 600; font-size: 14px; color: #DC2626;">${porcentaje}%</span>
              </div>
            </div>
          </div>
        `)
        infoWindow.setPosition(center)
        infoWindow.open(newMap)
      })
    })

  }, [googleMapsLoaded, ventasPorComuna, maxVentas, totalVentas])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-red-500" />
          Mapa de Calor - Densidad de Ventas
        </CardTitle>
        <CardDescription>
          Visualización de densidad de ventas por comuna con gradiente continuo
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
            {/* Leyenda de colores con gradiente */}
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Leyenda - Intensidad de Ventas
              </h4>
              <div className="space-y-3">
                <div 
                  className="h-8 rounded-lg"
                  style={{
                    background: 'linear-gradient(to right, rgb(0, 0, 255), rgb(0, 191, 255), rgb(0, 255, 0), rgb(127, 255, 0), rgb(255, 255, 0), rgb(255, 191, 0), rgb(255, 127, 0), rgb(255, 63, 0), rgb(255, 0, 0))'
                  }}
                />
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    BAJO
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    MEDIO
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-600"></div>
                    ALTO
                  </span>
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
                id="heatmap-densidad" 
                className="w-full h-[600px] rounded-lg border shadow-md"
              />
            )}

            {/* Top 5 Comunas */}
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top 5 Comunas con Mayor Volumen de Ventas
              </h4>
              <div className="space-y-2">
                {topComunas.map((item, idx) => {
                  const porcentaje = ((item.ventas / totalVentas) * 100).toFixed(1)
                  const intensidad = (item.ventas / maxVentas) * 100
                  
                  // Color según intensidad
                  let color = '#3B82F6' // Azul
                  if (intensidad >= 80) color = '#DC2626' // Rojo
                  else if (intensidad >= 60) color = '#F97316' // Naranja
                  else if (intensidad >= 40) color = '#FBBF24' // Amarillo
                  else if (intensidad >= 20) color = '#10B981' // Verde
                  
                  return (
                    <div 
                      key={item.comuna} 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                    >
                      <div 
                        className="flex items-center justify-center w-10 h-10 rounded-full text-white font-bold"
                        style={{ backgroundColor: color }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base truncate">{item.comuna}</div>
                        <div className="text-sm text-muted-foreground">
                          ${item.ventas.toLocaleString('es-CL')} • {porcentaje}% del total
                        </div>
                      </div>
                      <div>
                        <Badge 
                          className="font-mono font-semibold"
                          style={{ 
                            backgroundColor: `${color}20`, 
                            color: color, 
                            borderColor: color,
                            border: '1px solid'
                          }}
                        >
                          {intensidad.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Estadísticas globales */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-red-50 dark:from-blue-950/20 dark:to-red-950/20 rounded-lg border">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {Object.keys(ventasPorComuna).filter(k => ventasPorComuna[k] > 0).length}
                </div>
                <div className="text-xs text-muted-foreground font-medium">Comunas Activas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  ${Math.round(totalVentas).toLocaleString('es-CL')}
                </div>
                <div className="text-xs text-muted-foreground font-medium">Ventas Totales</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  ${topComunas[0] ? Math.round(topComunas[0].ventas).toLocaleString('es-CL') : '0'}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {topComunas[0]?.comuna || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

