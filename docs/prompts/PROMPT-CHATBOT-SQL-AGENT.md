# Context: Experto en Chatbot SQL con IA para Agua Tres Torres

Eres un experto en construir chatbots inteligentes usando n8n con AI Agents (Claude/GPT) y PostgreSQL. Tu misión es crear o mejorar el chatbot de Agua Tres Torres que traduce lenguaje natural → SQL → respuestas formateadas.

## CRÍTICO: Problema Actual del Chatbot

El chatbot existente tiene **resultados muy malos y la automatización no funciona**:
- ❌ Alucinaciones frecuentes (inventa datos que no existen)
- ❌ SQL con errores de sintaxis (olvida comillas dobles en tablas "3t_*")
- ❌ Respuestas genéricas que no usan los datos reales
- ❌ Tools que no se ejecutan correctamente
- ❌ Memoria que no persiste entre sesiones

**Tu objetivo:** Crear un chatbot preciso, confiable y sin alucinaciones.

---

## Detalles de Infraestructura

**Entorno:**
- **n8n:** Auto-hospedado en Docker (red: `cane_net`)
  - Hostname: `n8n` (interno), `n8n.loopia.cl` (externo)
  - Puerto: 5678 (interno)
- **Supabase:** Auto-hospedado en Docker (red: `cane_net`)
  - Hostname: `supabase` (interno), `api.loopia.cl` (externo)
  - Puerto Postgres: 5432
  - Puerto REST API: 3000
- **Aplicación Web (Next.js):** Docker (red: `cane_net`)
  - Hostname: `3t-app` (interno)
  - Puerto: 3002 (interno)
  - Dominio: `https://3t.loopia.cl` (producción), `https://dev.3t.loopia.cl` (desarrollo)

**Configuración de Red Docker:**
```yaml
networks:
  cane_net:
    driver: bridge
    external: true

# Los contenedores se pueden comunicar por hostname:
# - Frontend → n8n: https://n8n.loopia.cl/webhook/[id]
# - n8n → Postgres: supabase:5432
# - n8n → Supabase REST: http://supabase:3000/rest/v1/
```

**Variables de Entorno:**
```bash
# Supabase
SUPABASE_URL=https://api.loopia.cl
SUPABASE_ANON_KEY=eyJhbGci...
POSTGRES_HOST=supabase
POSTGRES_DB=postgres
POSTGRES_USER=postgres

# n8n Chatbot
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.loopia.cl/webhook/3t-chat-v3

# Anthropic (para Claude)
ANTHROPIC_API_KEY=[tu_key]

# OpenAI (si usas GPT)
OPENAI_API_KEY=[tu_key]
```

---

## Contexto del Negocio: Agua Tres Torres

**Empresa:** Distribuidora de agua purificada en botellones (20L)
**Productos:** PC (policarbonato), PET (plástico), Dispensadores
**Clientes:** Hogares y Empresas en Región Metropolitana, Chile
**Operación:** Pedidos → Rutas → Entregas → Pagos

**Consultas Típicas de Usuarios:**
1. "¿Cuántos pedidos tengo en ruta?" (35% de consultas)
2. "¿Qué clientes tienen deuda?" (22%)
3. "Teléfono de [proveedor/cliente]" (18%)
4. "Ventas de hoy/semana/mes" (15%)
5. "Pedidos pendientes de [cliente]" (10%)

---

## Schema de Base de Datos (PostgreSQL)

### ⚠️ REGLA CRÍTICA #1: COMILLAS DOBLES EN TABLAS

**TODAS las tablas empiezan con "3t_" (número) y PostgreSQL REQUIERE comillas dobles:**

```sql
-- ✅ CORRECTO
SELECT * FROM "3t_orders" WHERE status = 'Ruta' LIMIT 10;

-- ❌ INCORRECTO - ERROR: syntax error at or near "3t_orders"
SELECT * FROM 3t_orders WHERE status = 'Ruta' LIMIT 10;
```

**Esta es la causa #1 de errores del chatbot actual.** Si el SQL generado olvida las comillas dobles, la query falla.

### Tablas Principales (Schema Completo para AI)

#### "3t_orders" - Pedidos
```sql
order_id TEXT PK
customer_id TEXT → "3t_customers"
delivery_address_id TEXT → "3t_addresses"
status TEXT ('Pedido', 'Ruta', 'Despachado')
order_type TEXT ('Venta', 'Préstamo')
product_type TEXT
quantity NUMERIC
bottles_delivered NUMERIC
bottles_returned NUMERIC
payment_status TEXT ('Pendiente', 'Pagado', 'Facturado', 'Interno')
payment_type TEXT ('Efectivo', 'Transferencia', 'Débito', 'Crédito')
final_price NUMERIC (CLP)
invoice_number TEXT
order_date DATE
delivered_date DATE
payment_date DATE
delivery_datetime TIMESTAMP
details TEXT
warehouse TEXT
```

#### "3t_customers" - Clientes
```sql
customer_id TEXT PK
name TEXT
business_name TEXT
rut TEXT (RUT chileno)
customer_type TEXT ('Hogar', 'Empresa')
email TEXT
phone TEXT (formato: +56 9 XXXX XXXX)
address_id TEXT → "3t_addresses"
commune TEXT
product_format TEXT ('PC', 'PET')
price NUMERIC
```

#### "3t_addresses" - Direcciones
```sql
address_id TEXT PK
customer_id TEXT → "3t_customers"
raw_address TEXT (dirección completa)
street_name TEXT
street_number INTEGER
apartment TEXT
commune TEXT
region TEXT
directions TEXT
is_default BOOLEAN
latitude NUMERIC
longitude NUMERIC
maps_link TEXT
```

#### "3t_suppliers" - Proveedores
```sql
supplier_id TEXT PK
name TEXT
phone TEXT
email TEXT
observations TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### "3t_purchases" - Compras a Proveedores
```sql
purchase_id TEXT PK
supplier_id TEXT → "3t_suppliers"
address_id UUID
status TEXT ('Pedido', 'Ruta', 'Despachado')
supplier_order_number TEXT
final_price NUMERIC
purchase_date DATE
completed_date DATE
observations TEXT
```

#### "3t_products" - Productos
```sql
product_id TEXT PK
name TEXT
category TEXT
image_url TEXT
price_neto NUMERIC
pv_iva_inc INTEGER
```

### Ejemplos de JOINs Comunes

```sql
-- Pedidos con Cliente y Dirección
SELECT 
  o.order_id,
  c.name AS cliente,
  a.raw_address AS direccion,
  a.commune,
  o.quantity,
  o.final_price
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
LEFT JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id
WHERE o.status = 'Ruta'
ORDER BY o.order_date DESC
LIMIT 50;

-- Cuentas por Cobrar
SELECT 
  c.name,
  c.phone,
  COUNT(o.order_id) AS pedidos,
  SUM(o.final_price) AS deuda
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
WHERE o.payment_status = 'Pendiente'
GROUP BY c.customer_id, c.name, c.phone
ORDER BY deuda DESC
LIMIT 50;

-- Ventas del Mes
SELECT 
  COUNT(*) AS pedidos,
  SUM(quantity) AS botellones,
  SUM(final_price) AS total
FROM "3t_orders"
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'Despachado'
LIMIT 1;
```

---

## Arquitectura Recomendada del Chatbot

### Opción 1: Single-Agent con Tool SQL (Recomendada)

**Ventajas:**
- ✅ Más simple de implementar y debuggear
- ✅ Un solo modelo de IA (Claude Sonnet 4.5)
- ✅ Costo-eficiente
- ✅ Menos puntos de falla

**Flujo:**
```
Usuario → Webhook → Validación
  ↓
Claude Sonnet 4.5 (AI Agent único)
  ├─ System Prompt con Schema Completo (3000 tokens)
  ├─ Chain of Thought methodology
  ├─ 15+ ejemplos few-shot
  └─ Tool: ejecutar_sql (Postgres Node)
  ↓
Postgres Direct Connection
  ↓
Respuesta formateada → Usuario
```

**Nodos (8 total):**
1. Webhook Trigger - POST `/3t-chat-v3`
2. Validar Request (IF Node) - userId y message no vacíos
3. AI Agent - Claude Sonnet 4.5
   - Tool conectado: Postgres Node
   - System Message: ~3000 tokens con schema
4. Postgres Chat Memory - Persistencia de conversación
5. Formatear Respuesta (Code Node)
6. Respond Success

### Opción 2: Dual-Agent (SQL Generator + Formatter)

**Ventajas:**
- ✅ Especialización de tareas
- ✅ SQL Generator sin memoria (stateless)
- ✅ Formatter con reglas anti-alucinación

**Desventajas:**
- ❌ Más complejo
- ❌ Más costoso (2 llamadas a Claude por consulta)
- ❌ Más puntos de falla

**Flujo:**
```
Usuario → Webhook → Validación
  ↓
Claude Principal (Conversacional con Memoria)
  ├─ Decide si necesita consultar DB
  ├─ Marca respuesta con [QUERY_DB]
  ↓
IF Necesita DB?
  ├─ Sí → Claude SQL (Especializado)
  │   ├─ Genera SQL
  │   ├─ Ejecuta Query
  │   ├─ Claude Formatter
  │   └─ Respuesta formateada
  └─ No → Respuesta directa
  ↓
Respuesta final → Usuario
```

**Nodos (13 total):**
1. Webhook Trigger
2. Validar Request
3. Claude Principal (con memoria)
4. Postgres Chat Memory
5. ¿Necesita DB? (Code Node con 2 outputs)
6. Preparar Prompt SQL (Code Node)
7. Claude SQL Generator (sin memoria, temp=0)
8. Extraer SQL Limpio (Code Node)
9. Ejecutar Query (Postgres Node)
10. Formatear Resultados DB (Code Node)
11. Claude Response Formatter
12. Respuesta Final (Code Node)
13. Respond Success

---

## System Prompt Anti-Alucinación (Crítico)

### Para Claude Sonnet 4.5 (SQL Generator)

```
Eres un experto en SQL para PostgreSQL especializado en la base de datos de Agua Tres Torres.

Tu ÚNICA tarea es generar consultas SQL precisas y optimizadas.

# REGLA CRÍTICA: COMILLAS DOBLES
TODAS las tablas empiezan con "3t_" y DEBEN usar comillas dobles:
✅ CORRECTO: SELECT * FROM "3t_orders" WHERE status = 'Ruta' LIMIT 10;
❌ INCORRECTO: SELECT * FROM 3t_orders

# SCHEMA PRINCIPAL

"3t_orders": order_id TEXT, customer_id TEXT, delivery_address_id TEXT, status TEXT ('Pedido', 'Ruta', 'Despachado'), payment_status TEXT ('Pendiente', 'Pagado', 'Facturado'), payment_type TEXT, final_price NUMERIC (CLP), order_date DATE, delivered_date DATE, quantity NUMERIC, details TEXT

"3t_customers": customer_id TEXT, name TEXT, phone TEXT, email TEXT, customer_type TEXT ('Hogar', 'Empresa'), commune TEXT

"3t_addresses": address_id TEXT, customer_id TEXT, raw_address TEXT, commune TEXT, region TEXT

"3t_products": product_id TEXT, name TEXT, category TEXT, price_neto NUMERIC

"3t_suppliers": supplier_id TEXT, name TEXT, phone TEXT, email TEXT

"3t_purchases": purchase_id TEXT, supplier_id TEXT, status TEXT, final_price NUMERIC, purchase_date DATE

# REGLAS SQL
1. SIEMPRE usar comillas dobles: "3t_orders"
2. SIEMPRE agregar LIMIT (máximo 50)
3. Para búsquedas: usar ILIKE (case-insensitive)
4. Fechas actuales: CURRENT_DATE, DATE_TRUNC('month', CURRENT_DATE)
5. Para contar: SELECT COUNT(*) as total FROM ...
6. Para JOINs: usar alias cortos (o, c, a)

# EJEMPLOS (Chain of Thought)

Usuario: "¿Qué pedidos tengo en ruta?"
Razonamiento: Necesito buscar pedidos con status='Ruta', incluir cliente y dirección.
SQL:
SELECT o.order_id, c.name AS cliente, a.raw_address AS direccion, o.quantity
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
LEFT JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id
WHERE o.status = 'Ruta'
ORDER BY o.order_date DESC
LIMIT 50;

Usuario: "¿Qué clientes tienen deuda?"
Razonamiento: Buscar pedidos con payment_status='Pendiente', agrupar por cliente.
SQL:
SELECT c.name, c.phone, COUNT(o.order_id) AS pedidos, SUM(o.final_price) AS deuda
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
WHERE o.payment_status = 'Pendiente'
GROUP BY c.customer_id, c.name, c.phone
ORDER BY deuda DESC
LIMIT 50;

Usuario: "¿Cuánto vendimos este mes?"
Razonamiento: Sumar pedidos despachados del mes actual.
SQL:
SELECT COUNT(*) AS pedidos, SUM(quantity) AS botellones, SUM(final_price) AS total
FROM "3t_orders"
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE) AND status = 'Despachado'
LIMIT 1;

Usuario: "Teléfono de Veolia"
Razonamiento: Buscar en proveedores usando ILIKE.
SQL:
SELECT name, phone, email
FROM "3t_suppliers"
WHERE name ILIKE '%veolia%'
LIMIT 10;

DEVUELVE SOLO EL SQL, sin explicaciones ni markdown.
```

### Para Response Formatter (Anti-Alucinación)

```
ERES UN FORMATEADOR DE DATOS SQL PARA AGUA TRES TORRES.

REGLAS ABSOLUTAS:
1. SOLO usa los datos que están en RESULTADOS DE LA BASE DE DATOS
2. NUNCA INVENTES datos que no estén ahí
3. NUNCA uses tu conocimiento general
4. Si ves {count: "2"}, responde: "Hay 2 resultados"
5. Si ves [], responde: "No se encontró información"
6. Si ves datos de clientes/pedidos, SOLO muestra esos datos específicos

FORMATO:
- Usa emojis: 📦 pedidos, 💰 precios, 📞 teléfonos, 🚚 rutas
- Si hay más de 10 resultados, muestra los primeros 10
- Formatea números con separadores de miles
- Responde en español profesional

EJEMPLO CORRECTO:
Pregunta: "¿Cuántos pedidos en ruta?"
Datos: {count: "2"}
Respuesta: "Actualmente hay 2 pedidos en estado Ruta 🚚"

EJEMPLO INCORRECTO (NO HACER):
Pregunta: "¿Cuántos pedidos en ruta?"
Datos: {count: "2"}
Respuesta: "Hay productos Classic Cars, Motorcycles..." ❌ ESTO ES INVENTAR DATOS
```

---

## Configuración de Nodos Críticos

### 1. Webhook Trigger
```yaml
Type: n8n-nodes-base.webhook
Method: POST
Path: /3t-chat-v3
Response Mode: responseNode
Authentication: None (se maneja en frontend con JWT)
```

### 2. Validar Request (IF Node)
```javascript
Condition 1: {{ $json.body.userId }} - is not empty
Condition 2: {{ $json.body.message }} - is not empty
Combinator: AND
```

### 3. AI Agent - Claude Sonnet 4.5
```yaml
Type: @n8n/n8n-nodes-langchain.agent
Model: Claude Sonnet 4.5 (claude-sonnet-4-20250514)
Temperature: 0 (máxima precisión para SQL)
Max Tokens: 1000

Prompt: ={{ $json.body.message }}
System Message: [Usar el prompt anti-alucinación de arriba]

Tools Conectados:
  - Postgres Node (ejecutar_sql)
  
Memory Conectado:
  - Postgres Chat Memory
```

### 4. Postgres Node (Como AI Tool)
```yaml
Type: n8n-nodes-base.postgres
Operation: executeQuery
Query: ={{ $json.query }}

Credential:
  Host: supabase
  Port: 5432
  Database: postgres
  User: postgres
  SSL: Disable (red interna)

⚠️ IMPORTANTE: Configurar "Description for AI":
"Ejecuta consultas SQL SELECT en la base de datos de Agua Tres Torres (3t).

Parámetro requerido:
- query (string): Consulta SQL válida (solo SELECT)

IMPORTANTE: Todas las tablas empiezan con "3t_" y DEBEN usar comillas dobles.
Ejemplo: SELECT * FROM \"3t_orders\" LIMIT 10;

Esta herramienta devuelve resultados en formato JSON."
```

### 5. Postgres Chat Memory
```yaml
Type: @n8n/n8n-nodes-langchain.memoryPostgresChat
Table Name: 3t_chatbot_memory
Session ID Type: From Input
Session Key: ={{ $json.body.sessionId }}
Context Window Length: 10
TTL: 1800 (30 minutos)

Credential: Supabase PostgreSQL - 3t
```

**Tabla necesaria (crear si no existe):**
```sql
CREATE TABLE IF NOT EXISTS "3t_chatbot_memory" (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chatbot_session ON "3t_chatbot_memory"(session_id);
```

### 6. Formatear Respuesta (Code Node)
```javascript
// Extraer output del AI Agent
const agentResponse = $('AI Agent - Claude Sonnet 4.5').first().json;

let response = '';
if (agentResponse.output) {
  response = agentResponse.output;
} else if (agentResponse.text) {
  response = agentResponse.text;
} else {
  response = 'No se pudo procesar la consulta. Por favor intenta de nuevo.';
}

return [{
  json: {
    response: response,
    timestamp: new Date().toISOString(),
    success: true,
    userId: $json.body.userId,
    sessionId: $json.body.sessionId
  }
}];
```

### 7. Respond Success
```yaml
Type: n8n-nodes-base.respondToWebhook
Response Body Type: JSON
Response Body: ={{ $json }}
HTTP Status Code: 200
```

---

## Problemas Comunes y Soluciones

### Problema 1: Claude olvida comillas dobles
**Causa:** Prompt no enfatiza suficientemente la regla
**Solución:** 
- Mencionar regla 5+ veces en el prompt
- Incluir ejemplos CORRECTOS e INCORRECTOS
- Usar emojis ✅❌ para destacar

### Problema 2: Claude alucina datos
**Causa:** No tiene instrucciones explícitas de NO INVENTAR
**Solución:**
- System message con REGLAS ABSOLUTAS
- Incluir ejemplo de alucinación (qué NO hacer)
- Temperatura 0 para SQL, temperatura 0.3 para formateo

### Problema 3: Tool SQL no se ejecuta
**Causa:** Falta "Description for AI" en nodo Postgres
**Solución:**
- Agregar descripción clara del tool
- Incluir ejemplo de parámetro `query`
- Especificar formato esperado

### Problema 4: Workflow se detiene sin resultados
**Causa:** n8n detiene ejecución si nodo no devuelve datos
**Solución:**
- Agregar Code Node "Check Results" que SIEMPRE devuelve algo
- Si array vacío, devolver `{ results: [], count: 0 }`

### Problema 5: Memoria no persiste
**Causa:** Tabla `3t_chatbot_memory` no existe o sin Session ID
**Solución:**
- Crear tabla con índice en `session_id`
- Validar que frontend envía `sessionId` consistente
- TTL configurado para limpiar sesiones antiguas

### Problema 6: SQL con markdown (```sql)
**Causa:** Claude envuelve código en bloques markdown
**Solución:**
- Code Node "Clean SQL" con regex:
  ```javascript
  let sql = $json.sql;
  sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
  if (!sql.toUpperCase().startsWith('SELECT')) {
    throw new Error('Solo SELECT permitido');
  }
  return [{ json: { query: sql } }];
  ```

---

## Validación del Chatbot

### Pre-Deployment Checklist

- [ ] System prompt incluye schema completo con comillas dobles
- [ ] Postgres Node tiene "Description for AI" configurada
- [ ] Tabla `3t_chatbot_memory` creada con índices
- [ ] Credencial Postgres configurada (host: `supabase`)
- [ ] Error handling en nodos críticos
- [ ] Timeout configurado (30s máximo)

### Testing

**Test 1: Consulta Simple**
```json
POST https://n8n.loopia.cl/webhook/3t-chat-v3
{
  "userId": "test-user",
  "sessionId": "test-session-123",
  "message": "¿Cuántos pedidos tengo en ruta?"
}
```

**Esperado:**
- SQL generado: `SELECT COUNT(*) FROM "3t_orders" WHERE status = 'Ruta';`
- Respuesta: "🚚 Actualmente tienes X pedidos en ruta."

**Test 2: Consulta con JOIN**
```json
{
  "message": "¿Qué clientes tienen deuda?"
}
```

**Esperado:**
- SQL con JOIN entre "3t_orders" y "3t_customers"
- Comillas dobles en ambas tablas
- LIMIT agregado
- Respuesta con nombres y montos

**Test 3: Búsqueda de Contacto**
```json
{
  "message": "Teléfono de Minplast"
}
```

**Esperado:**
- SQL con ILIKE: `WHERE name ILIKE '%minplast%'`
- Respuesta: "📞 El teléfono de Minplast es +56..."

**Test 4: Sin Resultados**
```json
{
  "message": "Pedidos de cliente inexistente XYZ"
}
```

**Esperado:**
- No debe alucinar
- Respuesta: "No encontré información sobre..."

**Test 5: Memoria Persistente**
```json
// Mensaje 1
{
  "sessionId": "persistent-session",
  "message": "Hola, soy Carlo"
}

// Mensaje 2 (misma sesión)
{
  "sessionId": "persistent-session",
  "message": "¿Recuerdas mi nombre?"
}
```

**Esperado:**
- Segunda respuesta menciona "Carlo"
- Datos en tabla `3t_chatbot_memory`

---

## Métricas de Éxito

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| **Precisión SQL** | > 95% | SQL válido sin errores de sintaxis |
| **Sin alucinaciones** | 100% | Solo usar datos reales de DB |
| **Latencia** | < 3s | Tiempo total de respuesta |
| **Tasa de éxito** | > 98% | Consultas procesadas sin error |
| **Costo por consulta** | < $0.005 USD | Claude input + output tokens |

---

## Output Format Requerido

Proporciona:

1. **JSON completo del workflow** listo para importar a n8n
2. **Explicación nodo por nodo** con configuración específica
3. **System prompts completos** (SQL Generator y Formatter)
4. **SQL para crear tabla de memoria** si no existe
5. **Comandos de test con curl** para cada caso de uso
6. **Troubleshooting guide** para problemas comunes
7. **Métricas de performance** esperadas

---

## Ejemplo de Workflow Completo (Single-Agent)

```json
{
  "name": "Chatbot 3t - Claude SQL Agent v3",
  "nodes": [
    {
      "parameters": {
        "path": "3t-chat-v3",
        "httpMethod": "POST",
        "responseMode": "responseNode"
      },
      "name": "Webhook - 3t Chat v3",
      "type": "n8n-nodes-base.webhook",
      "position": [240, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            { "value1": "={{ $json.body.userId }}", "operation": "isNotEmpty" },
            { "value1": "={{ $json.body.message }}", "operation": "isNotEmpty" }
          ]
        },
        "combineOperation": "all"
      },
      "name": "Validar Request",
      "type": "n8n-nodes-base.if",
      "position": [440, 300]
    },
    {
      "parameters": {
        "model": "claude-sonnet-4-20250514",
        "options": {
          "temperature": 0,
          "maxTokens": 1000,
          "systemMessage": "[USAR SYSTEM PROMPT COMPLETO DE ARRIBA]"
        }
      },
      "name": "Claude Sonnet 4.5",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "position": [640, 300],
      "credentials": {
        "anthropicApi": { "name": "Anthropic API" }
      }
    },
    {
      "parameters": {
        "tableName": "3t_chatbot_memory",
        "sessionIdType": "fromInput",
        "sessionKey": "={{ $json.body.sessionId }}",
        "contextWindowLength": 10
      },
      "name": "Postgres Chat Memory",
      "type": "@n8n/n8n-nodes-langchain.memoryPostgresChat",
      "position": [640, 480],
      "credentials": {
        "postgres": { "name": "Supabase PostgreSQL - 3t" }
      }
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "={{ $json.query }}"
      },
      "name": "Ejecutar SQL",
      "type": "n8n-nodes-base.postgres",
      "position": [840, 300],
      "credentials": {
        "postgres": { "name": "Supabase PostgreSQL - 3t" }
      }
    },
    {
      "parameters": {
        "prompt": "={{ $json.body.message }}"
      },
      "name": "AI Agent - Chatbot 3t",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "position": [640, 300]
    },
    {
      "parameters": {
        "jsCode": "[CÓDIGO DE FORMATEAR RESPUESTA]"
      },
      "name": "Formatear Respuesta",
      "type": "n8n-nodes-base.code",
      "position": [840, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}"
      },
      "name": "Respond Success",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [1040, 300]
    }
  ],
  "connections": {
    "Webhook - 3t Chat v3": {
      "main": [[{ "node": "Validar Request" }]]
    },
    "Validar Request": {
      "main": [[{ "node": "AI Agent - Chatbot 3t" }]]
    },
    "Claude Sonnet 4.5": {
      "ai_languageModel": [[{ "node": "AI Agent - Chatbot 3t" }]]
    },
    "Postgres Chat Memory": {
      "ai_memory": [[{ "node": "AI Agent - Chatbot 3t" }]]
    },
    "Ejecutar SQL": {
      "ai_tool": [[{ "node": "AI Agent - Chatbot 3t" }]]
    },
    "AI Agent - Chatbot 3t": {
      "main": [[{ "node": "Formatear Respuesta" }]]
    },
    "Formatear Respuesta": {
      "main": [[{ "node": "Respond Success" }]]
    }
  }
}
```

---

## Comenzar Ahora

Para crear o mejorar el chatbot:

1. Revisa el workflow existente (ID: `EjwiqmXCMTk6pDlA` o `0IW1ENc7Ckc0Rfa5`)
2. Identifica los problemas específicos (SQL sin comillas, alucinaciones, etc.)
3. Usa la arquitectura Single-Agent recomendada
4. Implementa los System Prompts anti-alucinación
5. Valida con los 5 tests críticos
6. Monitorea métricas de precisión

**Recuerda:**
- Comillas dobles en TODAS las tablas "3t_*" (causa #1 de errores)
- NUNCA INVENTAR datos (usar REGLAS ABSOLUTAS)
- Chain of Thought en ejemplos
- Temperature 0 para SQL
- Tool description clara y completa

**¡Listo para crear un chatbot preciso y confiable!**


