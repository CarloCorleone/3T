# 🚚 Guía del Optimizador de Rutas

## Descripción General

El optimizador de rutas es una herramienta inteligente que organiza automáticamente las entregas del día para maximizar la eficiencia, reducir distancias y tiempos de viaje.

**Características principales:**
- ✅ Optimización automática usando Google Maps Directions API
- ✅ Agrupación inteligente por capacidad (máx. 55 botellones)
- ✅ División automática en múltiples rutas cuando se excede capacidad
- ✅ Priorización por comuna para minimizar distancias
- ✅ Visualización interactiva en mapa
- ✅ Navegación directa a Google Maps

---

## 📋 Requisitos Previos

### 1. Configurar Google Maps API Key

Antes de usar el optimizador, necesitas configurar la API Key de Google Maps:

1. **Obtener API Key:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un proyecto o selecciona uno existente
   - Habilita "Directions API" y "Distance Matrix API"
   - Crea una clave de API en "Credenciales"

2. **Agregar la clave al proyecto:**
   ```bash
   # Editar archivo de configuración
   nano /opt/cane/env/3t.env
   
   # Agregar la línea:
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...tu_clave_aqui
   ```

3. **Reiniciar el contenedor:**
   ```bash
   cd /opt/cane/3t
   docker compose restart
   ```

### 2. Preparar pedidos y compras

**Pedidos (entregas)** deben:
- Estar en estado "Ruta"
- Tener fecha de entrega asignada
- Tener dirección con coordenadas válidas (lat/lng)

**Compras (opcional)** deben:
- Estar en estado "Ruta" en el módulo `/compras`
- Tener proveedor con dirección GPS configurada
- Activar checkbox "Incluir compras en la ruta" en el optimizador

---

## 🎯 Cómo Usar el Optimizador

### Paso 1: Acceder al módulo

1. Abre la aplicación: https://3t.loopia.cl
2. En el sidebar izquierdo, haz clic en **"Rutas"**
3. **El sistema cargará automáticamente la última ruta optimizada guardada** (si existe)

### Paso 2: Revisar ruta guardada (si existe)

Si ya optimizaste rutas anteriormente:
- Las rutas se cargarán automáticamente al entrar al módulo
- Verás las paradas en el orden previamente optimizado
- Puedes modificar el orden usando drag & drop (ver Paso 7)

### Paso 2.5: Incluir Compras en la Ruta ⭐ (NUEVO)

**¿Qué son las compras?**
- Paradas en proveedores para recoger productos antes de entregarlos
- Ejemplo: Ir a comprar vasos antes de entregarlos a un cliente

**Cómo incluir compras:**

1. **Activar el checkbox** "Incluir compras en la ruta 🟠 (N)"
   - Ubicado debajo del título "Optimización de Rutas"
   - El número (N) indica cuántas compras están en estado "Ruta"

2. **El sistema automáticamente**:
   - Carga compras desde `/compras` con estado "Ruta"
   - Las agrega como primeras paradas (ir a proveedor primero)
   - Las marca con color naranja 🟠 para diferenciarlas

3. **Orden de paradas**:
   - 🟢 Bodega (inicio)
   - 🟠 **Compras** (proveedores) - VAN PRIMERO
   - 🔵 **Entregas** (clientes) - VAN DESPUÉS
   - 🔴 Bodega o destino final

**Diferenciación visual:**
- 🟠 **Naranja**: Compras a proveedores
- 🔵 **Azul**: Entregas a clientes
- Info window muestra si es compra (🟠 COMPRA - Nº Orden) o entrega

**Ejemplo de flujo:**
```
1. Ir a proveedor → Comprar 1000 vasos (🟠)
2. Ir a Cliente A → Entregar agua (🔵)
3. Ir a Cliente B → Entregar agua + vasos (🔵)
4. Volver a bodega
```

### Paso 3: Seleccionar pedidos (para nueva optimización)

La tabla mostrará:
- ✅ Todos los pedidos están **seleccionados por defecto**
- Cliente y dirección de entrega
- Comuna (importante para agrupación)
- Cantidad de botellones
- Producto

**Contador en tiempo real:**
- Muestra: `botellones seleccionados / 55`
- Si excede 55: aparece alerta indicando cuántas rutas se necesitan

### Paso 4: Ajustar selección (opcional)

Puedes:
- ✅ Desmarcar pedidos específicos que no quieras incluir
- ✅ Usar el checkbox del encabezado para seleccionar/deseleccionar todos
- ⚠️ Debes tener **mínimo 2 pedidos** seleccionados para optimizar

### Paso 5: Optimizar rutas

1. Haz clic en **"Optimizar Ruta(s)"**
2. El sistema procesará:
   - Agrupa pedidos por comuna
   - Divide en múltiples rutas si excede 55 botellones
   - Calcula ruta óptima usando Google Maps
   - Organiza orden de paradas para minimizar distancia
3. **La ruta se guarda automáticamente** al finalizar la optimización

### Paso 6: Revisar resultados

Para cada ruta optimizada verás:

**Información general:**
- Número de ruta (si hay múltiples)
- Total de paradas
- Distancia total estimada
- Tiempo total estimado

**Orden de entregas:**
- Lista numerada de paradas en orden óptimo
- 0 = Bodega (inicio)
- 1..N = Entregas en orden sugerido
- N+1 = Bodega (regreso)

**Detalles de cada parada:**
- Nombre del cliente
- Dirección completa
- Comuna
- Cantidad de botellones

**Mapa interactivo:**
- Visualización geográfica de la ruta
- Marcadores numerados
- Popups con información al hacer clic

### Paso 7: Usar la ruta

**Opción 1: Navegación en Google Maps**
1. Haz clic en **"Abrir en Google Maps"**
2. Se abrirá Google Maps con toda la ruta cargada
3. Ideal para usar en el móvil durante las entregas

**Opción 2: Seguir lista manual**
- Imprime o anota el orden de las paradas
- Sigue la secuencia numerada

---

## ✋ Reordenar Paradas con Drag & Drop

### ¿Cómo funciona?

Puedes modificar manualmente el orden de las paradas arrastrando y soltando:

**Reordenar dentro de la misma ruta:**
1. Busca el ícono de **tres líneas horizontales** (⋮⋮) a la izquierda de cada parada
2. Haz clic y mantén presionado sobre el ícono
3. Arrastra la parada hacia arriba o abajo
4. Suelta en la posición deseada
5. **El sistema guarda automáticamente** los cambios

**Mover entre rutas diferentes:**
1. Arrastra una parada desde una ruta
2. Suéltala en otra ruta
3. El sistema aplicará **rebalanceo automático** si es necesario

### 🔄 Rebalanceo Automático

Cuando mueves paradas entre rutas, el sistema valida que ninguna ruta exceda **55 botellones**:

**Ejemplo:**

```
Situación inicial:
- Ruta 1: 50 botellones (8 paradas)
- Ruta 2: 30 botellones (5 paradas)

Acción: Mueves 10 botellones de Ruta 2 a Ruta 1

Resultado automático:
- Ruta 1 temporal: 60 botellones ❌ Excede límite!

Rebalanceo:
- Sistema mueve automáticamente las últimas paradas de Ruta 1 a Ruta 2
- Ruta 1 final: 55 botellones ✅
- Ruta 2 final: 35 botellones ✅
```

**Indicador visual:**
- Si ocurre un rebalanceo, verás una **alerta amarilla** indicando:
  > ⚠️ Rutas rebalanceadas automáticamente para cumplir con el límite de 55 botellones

### 💾 Persistencia Automática

**Todas las modificaciones se guardan automáticamente:**
- Al optimizar una nueva ruta
- Al reordenar paradas con drag & drop
- Al mover paradas entre rutas

**No necesitas hacer clic en "Guardar"** - los cambios se aplican instantáneamente.

---

## 📊 Casos de Uso

### Caso 1: Una sola ruta (≤ 55 botellones)

**Ejemplo:**
- 8 pedidos seleccionados
- Total: 45 botellones
- Resultado: 1 ruta optimizada con 8 paradas

### Caso 2: Múltiples rutas (> 55 botellones)

**Ejemplo:**
- 15 pedidos seleccionados
- Total: 90 botellones
- Resultado: 2 rutas optimizadas

**Ruta 1:**
- Pedidos de Maipú y Pudahuel
- 55 botellones
- 8 paradas

**Ruta 2:**
- Pedidos de Cerrillos
- 35 botellones
- 7 paradas

### Caso 3: Muchos pedidos en la misma comuna

El algoritmo agrupa inteligentemente:
- Prioriza comunas con más pedidos
- Mantiene juntos pedidos cercanos
- Respeta límite de 55 botellones

---

## 🎯 Estrategia de Agrupación

El algoritmo sigue esta lógica:

### 1. Agrupación por comuna
```
Pedidos por comuna:
- Maipú: 40 botellones
- Pudahuel: 30 botellones
- Cerrillos: 25 botellones
Total: 95 botellones
```

### 2. División en rutas
```
Ruta 1:
- Maipú (40) + Pudahuel (15) = 55 botellones ✅

Ruta 2:
- Pudahuel restante (15) + Cerrillos (25) = 40 botellones ✅
```

### 3. Optimización individual
Cada ruta se optimiza independientemente usando Google Maps para encontrar el orden óptimo de paradas.

---

## ⚠️ Errores Comunes

### "No hay pedidos en ruta para esta fecha"

**Causa:** No existen pedidos con estado "Ruta" en la fecha seleccionada.

**Solución:**
1. Ve a **Pedidos**
2. Cambia el estado de los pedidos deseados a "Ruta"
3. Asegúrate de que tengan la fecha correcta

### "Pedidos no tienen coordenadas válidas"

**Causa:** Las direcciones de los pedidos no tienen latitud/longitud.

**Solución:**
1. Ve a **Clientes**
2. Revisa las direcciones de los clientes afectados
3. Asegúrate de que estén bien escritas
4. El sistema debería geocodificarlas automáticamente

### "Error de Google Maps API"

**Posibles causas:**
- API Key no configurada
- API Key inválida
- APIs no habilitadas en Google Cloud
- Límite de requests excedido

**Solución:**
1. Verifica que la variable `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` esté configurada
2. Verifica en Google Cloud Console que:
   - Directions API está habilitada
   - La API Key es válida
   - No has excedido los límites

---

## 💰 Costos de Google Maps API

### Tier Gratuito
- **$200 USD** de crédito mensual gratis
- Suficiente para ~40 optimizaciones por día

### Costo por Request
- **Directions API:** $5 por 1000 requests
- **Distance Matrix API:** $5 por 1000 elements

### Ejemplo de uso normal
```
Uso diario: 2-5 optimizaciones
Requests mensuales: ~150
Costo: $0 (dentro del tier gratuito)
```

### Recomendaciones para ahorrar
1. ✅ Optimiza solo cuando estés seguro de la selección
2. ✅ No optimices la misma ruta múltiples veces
3. ✅ Agrupa pedidos antes de optimizar
4. ⚠️ Evita optimizaciones de prueba en producción

---

## 🔍 Tips y Mejores Prácticas

### 1. Planificación del día anterior
- Revisa los pedidos para el día siguiente
- Asegúrate de que todos tengan direcciones válidas
- Agrupa mentalmente por zona antes de optimizar

### 2. Uso del filtro de fecha
- Usa el mapa con filtro de fecha para visualizar entregas
- Identifica patrones y zonas con muchos pedidos

### 3. Múltiples rutas
- Si necesitas múltiples rutas, considera:
  - Priorizar zonas más lejanas en la mañana
  - Dejar zonas cercanas para la tarde
  - Asignar rutas por conductor

### 4. Comunicación con el conductor
- Comparte la ruta directamente desde Google Maps
- Envía captura de la lista de orden
- Incluye teléfonos de contacto de clientes

### 5. Feedback continuo
- Registra problemas encontrados en ruta
- Actualiza direcciones incorrectas
- Anota tiempos reales vs estimados

---

## 🛠️ Troubleshooting Avanzado

### Verificar configuración

```bash
# Ver variables de entorno del contenedor
docker exec 3t-app env | grep GOOGLE

# Debería mostrar:
# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

### Ver logs del optimizador

```bash
# Ver logs en tiempo real
docker logs -f 3t-app

# Buscar errores de Google Maps
docker logs 3t-app 2>&1 | grep -i "google\|maps\|directions"
```

### Probar API manualmente

```bash
# Probar Directions API
curl "https://maps.googleapis.com/maps/api/directions/json?origin=-33.5334497,-70.7651785&destination=-33.5334497,-70.7651785&waypoints=-33.5,-70.75&key=TU_API_KEY"
```

---

## 📱 Uso en Móvil

### Para el conductor

1. **En el móvil:**
   - Abre el link "Abrir en Google Maps"
   - Se abrirá la app de Google Maps
   - Toca "Comenzar" para iniciar navegación

2. **Durante las entregas:**
   - Google Maps te guiará parada por parada
   - Marca cada parada cuando llegues
   - Automáticamente irá a la siguiente

3. **Alternativa sin navegación:**
   - Toma captura de la lista de paradas
   - Usa como referencia durante el día

---

## 📈 Mejoras Implementadas

Funcionalidades recientes:
- [x] **Persistencia de rutas:** Las rutas optimizadas se guardan automáticamente
- [x] **Carga automática:** Al entrar al módulo, se carga la última ruta guardada
- [x] **Drag & Drop:** Reordena paradas arrastrando y soltando
- [x] **Rebalanceo automático:** El sistema redistribuye paradas para respetar el límite de 55 botellones
- [x] **Guardado automático:** Todos los cambios se guardan sin necesidad de hacer clic en "Guardar"

## 📈 Mejoras Futuras

Funcionalidades planificadas:
- [ ] Exportar ruta a PDF
- [ ] Guardar rutas optimizadas históricas (con versiones)
- [ ] Asignar ruta a conductor específico
- [ ] Notificaciones push al conductor
- [ ] Tracking en tiempo real
- [ ] Reoptimización dinámica durante el día
- [ ] Estimación de tiempo por parada

---

## 🔧 Integración Técnica: Compras

### Cómo Funciona

El optimizador carga tanto pedidos (entregas) como compras y los procesa juntos:

```typescript
// 1. Cargar pedidos (entregas)
const { data: pedidos } = await supabase
  .from('3t_dashboard_ventas')
  .select('*')
  .eq('status', 'Ruta')

// 2. Cargar compras si checkbox está activo
const { data: compras } = await supabase
  .from('3t_purchases')
  .select(`
    *,
    supplier:supplier_id(name),
    address:address_id(raw_address, commune, latitude, longitude)
  `)
  .eq('status', 'Ruta')

// 3. Transformar compras a formato compatible
const comprasTransformadas = compras.map(c => ({
  order_id: c.purchase_id,
  customer_name: c.supplier?.name,
  latitude: c.address?.latitude,
  longitude: c.address?.longitude,
  quantity: 0,  // No cuenta para capacidad
  product_name: '🟠 COMPRA',
  is_purchase: true,
  supplier_order_number: c.supplier_order_number
}))

// 4. Combinar y optimizar
const todosItems = [...comprasTransformadas, ...pedidos]
await optimizarRuta(todosItems)
```

### Diferenciación en el Mapa

```typescript
// Marcadores con colores diferentes
const isPurchase = order.is_purchase === true
const markerColor = isPurchase ? '#f97316' : routeColor // Naranja vs Azul

// Info window personalizado
const content = isPurchase 
  ? `🟠 COMPRA: ${order.customer_name} - ${order.supplier_order_number}`
  : `Cliente: ${order.customer_name} - ${order.quantity} botellones`
```

### Reglas de Optimización

1. **Compras NO cuentan para capacidad**:
   - `quantity: 0` para que no afecte el límite de 55 botellones
   - Solo las entregas cuentan para capacidad

2. **Compras van primero**:
   - Se ordenan al inicio de la ruta
   - Lógica: Recoger productos antes de entregar

3. **Validación de coordenadas**:
   - Solo se incluyen compras con dirección GPS
   - Se filtran compras sin `latitude` o `longitude`

---

## 📚 Referencias

- **Módulo relacionado**: [COMPRAS.md](./COMPRAS.md) - Gestión de órdenes de compra
- **Módulo relacionado**: [PROVEEDORES.md](./PROVEEDORES.md) - Gestión de proveedores
- **API Externa**: [Google Maps Directions API](https://developers.google.com/maps/documentation/directions)
- **Documentación**: [CHANGELOG.md](../CHANGELOG.md) - Historial de cambios

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa esta guía completa
2. Verifica la configuración de Google Maps API
3. Revisa los logs del contenedor
4. Contacta al administrador del sistema

**Específico de compras:**
- Verifica que la compra esté en estado "Ruta"
- Confirma que el proveedor tenga dirección con coordenadas GPS
- Activa el checkbox "Incluir compras en la ruta"

---

**Última actualización:** Octubre 13, 2025  
**Versión:** 2.0.0 (con soporte para compras)

