# 📊 Módulo: Reportes

**Ruta:** `/reportes`  
**Archivo:** `/app/reportes/page.tsx`  
**Tipo:** Página dinámica con 6 reportes funcionales  
**Estado:** ✅ **IMPLEMENTADO Y OPERATIVO**

---

## 📖 Descripción General

El módulo **Reportes** genera informes detallados y análisis avanzados del negocio, complementando el Dashboard con vistas más profundas y específicas.

### Propósito
- Generar reportes descargables en **PDF** y **Excel**
- Análisis históricos y comparativos por período
- Visualización de datos con gráficos interactivos
- KPIs avanzados y métricas del negocio
- Alertas y detección de problemas (ej: cuentas vencidas)

### Audiencia
- **Gerencia**: Reportes ejecutivos mensuales/anuales
- **Finanzas**: Análisis de rentabilidad y cuentas por cobrar
- **Ventas**: Reportes de desempeño y clientes
- **Operaciones**: Análisis de entregas y productos

---

## 🎯 Reportes Disponibles

### 1. 📈 Ventas Mensuales
**Descripción:** Análisis completo de ventas con tendencias y desglose por tipo de cliente

**Métricas Principales:**
- Total ventas del período
- Ventas Empresa vs Hogar
- Total botellones vendidos
- Tiempo promedio de entrega

**Visualizaciones:**
- Gráfico de líneas: Tendencia de ventas por mes
- Gráfico de pie: Distribución Hogar vs Empresa
- Gráfico de barras: Ventas por formato

**Exportación:**
- ✅ PDF con gráficos
- ✅ Excel con datos detallados

**Filtros:** Fecha inicio y fin

---

### 2. 💰 Cuentas por Cobrar
**Descripción:** Pedidos pendientes de pago con antigüedad y alertas de vencimiento

**Métricas Principales:**
- Total pendiente de cobro (CLP)
- Número de pedidos pendientes
- Distribución por antigüedad:
  - 0-30 días
  - 31-60 días
  - 60+ días (alertas rojas)

**Visualizaciones:**
- Tabla con top deudores
- Badges de alerta por antigüedad
- Gráfico de barras: Antigüedad de deudas

**Alertas:**
- ⚠️ Cuentas con más de 60 días vencidos
- 🔴 Clientes con mayor deuda
- Información de contacto para seguimiento

**Exportación:**
- ✅ PDF con alertas visuales
- ✅ Excel con contactos

**Filtros:** Solo pedidos con `payment_status = 'Pendiente'`

---

### 3. 👥 Análisis de Clientes
**Descripción:** Top clientes, frecuencia de compra y clientes inactivos

**Métricas Principales:**
- Total clientes activos
- Ticket promedio por cliente
- Frecuencia de compra
- Clientes inactivos (>30 días sin comprar)

**Visualizaciones:**
- Tabla top 10 clientes (por volumen y valor)
- Tabla clientes inactivos
- Gráfico de barras horizontales: Ranking de clientes

**Segmentación:**
- Top 10 clientes (mayor volumen/valor)
- Todos los clientes (frecuencia, ticket promedio)
- Clientes inactivos (días sin comprar, última compra)

**Exportación:**
- ✅ PDF con análisis completo
- ✅ Excel con 3 hojas:
  - "Todos": Listado completo
  - "Top 10": Mejores clientes
  - "Inactivos": Requieren reactivación

**Filtros:** Fecha inicio y fin

---

### 4. 📍 Entregas por Zona
**Descripción:** Análisis geográfico de entregas y tiempos promedio por comuna

**Métricas Principales:**
- Total entregas por comuna
- Botellones entregados por zona
- Tiempo promedio de entrega (minutos)
- Ventas totales por comuna

**Visualizaciones:**
- Tabla con ranking de comunas
- Gráfico de barras: Top 10 comunas

**Datos Útiles:**
- Identificar zonas con mayor demanda
- Optimizar rutas de entrega
- Detectar zonas con bajo desempeño

**Exportación:**
- ✅ PDF con ranking geográfico
- ✅ Excel con datos completos

**Filtros:** Fecha inicio y fin

---

### 5. 📦 Productos
**Descripción:** Productos más vendidos, análisis recarga vs nuevo y tendencias

**Métricas Principales:**
- Productos más vendidos (10L vs 20L)
- Total botellones por formato
- Porcentaje recarga vs nuevo
- Ingresos por tipo de producto

**Visualizaciones:**
- Gráfico de barras: Productos por formato
- Gráfico de pie: Recarga vs Nuevo

**Análisis:**
- Identificar formato más popular
- Tendencia de recargas vs nuevos clientes
- Proyectar demanda futura

**Exportación:**
- ✅ PDF con análisis visual
- ✅ Excel con 2 hojas:
  - "Productos": Detalle por formato
  - "Tipos": Recarga vs Nuevo

**Filtros:** Fecha inicio y fin

---

### 6. 📄 Resumen Ejecutivo
**Descripción:** KPIs principales y vista general del negocio (solo PDF)

**Métricas Principales:**
- Ingresos actuales vs período anterior (con %)
- Clientes activos
- Pedidos despachados
- Botellones entregados

**Visualizaciones:**
- Comparativa de ingresos
- Top 5 clientes
- Ventas por tipo de cliente
- Resumen de cuentas por cobrar

**Características Especiales:**
- Diseño profesional listo para imprimir
- Ideal para presentaciones gerenciales
- Comparativa automática con período anterior
- Indicadores de tendencia (↑↓)

**Exportación:**
- ✅ Solo PDF (diseño optimizado para impresión)

**Filtros:** Fecha inicio y fin

---

## 🎨 Interfaz de Usuario

### Página Principal (`/reportes`)

**Secciones:**

1. **Header**
   - Título: "Reportes"
   - Descripción: "Genera y descarga reportes detallados de tu negocio"

2. **Configuración de Período** (Card destacado)
   - **Período Predefinido:**
     - Mes Actual
     - Mes Anterior
     - Último Trimestre
     - Año Completo
     - Personalizado
   - **Fechas Manuales:**
     - Fecha Inicio (input date)
     - Fecha Fin (input date)

3. **Grid de Reportes** (6 cards)
   - Cada card tiene:
     - Ícono colorido (TrendingUp, DollarSign, Users, etc.)
     - Título del reporte
     - Descripción breve
     - Botón "Ver Reporte"

4. **Footer Informativo**
   - Explicación de formatos de exportación
   - Diferencias entre PDF y Excel

### Modales de Reportes

**Tamaño:** 95vw x 95vh (casi pantalla completa)

**Estructura:**
- **Header:**
  - Título del reporte
  - Descripción y período aplicado
- **Métricas (Cards):**
  - KPIs principales con íconos
  - Valores formateados (CLP, números, porcentajes)
- **Gráficos:**
  - 1-3 gráficos interactivos por reporte
  - Tooltips con información detallada
  - Responsive (se adaptan al ancho)
- **Tabla de Datos:**
  - Datos detallados en tabla
  - Headers claros
  - Filas con hover effect
- **Botones de Exportación:**
  - Exportar Excel (verde)
  - Exportar PDF (azul)
  - Estado de carga durante exportación

---

## 📊 Gráficos Interactivos

**Librería:** shadcn/ui Charts (basado en Recharts)

### Tipos de Gráficos Utilizados

**1. LineChart (Gráfico de Líneas)**
- **Uso:** Tendencias temporales (ventas por mes)
- **Características:**
  - Punto activo al hacer hover
  - Línea suave (type="monotone")
  - Leyenda descriptiva

**2. BarChart (Gráfico de Barras)**
- **Uso:** Comparativas y rankings
- **Variantes:**
  - Vertical: Productos, zonas
  - Horizontal: Top clientes

**3. PieChart (Gráfico de Pastel)**
- **Uso:** Distribuciones porcentuales
- **Características:**
  - Labels con nombre y porcentaje
  - Colores corporativos
  - Leyenda integrada

### Colores de Gráficos

```typescript
const COLORS = [
  '#0891b2', // Primary
  '#0e7490', // Primary Dark
  '#06b6d4', // Accent
  '#64748b', // Gray
  '#94a3b8', // Gray Light
  '#cbd5e1'  // Gray Very Light
]
```

### Características

- ✅ Dark mode compatible
- ✅ Tooltips interactivos con valores formateados
- ✅ Responsive design
- ✅ Animaciones suaves
- ✅ Estilos consistentes con el sistema

---

## 📦 Exportación de Archivos

### PDF

**Características:**
- Logo corporativo Agua Tres Torres (alta resolución)
- Colores corporativos (#0891b2, #0e7490, #06b6d4)
- Headers profesionales con:
  - Título del reporte
  - Período analizado
  - Fecha de generación
- Tablas con `jspdf-autotable`:
  - Headers con fondo corporativo
  - Alternancia de colores en filas
  - Bordes sutiles
- Footers con paginación
- Resaltado de datos críticos (alertas, totales)
- Formato A4 optimizado para impresión

**Código de Generación:**
```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const doc = new jsPDF()

// Header con logo
doc.addImage(logoBase64, 'PNG', 15, 10, 30, 15)
doc.setFontSize(20)
doc.setTextColor(COLORS.primary)
doc.text('REPORTE DE VENTAS', pageWidth / 2, 20, { align: 'center' })

// Tabla
autoTable(doc, {
  head: [['Cliente', 'Producto', 'Cantidad', 'Total']],
  body: data.map(row => [row.cliente, row.producto, row.qty, formatCurrency(row.total)]),
  startY: 40,
  styles: { fontSize: 9 },
  headStyles: { fillColor: COLORS.primary },
})

// Guardar
doc.save(`Reporte-Ventas-${fechaInicio}-${fechaFin}.pdf`)
```

### Excel

**Características:**
- Formato `.xlsx` nativo (no CSV)
- Múltiples hojas cuando aplica
- Headers en negrita
- Datos formateados correctamente
- Compatible con Microsoft Excel y LibreOffice

**Múltiples Hojas:**
- **Clientes:** "Todos", "Top 10", "Inactivos"
- **Productos:** "Productos", "Tipos"

**Código de Generación:**
```typescript
import * as XLSX from 'xlsx'

const worksheet = XLSX.utils.json_to_sheet(data)
const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas')
XLSX.writeFile(workbook, `Reporte-Ventas-${fechaInicio}-${fechaFin}.xlsx`)
```

---

## 🗄️ Consultas a Supabase

### Tablas Utilizadas

| Tabla | Uso |
|-------|-----|
| `3t_orders` | Pedidos con detalles completos |
| `3t_customers` | Información de clientes |
| `3t_products` | Catálogo de productos |
| `3t_addresses` | Direcciones de entrega (análisis geográfico) |
| `3t_dashboard_ventas` | Vista agregada (si existe) |

### Ejemplo de Query: Ventas por Mes

```typescript
const { data: orders } = await supabase
  .from('3t_orders')
  .select('created_at, final_price, customer_id, product_type')
  .gte('created_at', fechaInicio)
  .lte('created_at', fechaFin)
  .eq('status', 'Despachado')
  .order('created_at', { ascending: true })

// Agregación manual en JavaScript
const ventasPorMes = orders.reduce((acc, order) => {
  const mes = format(new Date(order.created_at), 'MMM yyyy', { locale: es })
  acc[mes] = (acc[mes] || 0) + order.final_price
  return acc
}, {})
```

### Optimizaciones

- ✅ Queries con filtros de fecha (`gte`, `lte`)
- ✅ Joins optimizados con `select('*, customers(*)')`
- ✅ Uso de agregaciones SQL cuando es posible
- ✅ Carga paralela de datos (`Promise.all()`)
- ✅ Caché de clientes y productos

---

## 🛠️ Arquitectura del Módulo

### Estructura de Archivos

```
/opt/cane/3t/
├── app/reportes/
│   └── page.tsx              # Página principal con filtros y grid
│
├── components/reportes/
│   ├── reporte-ventas.tsx           # Reporte 1
│   ├── reporte-cuentas-cobrar.tsx   # Reporte 2
│   ├── reporte-clientes.tsx         # Reporte 3
│   ├── reporte-entregas.tsx         # Reporte 4
│   ├── reporte-productos.tsx        # Reporte 5
│   └── reporte-ejecutivo.tsx        # Reporte 6
│
├── lib/reportes/
│   ├── types.ts              # Tipos TypeScript para todos los reportes
│   ├── queries.ts            # Funciones de consulta a Supabase
│   ├── excel-generator.ts    # Generación de archivos Excel (.xlsx)
│   ├── pdf-generator.ts      # Generación de archivos PDF
│   └── README.md            # Documentación técnica
│
└── docs/modules/
    └── REPORTES.md          # Este archivo
```

### Flujo de Datos

```
1. Usuario abre /reportes
   ↓
2. Selecciona período (mes actual, trimestre, etc.)
   ↓
3. Fechas se actualizan automáticamente
   ↓
4. Usuario hace clic en "Ver Reporte"
   ↓
5. Se abre modal del reporte específico
   ↓
6. Componente carga datos desde Supabase
   ↓
7. Datos se procesan y agregan
   ↓
8. Se renderiza UI con gráficos y tablas
   ↓
9. Usuario exporta a PDF o Excel
   ↓
10. Archivo se descarga automáticamente
```

### Componentes Reutilizables

- `Dialog` (shadcn/ui): Modales full-width
- `Card`: Métricas y contenedores
- `Table`: Tablas de datos
- `Button`: Botones de exportación
- `Select`: Filtros de período
- `Input`: Campos de fecha
- `Badge`: Estados y alertas
- `Loader2`: Spinner de carga

---

## 📊 Métricas de Rendimiento

### Tamaño del Módulo
- **Total First Load JS:** 371 kB
- Incluye: 6 reportes + librerías de gráficos + generadores PDF/Excel

### Tiempo de Carga
- **Carga inicial (página):** ~500ms
- **Carga de datos (por reporte):** ~300-800ms
- **Generación de PDF:** ~1-2 segundos
- **Generación de Excel:** ~200-500ms

### Optimizaciones Aplicadas

1. **Lazy Loading de Modales**
   - Los reportes solo cargan datos al abrirse
   - Ahorro de ~6 queries innecesarias al cargar la página

2. **Estados de Carga**
   - Spinner mientras se cargan datos
   - Deshabilitación de botones durante exportación
   - Feedback visual constante

3. **Paginación de Tablas** (futuro)
   - Mostrar solo primeras 20-50 filas
   - Botón "Ver más" para cargar resto

4. **Exportación en Background**
   - No bloquea la UI
   - Usuario puede cerrar modal mientras descarga

---

## 🔧 Configuración y Personalización

### Cambiar Período por Defecto

```typescript
// /app/reportes/page.tsx
const [periodo, setPeriodo] = useState<PeriodoTipo>('mes-actual') // Cambiar aquí
```

### Agregar Nuevo Reporte

**1. Crear tipo en `/lib/reportes/types.ts`:**
```typescript
export type ReporteNuevoData = {
  // Definir estructura
}
```

**2. Crear función de query en `/lib/reportes/queries.ts`:**
```typescript
export async function getNuevoReporteData(fechaInicio: string, fechaFin: string) {
  // Implementar query
}
```

**3. Crear componente en `/components/reportes/reporte-nuevo.tsx`:**
```typescript
export function ReporteNuevo({ open, onOpenChange, fechaInicio, fechaFin }) {
  // Implementar UI
}
```

**4. Agregar a la página principal `/app/reportes/page.tsx`:**
```typescript
const reportTypes = [
  // ... reportes existentes
  {
    id: 'nuevo' as ReporteId,
    title: 'Reporte Nuevo',
    description: 'Descripción del reporte',
    icon: IconoRelevante,
    color: 'text-color-600',
    bgColor: 'bg-color-100 dark:bg-color-900/20'
  }
]
```

### Modificar Colores de Gráficos

```typescript
// En cualquier componente de reporte
const COLORS = [
  '#0891b2', // Cambiar estos colores
  '#0e7490',
  '#06b6d4',
  // ... más colores
]
```

---

## 🐛 Troubleshooting

### Los gráficos no se muestran
- Verificar que `recharts` esté instalado
- Verificar que los datos tengan el formato correcto
- Revisar console del navegador

### El PDF no se genera
- Verificar que el logo existe en `/public/images/logos/`
- Verificar conexión a internet (para fuentes)
- Revisar console del navegador
- Verificar que `jspdf` y `jspdf-autotable` estén instalados

### El Excel no se descarga
- Verificar que `xlsx` esté instalado correctamente
- Reiniciar el contenedor Docker si es necesario
- Verificar que los datos no estén vacíos

### Los datos no cargan
- Verificar conexión a Supabase
- Verificar que las tablas existan
- Verificar permisos de lectura en Supabase
- Revisar console del navegador para errores de query

### El modal no se abre
- Verificar que el estado `reporteActivo` esté manejándose correctamente
- Verificar que el prop `open` esté llegando al componente

---

## 📚 Dependencias

### Instaladas

```json
{
  "jspdf": "^2.5.1",
  "jspdf-autotable": "^3.8.2",
  "recharts": "^2.10.0",
  "date-fns": "^3.0.0",
  "xlsx": "^0.18.5"
}
```

### Componentes shadcn/ui

- `chart` - Componentes de gráficos
- `dialog` - Modales
- `table` - Tablas de datos
- `card` - Tarjetas de métricas
- `badge` - Badges de estado
- `button` - Botones
- `input` - Campos de entrada
- `select` - Selectores
- `label` - Etiquetas
- `loader` - Spinners de carga

---

## 🔗 Relaciones con Otros Módulos

### Consume Datos De:
- ✅ `3t_orders` - Historial de pedidos
- ✅ `3t_customers` - Información de clientes
- ✅ `3t_products` - Catálogo de productos
- ✅ `3t_addresses` - Direcciones (análisis geográfico)

### Similar a:
- `/presupuestos` - También genera PDFs profesionales
- `/dashboard` - Usa datos similares pero más agregados

---

## 🚀 Mejoras Futuras

### Fase 1: Automatización
- [ ] Programar reportes automáticos (cron jobs)
- [ ] Envío de reportes por email mensual
- [ ] Notificaciones de alertas (ej: cuentas muy vencidas)
- [ ] Guardado de reportes históricos

### Fase 2: Análisis Avanzado
- [ ] Reportes comparativos (año vs año)
- [ ] Proyecciones y forecasting
- [ ] Análisis de tendencias (ML básico)
- [ ] Reportes personalizados por usuario/rol

### Fase 3: Integración
- [ ] Exportación a CSV adicional
- [ ] Integración con Google Sheets
- [ ] API para reportes externos
- [ ] Webhooks de alertas
- [ ] Compartir reportes por WhatsApp

### Fase 4: UX
- [ ] Guardar configuraciones de reportes favoritos
- [ ] Historial de reportes generados
- [ ] Comparación de reportes lado a lado
- [ ] Gráficos adicionales (áreas, líneas múltiples)

---

## ✅ Checklist de Funcionalidades

### Reportes
- [x] Ventas Mensuales
- [x] Cuentas por Cobrar
- [x] Análisis de Clientes
- [x] Entregas por Zona
- [x] Productos
- [x] Resumen Ejecutivo

### Exportación
- [x] Generación de PDF
- [x] Generación de Excel
- [x] Logo corporativo en PDFs
- [x] Múltiples hojas en Excel

### UI/UX
- [x] Filtros de período
- [x] Modales full-width
- [x] Gráficos interactivos
- [x] Estados de carga
- [x] Responsive design
- [x] Dark mode compatible

### Documentación
- [x] README técnico (`/lib/reportes/README.md`)
- [x] Documentación del módulo (este archivo)
- [x] Registro en CHANGELOG
- [x] Comentarios en código

---

## 📞 Soporte y Referencias

**Documentación Relacionada:**
- `/docs/CHANGELOG.md` - Historial de cambios
- `/lib/reportes/README.md` - Documentación técnica
- `/docs/ARQUITECTURA.md` - Arquitectura general del sistema

**Referencias Externas:**
- jsPDF: [github.com/parallax/jsPDF](https://github.com/parallax/jsPDF)
- xlsx: [sheetjs.com](https://sheetjs.com/)
- Recharts: [recharts.org](https://recharts.org/)
- shadcn/ui: [ui.shadcn.com](https://ui.shadcn.com/)

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación del Módulo: Reportes**  
**Estado:** ✅ Implementado y Operativo  
**Última actualización:** Octubre 11, 2025 (Tarde)  
**Versión:** 1.0.0
