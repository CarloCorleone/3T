# 👥 Módulo: Clientes

**Ruta:** `/clientes`  
**Archivo:** `/app/clientes/page.tsx`  
**Tipo:** Página dinámica con integración de Google Maps Places API

---

## 📖 Descripción General

El módulo **Clientes** es el más complejo del sistema. Permite gestionar la base de clientes con **funcionalidad completa CRUD** (Crear, Leer, Actualizar, Eliminar) y gestión integrada de **múltiples direcciones** por cliente con **autocompletado de Google Maps**.

### Propósito
- Gestionar información completa de clientes (hogar y empresa)
- Administrar múltiples direcciones por cliente
- Autocompletar direcciones con Google Maps Places API
- Capturar coordenadas GPS automáticamente
- Validar dependencias antes de eliminaciones

### Audiencia
- **Administrativos**: Crear y actualizar clientes
- **Ventas**: Acceder a información de contacto
- **Logística**: Gestionar direcciones de entrega

---

## ✨ Funcionalidades Principales

### 1. Gestión de Clientes (CRUD Completo)

#### Crear Cliente
- Modal con formulario completo
- Campos: Nombre, Tipo, Teléfono, Email, Precio Recarga
- Validación de campos requeridos
- Generación automática de UUID

#### Listar Clientes
- Tabla con todos los clientes
- Búsqueda en tiempo real (por nombre o comuna)
- Badges visuales para tipo de cliente (Hogar/Empresa)
- Contador de direcciones por cliente
- Botones de acción: Editar, Eliminar

#### Editar Cliente
- Modal con datos pre-cargados
- Todos los campos editables
- **Gestión de direcciones integrada** (ver sección especial)
- Actualización en tiempo real

#### Eliminar Cliente
- Modal de confirmación
- **Validación de dependencias**:
  - Verifica si tiene direcciones registradas
  - Verifica si tiene pedidos asociados
  - Muestra cantidades: "No puedes eliminar porque tiene 3 direcciones y 15 pedidos"
- Solo permite eliminar si no tiene dependencias

### 2. Gestión de Direcciones (Integrada) ⭐

Dentro del modal de editar cliente, existe una sección completa para gestionar direcciones:

#### Ver Direcciones
- Lista de todas las direcciones del cliente
- Badge "Predeterminada" para la dirección principal
- Muestra: Dirección completa, Comuna
- Botones: Editar, Eliminar

#### Agregar Dirección ⭐ **CON GOOGLE MAPS**
1. **Modal de agregar dirección** con:
   - Campo "Dirección Completa" con autocompletado
   - Campo "Comuna" (se completa automáticamente)
   - Campo "Indicaciones adicionales" (opcional)
   - Checkbox "Marcar como predeterminada"

2. **Autocompletado de Google Maps**:
   ```typescript
   // Al escribir en el campo "Dirección Completa":
   - Aparece dropdown con sugerencias de Google Maps
   - Filtrado por país: Chile ('cl')
   - Solo direcciones completas (no ciudades/regiones)
   - Dropdown clickeable (z-index correcto)
   ```

3. **Captura automática al seleccionar**:
   ```typescript
   place = {
     formatted_address: "Zenteno 881, Maipú, Región Metropolitana, Chile",
     geometry: {
       location: {
         lat: -33.533...,
         lng: -70.765...
       }
     },
     address_components: [
       { long_name: "Maipú", types: ["locality"] }
     ]
   }
   
   // Se completa automáticamente:
   raw_address: "Zenteno 881, Maipú, Región Metropolitana, Chile"
   commune: "Maipú"  // Extraído de address_components
   latitude: -33.533...
   longitude: -70.765...
   ```

4. **Validaciones**:
   - Previene cierre de modal al seleccionar dirección del dropdown
   - Manejo de eventos de teclado (Enter)
   - Ocultación de overlays de error de Google Maps
   - CSS personalizado para z-index correcto

#### Editar Dirección
- Modal con datos pre-cargados
- Todos los campos editables
- Autocompletado funciona igual que en crear

#### Eliminar Dirección
- Modal de confirmación
- **Validación de dependencias**:
  - Verifica si tiene pedidos asociados
  - Muestra cantidad: "No puedes eliminar porque tiene 5 pedidos"
- Solo permite eliminar si no tiene pedidos

---

## 🗺️ Integración con Google Maps Places API

### Configuración Técnica

#### API Key
```typescript
// Variable de entorno requerida
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

#### Script Loading
```typescript
<Script
  src={`https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`}
  strategy="afterInteractive"
  onLoad={() => setGoogleMapsLoaded(true)}
  onError={() => console.error('Error cargando Google Maps')}
/>
```

#### APIs de Google Cloud Requeridas
1. **Maps JavaScript API** ✅
2. **Places API** (versión antigua, NO "New") ✅
3. **Geocoding API** ✅

#### Restricciones de Seguridad
```javascript
// En Google Cloud Console → Credenciales → API Key
Tipo: HTTP Referrers (sitios web)
Referentes permitidos:
  - https://3t.loopia.cl/*
  - http://localhost:3000/*
```

### Implementación del Autocomplete

```typescript
// 1. Inicialización
const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
  componentRestrictions: { country: 'cl' },  // Solo Chile
  fields: ['formatted_address', 'geometry', 'address_components'],
  types: ['address']  // Solo direcciones completas
})

// 2. Listener de selección
autocomplete.addListener('place_changed', () => {
  const place = autocomplete.getPlace()
  
  if (!place.geometry) {
    console.error('No se encontraron detalles de la ubicación')
    return
  }
  
  // 3. Extraer datos
  const direccion = place.formatted_address
  const lat = place.geometry.location.lat()
  const lng = place.geometry.location.lng()
  
  // 4. Extraer comuna
  const comunaComponent = place.address_components?.find(
    component => component.types.includes('locality')
  )
  const comuna = comunaComponent?.long_name || ''
  
  // 5. Actualizar formulario
  setAddressFormData(prev => ({
    ...prev,
    raw_address: direccion,
    commune: comuna,
    latitude: lat,
    longitude: lng
  }))
})
```

### Manejo de CSS para Dropdown

```css
/* globals.css */
.pac-container {
  z-index: 999999 !important;
  position: fixed !important;
  pointer-events: auto !important;
}

/* Ocultar overlays de error */
.dismissible-content,
.gm-style-moc {
  display: none !important;
}
```

### Prevención de Cierre de Modal

```typescript
// En DialogContent
<DialogContent
  onInteractOutside={(e) => {
    const target = e.target as HTMLElement
    // No cerrar modal si click es en dropdown de Google Maps
    if (target.closest('.pac-container')) {
      e.preventDefault()
      return
    }
  }}
>
```

---

## 🎨 Interfaz de Usuario

### Componentes shadcn/ui Utilizados
```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
```

### Estructura Visual

```
┌─────────────────────────────────────────┐
│  [Buscar cliente...]    [+ Nuevo]       │
└─────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ Nombre      │ Tipo    │ Teléfono │ Dirs │ Acciones │
├────────────────────────────────────────────────────┤
│ Cliente ABC │ Hogar   │ +569...  │ 2    │ [✏️][🗑️]│
│ Empresa XYZ │ Empresa │ +569...  │ 1    │ [✏️][🗑️]│
└────────────────────────────────────────────────────┘
```

### Modal de Editar Cliente

```
┌──────────────────────────────────────┐
│  Editar Cliente                       │
├──────────────────────────────────────┤
│  Nombre: [____________]              │
│  Tipo: [Hogar ▼]                     │
│  Teléfono: [____________]            │
│  Email: [____________]               │
│  Precio Recarga: [____] CLP          │
│                                       │
│  ┌────────────────────────────────┐ │
│  │ Direcciones Asociadas (2)      │ │
│  ├────────────────────────────────┤ │
│  │ ✓ Zenteno 881, Maipú           │ │
│  │   [✏️] [🗑️]                     │ │
│  │                                 │ │
│  │   Av. Kennedy 123, Las Condes  │ │
│  │   [✏️] [🗑️]                     │ │
│  │                                 │ │
│  │ [+ Agregar Dirección]          │ │
│  └────────────────────────────────┘ │
│                                       │
│  [Cancelar]  [Guardar Cambios]       │
└──────────────────────────────────────┘
```

### Modal de Agregar Dirección (con Autocomplete)

```
┌──────────────────────────────────────┐
│  Agregar Dirección                    │
├──────────────────────────────────────┤
│  Dirección Completa: [zenteno 881__] │
│  ┌──────────────────────────────┐   │  ← Dropdown de Google Maps
│  │ ✓ Zenteno 881, Maipú, RM     │   │
│  │   Zenteno 123, Pudahuel, RM  │   │
│  └──────────────────────────────┘   │
│                                       │
│  Comuna: [Maipú]  ← Auto-completado │
│                                       │
│  Indicaciones:                        │
│  [Casa esquina, portón café___]      │
│                                       │
│  ☑ Marcar como predeterminada        │
│                                       │
│  [Cancelar]  [Crear Dirección]       │
└──────────────────────────────────────┘
```

---

## 💾 Datos y Lógica

### Tablas de Supabase Involucradas

#### `3t_customers`
```sql
CREATE TABLE 3t_customers (
  customer_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  customer_type TEXT CHECK (customer_type IN ('Hogar', 'Empresa')),
  phone TEXT,
  email TEXT,
  business_name TEXT,
  rut TEXT,
  contact_name TEXT,
  price INTEGER DEFAULT 2500,  -- Precio de recarga en CLP
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### `3t_addresses`
```sql
CREATE TABLE 3t_addresses (
  address_id UUID PRIMARY KEY,
  customer_id UUID REFERENCES 3t_customers(customer_id) ON DELETE CASCADE,
  raw_address TEXT NOT NULL,        -- Dirección completa de Google Maps
  commune TEXT,                     -- Comuna extraída automáticamente
  street_name TEXT,
  street_number TEXT,
  apartment TEXT,
  directions TEXT,                  -- Indicaciones adicionales
  region TEXT DEFAULT 'Región Metropolitana',
  latitude NUMERIC(10, 8),          -- GPS Y
  longitude NUMERIC(11, 8),         -- GPS X
  maps_link TEXT,
  is_default BOOLEAN DEFAULT false, -- Dirección predeterminada
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Queries Principales

#### Cargar Clientes con Conteo de Direcciones
```typescript
const { data, error } = await supabase
  .from('3t_customers')
  .select(`
    *,
    addresses:3t_addresses(count)
  `)
  .order('name', { ascending: true })
```

#### Cargar Direcciones de un Cliente
```typescript
const { data, error } = await supabase
  .from('3t_addresses')
  .select('*')
  .eq('customer_id', customerid)
  .order('is_default', { ascending: false })  // Predeterminada primero
```

#### Verificar Dependencias antes de Eliminar Cliente
```typescript
// Contar direcciones
const { count: addressCount } = await supabase
  .from('3t_addresses')
  .select('*', { count: 'exact', head: true })
  .eq('customer_id', customerid)

// Contar pedidos
const { count: orderCount } = await supabase
  .from('3t_orders')
  .select('*', { count: 'exact', head: true })
  .eq('customer_id', customerid)

if (addressCount > 0 || orderCount > 0) {
  alert(`No puedes eliminar este cliente porque tiene ${addressCount} direcciones y ${orderCount} pedidos`)
  return
}
```

#### Verificar Dependencias antes de Eliminar Dirección
```typescript
const { count: orderCount } = await supabase
  .from('3t_orders')
  .select('*', { count: 'exact', head: true })
  .eq('delivery_address_id', addressId)

if (orderCount > 0) {
  alert(`No puedes eliminar esta dirección porque tiene ${orderCount} pedidos asociados`)
  return
}
```

### Lógica de Negocio

#### Crear Cliente
```typescript
const handleCreateCustomer = async () => {
  const { data, error } = await supabase
    .from('3t_customers')
    .insert([{
      customer_id: crypto.randomUUID(),
      name: formData.name,
      customer_type: formData.customer_type,
      phone: formData.phone,
      email: formData.email,
      price: formData.price
    }])
  
  if (!error) {
    alert('Cliente creado exitosamente')
    loadCustomers()
  }
}
```

#### Crear Dirección con Datos de Google Maps
```typescript
const handleCreateAddress = async () => {
  const { data, error } = await supabase
    .from('3t_addresses')
    .insert([{
      address_id: crypto.randomUUID(),
      customer_id: selectedCustomer.customer_id,
      raw_address: addressFormData.raw_address,     // De Google Maps
      commune: addressFormData.commune,             // Extraído automáticamente
      latitude: addressFormData.latitude,           // De Google Maps
      longitude: addressFormData.longitude,         // De Google Maps
      directions: addressFormData.directions,       // Usuario ingresa
      is_default: addressFormData.is_default
    }])
  
  if (!error) {
    alert('Dirección creada exitosamente')
    loadAddresses(selectedCustomer.customer_id)
  }
}
```

---

## 💻 Código Técnico

### Ubicación
```
/opt/cane/3t/app/clientes/page.tsx
```

### Tipo de Componente
```typescript
'use client'  // ← Cliente-side (hooks, Google Maps)

export default function ClientesPage() {
  // ~997 líneas de código
}
```

### Estados Principales
```typescript
const [customers, setCustomers] = useState<Customer[]>([])
const [searchTerm, setSearchTerm] = useState('')
const [loading, setLoading] = useState(true)
const [isDialogOpen, setIsDialogOpen] = useState(false)
const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
const [addresses, setAddresses] = useState<Address[]>([])

// Eliminación
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
const [deleteDependencies, setDeleteDependencies] = useState({ addresses: 0, orders: 0 })

// Direcciones
const [addressDialogOpen, setAddressDialogOpen] = useState(false)
const [editingAddress, setEditingAddress] = useState<Address | null>(null)
const [deleteAddressDialogOpen, setDeleteAddressDialogOpen] = useState(false)
const [addressToDelete, setAddressToDelete] = useState<Address | null>(null)
const [addressDependencies, setAddressDependencies] = useState({ orders: 0 })

// Google Maps
const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
const autocompleteRef = useRef<any>(null)
const addressInputRef = useRef<HTMLInputElement>(null)
```

### Hooks Utilizados
```typescript
// Cargar datos iniciales
useEffect(() => {
  loadCustomers()
}, [])

// Inicializar Autocomplete cuando modal se abre
useEffect(() => {
  if (!googleMapsLoaded || !addressDialogOpen) return
  
  const timer = setTimeout(() => {
    if (!addressInputRef.current) return
    
    const google = (window as any).google
    if (!google || !google.maps || !google.maps.places) return
    
    // Crear Autocomplete
    const autocomplete = new google.maps.places.Autocomplete(...)
    
    // Listener
    autocomplete.addListener('place_changed', () => {
      // Extraer datos y actualizar formulario
    })
    
    autocompleteRef.current = autocomplete
  }, 100)
  
  return () => clearTimeout(timer)
}, [googleMapsLoaded, addressDialogOpen])
```

---

## 🔄 Flujo de Trabajo

### Flujo: Agregar Cliente con Dirección

```
Usuario abre /clientes
         ↓
Click "+ Nuevo Cliente"
         ↓
Modal se abre
         ↓
Completa: Nombre, Tipo, Teléfono, etc.
         ↓
Click "Crear Cliente"
         ↓
Cliente guardado en Supabase
         ↓
Lista de clientes se actualiza
         ↓
Usuario click "✏️ Editar" en el cliente
         ↓
Modal de edición se abre
         ↓
Sección "Direcciones Asociadas" visible
         ↓
Click "+ Agregar Dirección"
         ↓
Modal de dirección se abre
         ↓
Google Maps script carga (si no estaba)
         ↓
Usuario escribe "zenteno 881"
         ↓
Dropdown de Google Maps aparece
         ↓
Usuario click en "Zenteno 881, Maipú, RM"
         ↓
Sistema captura:
  - Dirección completa
  - Comuna: "Maipú"
  - Coordenadas GPS
         ↓
Usuario agrega indicaciones: "Casa azul"
         ↓
Usuario marca "Predeterminada"
         ↓
Click "Crear Dirección"
         ↓
Dirección guardada en Supabase
         ↓
Lista de direcciones del cliente se actualiza
         ↓
✅ Cliente tiene dirección completa con GPS
```

---

## 🔗 Relaciones con Otros Módulos

### Consume Datos De:
- ✅ `3t_customers` - Base de clientes
- ✅ `3t_addresses` - Direcciones de clientes

### Es Consumido Por:
- ✅ `/pedidos` - Selecciona cliente y dirección
- ✅ `/rutas` - Usa coordenadas GPS para optimización
- ✅ `/mapa` - Muestra ubicaciones de direcciones
- ✅ `/dashboard` - Analiza ventas por cliente

### APIs Externas:
- ✅ **Google Maps Places API** - Autocompletado
- ✅ **Google Maps Geocoding API** - Coordenadas
- ✅ **Supabase** - Almacenamiento

---

## 📋 Ejemplos de Uso

### Caso 1: Agregar Cliente Empresa con Dirección
```
1. Click "+ Nuevo Cliente"
2. Nombre: "Supermercado Central"
3. Tipo: "Empresa"
4. Teléfono: "+56987654321"
5. Email: "compras@supercentral.cl"
6. Precio Recarga: $3500
7. Click "Crear"
8. ✅ Cliente creado

9. Click "✏️" en el cliente
10. Scroll a "Direcciones Asociadas"
11. Click "+ Agregar Dirección"
12. Escribir: "av kennedy 5600"
13. Seleccionar: "Av. Pdte. Kennedy 5600, Las Condes, RM"
14. Comuna se completa: "Las Condes"
15. Indicaciones: "Entrada por estacionamiento trasero"
16. ☑ Marcar como predeterminada
17. Click "Crear Dirección"
18. ✅ Dirección guardada con GPS

Resultado:
- Cliente: Supermercado Central (Empresa)
- Dirección: Av. Pdte. Kennedy 5600, Las Condes
- GPS: -33.xxx, -70.xxx
- Predeterminada: Sí
```

---

## 🐛 Troubleshooting

### Problema: Autocompletado no aparece
**Causa**: Google Maps API no cargada o API Key incorrecta

**Solución**:
```typescript
// 1. Verificar API Key
console.log(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)

// 2. Verificar que script cargó
console.log('Google Maps loaded:', googleMapsLoaded)

// 3. Verificar que APIs están habilitadas en Google Cloud Console
// - Maps JavaScript API ✅
// - Places API (antigua) ✅
```

### Problema: Dropdown no es clickeable
**Causa**: z-index incorrecto o modal bloqueando

**Solución**: Ya está resuelto en `globals.css`:
```css
.pac-container {
  z-index: 999999 !important;
  position: fixed !important;
  pointer-events: auto !important;
}
```

### Problema: Modal se cierra al seleccionar dirección
**Causa**: Dialog interpreta click fuera como intención de cerrar

**Solución**: Ya está resuelto en `DialogContent`:
```typescript
onInteractOutside={(e) => {
  const target = e.target as HTMLElement
  if (target.closest('.pac-container')) {
    e.preventDefault()
    return
  }
}}
```

### Problema: Comuna no se captura
**Causa**: Google Maps no devuelve `locality` en address_components

**Solución**:
```typescript
// Intentar múltiples tipos
const comunaComponent = place.address_components?.find(component => 
  component.types.includes('locality') ||
  component.types.includes('administrative_area_level_3')
)
```

### Problema: Error "This API key is not authorized"
**Causa**: Places API (New) habilitada en lugar de Places API (antigua)

**Solución**:
1. Ve a Google Cloud Console
2. APIs y Servicios → Biblioteca
3. Busca "Places API" (NO "New")
4. Habilitar la versión ANTIGUA

---

## ⚡ Mejoras Futuras Sugeridas

1. **Validación de Dirección Real**
   - Verificar que la dirección existe usando Geocoding API
   - Mostrar preview del mapa antes de guardar

2. **Historial de Direcciones**
   - Guardar direcciones frecuentemente usadas
   - Sugerencias basadas en historial

3. **Importación Masiva**
   - Subir CSV con clientes y direcciones
   - Validación automática con Google Maps

4. **Edición en Tabla**
   - Editar nombre/teléfono directamente en la tabla
   - Sin abrir modal

---

## 📚 Referencias

- Google Maps Places Autocomplete: [Documentación oficial](https://developers.google.com/maps/documentation/javascript/place-autocomplete)
- Supabase Queries: [Supabase Docs](https://supabase.com/docs/guides/database/joins-and-nested-tables)
- shadcn/ui Dialog: [Dialog Component](https://ui.shadcn.com/docs/components/dialog)

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación del Módulo: Clientes (con Google Maps)**  
**Última actualización:** Octubre 11, 2025

