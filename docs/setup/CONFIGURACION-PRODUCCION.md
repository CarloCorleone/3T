# ⚙️ Configuración de Producción - Agua Tres Torres

Documento de configuración actual del sistema en producción.

---

## 🌐 Información del Servidor

| Parámetro | Valor |
|-----------|-------|
| **Servidor** | VPS Linux |
| **OS** | Ubuntu/Debian |
| **Docker Version** | 20+ |
| **IP Pública** | 64.225.115.20 |
| **Dominio Principal** | loopia.cl |
| **Subdominio App** | 3t.loopia.cl |

---

## 🐳 Configuración Docker

### Red Compartida

```bash
# Nombre de la red
cane_net

# Verificar que existe
docker network ls | grep cane_net

# Crear si no existe
docker network create cane_net

# Inspeccionar
docker network inspect cane_net
```

### Contenedor 3t-app

```yaml
# Ubicación: /opt/cane/3t/docker-compose.yml

services:
  3t-app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
        - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    
    container_name: 3t-app
    
    expose:
      - "3002"  # Puerto interno únicamente
    
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    
    networks:
      - cane_net
    
    restart: unless-stopped
    
    volumes:
      - ./public:/app/public:ro
    
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3002/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  cane_net:
    external: true
```

---

## 🔐 Credenciales Supabase

### Variables de Entorno

**Ubicación centralizada**: `/opt/cane/env/mcp-supabase.env`

```bash
# URL del API Gateway (Kong)
SUPABASE_URL=https://api.loopia.cl

# Clave anónima (pública)
SUPABASE_ANON_KEY=eyJhbGci... [REDACTADO POR SEGURIDAD]

# Clave de servicio (admin - NO exponer)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... [REDACTADO POR SEGURIDAD]

# Secreto JWT
SUPABASE_AUTH_JWT_SECRET=[REDACTADO POR SEGURIDAD]

# Conexión directa PostgreSQL
DATABASE_URL=postgresql://postgres:[PASSWORD]@supabase-db:5432/postgres
```

**⚠️ IMPORTANTE**: El frontend **solo usa** `ANON_KEY`. El `SERVICE_ROLE_KEY` es para operaciones admin/backend.

---

## 🌐 Nginx Proxy Manager

### Configuración del Proxy Host

**Domain**: `3t.loopia.cl`

#### Details Tab

```nginx
# Scheme
http

# Forward Hostname / IP
3t-app

# Forward Port
3002

# Cache Assets
✅ Enabled

# Block Common Exploits
✅ Enabled

# Websockets Support
✅ Enabled
```

#### Custom Nginx Configuration (Opcional)

```nginx
# Si necesitas agregar headers personalizados
location / {
    proxy_pass http://3t-app:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

#### SSL Tab

```
SSL Certificate: Let's Encrypt
Force SSL: ✅ Enabled
HTTP/2 Support: ✅ Enabled
HSTS Enabled: ✅ Recommended
HSTS Subdomains: ❌ (opcional)
```

### Verificar Configuración

```bash
# Desde el servidor, probar que Nginx puede alcanzar el contenedor
docker exec nginx-proxy-manager-app curl -s http://3t-app:3002 | head -20

# Probar desde fuera
curl -I https://3t.loopia.cl

# Debe retornar:
# HTTP/2 200
# content-type: text/html
# ...
```

---

## 🗄️ Base de Datos (Supabase)

### Tablas Utilizadas

| Tabla | Descripción | Observaciones |
|-------|-------------|---------------|
| `3t_customers` | Clientes | Tipo: hogar/empresa |
| `3t_addresses` | Direcciones | Múltiples por cliente |
| `3t_products` | Productos | Formatos y precios |
| `3t_orders` | Pedidos | Relación con todo |
| `3t_users` | Usuarios | Auth opcional |

### Esquema de Columnas

#### 3t_customers
```sql
CREATE TABLE 3t_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  customer_type TEXT CHECK (customer_type IN ('hogar', 'empresa')),
  phone TEXT,
  observations TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3t_addresses
```sql
CREATE TABLE 3t_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES 3t_customers(id) ON DELETE CASCADE,
  street TEXT NOT NULL,
  city TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3t_products
```sql
CREATE TABLE 3t_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format TEXT NOT NULL,  -- '10L', '20L', etc.
  base_price INTEGER NOT NULL,  -- Precio en enteros (sin decimales)
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3t_orders
```sql
CREATE TABLE 3t_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES 3t_customers(id),
  address_id UUID REFERENCES 3t_addresses(id),
  product_id UUID REFERENCES 3t_products(id),
  quantity INTEGER NOT NULL,
  is_refill BOOLEAN DEFAULT false,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,  -- quantity × unit_price
  order_status TEXT CHECK (order_status IN ('pedido', 'ruta', 'despachado')),
  payment_status TEXT CHECK (payment_status IN ('pendiente', 'pagado', 'facturado')),
  payment_type TEXT CHECK (payment_type IN ('efectivo', 'transferencia')),
  observations TEXT,
  order_date DATE DEFAULT CURRENT_DATE,
  delivery_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Políticas de Seguridad (RLS)

```sql
-- Si usas Row Level Security, ejemplo:
ALTER TABLE 3t_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública"
  ON 3t_customers FOR SELECT
  USING (true);

-- Ajustar según tus necesidades de seguridad
```

---

## 🔥 Firewall

### Puertos Abiertos

```bash
# Ver reglas actuales
sudo ufw status

# Puertos necesarios:
# - 22 (SSH)
# - 80 (HTTP - redirect a HTTPS)
# - 443 (HTTPS - Nginx Proxy Manager)
# - 81 (Nginx Proxy Manager Admin - opcional)

# Puerto 3002 NO debe estar expuesto
# Solo es accesible dentro de la red Docker
```

---

## 📊 Monitoreo

### Logs

```bash
# Logs de la app
docker logs -f 3t-app --tail 100

# Logs de Nginx Proxy Manager
docker logs -f nginx-proxy-manager-app --tail 100

# Logs de sistema
journalctl -u docker -f
```

### Health Checks

```bash
# Health del contenedor
docker inspect 3t-app | jq '.[0].State.Health'

# Endpoint de la app
curl -s https://3t.loopia.cl/ | head -50

# Supabase
curl -s https://api.loopia.cl/rest/v1/
```

---

## 🔄 Backups

### Recomendaciones

1. **Base de Datos**: Supabase tiene backups automáticos
2. **Código**: Git repository (pendiente)
3. **Configuración**: Respaldar `/opt/cane/3t/`

```bash
# Backup manual de configuración
tar -czf /opt/cane/backups/3t-$(date +%Y%m%d).tar.gz /opt/cane/3t/

# Excluir node_modules y .next
tar -czf /opt/cane/backups/3t-config-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  /opt/cane/3t/
```

---

## 🚀 Procedimiento de Despliegue

### 1. Actualización de Código

```bash
cd /opt/cane/3t

# Si usas Git
# git pull origin main

# O editar archivos directamente
vim app/page.tsx
```

### 2. Rebuild de Imagen

```bash
# Build
docker compose build

# Ver tamaño de imagen
docker images | grep 3t
```

### 3. Deploy Sin Downtime

```bash
# Docker compose maneja el rolling update automáticamente
docker compose up -d

# Verificar
docker logs -f 3t-app
```

### 4. Rollback (si algo falla)

```bash
# Volver a imagen anterior
docker tag 3t-3t-app:backup 3t-3t-app:latest
docker compose up -d

# O reconstruir desde commit anterior
# git checkout HEAD~1
# docker compose build
# docker compose up -d
```

---

## 🧪 Testing en Producción

```bash
# 1. Health check
curl -I https://3t.loopia.cl

# 2. Test de carga de página principal
time curl -s https://3t.loopia.cl > /dev/null

# 3. Test de API Supabase
curl -s https://api.loopia.cl/rest/v1/3t_customers \
  -H "apikey: $ANON_KEY" | jq

# 4. Test de módulos específicos
curl -I https://3t.loopia.cl/clientes
curl -I https://3t.loopia.cl/dashboard
```

---

## 📞 Contacto y Soporte

- **Admin Sistema**: [Tu contacto]
- **Documentación**: `/opt/cane/3t/README.md`
- **Logs**: `docker logs 3t-app`

---

## ✅ Checklist Pre-Producción

Antes de lanzar cambios:

- [ ] Código revisado y testeado localmente
- [ ] Variables de entorno correctas
- [ ] Build de Docker exitoso
- [ ] Healthcheck pasando
- [ ] Nginx Proxy Manager configurado
- [ ] SSL activo y funcionando
- [ ] Base de datos accesible
- [ ] Logs limpios (sin errores)
- [ ] Prueba de navegación en todos los módulos
- [ ] Backup de configuración realizado

---

## 🔮 Mejoras Futuras

- [ ] CI/CD con GitHub Actions
- [ ] Tests automatizados (Vitest + Playwright)
- [ ] Monitoreo con Prometheus/Grafana
- [ ] Rate limiting en Nginx
- [ ] CDN para assets estáticos
- [ ] Autenticación de usuarios
- [ ] Roles y permisos
- [ ] Notificaciones push
- [ ] PWA (Progressive Web App)
- [ ] Modo offline

---

**Última actualización**: Octubre 2025  
**Versión de Producción**: 1.0.0  
**Estado**: ✅ Funcionando correctamente

