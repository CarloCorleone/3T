# 🤖 ML Insights - Machine Learning Dashboard

## 📋 Descripción

**ML Insights** es el dashboard de predicciones y análisis con Machine Learning, integrado directamente en la aplicación 3T. Muestra predicciones de demanda, segmentación de clientes, alertas de churn y más.

---

## 🎯 Funcionalidades

### 1. **Forecast de Demanda**
- Predicción de pedidos para próximos 30 días
- Predicción de revenue diario y mensual
- Intervalos de confianza (lower/upper bounds)
- Identificación de días pico y bajos
- Visualización de tendencias

### 2. **Segmentación de Clientes (RFM)**
- 4 segmentos automáticos:
  - **👑 VIP Champions**: Alto valor, alta frecuencia, reciente
  - **💚 Clientes Leales**: Frecuencia media, valor estable
  - **💡 Potenciales**: Valor medio, pueden crecer
  - **⚠️ En Riesgo**: Inactivos >90 días, riesgo de churn
- Métricas por segmento: Recency, Frequency, Monetary
- Distribución de clientes y valor total

### 3. **Alertas de Churn** (en desarrollo)
- Predicción de probabilidad de abandono
- Clientes en riesgo identificados
- Recomendaciones de retención
- Integración con notificaciones (próximamente)

---

## 🏗️ Arquitectura Técnica

### Frontend (Next.js)
```
/app/ml-insights/page.tsx       → Página principal del dashboard
/lib/ml-api-client.ts           → Cliente API para conectar con FastAPI
/components/app-sidebar.tsx     → Menú de navegación (sección ML)
```

### Backend (FastAPI)
```
/ml/api/main.py                 → API REST con endpoints de predicción
/ml/models/                     → Modelos entrenados (.pkl)
/ml/data/processed/             → Datasets consolidados
```

### Flujo de Datos
```
Frontend (React) 
    ↓ fetch()
ML API Client (/lib/ml-api-client.ts)
    ↓ HTTP POST/GET
FastAPI (/ml/api/main.py:8001)
    ↓ pickle.load()
Modelos ML (/ml/models/*.pkl)
    ↓ predict()
Respuesta JSON → Frontend
```

---

## 🔧 Configuración

### ✅ Configuración Automática (Proxy Interno)

**Desde 2025-11-18**, la aplicación usa un proxy interno que NO requiere configuración adicional.

El cliente ML automáticamente usa `/api/ml` que redirige internamente a la API ML:

```typescript
// Cliente ML (automático)
const ML_API_BASE_URL = '/api/ml';  // ✅ Proxy interno
```

**Ventajas:**
- ✅ Funciona en móviles sin configuración
- ✅ Funciona en navegadores incógnito
- ✅ No requiere variables de entorno adicionales
- ✅ Más seguro (API no expuesta públicamente)

### 1. Variables de Entorno (Opcional)

**Solo si necesitas cambiar la URL de la API ML:**

Agregar a `/opt/cane/env/3t.env`:

```bash
# Cambiar URL interna de la API ML (opcional)
# Por defecto usa: http://172.20.0.1:8001 (gateway de Docker)
ML_API_INTERNAL_URL=http://IP_CUSTOM:8001
```

**Nota:** La variable `NEXT_PUBLIC_ML_API_URL` ya NO se usa (deprecada).

### 2. Iniciar la API ML

```bash
# Activar entorno virtual
cd /opt/cane/3t/ml
source venv/bin/activate

# Iniciar API
python api/main.py

# O usar el script wrapper
./START_API.sh
```

La API estará disponible en: `http://localhost:8001`
- Docs interactivos: `http://localhost:8001/docs`
- Health check: `http://localhost:8001/health`

### 3. Iniciar Frontend 3T

```bash
cd /opt/cane/3t
npm run dev
```

Acceder a: `http://localhost:3000/ml-insights`

---

## 📡 Endpoints de la API

### GET /health
Health check del sistema ML.

**Respuesta:**
```json
{
  "status": "healthy",
  "models": {
    "xgboost_churn": "loaded",
    "prophet_demand": "loaded",
    "kmeans_segmentation": "loaded"
  }
}
```

### POST /predict/demand
Forecast de demanda para próximos N días.

**Request:**
```json
{
  "days_ahead": 30,
  "include_revenue": true
}
```

**Response:**
```json
{
  "forecast_days": 30,
  "predictions": [
    {
      "date": "2025-11-05",
      "predicted_orders": 4,
      "lower_bound": 1,
      "upper_bound": 7,
      "predicted_revenue": 137227,
      "revenue_lower_bound": 50000,
      "revenue_upper_bound": 250000
    }
  ],
  "summary": {
    "total_predicted_orders": 114,
    "avg_daily_orders": 3.8,
    "peak_day": "2025-11-15",
    "low_day": "2025-11-07",
    "total_predicted_revenue": 4116820,
    "avg_daily_revenue": 137227
  }
}
```

### GET /segments
Obtener segmentos de clientes (RFM).

**Response:**
```json
{
  "total_customers": 78,
  "segments": [
    {
      "cluster_id": 3,
      "customer_count": 6,
      "avg_recency_days": 6,
      "avg_frequency": 57.2,
      "avg_monetary": 3421280,
      "total_value": 20527680
    }
  ],
  "timestamp": "2025-11-04T12:00:00Z"
}
```

### POST /predict/churn
Predicción de probabilidad de churn para un cliente.

**Request:**
```json
{
  "customer_id": "4042bd0e",
  "recency_days": 120,
  "frequency": 3,
  "monetary": 45000
}
```

**Response:**
```json
{
  "customer_id": "4042bd0e",
  "churn_probability": 0.85,
  "is_high_risk": true,
  "risk_level": "alto",
  "recommendation": "Contactar urgente con oferta personalizada",
  "days_until_action": 7
}
```

---

## 🎨 Componentes UI

### Tab: Forecast de Demanda
- **Cards de Resumen**: Total pedidos, revenue, días pico/bajo
- **Tabla de Predicciones**: Próximos 7 días con intervalos
- **Gráficos** (próximamente): Visualización temporal con Recharts

### Tab: Segmentos
- **Cards por Segmento**: Color-coded, con métricas RFM
- **Distribución**: Clientes y valor total por segmento
- **Badges**: Visualización de porcentajes

### Tab: Alertas Churn
- **Lista de Clientes en Riesgo**: Ordenados por valor
- **Acciones Recomendadas**: Botones para contactar/notificar
- **Timeline**: Días sin comprar

---

## 🔐 Permisos y Roles

**Acceso:**
- ✅ **Admin**: Acceso completo al dashboard ML
- ❌ **Operador**: Sin acceso (próximamente: solo visualización)
- ❌ **Repartidor**: Sin acceso

**Configuración en `/components/app-sidebar.tsx`:**
```typescript
const mlItems = [
  {
    title: "ML Insights",
    icon: Brain,
    href: "/ml-insights",
    roles: ['admin'] as UserRole[],
    badge: "AI",
  },
]
```

---

## 📊 Modelos Entrenados

| Modelo | Algoritmo | Objetivo | Archivo |
|--------|-----------|----------|---------|
| **Churn** | XGBoost | Predecir abandono | `xgboost_churn.pkl` |
| **Demanda (Pedidos)** | Prophet | Forecast pedidos | `prophet_demand.pkl` |
| **Demanda (Revenue)** | Prophet | Forecast revenue | `prophet_revenue.pkl` |
| **Rutas** | Random Forest | Estimar distancias | `random_forest_routes.pkl` |
| **Precios** | Ridge Regression | Sugerir precios | `ridge_pricing.pkl` |
| **Segmentación** | KMeans | Agrupar clientes | `kmeans_segmentation.pkl` |

---

## 🚀 Próximas Funcionalidades

### En Desarrollo
- [ ] Gráficos interactivos con Recharts
- [ ] Exportar predicciones a CSV
- [ ] Notificaciones push de alertas de churn
- [ ] Recomendaciones de precios en pedidos
- [ ] Widget de forecast en Dashboard principal

### Integración con n8n
- [ ] Workflow: Alerta automática de churn (email/Slack)
- [ ] Workflow: Report semanal de forecast
- [ ] Workflow: Re-entrenamiento mensual automático

### Dashboard Avanzado
- [ ] Heatmap geográfico de predicciones
- [ ] Comparación forecast vs real
- [ ] A/B Testing de precios dinámicos
- [ ] Simulador de escenarios

---

## 🔧 Troubleshooting

### ✅ Error: "Load failed" en Móviles/Incógnito (RESUELTO)

**Síntomas:** Error de conexión en dispositivos móviles o navegador incógnito.

**Estado:** ✅ **RESUELTO desde 2025-11-18**

**Causa:** La app intentaba conectar a `localhost:8001` desde el navegador del cliente.

**Solución implementada:** Proxy interno `/api/ml` que redirige server-side.

**Documentación completa:** Ver `/docs/troubleshooting/FIX-ML-INSIGHTS-MOBILE-2025-11-18.md`

---

### Error: "Error al conectar con API ML"

**Causa:** La API ML no está corriendo en el host.

**Solución:**
```bash
cd /opt/cane/3t/ml
./START_API.sh

# O manualmente:
source venv/bin/activate
python api/main.py
```

**Verificar:**
```bash
# Debe responder con status "healthy"
curl http://localhost:8001/health
```

---

### Error: 503 Service Unavailable en `/api/ml/*`

**Causa:** El proxy no puede conectarse a la API ML.

**Diagnóstico:**
```bash
# 1. Verificar que la API ML esté corriendo
ps aux | grep "python api/main.py"

# 2. Probar desde el contenedor
docker exec 3t-app wget -q -O- http://172.20.0.1:8001/health

# 3. Verificar gateway de red Docker
docker inspect cane_net | jq -r '.[0].IPAM.Config[0].Gateway'
# Debe ser: 172.20.0.1
```

**Solución:**
- Iniciar API ML: `cd /opt/cane/3t/ml && ./START_API.sh`
- Si el gateway cambió, actualizar en `/app/api/ml/[...path]/route.ts`

---

### Predicciones Incorrectas

**Causa:** Modelos desactualizados.

**Solución:**
```bash
cd /opt/cane/3t/ml
source venv/bin/activate
python src/train_all_models.py  # Re-entrenar modelos
```

---

## 📚 Referencias

- **[RESULTADOS_MODELOS.md](/opt/cane/3t/ml/RESULTADOS_MODELOS.md)**: Métricas de entrenamiento
- **[/ml/notebooks/01_eda_analisis_exploratorio.py](/opt/cane/3t/ml/notebooks/)**: Análisis exploratorio
- **[Prophet Documentation](https://facebook.github.io/prophet/)**: Prophet by Meta
- **[XGBoost Documentation](https://xgboost.readthedocs.io/)**: XGBoost

---

## 👨‍💻 Mantenimiento

### Re-entrenar Modelos (Mensual)

```bash
cd /opt/cane/3t/ml
source venv/bin/activate

# 1. Actualizar dataset
python src/consolidate_data.py

# 2. Re-entrenar modelos
python src/train_all_models.py

# 3. Reiniciar API
pkill -f "python api/main.py"
./START_API.sh
```

### Backup de Modelos

```bash
cd /opt/cane/3t/ml
tar -czf models_backup_$(date +%Y%m%d).tar.gz models/
mv models_backup_*.tar.gz /opt/cane/volumes/backups/
```

---

## 📞 Soporte

**Errores o preguntas:**
- Revisar logs de la API: `/opt/cane/3t/ml/api/logs/`
- Consultar documentación técnica completa
- Contactar al equipo de desarrollo

---

**Última actualización:** 2025-11-04
**Versión:** 1.0.0

