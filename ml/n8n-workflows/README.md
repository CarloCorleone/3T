# Workflows n8n para Sistema ML

Esta carpeta contiene 3 workflows de n8n para automatizar las operaciones del sistema de Machine Learning de Agua Tres Torres.

---

## 📦 Workflows Incluidos

### 1. **Alerta Churn Clientes** (`01_alerta_churn_clientes.json`)
- **Trigger:** Quincenal (días 1 y 15 de cada mes)
- **Descripción:** Detecta clientes en riesgo de churn y envía alertas al equipo de ventas
- **Flujo:**
  1. Obtener predicciones de churn de la API ML
  2. Filtrar clientes con alta probabilidad (>70%)
  3. Obtener datos completos de Supabase
  4. Enviar notificación a Slack (#ventas)
  5. Enviar email detallado al equipo de ventas
  6. Registrar evento en activity log

### 2. **Predicción de Compras** (`02_prediccion_compras_cliente.json`)
- **Trigger:** Semanal (Lunes a las 8:00 AM)
- **Descripción:** Genera reporte semanal de forecast de demanda y probabilidad de compra por cliente
- **Flujo:**
  1. Obtener forecast semanal de la API ML
  2. Consultar top 50 clientes activos en Supabase
  3. Calcular probabilidad de compra de cada cliente
  4. Filtrar clientes con probabilidad >40%
  5. Enviar reporte por email con recomendaciones
  6. Notificar resumen a Slack (#ventas)

### 3. **Re-entrenamiento Mensual** (`03_reentrenamiento_mensual.json`)
- **Trigger:** Mensual (día 1 a las 2:00 AM)
- **Descripción:** Ejecuta pipeline de re-entrenamiento automático de modelos ML
- **Flujo:**
  1. Notificar inicio a Slack (#desarrollo)
  2. Ejecutar script `retrain_pipeline.py`
  3. Si exitoso:
     - Listar modelos actualizados
     - Obtener reporte de entrenamiento
     - Notificar a Slack y email con resumen
     - Registrar en activity log
  4. Si falla:
     - Notificar error a Slack
     - Enviar email con detalles del error
     - Registrar en activity log

---

## 🔧 Requisitos Previos

### 1. API ML Corriendo
```bash
cd /opt/cane/3t/ml
./START_API.sh
```
La API debe estar accesible en `http://localhost:8001`

### 2. Credenciales n8n Configuradas

Necesitas configurar las siguientes credenciales en n8n:

#### a) **Supabase API** (ID: 1)
- **Tipo:** `Supabase`
- **Host:** `http://supabase-kong:8000` (interno Docker) o URL pública
- **Service Role Key:** (de `/opt/cane/env/supabase.env`)

#### b) **Slack API** (ID: 2)
- **Tipo:** `Slack`
- **OAuth Token:** Token de bot con permisos de `chat:write`
- **Canales requeridos:** `#ventas`, `#desarrollo`

#### c) **SMTP Email** (ID: 3)
- **Tipo:** `SMTP`
- **Host:** smtp.gmail.com (ejemplo)
- **Port:** 587
- **User:** tu-email@gmail.com
- **Password:** App password (si es Gmail)
- **From:** aguatrestorres@gmail.com

---

## 📥 Cómo Importar los Workflows

### Método 1: Via Interfaz Web de n8n

1. Acceder a n8n: `http://localhost:5678`
2. Ir a **Workflows** → **Import from File**
3. Seleccionar cada archivo JSON de esta carpeta
4. Configurar las credenciales (IDs pueden cambiar)
5. Activar el workflow

### Método 2: Via CLI (Recomendado)

```bash
# 1. Copiar workflows al contenedor de n8n
docker cp /opt/cane/3t/ml/n8n-workflows/*.json n8n:/tmp/

# 2. Importar usando n8n CLI (dentro del contenedor)
docker exec -it n8n n8n import:workflow --input=/tmp/01_alerta_churn_clientes.json
docker exec -it n8n n8n import:workflow --input=/tmp/02_prediccion_compras_cliente.json
docker exec -it n8n n8n import:workflow --input=/tmp/03_reentrenamiento_mensual.json
```

### Método 3: Via MCP Server n8n (Cursor/Claude)

Si tienes el MCP Server de n8n configurado:

```typescript
// Usar herramienta n8n_create_workflow desde Cursor
await n8nMcp.createWorkflow({
  workflow: JSON.parse(fs.readFileSync('01_alerta_churn_clientes.json', 'utf-8'))
});
```

---

## ⚙️ Configuración Post-Importación

### 1. Verificar Credenciales

Cada workflow usa credenciales con IDs específicos. Si tus IDs son diferentes:

1. Abrir workflow en n8n
2. Click en cada nodo que use credenciales (Supabase, Slack, SMTP)
3. Seleccionar la credencial correcta del dropdown
4. Guardar workflow

### 2. Ajustar URLs

Si la API ML no está en `http://localhost:8001`, actualizar en los nodos:
- **Obtener Predicciones Churn** → URL del endpoint
- **Obtener Forecast Semanal** → URL del endpoint

### 3. Personalizar Canales y Emails

Actualizar en los nodos de notificación:
- **Slack:** Cambiar canales según tu workspace
- **Email:** Cambiar destinatarios según tu equipo

### 4. Probar Manualmente

Antes de activar los triggers automáticos:

1. Abrir workflow
2. Click en **Execute Workflow** (inicio manual)
3. Verificar que cada nodo se ejecuta correctamente
4. Revisar notificaciones en Slack/Email

---

## 🎯 Activación de Workflows

### Workflow 1: Alerta Churn
- **Frecuencia:** Quincenal (días 1 y 15)
- **Recomendación:** Activar solo si tienes >50 clientes activos
- **Impacto:** Emails + Slack notifications cada 15 días

### Workflow 2: Predicción de Compras
- **Frecuencia:** Semanal (Lunes 8AM)
- **Recomendación:** Activar para reportes semanales al equipo de ventas
- **Impacto:** 1 email + 1 Slack notification por semana

### Workflow 3: Re-entrenamiento
- **Frecuencia:** Mensual (día 1 a las 2AM)
- **Recomendación:** Activar en producción cuando los modelos estén estables
- **Impacto:** 
  - ~15 minutos de CPU/RAM intensivo
  - Email + Slack notification 1 vez al mes
  - Requiere reinicio manual de API ML después

---

## 🔍 Monitoreo

### Ver Ejecuciones
1. n8n → **Executions**
2. Filtrar por workflow name
3. Ver logs y outputs de cada ejecución

### Logs de Errores
- n8n guarda logs automáticamente
- Para debugging, revisar stdout/stderr de nodos `Execute Command`

---

## 🛠️ Troubleshooting

### Error: "API ML no responde"
```bash
# Verificar que la API esté corriendo
curl http://localhost:8001/health

# Si no responde, iniciar API
cd /opt/cane/3t/ml && ./START_API.sh
```

### Error: "Credenciales inválidas"
- Verificar que las credenciales estén correctamente configuradas en n8n
- Revisar permisos de Supabase (Service Role Key)
- Verificar token de Slack

### Error: "Comando fallido" (Re-entrenamiento)
- Verificar que el entorno virtual existe: `/opt/cane/3t/ml/venv`
- Revisar logs en: `/opt/cane/3t/ml/reports/retrain_*.log`
- Ejecutar manualmente para debug:
  ```bash
  cd /opt/cane/3t/ml
  source venv/bin/activate
  python src/retrain_pipeline.py
  ```

### Notificaciones no llegan
- **Slack:** Verificar que el bot tenga permisos en los canales
- **Email:** Verificar configuración SMTP (test con `telnet smtp.gmail.com 587`)

---

## 📊 Métricas Esperadas

### Workflow 1: Alertas Churn
- **Ejecuciones:** 2 por mes
- **Clientes alertados:** 5-20 por ejecución (promedio)
- **Valor en riesgo:** $500,000 - $2,000,000 (total)

### Workflow 2: Predicción de Compras
- **Ejecuciones:** 4 por mes (semanal)
- **Clientes con predicción:** 10-30 por semana
- **Conversión esperada:** 30-50% de clientes contactados

### Workflow 3: Re-entrenamiento
- **Ejecuciones:** 1 por mes
- **Duración:** 10-15 minutos
- **Tasa de éxito:** >95%

---

## 🚀 Próximas Mejoras

- [ ] Agregar A/B testing para validar efectividad de alertas
- [ ] Dashboard en tiempo real de ejecuciones
- [ ] Integración con WhatsApp para alertas críticas
- [ ] Auto-reinicio de API ML post re-entrenamiento
- [ ] Métricas de ROI por cada alerta de churn

---

## 📚 Referencias

- **[n8n Documentation](https://docs.n8n.io/)**
- **[Supabase n8n Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/)**
- **[Slack n8n Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/)**
- **[ML API Documentation](../docs/ML-INSIGHTS.md)**

---

**Última actualización:** 2025-11-04  
**Versión:** 1.0.0  
**Mantenedor:** Equipo Desarrollo Agua Tres Torres

