# 🧪 Guía de A/B Testing - Sistema ML

## 📋 Introducción

El framework de A/B Testing permite validar el impacto real de las predicciones ML en el negocio mediante experimentos controlados. Compara un **grupo de control** (sin ML) vs un **grupo de tratamiento** (con ML) para medir métricas clave.

---

## 🎯 Tipos de Experimentos

### 1. **Precios Dinámicos**
- **Hipótesis:** Los precios sugeridos por el modelo Ridge aumentan el revenue sin afectar la demanda
- **Grupo Control:** Precios fijos tradicionales
- **Grupo Tratamiento:** Precios sugeridos por ML
- **Métricas:** Revenue promedio, pedidos, satisfacción del cliente

### 2. **Alertas de Churn**
- **Hipótesis:** Alertas proactivas de churn reducen la tasa de abandono
- **Grupo Control:** Sin alertas (gestión reactiva)
- **Grupo Tratamiento:** Alertas ML + acciones de retención
- **Métricas:** Churn rate, revenue retenido, ROI de retención

### 3. **Forecast de Demanda** (Futuro)
- **Hipótesis:** Optimizar inventario según forecast reduce costos y mejora servicio
- **Grupo Control:** Inventario basado en histórico
- **Grupo Tratamiento:** Inventario basado en forecast ML
- **Métricas:** Stock-outs, exceso de inventario, costos

---

## 🚀 Crear un Experimento

### Desde Python

```python
from ab_testing_framework import create_dynamic_pricing_experiment
from datetime import datetime

# 1. Obtener lista de clientes (desde Supabase)
customer_ids = ["customer_1", "customer_2", ..., "customer_100"]

# 2. Crear experimento
experiment = create_dynamic_pricing_experiment(
    customer_ids=customer_ids,
    start_date=datetime(2025, 11, 5),
    duration_days=30
)

# 3. El experimento asigna automáticamente grupos y guarda
print(f"Experimento creado: {experiment.experiment_id}")
print(f"Control: {len(experiment.control_group)} clientes")
print(f"Treatment: {len(experiment.treatment_group)} clientes")
```

### Desde Frontend (integración futura)

```typescript
// API endpoint para crear experimento
const createExperiment = async () => {
  const response = await fetch('/api/ml/experiments', {
    method: 'POST',
    body: JSON.stringify({
      type: 'dynamic_pricing',
      name: 'Precios Dinámicos Q4',
      duration_days: 30
    })
  });
  
  const experiment = await response.json();
  console.log('Experimento creado:', experiment.experiment_id);
};
```

---

## 📊 Registrar Resultados

### Durante la Creación de un Pedido

Cuando un cliente del experimento crea un pedido, registrar el outcome:

```python
from ab_testing_framework import ABTestExperiment
from datetime import datetime

# 1. Cargar experimento activo
experiment = ABTestExperiment.load_experiment("dynamic_pricing_20251105")

# 2. Registrar outcome del pedido
experiment.record_outcome(
    customer_id="customer_42",
    outcome={
        "revenue": 45000,
        "orders_count": 1,
        "churned": False,
        "timestamp": datetime.now()
    }
)

# 3. Guardar experimento actualizado
experiment.save_experiment()
```

### Desde el Frontend (integración futura)

```typescript
// Hook para registrar outcome
const recordExperimentOutcome = async (orderId: string) => {
  await fetch(`/api/ml/experiments/${experimentId}/outcomes`, {
    method: 'POST',
    body: JSON.stringify({
      customer_id: customerId,
      revenue: finalPrice,
      orders_count: 1,
      churned: false,
      timestamp: new Date().toISOString()
    })
  });
};
```

---

## 📈 Calcular Métricas

### Al Final del Experimento

```python
from ab_testing_framework import ABTestExperiment

# 1. Cargar experimento
experiment = ABTestExperiment.load_experiment("dynamic_pricing_20251105")

# 2. Calcular métricas
metrics = experiment.calculate_metrics()

print(f"Control Revenue Promedio: ${metrics['control']['avg_revenue_per_customer']:,.0f}")
print(f"Treatment Revenue Promedio: ${metrics['treatment']['avg_revenue_per_customer']:,.0f}")
print(f"Revenue Uplift: {metrics['uplift']['revenue_uplift_pct']:+.1f}%")
```

### Generar Reporte

```python
# 3. Generar reporte detallado
report_path = experiment.generate_report()
print(f"Reporte guardado en: {report_path}")
```

---

## 🔧 Integración con el Sistema 3T

### 1. **Verificar Grupo de Experimento al Crear Pedido**

En el frontend, antes de mostrar el precio:

```typescript
// lib/ml-api-client.ts
export async function getExperimentPrice(customerId: string, quantity: number) {
  // Verificar si hay experimento activo
  const activeExperiment = await fetch('/api/ml/experiments/active').then(r => r.json());
  
  if (activeExperiment && activeExperiment.type === 'dynamic_pricing') {
    // Verificar si el cliente está en treatment
    const isInTreatment = activeExperiment.treatment_group.includes(customerId);
    
    if (isInTreatment) {
      // Usar precio ML
      const mlPrice = await mlApi.suggestPrice({ customer_id: customerId, quantity });
      return mlPrice.suggested_price;
    }
  }
  
  // Control: precio tradicional
  return getTraditionalPrice(quantity);
}
```

### 2. **Registrar Outcome al Confirmar Pedido**

En el servidor (API route):

```typescript
// app/api/orders/route.ts
export async function POST(request: Request) {
  const order = await request.json();
  
  // ... crear pedido en Supabase ...
  
  // Registrar en experimento si aplica
  const activeExperiment = await getActiveExperiment();
  if (activeExperiment) {
    await recordExperimentOutcome({
      experiment_id: activeExperiment.id,
      customer_id: order.customer_id,
      revenue: order.final_price,
      orders_count: 1,
      churned: false
    });
  }
  
  return Response.json({ success: true });
}
```

### 3. **Dashboard de Experimentos** (Futuro)

Agregar vista en el frontend para monitorear experimentos activos:

```
/ml-insights/experiments
  → Lista de experimentos activos
  → Métricas en tiempo real
  → Gráficos de uplift
  → Botón para finalizar experimento
```

---

## 📋 Checklist de Experimento

### Antes de Lanzar
- [ ] Definir hipótesis clara
- [ ] Calcular tamaño de muestra necesario
- [ ] Configurar duración del experimento (mínimo 2 semanas)
- [ ] Validar asignación de grupos (50/50 por defecto)
- [ ] Definir métricas de éxito
- [ ] Comunicar al equipo sobre el experimento

### Durante el Experimento
- [ ] Monitorear registro de outcomes diariamente
- [ ] Verificar que ambos grupos tengan datos
- [ ] No modificar el experimento (mantener integridad)
- [ ] Registrar observaciones cualitativas

### Al Finalizar
- [ ] Calcular métricas finales
- [ ] Generar reporte
- [ ] Validar significancia estadística (futuro: test chi-cuadrado)
- [ ] Presentar resultados al equipo
- [ ] Decidir: Implementar / Iterar / Descartar

---

## 📊 Ejemplo Real: Precios Dinámicos

### Configuración

```python
# Experimento: Validar precios ML vs precios fijos
# Duración: 30 días
# Clientes: 100 (50 control, 50 treatment)

experiment = create_dynamic_pricing_experiment(
    customer_ids=all_customers,
    start_date=datetime(2025, 11, 5),
    duration_days=30
)
```

### Resultados Esperados

| Métrica | Control | Treatment | Uplift |
|---------|---------|-----------|--------|
| Revenue Promedio | $35,000 | $38,500 | **+10%** |
| Pedidos | 150 | 165 | +10% |
| Churn Rate | 12% | 11% | -1% |

### Decisión

✅ **Uplift positivo >5%** → Implementar precios ML en producción

⚠️ **Uplift 0-5%** → Iterar y mejorar modelo

❌ **Uplift negativo** → Mantener precios fijos

---

## 🔮 Próximas Mejoras

1. **Significancia Estadística:** Agregar tests estadísticos (chi-cuadrado, t-test)
2. **Tamaño de Muestra:** Calculadora de tamaño de muestra óptimo
3. **Multi-Armed Bandit:** Optimización dinámica de asignación de grupos
4. **Dashboard Web:** Visualización en tiempo real de experimentos
5. **Integración n8n:** Notificaciones automáticas de resultados

---

## 📚 Referencias

- **A/B Testing Best Practices**: [Optimizely Guide](https://www.optimizely.com/optimization-glossary/ab-testing/)
- **Statistical Significance**: [Evan Miller Calculator](https://www.evanmiller.org/ab-testing/)
- **Experiment Design**: [Google's Best Practices](https://developers.google.com/analytics/devguides/collection/analyticsjs/experiments)

---

**Última actualización:** 2025-11-04
**Versión:** 1.0.0

