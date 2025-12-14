#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de testing para API ML
Prueba todos los endpoints de la API
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8001"

def test_health():
    """Test health check"""
    print("\n" + "="*70)
    print("🔍 TEST 1: Health Check")
    print("="*70)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    assert response.status_code == 200
    print("✅ PASSED")

def test_churn_prediction():
    """Test predicción de churn"""
    print("\n" + "="*70)
    print("🔍 TEST 2: Predicción de Churn")
    print("="*70)
    
    # Caso 1: Cliente en riesgo
    data = {
        "customer_id": "test_customer_001",
        "recency_days": 120,
        "frequency": 8,
        "monetary": 150000
    }
    
    response = requests.post(f"{BASE_URL}/predict/churn", json=data)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    assert response.status_code == 200
    print("✅ PASSED")

def test_demand_forecast():
    """Test forecast de demanda"""
    print("\n" + "="*70)
    print("🔍 TEST 3: Forecast de Demanda")
    print("="*70)
    
    data = {
        "days_ahead": 7,
        "include_revenue": True
    }
    
    response = requests.post(f"{BASE_URL}/predict/demand", json=data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Forecast days: {result['forecast_days']}")
    print(f"Total orders: {result['summary']['total_predicted_orders']}")
    if 'total_predicted_revenue' in result['summary']:
        print(f"Total revenue: ${result['summary']['total_predicted_revenue']:,.0f}")
    assert response.status_code == 200
    print("✅ PASSED")

def test_route_cost():
    """Test estimación de ruta"""
    print("\n" + "="*70)
    print("🔍 TEST 4: Estimación de Costo de Ruta")
    print("="*70)
    
    # Quilicura (-33.36, -70.74)
    data = {
        "latitude": -33.36,
        "longitude": -70.74,
        "quantity": 25,
        "customer_type": "Empresa"
    }
    
    response = requests.post(f"{BASE_URL}/predict/route-cost", json=data)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    assert response.status_code == 200
    print("✅ PASSED")

def test_price_suggestion():
    """Test sugerencia de precio"""
    print("\n" + "="*70)
    print("🔍 TEST 5: Sugerencia de Precio")
    print("="*70)
    
    # Cliente Empresa frecuente
    data = {
        "customer_id": "test_empresa_001",
        "quantity": 50,
        "customer_type": "Empresa",
        "recency_days": 15,
        "frequency": 25,
        "monetary_total": 500000
    }
    
    response = requests.post(f"{BASE_URL}/predict/price", json=data)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    assert response.status_code == 200
    print("✅ PASSED")

def test_segments():
    """Test obtener segmentos"""
    print("\n" + "="*70)
    print("🔍 TEST 6: Segmentos de Clientes")
    print("="*70)
    
    response = requests.get(f"{BASE_URL}/segments")
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    assert response.status_code == 200
    print("✅ PASSED")

if __name__ == "__main__":
    print("\n" + "="*70)
    print(" "*15 + "🧪 TESTING API ML AGUA TRES TORRES")
    print("="*70)
    print(f"\nBase URL: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    try:
        test_health()
        test_churn_prediction()
        test_demand_forecast()
        test_route_cost()
        test_price_suggestion()
        test_segments()
        
        print("\n" + "="*70)
        print("✅ TODOS LOS TESTS PASARON EXITOSAMENTE")
        print("="*70 + "\n")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: No se puede conectar a la API")
        print("   Asegúrate de que la API esté corriendo:")
        print("   cd /opt/cane/3t/ml && python api/main.py")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")

