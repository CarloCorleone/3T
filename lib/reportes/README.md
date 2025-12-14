# Módulo de Reportes - Agua Tres Torres

## 📊 Descripción

Módulo completo de reportes con 6 tipos de informes funcionales, exportación a PDF y Excel, y gráficos interactivos usando shadcn/ui Charts.

## 🗂️ Estructura

```
lib/reportes/
├── types.ts              # Tipos TypeScript para todos los reportes
├── queries.ts            # Funciones de consulta a Supabase
├── excel-generator.ts    # Generación de archivos Excel (.xlsx)
├── pdf-generator.ts      # Generación de archivos PDF
└── README.md            # Esta documentación

components/reportes/
├── reporte-ventas.tsx           # Reporte de ventas mensuales
├── reporte-cuentas-cobrar.tsx   # Cuentas por cobrar
├── reporte-clientes.tsx         # Análisis de clientes
├── reporte-entregas.tsx         # Entregas por zona
├── reporte-productos.tsx        # Análisis de productos
└── reporte-ejecutivo.tsx        # Resumen ejecutivo
```

## 📋 Reportes Disponibles

### 1. **Ventas Mensuales** 💰
- Total de ventas por día/semana/mes
- Desglose: Hogar vs Empresa
- Ventas con/sin IVA
- Gráfico de líneas (tendencia temporal)
- Gráfico de barras (por tipo de cliente)
- Tabla detallada de transacciones
- **Formatos**: PDF y Excel

**Uso:**
```tsx
<ReporteVentas
  open={true}
  onOpenChange={(open) => setOpen(open)}
  fechaInicio="2025-01-01"
  fechaFin="2025-01-31"
/>
```

### 2. **Cuentas por Cobrar** 🔴
- Pedidos con pago pendiente
- Total por cobrar (CLP)
- Antigüedad de deudas (0-30, 31-60, 60+ días)
- Top 5 deudores
- Alertas de cuentas muy vencidas
- Gráfico de barras (distribución por antigüedad)
- **Formatos**: PDF y Excel

**Características especiales:**
- ⚠️ Alertas visuales para cuentas con más de 60 días vencidos
- Badges de color según antigüedad
- Información de contacto de clientes

### 3. **Análisis de Clientes** 👥
- Top 10 clientes por volumen y valor
- Frecuencia de compra promedio
- Clientes inactivos (>30 días sin comprar)
- Ticket promedio por cliente
- Gráfico de barras horizontales (top clientes)
- **Formatos**: PDF y Excel (3 hojas: Todos, Top 10, Inactivos)

**Métricas:**
- Total clientes
- Clientes activos vs inactivos
- Ticket promedio general
- Días sin comprar por cliente

### 4. **Entregas por Zona** 📍
- Botellones entregados por comuna
- Tiempo promedio de entrega por zona
- Top 10 comunas con más entregas
- Gráfico de barras (comunas)
- **Formatos**: PDF y Excel

**Datos mostrados:**
- Total entregas por comuna
- Total botellones entregados
- Tiempo promedio en minutos
- Total ventas por zona

### 5. **Productos** 📦
- Productos más vendidos (10L vs 20L)
- Porcentaje recarga vs nuevo
- Total botellones por formato
- Gráfico de barras (productos)
- Gráfico de pie (recarga vs nuevo)
- **Formatos**: PDF y Excel (2 hojas: Productos, Tipos)

**Análisis:**
- Distribución de formatos
- Tendencia recarga vs nuevo
- Producto más vendido

### 6. **Resumen Ejecutivo** 📄
- KPIs principales del período
- Ingresos totales con comparativa
- Top 5 clientes
- Top 5 productos
- Cuentas por cobrar (resumen)
- Ventas por tipo de cliente
- **Formato**: Solo PDF (diseño profesional)

**Características:**
- Comparativa con período anterior
- Indicadores de tendencia (↑↓)
- Diseño corporativo con logo y colores
- Ideal para imprimir o presentar

## 🎨 Gráficos (shadcn/ui Charts)

Todos los reportes utilizan componentes de gráficos de shadcn/ui basados en Recharts:

- **LineChart**: Tendencias temporales
- **BarChart**: Comparativas y rankings
- **PieChart**: Distribuciones porcentuales

**Características:**
- ✅ Dark mode compatible
- ✅ Tooltips interactivos
- ✅ Responsive design
- ✅ Estilos consistentes con el sistema

## 📦 Exportación

### PDF
- Logo corporativo de Agua Tres Torres
- Colores: `#0891b2` (primary), `#0e7490` (primaryDark)
- Headers y footers profesionales
- Tablas con `jspdf-autotable`
- Resaltado de datos críticos (alertas, valores altos)

### Excel
- Formato `.xlsx`
- Múltiples hojas cuando aplica
- Headers en negrita
- Datos formateados correctamente
- Compatible con Microsoft Excel y LibreOffice

## 🔧 Uso en la Aplicación

### Página Principal
```tsx
// /app/reportes/page.tsx
import { ReporteVentas } from '@/components/reportes/reporte-ventas'

export default function ReportesPage() {
  const [fechaInicio, setFechaInicio] = useState('2025-01-01')
  const [fechaFin, setFechaFin] = useState('2025-01-31')
  
  return (
    <ReporteVentas
      open={modalAbierto}
      onOpenChange={setModalAbierto}
      fechaInicio={fechaInicio}
      fechaFin={fechaFin}
    />
  )
}
```

### Filtros de Período
La página de reportes incluye filtros globales:
- Mes actual
- Mes anterior
- Último trimestre
- Año completo
- Personalizado (fechas manuales)

## 📊 Queries a Supabase

### Tablas utilizadas:
- `3t_dashboard_ventas` - Vista principal con datos agregados
- `3t_orders` - Pedidos con detalles completos
- `3t_customers` - Información de clientes
- `3t_products` - Catálogo de productos
- `3t_addresses` - Direcciones de entrega (para análisis geográfico)

### Optimización:
- Queries con filtros de fecha
- Joins optimizados
- Uso de agregaciones SQL
- Carga paralela de datos (Promise.all)

## 🚀 Rendimiento

### Tamaño del módulo:
- **Total**: 371 kB (First Load JS)
- Incluye: 6 reportes + librerías de gráficos + generadores PDF/Excel

### Optimizaciones:
- Lazy loading de modales (solo cargan al abrirse)
- Estados de carga con skeleton loaders
- Paginación de tablas (mostrar primeras 20-50 filas)
- Exportación en background

## 🛠️ Dependencias

### Ya instaladas:
- `jspdf` - Generación de PDFs
- `jspdf-autotable` - Tablas en PDFs
- `recharts` - Librería de gráficos
- `date-fns` - Manejo de fechas

### Nuevas instaladas:
- `xlsx` - Exportación a Excel

### Componentes shadcn/ui:
- `chart` - Componentes de gráficos
- `dialog` - Modales
- `table` - Tablas de datos
- `card` - Tarjetas de métricas
- `badge` - Badges de estado
- `button` - Botones
- `input` - Campos de entrada
- `select` - Selectores
- `label` - Etiquetas

## 📝 Notas de Implementación

### Manejo de errores:
```typescript
try {
  const data = await getVentasData(fechaInicio, fechaFin)
  setVentas(data)
} catch (error) {
  console.error('Error cargando ventas:', error)
  // El componente muestra un estado de error
}
```

### Loading states:
Todos los componentes incluyen:
- Loader spinner mientras cargan datos
- Skeleton loaders (opcional)
- Deshabilitación de botones durante exportación

### Validaciones:
- Verificación de datos vacíos
- Manejo de valores nulos/undefined
- Formateo seguro de moneda y fechas

## 🎯 Próximas Mejoras (Opcional)

- [ ] Programar reportes automáticos (cron jobs)
- [ ] Envío de reportes por email
- [ ] Reportes comparativos (año vs año)
- [ ] Más formatos de exportación (CSV)
- [ ] Gráficos adicionales (áreas, líneas múltiples)
- [ ] Filtros avanzados (por cliente, producto, zona)
- [ ] Cache de reportes frecuentes
- [ ] Reportes en tiempo real (WebSockets)

## 📞 Soporte

Para dudas o problemas con el módulo de reportes, revisar:
- `/docs/modules/REPORTES.md` - Documentación del módulo
- `/docs/ARQUITECTURA.md` - Arquitectura general del sistema

---

**Agua Tres Torres - Sistema de Gestión**  
**Módulo de Reportes v1.0**  
**Última actualización:** Octubre 11, 2025

