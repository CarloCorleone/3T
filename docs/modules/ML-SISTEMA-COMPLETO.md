# 🤖 Sistema ML - Resumen Ejecutivo

> **Documento de Referencia Rápida para IAs y Desarrolladores**

---

## 📍 Ubicación y Acceso Rápido

- **Documentación Principal:** `/opt/cane/3t/ml/README.md` (1,183 líneas)
- **Dashboard Frontend:** `http://localhost:3000/ml-insights`
- **API REST:** `http://localhost:8001` ([docs](http://localhost:8001/docs))
- **Estado:** ✅ Producción desde 2025-11-03

---

## 🎯 ¿Qué hace el Sistema ML?

Sistema completo de Machine Learning que proporciona:

1. **Predicción de Demanda** → Forecast de pedidos/revenue (30 días)
2. **Detección de Churn** → Clientes en riesgo de abandono
3. **Segmentación RFM** → 4 grupos de clientes por comportamiento
4. **Optimización de Rutas** → Estimación de costos y tiempos
5. **Precios Dinámicos** → Sugerencias personalizadas por cliente

---

## 🏗️ Arquitectura en 3 Capas

```
┌─────────────────────────────────────────────┐
│ FRONTEND (Next.js)                          │
│ /app/ml-insights/page.tsx                   │
│ /lib/ml-api-client.ts                       │
└──────────────┬──────────────────────────────┘
               │ HTTP REST (port 8001)
┌──────────────▼──────────────────────────────┐
│ API REST (FastAPI)                          │
│ /ml/api/main.py                             │
│ • /health  • /segments                      │
│ • /predict/demand  • /predict/churn         │
│ • /predict/route-cost  • /predict/price     │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 6 MODELOS ML (.pkl)                         │
│ • Prophet (Demand/Revenue)                  │
│ • XGBoost (Churn)                           │
│ • Random Forest (Routes)                    │
│ • Ridge (Pricing)                           │
│ • KMeans (Segmentation)                     │
└─────────────────────────────────────────────┘
```

---

## 📂 Estructura de Archivos Clave

```
/opt/cane/3t/ml/
├── api/main.py              ← API REST (CORE)
├── models/                  ← 6 modelos .pkl
├── data/
│   ├── raw/                 ← CSVs originales
│   └── processed/           ← dataset_completo.csv, rfm_segments.csv
├── src/
│   ├── consolidate_data.py      ← Preparación de datos
│   ├── train_all_models.py      ← Entrenamiento
│   ├── retrain_pipeline.py      ← Re-entrenamiento automático
│   └── ab_testing_framework.py  ← A/B testing
├── n8n-workflows/          ← 3 workflows de automatización
├── START_API.sh            ← Iniciar API ML
├── RESULTADOS_MODELOS.md   ← Métricas de modelos
└── README.md               ← Documentación completa (⭐ LEER)
```

**Frontend:**
```
/opt/cane/3t/
├── app/ml-insights/page.tsx     ← Dashboard ML
├── lib/ml-api-client.ts         ← Cliente TypeScript
└── .env.local                   ← NEXT_PUBLIC_ML_API_URL=http://localhost:8001
```

---

## 🚀 Comandos Rápidos

### Iniciar Sistema ML

```bash
# 1. Iniciar API ML
cd /opt/cane/3t/ml && ./START_API.sh

# 2. Verificar salud
curl http://localhost:8001/health

# 3. Acceder al dashboard
# http://localhost:3000/ml-insights (rol: admin)
```

### Re-entrenar Modelos

```bash
cd /opt/cane/3t/ml
source venv/bin/activate
python src/retrain_pipeline.py
# Duración: ~10 minutos
# Backup automático antes de re-entrenar
```

### Ver Estado

```bash
# API corriendo?
ps aux | grep "python api/main.py"

# Modelos disponibles?
ls -lh /opt/cane/3t/ml/models/*.pkl

# Logs de API
tail -f /tmp/ml-api.log
```

---

## 🔧 Troubleshooting Rápido

### ❌ Dashboard muestra "Failed to fetch"

```bash
# 1. Verificar API
curl http://localhost:8001/health

# 2. Si no responde, iniciar
cd /opt/cane/3t/ml && ./START_API.sh

# 3. Verificar variable de entorno
cat /opt/cane/3t/.env.local | grep ML_API
# Debe mostrar: NEXT_PUBLIC_ML_API_URL=http://localhost:8001

# 4. Si falta, agregar y reiniciar Next.js
echo "NEXT_PUBLIC_ML_API_URL=http://localhost:8001" >> /opt/cane/3t/.env.local
cd /opt/cane/3t && pkill -f "next dev" && npm run dev
```

### ❌ Endpoint retorna 500 Internal Server Error

```bash
# Ver logs de la API
tail -30 /tmp/ml-api.log

# Causas comunes:
# - Archivo rfm_segments.csv falta → Ejecutar: python notebooks/01_eda_analisis_exploratorio.py
# - Modelos .pkl faltan → Ejecutar: python src/train_all_models.py
# - Datos corruptos → Re-consolidar: python src/consolidate_data.py
```

---

## 📊 6 Modelos ML

| Modelo | Archivo | Propósito | Accuracy |
|--------|---------|-----------|----------|
| **KMeans** | `kmeans_segmentation.pkl` | Segmentación (RFM) | Silhouette: 0.453 |
| **XGBoost** | `xgboost_churn.pkl` | Predicción churn | 100% |
| **Prophet** | `prophet_demand.pkl` | Forecast pedidos | MAE: Variable |
| **Prophet** | `prophet_revenue.pkl` | Forecast revenue | MAE: Variable |
| **Random Forest** | `random_forest_routes.pkl` | Optimización rutas | R²: 1.000 |
| **Ridge** | `ridge_pricing.pkl` | Precios dinámicos | R²: 0.392 |

---

## 🌐 Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/segments` | Segmentos RFM (4 grupos) |
| `POST` | `/predict/demand` | Forecast N días |
| `POST` | `/predict/churn` | Probabilidad churn |
| `POST` | `/predict/route-cost` | Costo entrega |
| `POST` | `/predict/price` | Precio sugerido |

**Docs interactivos:** `http://localhost:8001/docs`

---

## ⚙️ Workflows n8n (Automatización)

3 workflows configurados (importar desde `/opt/cane/3t/ml/n8n-workflows/`):

1. **Alerta Churn** (Quincenal) → Email + Slack con clientes en riesgo
2. **Predicción Compras** (Semanal) → Reporte de oportunidades de venta
3. **Re-entrenamiento** (Mensual) → Actualiza modelos automáticamente

---

## 🎨 Dashboard Frontend

**URL:** `http://localhost:3000/ml-insights` (Solo admin)

**3 Tabs:**
1. **Forecast de Demanda**: Predicción 30 días + resumen
2. **Segmentos**: 4 grupos RFM con métricas
3. **Alertas Churn**: (Placeholder - en desarrollo)

**Actualización:** Cada vez que se carga la página (llama a API ML)

---

## 🔄 Pipeline de Datos

```
CSVs (raw) 
  ↓ consolidate_data.py
dataset_completo.csv + rfm_segments.csv
  ↓ train_all_models.py (o retrain_pipeline.py)
6 Modelos .pkl
  ↓ API ML (main.py)
Predicciones vía REST
  ↓ Frontend (ml-insights/page.tsx)
Dashboard visualización
```

---

## 📚 Documentos de Referencia

| Documento | Propósito | Líneas |
|-----------|-----------|--------|
| `/opt/cane/3t/ml/README.md` | **Documentación completa** | 1,183 |
| `/opt/cane/3t/ml/RESULTADOS_MODELOS.md` | Métricas de entrenamiento | 289 |
| `/opt/cane/3t/ml/RESUMEN_INTEGRACION.md` | Resumen de integración | ~300 |
| `/opt/cane/3t/ml/docs/AB_TESTING_GUIDE.md` | Guía A/B testing | 301 |
| `/opt/cane/3t/docs/modules/ML-INSIGHTS.md` | Dashboard frontend | 376 |

**⭐ Para entender el sistema completo:** Leer `/opt/cane/3t/ml/README.md`

---

## 🎓 Para Nuevos Chats de IA

### Contexto Esencial

1. **Sistema ML integrado** a la app 3T desde nov 2025
2. **6 modelos entrenados** con datos reales (78 clientes, 982 pedidos)
3. **API REST funcional** en puerto 8001
4. **Dashboard admin** en `/ml-insights`
5. **3 workflows n8n** listos para importar
6. **Re-entrenamiento mensual** automático configurado

### Antes de Modificar

- ✅ Leer `/opt/cane/3t/ml/README.md` completo
- ✅ Verificar que la API esté corriendo (`curl http://localhost:8001/health`)
- ✅ Hacer backup de modelos antes de re-entrenar
- ✅ Probar cambios en desarrollo antes de producción
- ✅ Documentar cualquier cambio significativo

### Comandos Útiles

```bash
# Ver estructura del proyecto ML
tree -L 2 /opt/cane/3t/ml/

# Verificar modelos
ls -lh /opt/cane/3t/ml/models/

# Ver logs
tail -f /tmp/ml-api.log

# Estado de la API
curl http://localhost:8001/health | jq

# Re-entrenar (con backup automático)
cd /opt/cane/3t/ml && source venv/bin/activate && python src/retrain_pipeline.py
```

---

## 🚨 Advertencias Importantes

### ⚠️ NO Hacer

- ❌ Eliminar modelos `.pkl` sin backup
- ❌ Modificar estructura de `rfm_segments.csv` (columnas esperadas por API)
- ❌ Cambiar puerto 8001 sin actualizar frontend
- ❌ Re-entrenar en horario laboral (consume CPU ~15 min)
- ❌ Modificar código de API sin reiniciarla

### ✅ Hacer Siempre

- ✅ Backup antes de re-entrenar (automático en `retrain_pipeline.py`)
- ✅ Validar salud de API después de cambios (`/health`)
- ✅ Documentar cambios en este archivo o README.md
- ✅ Probar endpoints después de modificar API
- ✅ Verificar que frontend sigue funcionando

---

## 🔮 Roadmap

### Completado ✅
- [x] 6 modelos ML entrenados
- [x] API REST con 6 endpoints
- [x] Dashboard frontend integrado
- [x] 3 workflows n8n
- [x] Pipeline de re-entrenamiento
- [x] Framework A/B testing
- [x] Documentación completa

### Próximos Pasos 🚀
- [ ] Monitoreo de accuracy en producción
- [ ] Gráficos interactivos (Recharts)
- [ ] Integración WhatsApp alertas
- [ ] Dashboard de métricas de modelos
- [ ] Primer experimento A/B

---

## 📞 Ayuda Rápida

**Si algo falla:**
1. Leer sección **Troubleshooting** en `/opt/cane/3t/ml/README.md`
2. Verificar logs: `tail -f /tmp/ml-api.log`
3. Verificar modelos: `ls -lh /opt/cane/3t/ml/models/`
4. Reiniciar API: `cd /opt/cane/3t/ml && ./START_API.sh`

**Para dudas técnicas:**
- Consultar README completo: `/opt/cane/3t/ml/README.md`
- Ver ejemplos de uso en docs
- Revisar código de API: `api/main.py`

---

**Última actualización:** 2025-11-04  
**Versión:** 1.0.0  
**Estado:** ✅ Producción funcionando correctamente


