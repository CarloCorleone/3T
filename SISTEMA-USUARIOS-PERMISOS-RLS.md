# 🔐 Sistema de Usuarios, Permisos y Row Level Security (RLS)

## 📋 Índice

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Estructura de Base de Datos](#estructura-de-base-de-datos)
4. [Implementación de RLS](#implementación-de-rls)
5. [Sistema de Permisos](#sistema-de-permisos)
6. [Backend: Middleware de Autenticación](#backend-middleware-de-autenticación)
7. [Frontend: Hooks y Componentes](#frontend-hooks-y-componentes)
8. [Sistema de Auditoría](#sistema-de-auditoría)
9. [Guía de Implementación Paso a Paso](#guía-de-implementación-paso-a-paso)
10. [Testing y Validación](#testing-y-validación)
11. [Troubleshooting](#troubleshooting)

---

## Visión General

Este documento describe la implementación completa de un sistema de autenticación, autorización y auditoría basado en **Supabase Auth** con **Row Level Security (RLS)** y **permisos granulares**.

### Características Principales

- ✅ **Autenticación robusta** con Supabase Auth
- ✅ **Row Level Security (RLS)** a nivel de base de datos
- ✅ **Sistema de roles** (admin, operador, repartidor/usuario)
- ✅ **Permisos granulares** por módulo y acción
- ✅ **Permisos personalizados** por usuario (overrides)
- ✅ **Auditoría completa** de todas las acciones
- ✅ **Protección en frontend y backend**
- ✅ **Imposible bypassear** (protección a nivel de BD)

### Beneficios

| Beneficio | Descripción |
|-----------|-------------|
| **Seguridad a nivel de BD** | RLS filtra automáticamente todas las queries |
| **Sin bypass posible** | Incluso con acceso directo a la BD, RLS protege |
| **Permisos flexibles** | Sistema de roles + overrides personalizados |
| **Auditoría completa** | Registro de todas las acciones de usuarios |
| **Sin cambios en frontend** | RLS filtra automáticamente sin WHERE adicionales |
| **Multi-tenant ready** | Preparado para múltiples organizaciones |

---

## Arquitectura del Sistema

### Flujo de Autenticación y Autorización

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ├─ 1. Login (email/password)
       ↓
┌──────────────────┐
│  Supabase Auth   │
│  (auth.users)    │
└────────┬─────────┘
         │
         ├─ 2. Genera JWT con auth.uid()
         ↓
┌─────────────────────┐
│   Tabla Usuarios    │
│   (perfil custom)   │
└─────────┬───────────┘
          │
          ├─ 3. Verifica rol y permisos
          ↓
    ┌─────────────────┐
    │   Verificar:    │
    ├─────────────────┤
    │ • Usuario activo│
    │ • Rol válido    │
    │ • Permisos      │
    └─────────┬───────┘
              │
              ├─ 4. Consulta a BD
              ↓
       ┌─────────────┐
       │     RLS     │
       │  (filtra)   │
       └──────┬──────┘
              │
              ├─ 5. Retorna solo datos autorizados
              ↓
       ┌──────────────┐
       │   Frontend   │
       │  (UI seguro) │
       └──────────────┘
```

### Capas de Seguridad

1. **Capa de Autenticación**: Supabase Auth (JWT)
2. **Capa de Perfil**: Tabla usuarios con estado activo
3. **Capa de Autorización**: Sistema de roles y permisos
4. **Capa de Base de Datos**: Row Level Security (RLS)
5. **Capa de Auditoría**: Log de todas las acciones

---

## Estructura de Base de Datos

### 1. Tabla: Usuarios

Extiende `auth.users` de Supabase con información adicional.

```sql
CREATE TABLE app_users (
  -- ID referencia a auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Información básica
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  
  -- Control de acceso
  rol TEXT CHECK (rol IN ('admin', 'operador', 'repartidor')) DEFAULT 'operador',
  role_id TEXT REFERENCES app_roles(role_id),
  activo BOOLEAN DEFAULT true,
  
  -- Estadísticas de acceso
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX idx_users_email ON app_users(email);
CREATE INDEX idx_users_rol ON app_users(rol);
CREATE INDEX idx_users_activo ON app_users(activo);

-- Trigger para updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Campos importantes:**
- `id`: UUID que referencia `auth.users(id)` - vincula autenticación con perfil
- `rol`: Rol básico del usuario (para compatibilidad)
- `role_id`: Rol del sistema de permisos (más flexible)
- `activo`: Bandera para desactivar usuarios sin eliminarlos

### 2. Tabla: Roles

Define los roles disponibles en el sistema.

```sql
CREATE TABLE app_roles (
  role_id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles iniciales
INSERT INTO app_roles (role_id, description) VALUES
  ('admin', 'Administrador con acceso completo'),
  ('operador', 'Operador con permisos de gestión'),
  ('repartidor', 'Usuario con permisos limitados');
```

### 3. Tabla: Permisos

Catálogo de todos los permisos disponibles del sistema.

```sql
CREATE TABLE app_permissions (
  permission_id TEXT PRIMARY KEY,
  module TEXT NOT NULL,        -- ej: 'clientes', 'productos', 'pedidos'
  action TEXT NOT NULL,         -- ej: 'ver', 'crear', 'editar', 'eliminar'
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por módulo
CREATE INDEX idx_permissions_module ON app_permissions(module);
```

**Ejemplo de permisos:**
```sql
INSERT INTO app_permissions (permission_id, module, action, description) VALUES
  ('clientes.ver', 'clientes', 'ver', 'Ver listado de clientes'),
  ('clientes.crear', 'clientes', 'crear', 'Crear nuevos clientes'),
  ('clientes.editar', 'clientes', 'editar', 'Editar clientes existentes'),
  ('clientes.eliminar', 'clientes', 'eliminar', 'Eliminar clientes'),
  ('productos.ver', 'productos', 'ver', 'Ver catálogo de productos'),
  ('productos.editar', 'productos', 'editar', 'Editar productos'),
  ('pedidos.ver', 'pedidos', 'ver', 'Ver listado de pedidos'),
  ('pedidos.crear', 'pedidos', 'crear', 'Crear nuevos pedidos'),
  ('pedidos.editar', 'pedidos', 'editar', 'Editar pedidos'),
  ('pedidos.cambiar_estado', 'pedidos', 'cambiar_estado', 'Cambiar estado de pedidos'),
  ('usuarios.ver', 'usuarios', 'ver', 'Ver listado de usuarios'),
  ('usuarios.crear', 'usuarios', 'crear', 'Crear nuevos usuarios'),
  ('usuarios.editar', 'usuarios', 'editar', 'Editar usuarios'),
  ('usuarios.gestionar_permisos', 'usuarios', 'gestionar_permisos', 'Gestionar permisos de usuarios'),
  ('dashboard.ver', 'dashboard', 'ver', 'Ver dashboard'),
  ('dashboard.ver_financiero', 'dashboard', 'ver_financiero', 'Ver información financiera'),
  ('reportes.ver', 'reportes', 'ver', 'Ver reportes'),
  ('reportes.exportar', 'reportes', 'exportar', 'Exportar reportes');
```

### 4. Tabla: Permisos por Rol

Asigna permisos a cada rol.

```sql
CREATE TABLE app_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id TEXT REFERENCES app_roles(role_id) ON DELETE CASCADE,
  permission_id TEXT REFERENCES app_permissions(permission_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Índice para consultas por rol
CREATE INDEX idx_role_permissions_role ON app_role_permissions(role_id);
```

**Ejemplo de asignación:**
```sql
-- Operador: acceso a gestión básica
INSERT INTO app_role_permissions (role_id, permission_id) VALUES
  ('operador', 'clientes.ver'),
  ('operador', 'clientes.crear'),
  ('operador', 'clientes.editar'),
  ('operador', 'productos.ver'),
  ('operador', 'pedidos.ver'),
  ('operador', 'pedidos.crear'),
  ('operador', 'pedidos.editar'),
  ('operador', 'dashboard.ver');

-- Repartidor: solo visualización y actualización de entregas
INSERT INTO app_role_permissions (role_id, permission_id) VALUES
  ('repartidor', 'pedidos.ver'),
  ('repartidor', 'pedidos.cambiar_estado'),
  ('repartidor', 'clientes.ver');
```

### 5. Tabla: Permisos Personalizados por Usuario

Permite otorgar o revocar permisos específicos a usuarios individuales.

```sql
CREATE TABLE app_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  permission_id TEXT REFERENCES app_permissions(permission_id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL,  -- true = otorgado, false = revocado
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- Índices
CREATE INDEX idx_user_permissions_user ON app_user_permissions(user_id);
CREATE INDEX idx_user_permissions_granted ON app_user_permissions(granted);
```

**Lógica:**
- `granted = true`: Permiso adicional otorgado (no lo tiene por rol)
- `granted = false`: Permiso revocado (lo tiene por rol pero se le quita)

**Cálculo de permisos efectivos:**
```
Permisos Efectivos = (Permisos del Rol + Permisos Otorgados) - Permisos Revocados
```

### 6. Tabla: Log de Auditoría

Registra todas las acciones importantes del sistema.

```sql
CREATE TABLE app_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                    -- ej: 'user.created', 'order.updated'
  entity_type TEXT NOT NULL,               -- ej: 'user', 'order', 'client'
  entity_id TEXT NOT NULL,                 -- ID de la entidad afectada
  old_value JSONB,                         -- Estado anterior (JSON)
  new_value JSONB,                         -- Estado nuevo (JSON)
  ip_address INET,                         -- IP del usuario (opcional)
  user_agent TEXT,                         -- Navegador/dispositivo (opcional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_audit_log_user ON app_audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON app_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON app_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON app_audit_log(action);
```

---

## Implementación de RLS

Row Level Security (RLS) es la base de la seguridad a nivel de base de datos.

### Paso 1: Activar RLS en Todas las Tablas

```sql
-- Activar RLS en todas las tablas importantes
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_audit_log ENABLE ROW LEVEL SECURITY;

-- Activar en tablas de negocio (ejemplo)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

⚠️ **IMPORTANTE**: Después de ejecutar esto, **NADIE** podrá acceder a los datos hasta crear las políticas.

### Paso 2: Función para Verificar Permisos

Función SQL centralizada para verificar permisos de un usuario.

```sql
CREATE OR REPLACE FUNCTION app_has_permission(
  p_user_id UUID,
  p_permission_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_rol TEXT;
  v_is_admin BOOLEAN;
  v_role_has_permission BOOLEAN;
  v_user_permission_granted BOOLEAN;
  v_user_permission_revoked BOOLEAN;
BEGIN
  -- 1. Obtener rol del usuario
  SELECT rol INTO v_user_rol
  FROM app_users
  WHERE id = p_user_id AND activo = true;
  
  -- Si no existe o está inactivo, sin acceso
  IF v_user_rol IS NULL THEN
    RETURN false;
  END IF;
  
  -- 2. Si es admin, tiene todos los permisos
  IF v_user_rol = 'admin' THEN
    RETURN true;
  END IF;
  
  -- 3. Verificar si el rol tiene el permiso
  SELECT EXISTS (
    SELECT 1 
    FROM app_role_permissions 
    WHERE role_id = v_user_rol 
      AND permission_id = p_permission_id
  ) INTO v_role_has_permission;
  
  -- 4. Verificar si el usuario tiene permiso personalizado otorgado
  SELECT EXISTS (
    SELECT 1 
    FROM app_user_permissions 
    WHERE user_id = p_user_id 
      AND permission_id = p_permission_id 
      AND granted = true
  ) INTO v_user_permission_granted;
  
  -- 5. Verificar si el usuario tiene permiso revocado
  SELECT EXISTS (
    SELECT 1 
    FROM app_user_permissions 
    WHERE user_id = p_user_id 
      AND permission_id = p_permission_id 
      AND granted = false
  ) INTO v_user_permission_revoked;
  
  -- 6. Calcular permiso efectivo: (rol + otorgado) - revocado
  RETURN (v_role_has_permission OR v_user_permission_granted) 
         AND NOT v_user_permission_revoked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Paso 3: Políticas RLS para Usuarios

```sql
-- Política 1: Los usuarios pueden ver su propia información
CREATE POLICY "Usuarios pueden ver su propia información"
  ON app_users FOR SELECT
  USING (auth.uid() = id);

-- Política 2: Los admins pueden ver todos los usuarios
CREATE POLICY "Admins pueden ver todos los usuarios"
  ON app_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() 
        AND rol = 'admin'
        AND activo = true
    )
  );

-- Política 3: Los admins pueden insertar usuarios
CREATE POLICY "Admins pueden crear usuarios"
  ON app_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() 
        AND rol = 'admin'
        AND activo = true
    )
  );

-- Política 4: Los admins pueden actualizar usuarios
CREATE POLICY "Admins pueden actualizar usuarios"
  ON app_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() 
        AND rol = 'admin'
        AND activo = true
    )
  );

-- Política 5: Los admins pueden eliminar usuarios
CREATE POLICY "Admins pueden eliminar usuarios"
  ON app_users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() 
        AND rol = 'admin'
        AND activo = true
    )
  );
```

### Paso 4: Políticas RLS para Tablas de Permisos

```sql
-- Todos los usuarios autenticados pueden leer permisos (para UI)
CREATE POLICY "Usuarios autenticados pueden leer permisos"
  ON app_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND activo = true));

-- Solo admins pueden modificar permisos
CREATE POLICY "Solo admins pueden modificar permisos"
  ON app_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

-- Políticas similares para app_role_permissions y app_user_permissions
CREATE POLICY "Usuarios autenticados pueden leer role_permissions"
  ON app_role_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND activo = true));

CREATE POLICY "Solo admins pueden modificar role_permissions"
  ON app_role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );
```

### Paso 5: Políticas RLS para Tablas de Negocio

Ejemplo para tabla de pedidos:

```sql
-- Lectura: Todos los usuarios autenticados pueden leer
CREATE POLICY "Usuarios autenticados pueden leer pedidos"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() AND activo = true
    )
  );

-- Escritura: Solo admin y operador pueden crear/editar
CREATE POLICY "Admin y Operador pueden modificar pedidos"
  ON orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() 
        AND rol IN ('admin', 'operador')
        AND activo = true
    )
  );

-- Actualización especial: Repartidor puede actualizar solo estado de entrega
CREATE POLICY "Repartidor puede actualizar entregas"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() 
        AND rol = 'repartidor'
        AND activo = true
    )
  )
  WITH CHECK (
    -- Solo puede cambiar campos específicos (implementar lógica adicional si necesario)
    true
  );
```

### Paso 6: Políticas RLS para Auditoría

```sql
-- Todos pueden insertar (registrar sus propias acciones)
CREATE POLICY "Usuarios autenticados pueden insertar auditoría"
  ON app_audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Solo admins pueden leer auditoría
CREATE POLICY "Solo admins pueden leer auditoría"
  ON app_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() 
        AND rol = 'admin'
        AND activo = true
    )
  );
```

### Paso 7: Verificar Implementación de RLS

```sql
-- Función para verificar estado de RLS
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::TEXT,
    c.relrowsecurity,
    COUNT(p.polname)
  FROM pg_class c
  LEFT JOIN pg_policies p ON p.tablename = c.relname
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind = 'r'
    AND c.relname LIKE 'app_%'
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar verificación
SELECT * FROM check_rls_status();
```

**Resultado esperado:**
```
table_name              | rls_enabled | policy_count
------------------------|-------------|-------------
app_audit_log           | true        | 2
app_permissions         | true        | 2
app_role_permissions    | true        | 2
app_roles               | true        | 2
app_user_permissions    | true        | 2
app_users               | true        | 5
```

---

## Sistema de Permisos

### Archivo: `lib/permissions.ts`

```typescript
import { supabase } from './supabase'

/**
 * Estructura de permisos de un usuario
 */
export type UserPermissions = {
  rolePermissions: string[]        // Permisos heredados del rol
  customPermissions: string[]      // Permisos personalizados otorgados
  revokedPermissions: string[]     // Permisos revocados
  effectivePermissions: string[]   // Permisos finales (rol + custom - revoked)
}

/**
 * Obtiene los permisos efectivos de un usuario desde la base de datos
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  try {
    // 1. Obtener usuario con su rol
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('role_id, rol')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('Error obteniendo usuario:', userError)
      return {
        rolePermissions: [],
        customPermissions: [],
        revokedPermissions: [],
        effectivePermissions: []
      }
    }

    const roleId = user.role_id || user.rol

    // 2. Si es admin, retornar acceso total
    if (roleId === 'admin') {
      const { data: allPerms } = await supabase
        .from('app_permissions')
        .select('permission_id')

      return {
        rolePermissions: allPerms?.map(p => p.permission_id) || [],
        customPermissions: [],
        revokedPermissions: [],
        effectivePermissions: allPerms?.map(p => p.permission_id) || []
      }
    }

    // 3. Obtener permisos del rol
    const { data: rolePerms } = await supabase
      .from('app_role_permissions')
      .select('permission_id')
      .eq('role_id', roleId)

    const rolePermissions = rolePerms?.map(p => p.permission_id) || []

    // 4. Obtener permisos personalizados del usuario
    const { data: userPerms } = await supabase
      .from('app_user_permissions')
      .select('permission_id, granted')
      .eq('user_id', userId)

    const customPermissions = userPerms
      ?.filter(p => p.granted)
      .map(p => p.permission_id) || []

    const revokedPermissions = userPerms
      ?.filter(p => !p.granted)
      .map(p => p.permission_id) || []

    // 5. Calcular permisos efectivos: (rol + custom) - revoked
    const effectiveSet = new Set([...rolePermissions, ...customPermissions])
    revokedPermissions.forEach(p => effectiveSet.delete(p))
    const effectivePermissions = Array.from(effectiveSet)

    return {
      rolePermissions,
      customPermissions,
      revokedPermissions,
      effectivePermissions
    }
  } catch (error) {
    console.error('Error obteniendo permisos:', error)
    return {
      rolePermissions: [],
      customPermissions: [],
      revokedPermissions: [],
      effectivePermissions: []
    }
  }
}

/**
 * Verifica si un usuario tiene un permiso específico usando la función SQL centralizada
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('app_has_permission', {
      p_user_id: userId,
      p_permission_id: permission
    })

    if (error) {
      console.error('Error verificando permiso:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Error en hasPermission:', error)
    return false
  }
}

/**
 * Obtiene todos los permisos disponibles del sistema agrupados por módulo
 */
export async function getAllPermissions(): Promise<Record<string, any[]>> {
  try {
    const { data, error } = await supabase
      .from('app_permissions')
      .select('*')
      .order('module, action')

    if (error) {
      console.error('Error obteniendo permisos:', error)
      return {}
    }

    // Agrupar por módulo
    const grouped: Record<string, any[]> = {}
    data?.forEach(perm => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = []
      }
      grouped[perm.module].push(perm)
    })

    return grouped
  } catch (error) {
    console.error('Error en getAllPermissions:', error)
    return {}
  }
}

/**
 * Otorga un permiso personalizado a un usuario
 */
export async function grantUserPermission(
  userId: string,
  permissionId: string,
  createdBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('app_user_permissions')
      .upsert({
        user_id: userId,
        permission_id: permissionId,
        granted: true,
        created_by: createdBy
      }, {
        onConflict: 'user_id,permission_id'
      })

    if (error) {
      console.error('Error otorgando permiso:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error en grantUserPermission:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Revoca un permiso de un usuario
 */
export async function revokeUserPermission(
  userId: string,
  permissionId: string,
  createdBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('app_user_permissions')
      .upsert({
        user_id: userId,
        permission_id: permissionId,
        granted: false,
        created_by: createdBy
      }, {
        onConflict: 'user_id,permission_id'
      })

    if (error) {
      console.error('Error revocando permiso:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error en revokeUserPermission:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Elimina un permiso personalizado de un usuario (lo devuelve al estado del rol)
 */
export async function removeUserPermission(
  userId: string,
  permissionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('app_user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission_id', permissionId)

    if (error) {
      console.error('Error eliminando permiso personalizado:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error en removeUserPermission:', error)
    return { success: false, error: error.message }
  }
}
```

### Hook React: `usePermissions`

```typescript
import { useEffect, useState } from 'react'
import { useAuthStore } from './auth-store'
import { getUserPermissions, type UserPermissions } from './permissions'

export function usePermissions() {
  const { currentUser } = useAuthStore()
  const [permissions, setPermissions] = useState<UserPermissions>({
    rolePermissions: [],
    customPermissions: [],
    revokedPermissions: [],
    effectivePermissions: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser?.id) {
      loadPermissions()
    } else {
      setPermissions({
        rolePermissions: [],
        customPermissions: [],
        revokedPermissions: [],
        effectivePermissions: []
      })
      setLoading(false)
    }
  }, [currentUser?.id])

  async function loadPermissions() {
    if (!currentUser?.id) return
    
    setLoading(true)
    const perms = await getUserPermissions(currentUser.id)
    setPermissions(perms)
    setLoading(false)
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const can = (permission: string): boolean => {
    return permissions.effectivePermissions.includes(permission)
  }

  /**
   * Verifica si el usuario tiene al menos uno de los permisos
   */
  const canAny = (perms: string[]): boolean => {
    return perms.some(p => permissions.effectivePermissions.includes(p))
  }

  /**
   * Verifica si el usuario tiene todos los permisos
   */
  const canAll = (perms: string[]): boolean => {
    return perms.every(p => permissions.effectivePermissions.includes(p))
  }

  return {
    permissions,
    loading,
    can,
    canAny,
    canAll,
    refresh: loadPermissions
  }
}
```

### Componente: `PermissionGuard`

```typescript
import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/hooks/usePermissions'

interface PermissionGuardProps {
  permission: string | string[]
  requireAll?: boolean  // Si true, requiere todos los permisos (AND), sino solo uno (OR)
  fallback?: ReactNode
  redirectTo?: string
  children: ReactNode
}

export function PermissionGuard({
  permission,
  requireAll = false,
  fallback = null,
  redirectTo,
  children
}: PermissionGuardProps) {
  const router = useRouter()
  const { can, canAny, canAll, loading } = usePermissions()

  if (loading) {
    return <div>Cargando permisos...</div>
  }

  const permissions = Array.isArray(permission) ? permission : [permission]
  const hasPermission = requireAll ? canAll(permissions) : canAny(permissions)

  if (!hasPermission) {
    if (redirectTo) {
      router.push(redirectTo)
      return null
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}
```

**Uso:**
```tsx
<PermissionGuard permission="usuarios.ver" redirectTo="/">
  <UsersPage />
</PermissionGuard>

<PermissionGuard 
  permission={["pedidos.crear", "pedidos.editar"]} 
  requireAll={false}
  fallback={<div>No tienes permisos</div>}
>
  <CreateOrderButton />
</PermissionGuard>
```

---

## Backend: Middleware de Autenticación

### Archivo: `lib/auth-middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Resultado de la verificación de autenticación
 */
export interface AuthCheckResult {
  authorized: boolean
  status: number
  error?: string
  userId?: string
  rol?: string
  user?: any
}

/**
 * Verifica que el usuario esté autenticado
 */
export async function requireAuth(request: NextRequest): Promise<AuthCheckResult> {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Verificar sesión activa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return {
        authorized: false,
        status: 401,
        error: 'No autenticado. Por favor inicia sesión.'
      }
    }

    // Verificar que el usuario exista y esté activo
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('id, email, nombre, rol, activo')
      .eq('id', session.user.id)
      .single()

    if (userError || !userData) {
      return {
        authorized: false,
        status: 403,
        error: 'Usuario no encontrado en el sistema'
      }
    }

    if (!userData.activo) {
      return {
        authorized: false,
        status: 403,
        error: 'Usuario inactivo. Contacta al administrador.'
      }
    }

    return {
      authorized: true,
      status: 200,
      userId: userData.id,
      rol: userData.rol,
      user: userData
    }

  } catch (error) {
    console.error('Error en requireAuth:', error)
    return {
      authorized: false,
      status: 500,
      error: 'Error interno del servidor'
    }
  }
}

/**
 * Verifica que el usuario tenga un permiso específico
 */
export async function requirePermission(
  request: NextRequest, 
  permission: string
): Promise<AuthCheckResult> {
  const authCheck = await requireAuth(request)
  
  if (!authCheck.authorized) {
    return authCheck
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: hasPermission, error: permError } = await supabase
      .rpc('app_has_permission', {
        p_user_id: authCheck.userId,
        p_permission_id: permission
      })

    if (permError || !hasPermission) {
      return {
        authorized: false,
        status: 403,
        error: `No tienes permiso para: ${permission}`
      }
    }

    return authCheck

  } catch (error) {
    console.error('Error en requirePermission:', error)
    return {
      authorized: false,
      status: 500,
      error: 'Error interno del servidor'
    }
  }
}

/**
 * Verifica que el usuario sea admin
 */
export async function requireAdmin(request: NextRequest): Promise<AuthCheckResult> {
  const authCheck = await requireAuth(request)
  
  if (!authCheck.authorized) {
    return authCheck
  }

  if (authCheck.rol !== 'admin') {
    return {
      authorized: false,
      status: 403,
      error: 'Solo administradores pueden realizar esta acción'
    }
  }

  return authCheck
}

/**
 * Helper para crear respuesta de error
 */
export function createErrorResponse(authCheck: AuthCheckResult): NextResponse {
  return NextResponse.json(
    { 
      error: authCheck.error,
      authenticated: false 
    },
    { status: authCheck.status }
  )
}
```

### Uso en API Routes

```typescript
// app/api/users/route.ts
import { NextRequest } from 'next/server'
import { requireAdmin, createErrorResponse } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  // Verificar que sea admin
  const authCheck = await requireAdmin(request)
  
  if (!authCheck.authorized) {
    return createErrorResponse(authCheck)
  }

  // Continuar con la lógica...
  // authCheck.userId contiene el ID del usuario autenticado
}

export async function POST(request: NextRequest) {
  // Verificar permiso específico
  const authCheck = await requirePermission(request, 'usuarios.crear')
  
  if (!authCheck.authorized) {
    return createErrorResponse(authCheck)
  }

  // Crear usuario...
}
```

---

## Sistema de Auditoría

### Función: `logAudit`

```typescript
/**
 * Registra una acción en el log de auditoría
 */
export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue?: Record<string, any>,
  newValue?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase.from('app_audit_log').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue
    })
    
    if (error) {
      console.error('Error guardando auditoría:', error)
    }
  } catch (error) {
    console.error('Error en logAudit:', error)
  }
}
```

### Ejemplo de Uso

```typescript
// Al crear un usuario
await logAudit(
  currentUserId,
  'user.created',
  'user',
  newUser.id,
  undefined,
  { email: newUser.email, nombre: newUser.nombre, rol: newUser.rol }
)

// Al editar un usuario
await logAudit(
  currentUserId,
  'user.updated',
  'user',
  userId,
  { nombre: oldNombre, rol: oldRol },
  { nombre: newNombre, rol: newRol }
)

// Al eliminar un usuario
await logAudit(
  currentUserId,
  'user.deleted',
  'user',
  userId,
  { email: user.email, nombre: user.nombre },
  undefined
)

// Al cambiar estado de pedido
await logAudit(
  currentUserId,
  'order.status_changed',
  'order',
  orderId,
  { status: 'Pendiente' },
  { status: 'Despachado' }
)
```

### Acciones Comunes de Auditoría

```typescript
// Usuarios
'user.created'
'user.updated'
'user.deleted'
'user.activated'
'user.deactivated'
'user.password_reset'

// Permisos
'permission.granted'
'permission.revoked'
'permission.removed'

// Entidades de negocio
'order.created'
'order.updated'
'order.deleted'
'order.status_changed'
'client.created'
'client.updated'
'client.deleted'
'product.created'
'product.updated'
'product.deleted'
```

---

## Guía de Implementación Paso a Paso

### Fase 1: Configuración de Base de Datos (30-60 min)

1. **Crear tablas base:**
   ```sql
   -- Ejecutar scripts de creación de tablas
   -- (app_users, app_roles, app_permissions, etc.)
   ```

2. **Insertar roles y permisos iniciales:**
   ```sql
   -- Insertar en app_roles
   -- Insertar en app_permissions
   -- Asignar permisos a roles en app_role_permissions
   ```

3. **Activar RLS:**
   ```sql
   -- Ejecutar ALTER TABLE ... ENABLE ROW LEVEL SECURITY
   ```

4. **Crear función de verificación:**
   ```sql
   -- Crear app_has_permission()
   ```

5. **Crear políticas RLS:**
   ```sql
   -- CREATE POLICY para cada tabla
   ```

6. **Verificar:**
   ```sql
   SELECT * FROM check_rls_status();
   ```

### Fase 2: Backend - Lógica de Permisos (30 min)

1. **Crear `lib/permissions.ts`** con todas las funciones
2. **Crear `lib/auth-middleware.ts`** para API routes
3. **Crear tipos TypeScript** en `lib/types.ts`

### Fase 3: Frontend - Hooks y Componentes (45 min)

1. **Crear hook `usePermissions`**
2. **Crear componente `PermissionGuard`**
3. **Crear store de autenticación** (si usa Zustand/Redux)

### Fase 4: Páginas y Funcionalidades (variable)

1. **Página de usuarios** con CRUD completo
2. **Gestión de permisos** por usuario
3. **Historial de auditoría**
4. **Proteger rutas** con middleware

### Fase 5: Testing y Validación (1-2 horas)

1. **Probar RLS** con diferentes usuarios
2. **Verificar permisos** en todas las operaciones
3. **Validar auditoría** se registra correctamente
4. **Testing de seguridad**

---

## Testing y Validación

### Checklist de Testing

#### Autenticación
- [ ] Login con credenciales correctas funciona
- [ ] Login con credenciales incorrectas es rechazado
- [ ] Usuario inactivo no puede iniciar sesión
- [ ] JWT expira correctamente y requiere re-login
- [ ] Logout limpia la sesión correctamente

#### RLS - Usuarios
- [ ] Usuario solo ve su propio perfil
- [ ] Admin ve todos los perfiles
- [ ] Usuario no puede editar otros perfiles
- [ ] Admin puede editar cualquier perfil
- [ ] Usuario no puede eliminar otros usuarios
- [ ] Admin puede eliminar usuarios (excepto a sí mismo)

#### Permisos
- [ ] Admin tiene todos los permisos automáticamente
- [ ] Operador tiene solo permisos asignados a su rol
- [ ] Repartidor tiene permisos limitados correctos
- [ ] Otorgar permiso adicional funciona
- [ ] Revocar permiso del rol funciona
- [ ] Remover override restaura permiso del rol

#### Auditoría
- [ ] Crear usuario registra en auditoría
- [ ] Editar usuario registra cambios (old/new)
- [ ] Eliminar usuario registra en auditoría
- [ ] Cambiar estado registra en auditoría
- [ ] Otorgar/revocar permiso registra en auditoría
- [ ] Admin puede ver historial completo
- [ ] Usuario normal no puede ver auditoría

#### Seguridad
- [ ] No se puede bypassear RLS con queries directas
- [ ] Middleware protege API routes correctamente
- [ ] Frontend oculta opciones sin permisos
- [ ] Backend rechaza acciones sin permisos
- [ ] No hay información sensible en respuestas de error

### Scripts de Testing SQL

```sql
-- Test 1: Verificar que RLS está activo
SELECT * FROM check_rls_status();

-- Test 2: Verificar permisos de un usuario
SELECT app_has_permission(
  '<user-uuid>'::uuid,
  'clientes.ver'
);

-- Test 3: Ver permisos efectivos de un usuario
SELECT 
  u.nombre,
  u.rol,
  array_agg(DISTINCT rp.permission_id) as permisos_rol,
  array_agg(DISTINCT CASE WHEN up.granted = true THEN up.permission_id END) as permisos_otorgados,
  array_agg(DISTINCT CASE WHEN up.granted = false THEN up.permission_id END) as permisos_revocados
FROM app_users u
LEFT JOIN app_role_permissions rp ON rp.role_id = u.rol
LEFT JOIN app_user_permissions up ON up.user_id = u.id
WHERE u.id = '<user-uuid>'::uuid
GROUP BY u.id, u.nombre, u.rol;

-- Test 4: Ver historial de auditoría
SELECT 
  u.nombre as usuario,
  a.action,
  a.entity_type,
  a.created_at,
  a.old_value,
  a.new_value
FROM app_audit_log a
JOIN app_users u ON u.id = a.user_id
ORDER BY a.created_at DESC
LIMIT 20;
```

---

## Troubleshooting

### Problema: `auth.uid()` retorna NULL

**Síntomas:**
- Queries retornan 0 rows
- Error "permission denied for table"
- RLS bloquea todo acceso

**Causa:**
No estás autenticado o el JWT es inválido.

**Solución:**
1. Verifica que iniciaste sesión correctamente
2. Verifica que las cookies de Supabase se están enviando
3. Verifica que el JWT no haya expirado
4. En desarrollo, verifica las variables de entorno

```typescript
// Verificar sesión actual
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)
console.log('User ID:', session?.user?.id)
```

### Problema: Usuario no puede ver ningún dato

**Síntomas:**
- Queries retornan 0 rows incluso estando autenticado
- `auth.uid()` funciona pero sin resultados

**Causa:**
- Usuario no existe en `app_users`
- Usuario está inactivo (`activo = false`)
- No hay políticas RLS adecuadas

**Solución:**
```sql
-- Verificar si el usuario existe
SELECT id, email, nombre, rol, activo 
FROM app_users 
WHERE id = auth.uid();

-- Si no existe, crear (solo admin puede):
INSERT INTO app_users (id, email, nombre, rol, activo)
VALUES (
  auth.uid(), 
  'usuario@example.com', 
  'Nombre Usuario', 
  'operador', 
  true
);

-- Si está inactivo, activar:
UPDATE app_users 
SET activo = true 
WHERE id = auth.uid();
```

### Problema: Permisos no se aplican correctamente

**Síntomas:**
- Función `app_has_permission()` retorna `false` cuando debería ser `true`
- Usuario no puede hacer operaciones que su rol permite

**Causa:**
- Permisos no asignados al rol
- Usuario con permiso revocado
- Error en función de verificación

**Solución:**
```sql
-- Verificar permisos del rol
SELECT * 
FROM app_role_permissions 
WHERE role_id = (
  SELECT rol FROM app_users WHERE id = '<user-uuid>'
);

-- Verificar overrides del usuario
SELECT * 
FROM app_user_permissions 
WHERE user_id = '<user-uuid>';

-- Test directo de la función
SELECT app_has_permission(
  '<user-uuid>'::uuid,
  'clientes.ver'
);

-- Ver output completo de permisos
SELECT 
  u.nombre,
  u.rol,
  p.permission_id,
  CASE 
    WHEN u.rol = 'admin' THEN 'Tiene (admin)'
    WHEN rp.permission_id IS NOT NULL AND up.granted IS NULL THEN 'Tiene (rol)'
    WHEN up.granted = true THEN 'Tiene (otorgado)'
    WHEN up.granted = false THEN 'No tiene (revocado)'
    ELSE 'No tiene'
  END as estado
FROM app_users u
CROSS JOIN app_permissions p
LEFT JOIN app_role_permissions rp 
  ON rp.role_id = u.rol AND rp.permission_id = p.permission_id
LEFT JOIN app_user_permissions up 
  ON up.user_id = u.id AND up.permission_id = p.permission_id
WHERE u.id = '<user-uuid>'
ORDER BY p.module, p.action;
```

### Problema: RLS demasiado restrictivo en desarrollo

**Síntomas:**
- Dificulta el testing y desarrollo
- Necesitas acceso temporal sin restricciones

**Solución (NO USAR EN PRODUCCIÓN):**
```sql
-- Opción 1: Deshabilitar RLS temporalmente en una tabla
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- Volver a habilitar después del testing
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Opción 2: Usar cliente admin de Supabase en desarrollo
-- En tu código, usar supabaseAdmin en lugar de supabase
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // Service role bypassa RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### Problema: Auditoría no se registra

**Síntomas:**
- `logAudit()` no genera registros
- Tabla `app_audit_log` vacía

**Causa:**
- RLS bloquea inserción
- Usuario no autenticado
- Error silencioso en `logAudit()`

**Solución:**
```typescript
// Agregar más logging a logAudit()
export async function logAudit(...) {
  try {
    console.log('🔍 Intentando registrar auditoría:', {
      userId,
      action,
      entityType,
      entityId
    })
    
    const { data, error } = await supabase
      .from('app_audit_log')
      .insert({...})
      .select()  // Agregar .select() para ver el resultado
    
    if (error) {
      console.error('❌ Error en auditoría:', error)
    } else {
      console.log('✅ Auditoría registrada:', data)
    }
  } catch (error) {
    console.error('❌ Excepción en logAudit:', error)
  }
}
```

```sql
-- Verificar política de auditoría
SELECT * FROM pg_policies 
WHERE tablename = 'app_audit_log';

-- Asegurar que existe política de INSERT
CREATE POLICY "Usuarios autenticados pueden insertar auditoría"
  ON app_audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Problema: Performance lento con RLS

**Síntomas:**
- Queries lentas
- Timeouts en producción
- Alta carga de CPU en BD

**Causa:**
- Políticas RLS complejas sin índices
- Subqueries sin optimizar
- Muchas verificaciones EXISTS

**Solución:**
```sql
-- Agregar índices a campos usados en políticas
CREATE INDEX idx_users_id_rol_activo 
ON app_users(id, rol, activo) 
WHERE activo = true;

-- Optimizar políticas con EXISTS
-- Malo:
CREATE POLICY "..." ON table
USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND rol = 'admin')
);

-- Mejor (usa índice):
CREATE POLICY "..." ON table
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() 
      AND rol = 'admin' 
      AND activo = true
  )
);

-- Analizar performance
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = '...';
```

---

## Resumen de Implementación

### Archivos a Crear

```
/lib/
  ├── permissions.ts          # Funciones de permisos
  ├── auth-middleware.ts      # Middleware para API routes
  ├── auth-store.ts          # Store de autenticación (Zustand)
  └── supabase.ts            # Cliente Supabase

/hooks/
  └── usePermissions.ts      # Hook React para permisos

/components/
  ├── PermissionGuard.tsx    # Componente de protección
  └── usuarios/
      ├── users-table.tsx
      ├── create-user-dialog.tsx
      └── edit-user-dialog.tsx

/app/
  ├── api/
  │   └── users/
  │       └── route.ts       # API routes protegidas
  └── usuarios/
      └── page.tsx           # Página de gestión de usuarios

/scripts/sql/
  ├── 01-enable-rls.sql
  ├── 02-create-policies.sql
  └── 03-verify-rls.sql
```

### Comandos Útiles

```sql
-- Ver estado de RLS
SELECT * FROM check_rls_status();

-- Ver permisos de un usuario
SELECT app_has_permission('<uuid>', 'clientes.ver');

-- Ver auditoría reciente
SELECT * FROM app_audit_log ORDER BY created_at DESC LIMIT 20;

-- Contar usuarios por rol
SELECT rol, COUNT(*) FROM app_users GROUP BY rol;

-- Ver usuarios activos
SELECT * FROM app_users WHERE activo = true;
```

---

## Checklist Final de Implementación

### Base de Datos
- [ ] Tablas creadas: users, roles, permissions, role_permissions, user_permissions, audit_log
- [ ] RLS activado en todas las tablas
- [ ] Función `app_has_permission()` creada
- [ ] Políticas RLS creadas y probadas
- [ ] Índices creados para optimización
- [ ] Roles y permisos iniciales insertados

### Backend
- [ ] `lib/permissions.ts` implementado
- [ ] `lib/auth-middleware.ts` implementado
- [ ] Tipos TypeScript definidos
- [ ] API routes protegidas con middleware
- [ ] Sistema de auditoría funcionando

### Frontend
- [ ] Hook `usePermissions` creado
- [ ] Componente `PermissionGuard` creado
- [ ] Store de autenticación configurado
- [ ] Página de usuarios implementada
- [ ] Gestión de permisos UI funcional

### Testing
- [ ] RLS probado con diferentes usuarios
- [ ] Permisos verificados (rol + overrides)
- [ ] Auditoría registrando correctamente
- [ ] Casos edge probados (usuario inactivo, sin permisos, etc.)
- [ ] Performance aceptable

### Documentación
- [ ] README con instrucciones de setup
- [ ] Comentarios en código
- [ ] Scripts SQL documentados
- [ ] Guía de troubleshooting

---

## Referencias

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Documento creado para implementación de sistema de usuarios, permisos y RLS**  
**Versión:** 1.0  
**Última actualización:** Noviembre 2025  
**Basado en:** Implementación de sistema Agua Tres Torres (sin referencias específicas)

---

Este documento proporciona una guía completa y reutilizable para implementar un sistema robusto de autenticación, autorización y auditoría con Supabase y Row Level Security.








