#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================
COORDENADAS GPS DE COMUNAS - SANTIAGO, CHILE
Sistema ML Agua Tres Torres
============================================
Coordenadas (latitud, longitud) de las 30 comunas
normalizadas en la base de datos.

Usadas para consultas a Open-Meteo API.
"""

# Coordenadas GPS (lat, lon) por comuna
# Formato: "Comuna": {"lat": latitud, "lon": longitud}
COMMUNES_COORDS = {
    # Zona Norte
    "Quilicura": {"lat": -33.3626, "lon": -70.7394},
    "Renca": {"lat": -33.4056, "lon": -70.6896},
    "Conchalí": {"lat": -33.3894, "lon": -70.6726},
    "Quinta Normal": {"lat": -33.4356, "lon": -70.6978},
    "Cerrillos": {"lat": -33.4978, "lon": -70.7097},
    "Estación Central": {"lat": -33.4594, "lon": -70.6897},
    "Pedro Aguirre Cerda": {"lat": -33.4914, "lon": -70.6678},
    "Lampa": {"lat": -33.2881, "lon": -70.8784},
    "Colina": {"lat": -33.1997, "lon": -70.6719},
    "Chicureo": {"lat": -33.2789, "lon": -70.6517},
    
    # Zona Centro
    "Santiago": {"lat": -33.4489, "lon": -70.6693},
    "Providencia": {"lat": -33.4267, "lon": -70.6105},
    "Las Condes": {"lat": -33.4160, "lon": -70.5832},
    "Vitacura": {"lat": -33.3796, "lon": -70.5792},
    "La Reina": {"lat": -33.4489, "lon": -70.5329},
    "Ñuñoa": {"lat": -33.4569, "lon": -70.5978},
    "San Miguel": {"lat": -33.4981, "lon": -70.6515},
    "San Joaquin": {"lat": -33.4983, "lon": -70.6222},
    "Macul": {"lat": -33.4875, "lon": -70.5972},
    
    # Zona Oriente
    "Peñalolen": {"lat": -33.4962, "lon": -70.5414},
    "La Florida": {"lat": -33.5228, "lon": -70.5989},
    "Puente Alto": {"lat": -33.6111, "lon": -70.5756},
    "Pirque": {"lat": -33.6670, "lon": -70.5855},
    
    # Zona Sur
    "San Bernardo": {"lat": -33.5925, "lon": -70.7006},
    "Buin": {"lat": -33.7333, "lon": -70.7433},
    "El Monte": {"lat": -33.6833, "lon": -71.0167},
    
    # Zona Poniente
    "Maipú": {"lat": -33.5108, "lon": -70.7559},
    "Pudahuel": {"lat": -33.4394, "lon": -70.7594},
    "Melipilla": {"lat": -33.6872, "lon": -71.2161},
    
    # Zona Sur (Región de O'Higgins)
    "Requínoa": {"lat": -34.2922, "lon": -70.8292},
}

# Lista de comunas válidas (ordenada alfabéticamente)
VALID_COMMUNES = sorted(list(COMMUNES_COORDS.keys()))

# Total de comunas
TOTAL_COMMUNES = len(VALID_COMMUNES)

# Función helper para obtener coordenadas
def get_commune_coords(commune: str) -> dict:
    """
    Obtiene las coordenadas GPS de una comuna.
    
    Args:
        commune: Nombre de la comuna (normalizado)
    
    Returns:
        dict con 'lat' y 'lon', o None si no existe
    """
    return COMMUNES_COORDS.get(commune)

# Función helper para validar comuna
def is_valid_commune(commune: str) -> bool:
    """
    Valida si una comuna está en la lista válida.
    
    Args:
        commune: Nombre de la comuna
    
    Returns:
        bool: True si es válida
    """
    return commune in VALID_COMMUNES

if __name__ == "__main__":
    # Test básico
    print(f"Total de comunas configuradas: {TOTAL_COMMUNES}")
    print(f"\nComunas válidas:")
    for i, commune in enumerate(VALID_COMMUNES, 1):
        coords = get_commune_coords(commune)
        print(f"{i:2d}. {commune:<25} → lat: {coords['lat']:.4f}, lon: {coords['lon']:.4f}")

