# 🔐 Scripts SQL de Seguridad - Row Level Security (RLS)

Scripts para implementar Row Level Security en Supabase siguiendo documentación oficial.

## 📋 Orden de Ejecución

**⚠️ IMPORTANTE**: Ejecutar en este orden exacto:

### 1️⃣ Activar RLS

```bash
01-enable-rls.sql
```

**Qué hace:**
- Activa RLS en todas las tablas `3t_*`
- ⚠️ Después de ejecutar, NADIE podrá acceder a los datos hasta crear las políticas

**Tiempo estimado:** 10 segundos

### 2️⃣ Crear Políticas

```bash
02-create-policies.sql
```

**Qué hace:**
- Crea políticas de acceso para cada rol (admin, operador, repartidor)
- Define quién puede SELECT, INSERT, UPDATE, DELETE en cada tabla
- Usa `auth.uid()` para verificar identidad del usuario

**Políticas implementadas:**
- **3t_users**: Usuarios ven su perfil, admins ven todo
- **3t_orders**: Todos ven, admin/operador modifican, repartidor actualiza entregas
- **3t_customers**: Todos ven, admin/operador modifican
- **3t_products**: Todos ven, solo admin modifica
- **3t_quotes**: Todos ven, admin/operador modifican
- **3t_suppliers**: Todos ven, admin/operador modifican
- **3t_purchases**: Todos ven, admin/operador modifican
- **3t_saved_routes**: Todos ven, staff (admin/operador/repartidor) modifican
- **3t_permissions**: Todos ven, solo admin modifica
- **3t_audit_log**: Todos insertan, solo admin lee

**Tiempo estimado:** 30-60 segundos

### 3️⃣ Verificar

```bash
03-verify-rls.sql
```

**Qué hace:**
- Crea función `check_rls_status()`
- Muestra estado de RLS en todas las tablas
- Cuenta políticas por tabla
- Verifica que `auth.uid()` funciona

**Resultado esperado:**
```
table_name              | rls_enabled | policy_count
------------------------|-------------|-------------
3t_addresses           | true        | 2
3t_audit_log           | true        | 2
3t_customers           | true        | 4
3t_orders              | true        | 5
...
```

**Tiempo estimado:** 5 segundos

---

## 🚀 Cómo Ejecutar

### Opción 1: Supabase Dashboard (Recomendado)

1. Abrir [https://api.loopia.cl](https://api.loopia.cl)
2. Ir a **SQL Editor** en el menú lateral
3. Crear nueva query
4. Copiar y pegar contenido de `01-enable-rls.sql`
5. Click en **RUN**
6. Repetir para `02-create-policies.sql`
7. Repetir para `03-verify-rls.sql`

### Opción 2: psql (CLI)

```bash
# Conectar a base de datos
psql postgresql://postgres:[PASSWORD]@db.loopia.cl:5432/postgres

# Ejecutar scripts
\i /opt/cane/3t/scripts/sql/01-enable-rls.sql
\i /opt/cane/3t/scripts/sql/02-create-policies.sql
\i /opt/cane/3t/scripts/sql/03-verify-rls.sql
```

### Opción 3: MCP Tools (Para IA)

```typescript
// Ejecutar con mcp_supabase-selfhosted_execute_sql
```

---

## ✅ Checklist de Validación

Después de ejecutar los scripts, verificar:

- [ ] Todas las tablas `3t_*` tienen `rls_enabled = true`
- [ ] Todas las tablas tienen `policy_count > 0`
- [ ] `auth.uid()` retorna tu UUID (no NULL)
- [ ] Puedes ver tu propio perfil en `3t_users`
- [ ] Si eres admin, puedes ver todos los perfiles
- [ ] Si eres operador, puedes crear pedidos
- [ ] Si eres repartidor, solo puedes actualizar entregas

---

## 🔧 Troubleshooting

### Problema: auth.uid() retorna NULL

**Causa:** No estás autenticado o el JWT es inválido

**Solución:**
1. Verifica que iniciaste sesión en la aplicación
2. El JWT se envía automáticamente en cada request
3. Verifica que el usuario existe en `auth.users`

### Problema: No puedo ver ningún dato

**Causa:** Tu usuario no existe en `3t_users` o no está activo

**Solución:**
```sql
-- Verificar si existes en 3t_users
SELECT id, email, nombre, rol, activo 
FROM 3t_users 
WHERE id = auth.uid();

-- Si no existe, crear usuario (solo admin puede hacerlo)
INSERT INTO 3t_users (id, email, nombre, rol, activo)
VALUES (auth.uid(), 'tu@email.com', 'Tu Nombre', 'admin', true);
```

### Problema: Error "permission denied for table 3t_xxx"

**Causa:** Las políticas no se crearon correctamente o no tienes rol válido

**Solución:**
1. Ejecutar `03-verify-rls.sql` para ver políticas
2. Verificar que `activo = true` en `3t_users`
3. Verificar que el rol es válido ('admin', 'operador', 'repartidor')

### Problema: Necesito deshabilitar RLS temporalmente

**⚠️ NO RECOMENDADO en producción**

```sql
-- Deshabilitar RLS en una tabla (solo para testing)
ALTER TABLE 3t_orders DISABLE ROW LEVEL SECURITY;

-- Volver a habilitar
ALTER TABLE 3t_orders ENABLE ROW LEVEL SECURITY;
```

---

## 📚 Referencias

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [auth.uid() Helper Function](https://supabase.com/docs/guides/auth/row-level-security#helper-functions)

---

## 🔐 Seguridad

**Beneficios de RLS:**
- ✅ Protección a nivel de base de datos (no solo frontend)
- ✅ Imposible bypassear (incluso con acceso directo a DB)
- ✅ Filtra automáticamente en todas las queries
- ✅ No requiere cambios en el código del frontend
- ✅ Previene accesos no autorizados

**Después de implementar RLS:**
- Los usuarios solo ven sus propios datos (o todos si son admin)
- Las queries en el frontend no necesitan WHERE clauses adicionales
- PostgreSQL filtra automáticamente basándose en `auth.uid()`
- Cualquier intento de acceso no autorizado retorna 0 rows

---

**Fecha de creación:** 2025-10-16  
**Última actualización:** 2025-10-16  
**Versión:** 1.0.0
















