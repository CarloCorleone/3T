# 🌤️ Integración de Clima - Sistema ML

## Descripción General

Sistema de predicción de demanda mejorado con datos climáticos de **Open-Meteo API** (100% gratuita). Integra temperatura, humedad y precipitación como variables externas (regressors) en modelos Prophet para mejorar la precisión de los forecasts.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUJO DE DATOS CLIMA                        │
└─────────────────────────────────────────────────────────────────┘

1. RECOLECCIÓN
   Open-Meteo API (gratis) → weather_service.py → Supabase (3t_weather_data)
   
2. CONSOLIDACIÓN
   dataset_completo.csv + 3t_weather_data → dataset_weather.csv
   
3. ENTRENAMIENTO
   Prophet con regressors (temp_max_c, humidity, precip_mm) → modelos/*.pkl
   
4. PREDICCIÓN
   FastAPI /predict/demand-weather → Forecast + Clima → Dashboard
```

## Componentes

### 1. Base de Datos

**Tabla:** `3t_weather_data`

```sql
CREATE TABLE "3t_weather_data" (
  weather_id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  commune TEXT NOT NULL,
  temp_c NUMERIC(5,2),           -- Temperatura promedio
  temp_max_c NUMERIC(5,2),        -- Temperatura máxima
  temp_min_c NUMERIC(5,2),        -- Temperatura mínima
  humidity INTEGER,               -- Humedad relativa %
  precip_mm NUMERIC(6,2),         -- Precipitación mm
  is_hot_day BOOLEAN,             -- Auto: temp_max_c > 28
  is_rainy_day BOOLEAN,           -- Auto: precip_mm > 5
  data_source TEXT DEFAULT 'open-meteo',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, commune)
);
```

**Comunas soportadas:** 30 (desde Chicureo hasta Requínoa)

### 2. Servicios Python

#### `src/communes_constants.py`
Lista canónica de 30 comunas con coordenadas GPS precisas.

```python
from src.communes_constants import VALID_COMMUNES, get_commune_coords

coords = get_commune_coords("Santiago")
# {'lat': -33.4489, 'lon': -70.6693}
```

#### `src/weather_service.py`
Cliente Open-Meteo API y servicio de BD.

```python
from src.weather_service import OpenMeteoClient, WeatherDBService

# Cliente Open-Meteo (sin API key)
client = OpenMeteoClient()
historical = client.get_historical_for_commune("Santiago", "2024-01-01", "2024-12-31")
forecast = client.get_forecast_for_commune("Renca", days=14)

# Servicio BD (con Supabase client)
db = WeatherDBService(supabase_client)
db.save_weather_data(records)
df = db.get_weather_range("2024-01-01", "2024-12-31", commune="Santiago")
```

#### `src/sync_historical_weather.py`
Script para sincronizar datos históricos.

```bash
# Sincronizar último año (30 comunas)
python src/sync_historical_weather.py --days 365

# Rango específico
python src/sync_historical_weather.py --start-date 2024-01-01 --end-date 2025-11-10

# Comunas específicas
python src/sync_historical_weather.py --days 365 --communes Santiago Renca Quilicura
```

**Estimado:** ~10-15 minutos para 365 días × 30 comunas = 10,950 registros

### 3. API Endpoints (FastAPI)

#### `POST /predict/demand-weather`
Predicción de demanda con pronóstico climático.

**Request:**
```json
{
  "days_ahead": 14,
  "include_revenue": true,
  "communes": ["Santiago", "Renca"]  // Opcional
}
```

**Response:**
```json
{
  "success": true,
  "days_ahead": 14,
  "communes_analyzed": 2,
  "predictions": [
    {
      "date": "2025-11-11",
      "predicted_orders": 45,
      "predicted_orders_base": 42,
      "temp_max_c": 28.5,
      "humidity": 45,
      "is_hot_day": true,
      "adjustment_factor": 1.15
    }
  ],
  "summary": {
    "total_predicted_orders": 580,
    "climate_impact_percent": 8.3,
    "hot_days_count": 4,
    "rainy_days_count": 1
  }
}
```

#### `GET /weather/current/{commune}`
Clima actual y forecast 7 días de una comuna.

```bash
curl http://localhost:8001/weather/current/Santiago
```

#### `GET /weather/communes`
Lista de 30 comunas válidas con coordenadas.

### 4. Cliente TypeScript

**Ubicación:** `/opt/cane/3t/lib/ml-api-client.ts`

```typescript
import { mlApi } from '@/lib/ml-api-client';

// Predicción con clima
const forecast = await mlApi.forecastDemandWeather({
  days_ahead: 14,
  include_revenue: true,
  communes: ["Santiago", "Renca"]
});

// Clima actual
const weather = await mlApi.getCurrentWeather("Santiago");

// Lista de comunas
const communes = await mlApi.getValidCommunes();
```

### 5. Dashboard (ML Insights)

**TODO:** Tab "Predicción Climática" en `/app/ml-insights/page.tsx`

**Features planeados:**
- Cards: pedidos predichos, revenue, días calurosos
- Tabla: próximos 14 días con clima
- Gráfico dual: pedidos + temperatura (líneas superpuestas)
- Badges: 🔥 Caluroso (>28°C), ☔ Lluvioso (>5mm)

## Flujo de Trabajo

### Setup Inicial

1. **Normalizar comunas** (ya ejecutado):
```sql
UPDATE "3t_addresses" SET commune = 'La Reina' WHERE LOWER(commune) = 'la reina';
-- ... etc
```

2. **Sincronizar datos históricos**:
```bash
cd /opt/cane/3t/ml
source venv/bin/activate
python src/sync_historical_weather.py --days 365
```

3. **Verificar datos**:
```sql
SELECT commune, COUNT(*), MIN(date), MAX(date) 
FROM "3t_weather_data" 
GROUP BY commune;
```

### Análisis de Correlación

**Script:** `src/analysis_weather_correlation.py` (TODO)

```bash
python src/analysis_weather_correlation.py
```

**Output:**
- Correlación Pearson: temperatura vs pedidos
- Gráficos: scatter plots, time series
- Reporte: `reports/weather_correlation_YYYYMMDD.html`

### Consolidación de Datos

**Script:** `src/consolidate_data_weather.py` (TODO)

Merge `dataset_completo.csv` + datos de `3t_weather_data`:

```python
# Pseudo-código
orders = pd.read_csv('data/processed/dataset_completo.csv')
weather = fetch_from_supabase('3t_weather_data')
merged = orders.merge(weather, left_on=['order_date', 'delivery_commune'], 
                      right_on=['date', 'commune'])
merged.to_csv('data/processed/dataset_weather.csv')
```

**Features derivados:**
- `temp_7d_avg`: Temperatura promedio últimos 7 días
- `temp_diff`: Diferencia con día anterior
- `is_weekend`: Fin de semana
- `season`: Verano, Otoño, Invierno, Primavera

### Entrenamiento de Modelos

**Script:** `src/train_models_weather.py` (TODO)

```python
from prophet import Prophet

# Prophet con regressors
model = Prophet(yearly_seasonality=True, weekly_seasonality=True)
model.add_regressor('temp_max_c')
model.add_regressor('humidity')
model.add_regressor('is_hot_day', standardize=False)
model.fit(df_weather)

# Guardar
with open('models/prophet_demand_weather.pkl', 'wb') as f:
    pickle.dump(model, f)
```

**Validación:**
- MAE (Mean Absolute Error) vs baseline sin clima
- R² score
- Gráfico: predicción vs real con bandas de confianza

### Automatización (Cron)

**Sincronización diaria del forecast:**

```bash
# /etc/cron.d/ml-weather-sync
0 6 * * * cd /opt/cane/3t/ml && source venv/bin/activate && python src/sync_historical_weather.py --days 1 >> logs/weather_sync.log 2>&1
```

## Open-Meteo API

**Características:**
- ✅ 100% gratuita, sin API key
- ✅ Límite: 10,000 calls/día
- ✅ Histórico: Desde 1940
- ✅ Forecast: Hasta 16 días
- ✅ Datos: Temperatura, humedad, precipitación, viento, etc.

**URLs:**
- Histórico: `https://archive-api.open-meteo.com/v1/archive`
- Forecast: `https://api.open-meteo.com/v1/forecast`
- Docs: https://open-meteo.com/en/docs

**Uso diario:** ~30 calls (1 por comuna) = 0.3% del límite

## Impacto Esperado

**Basado en heurísticas (TODO: validar con datos reales):**

| Condición | Factor de Ajuste | Impacto |
|-----------|------------------|---------|
| Día caluroso (>28°C) | +15% | Mayor demanda de agua |
| Día cálido (25-28°C) | +8% | Demanda moderada |
| Día frío (<15°C) | -5% | Menor demanda |
| Día lluvioso (>5mm) | -10% | Menos pedidos |

**Ejemplo real:**
- Baseline: 42 pedidos/día
- Día caluroso sin lluvia: 42 × 1.15 = 48 pedidos (+14%)
- Día lluvioso: 42 × 0.90 = 38 pedidos (-10%)

## Archivos Clave

```
3t/ml/
├── src/
│   ├── communes_constants.py          ✅ 30 comunas con coordenadas
│   ├── weather_service.py             ✅ OpenMeteoClient + WeatherDBService
│   ├── sync_historical_weather.py     ✅ Script sincronización
│   ├── analysis_weather_correlation.py  TODO
│   ├── consolidate_data_weather.py      TODO
│   └── train_models_weather.py          TODO
├── api/
│   └── main.py                        ✅ Endpoints: /predict/demand-weather, /weather/*
├── models/
│   └── prophet_demand_weather.pkl     TODO (modelo con regressors)
├── WEATHER_INTEGRATION.md             ✅ Esta documentación
└── SYNC_WEATHER_README.md             ✅ Guía de sincronización

3t/lib/
└── ml-api-client.ts                   ✅ Cliente TypeScript

3t/app/
└── ml-insights/page.tsx               TODO Tab "Predicción Climática"
```

## TODOs Pendientes

1. ⏳ **Sincronizar datos históricos** (365 días)
2. 📊 **Análisis de correlación** clima vs ventas
3. 🔄 **Pipeline de consolidación** dataset + clima
4. 🧠 **Entrenar modelos Prophet** con regressors
5. 📈 **Dashboard tab** "Predicción Climática"
6. 🧪 **Tests** unitarios + E2E
7. ⏰ **Cron job** para sync diario

## Troubleshooting

### Error: "Servicio de clima no disponible"
**Causa:** Módulos no importados correctamente.
**Solución:**
```bash
cd /opt/cane/3t/ml
source venv/bin/activate
pip install requests tqdm supabase
python -c "from src.weather_service import OpenMeteoClient; print('✓ OK')"
```

### Predicciones sin impacto climático
**Causa:** Modelo actual no tiene regressors entrenados.
**Solución:** Ejecutar pipeline completo:
1. Sync histórico
2. Consolidar datos
3. Entrenar modelo con regressors

### Comunas no encontradas
**Causa:** Nombres no normalizados en `3t_addresses`.
**Solución:** Ya ejecutado en Fase 0. Verificar:
```sql
SELECT DISTINCT commune FROM "3t_addresses" WHERE commune IS NOT NULL;
```

## Referencias

- **Open-Meteo:** https://open-meteo.com
- **Prophet Docs:** https://facebook.github.io/prophet/docs/seasonality,_holiday_effects,_and_regressors.html
- **Plan original:** `/opt/cane/weather.plan.md`

---

**Última actualización:** 2025-11-10  
**Autor:** Sistema ML Agua Tres Torres  
**Versión:** 1.0 (MVP)

