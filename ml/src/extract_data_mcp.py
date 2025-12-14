"""
Script de Extracción de Datos usando consultas SQL simples
==========================================================

Extrae datos tabla por tabla y los combina localmente.

Uso:
    python extract_data_mcp.py

Output:
    - ml/data/raw/orders_complete.csv
"""

import os
import sys
from pathlib import Path
import pandas as pd
from datetime import datetime
import logging
import json

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Obtener directorio raíz del proyecto ML
ML_ROOT = Path(__file__).parent.parent
DATA_RAW = ML_ROOT / 'data' / 'raw'

# Crear directorios si no existen
DATA_RAW.mkdir(parents=True, exist_ok=True)


def main():
    """
    Función principal - los datos se extraen manualmente via MCP
    y este script solo genera el template.
    """
    logger.info("="*60)
    logger.info("SCRIPT DE EXTRACCIÓN - Sistema ML Agua Tres Torres")
    logger.info("="*60)
    logger.info("")
    logger.info("INSTRUCCIONES:")
    logger.info("1. Los datos se extraerán usando herramientas MCP de Supabase")
    logger.info("2. Se guardarán directamente en: ml/data/raw/")
    logger.info("3. Luego se combinará todo en orders_complete.csv")
    logger.info("")
    logger.info("Output esperado: ml/data/raw/orders_complete.csv")
    logger.info("="*60)


if __name__ == '__main__':
    main()

