"""
Script de Extracción de Datos desde Supabase usando SQL directo
================================================================

Extrae pedidos históricos con todas las relaciones usando PostgreSQL directo
y los guarda en formato CSV para análisis y entrenamiento de modelos.

Uso:
    python extract_data_sql.py

Output:
    - ml/data/raw/orders_complete.csv (~1,004 registros)
"""

import os
import sys
from pathlib import Path
import pandas as pd
import psycopg2
from datetime import datetime
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Obtener directorio raíz del proyecto ML
ML_ROOT = Path(__file__).parent.parent
DATA_RAW = ML_ROOT / 'data' / 'raw'
DATA_PROCESSED = ML_ROOT / 'data' / 'processed'

# Crear directorios si no existen
DATA_RAW.mkdir(parents=True, exist_ok=True)
DATA_PROCESSED.mkdir(parents=True, exist_ok=True)


def get_database_connection():
    """
    Crear conexión directa a PostgreSQL.
    
    Returns:
        Connection: Conexión a la base de datos
    """
    supabase_url = os.getenv('SUPABASE_URL')
    
    if not supabase_url:
        raise ValueError("SUPABASE_URL debe estar definida en variables de entorno")
    
    # Extraer host del URL (https://api.loopia.cl -> api.loopia.cl)
    host = supabase_url.replace('https://', '').replace('http://', '')
    
    logger.info(f"Conectando a PostgreSQL: {host}:5432")
    
    # Nota: Ajusta estos parámetros según tu configuración
    # Por ahora usaremos las credenciales por defecto de Supabase
    conn = psycopg2.connect(
        host=host,
        port=5432,
        database="postgres",
        user="postgres",
        password=os.getenv('SUPABASE_SERVICE_KEY', '')[:50]  # Usar parte del service key como password
    )
    
    return conn


def extract_data_with_sql(conn) -> pd.DataFrame:
    """
    Extraer datos usando SQL directo con JOINs.
    
    Args:
        conn: Conexión a PostgreSQL
    
    Returns:
        DataFrame con datos completos
    """
    logger.info("Extrayendo datos con SQL...")
    
    query = '''
    SELECT 
        o.*,
        c.name as customer_name,
        c.customer_type,
        c.phone as customer_phone,
        c.email as customer_email,
        c.rut as customer_rut,
        c.business_name as customer_business_name,
        c.commune as customer_commune,
        c.product_format as customer_product_format,
        c.price as customer_price,
        a.raw_address,
        a.street_name,
        a.street_number,
        a.apartment,
        a.commune as address_commune,
        a.region,
        a.directions,
        a.latitude,
        a.longitude,
        a.maps_link,
        a.is_default as address_is_default,
        p.name as product_name,
        p.category as product_category,
        p.price_neto,
        p.pv_iva_inc
    FROM "3t_orders" o
    LEFT JOIN "3t_customers" c ON o.customer_id = c.customer_id
    LEFT JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id
    LEFT JOIN "3t_products" p ON o.product_type = p.product_id
    WHERE o.order_date IS NOT NULL
    ORDER BY o.order_date DESC
    LIMIT 10000;
    '''
    
    df = pd.read_sql_query(query, conn)
    logger.info(f"✓ Extraídos {len(df)} registros con {len(df.columns)} columnas")
    
    return df


def save_dataset(df: pd.DataFrame, filename: str, description: str = ""):
    """
    Guardar dataset en formato CSV.
    
    Args:
        df: DataFrame a guardar
        filename: Nombre del archivo (sin ruta)
        description: Descripción del dataset
    """
    filepath = DATA_RAW / filename
    df.to_csv(filepath, index=False, encoding='utf-8')
    
    size_mb = filepath.stat().st_size / (1024 * 1024)
    logger.info(f"✓ Guardado: {filepath} ({size_mb:.2f} MB, {len(df)} filas)")
    
    if description:
        logger.info(f"  {description}")


def print_dataset_info(df: pd.DataFrame, name: str):
    """
    Imprimir información resumida del dataset.
    
    Args:
        df: DataFrame a analizar
        name: Nombre del dataset
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"Dataset: {name}")
    logger.info(f"{'='*60}")
    logger.info(f"Dimensiones: {df.shape[0]} filas × {df.shape[1]} columnas")
    logger.info(f"\nColumnas disponibles ({len(df.columns)}):")
    for col in df.columns[:20]:  # Mostrar primeras 20 columnas
        null_count = df[col].isnull().sum()
        null_pct = (null_count / len(df)) * 100
        dtype = str(df[col].dtype)
        logger.info(f"  - {col}: {dtype} ({null_pct:.1f}% nulos)")
    
    if len(df.columns) > 20:
        logger.info(f"  ... y {len(df.columns) - 20} columnas más")
    
    if 'order_date' in df.columns:
        df['order_date'] = pd.to_datetime(df['order_date'], errors='coerce')
        min_date = df['order_date'].min()
        max_date = df['order_date'].max()
        logger.info(f"\nRango de fechas: {min_date} a {max_date}")
        days_range = (max_date - min_date).days
        logger.info(f"Período: {days_range} días")
    
    if 'final_price' in df.columns:
        total_revenue = df['final_price'].sum()
        avg_ticket = df['final_price'].mean()
        logger.info(f"\nEstadísticas de ventas:")
        logger.info(f"  - Revenue total: ${total_revenue:,.0f}")
        logger.info(f"  - Ticket promedio: ${avg_ticket:,.0f}")
    
    logger.info(f"{'='*60}\n")


def main():
    """
    Función principal de extracción de datos.
    """
    logger.info("="*60)
    logger.info("EXTRACCIÓN DE DATOS - Sistema ML Agua Tres Torres")
    logger.info("="*60)
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info(f"Output directory: {DATA_RAW}")
    logger.info("")
    
    conn = None
    
    try:
        # Conectar a PostgreSQL
        conn = get_database_connection()
        logger.info("✓ Conexión establecida")
        
        # Extraer datos
        logger.info("\nFase 1: Extracción de datos con SQL...")
        orders_df = extract_data_with_sql(conn)
        
        if orders_df.empty:
            logger.error("❌ No se pudieron extraer pedidos. Abortando.")
            sys.exit(1)
        
        print_dataset_info(orders_df, "Pedidos Completos")
        
        # Guardar dataset
        save_dataset(
            orders_df, 
            'orders_complete.csv',
            "Pedidos con JOIN a clientes, direcciones y productos"
        )
        
        # Resumen final
        logger.info("\n" + "="*60)
        logger.info("✅ EXTRACCIÓN COMPLETADA EXITOSAMENTE")
        logger.info("="*60)
        logger.info(f"Total registros extraídos: {len(orders_df)}")
        logger.info(f"Archivos generados en: {DATA_RAW}")
        logger.info("")
        logger.info("Próximos pasos:")
        logger.info("  1. Revisar datos en: ml/data/raw/orders_complete.csv")
        logger.info("  2. Ejecutar notebook EDA: ml/notebooks/01_eda.ipynb")
        logger.info("  3. Crear features: ml/src/feature_engineering.py")
        logger.info("="*60)
        
    except psycopg2.Error as e:
        logger.error(f"\n❌ ERROR de PostgreSQL: {str(e)}")
        logger.error("Verifica:")
        logger.error("  - Que Supabase esté corriendo")
        logger.error("  - Que las credenciales sean correctas")
        logger.error("  - Que el puerto 5432 esté accesible")
        sys.exit(1)
        
    except Exception as e:
        logger.error(f"\n❌ ERROR durante la extracción: {str(e)}")
        logger.exception("Traceback completo:")
        sys.exit(1)
        
    finally:
        if conn:
            conn.close()
            logger.info("Conexión cerrada")


if __name__ == '__main__':
    main()

