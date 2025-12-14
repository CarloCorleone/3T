# 💧 Agua Tres Torres - Sistema de Gestión

Sistema web completo para gestión de pedidos, clientes, productos y entregas de agua purificada. Desarrollado con Next.js 14, TypeScript, Supabase y shadcn/ui.

> 📚 **Documentación Completa (v3.0)**:
> 
> **🤖 [.cursorrules](./.cursorrules) - Reglas para Cursor AI** (se lee automáticamente en cada chat)
> 
> **👉 [docs/INDEX.md](./docs/INDEX.md) - 📑 ÍNDICE MAESTRO - Punto de entrada único**
> 
> **🔐 [docs/AUDITORIA-SEGURIDAD-OWASP-TOP10.md](./docs/AUDITORIA-SEGURIDAD-OWASP-TOP10.md) - Auditoría de Seguridad Completa**
> 
> **Inicio Rápido:**
> - **[docs/GETTING-STARTED.md](./docs/GETTING-STARTED.md)** - 🚀 Guía de inicio en 5 minutos
> - **[docs/GUIA-RAPIDA.md](./docs/GUIA-RAPIDA.md)** - ⚡ Comandos rápidos y troubleshooting
> - **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - 🐳 Modos desarrollo y producción
> 
> **Documentación de Módulos (12 módulos completos):**
> - **[docs/modules/HOME.md](./docs/modules/HOME.md)** - Página de inicio
> - **[docs/modules/DASHBOARD.md](./docs/modules/DASHBOARD.md)** - Análisis de ventas
> - **[docs/modules/CLIENTES.md](./docs/modules/CLIENTES.md)** - Gestión de clientes (Google Maps)
> - **[docs/modules/PRODUCTOS.md](./docs/modules/PRODUCTOS.md)** - Catálogo de productos
> - **[docs/modules/PEDIDOS.md](./docs/modules/PEDIDOS.md)** - Gestión de pedidos
> - **[docs/modules/RUTAS.md](./docs/modules/RUTAS.md)** - 🚚 Gestión de rutas con drag & drop
> - **[docs/modules/MAPA.md](./docs/modules/MAPA.md)** - Visualización geográfica
> - **[docs/modules/COMPRAS.md](./docs/modules/COMPRAS.md)** - Gestión de compras
> - **[docs/modules/PROVEEDORES.md](./docs/modules/PROVEEDORES.md)** - Gestión de proveedores
> - **[docs/modules/REPORTES.md](./docs/modules/REPORTES.md)** - Reportes (planificado)
> - **[docs/modules/OPTIMIZADOR-RUTAS.md](./docs/modules/OPTIMIZADOR-RUTAS.md)** - Optimizador de rutas
> - **[docs/modules/PRESUPUESTOS.md](./docs/modules/PRESUPUESTOS.md)** - Presupuestos PDF
> - **[docs/modules/CHATBOT.md](./docs/modules/CHATBOT.md)** - 🤖 Chatbot inteligente con IA
> 
> **Otros Recursos:**
> - **[docs/INSTALACION-COMPLETA.md](./docs/INSTALACION-COMPLETA.md)** - Instalación desde cero
> - **[docs/ARQUITECTURA.md](./docs/ARQUITECTURA.md)** - Arquitectura técnica
> - **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Guía de deployment
> - **[docs/troubleshooting/](./docs/troubleshooting/)** - 🔧 Soluciones técnicas
> 
> **👉 Ver [docs/INDEX.md](./docs/INDEX.md) para navegar toda la documentación organizada por categoría y rol**

## 📋 Índice

- [Descripción](#descripción)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Branding](#branding)
- [Configuración](#configuración)
- [Despliegue](#despliegue)
- [Uso](#uso)
- [Base de Datos](#base-de-datos)
- [Troubleshooting](#troubleshooting)

---

## 📖 Descripción

**Agua Tres Torres** es una aplicación web moderna que permite:

✅ **Dashboard Operacional Home**: Página principal enfocada en gestión diaria de entregas:
- Saludo personalizado con resumen del día (pedidos, productos, viajes)
- Lista compacta de pedidos en gestión con despacho directo
- Totales de productos integrados (PET, PC)
- Resumen de rutas optimizadas con acceso al mapa completo
- Top 10 comunas por ventas: Mapa de calor con distribución geográfica
- 10 queries optimizadas en paralelo para máxima velocidad
- Navegación via sidebar con botón hamburguesa en móvil

✅ **Gestionar Clientes**: Crear y administrar clientes con múltiples direcciones, tipos (hogar/empresa), teléfonos y observaciones.

✅ **Gestionar Productos**: Administrar formatos de agua purificada (10L, 20L) con precios base diferenciados.

✅ **Gestionar Pedidos**: Crear pedidos diarios con:
- Selección de cliente y dirección
- Cantidad de botellones
- Tipo de producto (recarga/nuevo)
- Estado del pedido (pedido, ruta, despachado)
- Estado de pago (pendiente, pagado, facturado)
- Tipo de pago (efectivo, transferencia)
- Cálculo automático de precios según tipo de cliente
- Fotos de despacho con compresión automática (3MB → 500-800KB)

✅ **Dashboard Analítico**: Visualización de métricas con filtros por fecha, tipo de cliente y cliente específico:
- Ventas empresa (con/sin IVA)
- Ventas hogar
- Ventas totales
- Tiempo promedio de entrega
- Total de botellones entregados
- Gráficos interactivos (ventas por formato, estado de pago, tipo de cliente, cliente, semana)

✅ **Mapa de Entregas**: Visualización geográfica de las direcciones de entrega usando Leaflet.js

---

## 🎨 Branding

La aplicación está completamente personalizada con la identidad corporativa de Agua Tres Torres:

### Logos Disponibles

Todos los logos están ubicados en `/public/images/logos/`:

- **Logo Principal**: `Logo-Tres-Torres-512x512.png` (512x512px)
  - Usado en: Hero de página de inicio, PWA icon
  
- **Logo Cuadrado**: `logo-cuadrado-250x250.png` (250x250px)
  - Usado en: Sidebar, header, favicon, PDFs
  
- **Favicon**: `favicon.ico` y `favicon.png`
  - Usado en: Pestaña del navegador
  
- **Íconos Móviles**:
  - `logo-cuadrado-57x57-iphone.png` - iPhone
  - `logo-cuadrado-72x72-ipad.png` - iPad
  - Configurados en manifest.json para PWA

- **Versiones Adicionales**:
  - `Logo-Tres-torres-grande.jpg` - Logo grande JPG
  - `Logo-Tres-Torres-Chico.jpg` - Logo pequeño JPG
  - `Logo-Tres-torres@2x.png` - Logo retina display
  - `logo-tres-torres-b&w.jpg` - Logo blanco y negro
  - `logo-cuadrado-sii.jpg` - Logo para SII

### Colores Corporativos

```css
primary: #0891b2 (Azul turquesa)
primaryDark: #0e7490 (Azul turquesa oscuro)
accent: #06b6d4 (Cyan brillante)
```

### Características de Branding

✅ **PWA Ready**: Configurado con `manifest.json` para instalación como app móvil  
✅ **Favicon Multi-dispositivo**: Íconos optimizados para todos los dispositivos  
✅ **Open Graph**: Metadatos para compartir en redes sociales  
✅ **PDFs Corporativos**: Los presupuestos incluyen el logo de la empresa  
✅ **Header Profesional**: Logo visible en sidebar y header principal  

---

## 🛠 Tecnologías

### Frontend
- **Next.js 15.5.4** - Framework React con App Router y Turbopack
- **TypeScript** - Tipado estático
- **TailwindCSS** - Estilos utility-first
- **shadcn/ui** - Componentes UI modernos y accesibles (incluye Chart components)
- **Recharts** - Gráficos y visualización de datos con AreaChart, BarChart
- **Google Maps JavaScript API** - Mapas interactivos y optimización de rutas
- **Leaflet.js** - Mapas en página de visualización general
- **Lucide Icons** - Iconografía
- **date-fns** - Manejo de fechas y análisis temporal
- **browser-image-compression** - Compresión inteligente de imágenes

### Backend
- **Supabase** - Base de datos PostgreSQL, API REST, Realtime, Storage
  - URL: `https://api.loopia.cl`
  - Tablas: `3t_customers`, `3t_addresses`, `3t_products`, `3t_orders`, `3t_users`
  - Storage: `delivery-photos` (fotos de despacho públicas)

### Infraestructura
- **Docker** - Containerización
- **Docker Compose** - Orquestación
- **Nginx Proxy Manager** - Reverse proxy y SSL
- **Red Docker**: `cane_net`

---

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                 Nginx Proxy Manager                      │
│           (3t.loopia.cl → HTTPS con SSL)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
          ┌──────────────────────┐
          │   Docker: 3t-app     │
          │   Puerto: 3002       │
          │   Red: cane_net      │
          └──────────┬───────────┘
                     │
                     ↓
          ┌──────────────────────┐
          │   Supabase           │
          │   api.loopia.cl      │
          │   PostgreSQL         │
          └──────────────────────┘
```

### Flujo de Datos

1. **Usuario** accede a `https://3t.loopia.cl`
2. **Nginx Proxy Manager** recibe la petición (puerto 443)
3. **Proxy** redirige a contenedor `3t-app:3002` en red interna
4. **Next.js** procesa la petición y consulta **Supabase**
5. **Supabase** responde con datos de PostgreSQL
6. **Next.js** renderiza la vista y la envía al usuario

---

## 📁 Estructura del Proyecto

```
/opt/cane/3t/
├── app/                          # Rutas de Next.js (App Router)
│   ├── layout.tsx               # Layout raíz con estilos globales
│   ├── page.tsx                 # Página principal (Home)
│   ├── clientes/                # Módulo de clientes
│   │   └── page.tsx            # CRUD de clientes
│   ├── productos/               # Módulo de productos
│   │   └── page.tsx            # CRUD de productos
│   ├── pedidos/                 # Módulo de pedidos
│   │   └── page.tsx            # CRUD de pedidos con cálculo automático
│   ├── rutas/                   # Optimización de rutas
│   │   └── page.tsx            # Optimizador con Google Maps API
│   ├── dashboard/               # Dashboard analítico
│   │   └── page.tsx            # Métricas, filtros y gráficos
│   └── mapa/                    # Mapa de entregas
│       └── page.tsx            # Visualización geográfica con filtros
├── lib/                         # Utilidades y configuración
│   ├── supabase.ts             # Cliente Supabase y tipos TypeScript
│   └── google-maps.ts          # Integración con Google Maps API
├── components/                  # Componentes reutilizables
│   ├── ui/                     # Componentes de shadcn/ui
│   └── app-sidebar.tsx         # Sidebar de navegación
├── public/                      # Archivos estáticos
├── components.json              # Configuración de shadcn/ui
├── docker-compose.yml           # Orquestación Docker
├── Dockerfile                   # Imagen Docker multi-stage
├── .dockerignore               # Exclusiones para Docker
├── next.config.ts              # Configuración Next.js
├── tailwind.config.ts          # Configuración Tailwind
├── tsconfig.json               # Configuración TypeScript
├── package.json                # Dependencias npm
└── README.md                   # Este archivo
```

---

## ⚙️ Configuración

### Variables de Entorno

El proyecto usa variables de entorno definidas en `/opt/cane/env/3t.env` siguiendo el estándar del proyecto Cane:

```bash
# Ubicación: /opt/cane/env/3t.env
NODE_ENV=production
PORT=3002
NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
NEXT_TELEMETRY_DISABLED=1
```

#### Configurar Google Maps API

El sistema usa Google Maps para dos funcionalidades principales:

1. **Optimización de rutas** (`/rutas`)
2. **Autocompletado de direcciones** (`/clientes`)

**Pasos para configurar:**

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - **Maps JavaScript API** (para mapas y autocompletado)
   - **Places API** (para autocompletado de direcciones - VERSIÓN ANTIGUA, no "Places API (New)")
   - **Directions API** (para calcular rutas optimizadas)
   - **Distance Matrix API** (para calcular distancias)
   - **Geocoding API** (para obtener coordenadas)
4. Ve a "Credenciales" → "Crear credenciales" → "Clave de API"
5. **Configurar restricciones de la API Key:**
   - Tipo: **Restricciones de HTTP (sitios web)**
   - Referentes web permitidos:
     ```
     https://tu-dominio.cl/*
     https://3t.loopia.cl/*
     http://localhost:3000/*
     ```
6. Copia la API Key generada
7. Agrégala al archivo `/opt/cane/env/3t.env`:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...tu_clave_aqui
   ```

**⚠️ IMPORTANTE**:
- Debes habilitar "Places API" (la versión ANTIGUA), no "Places API (New)"
- Las restricciones HTTP son importantes para seguridad
- La API Key debe ser del tipo "Clave de API para navegador"

**Costos:**
- Tier gratuito: $200 USD de crédito mensual
- Places Autocomplete: $2.83 por 1000 sesiones
- Directions API: $5 por 1000 requests
- Con uso normal del sistema (~100 requests/mes), permanecerás dentro del tier gratuito

El `docker-compose.yml` carga estas variables usando `env_file`:

```yaml
env_file:
  - /opt/cane/env/3t.env
```

### Puerto de Escucha

El contenedor escucha en el **puerto 3002** internamente:

```dockerfile
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"
EXPOSE 3002
```

### Red Docker

El contenedor está conectado a la red `cane_net`:

```yaml
networks:
  cane_net:
    external: true
```

---

## 🚀 Despliegue

### Pre-requisitos

- Docker y Docker Compose instalados
- Red Docker `cane_net` creada
- Nginx Proxy Manager configurado
- Acceso a Supabase

### Modo Desarrollo (Hot Reload)

**Para desarrollo diario con cambios instantáneos:**

```bash
# 1. Navegar al directorio del proyecto
cd /opt/cane/3t

# 2. Iniciar modo desarrollo
./dev.sh

# 3. Acceder a la app de desarrollo
# https://dev.3t.loopia.cl

# 4. Ver logs en tiempo real
./logs-dev.sh

# Los cambios en el código se reflejan automáticamente en < 1 segundo
```

**Características del modo desarrollo:**
- ✅ Hot reload automático (Fast Refresh de Next.js)
- ✅ Sin necesidad de rebuild
- ✅ Cambios visibles en tiempo real
- ✅ HTTPS vía Nginx Proxy Manager
- ✅ Acceso desde cualquier dispositivo
- ✅ Puerto interno: 3001
- ✅ Dominio: `dev.3t.loopia.cl`

**⚠️ Importante:** Necesitas configurar el proxy host `dev.3t.loopia.cl` en Nginx Proxy Manager (ver sección de configuración más abajo).

### Modo Producción (Build Optimizado)

**Para deploy final a usuarios:**

```bash
# 1. Navegar al directorio del proyecto
cd /opt/cane/3t

# 2. Deploy a producción
./prod.sh

# 3. Verificar estado del contenedor
docker ps | grep 3t-app

# 4. Ver logs en tiempo real
./logs-prod.sh
```

**Características del modo producción:**
- ✅ Build optimizado y compilado
- ✅ Mejor rendimiento
- ✅ Menor consumo de recursos
- ✅ Puerto interno: 3002
- ✅ Dominio: `3t.loopia.cl`

### Configuración de Nginx Proxy Manager

#### Proxy Host para Desarrollo: `dev.3t.loopia.cl`

**Pestaña Details:**
- **Domain Names**: `dev.3t.loopia.cl`
- **Scheme**: `http`
- **Forward Hostname / IP**: `3t-app-dev` (nombre del contenedor)
- **Forward Port**: `3001`
- **Cache Assets**: ✅ Activado
- **Block Common Exploits**: ✅ Activado
- **Websockets Support**: ✅ Activado (importante para hot reload)

**Pestaña SSL:**
- **SSL Certificate**: Request a New SSL Certificate (Let's Encrypt)
- **Force SSL**: ✅ Activado
- **HTTP/2 Support**: ✅ Activado
- **HSTS Enabled**: ✅ Activado

**⚠️ Nota:** También necesitas crear el registro DNS A para `dev.3t.loopia.cl` apuntando a la IP del servidor.

#### Proxy Host para Producción: `3t.loopia.cl`

**Pestaña Details:**
- **Domain Names**: `3t.loopia.cl`
- **Scheme**: `http`
- **Forward Hostname / IP**: `3t-app` (nombre del contenedor)
- **Forward Port**: `3002`
- **Cache Assets**: ✅ Activado
- **Block Common Exploits**: ✅ Activado
- **Websockets Support**: ✅ Activado

**Pestaña SSL:**
- **SSL Certificate**: Let's Encrypt o certificado personalizado
- **Force SSL**: ✅ Activado
- **HTTP/2 Support**: ✅ Activado
- **HSTS Enabled**: ✅ Activado

---

## 💻 Uso

### Acceso a la Aplicación

**URL**: [https://3t.loopia.cl](https://3t.loopia.cl)

### Módulos Disponibles

#### 🏠 Home (Dashboard Operacional)
- **Dashboard operacional** enfocado en gestión diaria de rutas y pedidos
- **Saludo personalizado** con resumen del día:
  - Saludo contextual según hora (Buenos días/tardes/noches)
  - Nombre del usuario autenticado
  - Total de pedidos en ruta
  - Desglose de productos (PET, PC)
  - Viajes necesarios (capacidad: 55 botellones/viaje)
- **Pedidos en Gestión** (Lista compacta):
  - Tabs: "En Ruta" y "Pedidos"
  - Formato tabla: Cliente | Comuna | Cantidad + Producto | Botón ✓
  - Totales de productos en header (badges)
  - **Despacho directo** desde Home con modal:
    - Cantidad entregada
    - Notas opcionales
    - Foto opcional (con timeout de 10s)
- **Rutas Optimizadas del Día**:
  - Resumen de rutas guardadas
  - Desglose: paradas, capacidad, PET/PC por ruta
  - Botón "Ver Mapa Completo de Rutas"
- **Observaciones Importantes**:
  - Solo pedidos en estado "Ruta" con notas especiales
  - Expansión/colapso si hay más de 5
- Vista optimizada para repartidores y operadores

#### 👥 Clientes (`/clientes`)
- **Gestión completa de clientes**: Crear/Editar/Eliminar
- **Campos**: Nombre, Tipo (hogar/empresa), Teléfono, Email, Precio Recarga (CLP)
- **Gestión de direcciones** integrada:
  - Agregar/Editar/Eliminar direcciones por cliente
  - Autocompletado de direcciones con Google Maps Places API
  - Captura automática de coordenadas (lat/lng)
  - Extracción automática de comuna
  - Soporte para múltiples direcciones por cliente
  - Designación de dirección predeterminada
  - Validación de dependencias (evita eliminar si tiene pedidos)

#### 📦 Productos (`/productos`)
- Gestión de formatos de productos
- Crear/Editar/Eliminar productos
- Campos: Formato, Precio base

#### 🚚 Proveedores (`/proveedores`)
- **Gestión completa de proveedores**: Crear/Editar/Eliminar
- **Campos**: Nombre, Teléfono, Email, Observaciones
- **Gestión de direcciones** integrada:
  - Agregar/Editar/Eliminar direcciones por proveedor
  - Autocompletado de direcciones con Google Maps Places API
  - Captura automática de coordenadas (lat/lng)
  - Extracción automática de comuna
  - Soporte para múltiples direcciones por proveedor
  - Designación de dirección predeterminada
  - Validación de dependencias (evita eliminar si tiene compras)

#### 🛒 Compras (`/compras`)
- **Órdenes de compra multi-producto**:
  - Agregar múltiples productos diferentes en una compra
  - Ingresar precio de compra por producto
  - Carrito visual con subtotales
  - Número de orden del proveedor
- Crear y gestionar compras con CRUD completo
- Selección de proveedor y dirección (con carga automática de dirección predeterminada)
- **Historial de precios**: Ver precios históricos por proveedor/producto
- Estados: Pedido, Ruta, Completado
- Cálculo automático de totales
- **Integración con rutas**: Las compras se pueden incluir en el optimizador de rutas

#### 📋 Pedidos (`/pedidos`)
- **⭐ Pedidos multi-producto** (actualizado Octubre 2025):
  - Agregar múltiples productos diferentes en un solo pedido
  - Auto-detección inteligente del tipo de pedido (recarga/nuevo/compras)
  - Carrito visual con subtotales por producto
  - Visualización completa con modal de detalles
  - Compatible con pedidos antiguos de 1 solo producto
- Crear y gestionar pedidos con CRUD completo
- Selección de cliente y dirección (con carga automática de dirección predeterminada)
- Cálculo automático de precio según:
  - Cantidad × Precio unitario por cada producto
  - Tipo de cliente (hogar/empresa)
  - Tipo de producto (recarga usa precio del cliente, nuevo usa precio del producto)
- Estados: Pedido, Ruta, Despachado
- Pagos: Pendiente, Pagado, Facturado, Interno

#### 🚚 Rutas (`/rutas`)
- Optimización inteligente de rutas usando Google Maps Directions API
- **⭐ Integración de compras y entregas**:
  - Checkbox para incluir compras en la ruta
  - Compras (🟠 naranja) y entregas (🔵 azul) en la misma ruta
  - Compras van primero (ir a proveedor antes de entregar)
- Selección de pedidos/compras en estado "Ruta" por fecha
- Agrupación automática por capacidad (máx. 55 botellones)
- División inteligente en múltiples rutas cuando excede capacidad
- Agrupación por comuna para optimizar distancias
- **Visualización en mapa nativo de Google Maps con auto-centrado**
- Marcadores diferenciados:
  - 🟢 Verde: Bodega (inicio)
  - 🟠 Naranja: Proveedores (compras)
  - 🔵 Azul: Clientes (entregas)
  - 🔴 Rojo: Destino final
- Info windows interactivos con detalles de cada parada
- Orden secuencial con distancia y tiempo estimado
- Botón para abrir ruta directamente en Google Maps (navegación)
- Punto de partida/llegada: Bodega en Cam. San Alberto Hurtado 13460, Maipú

#### 📊 Dashboard (`/dashboard`)
- **Filtros de período predefinido**: Mes Actual, Mes Anterior, Trimestre, Año, Personalizado
- Filtros adicionales: fecha, tipo de cliente y cliente específico
- **8 métricas KPI balanceadas**:
  - Financieras: Ingresos del período (con % cambio), Ventas por tipo, Ticket promedio
  - Operacionales: Pedidos por estado, Botellones entregados, Tiempo promedio de entrega
  - Comerciales: Clientes activos, Top comuna
- **Gráficos modernos con shadcn/ui**:
  - Mes Actual vs Mes Anterior (AreaChart comparativo con filtros 7d/30d/3m)
  - Comparativa Año sobre Año (mismo mes del año anterior)
  - Ventas por Producto (BarChart)
  - Top 10 Comunas (BarChart horizontal)
  - Top 10 Clientes (BarChart horizontal)
- Estética profesional: gradientes suaves, grid minimalista, contraste alto en comparativas

#### 🗺️ Mapa (`/mapa`)
- Visualización geográfica de direcciones de entrega
- Marcadores interactivos con información del cliente
- Filtros por:
  - Fecha de entrega (buscar entregas de un día específico)
  - Estado de pedido (Pedido, Ruta, Despachado)
  - Tipo de cliente (Hogar, Empresa)
- Estadísticas en tiempo real según filtros aplicados
- Agrupación de entregas por ubicación

---

## 🗄️ Base de Datos

### Tablas Supabase

El proyecto utiliza tablas con prefijo `3t_`:

#### `3t_customers` (Clientes)
```sql
- id: UUID (PK)
- name: TEXT
- customer_type: TEXT ('hogar' | 'empresa')
- phone: TEXT
- observations: TEXT
- created_at: TIMESTAMP
```

#### `3t_addresses` (Direcciones)
```sql
- id: UUID (PK)
- customer_id: UUID (FK → 3t_customers)
- street: TEXT
- city: TEXT
- latitude: NUMERIC
- longitude: NUMERIC
- created_at: TIMESTAMP
```

**Relación**: Un cliente puede tener **múltiples direcciones**.

#### `3t_products` (Productos)
```sql
- id: UUID (PK)
- format: TEXT ('10L', '20L', etc.)
- base_price: INTEGER (sin decimales)
- created_at: TIMESTAMP
```

#### `3t_orders` (Pedidos)
```sql
- id: UUID (PK)
- customer_id: UUID (FK → 3t_customers)
- address_id: UUID (FK → 3t_addresses)
- product_id: UUID (FK → 3t_products) -- Para compatibilidad con pedidos antiguos
- quantity: INTEGER
- is_refill: BOOLEAN (true = recarga, false = nuevo)
- unit_price: INTEGER
- total_price: INTEGER (quantity × unit_price)
- order_status: TEXT ('pedido' | 'ruta' | 'despachado')
- payment_status: TEXT ('pendiente' | 'pagado' | 'facturado')
- payment_type: TEXT ('efectivo' | 'transferencia')
- observations: TEXT
- order_date: DATE
- delivery_date: TIMESTAMP
- created_at: TIMESTAMP
```

#### `order_products` (Productos por Pedido) ⭐ NUEVO
```sql
- id: UUID (PK, auto-generado)
- order_id: TEXT (FK → 3t_orders.order_id)
- product_id: TEXT (FK → 3t_products.product_id)
- quantity: INTEGER NOT NULL
- price_neto: NUMERIC NOT NULL
- total: INTEGER (calculado: quantity × price_neto)
- UNIQUE(order_id, product_id)
```

**Relación**: Un pedido puede tener **múltiples productos** (implementado Octubre 2025).

**Compatibilidad**: Los pedidos antiguos (anteriores a Octubre 2025) usan solo `3t_orders.product_id`. Los pedidos nuevos usan la tabla `order_products` para soportar múltiples productos.

#### `3t_users` (Usuarios)
```sql
- id: UUID (PK)
- email: TEXT
- role: TEXT
- created_at: TIMESTAMP
```

### Consultas con Relaciones

```typescript
// Ejemplo: Obtener pedidos con datos de cliente, dirección y producto
const { data } = await supabase
  .from('3t_orders')
  .select(`
    *,
    customer:3t_customers(*),
    address:3t_addresses(*),
    product:3t_products(*)
  `)
  .order('created_at', { ascending: false });
```

---

## 🔧 Troubleshooting

### El contenedor no arranca

```bash
# Ver logs del contenedor
docker logs 3t-app

# Verificar que la red existe
docker network ls | grep cane_net

# Crear red si no existe
docker network create cane_net

# Reconstruir y levantar
cd /opt/cane/3t
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Error 502 Bad Gateway

```bash
# Verificar que el contenedor está corriendo
docker ps | grep 3t-app

# Verificar que responde en el puerto 3002
docker exec 3t-app netstat -tlnp

# Probar conexión desde la red interna
docker run --rm --network cane_net alpine/curl http://3t-app:3002

# Si no responde, revisar logs
docker logs 3t-app
```

### Problemas con Supabase

```bash
# Verificar variables de entorno
docker exec 3t-app env | grep SUPABASE

# Probar conexión a Supabase
curl https://api.loopia.cl

# Verificar credenciales en docker-compose.yml
```

### Puerto ocupado

```bash
# Ver qué está usando el puerto 3002
lsof -i :3002

# Matar proceso si es necesario
lsof -ti:3002 | xargs kill -9

# Cambiar puerto en docker-compose.yml y Dockerfile si es necesario
```

### Rebuild completo

```bash
cd /opt/cane/3t

# Detener y eliminar contenedor
docker compose down

# Eliminar imagen antigua
docker rmi 3t-3t-app

# Rebuild completo
docker compose build --no-cache

# Levantar
docker compose up -d

# Ver logs
docker logs -f 3t-app
```

---

## 🔄 Workflow Recomendado

### Durante Desarrollo (Lunes a Viernes)

```bash
# 1. Iniciar modo desarrollo
cd /opt/cane/3t
./dev.sh

# 2. Abrir en navegador
# https://dev.3t.loopia.cl

# 3. Editar código en tu editor favorito
# Los cambios se reflejan automáticamente en < 1 segundo

# 4. Ver logs si hay errores
./logs-dev.sh

# 5. Probar en dispositivos
# - PC: https://dev.3t.loopia.cl
# - Móvil: https://dev.3t.loopia.cl
# - Tablet: https://dev.3t.loopia.cl

# 6. Al terminar el día (opcional)
docker compose -f docker-compose.dev.yml down
```

### Deploy a Producción

**Solo cuando todo funcione en desarrollo:**

```bash
# 1. Cambiar a modo producción
cd /opt/cane/3t
./prod.sh

# 2. Verificar en producción
# https://3t.loopia.cl

# 3. Probar en móvil
# https://3t.loopia.cl

# 4. Si todo funciona: ✅ Deploy exitoso
```

### Ventajas del Nuevo Workflow

**Antes (método antiguo):**
- Cambio en CSS → Build completo → 6-12 minutos ❌

**Ahora (método nuevo):**
- Cambio en CSS → Hot reload → < 1 segundo ✅
- **Ahorro: 99% del tiempo**

### Cuándo Hacer Deploy

**✅ Hacer deploy cuando:**
- Agregaste una funcionalidad completa
- Arreglaste bugs importantes
- Al final del día de trabajo
- Antes del fin de semana

**❌ NO hacer deploy cuando:**
- Estés experimentando
- Hagas cambios pequeños
- No hayas probado en desarrollo

---

## 📝 Comandos Útiles

### Scripts Rápidos

```bash
# Iniciar modo desarrollo
./dev.sh

# Ver logs de desarrollo
./logs-dev.sh

# Deploy a producción
./prod.sh

# Ver logs de producción
./logs-prod.sh
```

### Comandos Docker

```bash
# Ver estado de contenedores
docker ps -a | grep 3t

# Detener desarrollo
docker compose -f docker-compose.dev.yml down

# Detener producción
docker compose -f docker-compose.yml down

# Entrar al contenedor de desarrollo
docker exec -it 3t-app-dev sh

# Entrar al contenedor de producción
docker exec -it 3t-app sh

# Ver uso de recursos
docker stats 3t-app
docker stats 3t-app-dev
```

### Rollback y Recuperación

```bash
# Si algo falla, restaurar desde backup
cd /opt/cane

# Listar backups disponibles
ls -lh backups/3t-backup-*

# Restaurar backup (usar la fecha correcta)
tar -xzf backups/3t-backup-YYYYMMDD-HHMMSS.tar.gz

# Reiniciar producción
cd /opt/cane/3t
docker compose down
docker compose up -d
```

# Inspeccionar red
docker network inspect cane_net

# Ver configuración del contenedor
docker inspect 3t-app
```

---

## 👨‍💻 Desarrollo

### Modo Desarrollo Local

```bash
# Instalar dependencias
npm install

# Crear .env.local con variables
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://api.loopia.cl
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_aqui
EOF

# Iniciar servidor de desarrollo
npm run dev

# Abrir en navegador
# http://localhost:3000
```

### Build de Producción

```bash
# Build local
npm run build

# Iniciar servidor de producción
npm start
```

---

## 📄 Licencia

Proyecto interno - Agua Tres Torres

---

## 🤝 Soporte

Para dudas o problemas, contactar al administrador del sistema.

**Última actualización**: Octubre 15, 2025
- Mejoras de UX: Transición de tema corregida, avatares por rol, inputs de cantidad optimizados
- Implementación de Pedidos Multi-Producto
- Búsqueda Sin Límites y Filtro de Cuentas por Cobrar
