"use client";

/**
 * Dashboard ML Insights
 * Visualización de predicciones y análisis de Machine Learning
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Users, 
  Calendar,
  DollarSign,
  MapPin,
  Activity,
  RefreshCw,
  Cloud,
  Droplets,
  Thermometer
} from "lucide-react";
import { mlApi, type DemandForecastResponse, type SegmentsResponse, type DemandWeatherResponse } from "@/lib/ml-api-client";

export default function MLInsightsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demandForecast, setDemandForecast] = useState<DemandForecastResponse | null>(null);
  const [segments, setSegments] = useState<SegmentsResponse | null>(null);
  const [weatherForecast, setWeatherForecast] = useState<DemandWeatherResponse | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Health check primero
      await mlApi.healthCheck();

      // Cargar forecast, segmentos y predicción con clima en paralelo
      const [forecastData, segmentsData, weatherData] = await Promise.all([
        mlApi.forecastDemand({ days_ahead: 30, include_revenue: true }),
        mlApi.getSegments(),
        mlApi.forecastDemandWeather({ days_ahead: 14, include_revenue: true })
      ]);

      setDemandForecast(forecastData);
      setSegments(segmentsData);
      setWeatherForecast(weatherData);
    } catch (err) {
      console.error("Error cargando datos ML:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando predicciones ML...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error al conectar con API ML</AlertTitle>
          <AlertDescription>
            {error}
            <br />
            <br />
            Asegúrate de que la API ML esté corriendo:
            <code className="block mt-2 p-2 bg-black/10 rounded">
              cd /opt/cane/3t/ml && ./START_API.sh
            </code>
            <Button onClick={loadData} className="mt-4" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Formato números
  const formatNumber = (num: number) => num.toLocaleString('es-CL');
  const formatCurrency = (num: number) => `$${Math.round(num).toLocaleString('es-CL')}`;

  // Filtrar fines de semana (sábado=6, domingo=0) ya que no hay despachos
  const filterWeekdays = (predictions: any[]) => {
    return predictions.filter(pred => {
      const dayOfWeek = new Date(pred.date).getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6; // Excluir domingo (0) y sábado (6)
    });
  };

  // Recalcular summary solo con días laborales
  const getWeekdaySummary = (forecast: DemandForecastResponse) => {
    const weekdayPredictions = filterWeekdays(forecast.predictions);
    const totalOrders = weekdayPredictions.reduce((sum, p) => sum + p.predicted_orders, 0);
    const totalRevenue = weekdayPredictions.reduce((sum, p) => sum + (p.predicted_revenue || 0), 0);
    
    return {
      ...forecast.summary,
      total_predicted_orders: totalOrders,
      avg_daily_orders: totalOrders / weekdayPredictions.length,
      total_predicted_revenue: totalRevenue,
      avg_daily_revenue: totalRevenue / weekdayPredictions.length,
      business_days: weekdayPredictions.length
    };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🤖 ML Insights</h1>
          <p className="text-muted-foreground">
            Predicciones y análisis con Machine Learning
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Nota informativa */}
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertTitle>Días laborales</AlertTitle>
        <AlertDescription>
          Las predicciones solo incluyen <strong>lunes a viernes</strong> (no hay despachos fines de semana)
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forecast">
            <Calendar className="h-4 w-4 mr-2" />
            Forecast Demanda
          </TabsTrigger>
          <TabsTrigger value="weather">
            <Cloud className="h-4 w-4 mr-2" />
            Predicción Climática
          </TabsTrigger>
          <TabsTrigger value="segments">
            <Users className="h-4 w-4 mr-2" />
            Segmentos
          </TabsTrigger>
          <TabsTrigger value="churn">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alertas Churn
          </TabsTrigger>
        </TabsList>

        {/* TAB: FORECAST DE DEMANDA */}
        <TabsContent value="forecast" className="space-y-4">
          {demandForecast && (() => {
            const weekdaySummary = getWeekdaySummary(demandForecast);
            const weekdayPredictions = filterWeekdays(demandForecast.predictions);
            
            return (
              <>
                {/* Resumen */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Pedidos Próximos 30 Días
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatNumber(weekdaySummary.total_predicted_orders)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ~{weekdaySummary.avg_daily_orders.toFixed(1)} pedidos/día laborable
                      </p>
                    </CardContent>
                  </Card>

                  {weekdaySummary.total_predicted_revenue && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Revenue Estimado
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(weekdaySummary.total_predicted_revenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(weekdaySummary.avg_daily_revenue || 0)}/día laborable
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Día Pico
                      </CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Date(demandForecast.summary.peak_day).toLocaleDateString('es-CL', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Mayor demanda esperada
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Días Laborables
                      </CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {weekdaySummary.business_days}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        En los próximos 30 días
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabla de predicciones (próximos días laborables) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Predicción Próximos Días Laborables</CardTitle>
                    <CardDescription>
                      Forecast diario con intervalos de confianza (lun-vie solamente)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Fecha</th>
                            <th className="text-right p-2">Pedidos</th>
                            <th className="text-right p-2">Rango</th>
                            {weekdayPredictions[0]?.predicted_revenue && (
                              <>
                                <th className="text-right p-2">Revenue</th>
                                <th className="text-right p-2">Rango Revenue</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {weekdayPredictions.slice(0, 7).map((pred, idx) => (
                            <tr key={idx} className="border-b hover:bg-muted/50">
                              <td className="p-2">
                                {new Date(pred.date).toLocaleDateString('es-CL', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </td>
                              <td className="text-right p-2 font-medium">
                                {pred.predicted_orders}
                              </td>
                              <td className="text-right p-2 text-muted-foreground text-xs">
                                {pred.lower_bound} - {pred.upper_bound}
                              </td>
                              {pred.predicted_revenue && (
                                <>
                                  <td className="text-right p-2 font-medium">
                                    {formatCurrency(pred.predicted_revenue)}
                                  </td>
                                  <td className="text-right p-2 text-muted-foreground text-xs">
                                    {formatCurrency(pred.revenue_lower_bound || 0)} - {formatCurrency(pred.revenue_upper_bound || 0)}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        {/* TAB: PREDICCIÓN CLIMÁTICA */}
        <TabsContent value="weather" className="space-y-4">
          {weatherForecast ? (
            <>
              {/* Alert informativo */}
              <Alert>
                <Cloud className="h-4 w-4" />
                <AlertTitle>Predicción con Datos Climáticos</AlertTitle>
                <AlertDescription>
                  Las predicciones consideran <strong>temperatura, humedad y precipitación</strong> para ajustar la demanda esperada.
                  Datos de {weatherForecast.communes_analyzed} comunas principales.
                </AlertDescription>
              </Alert>

              {/* Resumen climático */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Días Calurosos
                    </CardTitle>
                    <Thermometer className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      🔥 {weatherForecast.summary.hot_days_count}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Temp &gt; 28°C (mayor demanda)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Días Lluviosos
                    </CardTitle>
                    <Droplets className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ☔ {weatherForecast.summary.rainy_days_count}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Precip &gt; 5mm (menor demanda)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Impacto Climático
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {weatherForecast.summary.climate_impact_percent > 0 ? '+' : ''}
                      {weatherForecast.summary.climate_impact_percent.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      vs predicción base
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Pedidos
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(weatherForecast.summary.total_predicted_orders)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Próximos {weatherForecast.days_ahead} días
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Comparación Base vs Clima */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparación: Base vs Clima</CardTitle>
                  <CardDescription>
                    Diferencia entre predicción sin datos climáticos y con datos climáticos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="border rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1">Predicción Base</div>
                      <div className="text-3xl font-bold">
                        {formatNumber(weatherForecast.summary.total_predicted_orders_base)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Solo con datos históricos
                      </p>
                    </div>
                    <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
                      <div className="text-sm text-muted-foreground mb-1">Con Clima</div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {formatNumber(weatherForecast.summary.total_predicted_orders)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ajustado por temperatura y lluvia
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabla de predicciones con clima */}
              <Card>
                <CardHeader>
                  <CardTitle>Predicción Diaria con Clima</CardTitle>
                  <CardDescription>
                    Próximos {weatherForecast.days_ahead} días con datos meteorológicos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Fecha</th>
                          <th className="text-center p-2">Clima</th>
                          <th className="text-right p-2">Temp (°C)</th>
                          <th className="text-right p-2">Humedad</th>
                          <th className="text-right p-2">Lluvia (mm)</th>
                          <th className="text-right p-2">Pedidos Base</th>
                          <th className="text-right p-2">Pedidos Ajustados</th>
                          <th className="text-right p-2">Ajuste</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weatherForecast.predictions.map((pred, idx) => {
                          const adjustmentPercent = ((pred.adjustment_factor - 1) * 100);
                          const adjustmentPercentStr = adjustmentPercent.toFixed(0);
                          const adjustmentColor = pred.adjustment_factor > 1 
                            ? 'text-green-600 dark:text-green-400' 
                            : pred.adjustment_factor < 1 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-muted-foreground';

                          return (
                            <tr key={idx} className="border-b hover:bg-muted/50">
                              <td className="p-2">
                                {new Date(pred.date).toLocaleDateString('es-CL', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </td>
                              <td className="text-center p-2">
                                <div className="flex items-center justify-center gap-1">
                                  {pred.is_hot_day && <span title="Día caluroso">🔥</span>}
                                  {pred.is_rainy_day && <span title="Día lluvioso">☔</span>}
                                  {!pred.is_hot_day && !pred.is_rainy_day && <span className="text-muted-foreground">—</span>}
                                </div>
                              </td>
                              <td className="text-right p-2">
                                <span className={pred.is_hot_day ? 'font-semibold text-orange-600' : ''}>
                                  {pred.temp_max_c.toFixed(1)}
                                </span>
                                <span className="text-muted-foreground text-xs"> / {pred.temp_min_c.toFixed(1)}</span>
                              </td>
                              <td className="text-right p-2 text-muted-foreground">
                                {pred.humidity}%
                              </td>
                              <td className="text-right p-2">
                                <span className={pred.is_rainy_day ? 'font-semibold text-blue-600' : 'text-muted-foreground'}>
                                  {pred.precip_mm.toFixed(1)}
                                </span>
                              </td>
                              <td className="text-right p-2 text-muted-foreground">
                                {pred.predicted_orders_base}
                              </td>
                              <td className="text-right p-2 font-semibold">
                                {pred.predicted_orders}
                              </td>
                              <td className={`text-right p-2 text-xs font-medium ${adjustmentColor}`}>
                                {adjustmentPercent > 0 ? '+' : ''}{adjustmentPercentStr}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No hay datos disponibles</AlertTitle>
              <AlertDescription>
                No se pudieron cargar las predicciones con clima. Verifica que la API ML esté corriendo.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* TAB: SEGMENTOS DE CLIENTES */}
        <TabsContent value="segments" className="space-y-4">
          {segments && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Segmentación de Clientes</CardTitle>
                  <CardDescription>
                    {segments.total_customers} clientes segmentados por comportamiento (RFM)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {segments.segments.map((segment) => {
                      const getSegmentInfo = (id: number) => {
                        switch (id) {
                          case 3: return { name: "👑 VIP Champions", color: "bg-purple-500" };
                          case 0: return { name: "💚 Clientes Leales", color: "bg-green-500" };
                          case 2: return { name: "💡 Potenciales", color: "bg-blue-500" };
                          case 1: return { name: "⚠️ En Riesgo", color: "bg-orange-500" };
                          default: return { name: `Segmento ${id}`, color: "bg-gray-500" };
                        }
                      };

                      const info = getSegmentInfo(segment.cluster_id);
                      const percentage = (segment.customer_count / segments.total_customers * 100).toFixed(1);

                      return (
                        <div key={segment.cluster_id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${info.color}`} />
                              <h3 className="font-semibold">{info.name}</h3>
                              <Badge variant="outline">{segment.customer_count} clientes</Badge>
                              <span className="text-sm text-muted-foreground">({percentage}%)</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {formatCurrency(segment.total_value)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Valor total
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                            <div>
                              <div className="text-muted-foreground">Recency</div>
                              <div className="font-medium">{Math.round(segment.avg_recency_days)} días</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Frequency</div>
                              <div className="font-medium">{segment.avg_frequency.toFixed(1)} pedidos</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Monetary</div>
                              <div className="font-medium">{formatCurrency(segment.avg_monetary)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB: ALERTAS CHURN */}
        <TabsContent value="churn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Churn</CardTitle>
              <CardDescription>
                Clientes en riesgo de abandono (función en desarrollo)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Próximamente</AlertTitle>
                <AlertDescription>
                  Integración con datos en tiempo real para detectar clientes en riesgo.
                  <br />
                  Por ahora, consulta el análisis EDA en el sistema ML.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

