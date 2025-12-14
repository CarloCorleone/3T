# 🤖 Automatizaciones de Agua 3T

Documentación de tareas automatizadas con cron para el sistema Agua Tres Torres.

---

## 📋 Tareas Programadas

### 1. Asegurar Modo Producción (6:00 AM)

**Script:** `/opt/cane/3t/scripts/ensure-prod.sh`  
**Horario:** Todos los días a las 6:00 AM  
**Cron:** `0 6 * * * /opt/cane/3t/scripts/ensure-prod.sh`  
**Logs:** `/opt/cane/3t/logs/ensure-prod.log`

#### Propósito

Asegurar que la aplicación esté **siempre en modo producción** al inicio del día laboral, independientemente del modo en que se haya quedado el día anterior (desarrollo o detenido).

#### Comportamiento

El script verifica el estado de los contenedores y toma acción según el caso:

**Caso 1: Producción corriendo, desarrollo detenido** ✅
```
Estado: Sistema OK
Acción: Ninguna
```

**Caso 2: Producción detenida, desarrollo corriendo** 🔄
```
Estado: Sistema en desarrollo
Acción: 
  1. Detener contenedor de desarrollo (3t-app-dev)
  2. Iniciar contenedor de producción (3t-app)
  3. Verificar health status
```

**Caso 3: Ambos detenidos** 🚀
```
Estado: Sistema detenido
Acción:
  1. Iniciar contenedor de producción (3t-app)
  2. Verificar health status
```

**Caso 4: Ambos corriendo** ⚠️
```
Estado: Configuración anómala
Acción:
  1. Detener contenedor de desarrollo
  2. Mantener producción corriendo
```

#### Logs

Los logs de ejecución se guardan en:
```
/opt/cane/3t/logs/ensure-prod.log
```

**Sistema de Rotación:**
- ✅ El log principal es `ensure-prod.log`
- ✅ Cuando alcanza 5MB, se rota automáticamente
- ✅ Formato de logs rotados: `ensure-prod-YYYY-MM-DD-HHMMSS.log`
- ✅ Se mantienen solo las últimas **5 copias**
- ✅ Copias antiguas se eliminan automáticamente

**Ver logs:**
```bash
# Últimas 50 líneas
tail -50 /opt/cane/3t/logs/ensure-prod.log

# Ver logs en tiempo real
tail -f /opt/cane/3t/logs/ensure-prod.log

# Buscar ejecuciones del día
grep "$(date +%Y-%m-%d)" /opt/cane/3t/logs/ensure-prod.log

# Listar todos los logs (actual + rotados)
ls -lh /opt/cane/3t/logs/

# Ver un log rotado específico
cat /opt/cane/3t/logs/ensure-prod-2025-10-13-060001.log
```

#### Verificación

**Ver cronjob actual:**
```bash
crontab -l | grep ensure-prod
```

**Ejecutar manualmente:**
```bash
/opt/cane/3t/scripts/ensure-prod.sh
```

**Verificar última ejecución:**
```bash
tail -20 /var/log/3t-ensure-prod.log
```

---

## 🔧 Gestión del Cron

### Ver todos los crontabs
```bash
crontab -l
```

### Editar crontab
```bash
crontab -e
```

### Eliminar una tarea específica
```bash
# Exportar crontab sin la tarea
crontab -l | grep -v "ensure-prod.sh" | crontab -
```

### Deshabilitar temporalmente
```bash
# Comentar la línea en el crontab
crontab -e
# Agregar # al inicio de la línea:
# 0 6 * * * /opt/cane/3t/scripts/ensure-prod.sh >> /var/log/3t-ensure-prod.log 2>&1
```

---

## 📊 Monitoreo

### Estado actual del sistema

```bash
# Ver contenedores corriendo
docker ps | grep 3t-app

# Estado detallado
docker inspect 3t-app --format='{{.State.Status}} (Health: {{.State.Health.Status}})'

# Logs del contenedor
docker logs --tail 50 3t-app
```

### Historial de ejecuciones

```bash
# Ver todas las ejecuciones del mes
grep "$(date +%Y-%m)" /opt/cane/3t/logs/ensure-prod.log | grep "Verificando estado"

# Contar ejecuciones exitosas
grep "Verificación completada" /opt/cane/3t/logs/ensure-prod.log | wc -l

# Ver errores
grep "Error" /opt/cane/3t/logs/ensure-prod.log

# Ver errores en todos los logs (incluidos rotados)
grep -h "Error" /opt/cane/3t/logs/ensure-prod*.log
```

---

## 🚨 Troubleshooting

### El script no se ejecuta

**Verificar que cron está corriendo:**
```bash
systemctl status cron
# o
service cron status
```

**Verificar permisos del script:**
```bash
ls -la /opt/cane/3t/scripts/ensure-prod.sh
# Debe tener -rwxr-xr-x
```

**Verificar permisos del directorio de logs:**
```bash
ls -la /opt/cane/3t/logs/
# Debe tener permisos 755
```

**Verificar espacio en disco:**
```bash
df -h /opt/cane
```

### El contenedor no arranca

**Ver logs completos del script:**
```bash
tail -100 /opt/cane/3t/logs/ensure-prod.log
```

**Ver logs del contenedor:**
```bash
docker logs 3t-app
```

**Ejecutar manualmente en modo debug:**
```bash
bash -x /opt/cane/3t/scripts/ensure-prod.sh
```

### Cambiar el horario

Editar el crontab:
```bash
crontab -e
```

Modificar la línea (ejemplos):
```bash
# 7:00 AM
0 7 * * * /opt/cane/3t/scripts/ensure-prod.sh >> /var/log/3t-ensure-prod.log 2>&1

# 5:30 AM
30 5 * * * /opt/cane/3t/scripts/ensure-prod.sh >> /var/log/3t-ensure-prod.log 2>&1

# Solo días laborales (lunes a viernes)
0 6 * * 1-5 /opt/cane/3t/scripts/ensure-prod.sh >> /var/log/3t-ensure-prod.log 2>&1
```

---

## 📝 Formato de Cron

```
┌───────────── minuto (0 - 59)
│ ┌───────────── hora (0 - 23)
│ │ ┌───────────── día del mes (1 - 31)
│ │ │ ┌───────────── mes (1 - 12)
│ │ │ │ ┌───────────── día de la semana (0 - 6) (0=Domingo)
│ │ │ │ │
* * * * * comando a ejecutar
```

**Ejemplos:**
```bash
0 6 * * *        # Todos los días a las 6:00 AM
0 */4 * * *      # Cada 4 horas
30 2 * * 0       # Domingos a las 2:30 AM
0 0 1 * *        # Primer día de cada mes a medianoche
```

---

## 🔐 Seguridad

- ✅ El script usa `set -euo pipefail` para manejo robusto de errores
- ✅ Verifica el estado antes de tomar acciones
- ✅ Logs detallados de todas las operaciones
- ✅ No sobreescribe contenedores sin verificar
- ✅ Espera health check antes de confirmar éxito

---

## 📚 Referencias

- Script principal: `/opt/cane/3t/scripts/ensure-prod.sh`
- Directorio de logs: `/opt/cane/3t/logs/`
- Log actual: `/opt/cane/3t/logs/ensure-prod.log`
- Logs rotados: `/opt/cane/3t/logs/ensure-prod-*.log`
- Docker Compose producción: `/opt/cane/3t/docker-compose.yml`
- Docker Compose desarrollo: `/opt/cane/3t/docker-compose.dev.yml`

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación de Automatizaciones**  
**Última actualización:** Octubre 13, 2025

