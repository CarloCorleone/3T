# Configurar Upstash Redis para Rate Limiting

El sistema de **Rate Limiting** protege la aplicación contra:
- ✅ Ataques de fuerza bruta (login múltiple)
- ✅ Ataques DDoS (demasiadas solicitudes)
- ✅ Abuso de APIs intensivas (optimización de rutas)

---

## 📋 Paso a Paso

### 1. Crear Cuenta en Upstash

1. Ir a https://upstash.com
2. Click en **Sign Up** (o usar cuenta de GitHub/Google)
3. **Plan gratuito** incluye:
   - 10,000 comandos/día
   - 256 MB almacenamiento
   - Suficiente para este proyecto ✅

### 2. Crear Base de Datos Redis

1. En el dashboard de Upstash, click **Create Database**
2. Configuración:
   - **Name**: `3t-ratelimit`
   - **Type**: Regional (más rápido y gratis)
   - **Region**: Elegir la más cercana (ej: `us-east-1` o `sa-east-1` para Latam)
   - **Eviction**: `allkeys-lru` (recomendado)
3. Click **Create**

### 3. Obtener Credenciales

Después de crear la base de datos, verás:

```
REST URL: https://xxxxx.upstash.io
REST Token: AabbbXXXXXXXXXXXXXXXXXXX=
```

Copia ambos valores.

### 4. Agregar a Variables de Entorno

Editar el archivo `/opt/cane/env/3t.env`:

```bash
nano /opt/cane/env/3t.env
```

Agregar al final:

```env
# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AabbbXXXXXXXXXXXXXXXXXXX=
```

**Guardar y cerrar** (Ctrl+X, Y, Enter)

### 5. Reiniciar Aplicación

Para que tome las nuevas variables:

```bash
cd /opt/cane/3t

# Desarrollo
./dev.sh

# Producción
docker compose down
docker compose up -d
```

### 6. Verificar Funcionamiento

En los logs verás:

```
# Sin Upstash (antes de configurar)
⚠️  Rate limiting deshabilitado (Upstash no configurado)

# Con Upstash (después de configurar)
✅ Usuario autenticado: Juan Pérez (admin)
# Sin advertencias sobre rate limiting
```

---

## 🎯 Límites Configurados

| Tipo | Límite | Ventana | Aplicado en |
|------|--------|---------|-------------|
| **Login** | 5 intentos | 15 minutos | `/login` |
| **API General** | 100 requests | 1 minuto | Todos los endpoints |
| **Optimización** | 10 requests | 1 minuto | `/api/optimize-route` |

---

## 🔍 Monitoreo

### Ver Estadísticas en Upstash Dashboard

1. Ir a tu base de datos en Upstash
2. Tab **Metrics**:
   - Total Commands
   - Storage Used
   - Response Time

### Logs en la Aplicación

Rate limiting genera logs automáticos:

```bash
# Ver logs en tiempo real
docker logs -f 3t-app-dev

# Buscar eventos de rate limiting
docker logs 3t-app-dev 2>&1 | grep "rate limit"
```

Ejemplos de logs:

```
⚠️  Rate limit cerca del límite: user:abc123 - Restantes: 3/10
🚫 Rate limit excedido: ip:192.168.1.100
```

---

## 🧪 Probar Rate Limiting

### Test con curl

```bash
# Hacer 15 requests rápidos (debería bloquear después del #10)
for i in {1..15}; do
  echo "Request #$i"
  curl -X POST https://dev.3t.loopia.cl/api/optimize-route \
    -H "Content-Type: application/json" \
    -d '{"orders": [...]}'
  sleep 1
done
```

**Resultado esperado:**
- Requests 1-10: ✅ 200 OK
- Requests 11-15: ❌ 429 Too Many Requests

### Respuesta de Error 429

```json
{
  "error": "Demasiadas solicitudes. Por favor intenta más tarde.",
  "rateLimitExceeded": true,
  "limit": 10,
  "remaining": 0,
  "resetInSeconds": 45
}
```

Headers de la respuesta:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1729180800
Retry-After: 45
```

---

## 🛠️ Troubleshooting

### Problema: "Rate limiting deshabilitado"

**Causa:** Variables de entorno no cargadas

**Solución:**
```bash
# Verificar variables
docker exec 3t-app-dev env | grep UPSTASH

# Deben aparecer:
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...

# Si no aparecen, reiniciar contenedor
cd /opt/cane/3t
./dev.sh
```

### Problema: "Error en rate limiting"

**Causa:** Credenciales incorrectas o base de datos pausada

**Solución:**
1. Verificar que las credenciales en `.env` sean correctas
2. En Upstash dashboard, verificar que la base de datos esté **Active**
3. Si está **Paused**, click en **Resume**

### Problema: Límite alcanzado muy rápido

**Causa:** Múltiples usuarios/IPs compartiendo límite

**Solución:** Ajustar límites en `lib/rate-limit.ts`:

```typescript
export const intensiveLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'), // 10 → 20
      // ...
    })
  : null
```

---

## 💰 Costo y Escalabilidad

### Plan Gratuito (Actual)
- ✅ 10,000 comandos/día
- ✅ Suficiente para 3-5 usuarios
- ✅ ~300 requests/hora
- ✅ $0/mes

### Plan Pro ($10/mes)
- ✅ 1,000,000 comandos/mes
- ✅ Hasta 100 usuarios concurrentes
- ✅ ~30,000 requests/hora
- ✅ Soporte prioritario

### Cálculo para tu caso:
- 5 usuarios activos
- 50 requests/día por usuario
- **Total: 250 requests/día** → Plan gratuito OK ✅

---

## 📚 Referencias

- [Upstash Documentation](https://docs.upstash.com/redis)
- [Upstash Rate Limiting](https://upstash.com/docs/oss/sdks/ts/ratelimit/overview)
- [Rate Limiting Best Practices](https://www.upstash.com/blog/rate-limiting-algorithms)

---

**Fecha:** 2025-10-16  
**Autor:** Sistema de Seguridad 3T  
**Versión:** 1.0.0
















