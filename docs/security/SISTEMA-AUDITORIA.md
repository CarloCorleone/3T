# 📊 Sistema de Auditoría Completo

**Fecha:** Octubre 21, 2025  
**Estado:** ✅ Implementado  
**Módulo:** Transversal (Todos los módulos)

---

## 📖 Resumen Ejecutivo

Sistema completo de auditoría ("Activity Log") que registra automáticamente todas las acciones de usuarios en tiempo real a través de todos los módulos de la aplicación. Los administradores pueden ver el historial de actividad de cualquier usuario, mostrando qué hizo, cuándo y qué datos cambió, en mensajes legibles en español.

**Beneficios:**
- ✅ Trazabilidad completa de todas las acciones
- ✅ Auditoría de seguridad y compliance
- ✅ Troubleshooting de problemas
- ✅ Análisis de comportamiento de usuarios
- ✅ Responsabilidad transparente

---

## 🎯 Problema/Objetivo

### Problema
- No había forma de saber quién hizo qué en el sistema
- Imposible rastrear cambios o eliminar acciones
- Falta de accountability
- Dificultad para troubleshooting
- Sin cumplimiento de auditoría

### Objetivo
Implementar un sistema de auditoría completo que:
1. Registre todas las acciones CRUD en todos los módulos
2. Muestre mensajes legibles en español
3. Permita ver historial por usuario
4. Sea seguro y cumpla con RLS
5. No impacte el rendimiento

---

## 🔧 Solución Implementada

### Arquitectura

```
┌─────────────────────────────────────┐
│  Usuario realiza acción             │
│  (crear pedido, editar cliente...)  │
└──────────────┬──────────────────────┘
               │
               ├─→ Ejecuta operación en BD
               │
               └─→ Llama logAudit()
                   │
                   ├─→ Inserta en 3t_audit_log
                   │   (con user_id, action, entity_type, etc.)
                   │
                   └─→ RLS valida que user_id = auth.uid()
                       │
                       └─→ ✅ Registro guardado
```

### Componentes del Sistema

#### 1. Base de Datos

**Tabla:** `3t_audit_log`
```sql
CREATE TABLE 3t_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES 3t_users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Política RLS:**
```sql
-- Permitir inserción a usuarios autenticados (solo sus propios registros)
CREATE POLICY "Allow authenticated users to insert their own audit logs"
ON "3t_audit_log" 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Lectura solo para admins
CREATE POLICY "Admins can read all audit logs"
ON "3t_audit_log"
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM 3t_users
    WHERE id = auth.uid() AND role_id = 'admin'
  )
);
```

#### 2. Backend

**Archivo:** `lib/permissions.ts`

```typescript
// Función para registrar auditoría
export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue?: Record<string, any>,
  newValue?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase // ← Cliente regular (respeta RLS)
      .from('3t_audit_log')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue
      })
    
    if (error) {
      console.error('❌ Error guardando auditoría:', error)
    }
  } catch (error) {
    console.error('❌ Error en logAudit:', error)
  }
}

// Función para obtener historial
export async function getActivityLog(
  userId: string,
  options?: {
    limit?: number
    offset?: number
    startDate?: string
    endDate?: string
  }
): Promise<{ logs: AuditLog[]; hasMore: boolean }> {
  const limit = options?.limit || 50
  const offset = options?.offset || 0

  let query = supabaseAdmin // ← Admin para leer (bypass RLS)
    .from('3t_audit_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit)

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate)
  }
  if (options?.endDate) {
    query = query.lte('created_at', options.endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error obteniendo historial:', error)
    return { logs: [], hasMore: false }
  }

  return {
    logs: data || [],
    hasMore: (data?.length || 0) >= limit
  }
}
```

#### 3. Mensajes Legibles

**Archivo:** `lib/audit-messages.ts`

Mapeo de acciones técnicas a mensajes en español:

```typescript
export const ACTION_MESSAGES = {
  'order.created': (log) => {
    const customer = log.new_value?.customer_name || 'cliente desconocido'
    return `creó el pedido ${log.entity_id} para ${customer}`
  },
  'customer.created': (log) => {
    const name = log.new_value?.name || 'cliente desconocido'
    return `creó el cliente "${name}"`
  },
  'product.updated': (log) => {
    const name = log.new_value?.name || log.old_value?.name || 'producto'
    return `editó el producto "${name}"`
  },
  // ... 30+ acciones más
}

export const ACTION_ICONS = {
  'order.created': '🛒',
  'customer.created': '👤',
  'product.updated': '✏️',
  'supplier.deleted': '🗑️',
  'purchase.created': '🛍️',
  // ... etc
}
```

#### 4. Frontend

**Componente:** `components/activity-log-dialog.tsx`

Modal con timeline de actividades:
- Paginación de 50 registros
- Timestamps relativos (formatDistanceToNow)
- Iconos por tipo de acción
- Scroll optimizado

**Componente:** `components/activity-log-item.tsx`

Renderiza cada entrada:
- Icono con color
- Mensaje legible
- Timestamp relativo
- Detalles opcionales

---

## 📊 Módulos Auditados

| Módulo | Archivo | Acciones Registradas |
|--------|---------|---------------------|
| **Pedidos** | `app/pedidos/page.tsx` | Crear, Editar, Eliminar, Cambiar Estado, Cambiar Pago |
| **Clientes** | `app/clientes/page.tsx` | Crear, Editar, Eliminar |
| **Productos** | `app/productos/page.tsx` | Crear, Editar, Eliminar |
| **Proveedores** | `app/proveedores/page.tsx` | Crear, Editar, Eliminar |
| **Compras** | `app/compras/page.tsx` | Crear, Editar, Eliminar, Cambiar Estado |
| **Usuarios** | `app/usuarios/page.tsx` | Crear, Editar, Eliminar, Activar, Desactivar |
| **Permisos** | `app/usuarios/page.tsx` | Otorgar, Revocar |

### Ejemplo de Implementación (Crear Cliente)

```typescript
const handleCreateCustomer = async () => {
  const { data, error } = await supabase
    .from('3t_customers')
    .insert([{ ...formData, customer_id: crypto.randomUUID() }])
    .select()
  
  if (error) {
    console.error('Error creando cliente:', error)
  } else {
    // ✅ Registrar auditoría
    if (currentUser && data && data[0]) {
      await logAudit(
        currentUser.id,           // Quién
        'customer.created',       // Qué
        'customer',               // Tipo
        data[0].customer_id,      // ID
        undefined,                // Valor anterior (ninguno)
        {                         // Valor nuevo
          name: data[0].name,
          customer_type: data[0].customer_type,
          phone: data[0].phone
        }
      )
    }
  }
}
```

---

## 💬 Ejemplos de Mensajes

### Pedidos
- `🛒 Carlo creó el pedido ORD-12345 para Alejandra Pérez`
- `🔄 Carlo cambió el estado del pedido ORD-12345 a "Despachado"`
- `💰 Carlo cambió el estado de pago del pedido ORD-12345 a "Pagado"`
- `✏️ Carlo editó el pedido ORD-12345`
- `🗑️ Carlo eliminó el pedido ORD-12345`

### Clientes
- `👤 Carlo creó el cliente "Alejandra Pérez"`
- `✏️ Carlo editó el cliente "Juan González"`
- `🗑️ Carlo eliminó el cliente "María López"`

### Productos
- `📦 Carlo creó el producto "Botellón 20L"`
- `✏️ Carlo editó el producto "Bidón 5L"`
- `🗑️ Carlo eliminó el producto "Tapa para botellón"`

### Proveedores
- `🏢 Carlo creó el proveedor "Distribuidora XYZ"`
- `✏️ Carlo editó el proveedor "Aguas del Sur"`
- `🗑️ Carlo eliminó el proveedor "Proveedor ABC"`

### Compras
- `🛍️ Carlo creó la compra abc123 para Distribuidora XYZ`
- `✏️ Carlo editó la compra abc123`
- `🗑️ Carlo eliminó la compra abc123`

### Usuarios
- `👤 Carlo creó el usuario "Alejandra"`
- `✏️ Carlo editó el usuario "Juan"`
- `🗑️ Carlo eliminó el usuario "Pedro"`
- `✅ Carlo activó el usuario "María"`
- `❌ Carlo desactivó el usuario "José"`

### Permisos
- `🔓 Carlo otorgó el permiso "clientes.create"`
- `🔒 Carlo revocó el permiso "pedidos.delete"`

---

## 🔐 Seguridad

### Row Level Security (RLS)

**Inserción:**
```sql
-- Solo usuarios autenticados pueden insertar
-- Solo pueden insertar registros con su propio user_id
WITH CHECK (auth.uid() = user_id)
```

**Lectura:**
```sql
-- Solo admins pueden leer
USING (
  EXISTS (
    SELECT 1 FROM 3t_users
    WHERE id = auth.uid() AND role_id = 'admin'
  )
)
```

### Clientes Supabase

| Operación | Cliente | Razón |
|-----------|---------|-------|
| **Insertar auditoría** | `supabase` | Respeta RLS, valida user_id |
| **Leer auditoría** | `supabaseAdmin` | Bypass RLS para lectura admin |

### Validaciones

```typescript
// ✅ Validar que existe currentUser
if (currentUser) {
  await logAudit(...)
}

// ✅ Manejo de errores sin bloquear operación principal
try {
  await logAudit(...)
} catch (error) {
  console.error('Error en auditoría:', error)
  // No lanzar error - continuar con la operación
}
```

---

## 🧪 Testing y Calidad

### Tests Realizados

1. ✅ **Crear cliente** → Registro en auditoría
2. ✅ **Editar producto** → Registro en auditoría
3. ✅ **Cambiar estado de pedido** → Registro en auditoría
4. ✅ **Eliminar proveedor** → Registro en auditoría
5. ✅ **Ver historial en usuarios** → Muestra todas las acciones
6. ✅ **Paginación** → Funciona correctamente
7. ✅ **Scroll** → Sin overflow, contenedor fijo
8. ✅ **RLS** → Solo admins pueden leer, usuarios autenticados pueden insertar

### Casos Edge Probados

- ✅ Usuario sin sesión → No intenta registrar
- ✅ Error en inserción → No bloquea operación principal
- ✅ Historial vacío → Muestra mensaje apropiado
- ✅ Muchos registros → Paginación funcional
- ✅ Timestamps relativos → Formatos correctos

---

## 📚 Mantenimiento

### Limpieza Automática

**Archivo:** `migrations/cleanup_old_audit_logs.sql`

```sql
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM 3t_audit_log
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar mensualmente (configurar cron job)
SELECT cleanup_old_audit_logs();
```

### Retención de Datos

- **Logs recientes**: 30 días en BD principal
- **Logs antiguos**: Archivar a S3/backup (futuro)
- **Logs críticos**: Retención indefinida (futuro)

---

## 🚀 Próximos Pasos

### Features Planificadas

- [ ] **Filtros avanzados** - Por tipo de acción, módulo, rango de fechas
- [ ] **Búsqueda de texto** - Buscar en mensajes de auditoría
- [ ] **Exportar historial** - CSV/PDF del historial
- [ ] **Dashboard de actividad** - Gráficos de actividad general
- [ ] **Notificaciones** - Alertas de acciones críticas
- [ ] **IP y User-Agent** - Registrar IP y navegador (ya en schema)
- [ ] **Diff visual** - Mostrar cambios old_value → new_value
- [ ] **Scroll infinito** - Cargar más al hacer scroll
- [ ] **Filtro por usuario** - En vista general
- [ ] **Estadísticas** - Acciones más frecuentes, usuarios más activos

### Mejoras Técnicas

- [ ] **Índices de BD** - Optimizar queries de historial
- [ ] **Caché** - Redis para logs recientes
- [ ] **Webhooks** - Notificar sistemas externos
- [ ] **Logs estructurados** - ELK Stack para análisis
- [ ] **Archivado automático** - Mover logs viejos a S3

---

## 🐛 Troubleshooting

### Error: 401 Unauthorized al registrar

**Causa:** `logAudit()` usando `supabaseAdmin` en cliente
**Solución:** Cambiar a cliente `supabase` regular

```typescript
// ❌ MAL
const { error } = await supabaseAdmin.from('3t_audit_log').insert(...)

// ✅ BIEN
const { error } = await supabase.from('3t_audit_log').insert(...)
```

### No aparecen registros en historial

**Verificar:**
1. ✅ Usuario tiene `currentUser` definido
2. ✅ Política RLS creada en Supabase
3. ✅ `logAudit()` se llama después de operación exitosa
4. ✅ Console logs no muestran errores

**Query de verificación:**
```sql
SELECT * FROM 3t_audit_log 
WHERE user_id = '[USER_ID]' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Modal con overflow

**Solución:** Asegurar CSS correcto

```tsx
<DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
  <DialogHeader className="px-6 pt-6">...</DialogHeader>
  <ScrollArea className="flex-1 px-6 overflow-y-auto">
    {/* Contenido */}
  </ScrollArea>
  <DialogFooter className="px-6 pb-6">...</DialogFooter>
</DialogContent>
```

---

## 📄 Archivos del Sistema

### Backend
- `lib/permissions.ts` - `logAudit()` y `getActivityLog()`
- `lib/audit-messages.ts` - Mensajes legibles
- `migrations/cleanup_old_audit_logs.sql` - Limpieza automática

### Frontend
- `components/activity-log-dialog.tsx` - Modal principal
- `components/activity-log-item.tsx` - Item individual

### Módulos Auditados
- `app/pedidos/page.tsx`
- `app/clientes/page.tsx`
- `app/productos/page.tsx`
- `app/proveedores/page.tsx`
- `app/compras/page.tsx`
- `app/usuarios/page.tsx`

---

## 📚 Referencias

- **Documentación completa:** `ACTIVITY-LOG-IMPLEMENTADO.md`
- **Changelog:** `docs/CHANGELOG.md` (Octubre 21, 2025)
- **Módulo Usuarios:** `docs/modules/USUARIOS.md`
- **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Sistema de Auditoría v1.0**  
**Última actualización:** Octubre 21, 2025

