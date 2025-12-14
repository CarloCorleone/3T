# 📄 Módulo de Presupuestos

Sistema completo para crear, gestionar y descargar presupuestos en formato PDF profesional.

## 🎯 Características

- ✅ Creación de presupuestos con datos del cliente
- ✅ Búsqueda de productos existentes o creación de productos temporales
- ✅ Cálculo automático de IVA (19%)
- ✅ Condiciones de pago predefinidas
- ✅ Generación automática de PDF profesional con logo
- ✅ Almacenamiento en Supabase Storage
- ✅ Validez de 15 días desde creación
- ✅ Estados: Borrador, Enviado, Aprobado, Rechazado
- ✅ Descarga y visualización de PDFs

## 📊 Base de Datos

### Tablas

#### `3t_quotes` (Presupuestos)
```sql
- quote_id: UUID (PK)
- quote_number: TEXT (formato: PRE-YYYY-NNN)
- customer_id: UUID (opcional, referencia a cliente existente)
- customer_name: TEXT
- customer_rut: TEXT
- customer_email: TEXT
- customer_phone: TEXT
- customer_address: TEXT
- subtotal: INTEGER
- iva_amount: INTEGER (19%)
- total: INTEGER
- payment_conditions: TEXT
- valid_until: DATE (15 días desde creación)
- status: TEXT (borrador|enviado|aprobado|rechazado)
- pdf_url: TEXT (URL en Supabase Storage)
- observations: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `3t_quote_items` (Items del presupuesto)
```sql
- item_id: UUID (PK)
- quote_id: UUID (FK)
- product_id: UUID (opcional, referencia a producto existente)
- product_name: TEXT
- product_description: TEXT
- quantity: INTEGER
- unit_price: INTEGER
- subtotal: INTEGER
- order_index: INTEGER
- created_at: TIMESTAMP
```

### Storage

**Bucket**: `presupuestos_pdf`
- Público: Sí
- Estructura: `presupuestos/{año}/{numero-presupuesto}.pdf`
- Formato: PDF
- Límite: 10MB

### Funciones SQL

#### `generate_quote_number()`
Genera automáticamente el número de presupuesto en formato `PRE-YYYY-NNN`.

Ejemplo:
- PRE-2025-001
- PRE-2025-002
- PRE-2025-015

## 🎨 Componentes

### Página Principal (`/presupuestos`)
- **Métricas**: Total presupuestos, monto total, por estado
- **Filtros**: Búsqueda por número/cliente, filtro por estado
- **Tabla**: Lista de presupuestos con acciones
- **Acciones**: Ver PDF, Descargar, Eliminar

### Formulario de Presupuesto
- **Cliente**: Selección de cliente existente o ingreso manual
- **Items**: Agregar/eliminar productos
- **Productos**: Búsqueda en sistema o ingreso manual
- **Totales**: Cálculo automático de subtotal, IVA y total
- **Condiciones**: Selección de condiciones de pago
- **Observaciones**: Campo de texto libre

### Componentes Auxiliares
- `QuoteStatusBadge`: Badge con colores por estado
- `ProductSearch`: Combobox para buscar productos
- `QuotePDFViewer`: Visor de PDF en modal

## 📝 Uso

### Crear un Presupuesto

1. Ir a `/presupuestos`
2. Clic en "Nuevo Presupuesto"
3. Completar datos del cliente (o seleccionar uno existente)
4. Agregar items:
   - Buscar producto del sistema, o
   - Ingresar manualmente nombre, descripción, cantidad y precio
5. Seleccionar condiciones de pago
6. Agregar observaciones (opcional)
7. Revisar totales calculados automáticamente
8. Guardar

**El sistema automáticamente:**
- Genera el número de presupuesto (PRE-YYYY-NNN)
- Calcula el IVA (19%)
- Establece la validez (15 días)
- Crea el PDF profesional
- Sube el PDF a Supabase Storage
- Guarda la URL del PDF en la base de datos

### Ver/Descargar PDF

**Opción 1: Ver en navegador**
- Clic en el ícono 👁️ (ojo) en la tabla
- Se abre un modal con el PDF integrado
- Opción de descargar desde el modal

**Opción 2: Descargar directamente**
- Clic en el ícono ⬇️ (descarga) en la tabla
- El PDF se descarga automáticamente

### Cambiar Estado

Los presupuestos pueden tener los siguientes estados:
- **Borrador** (gris): Recién creado, en proceso
- **Enviado** (azul): Enviado al cliente
- **Aprobado** (verde): Cliente aceptó el presupuesto
- **Rechazado** (rojo): Cliente rechazó el presupuesto

### Eliminar Presupuesto

- Clic en el ícono 🗑️ (basura)
- Confirmar eliminación
- Se elimina el presupuesto y sus items
- **Nota**: El PDF en Storage no se elimina automáticamente (por seguridad)

## 📄 Formato del PDF

### Cabecera
- Logo Agua Tres Torres (alta resolución)
- Datos de la empresa:
  - Razón Social: Agua Purificada Tres Torres Limitada
  - RUT: 76.950.304-8
  - Giro: Venta de Agua Purificada
  - Dirección: Cam. San Alberto Hurtado 13460, Maipú
  - Teléfono: +56 9 9678 1204
  - Email: ventas@aguatrestorres.cl

### Información del Presupuesto
- Título: "PRESUPUESTO"
- Número de presupuesto
- Fecha de emisión
- Válido hasta (fecha + 15 días)

### Datos del Cliente
- Nombre / Razón Social
- RUT
- Email y Teléfono
- Dirección

### Tabla de Productos
| Producto | Descripción | Cant. | Precio Unit. | Subtotal |
|----------|-------------|-------|--------------|----------|
| ...      | ...         | ...   | ...          | ...      |

### Totales
- Subtotal
- IVA (19%)
- **TOTAL** (destacado)

### Condiciones y Observaciones
- Condiciones de pago seleccionadas
- Observaciones adicionales (si existen)

### Pie de Página
- Nota legal
- Fecha y hora de generación

## 🎨 Colores Corporativos

El PDF utiliza los colores corporativos de Agua Tres Torres:
- **Primario**: Azul (#2563eb)
- **Secundario**: Azul claro (#60a5fa)
- **Texto**: Gris oscuro (#1f2937)
- **Fondo**: Gris muy claro (#f9fafb)

## 🔧 Configuración

### Condiciones de Pago

Las condiciones predefinidas están en `/components/quote-form.tsx`:

```typescript
const PAYMENT_CONDITIONS = [
  { value: "Contado", label: "Contado" },
  { value: "Crédito 30 días", label: "Crédito 30 días" },
  { value: "Crédito 60 días", label: "Crédito 60 días" },
  { value: "Crédito 90 días", label: "Crédito 90 días" },
]
```

### Validez del Presupuesto

Por defecto: **15 días** desde la fecha de creación.

Para cambiar, modificar en `/components/quote-form.tsx`:
```typescript
const validUntil = format(addDays(new Date(), 15), 'yyyy-MM-dd')
// Cambiar 15 por el número de días deseado
```

### IVA

El IVA está definido como constante en `/lib/supabase.ts`:
```typescript
export const IVA_RATE = 0.19 // 19%
```

## 🐛 Troubleshooting

### El PDF no se genera
- Verificar que el logo existe en `/public/images/logos/Logo-Tres-torres@2x.png`
- Verificar conexión a internet (para fuentes)
- Revisar console del navegador

### El PDF no se sube a Storage
- Verificar que el bucket `presupuestos_pdf` existe
- Verificar permisos de Storage en Supabase
- Verificar tamaño del PDF (máximo 10MB)

### No se genera el número de presupuesto
- Verificar que la función `generate_quote_number()` existe en PostgreSQL
- Ejecutar manualmente:
```sql
SELECT generate_quote_number();
```

### Error al buscar productos
- Verificar que la tabla `3t_products` tiene datos
- Verificar permisos de lectura en Supabase

## 📚 Archivos Clave

```
/opt/cane/3t/
├── app/presupuestos/
│   └── page.tsx              # Página principal
├── components/
│   ├── quote-form.tsx        # Formulario de presupuesto
│   ├── quote-status-badge.tsx # Badge de estados
│   ├── product-search.tsx    # Búsqueda de productos
│   └── quote-pdf-viewer.tsx  # Visor de PDF
├── lib/
│   ├── pdf-generator.ts      # Generación de PDFs
│   ├── storage.ts            # Subida/descarga de Storage
│   └── supabase.ts           # Tipos y cliente
└── public/images/logos/
    └── Logo-Tres-torres@2x.png # Logo corporativo
```

## 🚀 Desarrollo Futuro

Posibles mejoras:
- [ ] Envío automático por email
- [ ] Plantillas de presupuesto personalizables
- [ ] Conversión de presupuesto a pedido
- [ ] Historial de cambios
- [ ] Firma digital
- [ ] Multi-moneda
- [ ] Descuentos y recargos
- [ ] Exportación a Excel
- [ ] Duplicar presupuesto
- [ ] Versiones de presupuesto

---

**Fecha de creación**: Octubre 2025  
**Versión**: 1.0.0


