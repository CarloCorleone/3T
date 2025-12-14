# 🚀 Inicio Rápido - Sistema ML

> **Para cualquier chat nuevo que necesite trabajar con el sistema ML**

---

## 📍 ¿Dónde está todo?

**Documentación principal:** `/opt/cane/3t/ml/README.md` (1,183 líneas - léelo completo)

**Resumen ejecutivo:** `/opt/cane/3t/docs/modules/ML-SISTEMA-COMPLETO.md`

---

## ⚡ Verificar Estado en 30 segundos

```bash
# 1. ¿API corriendo?
curl http://localhost:8001/health

# 2. ¿Modelos disponibles?
ls /opt/cane/3t/ml/models/*.pkl | wc -l
# Debe mostrar: 7 (6 modelos + 1 scaler)

# 3. ¿Dashboard accesible?
curl -I http://localhost:3000/ml-insights
# Debe retornar: 200 OK

# ✅ Si todo funciona, ya puedes trabajar
# ❌ Si algo falla, ver sección "Soluciones Rápidas" abajo
```

---

## 🎯 Comandos Más Usados

```bash
# Iniciar API ML
cd /opt/cane/3t/ml && ./START_API.sh

# Re-entrenar modelos (con backup automático)
cd /opt/cane/3t/ml
source venv/bin/activate
python src/retrain_pipeline.py

# Ver logs de API
tail -f /tmp/ml-api.log

# Probar endpoint
curl http://localhost:8001/segments | jq
```

---

## 🔧 Soluciones Rápidas

### API no responde

```bash
cd /opt/cane/3t/ml
pkill -f "python api/main.py"
./START_API.sh
```

### Dashboard da error

```bash
# 1. Verificar variable de entorno
grep ML_API /opt/cane/3t/.env.local

# 2. Si no existe, agregar
echo "NEXT_PUBLIC_ML_API_URL=http://localhost:8001" >> /opt/cane/3t/.env.local

# 3. Reiniciar Next.js
cd /opt/cane/3t
pkill -f "next dev"
npm run dev
```

### Modelos no encontrados

```bash
cd /opt/cane/3t/ml
source venv/bin/activate
python src/train_all_models.py
# Duración: ~10 minutos
```

---

## 📚 Qué Leer Primero

1. **Este archivo** (ya lo estás leyendo) ✅
2. **`/opt/cane/3t/ml/README.md`** - Documentación completa
3. **`/opt/cane/3t/ml/RESULTADOS_MODELOS.md`** - Métricas de modelos
4. **`/opt/cane/3t/docs/modules/ML-INSIGHTS.md`** - Dashboard frontend

---

## 🚨 Reglas de Oro

1. ✅ **Siempre hacer backup** antes de modificar modelos
2. ✅ **Leer README.md completo** antes de cambios importantes
3. ✅ **Verificar /health** después de reiniciar API
4. ❌ **NO eliminar** archivos .pkl sin backup
5. ❌ **NO re-entrenar** en horario laboral (consume CPU)

---

## 🎓 Arquitectura en 1 Minuto

```
Frontend (Next.js, port 3000)
    ↓ HTTP REST
API ML (FastAPI, port 8001)
    ↓ pickle.load()
6 Modelos .pkl (Prophet, XGBoost, etc.)
    ↓ predict()
Predicciones → Frontend → Usuario
```

**Todo el código está en:** `/opt/cane/3t/ml/`

---

## 📞 Siguiente Paso

**Abre y lee:** `/opt/cane/3t/ml/README.md` (tiene TODO lo que necesitas saber)

---

**Última actualización:** 2025-11-04
