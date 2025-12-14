#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================
ENTRENAMIENTO DE TODOS LOS MODELOS ML
Sistema ML Agua Tres Torres
============================================
Script maestro para entrenar secuencialmente todos los modelos.

Modelos incluidos:
1. KMeans - Segmentación de clientes
2. XGBoost - Predicción de churn
3. Prophet - Predicción de demanda
4. Random Forest - Optimización de rutas
5. Ridge - Precios dinámicos

Fecha: 2025-11-03
"""

import os
import sys
import pandas as pd
import numpy as np
import pickle
import warnings
from datetime import datetime, timedelta
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import silhouette_score, classification_report, mean_absolute_error, r2_score
import xgboost as xgb
from prophet import Prophet

warnings.filterwarnings('ignore')

# Rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

print("\n" + "="*70)
print(" "*15 + "🤖 ENTRENAMIENTO DE MODELOS ML")
print(" "*15 + "Sistema Agua Tres Torres")
print("="*70)

# ============================================
# CARGAR DATOS
# ============================================

print("\n📂 Cargando datasets...")
df = pd.read_csv(os.path.join(DATA_DIR, "dataset_completo.csv"), parse_dates=['order_date', 'delivered_date'])
rfm = pd.read_csv(os.path.join(DATA_DIR, "rfm_segments.csv"))
print(f"✓ Dataset: {len(df):,} registros")
print(f"✓ RFM: {len(rfm):,} clientes")

# ============================================
# MODELO 1: KMEANS - SEGMENTACIÓN DE CLIENTES
# ============================================

print("\n" + "="*70)
print("1️⃣ ENTRENANDO: KMeans - Segmentación de Clientes")
print("="*70)

# Preparar features para clustering
rfm_features = rfm[['recency_days', 'frequency', 'monetary']].copy()
rfm_features = rfm_features.fillna(0)

# Normalizar
scaler_kmeans = StandardScaler()
rfm_scaled = scaler_kmeans.fit_transform(rfm_features)

# Entrenar KMeans
print("⏳ Entrenando KMeans con 4 clusters...")
kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
rfm['cluster'] = kmeans.fit_predict(rfm_scaled)

# Métricas
silhouette = silhouette_score(rfm_scaled, rfm['cluster'])
print(f"✓ Silhouette Score: {silhouette:.3f}")

# Interpretar clusters
print("\n📊 DISTRIBUCIÓN DE CLUSTERS:")
for cluster_id in range(4):
    cluster_data = rfm[rfm['cluster'] == cluster_id]
    print(f"\n   Cluster {cluster_id}:")
    print(f"     • Clientes: {len(cluster_data)}")
    print(f"     • Recency promedio: {cluster_data['recency_days'].mean():.0f} días")
    print(f"     • Frequency promedio: {cluster_data['frequency'].mean():.1f} pedidos")
    print(f"     • Monetary promedio: ${cluster_data['monetary'].mean():,.0f}")

# Guardar modelo
model_path = os.path.join(MODELS_DIR, "kmeans_segmentation.pkl")
with open(model_path, 'wb') as f:
    pickle.dump({'model': kmeans, 'scaler': scaler_kmeans}, f)
print(f"\n💾 Modelo guardado: {model_path}")

# ============================================
# MODELO 2: XGBOOST - PREDICCIÓN DE CHURN
# ============================================

print("\n" + "="*70)
print("2️⃣ ENTRENANDO: XGBoost - Predicción de Churn")
print("="*70)

# Preparar datos
rfm_churn = rfm.copy()
rfm_churn['is_churn'] = (rfm_churn['recency_days'] > 90).astype(int)

# Features
features_churn = ['recency_days', 'frequency', 'monetary']
X_churn = rfm_churn[features_churn].fillna(0)
y_churn = rfm_churn['is_churn']

# Split
X_train, X_test, y_train, y_test = train_test_split(X_churn, y_churn, test_size=0.2, random_state=42)

print(f"⏳ Entrenando XGBoost...")
print(f"   • Training: {len(X_train)} muestras")
print(f"   • Testing: {len(X_test)} muestras")
print(f"   • Churn rate: {y_train.mean()*100:.1f}%")

# Entrenar (parámetros ligeros para RAM limitada)
xgb_model = xgb.XGBClassifier(
    n_estimators=50,  # Reducido para RAM
    max_depth=4,
    learning_rate=0.1,
    random_state=42,
    eval_metric='logloss'
)
xgb_model.fit(X_train, y_train)

# Evaluar
y_pred = xgb_model.predict(X_test)
print("\n📊 RESULTADOS:")
print(classification_report(y_test, y_pred, target_names=['No Churn', 'Churn']))

# Feature importance
feature_importance = pd.DataFrame({
    'feature': features_churn,
    'importance': xgb_model.feature_importances_
}).sort_values('importance', ascending=False)
print("\n🔑 IMPORTANCIA DE FEATURES:")
for _, row in feature_importance.iterrows():
    print(f"   • {row['feature']:<15} {row['importance']:.3f}")

# Guardar
model_path = os.path.join(MODELS_DIR, "xgboost_churn.pkl")
with open(model_path, 'wb') as f:
    pickle.dump(xgb_model, f)
print(f"\n💾 Modelo guardado: {model_path}")

# ============================================
# MODELO 3: PROPHET - PREDICCIÓN DE DEMANDA
# ============================================

print("\n" + "="*70)
print("3️⃣ ENTRENANDO: Prophet - Predicción de Demanda")
print("="*70)

# Preparar datos para Prophet (necesita columnas 'ds' y 'y')
df_prophet = df.groupby('order_date').agg({
    'order_id': 'count',
    'final_price': 'sum'
}).reset_index()
df_prophet.columns = ['ds', 'pedidos', 'revenue']

# Entrenar modelo para pedidos
print("⏳ Entrenando Prophet para predicción de pedidos diarios...")
prophet_pedidos = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=False,
    changepoint_prior_scale=0.05
)
prophet_pedidos.fit(df_prophet[['ds', 'pedidos']].rename(columns={'pedidos': 'y'}))

# Predicción 30 días
future = prophet_pedidos.make_future_dataframe(periods=30)
forecast_pedidos = prophet_pedidos.predict(future)

print(f"\n📈 PREDICCIÓN PRÓXIMOS 30 DÍAS:")
next_30 = forecast_pedidos.tail(30)
print(f"   • Pedidos promedio diarios: {next_30['yhat'].mean():.1f}")
print(f"   • Total estimado 30 días: {next_30['yhat'].sum():.0f} pedidos")
print(f"   • Rango: {next_30['yhat_lower'].mean():.1f} - {next_30['yhat_upper'].mean():.1f}")

# Guardar
model_path = os.path.join(MODELS_DIR, "prophet_demand.pkl")
with open(model_path, 'wb') as f:
    pickle.dump(prophet_pedidos, f)
print(f"\n💾 Modelo guardado: {model_path}")

# Entrenar modelo para revenue
print("\n⏳ Entrenando Prophet para predicción de revenue...")
prophet_revenue = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=False,
    changepoint_prior_scale=0.05
)
prophet_revenue.fit(df_prophet[['ds', 'revenue']].rename(columns={'revenue': 'y'}))

forecast_revenue = prophet_revenue.predict(future)
next_30_revenue = forecast_revenue.tail(30)
print(f"\n💰 PREDICCIÓN REVENUE 30 DÍAS:")
print(f"   • Revenue promedio diario: ${next_30_revenue['yhat'].mean():,.0f}")
print(f"   • Total estimado 30 días: ${next_30_revenue['yhat'].sum():,.0f}")

# Guardar
model_path = os.path.join(MODELS_DIR, "prophet_revenue.pkl")
with open(model_path, 'wb') as f:
    pickle.dump(prophet_revenue, f)
print(f"💾 Modelo guardado: {model_path}")

# ============================================
# MODELO 4: RANDOM FOREST - OPTIMIZACIÓN DE RUTAS
# ============================================

print("\n" + "="*70)
print("4️⃣ ENTRENANDO: Random Forest - Optimización de Rutas")
print("="*70)

# Preparar datos con coordenadas
df_routes = df[df['latitude'].notna() & df['longitude'].notna()].copy()

# Crear features
df_routes['distance_from_center'] = np.sqrt(
    (df_routes['latitude'] + 33.45)**2 + 
    (df_routes['longitude'] + 70.65)**2
)

# Features: lat, lon, quantity, customer_type
df_routes['customer_type_encoded'] = (df_routes['customer_type'] == 'Empresa').astype(int)

features_routes = ['latitude', 'longitude', 'quantity', 'customer_type_encoded', 'distance_from_center']
X_routes = df_routes[features_routes].fillna(0)

# Target: simular costo de ruta (distancia + tiempo)
# En producción, esto vendría de datos reales de rutas
y_routes = df_routes['distance_from_center'] * 10 + df_routes['quantity'] * 0.5

# Split
X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X_routes, y_routes, test_size=0.2, random_state=42)

print(f"⏳ Entrenando Random Forest...")
print(f"   • Training: {len(X_train_r)} rutas")
print(f"   • Testing: {len(X_test_r)} rutas")

# Entrenar (parámetros ligeros)
rf_model = RandomForestRegressor(
    n_estimators=50,
    max_depth=10,
    random_state=42,
    n_jobs=2  # Usar solo 2 cores
)
rf_model.fit(X_train_r, y_train_r)

# Evaluar
y_pred_r = rf_model.predict(X_test_r)
mae = mean_absolute_error(y_test_r, y_pred_r)
r2 = r2_score(y_test_r, y_pred_r)

print(f"\n📊 RESULTADOS:")
print(f"   • MAE: {mae:.2f}")
print(f"   • R²: {r2:.3f}")

# Feature importance
feature_importance_r = pd.DataFrame({
    'feature': features_routes,
    'importance': rf_model.feature_importances_
}).sort_values('importance', ascending=False)
print("\n🔑 IMPORTANCIA DE FEATURES:")
for _, row in feature_importance_r.iterrows():
    print(f"   • {row['feature']:<25} {row['importance']:.3f}")

# Guardar
model_path = os.path.join(MODELS_DIR, "random_forest_routes.pkl")
with open(model_path, 'wb') as f:
    pickle.dump(rf_model, f)
print(f"\n💾 Modelo guardado: {model_path}")

# ============================================
# MODELO 5: RIDGE - PRECIOS DINÁMICOS
# ============================================

print("\n" + "="*70)
print("5️⃣ ENTRENANDO: Ridge Regression - Precios Dinámicos")
print("="*70)

# Preparar datos
df_pricing = df[df['final_price'] > 0].copy()
df_pricing['customer_type_encoded'] = (df_pricing['customer_type'] == 'Empresa').astype(int)

# Features
features_pricing = ['quantity', 'customer_type_encoded', 'recency_days', 'frequency', 'monetary_total']
X_pricing = df_pricing[features_pricing].fillna(0)
y_pricing = df_pricing['final_price']

# Split
X_train_p, X_test_p, y_train_p, y_test_p = train_test_split(X_pricing, y_pricing, test_size=0.2, random_state=42)

print(f"⏳ Entrenando Ridge Regression...")
print(f"   • Training: {len(X_train_p)} pedidos")
print(f"   • Testing: {len(X_test_p)} pedidos")

# Normalizar
scaler_pricing = StandardScaler()
X_train_p_scaled = scaler_pricing.fit_transform(X_train_p)
X_test_p_scaled = scaler_pricing.transform(X_test_p)

# Entrenar
ridge_model = Ridge(alpha=1.0, random_state=42)
ridge_model.fit(X_train_p_scaled, y_train_p)

# Evaluar
y_pred_p = ridge_model.predict(X_test_p_scaled)
mae_p = mean_absolute_error(y_test_p, y_pred_p)
r2_p = r2_score(y_test_p, y_pred_p)

print(f"\n📊 RESULTADOS:")
print(f"   • MAE: ${mae_p:,.0f}")
print(f"   • R²: {r2_p:.3f}")
print(f"   • Error promedio: {(mae_p / y_test_p.mean() * 100):.1f}%")

# Coeficientes
coefficients = pd.DataFrame({
    'feature': features_pricing,
    'coefficient': ridge_model.coef_
}).sort_values('coefficient', ascending=False)
print("\n🔑 COEFICIENTES:")
for _, row in coefficients.iterrows():
    print(f"   • {row['feature']:<25} {row['coefficient']:>10.2f}")

# Guardar
model_path = os.path.join(MODELS_DIR, "ridge_pricing.pkl")
with open(model_path, 'wb') as f:
    pickle.dump({'model': ridge_model, 'scaler': scaler_pricing}, f)
print(f"\n💾 Modelo guardado: {model_path}")

# ============================================
# RESUMEN FINAL
# ============================================

print("\n" + "="*70)
print("✅ TODOS LOS MODELOS ENTRENADOS EXITOSAMENTE")
print("="*70)

print("\n📦 MODELOS GUARDADOS EN:", MODELS_DIR)
models_list = [
    ("KMeans Segmentación", "kmeans_segmentation.pkl"),
    ("XGBoost Churn", "xgboost_churn.pkl"),
    ("Prophet Demanda (Pedidos)", "prophet_demand.pkl"),
    ("Prophet Demanda (Revenue)", "prophet_revenue.pkl"),
    ("Random Forest Rutas", "random_forest_routes.pkl"),
    ("Ridge Precios", "ridge_pricing.pkl")
]

for name, filename in models_list:
    filepath = os.path.join(MODELS_DIR, filename)
    size = os.path.getsize(filepath) / 1024  # KB
    print(f"   ✓ {name:<30} {filename:<25} ({size:.1f} KB)")

print("\n🚀 PRÓXIMOS PASOS:")
print("   1. Crear API REST para servir predicciones")
print("   2. Integrar con n8n para automatización")
print("   3. Crear dashboard de visualización")
print("   4. Configurar re-entrenamiento automático")

print("\n" + "="*70 + "\n")

