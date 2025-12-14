#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================
API REST - Sistema ML Agua Tres Torres
============================================
FastAPI para servir predicciones de todos los modelos ML.

Endpoints disponibles:
- POST /predict/churn - Predecir probabilidad de churn
- POST /predict/demand - Predecir demanda próximos días
- POST /predict/route-cost - Estimar costo de ruta
- POST /predict/price - Sugerir precio óptimo
- GET /segments - Obtener segmentación de clientes
- GET /health - Health check

Autor: Sistema ML Agua Tres Torres
Fecha: 2025-11-03
"""

import os
import sys
import pickle
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Agregar path para imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importar servicios de clima
try:
    from src.weather_service import OpenMeteoClient, WeatherDBService
    from src.communes_constants import VALID_COMMUNES, get_commune_coords
    WEATHER_ENABLED = True
except ImportError:
    WEATHER_ENABLED = False
    print("⚠️ Servicios de clima no disponibles")

# Configuración
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

# ============================================
# INICIALIZAR FASTAPI
# ============================================

app = FastAPI(
    title="API ML Agua Tres Torres",
    description="API REST para servir predicciones de Machine Learning",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS - Permitir frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción: especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# CARGAR MODELOS AL INICIO
# ============================================

print("🔄 Cargando modelos ML...")
MODELS = {}

# Inicializar cliente de clima
if WEATHER_ENABLED:
    WEATHER_CLIENT = OpenMeteoClient()
    print("✓ Cliente Open-Meteo inicializado")
else:
    WEATHER_CLIENT = None

try:
    # XGBoost Churn
    with open(os.path.join(MODELS_DIR, "xgboost_churn.pkl"), 'rb') as f:
        MODELS['churn'] = pickle.load(f)
    print("✓ XGBoost Churn cargado")
    
    # Prophet Demanda
    with open(os.path.join(MODELS_DIR, "prophet_demand.pkl"), 'rb') as f:
        MODELS['demand'] = pickle.load(f)
    print("✓ Prophet Demanda cargado")
    
    # Prophet Revenue
    with open(os.path.join(MODELS_DIR, "prophet_revenue.pkl"), 'rb') as f:
        MODELS['revenue'] = pickle.load(f)
    print("✓ Prophet Revenue cargado")
    
    # Random Forest Rutas
    with open(os.path.join(MODELS_DIR, "random_forest_routes.pkl"), 'rb') as f:
        MODELS['routes'] = pickle.load(f)
    print("✓ Random Forest Rutas cargado")
    
    # Ridge Precios
    with open(os.path.join(MODELS_DIR, "ridge_pricing.pkl"), 'rb') as f:
        MODELS['pricing'] = pickle.load(f)
    print("✓ Ridge Precios cargado")
    
    # KMeans Segmentación
    with open(os.path.join(MODELS_DIR, "kmeans_segmentation.pkl"), 'rb') as f:
        MODELS['segments'] = pickle.load(f)
    print("✓ KMeans Segmentación cargado")
    
    print("✅ Todos los modelos cargados exitosamente\n")
    
except Exception as e:
    print(f"❌ Error cargando modelos: {e}")
    sys.exit(1)

# ============================================
# MODELOS PYDANTIC (VALIDACIÓN)
# ============================================

class ChurnPredictionRequest(BaseModel):
    """Request para predicción de churn."""
    customer_id: str = Field(..., description="ID del cliente")
    recency_days: int = Field(..., description="Días desde última compra", ge=0)
    frequency: int = Field(0, description="Número total de pedidos", ge=0)
    monetary: float = Field(0, description="Valor total histórico", ge=0)
    
    class Config:
        json_schema_extra = {
            "example": {
                "customer_id": "customer_123",
                "recency_days": 95,
                "frequency": 15,
                "monetary": 250000
            }
        }

class ChurnPredictionResponse(BaseModel):
    """Response de predicción de churn."""
    customer_id: str
    churn_probability: float = Field(..., description="Probabilidad de churn (0-1)")
    is_high_risk: bool = Field(..., description="¿Alto riesgo? (>90 días)")
    risk_level: str = Field(..., description="Nivel de riesgo: bajo, medio, alto")
    recommendation: str = Field(..., description="Recomendación de acción")
    days_until_action: int = Field(..., description="Días recomendados para contactar")

class DemandForecastRequest(BaseModel):
    """Request para forecast de demanda."""
    days_ahead: int = Field(30, description="Días a predecir", ge=1, le=90)
    include_revenue: bool = Field(True, description="Incluir predicción de revenue")

class DemandForecastResponse(BaseModel):
    """Response de forecast de demanda."""
    forecast_days: int
    predictions: List[dict]
    summary: dict

class RouteCostRequest(BaseModel):
    """Request para estimación de costo de ruta."""
    latitude: float = Field(..., description="Latitud destino", ge=-90, le=90)
    longitude: float = Field(..., description="Longitud destino", ge=-180, le=180)
    quantity: int = Field(..., description="Cantidad de unidades", ge=1)
    customer_type: str = Field("Hogar", description="Tipo: Hogar o Empresa")

class RouteCostResponse(BaseModel):
    """Response de estimación de ruta."""
    estimated_cost: float
    distance_from_center_km: float
    delivery_time_estimate_hours: float
    priority_level: str

class PriceSuggestionRequest(BaseModel):
    """Request para sugerencia de precio."""
    customer_id: Optional[str] = None
    quantity: int = Field(..., description="Cantidad de unidades", ge=1)
    customer_type: str = Field("Hogar", description="Tipo: Hogar o Empresa")
    recency_days: int = Field(30, description="Días desde última compra", ge=0)
    frequency: int = Field(5, description="Número de pedidos históricos", ge=0)
    monetary_total: float = Field(50000, description="Valor histórico", ge=0)

class PriceSuggestionResponse(BaseModel):
    """Response de sugerencia de precio."""
    suggested_price: float
    price_range_min: float
    price_range_max: float
    discount_recommended: float
    reasoning: str

# Modelos para endpoints de clima (Open-Meteo)
class DemandWeatherRequest(BaseModel):
    """Request para predicción con clima."""
    days_ahead: int = Field(14, description="Días a predecir (máx 16)", ge=1, le=16)
    include_revenue: bool = Field(True, description="Incluir revenue")
    communes: Optional[List[str]] = Field(None, description="Comunas específicas (None=promedio)")

# ============================================
# ENDPOINTS
# ============================================

@app.get("/")
async def root():
    """Endpoint raíz."""
    return {
        "service": "API ML Agua Tres Torres",
        "version": "1.0.0",
        "status": "online",
        "models_loaded": len(MODELS),
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "predict_churn": "POST /predict/churn",
            "predict_demand": "POST /predict/demand",
            "predict_route_cost": "POST /predict/route-cost",
            "predict_price": "POST /predict/price",
            "segments": "GET /segments"
        }
    }

@app.get("/health")
async def health_check():
    """Health check del servicio."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models": {
            name: "loaded" for name in MODELS.keys()
        }
    }

@app.post("/predict/churn", response_model=ChurnPredictionResponse)
async def predict_churn(request: ChurnPredictionRequest):
    """
    Predecir probabilidad de churn de un cliente.
    
    - **recency_days**: Días desde última compra (>90 = alto riesgo)
    - **frequency**: Número total de pedidos históricos
    - **monetary**: Valor total gastado
    """
    try:
        # Preparar features
        X = pd.DataFrame([{
            'recency_days': request.recency_days,
            'frequency': request.frequency,
            'monetary': request.monetary
        }])
        
        # Predecir
        model = MODELS['churn']
        churn_prob = model.predict_proba(X)[0][1]  # Probabilidad clase 1 (churn)
        is_churn = churn_prob > 0.5
        
        # Clasificar riesgo
        if request.recency_days <= 30:
            risk_level = "bajo"
            recommendation = "Cliente activo. Mantener comunicación regular."
            days_until_action = 30
        elif request.recency_days <= 60:
            risk_level = "medio"
            recommendation = "Enviar campaña de engagement. Ofrecer promoción."
            days_until_action = 7
        elif request.recency_days <= 90:
            risk_level = "alto"
            recommendation = "¡URGENTE! Contactar inmediatamente con oferta especial."
            days_until_action = 1
        else:
            risk_level = "crítico"
            recommendation = "¡CRÍTICO! Cliente inactivo. Campaña de reactivación agresiva."
            days_until_action = 0
        
        return ChurnPredictionResponse(
            customer_id=request.customer_id,
            churn_probability=float(churn_prob),
            is_high_risk=is_churn,
            risk_level=risk_level,
            recommendation=recommendation,
            days_until_action=days_until_action
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en predicción: {str(e)}")

@app.post("/predict/demand", response_model=DemandForecastResponse)
async def predict_demand(request: DemandForecastRequest):
    """
    Forecast de demanda para los próximos N días.
    
    - **days_ahead**: Número de días a predecir (1-90)
    - **include_revenue**: Incluir predicción de revenue
    """
    try:
        # Forecast de pedidos
        model_demand = MODELS['demand']
        future = model_demand.make_future_dataframe(periods=request.days_ahead)
        forecast = model_demand.predict(future)
        forecast_future = forecast.tail(request.days_ahead)
        
        predictions = []
        for _, row in forecast_future.iterrows():
            pred = {
                "date": row['ds'].strftime('%Y-%m-%d'),
                "predicted_orders": max(0, round(row['yhat'])),
                "lower_bound": max(0, round(row['yhat_lower'])),
                "upper_bound": max(0, round(row['yhat_upper']))
            }
            
            # Agregar revenue si se solicita
            if request.include_revenue:
                model_revenue = MODELS['revenue']
                future_rev = model_revenue.make_future_dataframe(periods=request.days_ahead)
                forecast_rev = model_revenue.predict(future_rev)
                forecast_future_rev = forecast_rev.tail(request.days_ahead)
                rev_row = forecast_future_rev[forecast_future_rev['ds'] == row['ds']].iloc[0]
                pred["predicted_revenue"] = max(0, round(rev_row['yhat']))
                pred["revenue_lower_bound"] = max(0, round(rev_row['yhat_lower']))
                pred["revenue_upper_bound"] = max(0, round(rev_row['yhat_upper']))
            
            predictions.append(pred)
        
        # Resumen
        total_orders = sum(p["predicted_orders"] for p in predictions)
        avg_daily_orders = total_orders / len(predictions)
        
        summary = {
            "total_predicted_orders": total_orders,
            "avg_daily_orders": round(avg_daily_orders, 1),
            "peak_day": max(predictions, key=lambda x: x["predicted_orders"])["date"],
            "low_day": min(predictions, key=lambda x: x["predicted_orders"])["date"]
        }
        
        if request.include_revenue:
            total_revenue = sum(p["predicted_revenue"] for p in predictions)
            summary["total_predicted_revenue"] = total_revenue
            summary["avg_daily_revenue"] = round(total_revenue / len(predictions))
        
        return DemandForecastResponse(
            forecast_days=request.days_ahead,
            predictions=predictions,
            summary=summary
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en forecast: {str(e)}")

@app.post("/predict/route-cost", response_model=RouteCostResponse)
async def predict_route_cost(request: RouteCostRequest):
    """
    Estimar costo de entrega basado en ubicación y cantidad.
    
    - **latitude/longitude**: Coordenadas del destino
    - **quantity**: Cantidad de unidades a entregar
    - **customer_type**: Hogar o Empresa
    """
    try:
        # Calcular distancia desde centro (Santiago: -33.45, -70.65)
        distance_from_center = np.sqrt(
            (request.latitude + 33.45)**2 + 
            (request.longitude + 70.65)**2
        )
        
        # Preparar features
        customer_type_encoded = 1 if request.customer_type == "Empresa" else 0
        X = pd.DataFrame([{
            'latitude': request.latitude,
            'longitude': request.longitude,
            'quantity': request.quantity,
            'customer_type_encoded': customer_type_encoded,
            'distance_from_center': distance_from_center
        }])
        
        # Predecir
        model = MODELS['routes']
        estimated_cost = float(model.predict(X)[0])
        
        # Calcular distancia en km (aproximado)
        distance_km = distance_from_center * 111  # 1 grado ≈ 111 km
        
        # Estimar tiempo de entrega
        delivery_time_hours = max(0.5, distance_km / 40)  # 40 km/h promedio
        
        # Prioridad
        if distance_km < 10:
            priority = "alta"
        elif distance_km < 30:
            priority = "media"
        else:
            priority = "baja"
        
        return RouteCostResponse(
            estimated_cost=round(estimated_cost, 2),
            distance_from_center_km=round(distance_km, 2),
            delivery_time_estimate_hours=round(delivery_time_hours, 2),
            priority_level=priority
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en estimación de ruta: {str(e)}")

@app.post("/predict/price", response_model=PriceSuggestionResponse)
async def suggest_price(request: PriceSuggestionRequest):
    """
    Sugerir precio óptimo basado en cliente y cantidad.
    
    - **quantity**: Cantidad de unidades
    - **customer_type**: Hogar o Empresa
    - **recency/frequency/monetary**: Histórico del cliente
    """
    try:
        # Preparar features
        customer_type_encoded = 1 if request.customer_type == "Empresa" else 0
        X = pd.DataFrame([{
            'quantity': request.quantity,
            'customer_type_encoded': customer_type_encoded,
            'recency_days': request.recency_days,
            'frequency': request.frequency,
            'monetary_total': request.monetary_total
        }])
        
        # Predecir
        model_data = MODELS['pricing']
        model = model_data['model']
        scaler = model_data['scaler']
        
        X_scaled = scaler.transform(X)
        suggested_price = float(model.predict(X_scaled)[0])
        
        # Ajustar rango (±15%)
        price_range_min = suggested_price * 0.85
        price_range_max = suggested_price * 1.15
        
        # Calcular descuento recomendado
        if request.frequency >= 20:
            discount = 15
            reasoning = "Cliente VIP (20+ pedidos) - Descuento premium"
        elif request.frequency >= 10:
            discount = 10
            reasoning = "Cliente frecuente (10-19 pedidos) - Descuento lealtad"
        elif request.recency_days > 90:
            discount = 20
            reasoning = "Cliente inactivo - Descuento de reactivación"
        elif request.customer_type == "Empresa":
            discount = 5
            reasoning = "Cliente Empresa - Descuento corporativo"
        else:
            discount = 0
            reasoning = "Precio estándar"
        
        return PriceSuggestionResponse(
            suggested_price=round(suggested_price, 2),
            price_range_min=round(price_range_min, 2),
            price_range_max=round(price_range_max, 2),
            discount_recommended=discount,
            reasoning=reasoning
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en sugerencia de precio: {str(e)}")

@app.get("/segments")
async def get_segments():
    """
    Obtener información sobre segmentos de clientes.
    """
    try:
        # Cargar datos RFM si están disponibles
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "processed")
        rfm_path = os.path.join(data_dir, "rfm_segments.csv")
        
        if os.path.exists(rfm_path):
            rfm = pd.read_csv(rfm_path)
            
            segments_info = []
            # Mapeo de segmentos a IDs
            segment_mapping = {
                "Champions": 3,
                "Leales": 2,
                "Potenciales": 1,
                "En Riesgo": 0
            }
            
            # Agrupar por segment (texto)
            for segment_name, cluster_id in segment_mapping.items():
                # Buscar segmentos que coincidan (case-insensitive, partial match)
                cluster_data = rfm[rfm['segment'].str.contains(segment_name, case=False, na=False)]
                
                if len(cluster_data) > 0:
                    segments_info.append({
                        "cluster_id": int(cluster_id),
                        "customer_count": len(cluster_data),
                        "avg_recency_days": round(cluster_data['recency_days'].mean(), 1),
                        "avg_frequency": round(cluster_data['frequency'].mean(), 1),
                        "avg_monetary": round(cluster_data['monetary'].mean(), 2),
                        "total_value": round(cluster_data['monetary'].sum(), 2)
                    })
            
            return {
                "total_customers": len(rfm),
                "segments": segments_info,
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "error": "Datos de segmentación no disponibles",
                "message": "Ejecutar análisis RFM primero"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo segmentos: {str(e)}")

# ============================================
# ENDPOINTS DE CLIMA (Open-Meteo)
# ============================================

@app.post("/predict/demand-weather")
async def predict_demand_weather(request: DemandWeatherRequest):
    """
    Predecir demanda con pronóstico climático.
    
    Integra forecast de Open-Meteo con modelos Prophet para mejorar precisión.
    Considera temperatura, humedad y precipitación como regressors.
    """
    try:
        if not WEATHER_ENABLED or WEATHER_CLIENT is None:
            raise HTTPException(
                status_code=503, 
                detail="Servicio de clima no disponible. Instalar dependencias y configurar Open-Meteo"
            )
        
        # Validar comunas si se especifican
        if request.communes:
            invalid = [c for c in request.communes if c not in VALID_COMMUNES]
            if invalid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Comunas inválidas: {invalid}. Válidas: {VALID_COMMUNES[:5]}..."
                )
            communes = request.communes
        else:
            # Usar top 10 comunas por defecto
            communes = ["Santiago", "Renca", "Quilicura", "Maipú", "Peñalolen"]
        
        print(f"📊 Predicción clima: {len(communes)} comunas, {request.days_ahead} días")
        
        # 1. Obtener forecast de clima para cada comuna
        weather_forecasts = {}
        for commune in communes:
            try:
                forecast_data = WEATHER_CLIENT.get_forecast_for_commune(commune, request.days_ahead)
                weather_forecasts[commune] = WEATHER_CLIENT.parse_daily_data(forecast_data, commune)
            except Exception as e:
                print(f"⚠️ Error obteniendo forecast de {commune}: {e}")
                continue
        
        if not weather_forecasts:
            raise HTTPException(status_code=500, detail="No se pudo obtener forecast climático")
        
        # 2. Agregar forecast climático promedio
        dates = weather_forecasts[list(weather_forecasts.keys())[0]]
        avg_weather = []
        
        for i, date_info in enumerate(dates):
            temps_max = [weather_forecasts[c][i]['temp_max_c'] for c in weather_forecasts if weather_forecasts[c][i]['temp_max_c']]
            temps_min = [weather_forecasts[c][i]['temp_min_c'] for c in weather_forecasts if weather_forecasts[c][i]['temp_min_c']]
            humidity = [weather_forecasts[c][i]['humidity'] for c in weather_forecasts if weather_forecasts[c][i]['humidity']]
            precip = [weather_forecasts[c][i]['precip_mm'] for c in weather_forecasts if weather_forecasts[c][i]['precip_mm'] is not None]
            
            avg_temp_max = np.mean(temps_max) if temps_max else 20
            avg_temp_min = np.mean(temps_min) if temps_min else 10
            avg_humidity = int(np.mean(humidity)) if humidity else 50
            avg_precip = np.mean(precip) if precip else 0
            
            avg_weather.append({
                'date': date_info['date'],
                'temp_max_c': round(avg_temp_max, 1),
                'temp_min_c': round(avg_temp_min, 1),
                'temp_c': round((avg_temp_max + avg_temp_min) / 2, 1),
                'humidity': avg_humidity,
                'precip_mm': round(avg_precip, 1),
                'is_hot_day': bool(avg_temp_max > 28),
                'is_rainy_day': bool(avg_precip > 5)
            })
        
        # 3. Predicción base con Prophet (sin clima)
        # NOTA: En producción, usar modelo Prophet entrenado con regressors
        # Por ahora usamos el modelo existente y ajustamos con factores climáticos
        
        model_demand = MODELS.get('demand')
        if not model_demand:
            raise HTTPException(status_code=500, detail="Modelo de demanda no cargado")
        
        # Crear dataframe para predicción
        future = model_demand.make_future_dataframe(periods=request.days_ahead)
        forecast_base = model_demand.predict(future)
        
        # Tomar solo los días futuros
        forecast_base = forecast_base.tail(request.days_ahead)
        
        # 4. Ajustar predicción según clima
        predictions = []
        hot_days = 0
        rainy_days = 0
        
        for i, (idx, row) in enumerate(forecast_base.iterrows()):
            weather = avg_weather[i] if i < len(avg_weather) else {'temp_c': 20, 'is_hot_day': False, 'is_rainy_day': False}
            
            # Factor de ajuste por temperatura (días calurosos = más demanda)
            temp_factor = 1.0
            if weather.get('is_hot_day'):
                temp_factor = 1.15  # +15% en días calurosos
                hot_days += 1
            elif weather.get('temp_c', 20) > 25:
                temp_factor = 1.08  # +8% en días cálidos
            elif weather.get('temp_c', 20) < 15:
                temp_factor = 0.95  # -5% en días fríos
            
            # Factor de ajuste por lluvia (días lluviosos = menos demanda)
            rain_factor = 1.0
            if weather.get('is_rainy_day'):
                rain_factor = 0.90  # -10% en días lluviosos
                rainy_days += 1
            
            # Predicción ajustada
            base_pred = max(0, row['yhat'])
            adjusted_pred = base_pred * temp_factor * rain_factor
            
            predictions.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'predicted_orders': round(adjusted_pred),
                'predicted_orders_base': round(base_pred),
                'temp_max_c': weather.get('temp_max_c'),
                'temp_min_c': weather.get('temp_min_c'),
                'humidity': weather.get('humidity'),
                'precip_mm': weather.get('precip_mm'),
                'is_hot_day': weather.get('is_hot_day', False),
                'is_rainy_day': weather.get('is_rainy_day', False),
                'adjustment_factor': round(temp_factor * rain_factor, 2)
            })
        
        # 5. Revenue (opcional)
        revenue_predictions = []
        if request.include_revenue and MODELS.get('revenue'):
            model_revenue = MODELS['revenue']
            future_rev = model_revenue.make_future_dataframe(periods=request.days_ahead)
            forecast_rev = model_revenue.predict(future_rev).tail(request.days_ahead)
            
            for i, (idx, row) in enumerate(forecast_rev.iterrows()):
                weather = avg_weather[i] if i < len(avg_weather) else {}
                temp_factor = 1.15 if weather.get('is_hot_day') else 1.0
                rain_factor = 0.90 if weather.get('is_rainy_day') else 1.0
                
                base_rev = max(0, row['yhat'])
                adjusted_rev = base_rev * temp_factor * rain_factor
                
                revenue_predictions.append({
                    'date': row['ds'].strftime('%Y-%m-%d'),
                    'predicted_revenue': round(adjusted_rev, 2)
                })
        
        # 6. Resumen
        total_orders = sum(p['predicted_orders'] for p in predictions)
        total_orders_base = sum(p['predicted_orders_base'] for p in predictions)
        climate_impact = ((total_orders - total_orders_base) / total_orders_base * 100) if total_orders_base > 0 else 0
        
        return {
            'success': True,
            'days_ahead': request.days_ahead,
            'communes_analyzed': len(weather_forecasts),
            'predictions': predictions,
            'revenue_predictions': revenue_predictions if revenue_predictions else None,
            'summary': {
                'total_predicted_orders': total_orders,
                'total_predicted_orders_base': total_orders_base,
                'climate_impact_percent': round(climate_impact, 1),
                'hot_days_count': hot_days,
                'rainy_days_count': rainy_days,
                'avg_daily_orders': round(total_orders / request.days_ahead, 1)
            },
            'timestamp': datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en predict_demand_weather: {e}")
        raise HTTPException(status_code=500, detail=f"Error generando predicción: {str(e)}")

@app.get("/weather/current/{commune}")
async def get_current_weather(commune: str):
    """
    Obtener clima actual y forecast de una comuna.
    """
    try:
        if not WEATHER_ENABLED or WEATHER_CLIENT is None:
            raise HTTPException(status_code=503, detail="Servicio de clima no disponible")
        
        if commune not in VALID_COMMUNES:
            raise HTTPException(
                status_code=400,
                detail=f"Comuna inválida: {commune}. Válidas: {VALID_COMMUNES[:10]}..."
            )
        
        # Obtener forecast (incluye datos de hoy)
        forecast_data = WEATHER_CLIENT.get_forecast_for_commune(commune, days=7)
        forecast_parsed = WEATHER_CLIENT.parse_daily_data(forecast_data, commune)
        
        coords = get_commune_coords(commune)
        
        return {
            'success': True,
            'commune': commune,
            'coordinates': coords,
            'current': forecast_parsed[0] if forecast_parsed else None,
            'forecast_7_days': forecast_parsed,
            'timestamp': datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo clima: {str(e)}")

@app.get("/weather/communes")
async def list_valid_communes():
    """
    Listar comunas válidas con sus coordenadas.
    """
    try:
        communes_data = []
        for commune in VALID_COMMUNES:
            coords = get_commune_coords(commune)
            communes_data.append({
                'name': commune,
                'lat': coords['lat'],
                'lon': coords['lon']
            })
        
        return {
            'total': len(VALID_COMMUNES),
            'communes': communes_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ============================================
# PUNTO DE ENTRADA
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*70)
    print(" "*20 + "🚀 API ML AGUA TRES TORRES")
    print("="*70)
    print(f"\n📍 Servidor: http://localhost:8001")
    print(f"📚 Documentación: http://localhost:8001/docs")
    print(f"🔄 Health check: http://localhost:8001/health")
    print("\n" + "="*70 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")

