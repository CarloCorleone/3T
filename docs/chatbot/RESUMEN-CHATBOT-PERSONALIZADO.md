# ✅ Resumen: Chatbot Personalizado por Usuario

**Fecha de Implementación:** Octubre 20, 2025  
**Estado:** Frontend Completo ✅ | Backend Pendiente (n8n) ⏳  
**Objetivo:** Integrar sistema de permisos existente con el chatbot

---

## 📊 Lo que se Implementó

### ✅ Frontend (Completado)

#### 1. Hook `use-chat.ts` Actualizado

**Cambios:**
- Importado `getUserPermissions` de `lib/permissions.ts`
- Obtención de permisos del usuario antes de cada mensaje
- Envío de contexto completo al backend:
  - `userName`: Nombre del usuario
  - `userRole`: Rol (admin, operador, repartidor)
  - `userPermissions`: Array de permisos efectivos

**Código agregado:**
```typescript
// Obtener permisos del usuario
const userPermissions = await getUserPermissions(user.id)

// Enviar en body del request
body: JSON.stringify({
  message: content.trim(),
  userId: user.id,
  sessionId,
  userName: user.nombre || user.full_name,
  userRole: user.rol || user.role_id,
  userPermissions: userPermissions.effectivePermissions,
})
```

#### 2. Mensaje de Bienvenida Personalizado

**Mejoras:**
- Usa el primer nombre del usuario
- Saludo según hora del día (Buenos días/tardes/noches)
- Mensaje adaptado según contexto

**Ejemplo:**
```
"Buenos días, Carlos! 👋

Soy tu asistente virtual de Agua Tres Torres..."
```

---

### ⏳ Backend n8n (Pendiente)

Se crearon 3 archivos nuevos con los prompts actualizados:

#### 1. `system-prompt-sql-generator-con-permisos.txt`

**Contenido:**
- Verificación de permisos antes de generar SQL
- Filtrado de columnas financieras según `dashboard.ver_financiero`
- Mensajes de error si faltan permisos
- Todos los ejemplos adaptados a diferentes permisos

**Cambios clave:**
```txt
# CONTEXTO DEL USUARIO
Nombre: {{ $json.body.userName }}
Rol: {{ $json.body.userRole }}
Permisos: {{ JSON.stringify($json.body.userPermissions) }}

# REGLAS DE SEGURIDAD POR PERMISOS
- Si NO tiene "clientes.ver": No generar SQL, responder error
- Si NO tiene "dashboard.ver_financiero": Excluir columnas de precio
- Admin: Acceso total automático
```

#### 2. `system-prompt-response-formatter-personalizado.txt`

**Contenido:**
- Personalización por nombre del usuario
- Tono adaptado según rol:
  - Admin: Ejecutivo y estratégico
  - Operador: Profesional y directo
  - Repartidor: Práctico y claro
- Mantiene reglas anti-alucinación

**Ejemplo:**
```txt
Para admin: "Las ventas alcanzan $2.450.000 con 47 pedidos. Un 12% más vs mes anterior."
Para operador: "5 pedidos pendientes, 23 botellones. Prioriza Las Condes."
Para repartidor: "3 entregas en Las Condes. Primera parada: Av. Apoquindo 4500."
```

#### 3. `INSTRUCCIONES-ACTUALIZAR-N8N-CHATBOT.md`

**Contenido:**
- Guía paso a paso para actualizar n8n
- 4 tests de validación completos
- Matriz de permisos por rol
- Troubleshooting detallado
- Checklist de implementación

---

## 🎯 Cómo Funciona el Sistema

### Flujo Completo

```
1. Usuario escribe mensaje en chatbot
   ↓
2. Frontend obtiene permisos del usuario (getUserPermissions)
   ↓
3. Frontend envía mensaje + permisos a n8n
   ↓
4. SQL Generator verifica permisos
   ↓
5. SQL Generator genera SQL según permisos
   - Admin: SQL completo con precios
   - Sin dashboard.ver_financiero: SQL sin columnas de precio
   - Sin permiso de módulo: Mensaje de error
   ↓
6. PostgreSQL ejecuta SQL
   ↓
7. Response Formatter personaliza respuesta
   - Usa nombre del usuario
   - Adapta tono según rol
   ↓
8. Usuario recibe respuesta personalizada
```

---

## 🔐 Sistema de Permisos Integrado

### Permisos Relevantes para el Chatbot

| Permiso | Descripción | Aplica a |
|---------|-------------|----------|
| `clientes.ver` | Ver información de clientes | Queries de tabla `3t_customers` |
| `pedidos.ver` | Ver pedidos | Queries de tabla `3t_orders` |
| `dashboard.ver_financiero` | Ver información de dinero | Columnas de precio/totales |
| `proveedores.ver` | Ver proveedores | Queries de tabla `3t_suppliers` |
| `compras.ver` | Ver compras | Queries de tabla `3t_purchases` |
| `rutas.ver` | Ver rutas | Queries de entregas/logística |

### Roles y sus Permisos Base

**Admin:**
- Tiene TODOS los permisos automáticamente
- No necesita verificación (rol = 'admin' → acceso total)

**Operador:**
- Tiene: clientes.ver, pedidos.ver, proveedores.ver, compras.ver, rutas.ver
- NO tiene (por defecto): dashboard.ver_financiero
- Puede tener permisos personalizados agregados

**Repartidor:**
- Tiene: pedidos.ver, rutas.ver
- NO tiene: clientes.ver, dashboard.ver_financiero, proveedores.ver, compras.ver
- Enfocado en logística y entregas

---

## 📋 Ejemplos de Uso

### Ejemplo 1: Admin Consulta Ventas

**Usuario:** Carlos (admin)  
**Pregunta:** "¿Cuánto vendimos este mes?"

**Permisos enviados:**
```json
["clientes.ver", "pedidos.ver", "dashboard.ver_financiero", "proveedores.ver", "compras.ver", "rutas.ver"]
```

**SQL Generado:**
```sql
SELECT 
  COUNT(*) AS pedidos,
  SUM(quantity) AS botellones,
  SUM(final_price) AS total_clp  -- ✅ Incluye precios
FROM "3t_orders"
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'Despachado'
LIMIT 1;
```

**Respuesta:**
"Carlos, las ventas del mes alcanzan $2.450.000 con 47 pedidos despachados 📊. Un rendimiento sólido que muestra crecimiento sostenido."

---

### Ejemplo 2: Operador SIN Permiso Financiero

**Usuario:** María (operador)  
**Pregunta:** "¿Cuánto vendimos este mes?"

**Permisos enviados:**
```json
["clientes.ver", "pedidos.ver", "proveedores.ver", "compras.ver", "rutas.ver"]
```
*(Nota: NO incluye dashboard.ver_financiero)*

**SQL Generado:**
```sql
SELECT 
  COUNT(*) AS pedidos,
  SUM(quantity) AS botellones  -- ❌ NO incluye final_price
FROM "3t_orders"
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'Despachado'
LIMIT 1;
```

**Respuesta:**
"Este mes hemos despachado 47 pedidos con un total de 235 botellones 📦. Buen volumen de operaciones, María."

---

### Ejemplo 3: Repartidor Sin Permiso de Clientes

**Usuario:** Juan (repartidor)  
**Pregunta:** "¿Qué clientes tengo en Las Condes?"

**Permisos enviados:**
```json
["pedidos.ver", "rutas.ver"]
```
*(Nota: NO incluye clientes.ver)*

**SQL Generado:**
```
(No se genera SQL)
```

**Respuesta:**
"⚠️ No tienes permiso para consultar información de clientes. ¿Necesitas ayuda con algo relacionado a tus rutas?"

---

### Ejemplo 4: Repartidor Consulta Entregas

**Usuario:** Juan (repartidor)  
**Pregunta:** "¿Qué entregas tengo hoy?"

**Permisos enviados:**
```json
["pedidos.ver", "rutas.ver"]
```

**SQL Generado:**
```sql
SELECT 
  o.order_id,
  c.name AS cliente,  -- ✅ Permitido en contexto de sus entregas
  a.raw_address AS direccion,
  o.quantity
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
LEFT JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id
WHERE o.status = 'Ruta'
  AND o.order_date = CURRENT_DATE
LIMIT 50;
```

**Respuesta:**
"Juan, tienes 3 entregas pendientes para hoy 🚚:

1. **Coca Cola** - Av. Apoquindo 4500, Las Condes (10 botellones)
2. **Nestlé** - Av. Vitacura 2909, Las Condes (5 botellones)
3. **Unilever** - Av. Kennedy 5600, Las Condes (8 botellones)

¡Buena ruta!"

---

## 🔧 Próximos Pasos

### Para Completar la Implementación:

1. **Actualizar n8n** (5-10 minutos)
   - Abrir workflow "Chatbot 3t - SQL"
   - Copiar prompt de SQL Generator
   - Copiar prompt de Response Formatter
   - Guardar y activar

2. **Testing** (15-20 minutos)
   - Probar con usuario admin
   - Probar con usuario operador
   - Probar con usuario repartidor
   - Verificar permisos funcionan correctamente

3. **Validación en Producción** (5 minutos)
   - Probar en https://3t.loopia.cl
   - Verificar diferentes roles
   - Confirmar personalización funciona

---

## 📁 Archivos Creados/Modificados

### Modificados:
- ✅ `/opt/cane/3t/hooks/use-chat.ts` - Hook actualizado con permisos

### Creados:
- ✅ `/opt/cane/3t/system-prompt-sql-generator-con-permisos.txt` - Prompt con permisos
- ✅ `/opt/cane/3t/system-prompt-response-formatter-personalizado.txt` - Prompt personalizado
- ✅ `/opt/cane/3t/INSTRUCCIONES-ACTUALIZAR-N8N-CHATBOT.md` - Guía de implementación
- ✅ `/opt/cane/3t/RESUMEN-CHATBOT-PERSONALIZADO.md` - Este documento

---

## ✅ Beneficios Implementados

### Seguridad
- ✅ Usuarios solo ven información según sus permisos
- ✅ Sin acceso a datos financieros sin permiso
- ✅ Validación en backend (n8n) además de frontend

### Experiencia de Usuario
- ✅ Saludo personalizado con nombre
- ✅ Respuestas adaptadas al rol
- ✅ Tono apropiado según contexto
- ✅ Información relevante para cada usuario

### Mantenibilidad
- ✅ Reutiliza sistema de permisos existente (36 permisos)
- ✅ No duplica lógica de autorización
- ✅ Fácil de agregar nuevos permisos
- ✅ Compatible con permisos personalizados por usuario

---

## 🎓 Lecciones Aprendidas

1. **Reutilizar en lugar de Duplicar:**
   - NO creamos permisos nuevos para el chatbot
   - Usamos los 36 permisos existentes del sistema
   - Un solo punto de verdad para autorización

2. **Personalización Gradual:**
   - Nivel 1: Seguridad (permisos) ✅
   - Nivel 2: UX (nombre, tono) ✅
   - Nivel 3: Preferencias (opcional) ⏸️

3. **Frontend + Backend:**
   - Frontend obtiene permisos (fuente de verdad: BD)
   - Backend valida y filtra (segunda capa de seguridad)
   - Doble validación = más seguro

---

## 📞 Soporte

**Archivos de Referencia:**
- Guía de implementación: `INSTRUCCIONES-ACTUALIZAR-N8N-CHATBOT.md`
- Prompt SQL Generator: `system-prompt-sql-generator-con-permisos.txt`
- Prompt Formatter: `system-prompt-response-formatter-personalizado.txt`

**Si tienes dudas:**
1. Lee la guía de implementación completa
2. Revisa los ejemplos de uso en este documento
3. Consulta la matriz de permisos por rol

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Resumen de Implementación: Chatbot Personalizado**  
**Última actualización:** Octubre 20, 2025

