#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================
ANÁLISIS DE CORRELACIÓN CLIMA VS VENTAS
Sistema ML Agua Tres Torres
============================================
Análisis exploratorio de la relación entre variables climáticas
(temperatura, humedad, precipitación) y demanda de agua.

Uso:
    python src/analysis_weather_correlation.py
"""

import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# Agregar path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configurar estilo de gráficos
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (14, 8)
plt.rcParams['font.size'] = 10

def load_data():
    """Cargar datos de pedidos y clima."""
    print("📂 Cargando datos...")
    
    # Cargar dataset de pedidos
    dataset_path = "data/processed/dataset_completo.csv"
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset no encontrado: {dataset_path}")
    
    df_orders = pd.read_csv(dataset_path, parse_dates=['order_date'])
    print(f"  ✓ Pedidos cargados: {len(df_orders):,} registros")
    
    # TODO: Cargar datos de clima desde Supabase
    # Por ahora, mensaje de instrucción
    print("\n⚠️ NOTA: Este script requiere datos climáticos sincronizados.")
    print("   Ejecutar primero: python src/sync_historical_weather.py --days 365")
    print("   Luego ejecutar: python src/consolidate_data_weather.py")
    print("   Archivo esperado: data/processed/dataset_weather.csv\n")
    
    # Verificar si existe dataset consolidado con clima
    weather_dataset_path = "data/processed/dataset_weather.csv"
    if os.path.exists(weather_dataset_path):
        df = pd.read_csv(weather_dataset_path, parse_dates=['order_date'])
        print(f"  ✓ Dataset con clima cargado: {len(df):,} registros")
        return df
    else:
        print("  ⚠️ Dataset con clima no encontrado. Generando datos de ejemplo...")
        # Generar datos de ejemplo para demostración
        df_sample = df_orders.copy()
        df_sample['temp_max_c'] = np.random.uniform(15, 35, len(df_sample))
        df_sample['temp_min_c'] = df_sample['temp_max_c'] - np.random.uniform(5, 15, len(df_sample))
        df_sample['humidity'] = np.random.uniform(30, 80, len(df_sample))
        df_sample['precip_mm'] = np.random.exponential(2, len(df_sample))
        return df_sample


def analyze_correlation(df):
    """Análisis de correlación Pearson."""
    print("\n" + "="*70)
    print(" "*20 + "📊 CORRELACIÓN CLIMA VS VENTAS")
    print("="*70)
    
    # Agrupar por fecha
    daily_data = df.groupby('order_date').agg({
        'order_id': 'count',
        'final_price': 'sum',
        'temp_max_c': 'mean',
        'temp_min_c': 'mean',
        'humidity': 'mean',
        'precip_mm': 'sum'
    }).rename(columns={'order_id': 'orders_count', 'final_price': 'revenue'})
    
    # Calcular temperatura promedio
    daily_data['temp_avg_c'] = (daily_data['temp_max_c'] + daily_data['temp_min_c']) / 2
    
    # Correlaciones Pearson
    print("\n📈 Coeficientes de Correlación de Pearson:")
    print("-" * 70)
    
    correlations = []
    for var in ['temp_max_c', 'temp_avg_c', 'humidity', 'precip_mm']:
        if var in daily_data.columns:
            # Correlación con pedidos
            corr_orders, p_orders = stats.pearsonr(
                daily_data[var].fillna(daily_data[var].mean()),
                daily_data['orders_count']
            )
            
            # Correlación con revenue
            corr_revenue, p_revenue = stats.pearsonr(
                daily_data[var].fillna(daily_data[var].mean()),
                daily_data['revenue']
            )
            
            print(f"\n{var.replace('_', ' ').title()}:")
            print(f"  vs Pedidos:  r = {corr_orders:6.3f}  (p = {p_orders:.4f})  {'✓ Significativo' if p_orders < 0.05 else '✗ No significativo'}")
            print(f"  vs Revenue:  r = {corr_revenue:6.3f}  (p = {p_revenue:.4f})  {'✓ Significativo' if p_revenue < 0.05 else '✗ No significativo'}")
            
            correlations.append({
                'variable': var,
                'corr_orders': corr_orders,
                'p_orders': p_orders,
                'corr_revenue': corr_revenue,
                'p_revenue': p_revenue
            })
    
    print("\n" + "="*70)
    return daily_data, pd.DataFrame(correlations)


def plot_scatter(daily_data, output_dir="reports"):
    """Scatter plots de correlación."""
    print("\n📊 Generando scatter plots...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('Correlación Clima vs Demanda de Agua', fontsize=16, fontweight='bold')
    
    # 1. Temperatura máxima vs Pedidos
    axes[0, 0].scatter(daily_data['temp_max_c'], daily_data['orders_count'], 
                       alpha=0.6, c=daily_data['temp_max_c'], cmap='YlOrRd')
    axes[0, 0].set_xlabel('Temperatura Máxima (°C)')
    axes[0, 0].set_ylabel('Cantidad de Pedidos')
    axes[0, 0].set_title('Temperatura Máxima vs Pedidos')
    
    # Línea de tendencia
    z = np.polyfit(daily_data['temp_max_c'].fillna(daily_data['temp_max_c'].mean()), 
                   daily_data['orders_count'], 1)
    p = np.poly1d(z)
    axes[0, 0].plot(daily_data['temp_max_c'], p(daily_data['temp_max_c']), 
                    "r--", alpha=0.8, linewidth=2, label='Tendencia')
    axes[0, 0].legend()
    
    # 2. Humedad vs Pedidos
    axes[0, 1].scatter(daily_data['humidity'], daily_data['orders_count'], 
                       alpha=0.6, c=daily_data['humidity'], cmap='Blues')
    axes[0, 1].set_xlabel('Humedad Relativa (%)')
    axes[0, 1].set_ylabel('Cantidad de Pedidos')
    axes[0, 1].set_title('Humedad vs Pedidos')
    
    # 3. Precipitación vs Pedidos
    axes[1, 0].scatter(daily_data['precip_mm'], daily_data['orders_count'], 
                       alpha=0.6, c=daily_data['precip_mm'], cmap='Blues_r')
    axes[1, 0].set_xlabel('Precipitación (mm)')
    axes[1, 0].set_ylabel('Cantidad de Pedidos')
    axes[1, 0].set_title('Precipitación vs Pedidos')
    axes[1, 0].set_xlim(left=0)
    
    # 4. Temperatura vs Revenue
    axes[1, 1].scatter(daily_data['temp_avg_c'], daily_data['revenue'], 
                       alpha=0.6, c=daily_data['temp_avg_c'], cmap='RdYlGn')
    axes[1, 1].set_xlabel('Temperatura Promedio (°C)')
    axes[1, 1].set_ylabel('Revenue (CLP)')
    axes[1, 1].set_title('Temperatura vs Revenue')
    
    plt.tight_layout()
    filename = f"{output_dir}/weather_correlation_scatter_{datetime.now().strftime('%Y%m%d')}.png"
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    print(f"  ✓ Guardado: {filename}")
    plt.close()


def plot_timeseries(daily_data, output_dir="reports"):
    """Time series: pedidos y temperatura."""
    print("📈 Generando time series...")
    
    fig, ax1 = plt.subplots(figsize=(16, 6))
    fig.suptitle('Serie Temporal: Pedidos y Temperatura', fontsize=16, fontweight='bold')
    
    # Pedidos (eje izquierdo)
    color = 'tab:blue'
    ax1.set_xlabel('Fecha')
    ax1.set_ylabel('Cantidad de Pedidos', color=color)
    ax1.plot(daily_data.index, daily_data['orders_count'], 
             color=color, linewidth=1.5, alpha=0.7, label='Pedidos')
    ax1.tick_params(axis='y', labelcolor=color)
    ax1.grid(True, alpha=0.3)
    
    # Temperatura (eje derecho)
    ax2 = ax1.twinx()
    color = 'tab:red'
    ax2.set_ylabel('Temperatura Máxima (°C)', color=color)
    ax2.plot(daily_data.index, daily_data['temp_max_c'], 
             color=color, linewidth=1.5, alpha=0.7, label='Temp Máx')
    ax2.tick_params(axis='y', labelcolor=color)
    
    # Líneas de referencia
    ax2.axhline(y=28, color='red', linestyle='--', alpha=0.5, label='Día caluroso (28°C)')
    
    plt.tight_layout()
    filename = f"{output_dir}/weather_timeseries_{datetime.now().strftime('%Y%m%d')}.png"
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    print(f"  ✓ Guardado: {filename}")
    plt.close()


def plot_heatmap(daily_data, output_dir="reports"):
    """Heatmap de correlación."""
    print("🔥 Generando heatmap de correlación...")
    
    # Seleccionar columnas relevantes
    cols = ['orders_count', 'revenue', 'temp_max_c', 'temp_avg_c', 'humidity', 'precip_mm']
    corr_matrix = daily_data[cols].corr()
    
    plt.figure(figsize=(10, 8))
    sns.heatmap(corr_matrix, annot=True, fmt='.3f', cmap='coolwarm', 
                center=0, square=True, linewidths=1, cbar_kws={"shrink": 0.8})
    plt.title('Matriz de Correlación: Clima vs Ventas', fontsize=14, fontweight='bold', pad=20)
    plt.tight_layout()
    
    filename = f"{output_dir}/weather_correlation_heatmap_{datetime.now().strftime('%Y%m%d')}.png"
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    print(f"  ✓ Guardado: {filename}")
    plt.close()


def generate_report(df, daily_data, correlations, output_dir="reports"):
    """Generar reporte HTML."""
    print("\n📄 Generando reporte HTML...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    html = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Análisis Clima vs Ventas - Agua 3T</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }}
        h2 {{ color: #1e40af; margin-top: 30px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background-color: #2563eb; color: white; }}
        tr:hover {{ background-color: #f5f5f5; }}
        .metric {{ display: inline-block; background: #eff6ff; padding: 15px 25px; margin: 10px; border-radius: 8px; border-left: 4px solid #2563eb; }}
        .metric-value {{ font-size: 24px; font-weight: bold; color: #1e40af; }}
        .metric-label {{ color: #64748b; font-size: 12px; text-transform: uppercase; }}
        .positive {{ color: #16a34a; }}
        .negative {{ color: #dc2626; }}
        .significant {{ background-color: #dcfce7; }}
        img {{ max-width: 100%; height: auto; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🌤️ Análisis de Correlación Clima vs Ventas</h1>
        <p><strong>Fecha:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
        <p><strong>Sistema:</strong> ML Agua Tres Torres</p>
        
        <h2>📊 Métricas Generales</h2>
        <div>
            <div class="metric">
                <div class="metric-label">Total Pedidos</div>
                <div class="metric-value">{len(df):,}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Días Analizados</div>
                <div class="metric-value">{len(daily_data):,}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Pedidos/Día Promedio</div>
                <div class="metric-value">{daily_data['orders_count'].mean():.1f}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Temp Promedio</div>
                <div class="metric-value">{daily_data['temp_avg_c'].mean():.1f}°C</div>
            </div>
        </div>
        
        <h2>📈 Coeficientes de Correlación (Pearson)</h2>
        <table>
            <tr>
                <th>Variable Climática</th>
                <th>Correlación con Pedidos</th>
                <th>P-valor</th>
                <th>Correlación con Revenue</th>
                <th>P-valor</th>
            </tr>
    """
    
    for _, row in correlations.iterrows():
        significant_orders = 'significant' if row['p_orders'] < 0.05 else ''
        significant_revenue = 'significant' if row['p_revenue'] < 0.05 else ''
        
        html += f"""
            <tr class="{significant_orders}">
                <td><strong>{row['variable'].replace('_', ' ').title()}</strong></td>
                <td class="{'positive' if row['corr_orders'] > 0 else 'negative'}">{row['corr_orders']:.3f}</td>
                <td>{row['p_orders']:.4f}</td>
                <td class="{'positive' if row['corr_revenue'] > 0 else 'negative'}">{row['corr_revenue']:.3f}</td>
                <td>{row['p_revenue']:.4f}</td>
            </tr>
        """
    
    html += """
        </table>
        <p><em>Nota: P-valor &lt; 0.05 indica correlación estadísticamente significativa</em></p>
        
        <h2>📊 Gráficos de Análisis</h2>
    """
    
    # Agregar imágenes
    timestamp = datetime.now().strftime('%Y%m%d')
    for img_name in [f'weather_correlation_scatter_{timestamp}.png', 
                     f'weather_timeseries_{timestamp}.png',
                     f'weather_correlation_heatmap_{timestamp}.png']:
        if os.path.exists(f"{output_dir}/{img_name}"):
            html += f'<img src="{img_name}" alt="{img_name}">'
    
    html += """
        <h2>💡 Conclusiones</h2>
        <ul>
            <li>Las correlaciones muestran la relación entre variables climáticas y demanda de agua.</li>
            <li>Valores positivos indican que a mayor temperatura/humedad, mayor demanda.</li>
            <li>Valores negativos indican que a mayor precipitación, menor demanda.</li>
            <li>P-valores &lt; 0.05 indican que la correlación es estadísticamente significativa.</li>
        </ul>
        
        <hr style="margin: 40px 0;">
        <p style="text-align: center; color: #64748b; font-size: 12px;">
            Generado automáticamente por el Sistema ML Agua Tres Torres
        </p>
    </div>
</body>
</html>
    """
    
    filename = f"{output_dir}/weather_correlation_report_{datetime.now().strftime('%Y%m%d')}.html"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"  ✓ Guardado: {filename}")
    return filename


def main():
    """Main entry point."""
    print("\n" + "="*70)
    print(" "*10 + "🌤️  ANÁLISIS DE CORRELACIÓN CLIMA VS VENTAS")
    print(" "*10 + "Sistema ML Agua Tres Torres")
    print("="*70 + "\n")
    
    try:
        # 1. Cargar datos
        df = load_data()
        
        # 2. Análisis de correlación
        daily_data, correlations = analyze_correlation(df)
        
        # 3. Generar visualizaciones
        output_dir = "reports"
        os.makedirs(output_dir, exist_ok=True)
        
        plot_scatter(daily_data, output_dir)
        plot_timeseries(daily_data, output_dir)
        plot_heatmap(daily_data, output_dir)
        
        # 4. Reporte HTML
        report_file = generate_report(df, daily_data, correlations, output_dir)
        
        print("\n" + "="*70)
        print("✅ ANÁLISIS COMPLETADO")
        print("="*70)
        print(f"\n📁 Archivos generados en: {output_dir}/")
        print(f"📄 Reporte HTML: {report_file}")
        print(f"\n💡 Abrir reporte: open {report_file} (macOS) o xdg-open {report_file} (Linux)")
        print("="*70 + "\n")
        
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Asegúrate de:")
        print("   1. Sincronizar datos climáticos: python src/sync_historical_weather.py --days 365")
        print("   2. Consolidar dataset: python src/consolidate_data_weather.py")
        print("   3. Ejecutar este script de nuevo\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

