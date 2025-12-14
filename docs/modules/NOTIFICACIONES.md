# 🔔 Sistema de Notificaciones - Agua Tres Torres

**Fecha de Implementación:** Octubre 21, 2025  
**Estado:** ✅ Implementado (pending base de datos)  
**Versión:** 1.0

---

## 📖 Resumen Ejecutivo

Sistema completo de notificaciones push e in-app para alertar sobre eventos importantes del sistema, con enfoque especial en notificaciones de cambio de estado "Ruta → Despachado".

### Características Principales

- ✅ **Push Notifications**: Notificaciones nativas incluso con app cerrada
- ✅ **Notificaciones In-App**: Alertas dentro de la aplicación con Realtime
- ✅ **Configuración Granular**: Control por tipo y canal (in-app/push/both)
- ✅ **Prioridad Configurable**: "Pedido Despachado" activado por defecto
- ✅ **Multi-dispositivo**: Soporte para múltiples dispositivos por usuario
- ✅ **Service Worker**: PWA-ready con offline capability

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                  │
│  ┌────────────────┐  ┌─────────────────────────────┐   │
│  │ NotificationBell│  │  NotificationProvider       │   │
│  │  (UI Component) │  │   (Context + Realtime)      │   │
│  └────────┬────────┘  └──────────┬──────────────────┘   │
│           │                       │                       │
│           └───────────┬───────────┘                      │
│                       ↓                                   │
│            ┌─────────────────────┐                       │
│            │  Service Worker      │                       │
│            │  (Push Handler)      │                       │
│            └──────────┬───────────┘                      │
└───────────────────────┼───────────────────────────────────┘
                        │
              ┌─────────┴──────────┐
              │                    │
         ┌────↓─────┐       ┌─────↓──────┐
         │ API Routes│       │  Supabase  │
         │   /api/   │       │ (Realtime) │
         │notifications/│    │            │
         └─────┬─────┘       └─────┬──────┘
               │                    │
               └──────────┬─────────┘
                          ↓
                  ┌───────────────┐
                  │   PostgreSQL  │
                  │   (3t_*)      │
                  └───────────────┘
```

---

## 📊 Tablas de Base de Datos

### 1. `3t_notification_settings`

Configuración de preferencias por usuario.

```sql
CREATE TABLE "3t_notification_settings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "3t_users"(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,  -- Tipo de notificación
  enabled BOOLEAN DEFAULT true,      -- Activado/Desactivado
  channel TEXT NOT NULL DEFAULT 'both', -- in_app, push, both
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);
```

**Tipos de Notificación:**
- `pedido_creado` - Nuevo pedido creado
- `pedido_ruta` - Pedido marcado como "En Ruta"
- `pedido_despachado` - ⭐ Pedido despachado (activado por defecto)
- `compra_completada` - Compra completada
- `cliente_nuevo` - Nuevo cliente registrado

**Canales:**
- `in_app` - Solo notificaciones dentro de la app
- `push` - Solo notificaciones push nativas
- `both` - Ambos canales (recomendado)

### 2. `3t_notifications_log`

Historial de notificaciones enviadas.

```sql
CREATE TABLE "3t_notifications_log" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "3t_users"(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,  -- Metadata del evento
  channel TEXT NOT NULL,            -- in_app o push
  status TEXT DEFAULT 'sent',       -- sent, read, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. `3t_push_subscriptions`

Suscripciones de Web Push API por dispositivo.

```sql
CREATE TABLE "3t_push_subscriptions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "3t_users"(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,  -- URL del servicio push
  p256dh TEXT NOT NULL,            -- Clave pública de encriptación
  auth TEXT NOT NULL,              -- Token de autenticación
  user_agent TEXT,                 -- Info del navegador/dispositivo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔧 Configuración

### 1. Ejecutar Migración SQL

```bash
# Archivo ya creado en:
/opt/cane/3t/migrations/005_notifications_system.sql

# Ejecutar en Supabase Dashboard:
# 1. Ir a https://api.loopia.cl
# 2. SQL Editor → New Query
# 3. Copiar contenido del archivo
# 4. Run
```

### 2. Variables de Entorno

Ya configuradas en `/opt/cane/env/3t.env`:

```env
# VAPID Keys (ya generadas)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BNXpSg7nSOMhEX5eyvC8rvt76T1RdooU8lLQB2jzJndfMo_heDQWwWmWcsgIhI-ont0HdYFrXnbmTmLpu0Fo6_g
VAPID_PRIVATE_KEY=Yds7YR0wCcUnjFoh3kHR9YbrTj0krvgWuUSaARXOGCk
VAPID_EMAIL=mailto:admin@3t.loopia.cl
```

### 3. Dependencias

Ya instaladas:

```bash
npm install web-push date-fns  # ✅ Completado
```

---

## 📱 Uso

### Para Usuarios

#### Habilitar Notificaciones Push

1. Ir a **Perfil de Usuario**
2. Sección "Notificaciones"
3. Click en "Habilitar Push"
4. Aceptar permiso en el navegador
5. Configurar tipos de notificación deseados

#### Configurar Preferencias

- **Toggle**: Activar/Desactivar tipo de notificación
- **Canal**: Elegir dónde recibir (In-App, Push, Ambos)
- **Prueba**: Botón para enviar notificación de prueba

### Para Desarrolladores

#### Enviar Notificación Programática

```typescript
// Opción 1: Vía API
const response = await fetch('/api/notifications/push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '🚚 Pedido Despachado',
    body: 'El pedido #12345 ha sido entregado',
    notificationType: 'pedido_despachado',
    data: {
      type: 'order_delivered',
      orderId: '12345',
      url: '/pedidos?id=12345'
    }
  })
})

// Opción 2: Desde Service Worker
// (automático al recibir push del servidor)
```

#### Integrar en Otros Módulos

```typescript
import { sendPushToUser } from '@/app/api/notifications/push/route'

// Al cambiar estado de pedido
if (oldStatus === 'Ruta' && newStatus === 'Despachado') {
  await sendPushToUser(userId, {
    title: '🚚 Pedido Despachado',
    body: `Pedido #${orderId} entregado exitosamente`,
    type: 'pedido_despachado',
    data: {
      orderId,
      url: `/pedidos?id=${orderId}`
    }
  })
}
```

---

## 🔌 API Endpoints

### POST `/api/notifications/subscribe`

Registra una suscripción push del navegador.

**Body:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Suscripción registrada correctamente"
}
```

### POST `/api/notifications/push`

Envía una notificación push a un usuario.

**Body:**
```json
{
  "title": "Título",
  "body": "Mensaje",
  "notificationType": "pedido_despachado",
  "data": {
    "orderId": "123",
    "url": "/pedidos?id=123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Enviado a 2 de 2 dispositivos",
  "details": {
    "total": 2,
    "success": 2,
    "failed": 0
  }
}
```

### GET `/api/notifications/settings`

Obtiene la configuración del usuario autenticado.

**Response:**
```json
{
  "success": true,
  "settings": [
    {
      "id": "...",
      "user_id": "...",
      "notification_type": "pedido_despachado",
      "enabled": true,
      "channel": "both"
    }
  ]
}
```

### PUT `/api/notifications/settings`

Actualiza una preferencia específica.

**Body:**
```json
{
  "notificationType": "pedido_despachado",
  "enabled": true,
  "channel": "both"
}
```

---

## 🎯 Flujo de Notificación

### Escenario: Pedido Despachado

```
1. Usuario marca pedido como "Despachado" en /rutas
                    ↓
2. Se actualiza el estado en Supabase (3t_orders)
                    ↓
3. Trigger/Workflow detecta el cambio
                    ↓
4. Consulta preferencias del usuario (3t_notification_settings)
                    ↓
5. Si está habilitado:
   ├─ Canal "in_app" → Envía via Supabase Realtime
   ├─ Canal "push" → Envía via Web Push API
   └─ Canal "both" → Envía por ambos
                    ↓
6. Registra en log (3t_notifications_log)
                    ↓
7. Usuario recibe notificación
```

---

## 🧪 Testing

### Checklist de Pruebas

#### Push Notifications
- [ ] Habilitar push en Chrome desktop
- [ ] Habilitar push en Firefox
- [ ] Habilitar push en Safari (iOS PWA)
- [ ] Habilitar push en Chrome Android (PWA)
- [ ] Recibir notificación con app cerrada
- [ ] Click en notificación abre la app
- [ ] Múltiples dispositivos reciben simultáneamente

#### Notificaciones In-App
- [ ] Aparece badge con contador
- [ ] Popover muestra notificaciones recientes
- [ ] Marcar como leída funciona
- [ ] Marcar todas como leídas funciona
- [ ] Supabase Realtime funciona (tiempo real)

#### Configuración
- [ ] Toggle activa/desactiva notificaciones
- [ ] Cambio de canal funciona
- [ ] Notificación de prueba funciona
- [ ] Configuración persiste después de reload

---

## 🐛 Troubleshooting

### Push Notifications no Funcionan

**Problema**: No recibo notificaciones push

**Soluciones**:
1. Verificar permisos del navegador (Configuración → Notificaciones)
2. Verificar que VAPID keys estén configuradas
3. Verificar que Service Worker esté registrado:
   ```javascript
   navigator.serviceWorker.getRegistrations()
     .then(regs => console.log(regs))
   ```
4. Verificar suscripción activa:
   ```javascript
   navigator.serviceWorker.ready
     .then(reg => reg.pushManager.getSubscription())
     .then(sub => console.log(sub))
   ```

### Service Worker no se Registra

**Problema**: Error al registrar `/sw.js`

**Soluciones**:
1. Verificar que archivo existe: `ls -la /opt/cane/3t/public/sw.js`
2. Verificar que se sirve correctamente: `curl http://localhost:3002/sw.js`
3. Ver errores en consola del navegador (F12 → Console)

### Notificaciones In-App no Aparecen

**Problema**: No veo notificaciones in-app en tiempo real

**Soluciones**:
1. Verificar que Supabase Realtime esté habilitado
2. Ver logs del navegador: "Subscribed to channel notifications-realtime"
3. Verificar que tablas existan en Supabase

---

## 🔐 Seguridad

### Implementado

- ✅ Autenticación requerida en todos los endpoints
- ✅ Validación de permisos por usuario
- ✅ Encriptación de mensajes push (P-256 ECDH)
- ✅ Rate limiting (10 notificaciones/min por usuario)
- ✅ Sanitización de contenido (XSS prevention)
- ✅ HTTPS obligatorio para push notifications
- ✅ VAPID keys protegidas en variables de entorno

### Recomendaciones

- 🔒 Rotar VAPID keys cada 6 meses
- 🔒 Monitorear intentos de spam en logs
- 🔒 Limpiar suscripciones inactivas periódicamente

---

## 📈 Monitoreo

### Queries Útiles

```sql
-- Notificaciones por tipo (último mes)
SELECT 
  notification_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as enviadas,
  COUNT(*) FILTER (WHERE status = 'read') as leídas,
  COUNT(*) FILTER (WHERE status = 'failed') as fallidas
FROM "3t_notifications_log"
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY notification_type;

-- Usuarios con push activo
SELECT COUNT(DISTINCT user_id) as usuarios_con_push
FROM "3t_push_subscriptions";

-- Suscripciones inactivas (>90 días)
SELECT COUNT(*) as inactivas
FROM "3t_push_subscriptions"
WHERE last_used_at < NOW() - INTERVAL '90 days';
```

---

## 🚀 Próximos Pasos (Opcional)

- [ ] Notificaciones por email (n8n + SMTP)
- [ ] Notificaciones programadas (recordatorios)
- [ ] Categorías personalizadas
- [ ] Sonidos personalizados por tipo
- [ ] Agrupación inteligente
- [ ] Analytics de notificaciones
- [ ] Integración con Telegram/WhatsApp

---

## 📚 Referencias

- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Protocol](https://tools.ietf.org/html/rfc8292)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documentación del Sistema de Notificaciones v1.0**  
**Última actualización:** Octubre 21, 2025


