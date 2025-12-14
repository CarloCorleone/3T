# 🔐 Sistema de Autenticación - Agua Tres Torres

## 📋 Resumen

Se ha implementado un sistema completo de autenticación con 3 roles: **Admin**, **Operador** y **Repartidor**.

## ✅ Estado de Implementación

### Completado ✓

- [x] Cliente Supabase configurado para autenticación
- [x] Store de autenticación con Zustand (auth-store.ts)
- [x] Configuración de permisos por ruta (route-permissions.ts)
- [x] Página de login funcional (/login)
- [x] Componente AuthGuard para proteger rutas
- [x] Componente RoleGuard para protección por rol
- [x] Layout modificado con autenticación integrada
- [x] Sidebar con filtrado dinámico por rol
- [x] Botón de cerrar sesión
- [x] Protección aplicada a todas las páginas críticas:
  - Dashboard → Solo Admin
  - Reportes → Solo Admin
  - Presupuestos → Solo Admin
  - Proveedores → Admin y Operador
  - Compras → Admin y Operador

### Pendiente ⏳

- [ ] Aplicar migración SQL en Supabase
- [ ] Crear usuarios en Supabase Auth
- [ ] Probar flujo completo de login/logout
- [ ] Deshabilitar botones de crear/editar para repartidores

## 🚀 Cómo Aplicar la Migración SQL

### Opción 1: Usando el Dashboard de Supabase

1. Accede a tu dashboard de Supabase: https://api.loopia.cl
2. Ve a **SQL Editor**
3. Copia el contenido de `/opt/cane/3t/scripts/auth-migration.sql`
4. Pégalo en el editor SQL
5. Click en **Run**

### Opción 2: Usando psql (CLI)

```bash
# Desde el servidor
cd /opt/cane/3t/scripts

# Ejecutar migración
psql "postgresql://postgres:[PASSWORD]@localhost:5432/postgres" -f auth-migration.sql
```

### Opción 3: Usando MCP de Supabase (cuando esté disponible)

```typescript
// Si los MCP vuelven a funcionar
mcp_supabase-selfhosted_execute_sql({
  sql: "// contenido de auth-migration.sql"
})
```

## 👥 Crear Usuarios en Supabase Auth

Después de ejecutar la migración SQL, necesitas crear usuarios en Supabase Auth:

### Método 1: Dashboard de Supabase

1. Ve a **Authentication** → **Users**
2. Click en **Add user**
3. Crear 3 usuarios:

**Admin:**
- Email: `admin@trestorres.cl`
- Password: `AdminTresTorres2025!`
- Confirmar email automáticamente: ✓

**Operador:**
- Email: `operador@trestorres.cl`
- Password: `OperadorTresTorres2025!`
- Confirmar email automáticamente: ✓

**Repartidor:**
- Email: `repartidor@trestorres.cl`
- Password: `RepartidorTresTorres2025!`
- Confirmar email automáticamente: ✓

### Método 2: SQL (Avanzado)

Si prefieres SQL, necesitas usar la API admin de Supabase Auth o ejecutar:

```sql
-- Crear usuario en auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@trestorres.cl',
  crypt('AdminTresTorres2025!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

## 🧪 Probar el Sistema

### 1. Acceder a la aplicación

```bash
# En modo desarrollo
https://dev.3t.loopia.cl/login

# En modo producción
https://3t.loopia.cl/login
```

### 2. Probar cada rol

**Login como Admin:**
- Email: `admin@trestorres.cl`
- Password: `AdminTresTorres2025!`
- Debe ver: Todos los módulos en sidebar
- Debe acceder a: Dashboard, Reportes, Presupuestos

**Login como Operador:**
- Email: `operador@trestorres.cl`
- Password: `OperadorTresTorres2025!`
- Debe ver: Todos excepto Dashboard, Reportes, Presupuestos
- Debe acceder a: Proveedores, Compras

**Login como Repartidor:**
- Email: `repartidor@trestorres.cl`
- Password: `RepartidorTresTorres2025!`
- Debe ver: Inicio, Clientes, Productos, Pedidos, Rutas, Mapa
- NO debe acceder a: Proveedores, Compras, Presupuestos, Reportes, Dashboard

### 3. Verificar protecciones

- Intenta acceder a `/dashboard` como operador → Debe mostrar "Acceso Denegado"
- Intenta acceder a `/proveedores` como repartidor → Debe mostrar "Acceso Denegado"
- Intenta acceder sin login a cualquier ruta → Debe redirigir a `/login`

## 📊 Matriz de Permisos

| Módulo | Admin | Operador | Repartidor |
|--------|-------|----------|------------|
| Inicio | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ❌ | ❌ |
| Clientes | ✅ | ✅ | ✅ (solo lectura*) |
| Productos | ✅ | ✅ | ✅ (solo lectura*) |
| Pedidos | ✅ | ✅ | ✅ (solo lectura*) |
| Rutas | ✅ | ✅ | ✅ |
| Mapa | ✅ | ✅ | ✅ |
| Proveedores | ✅ | ✅ | ❌ |
| Compras | ✅ | ✅ | ❌ |
| Presupuestos | ✅ | ❌ | ❌ |
| Reportes | ✅ | ❌ | ❌ |

_*Solo lectura: Pendiente implementar deshabilitar botones de crear/editar_

## 🔧 Troubleshooting

### Error: "Email o contraseña incorrectos"
- Verifica que el usuario existe en Supabase Auth
- Verifica que el email está confirmado
- Verifica que la contraseña es correcta

### Error: "Usuario no autorizado"
- El usuario existe en auth.users pero NO en 3t_users
- Ejecuta la migración SQL para crear los registros en 3t_users
- O crea manualmente el usuario en 3t_users con el mismo ID de auth.users

### Error: "Acceso Denegado"
- El usuario no tiene el rol correcto
- Verifica el rol en la tabla 3t_users
- Actualiza el rol si es necesario:
  ```sql
  UPDATE "3t_users" 
  SET rol = 'admin' 
  WHERE email = 'usuario@example.com';
  ```

### No aparecen opciones en el sidebar
- Verifica que el usuario esté autenticado (ver consola del navegador)
- Verifica el rol del usuario en la tabla 3t_users
- Revisa los logs del navegador (F12 → Console)

## 📁 Archivos Creados/Modificados

### Nuevos archivos:
- `/lib/auth-store.ts` - Store de autenticación con Zustand
- `/lib/route-permissions.ts` - Configuración de permisos por ruta
- `/app/login/page.tsx` - Página de login
- `/components/auth-guard.tsx` - Protección de rutas
- `/components/role-guard.tsx` - Protección por rol
- `/components/client-layout.tsx` - Layout con autenticación
- `/scripts/auth-migration.sql` - Migración SQL completa
- `/scripts/README-AUTH.md` - Este archivo

### Archivos modificados:
- `/lib/supabase.ts` - Habilitada autenticación y tipo Usuario
- `/app/layout.tsx` - Integrado ClientLayout
- `/components/app-sidebar.tsx` - Filtrado por rol y botón logout
- `/app/dashboard/page.tsx` - Protección con RoleGuard
- `/app/reportes/page.tsx` - Protección con RoleGuard
- `/app/presupuestos/page.tsx` - Protección con RoleGuard
- `/app/proveedores/page.tsx` - Protección con RoleGuard
- `/app/compras/page.tsx` - Protección con RoleGuard

## 🔄 Próximos Pasos

1. **Ejecutar migración SQL** (Ver sección "Cómo Aplicar la Migración SQL")
2. **Crear usuarios en Supabase Auth** (Ver sección "Crear Usuarios en Supabase Auth")
3. **Probar sistema** (Ver sección "Probar el Sistema")
4. **Deshabilitar botones para repartidor** en módulos de lectura
5. **Continuar con Fase 2**: Mejoras al Dashboard Inicio

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs del contenedor: `docker logs 3t-app-dev`
2. Revisa la consola del navegador (F12)
3. Verifica que la migración SQL se ejecutó correctamente
4. Consulta este README

---

**Sistema de Autenticación v1.0**  
**Fecha:** 13 de Octubre de 2025  
**Proyecto:** Agua Tres Torres


