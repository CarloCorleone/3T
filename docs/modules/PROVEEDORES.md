# 🚚 Módulo: Proveedores

**Ruta:** `/proveedores`  
**Archivo:** `/app/proveedores/page.tsx`  
**Tipo:** Página dinámica con integración de Google Maps Places API

---

## 📖 Descripción General

El módulo **Proveedores** permite gestionar la base de proveedores de productos con **funcionalidad completa CRUD** (Crear, Leer, Actualizar, Eliminar) y gestión integrada de **múltiples direcciones** por proveedor con **autocompletado de Google Maps**.

### Propósito
- Gestionar información completa de proveedores
- Administrar múltiples direcciones por proveedor (bodega, sucursales, etc.)
- Autocompletar direcciones con Google Maps Places API
- Capturar coordenadas GPS automáticamente para optimización de rutas
- Validar dependencias antes de eliminaciones

### Audiencia
- **Administrativos**: Crear y actualizar proveedores
- **Compras**: Acceder a información de contacto
- **Logística**: Gestionar direcciones para órdenes de compra

---

## ✨ Funcionalidades Principales

### 1. Gestión de Proveedores (CRUD Completo)

#### Crear Proveedor
- Modal con formulario completo
- **Campos**:
  - Nombre del Proveedor (requerido)
  - Teléfono
  - Email
  - Observaciones
- Validación de campos requeridos
- Generación automática de ID único (8 caracteres)

#### Listar Proveedores
- Tabla con todos los proveedores
- **Búsqueda en tiempo real**:
  - Por nombre de proveedor
  - Por teléfono
  - Por email
- Contador de direcciones por proveedor
- Botones de acción: Ver Direcciones, Editar, Eliminar

#### Editar Proveedor
- Modal con datos pre-cargados
- Todos los campos editables
- Actualización en tiempo real

#### Eliminar Proveedor
- Modal de confirmación
- **Validación de dependencias**:
  - Verifica si tiene direcciones registradas
  - Verifica si tiene órdenes de compra asociadas
  - Muestra cantidades: "No puedes eliminar porque tiene 3 compras asociadas"
- **Regla**: No permite eliminar si tiene compras asociadas
- **Regla**: Permite eliminar si solo tiene direcciones (se eliminan en cascada)

### 2. Gestión de Direcciones (Integrada) ⭐

Al hacer clic en "Ver Direcciones", se abre un modal completo para gestionar direcciones:

#### Ver Direcciones
- Lista de todas las direcciones del proveedor
- Badge "Predeterminada" para la dirección principal
- Muestra: Dirección completa, Comuna, Indicaciones
- Botones: Editar, Eliminar

#### Agregar Dirección ⭐ **CON GOOGLE MAPS**

1. **Modal de agregar dirección** con:
   - Campo "Dirección" con autocompletado de Google Maps
   - Campo "Comuna" (se completa automáticamente)
   - Campo "Indicaciones adicionales" (opcional)
   - Checkbox "Dirección predeterminada"

2. **Autocompletado de Google Maps**:
   ```typescript
   // Al escribir en el campo "Dirección":
   - Aparece dropdown con sugerencias de Google Maps
   - Filtrado por país: Chile ('cl')
   - Solo direcciones completas (no ciudades/regiones)
   - Captura automática de coordenadas GPS
   - Extracción automática de comuna
   ```

3. **Captura automática al seleccionar**:
   ```typescript
   place = {
     formatted_address: "Av. Los Pajaritos 3250, Maipú, Chile",
     geometry: {
       location: {
         lat: -33.524...,
         lng: -70.786...
       }
     },
     address_components: [
       { long_name: "Maipú", types: ["locality"] }
     ]
   }
   
   // Se completa automáticamente:
   raw_address: "Av. Los Pajaritos 3250, Maipú, Chile"
   latitude: -33.524...
   longitude: -70.786...
   commune: "Maipú"
   ```

#### Editar Dirección
- Misma funcionalidad que agregar
- Campos pre-cargados
- Mantiene coordenadas si no se cambia dirección

#### Eliminar Dirección
- Modal de confirmación
- **Validación de dependencias**:
  - Verifica si tiene órdenes de compra asociadas
  - Muestra: "No puedes eliminar porque tiene 2 compras asociadas"
- Solo permite eliminar si no tiene compras

---

## 🗄️ Estructura de Datos

### Tabla: `3t_suppliers`

```sql
CREATE TABLE 3t_suppliers (
  supplier_id TEXT PRIMARY KEY,           -- ID único (8 chars)
  name TEXT NOT NULL,                     -- Nombre del proveedor
  phone TEXT,                             -- Teléfono de contacto
  email TEXT,                             -- Email de contacto
  observations TEXT,                      -- Notas adicionales
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: `3t_supplier_addresses`

```sql
CREATE TABLE 3t_supplier_addresses (
  address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id TEXT REFERENCES 3t_suppliers(supplier_id) ON DELETE CASCADE,
  raw_address TEXT NOT NULL,             -- Dirección completa de Google Maps
  commune TEXT,                           -- Comuna extraída automáticamente
  street_name TEXT,                       -- Calle (opcional)
  street_number TEXT,                     -- Número (opcional)
  apartment TEXT,                         -- Depto/Oficina (opcional)
  directions TEXT,                        -- Indicaciones adicionales
  region TEXT DEFAULT 'Región Metropolitana',
  latitude NUMERIC(10, 8),               -- Coordenadas GPS (Google Maps)
  longitude NUMERIC(11, 8),              -- Coordenadas GPS (Google Maps)
  maps_link TEXT,                         -- Link directo a Google Maps
  is_default BOOLEAN DEFAULT false,       -- ¿Es la dirección predeterminada?
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Relaciones

- **1 Proveedor → N Direcciones**: Un proveedor puede tener múltiples direcciones (bodega, sucursales, etc.)
- **1 Dirección → N Compras**: Una dirección puede ser usada en múltiples órdenes de compra

---

## 🔍 Búsqueda y Filtros

### Búsqueda en Tiempo Real

```typescript
// Busca en:
- Nombre del proveedor
- Teléfono
- Email

// Ejemplo:
const filteredSuppliers = suppliers.filter(supplier =>
  supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
)
```

---

## 🎨 Interfaz de Usuario

### Vista Principal

```
┌─────────────────────────────────────────────────────────┐
│  Proveedores                    [+ Nuevo Proveedor]      │
│  Gestiona los proveedores de productos                   │
├─────────────────────────────────────────────────────────┤
│  [🔍 Buscar proveedor...]                                │
├─────────────────────────────────────────────────────────┤
│ Nombre           │ Teléfono     │ Email          │ ...   │
├─────────────────────────────────────────────────────────┤
│ Distribuidora XYZ│ +56912345678 │ ventas@xyz.cl  │[📍][✏️][🗑️]│
│ Proveedor ABC    │ +56987654321 │ info@abc.cl    │[📍][✏️][🗑️]│
└─────────────────────────────────────────────────────────┘
```

### Modal: Nuevo/Editar Proveedor

```
┌─────────────────────────────────────────────┐
│  Nuevo Proveedor                      [×]   │
├─────────────────────────────────────────────┤
│  Nombre del Proveedor *                     │
│  [Ej: Distribuidora XYZ          ]          │
│                                             │
│  Teléfono              Email                │
│  [+56 9 1234 5678  ]   [contacto@xyz.cl]   │
│                                             │
│  Observaciones                              │
│  [Notas adicionales...              ]       │
│  [                                   ]       │
│                                             │
│            [Cancelar]  [Crear Proveedor]    │
└─────────────────────────────────────────────┘
```

### Modal: Gestión de Direcciones

```
┌──────────────────────────────────────────────────────────┐
│  Direcciones de Distribuidora XYZ              [×]       │
├──────────────────────────────────────────────────────────┤
│  Nueva Dirección                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Dirección *                                        │  │
│  │ [Escribe la dirección... (autocompletado)      ]  │  │
│  │                                                    │  │
│  │ Comuna                    □ Dirección predeterminada│
│  │ [Santiago               ]                          │  │
│  │                                                    │  │
│  │ Indicaciones Adicionales                          │  │
│  │ [Al lado del supermercado...                   ]  │  │
│  │                                                    │  │
│  │               [Agregar Dirección]                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Direcciones Registradas (2)                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📍 Av. Los Pajaritos 3250, Maipú                  │  │
│  │    Comuna: Maipú                                   │  │
│  │    [Predeterminada]                    [✏️] [🗑️]  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📍 San Pablo 1234, Santiago                       │  │
│  │    Comuna: Santiago                                │  │
│  │                                        [✏️] [🗑️]  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 🔗 Integraciones

### 1. Google Maps Places API

**Configuración:**
```typescript
const autocomplete = new google.maps.places.Autocomplete(input, {
  componentRestrictions: { country: 'cl' },
  fields: ['formatted_address', 'geometry', 'address_components'],
  types: ['address']
})
```

**Eventos:**
```typescript
autocomplete.addListener('place_changed', () => {
  const place = autocomplete.getPlace()
  
  // Extraer datos
  const address = place.formatted_address
  const lat = place.geometry.location.lat()
  const lng = place.geometry.location.lng()
  const commune = extractCommune(place.address_components)
  
  // Actualizar formulario
  setFormData({
    raw_address: address,
    latitude: lat,
    longitude: lng,
    commune: commune
  })
})
```

### 2. Módulo de Compras

Las direcciones de proveedores se utilizan en el módulo de compras:

```typescript
// En /compras al seleccionar proveedor:
const { data: addresses } = await supabase
  .from('3t_supplier_addresses')
  .select('*')
  .eq('supplier_id', supplierId)
  .order('is_default', { ascending: false })

// Auto-selección de dirección predeterminada
const defaultAddress = addresses.find(addr => addr.is_default)
setFormData({ address_id: defaultAddress?.address_id })
```

### 3. Optimizador de Rutas

Las direcciones con coordenadas GPS se usan para optimizar rutas:

```typescript
// En /rutas al incluir compras:
const compras = await supabase
  .from('3t_purchases')
  .select(`
    *,
    supplier:supplier_id(name),
    address:address_id(raw_address, commune, latitude, longitude)
  `)
  .eq('status', 'Ruta')
  .not('address_id', 'is', null)

// Transformar a formato de ruta
const comprasTransformadas = compras
  .filter(c => c.address?.latitude && c.address?.longitude)
  .map(c => ({
    latitude: c.address.latitude,
    longitude: c.address.longitude,
    is_purchase: true  // Flag para marcador naranja
  }))
```

---

## ⚠️ Validaciones y Reglas de Negocio

### Crear Proveedor
- ✅ Nombre es requerido
- ✅ ID único se genera automáticamente (8 caracteres alfanuméricos)
- ℹ️ Teléfono y email son opcionales

### Eliminar Proveedor
- ❌ **NO se puede eliminar** si tiene órdenes de compra asociadas
- ✅ **SÍ se puede eliminar** si solo tiene direcciones (se eliminan en cascada)
- ℹ️ Muestra mensaje con cantidad de dependencias

### Agregar Dirección
- ✅ Dirección completa es requerida
- ✅ Coordenadas GPS se capturan automáticamente de Google Maps
- ✅ Solo puede haber una dirección predeterminada por proveedor
- ℹ️ Si se marca nueva dirección como predeterminada, se desmarca la anterior

### Eliminar Dirección
- ❌ **NO se puede eliminar** si tiene órdenes de compra asociadas
- ℹ️ Muestra mensaje: "No se puede eliminar esta dirección porque tiene X compras asociadas"

---

## 🚀 Flujo de Trabajo

### Caso de Uso: Agregar Nuevo Proveedor

1. **Ir a `/proveedores`**
2. **Clic en "Nuevo Proveedor"**
3. **Llenar formulario**:
   - Nombre: "Distribuidora Los Ángeles"
   - Teléfono: "+56 9 8765 4321"
   - Email: "ventas@losangeles.cl"
   - Observaciones: "Proveedor de vasos y envases"
4. **Clic en "Crear Proveedor"**
5. **Agregar dirección**:
   - Clic en "Ver Direcciones"
   - Escribir dirección (autocompletado)
   - Seleccionar de dropdown de Google Maps
   - Marcar como predeterminada
   - Agregar indicaciones: "Portón verde, tocar timbre"
6. **Clic en "Agregar Dirección"**
7. ✅ Proveedor listo para usar en órdenes de compra

### Caso de Uso: Crear Orden de Compra con Proveedor

1. **Proveedor ya creado** con dirección GPS
2. **Ir a `/compras`**
3. **Seleccionar proveedor** → Dirección predeterminada se carga automáticamente
4. **Agregar productos** con precios
5. **Cambiar estado a "Ruta"**
6. **Ir a `/rutas`**
7. **Activar "Incluir compras en la ruta"**
8. **Optimizar** → Compra aparece como primer punto 🟠 naranja
9. ✅ Ruta lista con parada en proveedor

---

## 💡 Tips y Buenas Prácticas

### Para Administradores

1. **Siempre agregar dirección con Google Maps**:
   - Garantiza coordenadas GPS correctas
   - Facilita optimización de rutas
   - Evita errores de dirección

2. **Usar dirección predeterminada**:
   - Marca la bodega principal como predeterminada
   - Se auto-selecciona al crear compras
   - Ahorra tiempo en el proceso

3. **Agregar indicaciones útiles**:
   - "Portón verde, timbre derecho"
   - "Entrar por calle lateral"
   - "Preguntar por Juan en bodega"

### Para Compras

1. **Verificar dirección antes de crear orden**:
   - Confirmar que es la ubicación correcta
   - Revisar indicaciones adicionales
   - Validar teléfono de contacto

2. **Mantener información actualizada**:
   - Actualizar teléfonos si cambian
   - Agregar nuevas sucursales cuando abran
   - Eliminar direcciones obsoletas

---

## 🐛 Troubleshooting

### El autocompletado de Google Maps no funciona

**Causa**: API Key no configurada o sin permisos

**Solución**:
```bash
# Verificar variable de entorno
echo $NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# En /opt/cane/env/3t.env debe estar:
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...

# Verificar que la API tiene habilitadas:
- Places API (versión antigua, no New)
- Maps JavaScript API
- Geocoding API
```

### No puedo eliminar un proveedor

**Causa**: Tiene órdenes de compra asociadas

**Solución**:
1. Ir a `/compras`
2. Filtrar por el proveedor
3. Eliminar o cambiar proveedor de las órdenes
4. Intentar eliminar nuevamente

### Las coordenadas GPS no se capturan

**Causa**: No se seleccionó dirección del dropdown de Google Maps

**Solución**:
1. Escribir dirección en el campo
2. **Esperar** a que aparezca dropdown de sugerencias
3. **Hacer clic** en una opción del dropdown
4. ✅ Coordenadas se capturan automáticamente

---

## 📊 Métricas y KPIs

- **Total de proveedores activos**: Count de registros
- **Proveedores con direcciones**: Count con `address_id IS NOT NULL`
- **Promedio de direcciones por proveedor**: AVG de addresses por supplier
- **Proveedores más usados**: Count de `3t_purchases` GROUP BY `supplier_id`

---

## 🔐 Permisos y Seguridad

### Row Level Security (RLS)

**Estado actual**: Deshabilitado (aplicación interna)

**Para habilitar** (si se requiere multi-tenant):

```sql
-- Habilitar RLS
ALTER TABLE 3t_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE 3t_supplier_addresses ENABLE ROW LEVEL SECURITY;

-- Política ejemplo: Solo usuarios autenticados
CREATE POLICY "Permitir todo a usuarios autenticados"
  ON 3t_suppliers
  FOR ALL
  USING (auth.role() = 'authenticated');
```

---

## 📚 Referencias

- **Módulo relacionado**: [COMPRAS.md](./COMPRAS.md) - Órdenes de compra
- **Módulo relacionado**: [OPTIMIZADOR-RUTAS.md](./OPTIMIZADOR-RUTAS.md) - Rutas con compras
- **API externa**: [Google Maps Places API](https://developers.google.com/maps/documentation/places/web-service/overview)
- **Componentes UI**: [shadcn/ui](https://ui.shadcn.com/)

---

**Última actualización**: Octubre 13, 2025  
**Versión**: 1.0.0  
**Estado**: ✅ Implementado y Operativo


