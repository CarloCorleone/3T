# 👤 Módulo: Usuarios

**Ruta:** `/usuarios`  
**Archivo:** `/app/usuarios/page.tsx`  
**Tipo:** Página protegida (solo admin) con gestión completa de usuarios y permisos  
**Estado:** ✅ Completamente Funcional

---

## 📖 Descripción General

El módulo **Usuarios** es el centro de administración de usuarios y permisos del sistema. Permite a los administradores gestionar usuarios con **funcionalidad completa CRUD** (Crear, Leer, Actualizar, Eliminar) y **sistema de permisos granulares** de 36 permisos agrupados por módulo.

### Propósito
- Gestionar información completa de usuarios (admin, operador, repartidor)
- Administrar permisos personalizados por usuario
- Resetear contraseñas de manera segura
- Activar/desactivar cuentas de usuario
- Auditar cambios en usuarios y permisos

### Audiencia
- **Solo Administradores**: Este módulo requiere rol `admin`

---

## ✨ Funcionalidades Principales

### 1. Gestión de Usuarios (CRUD Completo)

#### Crear Usuario
**Componente:** `CreateUserDialog`

- Modal con formulario completo
- **Campos:**
  - Nombre completo (texto, requerido)
  - Email (email, único, requerido)
  - Contraseña temporal (mínimo 6 caracteres, requerido)
  - Rol (select: admin/operador/repartidor)
  - Estado activo (switch, default: activo)
- **Proceso:**
  1. Crea usuario en `auth.users` (Supabase Auth)
  2. Crea perfil en `3t_users` con mismo ID
  3. Registra acción en auditoría
- **Validaciones:**
  - Email único
  - Contraseña mínimo 6 caracteres
  - Nombre no vacío

#### Listar Usuarios
**Componente:** `UsersTable`

- **Tabla responsive con:**
  - Avatar con iniciales del usuario
  - Nombre y cantidad de inicios de sesión
  - Email
  - Rol con badge de color (admin=rojo, operador=azul, repartidor=verde)
  - Estado activo/inactivo (switch)
  - Último acceso (fecha formateada)
  - Menú de acciones (⋮)

- **Filtros disponibles:**
  - 🔍 Búsqueda por nombre o email (tiempo real)
  - 📋 Filtro por rol (todos/admin/operador/repartidor)
  - ✓ Filtro por estado (todos/activos/inactivos)

- **Contador dinámico:**
  - Muestra cantidad de usuarios filtrados
  - Indica si hay filtros aplicados

#### Editar Usuario ⭐ **CON PESTAÑAS**
**Componente:** `EditUserDialog` (Octubre 20, 2025)

Modal completo con sistema de pestañas que integra **edición general** y **gestión de permisos** en una sola interfaz.

##### 📑 Pestaña 1: General

**Campos editables:**
- **Nombre completo** (Input, requerido)
- **Email** (Input, readonly - no se puede cambiar)
- **Rol** (Select: admin/operador/repartidor)
- **Estado activo** (Switch: activo/inactivo)

**Sección de Contraseña:**
- Checkbox: "Resetear contraseña"
- Al marcar el checkbox:
  - Aparece campo "Nueva Contraseña"
  - Mínimo 6 caracteres
  - Nota: "El usuario deberá cambiar esta contraseña al iniciar sesión"
- Usa Supabase Admin API para resetear

**Validaciones de Seguridad:**
- ❌ No permite editar el propio rol de admin a inferior
- ❌ No permite desactivar la propia cuenta
- ✓ Valida nombre requerido
- ✓ Valida contraseña mínimo 6 caracteres

##### 📑 Pestaña 2: Permisos

**Visualización:**
- Badge en tab muestra cantidad de cambios pendientes (ej: "Permisos (3)")
- Permisos agrupados por módulo (clientes, productos, pedidos, etc.)
- Cada módulo muestra cantidad de permisos
- Scroll personalizado para contenido largo

**Gestión de Permisos:**
- ✓ Checkboxes para cada permiso
- **Badges indicadores:**
  - 🔹 "Desde rol" - Permiso heredado del rol
  - 🔸 "Modificado" - Permiso con cambios pendientes
- **3 tipos de acciones:**
  1. **Otorgar** - Agregar permiso adicional (no del rol)
  2. **Revocar** - Quitar permiso heredado del rol
  3. **Remover** - Eliminar override (vuelve al estado del rol)

**Permisos por Módulo:**
- Clientes: ver, crear, editar, eliminar
- Productos: ver, editar, eliminar
- Pedidos: ver, crear, editar, cambiar_estado, eliminar
- Proveedores: ver, crear, editar, eliminar
- Compras: ver, crear, editar, eliminar
- Rutas: ver, optimizar
- Mapa: ver
- Dashboard: ver, ver_financiero
- Presupuestos: ver, crear, editar, eliminar
- Reportes: ver, exportar
- Usuarios: ver, crear, editar, eliminar, gestionar_permisos

**Nota:** Si el usuario es admin, todos los permisos están deshabilitados (tiene acceso total automático).

##### 💾 Proceso de Guardado

Al hacer clic en "Guardar Cambios":

1. **Actualizar información general:**
   ```sql
   UPDATE 3t_users 
   SET nombre = ?, rol = ?, role_id = ?, activo = ?
   WHERE id = ?
   ```

2. **Resetear contraseña** (si checkbox marcado):
   ```typescript
   await supabase.auth.admin.updateUserById(userId, {
     password: newPassword
   })
   ```

3. **Aplicar cambios de permisos:**
   - Otorgar permisos: `grantUserPermission(userId, permissionId, currentUserId)`
   - Revocar permisos: `revokeUserPermission(userId, permissionId, currentUserId)`
   - Remover overrides: `removeUserPermission(userId, permissionId)`

4. **Registrar en auditoría:**
   ```typescript
   await logAudit(
     currentUserId,
     'user.updated',
     'user',
     userId,
     oldValues,  // Estado anterior
     newValues   // Estado nuevo
   )
   ```

#### Activar/Desactivar Usuario

- **Switch en la tabla** para cambio rápido
- **Sin confirmación** (cambio instantáneo)
- **Proceso:**
  1. Actualiza campo `activo` en `3t_users`
  2. Registra en auditoría con `user.activated` o `user.deactivated`
  3. Toast de confirmación
- **Validación:** No permite desactivar la propia cuenta

#### Eliminar Usuario

- **Modal de confirmación con alerta**
- **Advertencia:** "Esta acción no se puede deshacer"
- **Muestra:** Nombre del usuario a eliminar
- **Proceso:**
  1. Elimina de `3t_users` (CASCADE elimina de auth.users)
  2. Registra en auditoría con `user.deleted`
  3. Toast de confirmación
- **Validación:** No permite eliminar la propia cuenta

#### Ver Historial de Actividad ⭐ **NUEVO** (Octubre 21, 2025)
**Componente:** `ActivityLogDialog`

- **Ubicación:** Botón "📊 Ver Historial" en tabla de usuarios
- **Funcionalidad:**
  - Modal con timeline de todas las acciones del usuario
  - Paginación de 50 registros por página
  - Timestamps relativos ("hace 2 horas", "ayer")
  - Iconos por tipo de acción (🛒 pedido, 👤 cliente, etc.)
- **Acciones mostradas:**
  - Pedidos: crear, editar, eliminar, cambiar estado
  - Clientes: crear, editar, eliminar
  - Productos: crear, editar, eliminar
  - Proveedores: crear, editar, eliminar
  - Compras: crear, editar, eliminar
  - Usuarios: crear, editar, eliminar, activar/desactivar
  - Permisos: otorgar, revocar
- **Ejemplo de mensajes:**
  - `🛒 creó el pedido ORD-12345 para Alejandra Pérez`
  - `✏️ editó el producto "Botellón 20L"`
  - `🏢 eliminó el proveedor "Distribuidora XYZ"`
- **Rendimiento:**
  - Carga rápida con queries optimizados
  - Scroll suave con altura fija del modal

### 2. Sistema de Permisos Granulares

#### Arquitectura de Permisos

**Tablas involucradas:**
- `3t_roles` - Roles del sistema (admin, operador, repartidor)
- `3t_permissions` - Catálogo de 36 permisos
- `3t_role_permissions` - Permisos asignados a cada rol
- `3t_user_permissions` - Permisos personalizados por usuario (overrides)

**Función SQL centralizada:**
```sql
3t_has_permission(user_id, permission_id)
```
- Verifica si usuario tiene permiso
- Admins tienen acceso total automáticamente
- Calcula permisos efectivos: (rol + otorgados) - revocados

#### Permisos Efectivos

**Cálculo:**
```
Permisos Efectivos = (Permisos del Rol + Permisos Otorgados) - Permisos Revocados
```

**Ejemplo:**
- Rol operador tiene: `clientes.ver`, `clientes.crear`, `clientes.editar`
- Se otorga: `clientes.eliminar`
- Se revoca: `clientes.editar`
- **Resultado:** `clientes.ver`, `clientes.crear`, `clientes.eliminar`

### 3. Auditoría de Cambios

Todos los cambios en usuarios se registran en `3t_audit_log`:

**Campos capturados:**
- `user_id` - Quien realizó la acción
- `action` - Tipo de acción (user.created, user.updated, user.deleted, etc.)
- `entity_type` - Tipo de entidad ('user')
- `entity_id` - ID del usuario afectado
- `old_value` - Estado anterior (JSON)
- `new_value` - Estado nuevo (JSON)
- `created_at` - Timestamp

**Acciones auditadas:**
- `user.created` - Usuario creado
- `user.updated` - Usuario actualizado (con detalles de cambios)
- `user.activated` - Usuario activado
- `user.deactivated` - Usuario desactivado
- `user.deleted` - Usuario eliminado
- `permission.granted` - Permiso otorgado
- `permission.revoked` - Permiso revocado
- `permission.removed` - Override eliminado

---

## 🎨 Interfaz de Usuario

### Diseño

**Principios:**
- ✅ Sin colores hardcodeados (usa variables CSS del tema)
- ✅ Soporte completo para modo oscuro y claro
- ✅ Responsive (móvil, tablet, desktop)
- ✅ Accesible (ARIA labels, keyboard navigation)

**Componentes shadcn/ui utilizados:**
- `Card` - Contenedor principal
- `Table` - Lista de usuarios
- `Dialog` - Modales de creación/edición
- `Tabs` - Sistema de pestañas en edición
- `Input`, `Select`, `Switch`, `Checkbox` - Controles de formulario
- `Badge` - Indicadores de estado
- `Button` - Acciones
- `Avatar` - Iniciales de usuario
- `DropdownMenu` - Menú de acciones
- `AlertDialog` - Confirmación de eliminación

### Colores por Rol

**Badges de rol:**
- 🔴 Admin: `bg-red-500 hover:bg-red-600 text-white`
- 🔵 Operador: `bg-blue-500 hover:bg-blue-600 text-white`
- 🟢 Repartidor: `bg-green-500 hover:bg-green-600 text-white`

### Estados Visuales

**Usuario activo:**
- Switch: ON (azul)
- Texto: "Activo"

**Usuario inactivo:**
- Switch: OFF (gris)
- Texto: "Inactivo"

**Último acceso:**
- Con fecha: Muestra fecha formateada (ej: "15 Oct 2025, 14:30")
- Sin fecha: "Nunca"

---

## 🔒 Seguridad

### Protección de Ruta

**Archivo:** `app/usuarios/page.tsx`

```typescript
// Verifica autenticación
if (!currentUser) {
  router.push('/login')
  return
}

// Solo admins pueden acceder
if (currentUser.rol !== 'admin' && currentUser.role_id !== 'admin') {
  router.push('/')
  return
}
```

También usa `PermissionGuard`:
```tsx
<PermissionGuard permission="usuarios.ver" redirectTo="/">
  <div>Contenido protegido</div>
</PermissionGuard>
```

### Validaciones Críticas

1. **No editar propio rol:**
   ```typescript
   if (currentUser.id === user.id && 
       currentUser.rol === 'admin' && 
       rol !== 'admin') {
     error('No puedes cambiar tu propio rol de administrador')
   }
   ```

2. **No desactivar propia cuenta:**
   ```typescript
   if (currentUser.id === user.id && !activo) {
     error('No puedes desactivar tu propia cuenta')
   }
   ```

3. **No eliminar propia cuenta:**
   ```typescript
   if (currentUser.id === userToDelete.id) {
     error('No puedes eliminar tu propia cuenta')
   }
   ```

### Row Level Security (RLS)

**Políticas activas en `3t_users`:**

1. **Ver propia información:**
   ```sql
   CREATE POLICY "Usuarios pueden ver su propia información" 
   ON 3t_users FOR SELECT 
   USING (auth.uid() = id);
   ```

2. **Admins ven todos:**
   ```sql
   CREATE POLICY "Admins pueden ver todos los usuarios" 
   ON 3t_users FOR SELECT 
   USING (
     EXISTS (
       SELECT 1 FROM 3t_users 
       WHERE id = auth.uid() AND rol = 'admin'
     )
   );
   ```

3. **Acceso completo autenticados:**
   ```sql
   CREATE POLICY "Acceso completo para usuarios autenticados" 
   ON 3t_users FOR ALL 
   USING (auth.uid() IS NOT NULL);
   ```

---

## 🗄️ Estructura de Base de Datos

### Tabla: `3t_users`

```sql
CREATE TABLE 3t_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT CHECK (rol IN ('admin', 'operador', 'repartidor')) DEFAULT 'operador',
  role_id TEXT,
  activo BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Índices:**
- `idx_3t_users_email` - Búsqueda por email
- `idx_3t_users_rol` - Filtro por rol
- `idx_3t_users_activo` - Filtro por estado

### Tabla: `3t_permissions`

```sql
CREATE TABLE 3t_permissions (
  permission_id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**36 permisos distribuidos en 11 módulos**

### Tabla: `3t_user_permissions`

```sql
CREATE TABLE 3t_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES 3t_users(id) ON DELETE CASCADE,
  permission_id TEXT REFERENCES 3t_permissions(permission_id),
  granted BOOLEAN NOT NULL,
  created_by UUID REFERENCES 3t_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);
```

**Campos:**
- `granted = true` - Permiso otorgado (adicional al rol)
- `granted = false` - Permiso revocado (del rol)

### Tabla: `3t_audit_log`

```sql
CREATE TABLE 3t_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES 3t_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🛠️ Componentes Técnicos

### Estructura de Archivos

```
/app/usuarios/
  └── page.tsx                    # Página principal (lógica y estado)

/components/usuarios/
  ├── users-table.tsx             # Tabla de usuarios
  ├── create-user-dialog.tsx      # Modal crear usuario
  ├── edit-user-dialog.tsx        # Modal editar (con pestañas)
  └── permissions-dialog.tsx      # (Deprecated - ahora en edit-user-dialog)

/lib/
  ├── permissions.ts              # Funciones de permisos
  ├── auth-store.ts               # Store de autenticación (Zustand)
  └── supabase.ts                 # Cliente Supabase y tipos
```

### Funciones Principales

**Archivo:** `lib/permissions.ts`

```typescript
// Obtener permisos de un usuario
getUserPermissions(userId: string): Promise<UserPermissions>

// Verificar un permiso específico
hasPermission(userId: string, permission: string): Promise<boolean>

// Hook React para verificar permisos
usePermissions(): { can, canAny, canAll, loading, permissions }

// Obtener todos los permisos (agrupados por módulo)
getAllPermissions(): Promise<Record<string, Permission[]>>

// Otorgar permiso personalizado
grantUserPermission(userId, permissionId, createdBy): Promise<{success, error?}>

// Revocar permiso
revokeUserPermission(userId, permissionId, createdBy): Promise<{success, error?}>

// Eliminar override (volver al estado del rol)
removeUserPermission(userId, permissionId): Promise<{success, error?}>

// Registrar en auditoría
logAudit(userId, action, entityType, entityId, oldValue?, newValue?): Promise<void>

// Obtener historial de auditoría
getUserAuditLog(userId, limit?): Promise<AuditLog[]>
```

### Estado de la Página

**Archivo:** `app/usuarios/page.tsx`

```typescript
const [users, setUsers] = useState<Usuario[]>([])
const [filteredUsers, setFilteredUsers] = useState<Usuario[]>([])
const [loading, setLoading] = useState(true)

// Filtros
const [searchQuery, setSearchQuery] = useState('')
const [roleFilter, setRoleFilter] = useState<string>('all')
const [statusFilter, setStatusFilter] = useState<string>('all')

// Modales
const [createDialogOpen, setCreateDialogOpen] = useState(false)
const [editDialogOpen, setEditDialogOpen] = useState(false)
const [userToEdit, setUserToEdit] = useState<Usuario | null>(null)
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [userToDelete, setUserToDelete] = useState<Usuario | null>(null)
```

---

## 📊 Flujos de Trabajo

### Flujo: Crear Usuario

```
1. Admin hace clic en "Nuevo Usuario"
   ↓
2. Se abre CreateUserDialog
   ↓
3. Admin completa formulario:
   - Nombre, Email, Contraseña, Rol, Estado
   ↓
4. Validaciones en frontend (Zod)
   ↓
5. Submit → Crear en auth.users (Supabase Auth)
   ↓
6. Crear perfil en 3t_users con mismo ID
   ↓
7. Registrar en auditoría (user.created)
   ↓
8. Toast de confirmación
   ↓
9. Recargar lista de usuarios
```

### Flujo: Editar Usuario

```
1. Admin hace clic en "Editar" (menú ⋮)
   ↓
2. Se abre EditUserDialog con datos cargados
   ↓
3. Admin navega por pestañas:
   
   Pestaña General:
   - Modifica nombre, rol, estado
   - Opcionalmente marca "Resetear contraseña"
   
   Pestaña Permisos:
   - Marca/desmarca permisos por módulo
   - Ve badges "Desde rol" y "Modificado"
   - Badge en tab muestra cantidad de cambios
   ↓
4. Admin hace clic en "Guardar Cambios"
   ↓
5. Validaciones de seguridad (propio rol, propia cuenta)
   ↓
6. Actualizar información general en 3t_users
   ↓
7. Resetear contraseña (si checkbox marcado)
   ↓
8. Aplicar cambios de permisos (grant/revoke/remove)
   ↓
9. Registrar en auditoría (user.updated)
   ↓
10. Toast de confirmación
   ↓
11. Recargar lista de usuarios
```

### Flujo: Eliminar Usuario

```
1. Admin hace clic en "Eliminar" (menú ⋮)
   ↓
2. Se abre AlertDialog de confirmación
   ↓
3. Muestra advertencia: "Esta acción no se puede deshacer"
   ↓
4. Admin confirma eliminación
   ↓
5. Validación: No permitir eliminar propia cuenta
   ↓
6. DELETE FROM 3t_users WHERE id = ?
   (CASCADE elimina de auth.users automáticamente)
   ↓
7. Registrar en auditoría (user.deleted)
   ↓
8. Toast de confirmación
   ↓
9. Recargar lista de usuarios
```

---

## 🧪 Testing

### Pruebas Funcionales

**Crear Usuario:**
- [ ] Crear usuario con todos los campos
- [ ] Validar email único
- [ ] Validar contraseña mínimo 6 caracteres
- [ ] Verificar que se crea en auth.users y 3t_users
- [ ] Verificar registro en auditoría

**Editar Usuario - Pestaña General:**
- [ ] Editar nombre y guardar
- [ ] Cambiar rol y verificar actualización
- [ ] Activar/desactivar usuario con switch
- [ ] Resetear contraseña con checkbox
- [ ] Validar que no se puede editar propio rol de admin
- [ ] Validar que no se puede desactivar propia cuenta

**Editar Usuario - Pestaña Permisos:**
- [ ] Ver permisos heredados del rol (badge "Desde rol")
- [ ] Otorgar permiso adicional
- [ ] Revocar permiso del rol
- [ ] Remover override (volver al estado del rol)
- [ ] Verificar badge de cantidad de cambios en tab
- [ ] Verificar que admin no puede modificar permisos

**Activar/Desactivar:**
- [ ] Toggle switch en tabla
- [ ] Verificar actualización inmediata
- [ ] Verificar registro en auditoría
- [ ] Validar que no se puede desactivar propia cuenta

**Eliminar Usuario:**
- [ ] Abrir modal de confirmación
- [ ] Cancelar eliminación
- [ ] Confirmar eliminación
- [ ] Validar que no se puede eliminar propia cuenta
- [ ] Verificar eliminación de auth.users y 3t_users
- [ ] Verificar registro en auditoría

**Filtros:**
- [ ] Búsqueda por nombre (tiempo real)
- [ ] Búsqueda por email (tiempo real)
- [ ] Filtro por rol (all/admin/operador/repartidor)
- [ ] Filtro por estado (all/activo/inactivo)
- [ ] Combinación de filtros

**Permisos:**
- [ ] Solo admin puede acceder a /usuarios
- [ ] Otros roles son redirigidos a /
- [ ] PermissionGuard funciona correctamente

### Pruebas de UI/UX

- [ ] Diseño responsive (móvil, tablet, desktop)
- [ ] Modo oscuro funciona correctamente
- [ ] Modo claro funciona correctamente
- [ ] Sin colores hardcodeados
- [ ] Accesibilidad (keyboard navigation, ARIA labels)
- [ ] Toast notifications aparecen correctamente
- [ ] Loading states funcionan
- [ ] Scroll en contenido largo (pestañas)

---

## 🚀 Mejoras Futuras

### Funcionalidades Planificadas

- [ ] **Historial de Accesos** - Ver logins del usuario con IP y dispositivo
- [x] **Historial de Actividad** - ✅ **IMPLEMENTADO** (Octubre 21, 2025) - Timeline completa de todas las acciones del usuario
- [ ] **Exportar Usuarios** - CSV/Excel con filtros aplicados
- [ ] **Importar Usuarios** - Carga masiva desde CSV
- [ ] **Filtros avanzados en historial** - Por tipo de acción, rango de fechas, módulo
- [ ] **Exportar historial** - CSV/PDF del historial de actividad
- [ ] **Roles Personalizados** - Crear roles más allá de los 3 predefinidos
- [ ] **Permisos Temporales** - Asignar permisos con fecha de expiración
- [ ] **Permisos por Campo** - Restricciones más granulares (ver vs editar campo)
- [ ] **Upload de Avatar** - Subir foto de perfil
- [ ] **2FA (Two-Factor Auth)** - Autenticación de dos factores
- [ ] **Sesiones Activas** - Ver y cerrar sesiones remotamente
- [ ] **Notificaciones por Email** - Alertas de cambios en cuenta

### Optimizaciones Técnicas

- [ ] Cachear permisos en localStorage (con revalidación)
- [ ] Validación con Zod en todos los formularios
- [ ] Skeleton loaders en lugar de spinners
- [ ] Confirmación al cerrar con cambios sin guardar
- [ ] Búsqueda server-side con paginación (si > 1000 usuarios)
- [ ] Exportar permisos de usuario a JSON

---

## 📚 Referencias

### Documentación Relacionada

- [SISTEMA-PERMISOS-IMPLEMENTADO.md](/opt/cane/3t/SISTEMA-PERMISOS-IMPLEMENTADO.md) - Documentación completa del sistema de permisos
- [CHANGELOG.md](/opt/cane/3t/docs/CHANGELOG.md) - Historial de cambios (Octubre 20, 2025)
- [GUIA-MANEJO-DOCUMENTACION-IA.md](/opt/cane/3t/docs/GUIA-MANEJO-DOCUMENTACION-IA.md) - Guía para IA

### Archivos Clave

```
/app/usuarios/page.tsx                     # Página principal
/components/usuarios/edit-user-dialog.tsx  # Modal de edición con pestañas
/lib/permissions.ts                        # Sistema de permisos
/lib/auth-store.ts                         # Store de autenticación
```

### Comandos Útiles

```bash
# Ver estructura de permisos
SELECT * FROM 3t_permissions ORDER BY module, action;

# Ver permisos de un usuario
SELECT * FROM 3t_user_permissions WHERE user_id = '<uuid>';

# Ver auditoría de usuario
SELECT * FROM 3t_audit_log WHERE user_id = '<uuid>' ORDER BY created_at DESC;

# Contar usuarios por rol
SELECT rol, COUNT(*) FROM 3t_users GROUP BY rol;

# Usuarios activos
SELECT COUNT(*) FROM 3t_users WHERE activo = true;
```

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Módulo: Usuarios**  
**Última actualización:** Octubre 20, 2025  
**Versión:** 2.0 - Con sistema de pestañas y permisos integrados

