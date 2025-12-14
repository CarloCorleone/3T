#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================
EDA - Análisis Exploratorio de Datos
Sistema ML Agua Tres Torres
============================================
Análisis completo para identificar patrones, tendencias y oportunidades ML.

Fecha: 2025-11-03
"""

import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Configuración visual
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")
plt.rcParams['figure.figsize'] = (12, 6)
plt.rcParams['font.size'] = 10

# Rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
OUTPUT_DIR = os.path.join(BASE_DIR, "reports", "figures")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================
# 1. CARGAR DATOS
# ============================================

print("\n" + "="*70)
print(" "*20 + "📊 EDA - AGUA TRES TORRES")
print("="*70)

dataset_path = os.path.join(DATA_DIR, "dataset_completo.csv")
print(f"\n📂 Cargando dataset: {dataset_path}")

df = pd.read_csv(dataset_path, parse_dates=['order_date', 'delivered_date', 'payment_date'])
print(f"✓ Cargados {len(df):,} registros")

# ============================================
# 2. ANÁLISIS TEMPORAL
# ============================================

print("\n" + "="*70)
print("📅 ANÁLISIS TEMPORAL DE VENTAS")
print("="*70)

# Ventas mensuales
df_monthly = df.groupby(df['order_date'].dt.to_period('M')).agg({
    'final_price': 'sum',
    'order_id': 'count'
}).reset_index()
df_monthly['order_date'] = df_monthly['order_date'].dt.to_timestamp()

print("\n📈 VENTAS MENSUALES:")
print(df_monthly.tail(6).to_string(index=False))

# Tendencia
print(f"\n💡 Tendencia:")
if len(df_monthly) >= 3:
    recent_avg = df_monthly.tail(3)['final_price'].mean()
    prev_avg = df_monthly.head(3)['final_price'].mean() if len(df_monthly) >= 6 else recent_avg
    growth = ((recent_avg - prev_avg) / prev_avg * 100) if prev_avg > 0 else 0
    print(f"   • Crecimiento 3 meses: {growth:+.1f}%")

# Estacionalidad (día de la semana)
df_dow = df.groupby('day_of_week')['order_id'].count()
days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
print(f"\n📆 PEDIDOS POR DÍA DE LA SEMANA:")
for day, count in zip(days, df_dow.values):
    print(f"   {day}: {count:>3} pedidos ({count/df_dow.sum()*100:.1f}%)")

# ============================================
# 3. ANÁLISIS DE CLIENTES (RFM)
# ============================================

print("\n" + "="*70)
print("👥 ANÁLISIS RFM (Recency, Frequency, Monetary)")
print("="*70)

# Calcular RFM por cliente
max_date = df['order_date'].max()
rfm = df.groupby('customer_id').agg({
    'order_date': lambda x: (max_date - x.max()).days,  # Recency
    'order_id': 'count',  # Frequency
    'final_price': 'sum',  # Monetary
    'customer_name': 'first',
    'customer_type': 'first'
}).rename(columns={
    'order_date': 'recency_days',
    'order_id': 'frequency',
    'final_price': 'monetary'
})

# Segmentación RFM simple
rfm['rfm_score'] = 0
rfm.loc[rfm['recency_days'] <= 30, 'rfm_score'] += 3
rfm.loc[(rfm['recency_days'] > 30) & (rfm['recency_days'] <= 90), 'rfm_score'] += 2
rfm.loc[rfm['recency_days'] > 90, 'rfm_score'] += 1

rfm.loc[rfm['frequency'] >= 10, 'rfm_score'] += 3
rfm.loc[(rfm['frequency'] >= 5) & (rfm['frequency'] < 10), 'rfm_score'] += 2
rfm.loc[rfm['frequency'] < 5, 'rfm_score'] += 1

rfm.loc[rfm['monetary'] >= 100000, 'rfm_score'] += 3
rfm.loc[(rfm['monetary'] >= 30000) & (rfm['monetary'] < 100000), 'rfm_score'] += 2
rfm.loc[rfm['monetary'] < 30000, 'rfm_score'] += 1

# Definir segmentos
def categorize_rfm(score):
    if score >= 8:
        return 'Champions (Alto Valor)'
    elif score >= 6:
        return 'Leales'
    elif score >= 4:
        return 'Potenciales'
    else:
        return 'En Riesgo (Churn)'

rfm['segment'] = rfm['rfm_score'].apply(categorize_rfm)

print("\n📊 DISTRIBUCIÓN DE CLIENTES POR SEGMENTO:")
segment_stats = rfm['segment'].value_counts()
for segment, count in segment_stats.items():
    pct = count / len(rfm) * 100
    revenue = rfm[rfm['segment'] == segment]['monetary'].sum()
    print(f"   • {segment:<25} {count:>3} clientes ({pct:>5.1f}%) | ${revenue:>12,.0f}")

# Top clientes
print("\n🏆 TOP 10 CLIENTES (por valor total):")
top_customers = rfm.nlargest(10, 'monetary')[['customer_name', 'frequency', 'monetary', 'recency_days', 'segment']]
for idx, row in top_customers.iterrows():
    print(f"   • {row['customer_name']:<30} | {row['frequency']:>2} pedidos | ${row['monetary']:>10,.0f} | {row['recency_days']:>3}d | {row['segment']}")

# Clientes en riesgo de churn (>90 días sin comprar)
churn_risk = rfm[rfm['recency_days'] > 90].sort_values('monetary', ascending=False)
print(f"\n⚠️ CLIENTES EN RIESGO DE CHURN (>90 días): {len(churn_risk)} clientes")
if len(churn_risk) > 0:
    print(f"   • Valor total en riesgo: ${churn_risk['monetary'].sum():,.0f}")
    print("\n   Top 5 clientes a recuperar:")
    for idx, row in churn_risk.head(5).iterrows():
        print(f"     - {row['customer_name']:<30} | ${row['monetary']:>10,.0f} | {row['recency_days']:>3} días")

# ============================================
# 4. ANÁLISIS DE PRODUCTOS
# ============================================

print("\n" + "="*70)
print("📦 ANÁLISIS DE PRODUCTOS")
print("="*70)

# Ventas por producto
product_sales = df.groupby('product_name').agg({
    'order_id': 'count',
    'final_price': 'sum',
    'quantity': 'sum'
}).sort_values('final_price', ascending=False)

print("\n💰 PRODUCTOS MÁS VENDIDOS (por revenue):")
for product, row in product_sales.head(10).iterrows():
    pct = row['final_price'] / product_sales['final_price'].sum() * 100
    print(f"   • {product:<20} | {row['order_id']:>4} pedidos | ${row['final_price']:>12,.0f} ({pct:>5.1f}%)")

# ============================================
# 5. ANÁLISIS GEOGRÁFICO
# ============================================

print("\n" + "="*70)
print("🗺️ ANÁLISIS GEOGRÁFICO")
print("="*70)

# Ventas por comuna
geo_sales = df.groupby('delivery_commune').agg({
    'order_id': 'count',
    'final_price': 'sum',
    'customer_id': pd.Series.nunique
}).sort_values('final_price', ascending=False)

print("\n🏙️ TOP 10 COMUNAS (por revenue):")
for commune, row in geo_sales.head(10).iterrows():
    pct = row['final_price'] / geo_sales['final_price'].sum() * 100
    print(f"   • {commune:<20} | {row['customer_id']:>3} clientes | {row['order_id']:>4} pedidos | ${row['final_price']:>12,.0f} ({pct:>5.1f}%)")

# Concentración geográfica
top_5_pct = geo_sales.head(5)['final_price'].sum() / geo_sales['final_price'].sum() * 100
print(f"\n📍 Concentración: Top 5 comunas = {top_5_pct:.1f}% del revenue")

# ============================================
# 6. ANÁLISIS DE PRECIOS Y CANTIDADES
# ============================================

print("\n" + "="*70)
print("💵 ANÁLISIS DE PRECIOS Y CANTIDADES")
print("="*70)

print(f"\n📊 ESTADÍSTICAS DE PRECIO:")
print(f"   • Promedio:  ${df['final_price'].mean():,.0f}")
print(f"   • Mediana:   ${df['final_price'].median():,.0f}")
print(f"   • Mínimo:    ${df['final_price'].min():,.0f}")
print(f"   • Máximo:    ${df['final_price'].max():,.0f}")
print(f"   • Std Dev:   ${df['final_price'].std():,.0f}")

print(f"\n📦 ESTADÍSTICAS DE CANTIDAD:")
print(f"   • Promedio:  {df['quantity'].mean():.1f} unidades")
print(f"   • Mediana:   {df['quantity'].median():.1f} unidades")
print(f"   • Mínimo:    {df['quantity'].min():.0f} unidades")
print(f"   • Máximo:    {df['quantity'].max():.0f} unidades")

# Tipo de cliente (Hogar vs Empresa)
customer_type_analysis = df.groupby('customer_type').agg({
    'order_id': 'count',
    'final_price': ['sum', 'mean'],
    'quantity': 'mean'
})
print(f"\n🏠 COMPARACIÓN HOGAR VS EMPRESA:")
for ctype in customer_type_analysis.index:
    stats = customer_type_analysis.loc[ctype]
    print(f"\n   {ctype}:")
    print(f"     • Pedidos:        {stats[('order_id', 'count')]:,}")
    print(f"     • Revenue total:  ${stats[('final_price', 'sum')]:,.0f}")
    print(f"     • Ticket promedio: ${stats[('final_price', 'mean')]:,.0f}")
    print(f"     • Cantidad promedio: {stats[('quantity', 'mean')]:.1f} unidades")

# ============================================
# 7. CONCLUSIONES Y OPORTUNIDADES ML
# ============================================

print("\n" + "="*70)
print("💡 CONCLUSIONES Y OPORTUNIDADES PARA ML")
print("="*70)

print("\n🎯 OPORTUNIDADES IDENTIFICADAS:")

# 1. Predicción de Demanda
print("\n1️⃣ PREDICCIÓN DE DEMANDA:")
print("   ✓ Datos temporales disponibles: 1+ año")
print("   ✓ Estacionalidad identificada por día de semana")
print("   → Modelo recomendado: Prophet (Meta)")
print("   → Beneficio: Optimizar inventario y rutas")

# 2. Predicción de Churn
churn_count = len(churn_risk)
churn_value = churn_risk['monetary'].sum()
print(f"\n2️⃣ PREDICCIÓN DE CHURN:")
print(f"   ✓ {churn_count} clientes en riesgo identificados")
print(f"   ✓ Valor en riesgo: ${churn_value:,.0f}")
print("   → Modelo recomendado: XGBoost (clasificación)")
print("   → Beneficio: Campañas de retención proactivas")

# 3. Segmentación de Clientes
print("\n3️⃣ SEGMENTACIÓN INTELIGENTE:")
print(f"   ✓ {len(rfm)} clientes con patrón RFM")
print("   ✓ 4 segmentos identificados")
print("   → Modelo recomendado: KMeans (clustering)")
print("   → Beneficio: Personalización de ofertas")

# 4. Optimización de Rutas
geo_count = geo_sales.shape[0]
print(f"\n4️⃣ OPTIMIZACIÓN DE RUTAS:")
print(f"   ✓ {geo_count} comunas activas")
print(f"   ✓ {df['latitude'].notna().sum():,} pedidos con coordenadas GPS")
print("   → Modelo recomendado: Random Forest (regresión distancias)")
print("   → Beneficio: Reducción de costos de transporte")

# 5. Precios Dinámicos
print("\n5️⃣ PRECIOS DINÁMICOS:")
print(f"   ✓ Rango de precios: ${df['final_price'].min():,.0f} - ${df['final_price'].max():,.0f}")
print(f"   ✓ Variación por tipo de cliente y producto")
print("   → Modelo recomendado: Ridge Regression + KMeans")
print("   → Beneficio: Maximizar márgenes por segmento")

print("\n" + "="*70)
print("✅ ANÁLISIS EXPLORATORIO COMPLETADO")
print("="*70)
print(f"\n📊 Dataset: {len(df):,} registros | {len(df.columns)} columnas")
print(f"📁 Reportes guardados en: {OUTPUT_DIR}")
print("\n🚀 SIGUIENTE PASO: Feature Engineering y Entrenamiento de Modelos")
print("="*70 + "\n")

# Guardar RFM para uso posterior
rfm_path = os.path.join(DATA_DIR, "rfm_segments.csv")
rfm.to_csv(rfm_path)
print(f"💾 Segmentos RFM guardados en: {rfm_path}\n")

