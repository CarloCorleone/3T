# 📋 Instrucciones para Actualizar Workflow n8n - Chatbot Personalizado

**Fecha:** Octubre 20, 2025  
**Workflow:** Chatbot 3t - SQL (v5)  
**Objetivo:** Agregar personalización por permisos y usuario

---

## ✅ Cambios Completados en Frontend

- ✅ Modificado `hooks/use-chat.ts` para enviar permisos del usuario
- ✅ Agregado saludo personalizado con nombre y hora del día
- ✅ Frontend ahora envía en cada mensaje:
  - `userName`: Nombre del usuario
  - `userRole`: Rol (admin, operador, repartidor)
  - `userPermissions`: Array de permisos efectivos

---

## 🔧 Cambios Requeridos en n8n

### Paso 1: Acceder al Workflow

1. Abrir n8n: https://n8n.loopia.cl
2. Buscar workflow: "Chatbot 3t - SQL" (v5)
3. Hacer click en "Edit Workflow"

---

### Paso 2: Actualizar Nodo "AI Agent - SQL Generator"

**Ubicación:** Nodo que genera el SQL

**Qué hacer:**
1. Hacer click en el nodo "AI Agent - SQL Generator"
2. Buscar el campo "System Message" o "System Prompt"
3. Reemplazar el contenido completo con el nuevo prompt

**Archivo fuente:** `/opt/cane/3t/system-prompt-sql-generator-con-permisos.txt`

**Cambios principales:**
- Agrega verificación de permisos antes de generar SQL
- Filtra columnas financieras según permiso `dashboard.ver_financiero`
- Responde con mensaje de error si falta permiso necesario
- Mantiene toda la lógica existente de comillas dobles y schema

**Nuevo contenido del prompt:**
```
[Copiar contenido completo del archivo system-prompt-sql-generator-con-permisos.txt]
```

**Variables n8n a usar en el prompt:**
- `{{ $json.body.userName }}` - Nombre del usuario
- `{{ $json.body.userRole }}` - Rol del usuario
- `{{ JSON.stringify($json.body.userPermissions) }}` - Array de permisos

---

### Paso 3: Actualizar Nodo "AI Agent - Response Formatter"

**Ubicación:** Nodo que formatea las respuestas

**Qué hacer:**
1. Hacer click en el nodo "AI Agent1 - Response Formatter"
2. Buscar el campo "System Message" o "System Prompt"
3. Reemplazar el contenido completo con el nuevo prompt

**Archivo fuente:** `/opt/cane/3t/system-prompt-response-formatter-personalizado.txt`

**Cambios principales:**
- Usa el nombre del usuario en respuestas naturales
- Adapta el tono según el rol (admin: ejecutivo, operador: profesional, repartidor: práctico)
- Mantiene las reglas anti-alucinación existentes
- Personaliza ejemplos y contexto

**Nuevo contenido del prompt:**
```
[Copiar contenido completo del archivo system-prompt-response-formatter-personalizado.txt]
```

**Variables n8n a usar en el prompt:**
- `{{ $json.body.userName }}` - Para personalizar respuestas
- `{{ $json.body.userRole }}` - Para adaptar el tono

---

### Paso 4: Verificar Webhook

**Ubicación:** Nodo "Webhook - 3t Chat"

**Verificar que el webhook reciba:**
- ✅ `message` (String)
- ✅ `userId` (String)
- ✅ `sessionId` (String)
- ✅ `userName` (String) - **NUEVO**
- ✅ `userRole` (String) - **NUEVO**
- ✅ `userPermissions` (Array) - **NUEVO**

**No se necesita cambiar nada en el webhook**, solo asegurarse que los nuevos campos lleguen correctamente.

---

### Paso 5: Guardar y Activar

1. Click en "Save" (arriba a la derecha)
2. Asegurarse que el workflow esté "Active"
3. Verificar URL del webhook: `https://n8n.loopia.cl/webhook/chat-3t`

---

## 🧪 Testing

### Test 1: Usuario Admin

**Request:**
```json
{
  "message": "¿Cuánto vendimos este mes?",
  "userId": "uuid-admin",
  "sessionId": "session-123",
  "userName": "Carlos Admin",
  "userRole": "admin",
  "userPermissions": ["dashboard.ver", "dashboard.ver_financiero", "pedidos.ver"]
}
```

**Esperado:**
- Debe generar SQL con columna `final_price`
- Respuesta debe incluir totales en CLP
- Tono ejecutivo con análisis

---

### Test 2: Usuario Operador SIN Permiso Financiero

**Request:**
```json
{
  "message": "¿Cuánto vendimos este mes?",
  "userId": "uuid-operador",
  "sessionId": "session-456",
  "userName": "María Operadora",
  "userRole": "operador",
  "userPermissions": ["dashboard.ver", "pedidos.ver", "clientes.ver"]
}
```

**Esperado:**
- SQL SIN columna `final_price` (solo conteos y cantidades)
- Respuesta: "X pedidos con Y botellones" (sin mencionar dinero)
- Tono profesional directo

---

### Test 3: Usuario SIN Permiso de Clientes

**Request:**
```json
{
  "message": "¿Qué clientes tengo en Las Condes?",
  "userId": "uuid-repartidor",
  "sessionId": "session-789",
  "userName": "Juan Repartidor",
  "userRole": "repartidor",
  "userPermissions": ["pedidos.ver", "rutas.ver"]
}
```

**Esperado:**
- NO debe generar SQL
- Respuesta: "⚠️ No tienes permiso para consultar información de clientes"

---

### Test 4: Usuario Repartidor con Permisos

**Request:**
```json
{
  "message": "¿Qué entregas tengo hoy?",
  "userId": "uuid-repartidor",
  "sessionId": "session-789",
  "userName": "Juan",
  "userRole": "repartidor",
  "userPermissions": ["pedidos.ver", "rutas.ver"]
}
```

**Esperado:**
- SQL con pedidos en estado 'Ruta' para hoy
- Respuesta práctica: "Juan, tienes X entregas..." con direcciones
- Tono práctico y claro

---

## 🔍 Verificación de Permisos por Módulo

### Clientes
- Permiso requerido: `clientes.ver`
- Columnas protegidas: todas las de la tabla `3t_customers` y `3t_addresses`

### Pedidos
- Permiso requerido: `pedidos.ver`
- Columnas protegidas: todas las de `3t_orders` (excepto precios, ver abajo)

### Financiero
- Permiso requerido: `dashboard.ver_financiero`
- Columnas protegidas:
  - `final_price` en `3t_orders`
  - `price` en `3t_customers`
  - `price_neto`, `pv_iva_inc` en `3t_products`
  - `final_price` en `3t_purchases`
  - Cualquier SUM() o AVG() de columnas de precio

### Proveedores
- Permiso requerido: `proveedores.ver`
- Columnas protegidas: todas las de `3t_suppliers`

### Compras
- Permiso requerido: `compras.ver`
- Columnas protegidas: todas las de `3t_purchases`

### Rutas
- Permiso requerido: `rutas.ver`
- Aplica a consultas sobre estados 'Ruta' y optimización

---

## 📊 Matriz de Permisos por Rol

| Rol | clientes.ver | pedidos.ver | dashboard.ver_financiero | proveedores.ver | compras.ver | rutas.ver |
|-----|--------------|-------------|--------------------------|-----------------|-------------|-----------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Operador** | ✅ | ✅ | ❌* | ✅ | ✅ | ✅ |
| **Repartidor** | ❌* | ✅ | ❌ | ❌ | ❌ | ✅ |

*Puede variar según permisos personalizados otorgados al usuario específico

---

## 🚨 Troubleshooting

### Problema: El chatbot no respeta permisos

**Solución:**
1. Verificar que el frontend esté enviando `userPermissions` en el body
2. Abrir n8n → Executions → Ver última ejecución
3. Verificar que `$json.body.userPermissions` tenga datos
4. Revisar el System Prompt del SQL Generator

### Problema: Error "Cannot read property 'userName'"

**Solución:**
1. Verificar versión del frontend (debe tener cambios del 20/10/2025)
2. Hacer hard refresh del navegador (Ctrl+Shift+R)
3. Verificar que el hook `use-chat.ts` esté actualizado

### Problema: Respuestas sin personalización

**Solución:**
1. Verificar que el Response Formatter tenga el prompt actualizado
2. Verificar que use las variables `{{ $json.body.userName }}` y `{{ $json.body.userRole }}`
3. Probar con diferentes roles para ver diferencias

---

## 📝 Notas Importantes

1. **NO modificar la estructura del workflow**, solo los System Prompts
2. **NO cambiar los nombres de los nodos**
3. **NO modificar el webhook URL**
4. **Hacer backup del workflow antes de modificar** (Export Workflow)
5. Los permisos son verificados en el **frontend** (al obtenerlos de la BD) y **validados en n8n** (al generar SQL)
6. El sistema es **compatible con permisos personalizados** por usuario (tabla `3t_user_permissions`)

---

## ✅ Checklist de Implementación

- [ ] Leer este documento completo
- [ ] Hacer backup del workflow actual en n8n
- [ ] Actualizar System Prompt del SQL Generator
- [ ] Actualizar System Prompt del Response Formatter
- [ ] Guardar y activar workflow
- [ ] Ejecutar los 4 tests de validación
- [ ] Verificar que cada rol vea información apropiada
- [ ] Documentar cualquier problema encontrado

---

## 📞 Soporte

Si encuentras problemas durante la implementación:

1. **Revisar logs de n8n:**
   - n8n → Executions → Ver ejecuciones fallidas
   - Buscar errores en nodos específicos

2. **Revisar logs del frontend:**
   - Consola del navegador (F12)
   - Buscar errores en `use-chat.ts`

3. **Verificar permisos en BD:**
   ```sql
   -- Ver permisos de un usuario
   SELECT * FROM "3t_user_permissions" WHERE user_id = 'uuid-usuario';
   
   -- Ver permisos del rol operador
   SELECT * FROM "3t_role_permissions" WHERE role_id = 'operador';
   ```

4. **Rollback si es necesario:**
   - Restaurar backup del workflow en n8n
   - Revertir cambios en `hooks/use-chat.ts` usando git

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación de Actualización n8n - Chatbot Personalizado**  
**Última actualización:** Octubre 20, 2025

