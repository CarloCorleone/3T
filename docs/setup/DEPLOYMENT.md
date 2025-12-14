# 🚀 Guía de Deployment - Agua Tres Torres

Guía completa para desplegar la aplicación usando Docker en **modo desarrollo** (hot reload) o **modo producción** (build optimizado).

---

## 🔄 Modos de Operación

El proyecto tiene **DOS modos distintos** de operación:

### 🟢 Modo Desarrollo (Hot Reload) - Para Desarrollo Activo

**Características:**
- ✅ Hot reload automático (cambios en < 1 segundo)
- ✅ Sin necesidad de rebuild
- ✅ Ideal para desarrollo diario
- ✅ Puerto interno: 3001
- ✅ Dominio: https://dev.3t.loopia.cl
- ✅ Contenedor: `3t-app-dev`

**Comandos:**
```bash
cd /opt/cane/3t

# Iniciar modo desarrollo
./dev.sh

# Ver logs en tiempo real
./logs-dev.sh

# Detener
docker compose down
```

**Usa este modo cuando:**
- Estás haciendo cambios en el código
- Necesitas ver cambios inmediatamente
- Estás desarrollando features nuevas
- Estás arreglando bugs

### 🔴 Modo Producción (Build Optimizado) - Para Usuarios Finales

**Características:**
- ✅ Build optimizado y compilado
- ✅ Mejor rendimiento
- ✅ Menor consumo de recursos
- ✅ Puerto interno: 3002
- ✅ Dominio: https://3t.loopia.cl
- ✅ Contenedor: `3t-app`
- ⚠️ Requiere rebuild para cualquier cambio

**Comandos:**
```bash
cd /opt/cane/3t

# Deploy a producción
./prod.sh

# Ver logs en tiempo real
./logs-prod.sh

# Reiniciar (sin rebuild)
docker restart 3t-app
```

**Usa este modo cuando:**
- Vas a desplegar para usuarios finales
- Los cambios están probados y listos
- Necesitas máximo rendimiento

### ⚠️ IMPORTANTE: Cambio entre Modos

**Si el sistema está en producción y necesitas hacer cambios:**

1. **NO modifiques en producción directamente**
2. **Detén producción y cambia a desarrollo:**
   ```bash
   cd /opt/cane/3t
   docker compose down  # Detener producción
   ./dev.sh            # Iniciar desarrollo
   ```
3. Haz tus cambios (se reflejan automáticamente en https://dev.3t.loopia.cl)
4. Prueba que todo funcione
5. Cuando esté listo, despliega a producción:
   ```bash
   ./prod.sh
   ```

---

## 📋 Pre-requisitos

- Servidor Linux con Docker y Docker Compose instalados
- Red Docker `cane_net` creada
- Acceso a Supabase configurado
- Puerto 3002 disponible (interno, no expuesto al host)
- Google Maps API Key configurada

## 🔧 Configuración Inicial

### 1. Crear red Docker (si no existe)

```bash
docker network create cane_net
```

### 2. Configurar variables de entorno

Las variables se configuran en `/opt/cane/env/3t.env` siguiendo el estándar del proyecto Cane:

```bash
# Editar archivo de variables
nano /opt/cane/env/3t.env

# Debe contener:
NODE_ENV=production
PORT=3002
NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
NEXT_TELEMETRY_DISABLED=1
```

**⚠️ Importante:** Asegúrate de configurar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` para que funcionen:
- Optimización de rutas
- Autocompletado de direcciones
- Mapas interactivos

### 3. Verificar configuración de Supabase

Asegúrate de que las siguientes vistas estén creadas en Supabase:

```sql
-- Vista dashboard de ventas
CREATE OR REPLACE VIEW "3t_dashboard_ventas" AS
SELECT 
  o.order_id,
  o.order_date,
  o.delivered_date,
  o.status,
  o.payment_status,
  o.payment_type,
  o.final_price,
  o.quantity,
  c.customer_id,
  c.name as customer_name,
  c.customer_type,
  c.phone as customer_phone,
  a.address_id,
  a.raw_address,
  a.commune,
  a.latitude,
  a.longitude,
  p.name as product_name,
  p.category as product_category,
  EXTRACT(EPOCH FROM (o.delivered_date::timestamp - o.order_date::timestamp))/60 as tiempo_entrega_minutos,
  CASE 
    WHEN c.customer_type = 'Empresa' THEN o.final_price * 1.19
    ELSE o.final_price
  END as precio_con_iva,
  o.final_price as precio_neto
FROM "3t_orders" o
LEFT JOIN "3t_customers" c ON o.customer_id = c.customer_id
LEFT JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id
LEFT JOIN "3t_products" p ON o.product_type = p.product_id
WHERE o.order_date IS NOT NULL;

-- Vista direcciones con info del cliente
CREATE OR REPLACE VIEW "3t_addresses_with_customer" AS
SELECT 
  a.*,
  c.name as customer_name,
  c.customer_type,
  c.phone as customer_phone,
  c.email as customer_email,
  COUNT(o.order_id) as total_pedidos
FROM "3t_addresses" a
LEFT JOIN "3t_customers" c ON a.customer_id = c.customer_id
LEFT JOIN "3t_orders" o ON a.address_id = o.delivery_address_id
GROUP BY a.address_id, a.customer_id, a.raw_address, a.commune, a.street_name, 
         a.street_number, a.apartment, a.directions, a.region, a.latitude, 
         a.longitude, a.maps_link, a.is_default, c.name, c.customer_type, 
         c.phone, c.email;
```

## 🏗️ Build y Deployment

### Opción 1: Deployment rápido (Recomendado)

```bash
cd /opt/cane/3t

# Build y levantar en un solo comando
docker compose up -d --build

# Ver logs
docker logs -f 3t-app
```

### Opción 2: Build paso a paso

```bash
cd /opt/cane/3t

# 1. Detener contenedor actual (si existe)
docker compose down

# 2. Build de la imagen
docker compose build

# 3. Verificar imagen
docker images | grep 3t

# 4. Iniciar servicio
docker compose up -d

# 5. Verificar estado
docker ps | grep 3t-app

# 6. Ver logs
docker logs -f 3t-app
```

### Opción 3: Actualizar código sin rebuild (desarrollo)

⚠️ **Solo funciona si NO cambiaste dependencias ni package.json**

```bash
cd /opt/cane/3t

# Reiniciar contenedor (usa código actualizado)
docker restart 3t-app

# Ver logs
docker logs -f 3t-app
```

**Nota:** Si instalaste nuevas dependencias o modificaste package.json, **debes hacer rebuild completo**.

## ✅ Verificación

### 1. Verificar que el contenedor está corriendo

```bash
docker ps | grep 3t-app
```

Deberías ver algo como:
```
CONTAINER ID   IMAGE        STATUS                    PORTS
abc123def456   3t-3t-app    Up 2 minutes (healthy)   3002/tcp
```

**Importante:** El puerto 3002 es **solo interno** (no se expone al host). El acceso es a través de Nginx Proxy Manager en `https://3t.loopia.cl`

### 2. Verificar health check

```bash
docker inspect 3t-app | grep -A 10 Health
```

### 3. Probar la aplicación

```bash
# Desde la red interna Docker
docker run --rm --network cane_net alpine/curl http://3t-app:3002

# O abrir directamente en navegador (si tienes NPM configurado)
https://3t.loopia.cl
```

## 🔄 Actualizaciones

### Actualizar la aplicación

```bash
cd /opt/cane/3t

# 1. Descargar cambios (si usas Git)
git pull

# 2. Detener contenedor actual
docker compose down

# 3. Rebuild y restart
docker compose build
docker compose up -d

# 4. Ver logs para verificar
docker logs -f 3t-app

# 5. Limpiar imágenes antiguas
docker image prune -f
```

### ⚡ Actualización rápida (sin rebuild)

**Solo si NO cambiaste dependencias:**

```bash
cd /opt/cane/3t
docker restart 3t-app
docker logs -f 3t-app
```

### 🔄 Cuándo necesitas rebuild:

**SÍ necesitas rebuild si:**
- ✅ Instalaste nuevas dependencias npm (`npm install`)
- ✅ Modificaste `package.json` o `package-lock.json`
- ✅ Cambiaste `Dockerfile` o `docker-compose.yml`
- ✅ Modificaste archivos de configuración (next.config.ts, tailwind.config.ts)

**NO necesitas rebuild si:**
- ❌ Solo modificaste archivos `.tsx`, `.ts`, `.css` del código fuente
- ❌ Actualizaste documentación (.md)
- ❌ Cambiaste variables de entorno en `/opt/cane/env/3t.env`

### Rollback a versión anterior

```bash
# Detener contenedor actual
docker compose down

# Volver a imagen anterior (si está disponible)
docker images | grep agua-tres-torres
docker tag agua-tres-torres:backup agua-tres-torres:latest

# Levantar con imagen anterior
docker compose up -d
```

## 📊 Monitoreo

### Ver logs en tiempo real

```bash
docker compose logs -f agua-tres-torres
```

### Ver estadísticas de recursos

```bash
docker stats agua-tres-torres
```

### Verificar conectividad a Supabase

```bash
# Entrar al contenedor
docker exec -it agua-tres-torres sh

# Probar conexión
wget -O- https://db.loopia.cl/rest/v1/
```

## 🛠️ Mantenimiento

### Reiniciar la aplicación

```bash
docker compose restart agua-tres-torres
```

### Ver logs de errores

```bash
docker compose logs agua-tres-torres | grep -i error
```

### Limpiar cache y rebuild completo

```bash
# Detener y eliminar contenedor
docker compose down

# Eliminar imagen
docker rmi agua-tres-torres:latest

# Limpiar cache de Docker
docker system prune -a

# Rebuild desde cero
docker compose up -d --build
```

## 🔐 Seguridad

### 1. Proteger variables de entorno

```bash
chmod 600 .env.local
chown root:root .env.local
```

### 2. Firewall

Si usas UFW:
```bash
# Permitir puerto 3500 solo desde IP específica
ufw allow from 192.168.1.0/24 to any port 3500

# O permitir desde cualquier lugar
ufw allow 3500/tcp
```

### 3. Nginx Proxy Manager (Recomendado)

Para exponer con HTTPS:

1. Crear Proxy Host en NPM:
   - Domain: `agua.tudominio.cl`
   - Forward Hostname/IP: `agua-tres-torres`
   - Forward Port: `3000`
   - Enable SSL (Let's Encrypt)

2. Configurar en `cane_net`:
```bash
docker network connect cane_net nginx-proxy-manager
```

## 🚨 Troubleshooting

### Error: Cannot connect to Supabase

```bash
# Verificar variables de entorno
docker exec agua-tres-torres env | grep SUPABASE

# Probar conectividad
docker exec agua-tres-torres wget -O- https://db.loopia.cl
```

### Error: Port 3500 already in use

```bash
# Ver qué usa el puerto
lsof -i :3500

# Cambiar puerto en docker-compose.yml
ports:
  - "3501:3000"  # Usar 3501 en lugar de 3500
```

### Error: Container keeps restarting

```bash
# Ver logs completos
docker compose logs agua-tres-torres

# Ver últimas líneas
docker compose logs --tail=50 agua-tres-torres

# Verificar health check
docker inspect agua-tres-torres | jq '.[0].State.Health'
```

### Error: Out of memory

```bash
# Verificar uso de recursos
docker stats agua-tres-torres

# Aumentar límites en docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 512M
```

## 📦 Backup

### Backup del código

```bash
# Crear backup
tar -czf agua-tres-torres-backup-$(date +%Y%m%d).tar.gz \
  /opt/cane/tools/agua-tres-torres

# Restaurar
tar -xzf agua-tres-torres-backup-20251008.tar.gz -C /opt/cane/tools/
```

### Backup de la base de datos

Los datos están en Supabase. Para backup:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Backup
supabase db dump > backup-$(date +%Y%m%d).sql
```

## 🔗 Integración con Nginx Proxy Manager

Si usas NPM para SSL:

1. **Configurar Proxy Host:**
   ```
   Domain Names: agua.tudominio.cl
   Scheme: http
   Forward Hostname: agua-tres-torres
   Forward Port: 3000
   
   SSL:
   ✓ Force SSL
   ✓ HTTP/2 Support
   ✓ HSTS Enabled
   ```

2. **Verificar que NPM está en cane_net:**
   ```bash
   docker network inspect cane_net | grep nginx-proxy-manager
   ```

## 📈 Optimizaciones

### Activar compresión

Ya está incluida en `next.config.ts`:
```typescript
compress: true
```

### Configurar cache headers

Agregar en Nginx Proxy Manager (Custom Locations):

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## ✅ Checklist de Deployment

- [ ] Red `cane_net` creada
- [ ] Variables de entorno configuradas
- [ ] Vistas SQL creadas en Supabase
- [ ] Puerto 3500 disponible
- [ ] Build exitoso
- [ ] Contenedor corriendo
- [ ] Health check OK
- [ ] Aplicación accesible
- [ ] Logs sin errores
- [ ] Integración con NPM (opcional)
- [ ] SSL configurado (opcional)
- [ ] Backup configurado

---

**¿Problemas?** Revisa los logs: `docker compose logs -f agua-tres-torres`

