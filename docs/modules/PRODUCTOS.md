# 📦 Módulo: Productos

**Ruta:** `/productos`  
**Archivo:** `/app/productos/page.tsx`  
**Tipo:** Página dinámica con CRUD completo

---

## 📖 Descripción General

El módulo **Productos** gestiona el catálogo de productos disponibles para venta, incluyendo botellones, dispensadores, bombas y otros artículos relacionados con agua purificada.

### Propósito
- Mantener catálogo actualizado de productos
- Gestionar precios neto y con IVA
- Categorizar productos (Contrato vs Venta)
- Eliminar productos no utilizados

### Audiencia
- **Administradores**: Crear y actualizar productos
- **Ventas**: Consultar precios actuales
- **Finanzas**: Gestionar precios con IVA

---

## ✨ Funcionalidades

### 1. CRUD de Productos

#### Listar Productos
- Tabla con todos los productos
- Búsqueda por nombre
- Badges de categoría (Contrato/Venta)
- Precios mostrados: Neto y con IVA
- Botones: Editar, Eliminar

#### Crear Producto
- Modal con formulario
- Campos:
  - Nombre del producto
  - Categoría (Contrato / Venta)
  - Precio Neto (CLP)
- **Precio con IVA se calcula automáticamente** (columna generada)
- Validación de campos requeridos

#### Editar Producto
- Modal con datos pre-cargados
- Todos los campos editables excepto `pv_iva_inc`
- Actualización en tiempo real

#### Eliminar Producto
- Confirmación con modal
- ⚠️ **Actualmente no valida dependencias** (mejora futura)
- Eliminación directa si el usuario confirma

### 2. Cálculo Automático de IVA

```sql
-- Columna generada en Supabase
pv_iva_inc INTEGER GENERATED ALWAYS AS (CAST(price_neto * 1.19 AS INTEGER)) STORED
```

**Ventajas**:
- ✅ No se puede modificar manualmente (siempre correcto)
- ✅ Se actualiza automáticamente al cambiar `price_neto`
- ✅ Cálculo consistente en toda la base de datos

---

## 🎨 Interfaz de Usuario

### Componentes shadcn/ui
```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
```

### Estructura Visual

```
┌─────────────────────────────────────────┐
│  [Buscar producto...]    [+ Nuevo]      │
└─────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ Nombre           │ Categoría │ Neto │ IVA │ Acción │
├────────────────────────────────────────────────────┤
│ Botellón 20L     │ Venta     │5,000 │5,950│ [✏️][🗑️]│
│ Dispensador Frío │ Venta     │25,000│29,750│[✏️][🗑️]│
│ PC               │ Contrato  │  0   │  0  │ [✏️][🗑️]│
└────────────────────────────────────────────────────┘
```

---

## 💾 Datos y Lógica

### Tabla de Supabase

#### `3t_products`
```sql
CREATE TABLE 3t_products (
  product_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Contrato', 'Venta')),
  price_neto INTEGER NOT NULL,
  pv_iva_inc INTEGER GENERATED ALWAYS AS (CAST(price_neto * 1.19 AS INTEGER)) STORED,
  image_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Queries Principales

#### Cargar Productos
```typescript
const { data, error } = await supabase
  .from('3t_products')
  .select('*')
  .order('name', { ascending: true })
```

#### Crear Producto
```typescript
const { data, error } = await supabase
  .from('3t_products')
  .insert([{
    product_id: crypto.randomUUID(),
    name: formData.name,
    category: formData.category,
    price_neto: formData.price_neto,
    image_url: null
    // pv_iva_inc NO se inserta - es columna generada
  }])
  .select()
```

#### Actualizar Producto
```typescript
const { data, error } = await supabase
  .from('3t_products')
  .update({
    name: formData.name,
    category: formData.category,
    price_neto: formData.price_neto
    // pv_iva_inc NO se actualiza - es columna generada
  })
  .eq('product_id', editingProduct.product_id)
```

### Categorías de Productos

| Categoría | Descripción | Uso en Pedidos |
|-----------|-------------|----------------|
| **Contrato** | Servicios sin costo directo | Precio viene del cliente |
| **Venta** | Productos físicos | Precio viene del producto |

**Ejemplos**:
- **Contrato**: PC (Precio Contrato), PET, Transporte
- **Venta**: Botellones, Dispensadores, Bombas, Vasos

---

## 💻 Código Técnico

### Ubicación
```
/opt/cane/3t/app/productos/page.tsx
```

### Tipo de Componente
```typescript
'use client'  // Cliente-side (hooks)
```

### Estados
```typescript
const [products, setProducts] = useState<Product[]>([])
const [searchTerm, setSearchTerm] = useState('')
const [loading, setLoading] = useState(true)
const [isDialogOpen, setIsDialogOpen] = useState(false)
const [editingProduct, setEditingProduct] = useState<Product | null>(null)
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [productToDelete, setProductToDelete] = useState<Product | null>(null)

const [formData, setFormData] = useState({
  name: '',
  category: '',
  price_neto: 0,
  pv_iva_inc: 0  // Solo para mostrar, no se guarda
})
```

### Hooks
```typescript
useEffect(() => {
  loadProducts()
}, [])
```

---

## 🔄 Flujo de Trabajo

```
Usuario accede a /productos
         ↓
Carga lista de productos
         ↓
Usuario click "+ Nuevo Producto"
         ↓
Modal se abre
         ↓
Completa: Nombre, Categoría, Precio Neto
         ↓
Click "Crear"
         ↓
Supabase INSERT
         ↓
Supabase calcula automáticamente pv_iva_inc = price_neto * 1.19
         ↓
Producto guardado
         ↓
Lista se actualiza
         ↓
✅ Producto visible con precio IVA calculado
```

---

## 🔗 Relaciones con Otros Módulos

### Es Consumido Por:
- ✅ `/pedidos` - Selecciona producto al crear pedido
- ✅ `/dashboard` - Analiza ventas por producto
- ✅ `/presupuestos` - Lista productos para presupuestos

### Consume Datos De:
- Ninguno (tabla independiente)

---

## 📋 Ejemplos de Uso

### Caso 1: Agregar Producto de Venta
```
1. Click "+ Nuevo Producto"
2. Nombre: "Botellón 10L"
3. Categoría: "Venta"
4. Precio Neto: 4000
5. Click "Crear"
6. ✅ Producto creado con:
   - Precio Neto: $4,000
   - Precio IVA: $4,760 (calculado automáticamente)
```

### Caso 2: Actualizar Precio
```
1. Click "✏️" en "Botellón 20L"
2. Cambiar Precio Neto: 5000 → 5500
3. Click "Actualizar"
4. ✅ Precio IVA se recalcula automáticamente: $6,545
```

---

## 🐛 Troubleshooting

### Problema: Error al insertar `pv_iva_inc`
**Causa**: Intentando insertar columna generada

**Solución**: 
```typescript
// ❌ Incorrecto
.insert([{ ..., pv_iva_inc: 5950 }])

// ✅ Correcto
.insert([{ ..., price_neto: 5000 }])
// pv_iva_inc se calcula automáticamente
```

### Problema: Productos no se pueden eliminar
**Causa**: Productos referenciados en pedidos

**Solución Futura**:
```typescript
// Agregar validación de dependencias
const { count } = await supabase
  .from('3t_orders')
  .select('*', { count: 'exact', head: true })
  .eq('product_type', productId)

if (count > 0) {
  alert(`No puedes eliminar porque tiene ${count} pedidos asociados`)
  return
}
```

---

## ⚡ Mejoras Futuras Sugeridas

1. **Validación de Dependencias**
   - Verificar pedidos antes de eliminar
   - Mostrar cantidad de pedidos que usan el producto

2. **Imágenes de Productos**
   - Upload de imágenes a Supabase Storage
   - Mostrar thumbnail en la tabla

3. **Historial de Precios**
   - Guardar cambios de precio con fecha
   - Ver evolución de precios

4. **Stock (Inventario)**
   - Agregar campo `stock` a la tabla
   - Alertas de stock bajo

---

## 📚 Referencias

- Columnas Generadas PostgreSQL: [Generated Columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)
- Supabase Insert: [Supabase Docs](https://supabase.com/docs/reference/javascript/insert)

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación del Módulo: Productos**  
**Última actualización:** Octubre 11, 2025

