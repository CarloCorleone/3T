"""
Script de Extracción de Datos desde Supabase
===========================================

Extrae pedidos históricos con todas las relaciones (clientes, direcciones, productos)
y los guarda en formato CSV para análisis y entrenamiento de modelos.

Uso:
    python extract_data.py

Output:
    - ml/data/raw/orders_complete.csv (~1,004 registros)
"""

import os
import sys
from pathlib import Path
import pandas as pd
from supabase import create_client, Client
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


def get_supabase_client() -> Client:
    """
    Crear cliente de Supabase usando variables de entorno.
    
    Returns:
        Client: Cliente de Supabase autenticado
    """
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_ANON_KEY')
    
    if not url or not key:
        raise ValueError(
            "SUPABASE_URL y SUPABASE_ANON_KEY deben estar definidos en variables de entorno.\n"
            "Cargar desde: /opt/cane/env/ml.env"
        )
    
    logger.info(f"Conectando a Supabase: {url}")
    return create_client(url, key)


def extract_orders_data(supabase: Client, limit: int = 10000) -> pd.DataFrame:
    """
    Extraer pedidos y hacer merge manual con clientes, direcciones y productos.
    
    Args:
        supabase: Cliente de Supabase
        limit: Límite de registros a extraer (default: 10000)
    
    Returns:
        DataFrame con pedidos completos
    """
    logger.info(f"Extrayendo pedidos (límite: {limit})...")
    
    # Extraer pedidos (sin comillas dobles en el nombre de la tabla)
    response = supabase.table('3t_orders') \
        .select('*') \
        .not_.is_('order_date', 'null') \
        .order('order_date', desc=True) \
        .limit(limit) \
        .execute()
    
    if not response.data:
        logger.warning("No se encontraron datos")
        return pd.DataFrame()
    
    logger.info(f"✓ Extraídos {len(response.data)} pedidos")
    
    # Convertir a DataFrame
    orders_df = pd.DataFrame(response.data)
    
    # Extraer clientes
    logger.info("Extrayendo clientes...")
    customers_response = supabase.table('3t_customers').select('*').execute()
    customers_df = pd.DataFrame(customers_response.data)
    logger.info(f"✓ Extraídos {len(customers_df)} clientes")
    
    # Extraer direcciones
    logger.info("Extrayendo direcciones...")
    addresses_response = supabase.table('3t_addresses').select('*').execute()
    addresses_df = pd.DataFrame(addresses_response.data)
    logger.info(f"✓ Extraídas {len(addresses_df)} direcciones")
    
    # Extraer productos
    logger.info("Extrayendo productos...")
    products_response = supabase.table('3t_products').select('*').execute()
    products_df = pd.DataFrame(products_response.data)
    logger.info(f"✓ Extraídos {len(products_df)} productos")
    
    # Hacer merge con prefijos para evitar colisiones
    logger.info("Combinando datos...")
    
    # Merge con clientes
    if not customers_df.empty:
        customers_df = customers_df.add_prefix('customer_')
        orders_df = orders_df.merge(
            customers_df,
            left_on='customer_id',
            right_on='customer_customer_id',
            how='left'
        )
    
    # Merge con direcciones
    if not addresses_df.empty:
        addresses_df = addresses_df.add_prefix('address_')
        orders_df = orders_df.merge(
            addresses_df,
            left_on='delivery_address_id',
            right_on='address_address_id',
            how='left'
        )
    
    # Merge con productos
    if not products_df.empty:
        products_df = products_df.add_prefix('product_')
        orders_df = orders_df.merge(
            products_df,
            left_on='product_type',
            right_on='product_product_id',
            how='left'
        )
    
    logger.info(f"✓ Dataset final: {len(orders_df)} filas × {len(orders_df.columns)} columnas")
    
    return orders_df


def extract_customers_data(supabase: Client) -> pd.DataFrame:
    """
    Extraer información de clientes.
    
    Args:
        supabase: Cliente de Supabase
    
    Returns:
        DataFrame con clientes
    """
    logger.info("Extrayendo clientes...")
    
    response = supabase.table('3t_customers') \
        .select('*') \
        .execute()
    
    if not response.data:
        logger.warning("No se encontraron clientes")
        return pd.DataFrame()
    
    logger.info(f"✓ Extraídos {len(response.data)} clientes")
    return pd.DataFrame(response.data)


def extract_products_data(supabase: Client) -> pd.DataFrame:
    """
    Extraer catálogo de productos.
    
    Args:
        supabase: Cliente de Supabase
    
    Returns:
        DataFrame con productos
    """
    logger.info("Extrayendo productos...")
    
    response = supabase.table('3t_products') \
        .select('*') \
        .execute()
    
    if not response.data:
        logger.warning("No se encontraron productos")
        return pd.DataFrame()
    
    logger.info(f"✓ Extraídos {len(response.data)} productos")
    return pd.DataFrame(response.data)


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
    for col in df.columns:
        null_count = df[col].isnull().sum()
        null_pct = (null_count / len(df)) * 100
        logger.info(f"  - {col}: {df[col].dtype} ({null_pct:.1f}% nulos)")
    
    if 'order_date' in df.columns:
        df['order_date'] = pd.to_datetime(df['order_date'], errors='coerce')
        min_date = df['order_date'].min()
        max_date = df['order_date'].max()
        logger.info(f"\nRango de fechas: {min_date.date()} a {max_date.date()}")
    
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
    
    try:
        # Conectar a Supabase
        supabase = get_supabase_client()
        
        # Extraer datos
        logger.info("Fase 1: Extracción y combinación de datos...")
        orders_df = extract_orders_data(supabase, limit=10000)
        
        if orders_df.empty:
            logger.error("❌ No se pudieron extraer pedidos. Abortando.")
            sys.exit(1)
        
        print_dataset_info(orders_df, "Pedidos Completos")
        
        # Guardar pedidos completos
        save_dataset(
            orders_df, 
            'orders_complete.csv',
            "Pedidos con merge a clientes, direcciones y productos"
        )
        
        # Resumen final
        logger.info("\n" + "="*60)
        logger.info("✅ EXTRACCIÓN COMPLETADA EXITOSAMENTE")
        logger.info("="*60)
        logger.info(f"Total registros extraídos: {len(orders_df)}")
        logger.info(f"Archivos generados en: {DATA_RAW}")
        logger.info("")
        logger.info("Próximos pasos:")
        logger.info("  1. Revisar datos en: ml/data/raw/")
        logger.info("  2. Ejecutar notebook EDA: ml/notebooks/01_eda.ipynb")
        logger.info("  3. Limpiar datos: ml/src/clean_data.py")
        logger.info("="*60)
        
    except Exception as e:
        logger.error(f"\n❌ ERROR durante la extracción: {str(e)}")
        logger.exception("Traceback completo:")
        sys.exit(1)


if __name__ == '__main__':
    main()

