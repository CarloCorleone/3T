#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================
SINCRONIZACIÓN HISTÓRICA DE CLIMA
Sistema ML Agua Tres Torres
============================================
Script para descargar datos históricos de clima desde Open-Meteo
y guardarlos en Supabase.

Uso:
    python src/sync_historical_weather.py --start-date 2024-01-01 --end-date 2025-11-10
    python src/sync_historical_weather.py --days 365  # Último año
"""

import os
import sys
import argparse
import logging
from datetime import datetime, timedelta
from typing import List
from tqdm import tqdm
import time

# Agregar path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.weather_service import OpenMeteoClient, WeatherDBService
from src.communes_constants import VALID_COMMUNES

# Configurar Supabase
try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv("SUPABASE_URL", "http://supabase-kong:8000")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    if not SUPABASE_KEY:
        print("⚠️ SUPABASE_SERVICE_KEY no configurada. Usando datos de prueba.")
        SUPABASE_KEY = "dummy_key_for_test"
except ImportError:
    print("⚠️ Módulo supabase no instalado. Instalando...")
    os.system("pip install supabase")
    from supabase import create_client, Client

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'reports/weather_sync_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def sync_historical_weather(start_date: str, end_date: str, 
                           communes: List[str] = None,
                           batch_size: int = 100,
                           auto_confirm: bool = False):
    """
    Sincronizar datos históricos de clima.
    
    Args:
        start_date: Fecha inicio (YYYY-MM-DD)
        end_date: Fecha fin (YYYY-MM-DD)
        communes: Lista de comunas (None = todas)
        batch_size: Tamaño de batch para insertar
    """
    print("\n" + "="*70)
    print(" "*15 + "🌤️  SINCRONIZACIÓN HISTÓRICA DE CLIMA")
    print(" "*15 + "Open-Meteo → Supabase")
    print("="*70)
    
    # Usar todas las comunas si no se especifican
    if communes is None:
        communes = VALID_COMMUNES
    
    print(f"\n📊 Configuración:")
    print(f"  Rango: {start_date} → {end_date}")
    print(f"  Comunas: {len(communes)}")
    print(f"  Fuente: Open-Meteo API (gratuita)")
    print(f"  Destino: Supabase tabla 3t_weather_data")
    
    # Calcular días
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    days_count = (end_dt - start_dt).days + 1
    total_records = len(communes) * days_count
    
    print(f"  Total registros a sincronizar: {total_records:,}")
    print(f"  Batch size: {batch_size}")
    
    # Confirmar (skip si --yes flag)
    if not auto_confirm:
        try:
            confirm = input(f"\n¿Continuar? (y/n): ")
            if confirm.lower() != 'y':
                print("❌ Sincronización cancelada")
                return
        except (EOFError, KeyboardInterrupt):
            print("\n❌ Sincronización cancelada")
            return
    else:
        print("\n✓ Auto-confirmado (--yes flag)")
    
    # Inicializar servicios
    print("\n🔧 Inicializando servicios...")
    client = OpenMeteoClient()
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        db_service = WeatherDBService(supabase)
        print("✓ Servicios inicializados")
    except Exception as e:
        logger.error(f"Error inicializando Supabase: {e}")
        print("⚠️ Continuando en modo test (sin guardar en BD)")
        db_service = None
    
    # Sincronizar por comuna
    print(f"\n📥 Descargando datos históricos...")
    print(f"  Límite Open-Meteo: 10,000 calls/día")
    print(f"  Uso estimado: {len(communes)} calls")
    
    all_records = []
    success_count = 0
    error_count = 0
    
    # Progress bar
    with tqdm(total=len(communes), desc="Comunas procesadas", unit="comuna") as pbar:
        for commune in communes:
            try:
                # Obtener datos históricos
                data = client.get_historical_for_commune(commune, start_date, end_date)
                
                # Parsear a formato estándar
                records = client.parse_daily_data(data, commune)
                all_records.extend(records)
                
                success_count += 1
                pbar.update(1)
                pbar.set_postfix({"✓": success_count, "✗": error_count, "registros": len(all_records)})
                
                # Guardar en batches
                if len(all_records) >= batch_size and db_service:
                    result = db_service.save_weather_data(all_records)
                    if result.get('success'):
                        all_records = []  # Limpiar batch
                    else:
                        logger.error(f"Error guardando batch: {result.get('error')}")
                
                # Rate limiting (cortesía, Open-Meteo no tiene límite estricto)
                time.sleep(0.1)
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error procesando {commune}: {e}")
                pbar.update(1)
                pbar.set_postfix({"✓": success_count, "✗": error_count})
    
    # Guardar registros restantes
    if all_records and db_service:
        print(f"\n💾 Guardando {len(all_records)} registros finales...")
        result = db_service.save_weather_data(all_records)
        if result.get('success'):
            print("✓ Guardado exitoso")
        else:
            print(f"✗ Error: {result.get('error')}")
    
    # Resumen
    print("\n" + "="*70)
    print("📊 RESUMEN DE SINCRONIZACIÓN")
    print("="*70)
    print(f"  Comunas procesadas: {success_count}/{len(communes)}")
    print(f"  Errores: {error_count}")
    print(f"  Registros totales: {success_count * days_count:,}")
    print(f"  Rango: {start_date} → {end_date} ({days_count} días)")
    
    if db_service:
        print(f"  ✓ Datos guardados en Supabase: 3t_weather_data")
    else:
        print(f"  ⚠️ Modo test: datos NO guardados en BD")
    
    print("="*70)
    
    # Log final
    logger.info(f"Sincronización completada: {success_count} comunas, {error_count} errores")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Sincronizar datos históricos de clima desde Open-Meteo"
    )
    
    # Opciones de fecha
    date_group = parser.add_mutually_exclusive_group(required=True)
    date_group.add_argument(
        '--start-date',
        type=str,
        help='Fecha inicio (YYYY-MM-DD)'
    )
    date_group.add_argument(
        '--days',
        type=int,
        help='Días hacia atrás desde hoy'
    )
    
    parser.add_argument(
        '--end-date',
        type=str,
        default=datetime.now().strftime('%Y-%m-%d'),
        help='Fecha fin (YYYY-MM-DD), default: hoy'
    )
    
    parser.add_argument(
        '--communes',
        type=str,
        nargs='+',
        default=None,
        help='Comunas específicas (default: todas)'
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=100,
        help='Tamaño de batch para insertar (default: 100)'
    )
    
    parser.add_argument(
        '--yes', '-y',
        action='store_true',
        help='Confirmar automáticamente (no interactivo)'
    )
    
    args = parser.parse_args()
    
    # Calcular fechas
    if args.days:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=args.days)
        start_date_str = start_date.strftime('%Y-%m-%d')
        end_date_str = end_date.strftime('%Y-%m-%d')
    else:
        start_date_str = args.start_date
        end_date_str = args.end_date
    
    # Ejecutar sincronización
    sync_historical_weather(
        start_date=start_date_str,
        end_date=end_date_str,
        communes=args.communes,
        batch_size=args.batch_size,
        auto_confirm=args.yes
    )


if __name__ == "__main__":
    main()

