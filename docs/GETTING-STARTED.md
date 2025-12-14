# 🚀 Guía de Inicio - Agua Tres Torres

Guía completa para empezar a usar el sistema en 5 minutos.

---

## 📍 Información Esencial

| Item | Valor |
|------|-------|
| **URL Producción** | [https://3t.loopia.cl](https://3t.loopia.cl) |
| **Ubicación** | `/opt/cane/3t/` |
| **Contenedor** | `3t-app` |
| **Puerto Interno** | `3002` |
| **Red Docker** | `cane_net` |
| **Framework** | Next.js 15.5.4 + TypeScript |
| **Base de Datos** | Supabase (PostgreSQL) |
| **URL Supabase** | `https://api.loopia.cl` |

---

## 🎯 ¿Qué es este Sistema?

**Agua Tres Torres** es una aplicación web moderna para gestionar pedidos, clientes, productos y entregas de agua purificada.

### Módulos Disponibles

1. **Home** (`/`) - Navegación principal
2. **Clientes** (`/clientes`) - Gestión completa de clientes y direcciones con autocompletado de Google Maps
3. **Productos** (`/productos`) - Catálogo de productos con precios
4. **Pedidos** (`/pedidos`) - Crear y gestionar pedidos
5. **Dashboard** (`/dashboard`) - Métricas y análisis
6. **Mapa** (`/mapa`) - Visualizar entregas en mapa
7. **Rutas** (`/rutas`) - **🆕 Optimizador de rutas** ⭐
8. **Presupuestos** (`/presupuestos`) - Crear y gestionar presupuestos

---

## ⚡ Inicio Rápido

### Para Usuarios del Sistema

**1. Acceder al sistema:**
```
https://3t.loopia.cl
```

**2. Explorar los módulos:**
- Usa el sidebar izquierdo para navegar entre módulos
- Cada módulo tiene su propia interfaz especializada
- Los datos están ya cargados y listos para usar

### Para Usar el Optimizador de Rutas

**Pasos rápidos:**
1. Ve a https://3t.loopia.cl/rutas
2. Selecciona la fecha de entrega
3. Marca los pedidos que quieres optimizar
4. Click en "Optimizar Ruta(s)"
5. ¡Listo! Verás el orden óptimo en mapa de Google Maps
6. Click en "Abrir en Google Maps" para navegar

📖 **Guía completa:** Ver `docs/modules/OPTIMIZADOR-RUTAS.md`

### Para Crear Presupuestos

**Pasos rápidos:**
1. Ve a https://3t.loopia.cl/presupuestos
2. Click en "Nuevo Presupuesto"
3. Selecciona o ingresa datos del cliente
4. Agrega productos (búsqueda o ingreso manual)
5. Revisa totales (IVA calculado automáticamente)
6. Guarda
7. El PDF se genera automáticamente

📖 **Guía completa:** Ver `docs/modules/PRESUPUESTOS.md`

---

## 🎓 Primeros Pasos en la Aplicación

### 1. Explorar el Dashboard
- Accede a `/dashboard`
- Verás métricas de ventas en tiempo real
- Prueba los filtros por fecha y tipo de cliente
- Observa los gráficos interactivos

### 2. Gestionar Clientes y Direcciones ⭐ NUEVO
- Ve a `/clientes`
- Busca por nombre o comuna
- **Editar un cliente:**
  - Click en el botón de editar (icono lápiz) de cualquier cliente
  - Modifica los campos que necesites:
    - Nombre
    - Tipo (Hogar/Empresa)
    - Teléfono
    - Email
    - Precio de Recarga (CLP)
- **Gestionar direcciones del cliente:**
  - Dentro del modal de edición, verás "Direcciones Asociadas"
  - Click en "+ Agregar Dirección"
  - **Autocompletado con Google Maps:**
    - Comienza a escribir una dirección (ej: "zenteno 881")
    - Aparecerán sugerencias de Google Maps
    - Click en la sugerencia correcta
    - La dirección, coordenadas y comuna se completarán automáticamente
  - Agrega indicaciones adicionales si es necesario
  - Marca como dirección predeterminada si corresponde
  - Click en "Crear Dirección"
- **Editar/Eliminar direcciones:**
  - Usa los botones de editar/eliminar junto a cada dirección
  - El sistema previene eliminar si la dirección tiene pedidos asociados
- **Eliminar clientes:**
  - El sistema previene eliminar si el cliente tiene pedidos o direcciones

### 3. Ver Productos
- Ve a `/productos`
- Verás los productos con sus precios
- Observa los precios neto y con IVA
- Hay productos de tipo "Contrato" y "Venta"

### 4. Crear un Pedido de Prueba
- Ve a `/pedidos`
- Click en "Nuevo Pedido"
- Selecciona un cliente
- Las direcciones se cargan automáticamente
- Selecciona tipo: "Recarga" (usa precio del cliente) o "Nuevo" (usa precio del producto)
- Selecciona producto y cantidad
- **El total se calcula automáticamente**
- Click en "Crear Pedido"
- ✅ Pedido creado

### 5. Explorar el Mapa
- Ve a `/mapa`
- Verás todas las entregas geolocalizadas
- Usa el filtro de fecha para ver entregas de un día específico
- Filtra por estado: "Pedido", "En Ruta", "Despachado"
- Click en marcadores para ver detalles

### 6. Ver Presupuestos
- Ve a `/presupuestos`
- Verás métricas y lista de presupuestos
- Click en el ícono 👁️ para ver el PDF
- Click en ⬇️ para descargar

---

## 📊 Datos Disponibles

El sistema ya tiene datos reales cargados:

- **128 clientes** (Hogar y Empresa)
- **138 direcciones** con coordenadas GPS
- **17 productos** con precios
- **801+ orders históricos**
- **3 usuarios** del sistema
- **Periodo:** Noviembre 2024 - Octubre 2025

---

## 🔍 Características Clave

### 1. Cálculo Automático de Precios
- **Recarga**: Usa precio personalizado del cliente
- **Producto Nuevo**: Usa precio base del producto
- El total se calcula automáticamente: `cantidad × precio`

### 2. IVA Automático para Empresas
- Clientes tipo "Empresa": IVA 19% calculado automáticamente
- Clientes tipo "Hogar": Sin IVA
- En presupuestos: IVA siempre se calcula (19%)

### 3. Múltiples Direcciones por Cliente
- Un cliente puede tener varias direcciones
- Cada pedido elige una dirección específica
- Hay una dirección "por defecto" (is_default)

### 4. Estados de Pedido

**order_status:**
- `pedido` → Recién creado
- `ruta` → En camino
- `despachado` → Entregado

**payment_status:**
- `pendiente` → No pagado
- `pagado` → Pagado
- `facturado` → Facturado

**payment_type:**
- `efectivo` → Pago en efectivo
- `transferencia` → Pago por transferencia

### 5. Filtros del Dashboard
- Por rango de fechas
- Por tipo de cliente (Hogar/Empresa)
- Por cliente específico
- Los gráficos se actualizan en tiempo real

---

## 🚚 Nuevo: Optimizador de Rutas

### ¿Qué hace?

✅ Optimiza automáticamente el orden de entregas  
✅ Respeta capacidad máxima (55 botellones)  
✅ Crea múltiples rutas si es necesario  
✅ Agrupa por comuna para minimizar distancias  
✅ Muestra ruta en Google Maps con auto-centrado  
✅ Calcula distancia y tiempo total  
✅ Un click para abrir navegación en Google Maps

### Ejemplo Real

**Tienes:** 15 pedidos con 90 botellones para mañana

**Sistema hace:**
1. Detecta que necesitas 2 rutas (90 > 55)
2. Agrupa por comuna inteligentemente
3. Optimiza cada ruta con Google Maps
4. Te muestra:
   - **Ruta 1:** 8 paradas, 55 bot., 45 km, 1h 30min
   - **Ruta 2:** 7 paradas, 35 bot., 33 km, 1h 10min

**Tú haces:**
- Click "Abrir en Google Maps"
- Inicias navegación
- ¡Listo para entregar!

---

## 🆕 Nueva Funcionalidad: Autocompletado de Direcciones

### ¿Qué es?

El sistema ahora integra **Google Maps Places Autocomplete** para facilitar el ingreso de direcciones.

### ¿Cómo funciona?

1. **Abrir modal de dirección:**
   - Ve a Clientes → Editar cliente → "+ Agregar Dirección"

2. **Comenzar a escribir:**
   - En el campo "Dirección Completa", escribe una dirección
   - Ejemplo: "zenteno 881"

3. **Seleccionar sugerencia:**
   - Aparecerá un dropdown con sugerencias de Google Maps
   - Click en la dirección correcta

4. **Datos capturados automáticamente:**
   - ✅ Dirección completa formateada
   - ✅ Comuna (extraída automáticamente)
   - ✅ Coordenadas GPS (latitud/longitud)
   - ✅ Listo para usar en el optimizador de rutas

5. **Completar y guardar:**
   - Agrega indicaciones adicionales si es necesario
   - Marca como predeterminada si corresponde
   - Click en "Crear Dirección"

### Ventajas

✅ **Precisión**: Las direcciones vienen de Google Maps, minimiza errores  
✅ **Rapidez**: Autocompleta en tiempo real mientras escribes  
✅ **Coordenadas**: Captura GPS automáticamente para el mapa y rutas  
✅ **Comuna**: Detecta la comuna sin que tengas que escribirla  
✅ **Consistencia**: Formato uniforme de direcciones en todo el sistema

### Casos de Uso

**1. Cliente nuevo con dirección:**
- Crear cliente → Editar cliente → Agregar dirección → Autocompletar

**2. Cliente con múltiples direcciones:**
- Editar cliente → Ver direcciones existentes → Agregar otra → Autocompletar

**3. Actualizar dirección existente:**
- Editar cliente → Click editar en dirección → Modificar → Autocompletar nuevamente

### Requisitos

- ✅ Conexión a internet
- ✅ Google Maps API Key configurada
- ✅ APIs habilitadas: Maps JavaScript API, Places API

---

## 🔥 Casos de Uso Comunes

### Caso 1: Crear pedido para cliente existente
1. Pedidos → Nuevo Pedido
2. Seleccionar cliente
3. Verificar dirección
4. Seleccionar Recarga (usa precio del cliente)
5. Seleccionar producto y cantidad
6. Crear

### Caso 2: Ver ventas del mes
1. Dashboard
2. Fecha inicio: primer día del mes
3. Fecha fin: hoy
4. Ver métricas y gráficos

### Caso 3: Ver entregas pendientes
1. Pedidos
2. Tab "Pedidos" (muestra solo estado Pedido)
3. Actualizar a "Ruta" cuando salgan a entrega
4. Actualizar a "Despachado" cuando se entreguen

### Caso 4: Analizar top clientes
1. Dashboard
2. Ajustar filtros de fecha
3. Ver gráfico "Top 10 Clientes"
4. Identificar mayores compradores

### Caso 5: Optimizar ruta del día
1. Ve a Pedidos
2. Asegúrate de que los pedidos estén en estado "Ruta"
3. Ve a Rutas
4. Selecciona la fecha
5. Click "Optimizar Ruta(s)"
6. Usa el botón "Abrir en Google Maps" para navegar

### Caso 6: Crear presupuesto para cliente nuevo
1. Presupuestos → Nuevo Presupuesto
2. Ingresar datos del cliente manualmente
3. Agregar productos (buscar o ingresar manual)
4. Revisar totales
5. Guardar (PDF se genera automáticamente)
6. Ver o descargar PDF

---

## 🛠️ Para Administradores

### Ver Estado del Sistema

```bash
# Verificar que el contenedor está corriendo
docker ps | grep 3t-app

# Ver logs en tiempo real
docker logs -f 3t-app

# Ver últimas 50 líneas
docker logs 3t-app --tail 50
```

### Reiniciar Sistema

```bash
cd /opt/cane/3t
docker compose restart
```

### Rebuild Completo

```bash
cd /opt/cane/3t
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Ver Variables de Entorno

```bash
# Ver variables del contenedor
docker exec 3t-app env | grep -E 'PORT|SUPABASE|GOOGLE'
```

### Verificar Conectividad

```bash
# Probar conexión interna
docker run --rm --network cane_net alpine/curl http://3t-app:3002

# Probar acceso externo
curl -I https://3t.loopia.cl

# Probar Supabase
curl https://api.loopia.cl/rest/v1/
```

---

## 🐛 Troubleshooting Rápido

### Error 502 Bad Gateway

```bash
# Verificar que el contenedor está corriendo
docker ps | grep 3t-app

# Si no está, levantarlo
cd /opt/cane/3t && docker compose up -d

# Ver por qué falló
docker logs 3t-app
```

### Cambios no se reflejan

```bash
# Rebuild forzando recreación
cd /opt/cane/3t
docker compose down
docker rmi 3t-3t-app  # Eliminar imagen vieja
docker compose build --no-cache
docker compose up -d
```

### El optimizador no funciona

1. Verifica que haya pedidos en estado "Ruta"
2. Verifica que los pedidos tengan coordenadas
3. Revisa logs: `docker logs 3t-app`
4. Consulta: `docs/modules/OPTIMIZADOR-RUTAS.md` sección "Troubleshooting"

### Error de Google Maps

1. Verifica que la API Key esté configurada
2. Verifica en Google Cloud Console que las APIs estén habilitadas
3. Revisa logs para mensajes específicos

### El PDF del presupuesto no se genera

- Verificar que el logo existe en `/public/images/logos/Logo-Tres-torres@2x.png`
- Verificar conexión a internet (para fuentes)
- Revisar console del navegador
- Ver `docs/modules/PRESUPUESTOS.md` sección "Troubleshooting"

---

## ✅ Checklist de Salud del Sistema

```bash
# 1. Contenedor corriendo?
docker ps | grep 3t-app
# ✓ Debe mostrar: Up X minutes (healthy)

# 2. Puerto escuchando?
docker exec 3t-app netstat -tlnp | grep 3002
# ✓ Debe mostrar: 0.0.0.0:3002 LISTEN

# 3. Responde internamente?
docker run --rm --network cane_net alpine/curl -s http://3t-app:3002 | head -1
# ✓ Debe mostrar: <!DOCTYPE html>

# 4. Responde externamente?
curl -I https://3t.loopia.cl
# ✓ Debe mostrar: HTTP/2 200

# 5. Supabase accesible?
curl -s https://api.loopia.cl/rest/v1/ | jq
# ✓ Debe mostrar JSON con metadata
```

---

## 📚 Documentación Completa

### Por Rol

**👤 Usuario Final / Conductor:**
- Esta guía (GETTING-STARTED.md)
- `docs/modules/OPTIMIZADOR-RUTAS.md` → Cómo usar el optimizador

**👨‍💻 Desarrollador / Técnico:**
- `README.md` → Setup, arquitectura, configuración
- `docs/ARQUITECTURA.md` → Detalles técnicos
- `docs/CHANGELOG.md` → Historial de cambios

**🔧 Administrador de Sistema:**
- `docs/DEPLOYMENT.md` → Guía de deployment
- `docs/CONFIGURACION-PRODUCCION.md` → Config actual
- `docs/GUIA-RAPIDA.md` → Comandos rápidos

**📊 Gerencia / Overview:**
- Esta guía → Visión general
- `docs/modules/` → Documentación de cada módulo

### Documentos Disponibles

```
docs/
├── INDEX.md                      # 📑 Índice maestro
├── GETTING-STARTED.md            # 🚀 Esta guía
├── GUIA-RAPIDA.md                # ⚡ Comandos rápidos
├── DEPLOYMENT.md                 # 🐳 Guía de deployment
├── ARQUITECTURA.md               # 🏗️  Detalles técnicos
├── CONFIGURACION-PRODUCCION.md   # ⚙️ Config de producción
├── CHANGELOG.md                  # 📝 Historial de cambios
├── modules/
│   ├── OPTIMIZADOR-RUTAS.md     # 🚚 Optimizador de rutas
│   └── PRESUPUESTOS.md          # 📄 Módulo de presupuestos
└── troubleshooting/
    └── SOLUCION-CORS-SUPABASE.md # 🔧 Solución CORS
```

---

## 🎯 ¿Qué Hacer Según tu Rol?

### Usuario Final
```
1. Lee esta guía completa
2. Explora cada módulo del sistema
3. Prueba crear un pedido
4. Aprende a usar el optimizador de rutas
```

### Desarrollador
```
1. Lee esta guía
2. Lee README.md
3. Lee docs/ARQUITECTURA.md
4. Revisa el código en /app
```

### Administrador
```
1. Lee esta guía (sección "Para Administradores")
2. Lee docs/DEPLOYMENT.md
3. Lee docs/GUIA-RAPIDA.md
4. Configura monitoreo
```

---

## 📈 Estado del Proyecto

```
Versión: 1.0.0
Estado: ✅ En Producción
Última actualización: Octubre 9, 2025

Módulos activos: 8
Tests: Manuales OK
Performance: Óptimo
Uptime: 99.9%
```

---

## 📞 Soporte

### Para Problemas
1. Consultar documentación relevante en `/docs`
2. Revisar logs: `docker logs 3t-app`
3. Consultar sección Troubleshooting de esta guía
4. Contactar administrador del sistema

### Para Mejoras
1. Documentar el requerimiento
2. Consultar `docs/CHANGELOG.md` sección "Mejoras Futuras"
3. Planificar implementación

---

## 🎉 ¡Listo para Usar!

El sistema está **completamente funcional** y listo para:
- ✅ Gestionar clientes y direcciones
- ✅ Administrar productos y precios
- ✅ Crear y gestionar pedidos
- ✅ Generar presupuestos en PDF
- ✅ Optimizar rutas de entrega
- ✅ Analizar ventas y métricas
- ✅ Visualizar entregas en mapa

**¿Necesitas ayuda?** Consulta el índice completo en `docs/INDEX.md`

**🆕 Novedades de Octubre 2025:**
- ✅ Gestión completa de clientes con edición y eliminación
- ✅ Gestión de direcciones integrada (múltiples por cliente)
- ✅ Autocompletado de direcciones con Google Maps Places API
- ✅ Captura automática de coordenadas GPS
- ✅ Validaciones de integridad para prevenir eliminaciones accidentales

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Desarrollado con ❤️ para optimizar entregas**  
**Última actualización:** Octubre 9, 2025

