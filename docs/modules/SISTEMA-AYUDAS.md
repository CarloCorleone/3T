# 🤖 Sistema de Ayudas Contextuales

**Sistema robusto de ayudas UX implementado en el módulo de Rutas como piloto, con componentes reutilizables, soporte mobile/A11y, store centralizado y contenidos organizados.**

---

## 📋 Resumen Ejecutivo

**Estado:** ✅ Implementado en Rutas (Piloto)  
**Fecha:** Octubre 15, 2025  
**Módulo:** Rutas → Expandir a todos los módulos  

### ✅ Lo que se implementó

- **4 componentes base** reutilizables con API estable
- **Store Zustand** para validaciones centralizadas
- **Contenidos centralizados** por módulo con tree-shaking
- **Soporte mobile/touch** y accesibilidad (A11y)
- **Tokens de diseño** consistentes
- **Telemetría básica** (opcional)

---

## 🏗️ Arquitectura del Sistema

### Componentes Base

#### 1. HelpTooltip
**Archivo:** `components/help/HelpTooltip.tsx`

Tooltip simple con ícono de ayuda, soporte mobile y accesibilidad.

```tsx
<HelpTooltip 
  content="Explicación breve"
  side="top"
  mobileTrigger="tap"
>
  <Button>Acción</Button>
</HelpTooltip>
```

**Props:**
- `content: ReactNode` - Contenido del tooltip
- `side?: 'top'|'right'|'bottom'|'left'` - Posición
- `mobileTrigger?: 'tap'|'longpress'` - Trigger en mobile
- `delayDuration?: number` - Delay de apertura

#### 2. HelpPopover
**Archivo:** `components/help/HelpPopover.tsx`

Popover elaborado con título, descripción, pasos y media lazy-loaded.

```tsx
<HelpPopover
  title="Guía completa"
  description="Explicación detallada"
  steps={["Paso 1", "Paso 2", "Paso 3"]}
  media={<img src="ejemplo.png" />}
  lazyLoadMedia={true}
>
  <Button>Ayuda</Button>
</HelpPopover>
```

**Props:**
- `title: string` - Título del popover
- `description?: ReactNode` - Descripción opcional
- `steps?: string[]` - Lista de pasos numerados
- `media?: ReactNode` - Contenido multimedia
- `lazyLoadMedia?: boolean` - Cargar media solo cuando se abre

#### 3. DisabledButtonTooltip
**Archivo:** `components/help/DisabledButtonTooltip.tsx`

Wrapper para botones deshabilitados que muestra por qué no se puede usar.

```tsx
<DisabledButtonTooltip
  disabled={!canOptimize}
  reason="Se necesitan al menos 2 pedidos"
  requirements={["Google Maps cargado", "Pedidos disponibles"]}
>
  <Button disabled={!canOptimize}>Optimizar</Button>
</DisabledButtonTooltip>
```

**Props:**
- `disabled: boolean` - Si el botón está deshabilitado
- `reason?: string` - Razón principal
- `requirements?: string[]` - Lista de requisitos faltantes
- `children: ReactElement` - El botón a envolver

#### 4. ValidationPanel
**Archivo:** `components/help/ValidationPanel.tsx`

Panel flotante colapsable que muestra validaciones en tiempo real.

```tsx
<ValidationPanel
  items={[
    { id: 'maps', label: 'Google Maps cargado', valid: true },
    { id: 'orders', label: 'Pedidos disponibles', valid: false }
  ]}
  defaultOpen={false}
  position="bottom-right"
/>
```

**Props:**
- `items: ValidationItem[]` - Lista de validaciones
- `defaultOpen?: boolean` - Abierto por defecto
- `position?: 'bottom-right'|'bottom-left'` - Posición del panel

### Store de Validaciones

#### useRouteValidationsStore
**Archivo:** `stores/route-validations.ts`

Store Zustand que centraliza el estado de validaciones del módulo Rutas.

```tsx
const store = useRouteValidationsStore()

// Estados
store.mapsReady
store.pedidosCount
store.rutasCount

// Acciones
store.setMapsReady(true)
store.setPedidosCount(5)
store.setCapacityWarning(1, 10)

// Selectores
store.canOptimize()
store.getValidationItems()
store.hasCapacityIssues()
```

### Contenidos Centralizados

#### Estructura por Módulo
**Archivo:** `lib/help/rutas.ts`

```typescript
export const RUTAS_HELP: HelpContents = {
  tooltips: {
    optimizar: "Agrupa automáticamente...",
    maps: "Abre esta ruta en Google Maps...",
    // ...
  },
  popovers: {
    comoUsar: {
      title: "Cómo usar el módulo de Rutas",
      description: "Organiza y optimiza...",
      steps: ["1️⃣ Los pedidos...", "2️⃣ Arrastra pedidos..."]
    }
  },
  disabledReasons: {
    needTwoOrders: "Se necesitan al menos 2 pedidos...",
    mapsNotReady: "Google Maps está cargando..."
  },
  validations: {
    mapsReady: { label: "Google Maps cargado", message: "Necesario para..." }
  }
}
```

---

## 🎯 Cuándo Usar Cada Componente

### HelpTooltip
- ✅ Explicaciones breves (1-2 líneas)
- ✅ Botones con funcionalidad específica
- ✅ Iconos que necesitan aclaración
- ❌ NO para guías complejas

### HelpPopover
- ✅ Guías paso a paso
- ✅ Explicaciones detalladas
- ✅ Contenido multimedia
- ✅ Onboarding de módulos
- ❌ NO para explicaciones simples

### DisabledButtonTooltip
- ✅ Botones con validaciones complejas
- ✅ Feedback claro de por qué está deshabilitado
- ✅ Lista de requisitos faltantes
- ❌ NO para botones siempre habilitados

### ValidationPanel
- ✅ Módulos con múltiples validaciones
- ✅ Estados complejos que cambian en tiempo real
- ✅ Feedback continuo del sistema
- ❌ NO para validaciones simples

---

## 📱 Soporte Mobile y Accesibilidad

### Mobile/Touch
- **Tooltips:** Tap para toggle, auto-close en 3s
- **Popovers:** Touch-friendly con botón de cerrar
- **Panel:** Colapsable con gestos táctiles
- **Responsive:** Adaptación automática a pantalla pequeña

### Accesibilidad (A11y)
- **ARIA labels:** Todos los componentes tienen labels descriptivos
- **Focus trap:** Popovers capturan el foco
- **Keyboard navigation:** Tab, Enter, Escape funcionan
- **Screen readers:** Contenido accesible para lectores de pantalla
- **Color contrast:** Cumple estándares WCAG

### Tokens de Diseño
```typescript
export const HELP_TOKENS = {
  delays: { open: 200, close: 100 },
  maxWidths: { tooltip: 320, popover: 480 },
  spacing: { gap: 8, padding: 12 },
  zIndex: { tooltip: 50, popover: 100, panel: 40 },
  mobile: { autoCloseDelay: 3000 }
}
```

---

## 🚀 Cómo Replicar en Otros Módulos

### Paso 1: Crear Contenidos
```typescript
// lib/help/pedidos.ts
export const PEDIDOS_HELP: HelpContents = {
  tooltips: { /* ... */ },
  popovers: { /* ... */ },
  disabledReasons: { /* ... */ },
  validations: { /* ... */ }
}
```

### Paso 2: Crear Store (si es necesario)
```typescript
// stores/pedidos-validations.ts
export const usePedidosValidationsStore = create<PedidosValidationsState>((set, get) => ({
  // Estados y acciones específicas del módulo
}))
```

### Paso 3: Integrar en Página
```tsx
// app/pedidos/page.tsx
import { HelpTooltip, HelpPopover, DisabledButtonTooltip, ValidationPanel } from '@/components/help'
import { PEDIDOS_HELP } from '@/lib/help/pedidos'
import { usePedidosValidationsStore } from '@/stores/pedidos-validations'

// Sincronizar estado
useEffect(() => {
  validationsStore.setSomeState(localState)
}, [localState, validationsStore])

// Usar componentes
<HelpTooltip content={PEDIDOS_HELP.tooltips.crear}>
  <Button>Crear Pedido</Button>
</HelpTooltip>
```

### Paso 4: Patrones Comunes

#### Botón con Validación
```tsx
<DisabledButtonTooltip
  disabled={!canCreate}
  reason={PEDIDOS_HELP.disabledReasons.noCustomer}
  requirements={[
    !selectedCustomer && "Selecciona un cliente",
    !selectedAddress && "Selecciona una dirección"
  ].filter(Boolean)}
>
  <Button disabled={!canCreate}>Crear Pedido</Button>
</DisabledButtonTooltip>
```

#### Header con Guía
```tsx
<div className="flex items-center gap-3">
  <h1>Gestión de Pedidos</h1>
  <HelpPopover
    title={PEDIDOS_HELP.popovers.comoUsar.title}
    description={PEDIDOS_HELP.popovers.comoUsar.description}
    steps={PEDIDOS_HELP.popovers.comoUsar.steps}
  />
</div>
```

#### Panel de Validaciones
```tsx
<ValidationPanel
  items={validationsStore.getValidationItems()}
  defaultOpen={false}
  position="bottom-right"
/>
```

---

## 🧪 Testing y Validación

### Casos de Prueba

#### Mobile/Touch
- [ ] Tooltips se abren con tap
- [ ] Auto-close funciona en mobile
- [ ] Popovers son táctiles
- [ ] Panel se colapsa correctamente

#### Accesibilidad
- [ ] Navegación con Tab funciona
- [ ] Enter abre popovers
- [ ] Escape cierra popovers
- [ ] Screen reader lee contenido
- [ ] Focus visible en todos los elementos

#### Funcionalidad
- [ ] Botones deshabilitados muestran razón
- [ ] Validaciones se actualizan en tiempo real
- [ ] Contenidos se cargan correctamente
- [ ] Store sincroniza estado

### Comandos de Testing
```bash
# Linting
npm run lint

# Type checking
npm run build

# Desarrollo con hot reload
npm run dev
```

---

## 📊 Telemetría (Opcional)

### Eventos Tracked
```typescript
// help.open
{ module: 'rutas', key: 'comoUsar', place: 'header' }

// help.disabled_view
{ module: 'rutas', control: 'optimizar', reasons: ['mapsNotReady'] }

// help.panel.item
{ id: 'capacityOk', valid: true }
```

### Integración
```typescript
import { trackHelp } from '@/lib/help/telemetry'

// En componentes
trackHelp('open', { module: 'rutas', key: 'comoUsar' })
```

---

## 🔧 Troubleshooting

### Problemas Comunes

#### Tooltips no aparecen en mobile
**Solución:** Verificar que `mobileTrigger` esté configurado correctamente

#### Popovers no se cierran con Escape
**Solución:** Verificar que el `useEffect` de escape esté implementado

#### Store no se actualiza
**Solución:** Verificar que los `useEffect` de sincronización estén correctos

#### Validaciones no aparecen
**Solución:** Verificar que `getValidationItems()` retorne datos válidos

### Debug
```typescript
// Verificar estado del store
console.log(useRouteValidationsStore.getState())

// Verificar contenidos
console.log(RUTAS_HELP.tooltips.optimizar)
```

---

## 📈 Próximos Pasos

### Fase 2: Expansión
1. **Pedidos** - Formulario multi-producto complejo
2. **Clientes** - Google Maps autocomplete
3. **Productos** - CRUD simple
4. **Resto de módulos** - Aplicar patrón

### Mejoras Futuras
- [ ] Telemetría completa con Supabase
- [ ] Contenidos multiidioma (i18n)
- [ ] Tour guiado interactivo
- [ ] Analytics de uso de ayudas
- [ ] A/B testing de contenidos

---

## 📚 Referencias

- [shadcn/ui Tooltip](https://ui.shadcn.com/docs/components/tooltip)
- [shadcn/ui Popover](https://ui.shadcn.com/docs/components/popover)
- [Zustand Store](https://zustand-demo.pmnd.rs/)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)

---

**💧 Agua Tres Torres - Sistema de Ayudas UX v1.0**  
**Implementado:** Octubre 15, 2025  
**Estado:** ✅ Piloto completado en Rutas  
**Próximo:** Expansión a todos los módulos


















