# 🔴 Guía de Implementación: Supabase Realtime

**Fecha:** Noviembre 14, 2025  
**Estado:** ✅ Implementado en Pedidos  
**Autor:** Sistema de IA  
**Para:** Replicar en otros módulos (Rutas, Clientes, etc.)

---

## 📖 Resumen Ejecutivo

Esta guía describe cómo implementar actualizaciones en tiempo real (Realtime) de Supabase en cualquier módulo de la aplicación 3t. El proceso está probado y funcionando en el módulo de **Pedidos**.

**Tiempo estimado:** 15-20 minutos por módulo  
**Nivel de dificultad:** Medio  
**Prerequisitos:** Conocimiento básico de React Hooks

---

## 🎯 Pasos de Implementación

### ✅ Paso 1: Verificar Infraestructura (Ya configurada)

La infraestructura de Realtime **ya está operativa** para todo el proyecto:

```bash
# Verificar que la tabla esté publicada (ejemplo con rutas)
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = '3t_routes';  # Cambiar según tabla

# Si NO está publicada, agregar:
ALTER PUBLICATION supabase_realtime ADD TABLE "3t_routes";
```

**Servicios operativos:**
- ✅ Contenedor Realtime: `realtime-dev.supabase-realtime`
- ✅ WebSocket: Kong configurado (`wss://api.loopia.cl/realtime/v1/websocket`)
- ✅ CORS: Habilitado para `https://3t.loopia.cl`
- ✅ JWT: Válido con campo `exp`

---

### ⚙️ Paso 2: Crear Hook Personalizado

Crea un archivo en `/hooks/use-[modulo]-realtime.ts` basado en esta plantilla:

```typescript
// /hooks/use-rutas-realtime.ts
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRutasRealtimeProps {
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

interface UseRutasRealtimeReturn {
  isConnected: boolean
}

export function useRutasRealtime({
  onInsert,
  onUpdate,
  onDelete
}: UseRutasRealtimeProps): UseRutasRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false)
  
  // useRef para evitar re-suscripciones (CRÍTICO)
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)
  
  // Actualizar refs cuando cambien los callbacks
  useEffect(() => {
    onInsertRef.current = onInsert
    onUpdateRef.current = onUpdate
    onDeleteRef.current = onDelete
  }, [onInsert, onUpdate, onDelete])
  
  useEffect(() => {
    let channel: RealtimeChannel | null = null
    
    try {
      console.log('[Realtime Rutas] Iniciando suscripción...')
      
      channel = supabase
        .channel('rutas-changes')  // Cambiar nombre único
        .on(
          'postgres_changes',
          {
            event: '*',  // INSERT, UPDATE, DELETE
            schema: 'public',
            table: '3t_routes'  // Cambiar nombre de tabla
          },
          (payload) => {
            console.log('[Realtime Rutas] Cambio detectado:', payload.eventType)
            
            if (payload.eventType === 'INSERT' && onInsertRef.current) {
              onInsertRef.current(payload.new)
            } else if (payload.eventType === 'UPDATE' && onUpdateRef.current) {
              onUpdateRef.current(payload.new)
            } else if (payload.eventType === 'DELETE' && onDeleteRef.current) {
              onDeleteRef.current(payload.old)
            }
          }
        )
        .subscribe((status, err) => {
          console.log('[Realtime Rutas] Estado:', status)
          
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime Rutas] ✅ Suscrito')
            setIsConnected(true)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('[Realtime Rutas] ❌ Error:', status, err)
            setIsConnected(false)
          }
        })
    } catch (error) {
      console.error('[Realtime Rutas] Error:', error)
      setIsConnected(false)
    }
    
    return () => {
      if (channel) {
        console.log('[Realtime Rutas] Desuscribiendo...')
        channel.unsubscribe()
        setIsConnected(false)
      }
    }
  }, [])  // ⚠️ IMPORTANTE: Array vacío para suscribir solo 1 vez
  
  return { isConnected }
}
```

**Cambios necesarios:**
1. Renombrar hook: `useRutasRealtime`, `useClientesRealtime`, etc.
2. Cambiar `channel('rutas-changes')` a nombre único
3. Cambiar `table: '3t_routes'` a la tabla correspondiente
4. Cambiar prefijo de logs: `[Realtime Rutas]`

---

### 🎨 Paso 3: Integrar en el Componente

En tu archivo `app/[modulo]/page.tsx`:

```typescript
'use client'

import { useRutasRealtime } from '@/hooks/use-rutas-realtime'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

export default function RutasPage() {
  const { toast } = useToast()
  const [rutas, setRutas] = useState<any[]>([])

  // Función para recargar datos (debe existir)
  const loadRutas = async () => {
    // Tu lógica de carga actual
  }

  // Integrar hook Realtime
  const { isConnected: realtimeConnected } = useRutasRealtime({
    onInsert: (newRuta) => {
      console.log('Nueva ruta creada:', newRuta)
      loadRutas()  // Recargar para obtener datos completos con JOINs
      toast({
        title: '🚚 Nueva ruta',
        description: 'Ruta creada por otro usuario',
      })
    },
    onUpdate: (updatedRuta) => {
      console.log('Ruta actualizada:', updatedRuta)
      loadRutas()
      toast({
        title: '✏️ Ruta actualizada',
        description: `Cambios en ruta ${updatedRuta.route_id || 'sin ID'}`,
      })
    },
    onDelete: (deletedRuta) => {
      console.log('Ruta eliminada:', deletedRuta)
      // Opción 1: Remover del array local (más rápido)
      setRutas(prev => prev.filter(r => r.route_id !== deletedRuta.route_id))
      
      // Opción 2: Recargar todo (más seguro si hay JOINs complejos)
      // loadRutas()
      
      toast({
        title: '🗑️ Ruta eliminada',
        description: 'Ruta eliminada por otro usuario',
      })
    }
  })

  return (
    <div>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lista de Rutas</CardTitle>
          
          {/* Indicador de conexión */}
          <Badge variant={realtimeConnected ? "default" : "secondary"}>
            {realtimeConnected ? "🟢 En vivo" : "⚪ Sin conexión"}
          </Badge>
        </div>
      </CardHeader>
      
      {/* Tu contenido aquí */}
    </div>
  )
}
```

---

### 🧹 Paso 3.5: Limpiar Código Innecesario ⚠️ IMPORTANTE

Una vez que Realtime está activo, **muchas actualizaciones manuales ya no son necesarias**. Debes limpiar el código para evitar:
- Dobles cargas de datos (manual + Realtime)
- Consumo innecesario de recursos
- Latencia adicional
- Código redundante

#### ❌ Qué ELIMINAR:

**1. Actualizaciones después de operaciones CRUD:**

```typescript
// ❌ ANTES (sin Realtime) - Actualización manual necesaria
const handleDelete = async (id: string) => {
  await supabase.from('3t_routes').delete().eq('route_id', id)
  await loadRutas()  // ← ELIMINAR: Realtime se encarga
  toast({ title: 'Ruta eliminada' })
}

// ✅ DESPUÉS (con Realtime) - Realtime actualiza automáticamente
const handleDelete = async (id: string) => {
  await supabase.from('3t_routes').delete().eq('route_id', id)
  // loadRutas() eliminado - El callback onDelete lo maneja
  toast({ title: 'Ruta eliminada' })
}
```

**2. Actualizaciones en callbacks de success:**

```typescript
// ❌ ANTES (sin Realtime)
const handleCreate = async (data: any) => {
  const { error } = await supabase.from('3t_routes').insert(data)
  if (!error) {
    await loadRutas()  // ← ELIMINAR
    setDialogOpen(false)
  }
}

// ✅ DESPUÉS (con Realtime)
const handleCreate = async (data: any) => {
  const { error } = await supabase.from('3t_routes').insert(data)
  if (!error) {
    // loadRutas() eliminado - onInsert lo maneja
    setDialogOpen(false)
  }
}
```

**3. Polling o setInterval:**

```typescript
// ❌ ANTES (sin Realtime) - Polling cada 5 segundos
useEffect(() => {
  const interval = setInterval(() => {
    loadRutas()  // ← ELIMINAR TODO EL POLLING
  }, 5000)
  
  return () => clearInterval(interval)
}, [])

// ✅ DESPUÉS (con Realtime)
// useEffect eliminado completamente - Realtime es instantáneo
```

**4. Refrescos en focus/visibility:**

```typescript
// ❌ ANTES (sin Realtime)
useEffect(() => {
  const handleFocus = () => loadRutas()  // ← ELIMINAR
  window.addEventListener('focus', handleFocus)
  return () => window.removeEventListener('focus', handleFocus)
}, [])

// ✅ DESPUÉS (con Realtime)
// useEffect eliminado - Realtime mantiene sincronizado siempre
```

#### ✅ Qué MANTENER:

**1. Carga inicial de datos:**

```typescript
// ✅ MANTENER - Necesario para la primera carga
useEffect(() => {
  loadRutas()  // Primera carga al montar componente
}, [])
```

**2. Actualizaciones en callbacks de Realtime:**

```typescript
// ✅ MANTENER - Realtime llama a loadRutas() para datos complejos
const { isConnected } = useRutasRealtime({
  onInsert: () => loadRutas(),  // OK: Para obtener datos con JOINs
  onUpdate: () => loadRutas(),  // OK: Datos relacionados pueden haber cambiado
})
```

**3. Búsquedas y filtros:**

```typescript
// ✅ MANTENER - Filtros locales del usuario
useEffect(() => {
  loadRutas()  // OK: Usuario cambió filtros manualmente
}, [searchTerm, selectedStatus])
```

#### 📊 Ejemplo Real: Pedidos (Antes vs Después)

**❌ ANTES (4 llamadas innecesarias a loadOrders):**

```typescript
// app/pedidos/page.tsx - CÓDIGO VIEJO
const handleCreateOrder = async (data: any) => {
  const { error } = await supabase.from('3t_orders').insert(data)
  if (!error) {
    await loadOrders()  // ← Innecesario con Realtime
    setDialogOpen(false)
  }
}

const handleUpdateOrder = async (id: string, data: any) => {
  const { error } = await supabase.from('3t_orders').update(data).eq('order_id', id)
  if (!error) {
    await loadOrders()  // ← Innecesario con Realtime
    setDialogOpen(false)
  }
}

const handleDeleteOrder = async (id: string) => {
  const { error } = await supabase.from('3t_orders').delete().eq('order_id', id)
  if (!error) {
    await loadOrders()  // ← Innecesario con Realtime
  }
}

const handleStatusChange = async (id: string, status: string) => {
  const { error } = await supabase.from('3t_orders').update({ status }).eq('order_id', id)
  if (!error) {
    await loadOrders()  // ← Innecesario con Realtime
  }
}
```

**✅ DESPUÉS (4 llamadas eliminadas):**

```typescript
// app/pedidos/page.tsx - CÓDIGO LIMPIO
const handleCreateOrder = async (data: any) => {
  const { error } = await supabase.from('3t_orders').insert(data)
  if (!error) {
    // loadOrders() eliminado - onInsert lo maneja automáticamente
    setDialogOpen(false)
  }
}

const handleUpdateOrder = async (id: string, data: any) => {
  const { error } = await supabase.from('3t_orders').update(data).eq('order_id', id)
  if (!error) {
    // loadOrders() eliminado - onUpdate lo maneja
    setDialogOpen(false)
  }
}

const handleDeleteOrder = async (id: string) => {
  const { error } = await supabase.from('3t_orders').delete().eq('order_id', id)
  // loadOrders() eliminado - onDelete lo maneja
}

const handleStatusChange = async (id: string, status: string) => {
  const { error } = await supabase.from('3t_orders').update({ status }).eq('order_id', id)
  // loadOrders() eliminado - onUpdate lo maneja
}
```

**Resultado:**
- ✅ 4 llamadas innecesarias eliminadas
- ✅ Código más limpio y legible
- ✅ Sin dobles actualizaciones
- ✅ Mejor rendimiento

#### 🎯 Regla General:

```
Si la operación dispara un evento de Realtime (INSERT/UPDATE/DELETE),
NO necesitas actualizar manualmente los datos.

Realtime lo hará automáticamente en < 2 segundos.
```

#### ⚠️ Excepción: Datos Complejos con JOINs

Si tu query tiene JOINs complejos o campos calculados, **es mejor recargar**:

```typescript
// Query simple - Puedes actualizar local
onDelete: (deleted) => {
  setRutas(prev => prev.filter(r => r.id !== deleted.id))
}

// Query compleja con JOINs - Mejor recargar todo
onUpdate: () => {
  loadRutas()  // Recarga para obtener datos relacionados actualizados
}
```

---

### 🔧 Paso 4: Probar Funcionamiento

**Prueba en 2 pestañas del navegador:**

1. **Pestaña 1**: Abrir módulo (ej: `/rutas`)
2. **Pestaña 2**: Abrir mismo módulo
3. **Verificar en consola**:
   ```
   [Realtime Rutas] Iniciando suscripción...
   [Realtime Rutas] Estado: SUBSCRIBED
   [Realtime Rutas] ✅ Suscrito
   ```
4. **Crear nuevo registro** en Pestaña 1
5. **Verificar** que aparece automáticamente en Pestaña 2 (< 2 seg)
6. **Ver notificación toast** en Pestaña 2

**Troubleshooting si no funciona:**
```bash
# Ver logs de Realtime
docker logs realtime-dev.supabase-realtime --tail 50

# Ver logs de Kong
docker logs supabase-kong --tail 50 | grep realtime

# Verificar que la tabla esté publicada
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = '3t_routes';
```

---

## 🚨 Errores Comunes

### ❌ Bucle infinito (SUBSCRIBED → CLOSED → SUBSCRIBED)

**Causa:** `useEffect` tiene callbacks como dependencias

```typescript
// ❌ INCORRECTO
useEffect(() => {
  // suscripción...
}, [onInsert, onUpdate, onDelete])  // Causa re-suscripciones

// ✅ CORRECTO
const onInsertRef = useRef(onInsert)
// ... más refs ...

useEffect(() => {
  // suscripción usando refs...
}, [])  // Sin dependencias
```

### ❌ Error: "relation not found"

**Causa:** Tabla no publicada en Realtime

**Solución:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "3t_routes";
```

### ❌ WebSocket 403 Forbidden

**Causa:** JWT inválido o sin campo `exp`

**Solución:**
```bash
# Verificar JWT
cat /opt/cane/3t/.env | grep ANON_KEY

# Debe contener campo exp (expiration)
# Si no, regenerar JWT en supabase-project-1/.env
```

---

## 📊 Tablas Disponibles para Realtime

**Tablas principales del proyecto 3t:**

| Tabla | Módulo | Prioridad | Estado |
|-------|--------|-----------|--------|
| `3t_orders` | Pedidos | Alta | ✅ Implementado |
| `3t_routes` | Rutas | Alta | ⏳ Pendiente |
| `3t_customers` | Clientes | Media | ⏳ Pendiente |
| `3t_products` | Productos | Baja | ⏳ Pendiente |
| `3t_invoices` | Facturas | Media | ⏳ Pendiente |
| `3t_purchases` | Compras | Baja | ⏳ Pendiente |

**Agregar tabla a Realtime:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "3t_[tabla]";
```

**Verificar tabla publicada:**
```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

---

## 📋 Checklist de Implementación

### ✅ Antes de Empezar
- [ ] Verificar que la infraestructura Realtime está operativa
- [ ] Identificar tabla a escuchar (`3t_routes`, `3t_customers`, etc.)
- [ ] Confirmar que la tabla tiene RLS (Row Level Security) configurado

### ✅ Durante Implementación
- [ ] Crear hook en `/hooks/use-[modulo]-realtime.ts`
- [ ] Usar `useRef` para callbacks (evitar bucle infinito)
- [ ] Integrar hook en componente de página
- [ ] Agregar indicador visual (Badge de conexión)
- [ ] Configurar notificaciones toast
- [ ] Publicar tabla en Realtime (SQL)
- [ ] **Limpiar código innecesario** (eliminar actualizaciones manuales)

### ✅ Pruebas
- [ ] Abrir en 2 pestañas
- [ ] Verificar logs en consola (`✅ Suscrito`)
- [ ] Crear registro en Pestaña 1
- [ ] Confirmar aparición en Pestaña 2 (< 2 seg)
- [ ] Verificar notificación toast
- [ ] Probar UPDATE y DELETE

### ✅ Documentación
- [ ] Actualizar `docs/CHANGELOG.md` con nueva entrada
- [ ] Actualizar `docs/modules/[MODULO].md` con sección Realtime
- [ ] Marcar tabla como implementada en esta guía

---

## 🔗 Referencias

**Archivos de ejemplo (Pedidos):**
- `/opt/cane/3t/hooks/use-pedidos-realtime.ts` - Hook personalizado
- `/opt/cane/3t/app/pedidos/page.tsx` - Integración del hook

**Documentación:**
- `docs/CHANGELOG.md` - Historial de implementación
- `docs/modules/PEDIDOS.md` - Documentación completa
- `docs/troubleshooting/WEBSOCKET-REALTIME-DESHABILITADO.md` - Solución de problemas históricos

**Supabase Realtime:**
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)

---

## 💡 Tips y Mejores Prácticas

### 1. **Usar `useRef` para callbacks**
Evita re-suscripciones innecesarias que causan bucle infinito.

### 2. **Array vacío en `useEffect`**
```typescript
useEffect(() => {
  // suscripción...
}, [])  // ← Sin dependencias
```

### 3. **Limpiar actualizaciones innecesarias** ⚠️
Una vez que Realtime está activo:
- **ELIMINAR** llamadas a `loadData()` después de INSERT/UPDATE/DELETE
- **ELIMINAR** polling/setInterval innecesarios
- **MANTENER** carga inicial y filtros del usuario
- Ver Paso 3.5 para detalles completos

### 4. **Recargar datos vs actualizar local**
- **Recargar** (`loadOrders()`): Mejor para datos con JOINs complejos
- **Actualizar local** (`setState()`): Más rápido para eliminaciones simples

### 5. **Logging detallado**
Mantén logs para debugging futuro:
```typescript
console.log('[Realtime Rutas] Iniciando suscripción...')
console.log('[Realtime Rutas] ✅ Suscrito')
console.log('[Realtime Rutas] Cambio detectado:', payload)
```

### 6. **Indicador visual obligatorio**
Siempre mostrar estado de conexión al usuario:
```tsx
<Badge variant={realtimeConnected ? "default" : "secondary"}>
  {realtimeConnected ? "🟢 En vivo" : "⚪ Sin conexión"}
</Badge>
```

### 7. **RLS (Row Level Security)**
Realtime respeta las políticas RLS. Los usuarios solo recibirán cambios de datos que tienen permiso para ver.

---

## 🎯 Próximos Módulos Sugeridos

### 1️⃣ Rutas (Alta Prioridad)
**Beneficio:** Conductores ven pedidos asignados en tiempo real  
**Tabla:** `3t_routes`  
**Complejidad:** Baja (similar a Pedidos)

### 2️⃣ Clientes (Prioridad Media)
**Beneficio:** Cambios de direcciones/contactos sincronizados  
**Tabla:** `3t_customers`, `3t_addresses`  
**Complejidad:** Media (2 tablas relacionadas)

### 3️⃣ Facturas (Prioridad Media)
**Beneficio:** Equipo de finanzas ve pagos en vivo  
**Tabla:** `3t_invoices`  
**Complejidad:** Baja

---

## 📝 Plantilla de Commits

```bash
# Al implementar Realtime en nuevo módulo
git add hooks/use-rutas-realtime.ts app/rutas/page.tsx
git commit -m "feat(rutas): Implementar Supabase Realtime

- Crear hook useRutasRealtime con useRef pattern
- Integrar en página de rutas con toast notifications
- Agregar indicador visual de conexión
- Publicar tabla 3t_routes en supabase_realtime

Refs: #realtime"
```

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Guía de Implementación: Supabase Realtime v1.0**  
**Última actualización:** Noviembre 14, 2025

---

## 📞 Soporte

**Si encuentras problemas:**
1. Revisar logs de Realtime: `docker logs realtime-dev.supabase-realtime`
2. Verificar tabla publicada: `SELECT * FROM pg_publication_tables`
3. Consultar `docs/troubleshooting/WEBSOCKET-REALTIME-DESHABILITADO.md`
4. Verificar que JWT tenga campo `exp`

**Archivos críticos:**
- `/opt/cane/supabase-project-1/.env` - JWT y configuración de Supabase
- `/opt/cane/3t/.env` - ANON_KEY del frontend
- `/opt/cane/supabase-project-1/volumes/api/kong.yml` - Configuración WebSocket

---

✅ **Guía lista para usar. Copia y pega los snippets según necesites.**

