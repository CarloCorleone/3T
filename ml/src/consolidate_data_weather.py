#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================
CONSOLIDACIÓN DE DATOS: PEDIDOS + CLIMA
Sistema ML Agua Tres Torres
============================================
Merge de dataset_completo.csv con datos climáticos de Supabase
para crear dataset_weather.csv enriquecido con features climáticos.

Uso:
    python src/consolidate_data_weather.py
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from tqdm import tqdm

# Agregar path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv("SUPABASE_URL", "http://supabase-kong:8000")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
except ImportError:
    print("⚠️ Módulo supabase no instalado. Instalando...")
    os.system("pip install supabase")
    from supabase import create_client, Client


def load_orders_data():
    """Cargar dataset de pedidos."""
    print("\n📂 Cargando dataset de pedidos...")
    
    dataset_path = "data/processed/dataset_completo.csv"
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset no encontrado: {dataset_path}")
    
    df = pd.read_csv(dataset_path, parse_dates=['order_date'])
    print(f"  ✓ Pedidos cargados: {len(df):,} registros")
    print(f"  Rango de fechas: {df['order_date'].min()} → {df['order_date'].max()}")
    print(f"  Comunas únicas: {df['delivery_commune'].nunique()}")
    
    return df


def load_weather_data():
    """Cargar datos climáticos desde Supabase."""
    print("\n🌤️  Cargando datos climáticos desde Supabase...")
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Obtener todos los datos climáticos
        response = supabase.table("3t_weather_data")\
            .select("*")\
            .order("date", desc=False)\
            .execute()
        
        if not response.data:
            print("  ⚠️ No hay datos climáticos en Supabase.")
            print("  💡 Ejecutar primero: python src/sync_historical_weather.py --days 365")
            return None
        
        df_weather = pd.DataFrame(response.data)
        df_weather['date'] = pd.to_datetime(df_weather['date'])
        
        print(f"  ✓ Datos climáticos cargados: {len(df_weather):,} registros")
        print(f"  Rango de fechas: {df_weather['date'].min()} → {df_weather['date'].max()}")
        print(f"  Comunas únicas: {df_weather['commune'].nunique()}")
        
        return df_weather
        
    except Exception as e:
        print(f"  ❌ Error conectando a Supabase: {e}")
        print("  💡 Verifica las variables SUPABASE_URL y SUPABASE_SERVICE_KEY")
        return None


def create_derived_features(df):
    """Crear features derivados de clima."""
    print("\n🔧 Creando features derivados...")
    
    df = df.copy()
    
    # 1. Temperatura promedio
    df['temp_avg_c'] = (df['temp_max_c'] + df['temp_min_c']) / 2
    
    # 2. Amplitud térmica
    df['temp_range_c'] = df['temp_max_c'] - df['temp_min_c']
    
    # 3. Categorías de temperatura
    df['temp_category'] = pd.cut(
        df['temp_max_c'],
        bins=[-np.inf, 15, 20, 25, 30, np.inf],
        labels=['Frío', 'Fresco', 'Templado', 'Cálido', 'Caluroso']
    )
    
    # 4. Categorías de precipitación
    df['precip_category'] = pd.cut(
        df['precip_mm'],
        bins=[-0.1, 0, 1, 5, 10, np.inf],
        labels=['Sin lluvia', 'Llovizna', 'Lluvia ligera', 'Lluvia moderada', 'Lluvia fuerte']
    )
    
    # 5. Categorías de humedad
    df['humidity_category'] = pd.cut(
        df['humidity'],
        bins=[0, 30, 50, 70, 100],
        labels=['Baja', 'Media', 'Alta', 'Muy alta']
    )
    
    # 6. Día de la semana
    df['day_of_week'] = df['order_date'].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].isin([5, 6])
    df['day_name'] = df['order_date'].dt.day_name()
    
    # 7. Mes y estación
    df['month'] = df['order_date'].dt.month
    df['season'] = pd.cut(
        df['month'],
        bins=[0, 3, 6, 9, 12],
        labels=['Verano', 'Otoño', 'Invierno', 'Primavera']
    )
    
    print(f"  ✓ {8} features derivados creados")
    
    return df


def create_rolling_features(df, weather_df):
    """Crear features de ventana temporal (rolling)."""
    print("\n📊 Creando features de ventana temporal...")
    
    # Ordenar por comuna y fecha
    weather_df = weather_df.sort_values(['commune', 'date'])
    
    # Features de ventana por comuna
    rolling_features = []
    
    for commune in tqdm(weather_df['commune'].unique(), desc="Comunas"):
        df_commune = weather_df[weather_df['commune'] == commune].copy()
        
        # Rolling windows de 3, 7 y 14 días
        for window in [3, 7, 14]:
            df_commune[f'temp_max_{window}d_avg'] = df_commune['temp_max_c'].rolling(window=window, min_periods=1).mean()
            df_commune[f'humidity_{window}d_avg'] = df_commune['humidity'].rolling(window=window, min_periods=1).mean()
            df_commune[f'precip_{window}d_sum'] = df_commune['precip_mm'].rolling(window=window, min_periods=1).sum()
        
        # Diferencia con día anterior
        df_commune['temp_diff'] = df_commune['temp_max_c'].diff()
        
        rolling_features.append(df_commune)
    
    df_rolling = pd.concat(rolling_features, ignore_index=True)
    
    print(f"  ✓ Features rolling creados para {len(weather_df['commune'].unique())} comunas")
    
    return df_rolling


def merge_orders_weather(df_orders, df_weather):
    """Merge de pedidos con clima."""
    print("\n🔗 Haciendo merge de pedidos con clima...")
    
    # Preparar columnas para merge
    df_orders['order_date_only'] = df_orders['order_date'].dt.date
    df_weather['date_only'] = df_weather['date'].dt.date
    
    # Merge por fecha y comuna
    df_merged = df_orders.merge(
        df_weather,
        left_on=['order_date_only', 'delivery_commune'],
        right_on=['date_only', 'commune'],
        how='left',
        suffixes=('', '_weather')
    )
    
    # Limpiar columnas duplicadas
    df_merged = df_merged.drop(columns=['date_only', 'order_date_only'], errors='ignore')
    
    # Estadísticas de merge
    total = len(df_merged)
    with_weather = df_merged['temp_max_c'].notna().sum()
    without_weather = total - with_weather
    
    print(f"  ✓ Merge completado")
    print(f"    Total registros: {total:,}")
    print(f"    Con datos clima: {with_weather:,} ({with_weather/total*100:.1f}%)")
    print(f"    Sin datos clima: {without_weather:,} ({without_weather/total*100:.1f}%)")
    
    if without_weather > 0:
        print(f"\n  ⚠️ Hay {without_weather:,} pedidos sin datos climáticos")
        print("     Esto puede ocurrir si:")
        print("       - La comuna no está en la lista válida")
        print("       - Faltan datos históricos para esas fechas")
    
    return df_merged


def save_consolidated_dataset(df, output_path="data/processed/dataset_weather.csv"):
    """Guardar dataset consolidado."""
    print(f"\n💾 Guardando dataset consolidado...")
    
    # Crear directorio si no existe
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Guardar
    df.to_csv(output_path, index=False)
    
    print(f"  ✓ Guardado: {output_path}")
    print(f"  Tamaño: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB")
    print(f"  Registros: {len(df):,}")
    print(f"  Columnas: {len(df.columns)}")
    
    # Mostrar primeras columnas
    print(f"\n  📋 Columnas ({len(df.columns)} total):")
    for i, col in enumerate(df.columns[:20], 1):
        print(f"     {i:2d}. {col}")
    if len(df.columns) > 20:
        print(f"     ... y {len(df.columns) - 20} más")
    
    return output_path


def generate_summary_stats(df):
    """Generar estadísticas resumen."""
    print("\n📊 Estadísticas del Dataset Consolidado:")
    print("="*70)
    
    # Estadísticas generales
    print(f"\n  Total registros: {len(df):,}")
    print(f"  Rango de fechas: {df['order_date'].min()} → {df['order_date'].max()}")
    print(f"  Comunas: {df['delivery_commune'].nunique()}")
    print(f"  Clientes únicos: {df['customer_id'].nunique()}")
    
    # Estadísticas climáticas
    if 'temp_max_c' in df.columns and df['temp_max_c'].notna().any():
        print(f"\n  📈 Clima:")
        print(f"     Temp máx promedio: {df['temp_max_c'].mean():.1f}°C")
        print(f"     Temp mín promedio: {df['temp_min_c'].mean():.1f}°C")
        print(f"     Humedad promedio: {df['humidity'].mean():.1f}%")
        print(f"     Precipitación total: {df['precip_mm'].sum():.1f}mm")
        print(f"     Días calurosos (>28°C): {df['is_hot_day'].sum()}")
        print(f"     Días lluviosos (>5mm): {df['is_rainy_day'].sum()}")
    
    # Estadísticas de ventas
    print(f"\n  💰 Ventas:")
    print(f"     Revenue total: ${df['final_price'].sum():,.0f}")
    print(f"     Ticket promedio: ${df['final_price'].mean():,.0f}")
    print(f"     Pedidos/día promedio: {len(df) / df['order_date'].nunique():.1f}")
    
    print("\n" + "="*70)


def main():
    """Main entry point."""
    print("\n" + "="*70)
    print(" "*10 + "🔄 CONSOLIDACIÓN DE DATOS: PEDIDOS + CLIMA")
    print(" "*10 + "Sistema ML Agua Tres Torres")
    print("="*70)
    
    try:
        # 1. Cargar pedidos
        df_orders = load_orders_data()
        
        # 2. Cargar clima
        df_weather = load_weather_data()
        
        if df_weather is None:
            print("\n❌ No se pueden consolidar datos sin información climática")
            print("💡 Ejecutar primero: python src/sync_historical_weather.py --days 365")
            sys.exit(1)
        
        # 3. Crear features rolling
        df_weather_enriched = create_rolling_features(df_orders, df_weather)
        
        # 4. Merge
        df_merged = merge_orders_weather(df_orders, df_weather_enriched)
        
        # 5. Crear features derivados
        df_final = create_derived_features(df_merged)
        
        # 6. Guardar
        output_path = save_consolidated_dataset(df_final)
        
        # 7. Estadísticas
        generate_summary_stats(df_final)
        
        print("\n" + "="*70)
        print("✅ CONSOLIDACIÓN COMPLETADA")
        print("="*70)
        print(f"\n📁 Dataset consolidado: {output_path}")
        print(f"\n💡 Próximo paso:")
        print(f"   python src/analysis_weather_correlation.py")
        print(f"   python src/train_models_weather.py")
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

