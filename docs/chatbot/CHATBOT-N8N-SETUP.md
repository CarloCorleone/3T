# 🤖 Guía de Configuración del Chatbot 3t con n8n

**Fecha:** 16 de Octubre, 2025  
**Versión:** 1.0  
**Estado:** Configuración Manual Requerida

---

## 📋 Resumen

Esta guía te ayudará a configurar el workflow de n8n para el chatbot inteligente de Agua Tres Torres. El workflow usa OpenAI GPT-4 con function calling para consultar la base de datos y responder preguntas en lenguaje natural.

---

## ✅ Pre-requisitos

Antes de comenzar, asegúrate de tener:

- ✅ n8n instalado y corriendo en https://n8n.loopia.cl
- ✅ Credencial de OpenAI API configurada en n8n
- ✅ Credencial de Supabase (PostgreSQL) configurada en n8n
- ✅ Frontend desplegado con la variable `NEXT_PUBLIC_N8N_WEBHOOK_URL`

---

## 🔧 Paso 1: Configurar Credenciales en n8n

### Credencial OpenAI API

1. Ve a **Settings → Credentials** en n8n
2. Click en **+ Add Credential**
3. Busca y selecciona **OpenAI API**
4. Nombre: `OpenAI - Chatbot 3t`
5. API Key: Tu clave de OpenAI (comienza con `sk-`)
6. Guarda la credencial

### Credencial PostgreSQL (Supabase)

1. Ve a **Settings → Credentials**
2. Click en **+ Add Credential**
3. Busca y selecciona **Postgres**
4. Nombre: `Supabase - 3t Database`
5. Configuración:
   ```
   Host: api.loopia.cl
   Port: 5432
   Database: postgres
   User: [tu usuario de Supabase]
   Password: [tu contraseña de Supabase]
   SSL: Enable
   ```
6. Probar conexión y guardar

---

## 📝 Paso 2: Crear el Workflow Principal

### Crear Nuevo Workflow

1. Ve a **Workflows** en n8n
2. Click en **+ Create New Workflow**
3. Nombre: `Chatbot 3t - Handler`
4. Descripción: `Chatbot inteligente con OpenAI y function calling para consultas operativas de Agua Tres Torres`
5. Tags: `chatbot`, `3t`, `openai`, `production`

---

## 🎯 Paso 3: Configurar Nodos del Workflow

### Nodo 1: Webhook Trigger

1. Agregar nodo **Webhook**
2. Configuración:
   - HTTP Method: `POST`
   - Path: `3t-chat`
   - Response Mode: `Using 'Respond to Webhook' Node`
   - Authentication: `None` (la validación se hace en el API route de Next.js)
3. Guardar y copiar la **Production Webhook URL**

### Nodo 2: Validar Request

1. Agregar nodo **IF**
2. Conectar desde Webhook
3. Configuración:
   - Condición 1:
     - Value 1: `{{ $json.body.userId }}`
     - Operation: `Is Not Empty`
   - Condición 2 (AND):
     - Value 1: `{{ $json.body.message }}`
     - Operation: `Is Not Empty`
4. Conectar salida **true** al siguiente nodo
5. Conectar salida **false** a un nodo de respuesta de error

### Nodo 3: OpenAI Chat con Function Calling

1. Agregar nodo **OpenAI**
2. Conectar desde IF (salida true)
3. Configuración:
   - Credential: `OpenAI - Chatbot 3t`
   - Resource: `Chat`
   - Operation: `Create`
   - Model: `gpt-4-turbo-preview`
   
4. **System Message** (en Messages):
   ```
   Eres un asistente virtual para Agua Tres Torres, una empresa de distribución de agua purificada en Chile.
   
   Contexto del negocio:
   - Vendemos botellones de agua de 10L y 20L (PC y PET)
   - Tenemos clientes tipo Hogar y Empresa
   - Estados de pedidos: Pedido, Ruta, Despachado
   - Estados de pago: Pendiente, Pagado, Facturado, Interno
   - Trabajamos con proveedores (ej: Minplast, Veolia)
   
   Tu rol:
   - Ayudar a los usuarios a consultar información operativa
   - Responder en español de forma concisa y profesional
   - Usar emojis apropiados (📦, 💰, 📞, etc.)
   - Cuando uses funciones, espera el resultado antes de responder
   - Formatea las respuestas de manera clara y legible
   
   Siempre prioriza la claridad sobre la brevedad.
   ```

5. **User Message** (agregar en Messages):
   ```
   {{ $json.body.message }}
   ```

6. **Functions** (habilitar Function Calling):

   Función 1: **get_orders_by_status**
   ```json
   {
     "name": "get_orders_by_status",
     "description": "Obtiene la lista de pedidos filtrados por su estado. Útil para: '¿cuántos pedidos en ruta?' o '¿pedidos despachados hoy?'",
     "parameters": {
       "type": "object",
       "properties": {
         "status": {
           "type": "string",
           "enum": ["Pedido", "Ruta", "Despachado"],
           "description": "Estado del pedido a filtrar"
         },
         "date_filter": {
           "type": "string",
           "enum": ["today", "this_week", "all"],
           "description": "Filtro temporal: hoy, esta semana, o todos",
           "default": "today"
         }
       },
       "required": ["status"]
     }
   }
   ```

   Función 2: **get_pending_orders_by_supplier**
   ```json
   {
     "name": "get_pending_orders_by_supplier",
     "description": "Obtiene compras pendientes de un proveedor. Útil para: '¿pedidos pendientes de Minplast?'",
     "parameters": {
       "type": "object",
       "properties": {
         "supplier_name": {
           "type": "string",
           "description": "Nombre del proveedor (puede ser parcial)"
         }
       },
       "required": ["supplier_name"]
     }
   }
   ```

   Función 3: **get_customer_contact**
   ```json
   {
     "name": "get_customer_contact",
     "description": "Obtiene información de contacto (teléfono, email, dirección) de un cliente. Útil para: '¿teléfono de Veolia?'",
     "parameters": {
       "type": "object",
       "properties": {
         "customer_name": {
           "type": "string",
           "description": "Nombre del cliente (puede ser parcial)"
         }
       },
       "required": ["customer_name"]
     }
   }
   ```

   Función 4: **get_pending_payments**
   ```json
   {
     "name": "get_pending_payments",
     "description": "Obtiene todos los pedidos con pago pendiente (cuentas por cobrar). Útil para: '¿qué clientes tienen deuda?'",
     "parameters": {
       "type": "object",
       "properties": {
         "customer_name": {
           "type": "string",
           "description": "Opcional: filtrar por cliente específico"
         }
       }
     }
   }
   ```

   Función 5: **get_sales_summary**
   ```json
   {
     "name": "get_sales_summary",
     "description": "Obtiene un resumen de ventas para un periodo. Útil para: '¿cuánto vendí esta semana?'",
     "parameters": {
       "type": "object",
       "properties": {
         "days": {
           "type": "integer",
           "description": "Días hacia atrás (7=semana, 30=mes)",
           "default": 7
         }
       },
       "required": ["days"]
     }
   }
   ```

   Función 6: **update_order_status**
   ```json
   {
     "name": "update_order_status",
     "description": "Actualiza el estado de un pedido. SOLO usar si el usuario confirma explícitamente.",
     "parameters": {
       "type": "object",
       "properties": {
         "order_id": {
           "type": "string",
           "description": "ID del pedido a actualizar"
         },
         "new_status": {
           "type": "string",
           "enum": ["Pedido", "Ruta", "Despachado"],
           "description": "Nuevo estado del pedido"
         }
       },
       "required": ["order_id", "new_status"]
     }
   }
   ```

7. **Options**:
   - Temperature: `0.7`
   - Max Tokens: `500`

### Nodo 4: Switch según Función

1. Agregar nodo **Switch**
2. Conectar desde OpenAI
3. Configuración Mode: `Rules`
4. Reglas (una por cada función):

   - **Regla 1**: `{{ $json.function_call?.name }}` equals `get_orders_by_status`
   - **Regla 2**: `{{ $json.function_call?.name }}` equals `get_pending_orders_by_supplier`
   - **Regla 3**: `{{ $json.function_call?.name }}` equals `get_customer_contact`
   - **Regla 4**: `{{ $json.function_call?.name }}` equals `get_pending_payments`
   - **Regla 5**: `{{ $json.function_call?.name }}` equals `get_sales_summary`
   - **Regla 6**: `{{ $json.function_call?.name }}` equals `update_order_status`

5. Fallback Output: `no_function` (para respuestas directas sin función)

---

## 🗄️ Paso 4: Configurar Nodos SQL

Para cada salida del Switch, crea un nodo **Postgres** con la consulta correspondiente:

### SQL 1: get_orders_by_status

Conectar desde Switch → salida `get_orders_by_status`

```sql
SELECT 
  o.order_id, 
  o.order_date, 
  o.status, 
  o.final_price, 
  o.quantity,
  c.name as customer_name, 
  c.phone as customer_phone,
  a.raw_address, 
  a.commune,
  p.name as product_name
FROM 3t_orders o
LEFT JOIN 3t_customers c ON o.customer_id = c.customer_id
LEFT JOIN 3t_addresses a ON o.delivery_address_id = a.address_id
LEFT JOIN 3t_products p ON o.product_type = p.product_id
WHERE o.status = '{{ $json.function_call.arguments.status }}'
  AND (CASE 
    WHEN '{{ $json.function_call.arguments.date_filter }}' = 'today' 
      THEN o.order_date = CURRENT_DATE
    WHEN '{{ $json.function_call.arguments.date_filter }}' = 'this_week' 
      THEN o.order_date >= CURRENT_DATE - INTERVAL '7 days'
    ELSE TRUE
  END)
ORDER BY o.order_date DESC
LIMIT 50;
```

### SQL 2: get_pending_orders_by_supplier

```sql
SELECT 
  pu.purchase_id, 
  pu.purchase_date, 
  pu.status, 
  pu.final_price,
  s.name as supplier_name, 
  s.phone as supplier_phone,
  sa.raw_address as supplier_address
FROM 3t_purchases pu
LEFT JOIN 3t_suppliers s ON pu.supplier_id = s.supplier_id
LEFT JOIN 3t_supplier_addresses sa ON pu.address_id = sa.address_id
WHERE s.name ILIKE '%{{ $json.function_call.arguments.supplier_name }}%'
  AND pu.status IN ('Pedido', 'Ruta')
ORDER BY pu.purchase_date DESC
LIMIT 20;
```

### SQL 3: get_customer_contact

```sql
SELECT 
  c.customer_id, 
  c.name, 
  c.phone, 
  c.email, 
  c.customer_type,
  a.raw_address, 
  a.commune, 
  a.maps_link
FROM 3t_customers c
LEFT JOIN 3t_addresses a ON c.customer_id = a.customer_id AND a.is_default = true
WHERE c.name ILIKE '%{{ $json.function_call.arguments.customer_name }}%'
ORDER BY c.name
LIMIT 10;
```

### SQL 4: get_pending_payments

```sql
SELECT 
  o.order_id, 
  o.order_date, 
  o.final_price,
  c.name as customer_name, 
  c.phone as customer_phone,
  EXTRACT(DAY FROM CURRENT_DATE - o.order_date) as days_pending
FROM 3t_orders o
LEFT JOIN 3t_customers c ON o.customer_id = c.customer_id
WHERE o.payment_status = 'Pendiente'
  AND (CASE 
    WHEN '{{ $json.function_call.arguments.customer_name }}' != '' 
    THEN c.name ILIKE '%{{ $json.function_call.arguments.customer_name }}%'
    ELSE TRUE
  END)
ORDER BY o.order_date ASC
LIMIT 100;
```

### SQL 5: get_sales_summary

```sql
SELECT 
  COUNT(*) as total_orders,
  SUM(final_price) as total_sales,
  AVG(final_price) as avg_order,
  SUM(quantity) as total_bottles,
  COUNT(DISTINCT customer_id) as unique_customers
FROM 3t_orders
WHERE order_date >= CURRENT_DATE - INTERVAL '{{ $json.function_call.arguments.days }} days'
  AND status = 'Despachado';
```

### SQL 6: update_order_status

```sql
UPDATE 3t_orders 
SET status = '{{ $json.function_call.arguments.new_status }}',
    updated_at = NOW()
WHERE order_id = '{{ $json.function_call.arguments.order_id }}'
RETURNING order_id, status, customer_id;
```

---

## 🔄 Paso 5: Nodo de Formateo de Resultados

Después de todos los nodos SQL, agregar un nodo **Code** (JavaScript):

```javascript
// Formatear resultado de función SQL
const items = $input.all();
const functionCall = items[0].json.function_call;
const functionName = functionCall?.name;

// El resultado SQL viene del nodo anterior
const sqlResult = items[items.length - 1].json;

let formattedResponse = '';
let structuredData = null;

switch(functionName) {
  case 'get_orders_by_status':
    const count = Array.isArray(sqlResult) ? sqlResult.length : 0;
    structuredData = {
      count: count,
      orders: sqlResult || []
    };
    
    formattedResponse = `📦 Encontré ${count} pedido(s) en estado "${functionCall.arguments.status}":\n\n`;
    
    if (count > 0) {
      sqlResult.slice(0, 10).forEach((order, i) => {
        formattedResponse += `${i + 1}. **Pedido ${order.order_id}**\n`;
        formattedResponse += `   Cliente: ${order.customer_name}\n`;
        formattedResponse += `   Dirección: ${order.raw_address}, ${order.commune}\n`;
        formattedResponse += `   Producto: ${order.product_name} (${order.quantity} unidades)\n`;
        formattedResponse += `   Total: $${order.final_price?.toLocaleString('es-CL')}\n`;
        if (order.customer_phone) {
          formattedResponse += `   📞 ${order.customer_phone}\n`;
        }
        formattedResponse += `\n`;
      });
      
      if (count > 10) {
        formattedResponse += `... y ${count - 10} más.\n`;
      }
    }
    break;
    
  case 'get_pending_orders_by_supplier':
    const purchaseCount = Array.isArray(sqlResult) ? sqlResult.length : 0;
    structuredData = {
      count: purchaseCount,
      purchases: sqlResult || []
    };
    
    formattedResponse = `🛒 Encontré ${purchaseCount} compra(s) pendiente(s) de "${functionCall.arguments.supplier_name}":\n\n`;
    
    if (purchaseCount > 0) {
      sqlResult.forEach((purchase, i) => {
        formattedResponse += `${i + 1}. **${purchase.supplier_name}**\n`;
        formattedResponse += `   Compra: ${purchase.purchase_id}\n`;
        formattedResponse += `   Estado: ${purchase.status}\n`;
        formattedResponse += `   Total: $${purchase.final_price?.toLocaleString('es-CL')}\n`;
        if (purchase.supplier_phone) {
          formattedResponse += `   📞 ${purchase.supplier_phone}\n`;
        }
        formattedResponse += `\n`;
      });
    }
    break;
    
  case 'get_customer_contact':
    const customerCount = Array.isArray(sqlResult) ? sqlResult.length : 0;
    structuredData = {
      count: customerCount,
      customers: sqlResult || []
    };
    
    formattedResponse = `📞 Encontré ${customerCount} cliente(s) con "${functionCall.arguments.customer_name}":\n\n`;
    
    if (customerCount > 0) {
      sqlResult.forEach((customer, i) => {
        formattedResponse += `${i + 1}. **${customer.name}**\n`;
        formattedResponse += `   Tipo: ${customer.customer_type}\n`;
        if (customer.phone) {
          formattedResponse += `   📞 ${customer.phone}\n`;
        }
        if (customer.email) {
          formattedResponse += `   📧 ${customer.email}\n`;
        }
        if (customer.raw_address) {
          formattedResponse += `   📍 ${customer.raw_address}, ${customer.commune}\n`;
        }
        formattedResponse += `\n`;
      });
    }
    break;
    
  case 'get_pending_payments':
    const pendingCount = Array.isArray(sqlResult) ? sqlResult.length : 0;
    const totalDebt = sqlResult?.reduce((sum, o) => sum + (parseFloat(o.final_price) || 0), 0) || 0;
    
    structuredData = {
      count: pendingCount,
      total_debt: totalDebt,
      pending: sqlResult || []
    };
    
    formattedResponse = `💰 **Cuentas por Cobrar**\n\n`;
    formattedResponse += `Total de pedidos pendientes: ${pendingCount}\n`;
    formattedResponse += `Monto total: $${totalDebt.toLocaleString('es-CL')}\n\n`;
    
    if (pendingCount > 0) {
      formattedResponse += `Detalle:\n\n`;
      sqlResult.slice(0, 15).forEach((order, i) => {
        formattedResponse += `${i + 1}. **${order.customer_name}**\n`;
        formattedResponse += `   Pedido: ${order.order_id}\n`;
        formattedResponse += `   Fecha: ${order.order_date}\n`;
        formattedResponse += `   Monto: $${order.final_price?.toLocaleString('es-CL')}\n`;
        formattedResponse += `   Días pendiente: ${order.days_pending}\n`;
        if (order.customer_phone) {
          formattedResponse += `   📞 ${order.customer_phone}\n`;
        }
        formattedResponse += `\n`;
      });
      
      if (pendingCount > 15) {
        formattedResponse += `... y ${pendingCount - 15} más.\n`;
      }
    }
    break;
    
  case 'get_sales_summary':
    const summary = sqlResult[0] || {};
    structuredData = {
      total_orders: summary.total_orders || 0,
      total_sales: parseFloat(summary.total_sales) || 0,
      avg_order: Math.round(parseFloat(summary.avg_order) || 0),
      total_bottles: summary.total_bottles || 0,
      unique_customers: summary.unique_customers || 0
    };
    
    const days = functionCall.arguments.days;
    const period = days === 7 ? 'esta semana' : days === 30 ? 'este mes' : `últimos ${days} días`;
    
    formattedResponse = `📊 **Resumen de Ventas** (${period}):\n\n`;
    formattedResponse += `📦 Pedidos despachados: ${structuredData.total_orders}\n`;
    formattedResponse += `💰 Ventas totales: $${structuredData.total_sales.toLocaleString('es-CL')}\n`;
    formattedResponse += `📈 Ticket promedio: $${structuredData.avg_order.toLocaleString('es-CL')}\n`;
    formattedResponse += `🚰 Botellones entregados: ${structuredData.total_bottles}\n`;
    formattedResponse += `👥 Clientes únicos: ${structuredData.unique_customers}\n`;
    break;
    
  case 'update_order_status':
    const updated = sqlResult[0];
    structuredData = {
      success: true,
      order_id: updated?.order_id,
      new_status: updated?.status
    };
    
    formattedResponse = `✅ Pedido **${updated.order_id}** actualizado a estado "${updated.status}" correctamente.`;
    break;
    
  default:
    formattedResponse = 'No se ejecutó ninguna función específica.';
}

return [{
  json: {
    function_result: formattedResponse,
    structured_data: structuredData,
    original_message: items[0].json.body.message
  }
}];
```

---

## ✅ Paso 6: Nodos de Respuesta

### Respond to Webhook (Success)

1. Agregar nodo **Respond to Webhook**
2. Conectar desde el nodo de formateo
3. Conectar también desde la salida `no_function` del Switch
4. Configuración:
   - Respond With: `JSON`
   - Response Body:
     ```json
     {
       "success": true,
       "message": "{{ $json.function_result || $('OpenAI').item.json.choices[0].message.content }}",
       "data": "{{ $json.structured_data }}"
     }
     ```

### Respond to Webhook (Error)

1. Agregar nodo **Respond to Webhook**
2. Conectar desde IF (salida false)
3. Configuración:
   - Respond With: `JSON`
   - Response Code: `400`
   - Response Body:
     ```json
     {
       "success": false,
       "error": "Request inválido. Falta userId o message."
     }
     ```

---

## 🚀 Paso 7: Activar el Workflow

1. Guarda el workflow
2. Click en **Activate** (switch arriba a la derecha)
3. Copia la **Production Webhook URL**
4. Actualiza la variable de entorno en `/opt/cane/env/3t.env`:
   ```
   NEXT_PUBLIC_N8N_WEBHOOK_URL=<tu_webhook_url>
   ```
5. Reinicia la aplicación 3t en modo desarrollo:
   ```bash
   cd /opt/cane/3t
   ./dev.sh
   ```

---

## 🧪 Paso 8: Probar el Chatbot

1. Abre https://dev.3t.loopia.cl
2. Inicia sesión como usuario autenticado
3. Presiona `Ctrl+K` o click en el botón flotante del chatbot
4. Prueba estas consultas:

   ✅ "¿Cuántos pedidos tengo en ruta hoy?"  
   ✅ "¿Qué clientes tienen deuda pendiente?"  
   ✅ "¿Cuál es el teléfono de Veolia?"  
   ✅ "¿Cuánto vendí esta semana?"  
   ✅ "¿Hay compras pendientes de Minplast?"

---

## 🐛 Troubleshooting

### Webhook no responde

- Verifica que el workflow esté **activado**
- Revisa que la URL del webhook esté correcta en el `.env`
- Verifica los logs del workflow en n8n

### Error de autenticación en Postgres

- Verifica la credencial de Supabase
- Prueba la conexión desde el nodo SQL
- Verifica que el usuario tiene permisos de lectura en las tablas `3t_*`

### OpenAI no llama funciones

- Verifica que las funciones estén bien definidas (JSON válido)
- Revisa que el `function_call` esté habilitado en el nodo OpenAI
- Verifica que tu cuenta de OpenAI tenga créditos

### Rate limit en el frontend

- Es normal, el límite es 20 mensajes/minuto
- Espera 1 minuto y vuelve a intentar

---

## 📊 Monitoreo

### Logs en n8n

1. Ve al workflow en n8n
2. Click en **Executions**
3. Revisa las ejecuciones exitosas y fallidas
4. Verifica el tiempo de respuesta (debería ser < 5 segundos)

### Logs en Next.js

```bash
cd /opt/cane/3t
./logs-dev.sh
```

Busca líneas con `/api/chat` para ver las peticiones del chatbot.

---

## 🎯 Mejoras Futuras

- [ ] Agregar más funciones (crear pedidos, ver productos)
- [ ] Implementar caché de respuestas frecuentes
- [ ] Agregar análisis de sentimiento
- [ ] Integrar con WhatsApp Business API
- [ ] Dashboard de métricas del chatbot

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Chatbot Inteligente con n8n y OpenAI GPT-4**  
**Última actualización:** 16 de Octubre, 2025

