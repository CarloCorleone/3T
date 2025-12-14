/**
 * Cliente API para Sistema ML
 * Conecta el frontend con la API de predicciones ML
 * 
 * Usa el proxy interno /api/ml que redirige a localhost:8001
 * Esto soluciona problemas de acceso desde móviles/navegadores
 */

const ML_API_BASE_URL = process.env.NEXT_PUBLIC_ML_API_URL || '/api/ml';

interface ChurnPredictionRequest {
  customer_id: string;
  recency_days: number;
  frequency: number;
  monetary: number;
}

interface ChurnPredictionResponse {
  customer_id: string;
  churn_probability: number;
  is_high_risk: boolean;
  risk_level: string;
  recommendation: string;
  days_until_action: number;
}

interface DemandForecastRequest {
  days_ahead: number;
  include_revenue: boolean;
}

interface DemandForecastResponse {
  forecast_days: number;
  predictions: Array<{
    date: string;
    predicted_orders: number;
    lower_bound: number;
    upper_bound: number;
    predicted_revenue?: number;
    revenue_lower_bound?: number;
    revenue_upper_bound?: number;
  }>;
  summary: {
    total_predicted_orders: number;
    avg_daily_orders: number;
    peak_day: string;
    low_day: string;
    total_predicted_revenue?: number;
    avg_daily_revenue?: number;
  };
}

interface RouteCostRequest {
  latitude: number;
  longitude: number;
  quantity: number;
  customer_type: string;
}

interface RouteCostResponse {
  estimated_cost: number;
  distance_from_center_km: number;
  delivery_time_estimate_hours: number;
  priority_level: string;
}

interface PriceSuggestionRequest {
  customer_id?: string;
  quantity: number;
  customer_type: string;
  recency_days: number;
  frequency: number;
  monetary_total: number;
}

interface PriceSuggestionResponse {
  suggested_price: number;
  price_range_min: number;
  price_range_max: number;
  discount_recommended: number;
  reasoning: string;
}

interface Segment {
  cluster_id: number;
  customer_count: number;
  avg_recency_days: number;
  avg_frequency: number;
  avg_monetary: number;
  total_value: number;
}

interface SegmentsResponse {
  total_customers: number;
  segments: Segment[];
  timestamp: string;
}

// Interfaces para endpoints de clima
interface DemandWeatherRequest {
  days_ahead: number;
  include_revenue: boolean;
  communes?: string[];
}

interface WeatherPrediction {
  date: string;
  predicted_orders: number;
  predicted_orders_base: number;
  temp_max_c: number;
  temp_min_c: number;
  humidity: number;
  precip_mm: number;
  is_hot_day: boolean;
  is_rainy_day: boolean;
  adjustment_factor: number;
}

interface DemandWeatherResponse {
  success: boolean;
  days_ahead: number;
  communes_analyzed: number;
  predictions: WeatherPrediction[];
  revenue_predictions?: Array<{
    date: string;
    predicted_revenue: number;
  }>;
  summary: {
    total_predicted_orders: number;
    total_predicted_orders_base: number;
    climate_impact_percent: number;
    hot_days_count: number;
    rainy_days_count: number;
    avg_daily_orders: number;
  };
  timestamp: string;
}

interface CurrentWeatherResponse {
  success: boolean;
  commune: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  current: {
    date: string;
    commune: string;
    temp_c: number;
    temp_max_c: number;
    temp_min_c: number;
    humidity: number;
    precip_mm: number;
  };
  forecast_7_days: Array<{
    date: string;
    temp_c: number;
    temp_max_c: number;
    temp_min_c: number;
    humidity: number;
    precip_mm: number;
  }>;
  timestamp: string;
}

interface CommunesResponse {
  total: number;
  communes: Array<{
    name: string;
    lat: number;
    lon: number;
  }>;
}

/**
 * Cliente API ML
 */
class MLApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = ML_API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error en ML API (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Health check de la API
   */
  async healthCheck() {
    return this.request<{ status: string; models: Record<string, string> }>('/health');
  }

  /**
   * Predecir probabilidad de churn de un cliente
   */
  async predictChurn(data: ChurnPredictionRequest): Promise<ChurnPredictionResponse> {
    return this.request<ChurnPredictionResponse>('/predict/churn', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Forecast de demanda para próximos N días
   */
  async forecastDemand(data: DemandForecastRequest): Promise<DemandForecastResponse> {
    return this.request<DemandForecastResponse>('/predict/demand', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Estimar costo de entrega
   */
  async estimateRouteCost(data: RouteCostRequest): Promise<RouteCostResponse> {
    return this.request<RouteCostResponse>('/predict/route-cost', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Sugerir precio óptimo
   */
  async suggestPrice(data: PriceSuggestionRequest): Promise<PriceSuggestionResponse> {
    return this.request<PriceSuggestionResponse>('/predict/price', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Obtener segmentos de clientes
   */
  async getSegments(): Promise<SegmentsResponse> {
    return this.request<SegmentsResponse>('/segments');
  }

  /**
   * Predecir demanda con pronóstico climático
   * Integra datos de Open-Meteo para mejorar precisión de forecast
   */
  async forecastDemandWeather(data: DemandWeatherRequest): Promise<DemandWeatherResponse> {
    return this.request<DemandWeatherResponse>('/predict/demand-weather', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Obtener clima actual y forecast de una comuna
   */
  async getCurrentWeather(commune: string): Promise<CurrentWeatherResponse> {
    return this.request<CurrentWeatherResponse>(`/weather/current/${encodeURIComponent(commune)}`);
  }

  /**
   * Listar todas las comunas válidas con coordenadas
   */
  async getValidCommunes(): Promise<CommunesResponse> {
    return this.request<CommunesResponse>('/weather/communes');
  }
}

// Exportar instancia única
export const mlApi = new MLApiClient();

// Exportar tipos
export type {
  ChurnPredictionRequest,
  ChurnPredictionResponse,
  DemandForecastRequest,
  DemandForecastResponse,
  RouteCostRequest,
  RouteCostResponse,
  PriceSuggestionRequest,
  PriceSuggestionResponse,
  Segment,
  SegmentsResponse,
  // Tipos de clima
  DemandWeatherRequest,
  DemandWeatherResponse,
  WeatherPrediction,
  CurrentWeatherResponse,
  CommunesResponse,
};

