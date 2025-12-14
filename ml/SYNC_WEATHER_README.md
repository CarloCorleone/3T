# 🌤️ Sincronización de Datos Climáticos

## Descripción

Script para descargar datos históricos de clima desde **Open-Meteo API** (100% gratuita) y guardarlos en Supabase (`3t_weather_data`).

## Configuración

### Variables de entorno necesarias:

```bash
# En /opt/cane/env/ml.env o variables de sistema
export SUPABASE_URL="http://supabase-kong:8000"
export SUPABASE_SERVICE_KEY="tu_service_role_key_aqui"
```

### Dependencias:

Ya instaladas en `venv`:
- requests
- tqdm
- supabase
- pandas

## Uso

### Sincronizar último año completo (recomendado):

```bash
cd /opt/cane/3t/ml
source venv/bin/activate
python src/sync_historical_weather.py --days 365
```

**Estimado:**
- Tiempo: ~10-15 minutos
- Registros: ~10,950 (30 comunas × 365 días)
- Calls API: 30 (gratis, sin límite)

### Sincronizar rango específico:

```bash
python src/sync_historical_weather.py --start-date 2024-01-01 --end-date 2025-11-10
```

### Sincronizar solo algunas comunas:

```bash
python src/sync_historical_weather.py --days 365 --communes Santiago Renca Quilicura
```

### Test rápido (1 día):

```bash
python src/sync_historical_weather.py --start-date 2025-01-01 --end-date 2025-01-01
```

## Características

✅ **Gratis:** Open-Meteo API sin costo, sin API key
✅ **UPSERT:** No duplica datos si ejecutas dos veces
✅ **Progress bar:** Muestra avance en tiempo real
✅ **Logging:** Guarda log en `reports/weather_sync_YYYYMMDD.log`
✅ **Batch insert:** Inserta cada 100 registros para eficiencia
✅ **Error handling:** Continúa si falla una comuna

## Verificación Post-Sync

```sql
-- Verificar datos sincronizados
SELECT 
  commune,
  COUNT(*) as days_synced,
  MIN(date) as first_date,
  MAX(date) as last_date,
  ROUND(AVG(temp_max_c), 1) as avg_temp_max,
  COUNT(*) FILTER (WHERE is_hot_day) as hot_days
FROM "3t_weather_data"
GROUP BY commune
ORDER BY days_synced DESC;
```

## Automatización (Cron)

Para sincronizar diariamente el forecast:

```bash
# Agregar a crontab
crontab -e

# Sincronizar forecast cada día a las 6 AM
0 6 * * * cd /opt/cane/3t/ml && source venv/bin/activate && python src/sync_historical_weather.py --days 1 >> logs/weather_sync_cron.log 2>&1
```

## Troubleshooting

### Error: "SUPABASE_SERVICE_KEY no configurada"
**Solución:** Exportar variable o agregar a `.env`:
```bash
export SUPABASE_SERVICE_KEY="tu_key_aqui"
```

### Error: "ModuleNotFoundError: No module named 'tqdm'"
**Solución:** Instalar dependencias:
```bash
pip install tqdm supabase requests
```

### Datos duplicados
**No hay problema:** El script usa UPSERT automático.

### Sync muy lento
**Normal:** Open-Meteo puede tomar ~0.5s por comuna. Para 30 comunas = ~15 segundos por batch.

## Open-Meteo API

**Límites:**
- 10,000 calls/día (gratuito)
- Nuestro uso: ~30 calls/día (una por comuna)
- Histórico: Desde 1940
- Forecast: Hasta 16 días

**Documentación:** https://open-meteo.com/en/docs

## Estructura de Datos

```python
{
  'date': '2025-01-01',
  'commune': 'Santiago',
  'temp_c': 23.8,         # Promedio (max+min)/2
  'temp_max_c': 30.2,     # Máxima del día
  'temp_min_c': 17.4,     # Mínima del día
  'humidity': 41,         # Humedad relativa %
  'precip_mm': 0.0        # Precipitación mm
  # is_hot_day: auto-calculado si temp_max_c > 28
  # is_rainy_day: auto-calculado si precip_mm > 5
}
```

---

**Última actualización:** 2025-11-10

