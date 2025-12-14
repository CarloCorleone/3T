#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================
Consolidación de Datos - Sistema ML 3T
============================================
Script para combinar los CSVs exportados de Supabase en un dataset unificado.

Autor: Sistema ML Agua Tres Torres
Fecha: 2025-11-03
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")

# Crear directorios si no existen
os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

def load_csv_files():
    """Cargar todos los CSVs exportados de Supabase."""
    print("\n" + "="*60)
    print("📊 CARGANDO DATOS DESDE CSVs")
    print("="*60)
    
    # Buscar CSVs en el directorio ml/
    csv_files = {
        'orders': '3t_orders_rows.csv',
        'customers': '3t_customers_rows.csv',
        'addresses': '3t_addresses_rows.csv',
        'products': '3t_products_rows.csv'
    }
    
    data = {}
    for name, filename in csv_files.items():
        filepath = os.path.join(BASE_DIR, filename)
        if os.path.exists(filepath):
            print(f"\n✓ Cargando {name}: {filename}")
            df = pd.read_csv(filepath, low_memory=False)
            print(f"  → {len(df):,} registros | {len(df.columns)} columnas")
            data[name] = df
        else:
            print(f"\n✗ ERROR: No se encontró {filename}")
            sys.exit(1)
    
    return data

def clean_data(data):
    """Limpiar y preparar los datos."""
    print("\n" + "="*60)
    print("🧹 LIMPIEZA DE DATOS")
    print("="*60)
    
    # ORDERS: Convertir fechas y limpiar
    orders = data['orders'].copy()
    date_columns = ['order_date', 'delivered_date', 'payment_date', 'invoice_date', 'delivery_datetime']
    for col in date_columns:
        if col in orders.columns:
            orders[col] = pd.to_datetime(orders[col], errors='coerce')
    
    # Convertir precios a numérico
    if 'final_price' in orders.columns:
        orders['final_price'] = pd.to_numeric(orders['final_price'], errors='coerce')
    
    print(f"\n✓ Orders limpiados: {len(orders):,} pedidos")
    print(f"  → Rango fechas: {orders['order_date'].min()} a {orders['order_date'].max()}")
    print(f"  → Total ventas: ${orders['final_price'].sum():,.0f}")
    
    # CUSTOMERS: Limpiar
    customers = data['customers'].copy()
    print(f"\n✓ Customers limpiados: {len(customers):,} clientes")
    print(f"  → Hogares: {(customers['customer_type'] == 'Hogar').sum():,}")
    print(f"  → Empresas: {(customers['customer_type'] == 'Empresa').sum():,}")
    
    # ADDRESSES: Limpiar coordenadas
    addresses = data['addresses'].copy()
    addresses['latitude'] = pd.to_numeric(addresses['latitude'], errors='coerce')
    addresses['longitude'] = pd.to_numeric(addresses['longitude'], errors='coerce')
    print(f"\n✓ Addresses limpiados: {len(addresses):,} direcciones")
    print(f"  → Con coordenadas: {addresses['latitude'].notna().sum():,}")
    
    # PRODUCTS: Limpiar
    products = data['products'].copy()
    print(f"\n✓ Products limpiados: {len(products):,} productos")
    
    return {
        'orders': orders,
        'customers': customers,
        'addresses': addresses,
        'products': products
    }

def merge_data(data):
    """Combinar todas las tablas en un dataset consolidado."""
    print("\n" + "="*60)
    print("🔗 COMBINANDO DATOS")
    print("="*60)
    
    orders = data['orders']
    customers = data['customers']
    addresses = data['addresses']
    products = data['products']
    
    # Paso 1: Orders + Customers
    df = orders.merge(
        customers[['customer_id', 'name', 'customer_type', 'commune', 'business_name', 'email', 'phone']],
        on='customer_id',
        how='left',
        suffixes=('', '_customer')
    )
    print(f"\n1️⃣ Orders + Customers: {len(df):,} registros")
    
    # Paso 2: + Addresses (delivery)
    df = df.merge(
        addresses[['address_id', 'commune', 'region', 'latitude', 'longitude']],
        left_on='delivery_address_id',
        right_on='address_id',
        how='left',
        suffixes=('', '_delivery')
    )
    print(f"2️⃣ + Addresses: {len(df):,} registros")
    
    # Paso 3: + Products
    df = df.merge(
        products[['product_id', 'name', 'category']],
        left_on='product_type',
        right_on='product_id',
        how='left',
        suffixes=('', '_product')
    )
    print(f"3️⃣ + Products: {len(df):,} registros")
    
    # Renombrar columnas para claridad
    df = df.rename(columns={
        'name': 'customer_name',
        'commune': 'customer_commune',
        'commune_delivery': 'delivery_commune',
        'name_product': 'product_name'
    })
    
    return df

def create_features(df):
    """Crear features adicionales para ML."""
    print("\n" + "="*60)
    print("⚙️ CREANDO FEATURES")
    print("="*60)
    
    # Features temporales
    if 'order_date' in df.columns:
        df['year'] = df['order_date'].dt.year
        df['month'] = df['order_date'].dt.month
        df['day_of_week'] = df['order_date'].dt.dayofweek
        df['week_of_year'] = df['order_date'].dt.isocalendar().week
        print("\n✓ Features temporales creados")
    
    # Días desde primer pedido (para análisis de churn)
    if 'order_date' in df.columns:
        df['days_since_first_order'] = (df['order_date'] - df['order_date'].min()).dt.days
        print("✓ Days since first order calculado")
    
    # Recency, Frequency, Monetary (RFM) por cliente
    if 'customer_id' in df.columns and 'order_date' in df.columns:
        max_date = df['order_date'].max()
        rfm = df.groupby('customer_id').agg({
            'order_date': lambda x: (max_date - x.max()).days,  # Recency
            'order_id': 'count',  # Frequency
            'final_price': 'sum'  # Monetary
        }).rename(columns={
            'order_date': 'recency_days',
            'order_id': 'frequency',
            'final_price': 'monetary_total'
        })
        
        df = df.merge(rfm, on='customer_id', how='left', suffixes=('', '_rfm'))
        print("✓ RFM features agregados")
    
    return df

def save_dataset(df):
    """Guardar el dataset consolidado."""
    print("\n" + "="*60)
    print("💾 GUARDANDO DATASET CONSOLIDADO")
    print("="*60)
    
    # Guardar en processed/
    output_path = os.path.join(PROCESSED_DIR, 'dataset_completo.csv')
    df.to_csv(output_path, index=False)
    print(f"\n✓ Guardado en: {output_path}")
    print(f"  → {len(df):,} registros")
    print(f"  → {len(df.columns)} columnas")
    print(f"  → Tamaño: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB")
    
    # Guardar versión Parquet (más eficiente)
    parquet_path = os.path.join(PROCESSED_DIR, 'dataset_completo.parquet')
    df.to_parquet(parquet_path, index=False, compression='snappy')
    print(f"\n✓ Guardado también en Parquet: {parquet_path}")
    print(f"  → Tamaño: {os.path.getsize(parquet_path) / 1024 / 1024:.2f} MB")
    
    return output_path

def print_summary(df):
    """Imprimir resumen del dataset."""
    print("\n" + "="*60)
    print("📈 RESUMEN DEL DATASET")
    print("="*60)
    
    print(f"\n🔢 DIMENSIONES:")
    print(f"   • Registros: {len(df):,}")
    print(f"   • Columnas: {len(df.columns)}")
    
    print(f"\n📅 RANGO TEMPORAL:")
    if 'order_date' in df.columns:
        print(f"   • Desde: {df['order_date'].min()}")
        print(f"   • Hasta: {df['order_date'].max()}")
        print(f"   • Duración: {(df['order_date'].max() - df['order_date'].min()).days} días")
    
    print(f"\n👥 CLIENTES:")
    if 'customer_id' in df.columns:
        print(f"   • Únicos: {df['customer_id'].nunique():,}")
        print(f"   • Hogares: {(df['customer_type'] == 'Hogar').sum():,}")
        print(f"   • Empresas: {(df['customer_type'] == 'Empresa').sum():,}")
    
    print(f"\n💰 VENTAS:")
    if 'final_price' in df.columns:
        print(f"   • Total: ${df['final_price'].sum():,.0f}")
        print(f"   • Promedio: ${df['final_price'].mean():,.0f}")
        print(f"   • Mediana: ${df['final_price'].median():,.0f}")
    
    print(f"\n📦 PRODUCTOS:")
    if 'product_name' in df.columns:
        print(f"   • Tipos únicos: {df['product_name'].nunique()}")
        print("\n   Top 5 productos:")
        top_products = df['product_name'].value_counts().head(5)
        for product, count in top_products.items():
            print(f"     - {product}: {count:,} pedidos")
    
    print(f"\n🗺️ GEOGRAFÍA:")
    if 'delivery_commune' in df.columns:
        print(f"   • Comunas únicas: {df['delivery_commune'].nunique()}")
        print("\n   Top 5 comunas:")
        top_communes = df['delivery_commune'].value_counts().head(5)
        for commune, count in top_communes.items():
            print(f"     - {commune}: {count:,} pedidos")
    
    print("\n" + "="*60)

def main():
    """Función principal."""
    print("\n")
    print("╔" + "="*58 + "╗")
    print("║" + " "*18 + "CONSOLIDACIÓN DE DATOS" + " "*18 + "║")
    print("║" + " "*15 + "Sistema ML Agua Tres Torres" + " "*15 + "║")
    print("╚" + "="*58 + "╝")
    
    try:
        # 1. Cargar CSVs
        data = load_csv_files()
        
        # 2. Limpiar datos
        data_clean = clean_data(data)
        
        # 3. Combinar tablas
        df_merged = merge_data(data_clean)
        
        # 4. Crear features
        df_final = create_features(df_merged)
        
        # 5. Guardar
        output_path = save_dataset(df_final)
        
        # 6. Resumen
        print_summary(df_final)
        
        print("\n✅ PROCESO COMPLETADO EXITOSAMENTE")
        print(f"📁 Dataset disponible en: {output_path}")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

