# 🆘 Sistema de Ayuda Contextual

Sistema de ayuda implementado para mejorar la UX de la aplicación 3T, proporcionando tooltips, popovers informativos, feedback de botones deshabilitados y un panel de validaciones en tiempo real.

## 🎯 **Características**

- ✅ **Tooltips custom** - Sin dependencias de Radix UI
- ✅ **Popovers informativos** - Con cierre por Escape y click fuera
- ✅ **Feedback de botones deshabilitados** - Muestra razones y requisitos
- ✅ **Panel de validaciones flotante** - Colapsa y persiste en localStorage
- ✅ **Accesibilidad** - Roles ARIA, navegación por teclado
- ✅ **Sin bucles infinitos** - Implementación estable y probada

## 📦 **Componentes**

### `SimpleTooltip`
Tooltip básico que aparece al hacer hover sobre un elemento.

```tsx
import { SimpleTooltip } from '@/components/help'

<SimpleTooltip content="Este es un tooltip de ayuda" side="top">
  <Button>Hover sobre mí</Button>
</SimpleTooltip>
```

**Props:**
- `content`: `React.ReactNode` - Contenido del tooltip
- `children`: `React.ReactElement` - Elemento que activa el tooltip
- `side?`: `'top' | 'right' | 'bottom' | 'left'` - Posición (default: `'top'`)
- `delayDuration?`: `number` - Delay antes de mostrar (default: `200ms`)
- `className?`: `string` - Clases CSS adicionales

### `SimplePopover`
Popover con información detallada, pasos y opcionalmente media.

```tsx
import { SimplePopover } from '@/components/help'

<SimplePopover
  title="Cómo usar esta función"
  description="Explicación detallada de la funcionalidad"
  steps={[
    '1. Primer paso',
    '2. Segundo paso',
    '3. Tercer paso'
  ]}
  module="rutas"
  helpKey="comoUsar"
  place="header"
  trigger={<Button>?</Button>}
/>
```

**Props:**
- `title`: `string` - Título del popover
- `description?`: `React.ReactNode` - Descripción opcional
- `steps?`: `string[]` - Lista de pasos (soporta HTML inline)
- `media?`: `React.ReactNode` - Media opcional (lazy-loaded)
- `trigger?`: `React.ReactNode` - Elemento personalizado (default: botón Info)
- `maxWidth?`: `string` - Ancho máximo (default: `'max-w-md'`)
- `module?`: `HelpKey | 'general'` - Módulo para telemetría
- `helpKey?`: `string` - Identificador para telemetría
- `place?`: `string` - Ubicación para telemetría

### `DisabledButtonHelper`
Wrapper para botones deshabilitados que muestra razones y requisitos.

```tsx
import { DisabledButtonHelper } from '@/components/help'

<DisabledButtonHelper
  disabled={!canSave}
  reason="No se puede guardar todavía"
  requirements={[
    'Completa todos los campos',
    'Selecciona al menos una opción'
  ]}
>
  <Button disabled={!canSave}>Guardar</Button>
</DisabledButtonHelper>
```

**Props:**
- `disabled`: `boolean` - Estado del botón
- `children`: `React.ReactElement` - Botón a wrappear
- `reason?`: `string` - Razón principal
- `requirements?`: `string[]` - Lista de requisitos faltantes

### `SimpleValidationPanel`
Panel flotante que muestra validaciones en tiempo real.

```tsx
import { SimpleValidationPanel } from '@/components/help'

<SimpleValidationPanel
  items={[
    { id: 'mapsReady', label: 'Google Maps cargado', valid: true },
    { id: 'hasOrders', label: 'Pedidos suficientes', valid: false, message: 'Necesitas al menos 2 pedidos' }
  ]}
  defaultOpen={false}
  position="bottom-right"
/>
```

**Props:**
- `items`: `ValidationItem[]` - Lista de validaciones
- `defaultOpen?`: `boolean` - Estado inicial (default: `false`)
- `position?`: `'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'` - Posición

**ValidationItem:**
```ts
interface ValidationItem {
  id: string
  label: string
  valid: boolean
  message?: string
}
```

## 🎨 **Estructura de Contenidos**

Los contenidos de ayuda están centralizados en `/lib/help/`:

```
lib/help/
├── constants.ts     # Tokens de diseño (delays, z-index, etc.)
├── types.ts         # Interfaces TypeScript
├── rutas.ts         # Contenidos del módulo Rutas
├── pedidos.ts       # Contenidos del módulo Pedidos (TODO)
└── index.ts         # Exportaciones centralizadas
```

### Ejemplo de contenidos:

```ts
// lib/help/rutas.ts
export const RUTAS_HELP: HelpContents = {
  tooltips: {
    optimizar: 'Agrupa automáticamente los pedidos...',
    recargar: 'Recarga los pedidos en estado "Ruta"...',
  },
  popovers: {
    comoUsar: {
      title: 'Cómo usar el módulo de Rutas',
      description: 'Organiza y optimiza las entregas...',
      steps: ['1️⃣ Paso uno', '2️⃣ Paso dos'],
    },
  },
  disabledReasons: {
    needTwoOrders: 'Se necesitan al menos 2 pedidos...',
  },
  validations: {
    mapsReady: { label: 'Google Maps cargado', message: '...' },
  },
}
```

## 🔧 **Integración con Zustand**

El panel de validaciones se sincroniza con un store de Zustand:

```ts
// stores/route-validations.ts
export const useRouteValidationsStore = create<RouteValidationsState>((set, get) => ({
  mapsReady: false,
  pedidosCount: 0,
  
  setMapsReady: (ready) => set({ mapsReady: ready }),
  
  canOptimize: () => {
    const { mapsReady, pedidosCount } = get()
    return mapsReady && pedidosCount >= 2
  },
  
  getValidationItems: () => [...],
}))
```

**⚠️ IMPORTANTE:** No incluir el store en las dependencias de `useEffect`:

```ts
// ✅ CORRECTO
useEffect(() => {
  validationsStore.setMapsReady(googleMapsLoaded)
}, [googleMapsLoaded]) // validationsStore NO está en las dependencias

// ❌ INCORRECTO (causa bucles infinitos)
useEffect(() => {
  validationsStore.setMapsReady(googleMapsLoaded)
}, [googleMapsLoaded, validationsStore])
```

## 🚀 **Uso en Páginas**

### Ejemplo completo (Rutas):

```tsx
import { 
  SimpleTooltip, 
  SimplePopover, 
  DisabledButtonHelper, 
  SimpleValidationPanel 
} from '@/components/help'
import { useRouteValidationsStore } from '@/stores/route-validations'
import { RUTAS_HELP } from '@/lib/help/rutas'

export default function RutasPage() {
  const validationsStore = useRouteValidationsStore()
  
  return (
    <>
      {/* Header con popover */}
      <SimplePopover
        title={RUTAS_HELP.popovers.comoUsar.title}
        description={RUTAS_HELP.popovers.comoUsar.description}
        steps={RUTAS_HELP.popovers.comoUsar.steps}
        module="rutas"
        helpKey="comoUsarRutas"
        place="header"
      />
      
      {/* Botón con tooltip */}
      <SimpleTooltip content={RUTAS_HELP.tooltips.recargar}>
        <Button onClick={recargar}>Recargar</Button>
      </SimpleTooltip>
      
      {/* Botón deshabilitado con feedback */}
      <DisabledButtonHelper
        disabled={!validationsStore.canOptimize()}
        reason={RUTAS_HELP.disabledReasons.needTwoOrders}
        requirements={['Al menos 2 pedidos disponibles']}
      >
        <Button disabled={!validationsStore.canOptimize()}>
          Optimizar
        </Button>
      </DisabledButtonHelper>
      
      {/* Panel de validaciones */}
      <SimpleValidationPanel
        items={validationsStore.getValidationItems()}
        position="bottom-right"
      />
    </>
  )
}
```

## 🎯 **Mejores Prácticas**

1. **Centraliza contenidos** - Usa archivos en `/lib/help/` para cada módulo
2. **Reutiliza componentes** - No crees tooltips inline, usa `SimpleTooltip`
3. **Mantén la accesibilidad** - Los componentes ya tienen roles ARIA
4. **Evita bucles infinitos** - No pongas stores de Zustand en dependencias de useEffect
5. **Usa telemetría** - Pasa `module`, `helpKey` y `place` para tracking
6. **Mantén consistencia** - Usa los mismos tokens de diseño (delays, z-index)

## 📊 **Telemetría**

Los eventos de ayuda se loggean en consola (desarrollo):

```
📊 Help opened: { module: 'rutas', key: 'comoUsarRutas', place: 'header' }
```

Para producción, implementa:
```ts
// lib/help/telemetry.ts
export const logHelpEvent = async (event: HelpEvent) => {
  await supabase.from('help_events').insert([event])
  // o: await fetch('/api/telemetry', { method: 'POST', body: JSON.stringify(event) })
}
```

## 🐛 **Problemas Conocidos**

### Componentes originales (Radix UI)
- ⚠️ `HelpTooltip`, `HelpPopover`, `DisabledButtonTooltip` y `ValidationPanel` causan bucles infinitos
- ✅ Usa los componentes `Simple*` en su lugar

### Zustand en dependencias
- ⚠️ Incluir stores de Zustand en dependencias de `useEffect` causa re-renders infinitos
- ✅ Los stores son estables, no necesitan estar en dependencias

## 📚 **Referencias**

- [Documentación de Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React useEffect Best Practices](https://react.dev/reference/react/useEffect)
- [ARIA Authoring Practices Guide - Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
- [ARIA Authoring Practices Guide - Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)


















