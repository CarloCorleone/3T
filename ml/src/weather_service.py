#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================
SERVICIO DE CLIMA - OPEN-METEO API
Sistema ML Agua Tres Torres
============================================
Cliente para Open-Meteo API (100% gratuita, sin API key) y
servicio para guardar datos en Supabase.

Open-Meteo API:
- Histórico: https://archive-api.open-meteo.com/v1/archive
- Forecast: https://api.open-meteo.com/v1/forecast
- Documentación: https://open-meteo.com/en/docs
"""

import os
import sys
import requests
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import pandas as pd

# Agregar path al módulo
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from src.communes_constants import COMMUNES_COORDS, VALID_COMMUNES, is_valid_commune, get_commune_coords
except ImportError:
    from communes_constants import COMMUNES_COORDS, VALID_COMMUNES, is_valid_commune, get_commune_coords

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class OpenMeteoClient:
    """
    Cliente para Open-Meteo API.
    
    Open-Meteo es 100% gratuita, sin necesidad de API key.
    - Límite: 10,000 llamadas/día
    - Histórico: Desde 1940
    - Forecast: Hasta 16 días
    """
    
    BASE_URL_FORECAST = "https://api.open-meteo.com/v1/forecast"
    BASE_URL_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
    
    def __init__(self):
        """Inicializar cliente Open-Meteo (no requiere API key)."""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Agua3T-ML-System/1.0'
        })
        logger.info("OpenMeteoClient inicializado (sin API key requerida)")
    
    def get_historical(self, lat: float, lon: float, start_date: str, end_date: str) -> Dict:
        """
        Obtener datos históricos de clima.
        
        Args:
            lat: Latitud (ej: -33.4489)
            lon: Longitud (ej: -70.6693)
            start_date: Fecha inicio (YYYY-MM-DD)
            end_date: Fecha fin (YYYY-MM-DD)
        
        Returns:
            dict: Respuesta JSON de Open-Meteo
        
        Ejemplo:
            >>> client = OpenMeteoClient()
            >>> data = client.get_historical(-33.4489, -70.6693, "2024-01-01", "2024-12-31")
            >>> print(data['daily']['temperature_2m_max'][0])
        """
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean",
            "timezone": "America/Santiago"
        }
        
        try:
            logger.info(f"Obteniendo histórico para lat={lat}, lon={lon}, rango={start_date} a {end_date}")
            response = self.session.get(self.BASE_URL_ARCHIVE, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            logger.info(f"✓ Histórico obtenido: {len(data.get('daily', {}).get('time', []))} días")
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"Error obteniendo histórico: {e}")
            raise
    
    def get_forecast(self, lat: float, lon: float, days: int = 16) -> Dict:
        """
        Obtener pronóstico del clima.
        
        Args:
            lat: Latitud
            lon: Longitud
            days: Días de pronóstico (máx 16)
        
        Returns:
            dict: Respuesta JSON con forecast
        """
        if days > 16:
            logger.warning(f"Open-Meteo máximo 16 días de forecast. Ajustando de {days} a 16")
            days = 16
        
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean",
            "forecast_days": days,
            "timezone": "America/Santiago"
        }
        
        try:
            logger.info(f"Obteniendo forecast para lat={lat}, lon={lon}, {days} días")
            response = self.session.get(self.BASE_URL_FORECAST, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            logger.info(f"✓ Forecast obtenido: {len(data.get('daily', {}).get('time', []))} días")
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"Error obteniendo forecast: {e}")
            raise
    
    def get_historical_for_commune(self, commune: str, start_date: str, end_date: str) -> Dict:
        """
        Obtener histórico para una comuna específica.
        
        Args:
            commune: Nombre de la comuna (debe estar en VALID_COMMUNES)
            start_date: Fecha inicio (YYYY-MM-DD)
            end_date: Fecha fin (YYYY-MM-DD)
        
        Returns:
            dict: Datos climáticos históricos
        
        Raises:
            ValueError: Si la comuna no es válida
        """
        if not is_valid_commune(commune):
            raise ValueError(f"Comuna inválida: {commune}. Debe estar en VALID_COMMUNES")
        
        coords = get_commune_coords(commune)
        return self.get_historical(coords['lat'], coords['lon'], start_date, end_date)
    
    def get_forecast_for_commune(self, commune: str, days: int = 16) -> Dict:
        """
        Obtener forecast para una comuna específica.
        
        Args:
            commune: Nombre de la comuna
            days: Días de pronóstico
        
        Returns:
            dict: Pronóstico climático
        """
        if not is_valid_commune(commune):
            raise ValueError(f"Comuna inválida: {commune}")
        
        coords = get_commune_coords(commune)
        return self.get_forecast(coords['lat'], coords['lon'], days)
    
    def parse_daily_data(self, api_response: Dict, commune: str) -> List[Dict]:
        """
        Parsear respuesta de Open-Meteo a formato estándar.
        
        Args:
            api_response: Respuesta JSON de Open-Meteo
            commune: Nombre de la comuna
        
        Returns:
            list: Lista de dicts con datos por día
        """
        daily = api_response.get('daily', {})
        dates = daily.get('time', [])
        temp_max = daily.get('temperature_2m_max', [])
        temp_min = daily.get('temperature_2m_min', [])
        precip = daily.get('precipitation_sum', [])
        humidity = daily.get('relative_humidity_2m_mean', [])
        
        records = []
        for i, date in enumerate(dates):
            temp_avg = (temp_max[i] + temp_min[i]) / 2 if temp_max[i] and temp_min[i] else None
            
            record = {
                'date': date,
                'commune': commune,
                'temp_c': round(temp_avg, 2) if temp_avg else None,
                'temp_max_c': temp_max[i],
                'temp_min_c': temp_min[i],
                'humidity': int(humidity[i]) if humidity[i] else None,
                'precip_mm': precip[i]
            }
            records.append(record)
        
        return records


class WeatherDBService:
    """
    Servicio para guardar y consultar datos climáticos en Supabase.
    """
    
    def __init__(self, supabase_client):
        """
        Inicializar servicio de BD.
        
        Args:
            supabase_client: Cliente de Supabase (postgrest)
        """
        self.supabase = supabase_client
        self.table_name = "3t_weather_data"
        logger.info(f"WeatherDBService inicializado para tabla '{self.table_name}'")
    
    def save_weather_data(self, records: List[Dict]) -> Dict:
        """
        Guardar datos climáticos en Supabase (UPSERT).
        
        Args:
            records: Lista de dicts con datos climáticos
        
        Returns:
            dict: Resultado de la operación
        
        Ejemplo:
            >>> records = [
            ...     {'date': '2024-01-01', 'commune': 'Santiago', 'temp_max_c': 32.5, ...},
            ...     {'date': '2024-01-02', 'commune': 'Santiago', 'temp_max_c': 30.1, ...}
            ... ]
            >>> result = db_service.save_weather_data(records)
        """
        try:
            logger.info(f"Guardando {len(records)} registros climáticos...")
            
            # UPSERT (insert or update si ya existe)
            response = self.supabase.table(self.table_name)\
                .upsert(records, on_conflict="date,commune")\
                .execute()
            
            logger.info(f"✓ {len(records)} registros guardados exitosamente")
            return {"success": True, "count": len(records)}
        
        except Exception as e:
            logger.error(f"Error guardando datos: {e}")
            return {"success": False, "error": str(e)}
    
    def get_weather_by_date(self, date: str, commune: Optional[str] = None) -> List[Dict]:
        """
        Obtener datos climáticos por fecha.
        
        Args:
            date: Fecha (YYYY-MM-DD)
            commune: Comuna específica (opcional)
        
        Returns:
            list: Registros encontrados
        """
        try:
            query = self.supabase.table(self.table_name).select("*").eq("date", date)
            
            if commune:
                query = query.eq("commune", commune)
            
            response = query.execute()
            return response.data
        
        except Exception as e:
            logger.error(f"Error consultando datos: {e}")
            return []
    
    def get_weather_range(self, start_date: str, end_date: str, 
                         commune: Optional[str] = None) -> pd.DataFrame:
        """
        Obtener datos climáticos en un rango de fechas.
        
        Args:
            start_date: Fecha inicio
            end_date: Fecha fin
            commune: Comuna (opcional)
        
        Returns:
            DataFrame: Datos climáticos
        """
        try:
            query = self.supabase.table(self.table_name)\
                .select("*")\
                .gte("date", start_date)\
                .lte("date", end_date)
            
            if commune:
                query = query.eq("commune", commune)
            
            query = query.order("date", desc=False)
            
            response = query.execute()
            df = pd.DataFrame(response.data)
            
            logger.info(f"✓ Obtenidos {len(df)} registros de {start_date} a {end_date}")
            return df
        
        except Exception as e:
            logger.error(f"Error consultando rango: {e}")
            return pd.DataFrame()
    
    def get_missing_dates(self, start_date: str, end_date: str, 
                         communes: List[str]) -> List[Tuple[str, str]]:
        """
        Detectar fechas faltantes por comuna.
        
        Args:
            start_date: Fecha inicio
            end_date: Fecha fin
            communes: Lista de comunas
        
        Returns:
            list: Lista de tuplas (fecha, comuna) faltantes
        """
        try:
            # Obtener todos los datos existentes
            df = self.get_weather_range(start_date, end_date)
            
            if df.empty:
                logger.warning("No hay datos en el rango especificado")
                # Todas las fechas están faltantes
                date_range = pd.date_range(start=start_date, end=end_date, freq='D')
                missing = [(date.strftime('%Y-%m-%d'), commune) 
                          for date in date_range for commune in communes]
                return missing
            
            # Crear set de combinaciones existentes
            existing = set(zip(df['date'].astype(str), df['commune']))
            
            # Crear set de combinaciones esperadas
            date_range = pd.date_range(start=start_date, end=end_date, freq='D')
            expected = set((date.strftime('%Y-%m-%d'), commune) 
                          for date in date_range for commune in communes)
            
            # Calcular faltantes
            missing = list(expected - existing)
            
            if missing:
                logger.info(f"Detectadas {len(missing)} combinaciones fecha/comuna faltantes")
            else:
                logger.info("✓ No hay fechas faltantes")
            
            return missing
        
        except Exception as e:
            logger.error(f"Error detectando fechas faltantes: {e}")
            return []


# Test básico
if __name__ == "__main__":
    # Test OpenMeteoClient
    print("="*70)
    print(" "*20 + "TEST OPEN-METEO CLIENT")
    print("="*70)
    
    client = OpenMeteoClient()
    
    # Test 1: Obtener datos históricos de Santiago (1 día)
    print("\n📅 Test 1: Histórico de Santiago (2025-01-01)")
    try:
        data = client.get_historical_for_commune("Santiago", "2025-01-01", "2025-01-01")
        print(f"✓ Respuesta recibida")
        print(f"  Latitud: {data.get('latitude')}")
        print(f"  Longitud: {data.get('longitude')}")
        print(f"  Temp máx: {data['daily']['temperature_2m_max'][0]}°C")
        print(f"  Temp mín: {data['daily']['temperature_2m_min'][0]}°C")
        print(f"  Humedad: {data['daily']['relative_humidity_2m_mean'][0]}%")
        print(f"  Precipitación: {data['daily']['precipitation_sum'][0]}mm")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 2: Parsear datos
    print("\n📊 Test 2: Parsear datos a formato estándar")
    try:
        records = client.parse_daily_data(data, "Santiago")
        print(f"✓ {len(records)} registros parseados")
        if records:
            print(f"  Ejemplo: {records[0]}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 3: Forecast
    print("\n🔮 Test 3: Forecast de Renca (7 días)")
    try:
        forecast = client.get_forecast_for_commune("Renca", days=7)
        print(f"✓ Forecast obtenido")
        print(f"  Días: {len(forecast['daily']['time'])}")
        print(f"  Próximos 3 días:")
        for i in range(min(3, len(forecast['daily']['time']))):
            date = forecast['daily']['time'][i]
            temp_max = forecast['daily']['temperature_2m_max'][i]
            temp_min = forecast['daily']['temperature_2m_min'][i]
            print(f"    {date}: {temp_min}°C - {temp_max}°C")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("\n" + "="*70)
    print("✓ Tests completados")
    print("="*70)

