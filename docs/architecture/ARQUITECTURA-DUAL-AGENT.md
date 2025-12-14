# 🤖🤖 Arquitectura Dual-Agent - Chatbot 3t

**Fecha:** Octubre 17, 2025  
**Enfoque:** Dos Claudes especializados trabajando juntos

---

## 🎯 Concepto

En lugar de un solo AI Agent con tools problemáticos, usamos **dos Claude independientes**:

1. **Claude Principal** (Conversacional)
   - Mantiene memoria del chat
   - Decide si necesita consultar DB
   - Formatea respuesta final al usuario

2. **Claude SQL** (Especializado)
   - Sin memoria (stateless)
   - SOLO genera SQL
   - Conoce schema completo

---

## 📊 Flujo Completo

```
Usuario: "¿Qué pedidos tengo en ruta?"
  ↓
[Chat Trigger] → recibe mensaje
  ↓
[Claude Principal + Memoria]
  → Analiza: "Necesito consultar tabla 3t_orders"
  → Marca: [QUERY_DB] en su respuesta
  ↓
[Code: ¿Necesita DB?]
  → Detecta [QUERY_DB]
  → Sí → va a branch SQL
  → No → respuesta directa
  ↓
[Code: Prepara Prompt SQL]
  → Extrae pregunta original
  → Carga system prompt con schema
  ↓
[Claude SQL]
  → Recibe: "pedidos en ruta"
  → Genera: SELECT ... FROM "3t_orders" WHERE status = 'Ruta' LIMIT 10;
  ↓
[Code: Extrae SQL Limpio]
  → Remueve markdown
  → Valida que sea SELECT
  ↓
[Postgres: Ejecuta Query]
  → Ejecuta SQL
  → Devuelve resultados
  ↓
[Code: Formatea Resultados]
  → Convierte JSON a texto legible
  ↓
[Claude Principal (de nuevo)]
  → Recibe resultados
  → Formatea en lenguaje natural
  → "🚚 Tienes 2 pedidos en ruta: ..."
  ↓
[Respuesta Final] → Usuario
```

---

## 🔧 Implementación en n8n

### Nodos Requeridos (13 total)

#### 1. When chat message received
```yaml
Type: @n8n/n8n-nodes-langchain.chatTrigger
Position: Inicio
```

#### 2. Claude Principal (Conversacional)
```yaml
Type: @n8n/n8n-nodes-langchain.lmChatAnthropic
Model: claude-sonnet-4-5-20250929
Temperature: 0.7
Max Tokens: 1000
Credential: Anthropic account

System Message:
```
Eres el asistente principal de Agua Tres Torres. Tu función es conversar con usuarios y ayudarlos con información de la empresa.

Cuando el usuario pregunte por datos específicos (pedidos, clientes, ventas, etc.), responde EXACTAMENTE así:

"[QUERY_DB] [descripción breve de lo que necesitas consultar]"

Ejemplos:
- Usuario: "¿Qué pedidos tengo en ruta?" 
  Tú: "[QUERY_DB] Necesito consultar pedidos con status='Ruta'"
  
- Usuario: "¿Cuánto vendimos este mes?"
  Tú: "[QUERY_DB] Necesito sumar ventas del mes actual"

- Usuario: "Hola, ¿cómo estás?"
  Tú: "¡Hola! Estoy bien, gracias. ¿En qué puedo ayudarte hoy? 😊"

Si NO necesitas consultar la base de datos, responde normalmente.
```
```

Conectar a: Postgres Chat Memory (ai_memory)

#### 3. Postgres Chat Memory
```yaml
Type: @n8n/n8n-nodes-langchain.memoryPostgresChat
Credential: Supabase PostgreSQL - 3t
Table Name: n8n_chat_histories
Session ID Type: From Input
Session Key: ={{ $json.sessionId }}
Context Window Length: 10
```

Conectar a: Claude Principal (ai_memory port)

#### 4. ¿Necesita consultar DB? (Code)
```javascript
// Determinar si Claude Principal necesita consultar la base de datos
const userMessage = $input.first().json.chatInput;
const claudeResponse = $('Claude Principal (Conversacional)').first().json;

// Extraer output de Claude
let claudeOutput = '';
if (claudeResponse.output) {
  claudeOutput = claudeResponse.output;
} else if (claudeResponse.text) {
  claudeOutput = claudeResponse.text;
} else if (typeof claudeResponse === 'string') {
  claudeOutput = claudeResponse;
}

// Buscar si Claude menciona que necesita consultar DB
const needsDBQuery = claudeOutput.includes('[QUERY_DB]');

if (needsDBQuery) {
  // Claude necesita consultar - pasar a branch SQL (output 0)
  return [[{
    json: {
      originalMessage: userMessage,
      claudeContext: claudeOutput,
      needsDB: true
    }
  }]];
} else {
  // Claude puede responder directamente - ir a respuesta final (output 1)
  return [null, [{
    json: {
      response: claudeOutput,
      needsDB: false,
      chatInput: userMessage
    }
  }]];
}
```

**IMPORTANTE:** Este nodo tiene **2 outputs**:
- Output 0 → va a "Preparar Prompt SQL"
- Output 1 → va directo a "Respuesta Final"

#### 5. Preparar Prompt SQL (Code)
```javascript
// Preparar prompt para Claude SQL
const userMessage = $input.first().json.originalMessage;

const sqlSystemPrompt = `Eres un experto en SQL para PostgreSQL especializado en la base de datos de Agua Tres Torres.

Tu ÚNICA tarea es generar consultas SQL precisas y optimizadas.

# REGLA CRÍTICA: COMILLAS DOBLES
TODAS las tablas empiezan con "3t_" y DEBEN usar comillas dobles:
✅ CORRECTO: SELECT * FROM "3t_orders" WHERE status = 'Ruta' LIMIT 10;
❌ INCORRECTO: SELECT * FROM 3t_orders

# SCHEMA PRINCIPAL

"3t_orders": order_id TEXT, customer_id TEXT, delivery_address_id TEXT, status TEXT ('Pedido', 'Ruta', 'Despachado'), payment_status TEXT ('Pendiente', 'Pagado'), payment_type TEXT, final_price NUMERIC (CLP), order_date DATE, delivered_date DATE, quantity NUMERIC, details TEXT

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

# EJEMPLOS

Pedidos en ruta:
SELECT o.order_id, c.name AS cliente, a.raw_address AS direccion, o.quantity
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
LEFT JOIN "3t_addresses" a ON o.delivery_address_id = a.address_id
WHERE o.status = 'Ruta'
ORDER BY o.order_date DESC LIMIT 50;

Cuentas por cobrar:
SELECT c.name, c.phone, COUNT(o.order_id) AS pedidos, SUM(o.final_price) AS deuda
FROM "3t_orders" o
JOIN "3t_customers" c ON o.customer_id = c.customer_id
WHERE o.payment_status = 'Pendiente'
GROUP BY c.customer_id, c.name, c.phone
ORDER BY deuda DESC LIMIT 50;

Ventas del mes:
SELECT COUNT(*) AS pedidos, SUM(quantity) AS botellones, SUM(final_price) AS total
FROM "3t_orders"
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE) AND status = 'Despachado'
LIMIT 1;

DEVUELVE SOLO EL SQL, sin explicaciones ni markdown.`;

return [{
  json: {
    userMessage: userMessage,
    sqlSystemPrompt: sqlSystemPrompt,
    chatInput: userMessage
  }
}];
```

#### 6. Claude SQL (Especializado)
```yaml
Type: @n8n/n8n-nodes-langchain.lmChatAnthropic
Model: claude-sonnet-4-5-20250929
Temperature: 0 (importante para SQL consistente)
Max Tokens: 500
Credential: Anthropic account

Prompt: ={{ $json.chatInput }}

System Message: ={{ $json.sqlSystemPrompt }}
```

**SIN memoria** - este Claude es stateless

#### 7. Extraer SQL Limpio (Code)
```javascript
// Extraer SQL limpio del output de Claude SQL
const claudeSQLOutput = $input.first().json;

let sqlQuery = '';

// Extraer texto del output de Claude
if (claudeSQLOutput.output) {
  sqlQuery = claudeSQLOutput.output;
} else if (claudeSQLOutput.text) {
  sqlQuery = claudeSQLOutput.text;
} else if (typeof claudeSQLOutput === 'string') {
  sqlQuery = claudeSQLOutput;
}

sqlQuery = sqlQuery.trim();

// Remover bloques de código markdown si existen
const sqlMatch = sqlQuery.match(/```sql\n([\s\S]*?)\n```/) || 
                 sqlQuery.match(/```([\s\S]*?)```/);

if (sqlMatch) {
  sqlQuery = sqlMatch[1].trim();
}

// Limpiar comentarios SQL
sqlQuery = sqlQuery.replace(/^\/\*.*?\*\//gm, '').trim();
sqlQuery = sqlQuery.replace(/^--.*$/gm, '').trim();

// Validar que sea SELECT (seguridad básica)
const firstWord = sqlQuery.split(/\s+/)[0].toUpperCase();
if (!['SELECT', 'WITH'].includes(firstWord)) {
  throw new Error(`Solo se permiten consultas SELECT. Recibido: ${firstWord}`);
}

return [{
  json: {
    query: sqlQuery,
    originalOutput: claudeSQLOutput
  }
}];
```

#### 8. Ejecutar Query (Postgres)
```yaml
Type: n8n-nodes-base.postgres
Credential: Supabase PostgreSQL - 3t
Operation: Execute Query
Query: ={{ $json.query }}
```

#### 9. Formatear Resultados DB (Code)
```javascript
// Formatear resultados para Claude Principal
const sqlResults = $input.all();
const originalMessage = $('¿Necesita consultar DB?').first().json.originalMessage;
const executedQuery = $('Extraer SQL Limpio').first().json.query;

let formattedResults = '';

if (sqlResults.length === 0) {
  formattedResults = 'No se encontraron resultados.';
} else if (sqlResults.length === 1 && sqlResults[0].json.count !== undefined) {
  // Es un COUNT
  formattedResults = `Total: ${sqlResults[0].json.count}`;
} else if (sqlResults.length === 1 && sqlResults[0].json.total !== undefined) {
  // Es un SUM con total
  formattedResults = `Total: ${sqlResults[0].json.total}`;
} else {
  // Formatear resultados como lista
  formattedResults = `Encontré ${sqlResults.length} resultado(s):\n\n`;
  
  sqlResults.slice(0, 20).forEach((result, i) => {
    const data = result.json;
    const keys = Object.keys(data);
    
    formattedResults += `${i + 1}. `;
    keys.forEach((key, j) => {
      formattedResults += `${key}: ${data[key]}`;
      if (j < keys.length - 1) formattedResults += ', ';
    });
    formattedResults += '\n';
  });
  
  if (sqlResults.length > 20) {
    formattedResults += `\n... y ${sqlResults.length - 20} más.`;
  }
}

return [{
  json: {
    originalMessage: originalMessage,
    sqlQuery: executedQuery,
    results: formattedResults,
    chatInput: `Resultados de la consulta SQL:\n\n${formattedResults}\n\nPregunta original del usuario: ${originalMessage}\n\nFormatea esta información de forma amigable y natural para el usuario.`
  }
}];
```

#### 10. Claude Formatea Respuesta
```yaml
Type: @n8n/n8n-nodes-langchain.lmChatAnthropic
Model: claude-sonnet-4-5-20250929
Temperature: 0.7
Max Tokens: 500
Credential: Anthropic account

Prompt: ={{ $json.chatInput }}

System Message:
```
Eres un asistente amigable que convierte resultados de base de datos en respuestas naturales.

Reglas:
- Sé conciso y directo
- Usa emojis apropiados: 📦 (pedidos), 🚚 (entregas), 💰 (dinero), 📞 (teléfono), 👤 (cliente)
- Precios en formato chileno: $25.000 CLP
- Si hay muchos resultados, muestra los primeros y menciona cuántos más hay
- Si no hay resultados, sugiere alternativas

NO repitas los datos técnicos, transfórmalos en lenguaje natural.
```
```

#### 11. Respuesta Final (Code)
```javascript
// Combinar respuesta directa o respuesta con DB
const checkNode = $('¿Necesita consultar DB?').all();

let finalResponse = '';

// Verificar si tenemos data del segundo output (respuesta directa)
const directResponse = checkNode.find(item => item.json.needsDB === false);

if (directResponse) {
  // Respuesta directa de Claude Principal (sin consulta DB)
  finalResponse = directResponse.json.response;
} else {
  // Respuesta formateada después de consultar DB
  const claudeFormatted = $('Claude Formatea Respuesta').first().json;
  finalResponse = claudeFormatted.output || claudeFormatted.text || 'Error al formatear respuesta';
}

return [{
  json: {
    response: finalResponse,
    timestamp: new Date().toISOString(),
    success: true
  }
}];
```

---

## 🔌 Conexiones

```
When chat message received
  ↓ main
Claude Principal (Conversacional)
  ↓ main
¿Necesita consultar DB? [Code con 2 outputs]
  ↓ output[0] (si necesita DB)
Preparar Prompt SQL
  ↓ main
Claude SQL (Especializado)
  ↓ main
Extraer SQL Limpio
  ↓ main
Ejecutar Query
  ↓ main
Formatear Resultados DB
  ↓ main
Claude Formatea Respuesta
  ↓ main
Respuesta Final
  
¿Necesita consultar DB? [output[1]] (si NO necesita DB)
  ↓ directo
Respuesta Final

Postgres Chat Memory
  ↓ ai_memory
Claude Principal (Conversacional)
```

---

## 📊 Comparación vs Enfoque Anterior

| Aspecto | Anterior (AI Agent + Tools) | Nuevo (Dual-Agent) |
|---------|----------------------------|---------------------|
| Complejidad | Alta (tools, validación) | Media (código claro) |
| Debuggeable | Difícil | Fácil |
| Errores | Undefined, tipo incorrecto | Claros y manejables |
| Performance | Lento (múltiples retries) | Rápido (directo) |
| Mantenibilidad | Baja | Alta |
| Costo Tokens | ~800-1200/consulta | ~400-600/consulta |

---

## 🧪 Testing

### Test 1: Consulta Simple
```
Input: "¿Cuántos pedidos tengo en ruta?"
Esperado:
- Claude Principal: "[QUERY_DB] pedidos en ruta"
- Claude SQL genera: SELECT COUNT(*) FROM "3t_orders" WHERE status = 'Ruta'
- Respuesta: "🚚 Tienes 1 pedido en estado Ruta."
```

### Test 2: Pregunta No-DB
```
Input: "Hola, ¿cómo estás?"
Esperado:
- Claude Principal responde directamente
- NO llama a Claude SQL
- Respuesta: "¡Hola! Estoy bien..."
```

### Test 3: Consulta Compleja
```
Input: "¿Qué clientes tienen deuda?"
Esperado:
- Claude SQL genera JOIN con GROUP BY
- Resultados formateados con nombres y montos
- Respuesta: "💰 3 clientes tienen deudas pendientes: ..."
```

---

## 🎯 Ventajas Clave

1. **Claridad Total:** Cada paso es visible y entendible
2. **Sin Magic:** No hay "black boxes" de n8n tools
3. **Flexible:** Puedes modificar cualquier paso fácilmente
4. **Robusto:** Si algo falla, puedes ver exactamente dónde
5. **Escalable:** Puedes agregar más Claudes especializados si necesitas

---

## 📝 Próximos Pasos

1. Crear workflow en n8n siguiendo esta guía
2. Probar con casos simples
3. Ajustar prompts según resultados
4. Documentar casos edge encontrados
5. Activar y monitorear

---

**Última actualización:** Octubre 17, 2025


