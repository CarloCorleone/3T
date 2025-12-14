#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================
ENTRENAMIENTO DE MODELOS CON CLIMA
Sistema ML Agua Tres Torres
============================================
Entrena modelos Prophet con external regressors (temperatura,
humedad, precipitación) para mejorar precisión de forecasts.

Uso:
    python src/train_models_weather.py
    python src/train_models_weather.py --validate  # Con validación cruzada
"""

import os
import sys
import pickle
import pandas as pd
import numpy as np
from datetime import datetime
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

# Agregar path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load_weather_dataset():
    """Cargar dataset consolidado con clima."""
    print("\n📂 Cargando dataset con clima...")
    
    dataset_path = "data/processed/dataset_weather.csv"
    if not os.path.exists(dataset_path):
        print(f"\n❌ Dataset no encontrado: {dataset_path}")
        print("\n💡 Ejecutar primero:")
        print("   1. python src/sync_historical_weather.py --days 365")
        print("   2. python src/consolidate_data_weather.py")
        raise FileNotFoundError(dataset_path)
    
    df = pd.read_csv(dataset_path, parse_dates=['order_date'])
    print(f"  ✓ Dataset cargado: {len(df):,} registros")
    print(f"  Rango: {df['order_date'].min()} → {df['order_date'].max()}")
    
    # Verificar columnas climáticas
    weather_cols = ['temp_max_c', 'temp_min_c', 'humidity', 'precip_mm']
    missing = [col for col in weather_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Faltan columnas climáticas: {missing}")
    
    # Filtrar solo registros con datos climáticos
    df_clean = df[df['temp_max_c'].notna()].copy()
    print(f"  Registros con clima: {len(df_clean):,} ({len(df_clean)/len(df)*100:.1f}%)")
    
    return df_clean


def prepare_prophet_data(df):
    """Preparar datos para Prophet con regressors."""
    print("\n🔧 Preparando datos para Prophet...")
    
    # Agrupar por fecha
    daily = df.groupby('order_date').agg({
        'order_id': 'count',
        'final_price': 'sum',
        'temp_max_c': 'mean',
        'temp_min_c': 'mean',
        'humidity': 'mean',
        'precip_mm': 'sum',
        'is_hot_day': 'max',
        'is_rainy_day': 'max'
    }).reset_index()
    
    daily = daily.rename(columns={
        'order_date': 'ds',
        'order_id': 'orders',
        'final_price': 'revenue'
    })
    
    # Temperatura promedio
    daily['temp_avg_c'] = (daily['temp_max_c'] + daily['temp_min_c']) / 2
    
    # Rellenar NaNs con media
    for col in ['temp_max_c', 'temp_avg_c', 'humidity', 'precip_mm']:
        daily[col] = daily[col].fillna(daily[col].mean())
    
    # Convertir booleanos a int
    daily['is_hot_day'] = daily['is_hot_day'].fillna(False).astype(int)
    daily['is_rainy_day'] = daily['is_rainy_day'].fillna(False).astype(int)
    
    print(f"  ✓ Datos diarios preparados: {len(daily)} días")
    print(f"  Promedio pedidos/día: {daily['orders'].mean():.1f}")
    print(f"  Promedio temp: {daily['temp_avg_c'].mean():.1f}°C")
    
    return daily


def train_prophet_demand(df, validate=False):
    """Entrenar Prophet para demanda con regressors climáticos."""
    print("\n" + "="*70)
    print("🧠 ENTRENANDO PROPHET: DEMANDA con CLIMA")
    print("="*70)
    
    # Preparar datos
    df_prophet = df[['ds', 'orders', 'temp_max_c', 'temp_avg_c', 'humidity', 
                     'precip_mm', 'is_hot_day', 'is_rainy_day']].copy()
    df_prophet['y'] = df_prophet['orders']
    
    # Split train/test si se va a validar
    if validate:
        split_date = df_prophet['ds'].max() - pd.Timedelta(days=30)
        train = df_prophet[df_prophet['ds'] <= split_date]
        test = df_prophet[df_prophet['ds'] > split_date]
        print(f"  Train: {len(train)} días | Test: {len(test)} días")
    else:
        train = df_prophet
        test = None
    
    # Modelo Prophet con regressors
    print("\n  📊 Configurando modelo Prophet...")
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        seasonality_mode='multiplicative',
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10
    )
    
    # Agregar regressors
    model.add_regressor('temp_max_c', standardize=True)
    model.add_regressor('humidity', standardize=True)
    model.add_regressor('is_hot_day', standardize=False)
    model.add_regressor('precip_mm', standardize=True, prior_scale=0.5)
    
    print("  ✓ Regressors agregados:")
    print("     - temp_max_c (estandarizado)")
    print("     - humidity (estandarizado)")
    print("     - is_hot_day (booleano)")
    print("     - precip_mm (estandarizado)")
    
    # Entrenar
    print("\n  🚀 Entrenando modelo...")
    model.fit(train)
    print("  ✓ Entrenamiento completado")
    
    # Validación
    if validate and test is not None:
        print("\n  📈 Validando modelo...")
        forecast = model.predict(test)
        
        mae = mean_absolute_error(test['y'], forecast['yhat'])
        rmse = np.sqrt(mean_squared_error(test['y'], forecast['yhat']))
        r2 = r2_score(test['y'], forecast['yhat'])
        
        print(f"  MAE:  {mae:.2f} pedidos")
        print(f"  RMSE: {rmse:.2f} pedidos")
        print(f"  R²:   {r2:.3f}")
    
    # Guardar modelo
    model_path = "models/prophet_demand_weather.pkl"
    os.makedirs("models", exist_ok=True)
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    print(f"\n  ✓ Modelo guardado: {model_path}")
    
    return model


def train_prophet_revenue(df, validate=False):
    """Entrenar Prophet para revenue con regressors climáticos."""
    print("\n" + "="*70)
    print("🧠 ENTRENANDO PROPHET: REVENUE con CLIMA")
    print("="*70)
    
    # Preparar datos
    df_prophet = df[['ds', 'revenue', 'temp_max_c', 'temp_avg_c', 'humidity', 
                     'precip_mm', 'is_hot_day', 'is_rainy_day']].copy()
    df_prophet['y'] = df_prophet['revenue']
    
    # Split train/test
    if validate:
        split_date = df_prophet['ds'].max() - pd.Timedelta(days=30)
        train = df_prophet[df_prophet['ds'] <= split_date]
        test = df_prophet[df_prophet['ds'] > split_date]
        print(f"  Train: {len(train)} días | Test: {len(test)} días")
    else:
        train = df_prophet
        test = None
    
    # Modelo
    print("\n  📊 Configurando modelo Prophet...")
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        seasonality_mode='multiplicative',
        changepoint_prior_scale=0.05
    )
    
    # Regressors
    model.add_regressor('temp_max_c', standardize=True)
    model.add_regressor('humidity', standardize=True)
    model.add_regressor('is_hot_day', standardize=False)
    model.add_regressor('precip_mm', standardize=True, prior_scale=0.5)
    
    print("  ✓ Regressors agregados")
    
    # Entrenar
    print("\n  🚀 Entrenando modelo...")
    model.fit(train)
    print("  ✓ Entrenamiento completado")
    
    # Validación
    if validate and test is not None:
        print("\n  📈 Validando modelo...")
        forecast = model.predict(test)
        
        mae = mean_absolute_error(test['y'], forecast['yhat'])
        rmse = np.sqrt(mean_squared_error(test['y'], forecast['yhat']))
        r2 = r2_score(test['y'], forecast['yhat'])
        
        print(f"  MAE:  ${mae:,.0f}")
        print(f"  RMSE: ${rmse:,.0f}")
        print(f"  R²:   {r2:.3f}")
    
    # Guardar
    model_path = "models/prophet_revenue_weather.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    print(f"\n  ✓ Modelo guardado: {model_path}")
    
    return model


def compare_with_baseline(df_daily):
    """Comparar modelo con clima vs baseline sin clima."""
    print("\n" + "="*70)
    print("📊 COMPARACIÓN: Modelo con Clima vs Baseline")
    print("="*70)
    
    # Preparar datos
    df_test = df_daily[['ds', 'orders', 'temp_max_c', 'humidity', 
                        'precip_mm', 'is_hot_day']].copy()
    df_test['y'] = df_test['orders']
    
    # Split
    split_date = df_test['ds'].max() - pd.Timedelta(days=30)
    train = df_test[df_test['ds'] <= split_date]
    test = df_test[df_test['ds'] > split_date]
    
    # Modelo BASELINE (sin clima)
    print("\n  🔵 Entrenando modelo baseline (sin clima)...")
    model_baseline = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False
    )
    model_baseline.fit(train[['ds', 'y']])
    forecast_baseline = model_baseline.predict(test[['ds']])
    
    mae_baseline = mean_absolute_error(test['y'], forecast_baseline['yhat'])
    rmse_baseline = np.sqrt(mean_squared_error(test['y'], forecast_baseline['yhat']))
    
    # Modelo CON CLIMA
    print("  🟢 Entrenando modelo con clima...")
    model_weather = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False
    )
    model_weather.add_regressor('temp_max_c')
    model_weather.add_regressor('humidity')
    model_weather.add_regressor('is_hot_day', standardize=False)
    model_weather.add_regressor('precip_mm')
    model_weather.fit(train)
    forecast_weather = model_weather.predict(test)
    
    mae_weather = mean_absolute_error(test['y'], forecast_weather['yhat'])
    rmse_weather = np.sqrt(mean_squared_error(test['y'], forecast_weather['yhat']))
    
    # Resultados
    print("\n  📈 RESULTADOS:")
    print("  " + "-"*60)
    print(f"  Modelo Baseline (sin clima):")
    print(f"    MAE:  {mae_baseline:.2f} pedidos")
    print(f"    RMSE: {rmse_baseline:.2f} pedidos")
    print(f"\n  Modelo con Clima:")
    print(f"    MAE:  {mae_weather:.2f} pedidos")
    print(f"    RMSE: {rmse_weather:.2f} pedidos")
    print(f"\n  Mejora:")
    improvement_mae = (mae_baseline - mae_weather) / mae_baseline * 100
    improvement_rmse = (rmse_baseline - rmse_weather) / rmse_baseline * 100
    print(f"    MAE:  {improvement_mae:+.1f}%")
    print(f"    RMSE: {improvement_rmse:+.1f}%")
    
    if improvement_mae > 0:
        print(f"\n  ✅ Modelo con clima es {improvement_mae:.1f}% más preciso")
    else:
        print(f"\n  ⚠️ Modelo con clima no mejoró precisión ({improvement_mae:.1f}%)")
    
    print("  " + "="*60)


def plot_forecast_comparison(df_daily, model):
    """Graficar forecast vs real."""
    print("\n📊 Generando gráfico de comparación...")
    
    # Hacer forecast
    future = model.make_future_dataframe(periods=30)
    
    # Agregar regressors al future (usar promedios históricos)
    for col in ['temp_max_c', 'humidity', 'precip_mm', 'is_hot_day']:
        if col in df_daily.columns:
            future[col] = df_daily[col].mean()
    
    forecast = model.predict(future)
    
    # Plot
    fig, ax = plt.subplots(figsize=(16, 8))
    
    # Real
    ax.plot(df_daily['ds'], df_daily['orders'], 'o', markersize=4, 
            label='Real', color='black', alpha=0.6)
    
    # Forecast
    ax.plot(forecast['ds'], forecast['yhat'], color='#2563eb', 
            linewidth=2, label='Predicción')
    
    # Intervalos de confianza
    ax.fill_between(forecast['ds'], forecast['yhat_lower'], forecast['yhat_upper'],
                     color='#2563eb', alpha=0.2, label='Intervalo 95%')
    
    ax.set_xlabel('Fecha', fontsize=12)
    ax.set_ylabel('Cantidad de Pedidos', fontsize=12)
    ax.set_title('Predicción de Demanda con Clima (Prophet)', 
                 fontsize=14, fontweight='bold', pad=20)
    ax.legend(loc='best')
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    filename = f"reports/prophet_weather_forecast_{datetime.now().strftime('%Y%m%d')}.png"
    os.makedirs("reports", exist_ok=True)
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    print(f"  ✓ Guardado: {filename}")
    plt.close()


def main():
    """Main entry point."""
    print("\n" + "="*70)
    print(" "*10 + "🧠 ENTRENAMIENTO DE MODELOS CON CLIMA")
    print(" "*10 + "Sistema ML Agua Tres Torres")
    print("="*70)
    
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--validate', action='store_true', help='Hacer validación cruzada')
    parser.add_argument('--compare', action='store_true', help='Comparar con baseline')
    args = parser.parse_args()
    
    try:
        # 1. Cargar datos
        df = load_weather_dataset()
        
        # 2. Preparar datos
        df_daily = prepare_prophet_data(df)
        
        # 3. Entrenar modelo de demanda
        model_demand = train_prophet_demand(df_daily, validate=args.validate)
        
        # 4. Entrenar modelo de revenue
        model_revenue = train_prophet_revenue(df_daily, validate=args.validate)
        
        # 5. Comparación con baseline (opcional)
        if args.compare:
            compare_with_baseline(df_daily)
        
        # 6. Gráfico
        plot_forecast_comparison(df_daily, model_demand)
        
        print("\n" + "="*70)
        print("✅ ENTRENAMIENTO COMPLETADO")
        print("="*70)
        print("\n📁 Modelos guardados:")
        print("   - models/prophet_demand_weather.pkl")
        print("   - models/prophet_revenue_weather.pkl")
        print("\n💡 Para usar en API, actualizar main.py para cargar estos modelos")
        print("\n🔄 Para re-entrenar periódicamente:")
        print("   crontab: 0 2 1 * * cd /opt/cane/3t/ml && python src/train_models_weather.py")
        print("="*70 + "\n")
        
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

