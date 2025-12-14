"""
Pipeline de Re-entrenamiento Automático
Actualiza modelos ML mensualmente con datos nuevos de Supabase
"""

import pandas as pd
import numpy as np
import os
import pickle
from datetime import datetime, timedelta
import logging
import shutil

# Scikit-learn
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.metrics import silhouette_score, classification_report, mean_absolute_error, r2_score
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge

# XGBoost
import xgboost as xgb

# Prophet
from prophet import Prophet

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'/opt/cane/3t/ml/reports/retrain_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)

# --- Configuración de Rutas ---
BASE_DIR = "/opt/cane/3t/ml"
DATA_RAW_DIR = os.path.join(BASE_DIR, "data/raw")
DATA_PROCESSED_DIR = os.path.join(BASE_DIR, "data/processed")
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODELS_BACKUP_DIR = os.path.join(BASE_DIR, "models_backup")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")

# Crear directorios si no existen
os.makedirs(MODELS_BACKUP_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

def backup_models():
    """Backup de modelos actuales antes de re-entrenar"""
    logging.info("🔄 Creando backup de modelos actuales...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(MODELS_BACKUP_DIR, f"models_backup_{timestamp}")
    
    try:
        shutil.copytree(MODELS_DIR, backup_path)
        logging.info(f"✓ Backup creado: {backup_path}")
        
        # Listar archivos respaldados
        model_files = [f for f in os.listdir(backup_path) if f.endswith('.pkl')]
        logging.info(f"  → {len(model_files)} modelos respaldados")
        
        return backup_path
    except Exception as e:
        logging.error(f"❌ Error al crear backup: {e}")
        raise

def extract_data_from_supabase():
    """
    Extrae datos actualizados desde Supabase
    Similar a consolidate_data.py pero conectando a BD
    """
    logging.info("\n============================================================")
    logging.info("📊 EXTRAYENDO DATOS DE SUPABASE")
    logging.info("============================================================")
    
    try:
        from supabase import create_client, Client
        import os
        
        # Cargar credenciales
        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("Variables SUPABASE_URL o SUPABASE_SERVICE_KEY no configuradas")
        
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Extraer tablas (últimos 12 meses para no sobrecargar)
        twelve_months_ago = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        
        logging.info("📥 Extrayendo orders...")
        orders_response = supabase.table("3t_orders").select("*").gte("order_date", twelve_months_ago).execute()
        orders_df = pd.DataFrame(orders_response.data)
        logging.info(f"  → {len(orders_df):,} pedidos")
        
        logging.info("📥 Extrayendo customers...")
        customers_response = supabase.table("3t_customers").select("*").execute()
        customers_df = pd.DataFrame(customers_response.data)
        logging.info(f"  → {len(customers_df):,} clientes")
        
        logging.info("📥 Extrayendo addresses...")
        addresses_response = supabase.table("3t_addresses").select("*").execute()
        addresses_df = pd.DataFrame(addresses_response.data)
        logging.info(f"  → {len(addresses_df):,} direcciones")
        
        logging.info("📥 Extrayendo products...")
        products_response = supabase.table("3t_products").select("*").execute()
        products_df = pd.DataFrame(products_response.data)
        logging.info(f"  → {len(products_df):,} productos")
        
        return {
            "orders": orders_df,
            "customers": customers_df,
            "addresses": addresses_df,
            "products": products_df
        }
    
    except ImportError:
        logging.warning("⚠️ Módulo 'supabase' no instalado. Usando datos locales existentes.")
        return load_existing_csvs()
    except Exception as e:
        logging.error(f"❌ Error al extraer de Supabase: {e}")
        logging.warning("⚠️ Usando datos locales existentes como fallback.")
        return load_existing_csvs()

def load_existing_csvs():
    """Fallback: cargar CSVs existentes si Supabase falla"""
    logging.info("\n📂 Cargando CSVs locales existentes...")
    
    data = {}
    for file_name in ["3t_orders_rows.csv", "3t_customers_rows.csv", "3t_addresses_rows.csv", "3t_products_rows.csv"]:
        path = os.path.join(DATA_RAW_DIR, file_name)
        if os.path.exists(path):
            df = pd.read_csv(path)
            data[file_name.replace("3t_", "").replace("_rows.csv", "")] = df
            logging.info(f"  ✓ {file_name}: {len(df):,} registros")
        else:
            logging.warning(f"  ⚠️ {file_name} no encontrado")
    
    return data

def consolidate_and_engineer_features(data):
    """
    Replica la lógica de consolidate_data.py
    Limpieza, merge, feature engineering
    """
    logging.info("\n============================================================")
    logging.info("🧹 LIMPIEZA Y FEATURE ENGINEERING")
    logging.info("============================================================")
    
    # Importar funciones desde consolidate_data.py
    try:
        import sys
        sys.path.append(os.path.join(BASE_DIR, "src"))
        from consolidate_data import clean_data, combine_data, feature_engineering
        
        cleaned_data = clean_data(data)
        df_combined = combine_data(cleaned_data)
        df_final = feature_engineering(df_combined)
        
        # Guardar dataset actualizado
        output_path = os.path.join(DATA_PROCESSED_DIR, "dataset_completo.csv")
        df_final.to_csv(output_path, index=False)
        logging.info(f"✓ Dataset consolidado guardado: {output_path}")
        
        return df_final
    except ImportError as e:
        logging.error(f"❌ Error al importar consolidate_data: {e}")
        raise

def calculate_rfm(df):
    """Calcular métricas RFM actualizadas"""
    logging.info("\n📊 Calculando RFM actualizado...")
    
    current_date = df['order_date'].max() + pd.Timedelta(days=1)
    rfm = df.groupby('customer_id').agg(
        recency_days=('order_date', lambda date: (current_date - date.max()).days),
        frequency=('order_id', 'nunique'),
        monetary=('final_price', 'sum')
    ).reset_index()
    
    # Guardar RFM actualizado
    rfm_path = os.path.join(DATA_PROCESSED_DIR, "rfm_segments.csv")
    rfm.to_csv(rfm_path, index=False)
    logging.info(f"✓ RFM guardado: {rfm_path}")
    
    return rfm

def train_model_kmeans(rfm_df):
    """Re-entrenar KMeans"""
    logging.info("\n1️⃣ Re-entrenando KMeans...")
    
    rfm_features = rfm_df[['recency_days', 'frequency', 'monetary']].copy()
    rfm_features.replace([np.inf, -np.inf], np.nan, inplace=True)
    rfm_features.dropna(inplace=True)
    
    if rfm_features.empty:
        logging.error("❌ No hay features válidos para KMeans")
        return None
    
    scaler = MinMaxScaler()
    rfm_scaled = scaler.fit_transform(rfm_features)
    
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    rfm_df['cluster'] = kmeans.fit_predict(rfm_scaled)
    
    if len(rfm_features) >= 2:
        silhouette_avg = silhouette_score(rfm_scaled, rfm_df['cluster'])
        logging.info(f"  Silhouette Score: {silhouette_avg:.3f}")
    
    # Guardar modelo
    model_path = os.path.join(MODELS_DIR, "kmeans_segmentation.pkl")
    with open(model_path, 'wb') as f:
        pickle.dump(kmeans, f)
    logging.info(f"✓ Modelo guardado: {model_path}")
    
    return kmeans

def train_model_xgboost_churn(df, rfm_df):
    """Re-entrenar XGBoost Churn"""
    logging.info("\n2️⃣ Re-entrenando XGBoost Churn...")
    
    churn_threshold_days = 90
    rfm_df['is_churn'] = (rfm_df['recency_days'] > churn_threshold_days).astype(int)
    
    features = ['recency_days', 'frequency', 'monetary']
    X = rfm_df[features]
    y = rfm_df['is_churn']
    
    X.replace([np.inf, -np.inf], np.nan, inplace=True)
    X.dropna(inplace=True)
    y = y[X.index]
    
    if X.empty:
        logging.error("❌ No hay features válidos para XGBoost")
        return None
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    model = xgb.XGBClassifier(objective='binary:logistic', eval_metric='logloss', use_label_encoder=False, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    logging.info("\n📊 RESULTADOS:")
    logging.info(classification_report(y_test, y_pred))
    
    # Guardar modelo
    model_path = os.path.join(MODELS_DIR, "xgboost_churn.pkl")
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    logging.info(f"✓ Modelo guardado: {model_path}")
    
    return model

def train_model_prophet_demand(df):
    """Re-entrenar Prophet para demanda"""
    logging.info("\n3️⃣ Re-entrenando Prophet Demand...")
    
    # Pedidos
    daily_orders = df.groupby('order_date').agg(
        y=('order_id', 'nunique')
    ).reset_index().rename(columns={'order_date': 'ds'})
    
    if daily_orders.empty:
        logging.error("❌ No hay datos diarios para Prophet")
        return None, None
    
    model_orders = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=True)
    model_orders.fit(daily_orders)
    
    model_orders_path = os.path.join(MODELS_DIR, "prophet_demand.pkl")
    with open(model_orders_path, 'wb') as f:
        pickle.dump(model_orders, f)
    logging.info(f"✓ Prophet Orders guardado: {model_orders_path}")
    
    # Revenue
    daily_revenue = df.groupby('order_date').agg(
        y=('final_price', 'sum')
    ).reset_index().rename(columns={'order_date': 'ds'})
    
    model_revenue = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=True)
    model_revenue.fit(daily_revenue)
    
    model_revenue_path = os.path.join(MODELS_DIR, "prophet_revenue.pkl")
    with open(model_revenue_path, 'wb') as f:
        pickle.dump(model_revenue, f)
    logging.info(f"✓ Prophet Revenue guardado: {model_revenue_path}")
    
    return model_orders, model_revenue

def train_model_random_forest_routes(df):
    """Re-entrenar Random Forest para rutas"""
    logging.info("\n4️⃣ Re-entrenando Random Forest Routes...")
    
    df_routes = df.dropna(subset=['latitude', 'longitude', 'distance_from_center']).copy()
    
    if df_routes.empty:
        logging.error("❌ No hay datos de rutas válidos")
        return None
    
    le = LabelEncoder()
    df_routes['customer_type_encoded'] = le.fit_transform(df_routes['customer_type_customer'])
    
    X = df_routes[['quantity', 'customer_type_encoded', 'latitude', 'longitude']]
    y = df_routes['distance_from_center']
    
    X.replace([np.inf, -np.inf], np.nan, inplace=True)
    X.dropna(inplace=True)
    y = y[X.index]
    
    if X.empty:
        logging.error("❌ No hay features válidos para Random Forest")
        return None
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    logging.info(f"  MAE: {mae:.2f} | R²: {r2:.3f}")
    
    # Guardar modelo
    model_path = os.path.join(MODELS_DIR, "random_forest_routes.pkl")
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    logging.info(f"✓ Modelo guardado: {model_path}")
    
    return model

def train_model_ridge_pricing(df, rfm_df):
    """Re-entrenar Ridge Regression para precios"""
    logging.info("\n5️⃣ Re-entrenando Ridge Pricing...")
    
    df_pricing = pd.merge(df, rfm_df[['customer_id', 'recency_days', 'frequency', 'monetary']], 
                          on='customer_id', how='left', suffixes=('', '_rfm'))
    
    df_pricing = df_pricing[df_pricing['final_price'] > 0].copy()
    
    if df_pricing.empty:
        logging.error("❌ No hay datos de precios válidos")
        return None
    
    le = LabelEncoder()
    df_pricing['customer_type_encoded'] = le.fit_transform(df_pricing['customer_type_customer'])
    
    features = ['quantity', 'customer_type_encoded', 'recency_days', 'frequency', 'monetary']
    X = df_pricing[features]
    y = df_pricing['final_price']
    
    X.replace([np.inf, -np.inf], np.nan, inplace=True)
    X.dropna(inplace=True)
    y = y[X.index]
    
    if X.empty:
        logging.error("❌ No hay features válidos para Ridge")
        return None
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler_X = StandardScaler()
    X_train_scaled = scaler_X.fit_transform(X_train)
    X_test_scaled = scaler_X.transform(X_test)
    
    model = Ridge(alpha=1.0, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    y_pred = model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    logging.info(f"  MAE: ${mae:,.0f} | R²: {r2:.3f}")
    
    # Guardar modelo y scaler
    model_path = os.path.join(MODELS_DIR, "ridge_pricing.pkl")
    scaler_path = os.path.join(MODELS_DIR, "ridge_pricing_scaler_X.pkl")
    
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    with open(scaler_path, 'wb') as f:
        pickle.dump(scaler_X, f)
    
    logging.info(f"✓ Modelo guardado: {model_path}")
    
    return model

def generate_retrain_report(backup_path, metrics):
    """Generar reporte de re-entrenamiento"""
    logging.info("\n============================================================")
    logging.info("📄 GENERANDO REPORTE")
    logging.info("============================================================")
    
    report_path = os.path.join(REPORTS_DIR, f"retrain_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md")
    
    with open(report_path, 'w') as f:
        f.write("# Reporte de Re-entrenamiento\n\n")
        f.write(f"**Fecha:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"**Backup creado:** `{backup_path}`\n\n")
        f.write("## Modelos Actualizados\n\n")
        
        for model_name, metric in metrics.items():
            f.write(f"### {model_name}\n")
            f.write(f"- Métrica: {metric}\n\n")
        
        f.write("\n## Próximos Pasos\n\n")
        f.write("1. Reiniciar API ML: `cd /opt/cane/3t/ml && ./START_API.sh`\n")
        f.write("2. Verificar predicciones en dashboard: http://localhost:3000/ml-insights\n")
        f.write("3. Monitorear logs de la API\n\n")
    
    logging.info(f"✓ Reporte guardado: {report_path}")
    return report_path

def main():
    """Pipeline principal de re-entrenamiento"""
    logging.info("\n╔==========================================================╗")
    logging.info("║         PIPELINE DE RE-ENTRENAMIENTO AUTOMÁTICO         ║")
    logging.info("║               Sistema ML Agua Tres Torres               ║")
    logging.info("╚==========================================================╝\n")
    
    try:
        # 1. Backup de modelos actuales
        backup_path = backup_models()
        
        # 2. Extraer datos actualizados
        raw_data = extract_data_from_supabase()
        
        # 3. Consolidar y feature engineering
        df_consolidated = consolidate_and_engineer_features(raw_data)
        
        # 4. Calcular RFM actualizado
        rfm_df = calculate_rfm(df_consolidated)
        
        # 5. Re-entrenar modelos
        metrics = {}
        
        kmeans_model = train_model_kmeans(rfm_df)
        if kmeans_model:
            metrics["KMeans Segmentation"] = "Silhouette Score actualizado"
        
        xgboost_model = train_model_xgboost_churn(df_consolidated, rfm_df)
        if xgboost_model:
            metrics["XGBoost Churn"] = "Accuracy actualizado"
        
        prophet_orders, prophet_revenue = train_model_prophet_demand(df_consolidated)
        if prophet_orders and prophet_revenue:
            metrics["Prophet Demand"] = "MAE actualizado"
        
        rf_model = train_model_random_forest_routes(df_consolidated)
        if rf_model:
            metrics["Random Forest Routes"] = "R² actualizado"
        
        ridge_model = train_model_ridge_pricing(df_consolidated, rfm_df)
        if ridge_model:
            metrics["Ridge Pricing"] = "MAE actualizado"
        
        # 6. Generar reporte
        report_path = generate_retrain_report(backup_path, metrics)
        
        logging.info("\n============================================================")
        logging.info("✅ RE-ENTRENAMIENTO COMPLETADO EXITOSAMENTE")
        logging.info("============================================================")
        logging.info(f"\n📊 Modelos actualizados: {len(metrics)}")
        logging.info(f"📄 Reporte: {report_path}")
        logging.info(f"💾 Backup: {backup_path}")
        logging.info("\n🚀 Reinicia la API ML para usar los nuevos modelos:")
        logging.info("   cd /opt/cane/3t/ml && ./START_API.sh")
        
        return True
    
    except Exception as e:
        logging.error(f"\n❌ ERROR CRÍTICO EN EL PIPELINE: {e}")
        logging.error("🔄 Puedes restaurar los modelos desde el backup si es necesario")
        raise

if __name__ == "__main__":
    main()

