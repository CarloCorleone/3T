// =====================================================
// PUSH NOTIFICATIONS CLIENT
// Utilidades para registro y gestión de notificaciones push
// =====================================================

/**
 * Convierte una clave VAPID base64 a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')
    
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  
  return outputArray
}

/**
 * Verifica si las notificaciones push están soportadas
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Obtiene el estado del permiso de notificaciones
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Solicita permiso para notificaciones
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Push] Notificaciones no soportadas')
    return 'denied'
  }
  
  if (Notification.permission === 'granted') {
    console.log('[Push] Permiso ya concedido')
    return 'granted'
  }
  
  if (Notification.permission === 'denied') {
    console.warn('[Push] Permiso denegado previamente')
    return 'denied'
  }
  
  try {
    const permission = await Notification.requestPermission()
    console.log('[Push] Permiso solicitado:', permission)
    return permission
  } catch (error) {
    console.error('[Push] Error solicitando permiso:', error)
    return 'denied'
  }
}

/**
 * Registra el Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service Worker no soportado')
    return null
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    
    console.log('[Push] Service Worker registrado:', registration.scope)
    
    // Esperar a que esté activo
    await navigator.serviceWorker.ready
    console.log('[Push] Service Worker listo')
    
    return registration
  } catch (error) {
    console.error('[Push] Error registrando Service Worker:', error)
    return null
  }
}

/**
 * Suscribe al usuario a notificaciones push
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    // Verificar si ya existe una suscripción
    let subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      console.log('[Push] Ya existe suscripción:', subscription.endpoint)
      return subscription
    }
    
    // Crear nueva suscripción
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    
    if (!vapidPublicKey) {
      throw new Error('VAPID public key no configurada')
    }
    
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
    
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // Siempre mostrar notificación visible
      applicationServerKey: applicationServerKey as BufferSource
    })
    
    console.log('[Push] Nueva suscripción creada:', subscription.endpoint)
    return subscription
  } catch (error) {
    console.error('[Push] Error suscribiendo a push:', error)
    return null
  }
}

/**
 * Envía la suscripción al servidor
 */
export async function sendSubscriptionToServer(
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error guardando suscripción')
    }
    
    console.log('[Push] Suscripción enviada al servidor')
    return true
  } catch (error) {
    console.error('[Push] Error enviando suscripción:', error)
    return false
  }
}

/**
 * Desuscribe al usuario de notificaciones push
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (!subscription) {
      console.log('[Push] No hay suscripción activa')
      return true
    }
    
    // Desuscribir del navegador
    const success = await subscription.unsubscribe()
    
    if (success) {
      console.log('[Push] Desuscrito correctamente')
      
      // Notificar al servidor
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      })
    }
    
    return success
  } catch (error) {
    console.error('[Push] Error desuscribiendo:', error)
    return false
  }
}

/**
 * Inicializa el sistema completo de push notifications
 */
export async function initializePushNotifications(): Promise<{
  success: boolean
  permission: NotificationPermission
  subscription: PushSubscription | null
}> {
  console.log('[Push] Inicializando sistema de notificaciones...')
  
  // Verificar soporte
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications no soportadas')
    return {
      success: false,
      permission: 'denied',
      subscription: null
    }
  }
  
  // Verificar permiso actual
  let permission = getNotificationPermission()
  
  if (permission === 'default') {
    // Solo solicitar si el usuario interactuó (UX best practice)
    console.log('[Push] Permiso pendiente, esperando interacción del usuario')
    return {
      success: false,
      permission: 'default',
      subscription: null
    }
  }
  
  if (permission === 'denied') {
    console.warn('[Push] Permiso denegado por el usuario')
    return {
      success: false,
      permission: 'denied',
      subscription: null
    }
  }
  
  // Registrar Service Worker
  const registration = await registerServiceWorker()
  
  if (!registration) {
    console.error('[Push] No se pudo registrar Service Worker')
    return {
      success: false,
      permission,
      subscription: null
    }
  }
  
  // Suscribir a push
  const subscription = await subscribeToPush(registration)
  
  if (!subscription) {
    console.error('[Push] No se pudo crear suscripción')
    return {
      success: false,
      permission,
      subscription: null
    }
  }
  
  // Enviar suscripción al servidor
  const sent = await sendSubscriptionToServer(subscription)
  
  if (!sent) {
    console.error('[Push] No se pudo guardar suscripción en servidor')
    return {
      success: false,
      permission,
      subscription
    }
  }
  
  console.log('[Push] Sistema inicializado correctamente')
  return {
    success: true,
    permission,
    subscription
  }
}

/**
 * Solicita permiso e inicializa push notifications
 * (Solo llamar cuando el usuario interactúe, ej: click en botón)
 */
export async function requestAndInitializePush(): Promise<{
  success: boolean
  permission: NotificationPermission
  subscription: PushSubscription | null
}> {
  console.log('[Push] Solicitando permiso e inicializando...')
  
  // Solicitar permiso
  const permission = await requestNotificationPermission()
  
  if (permission !== 'granted') {
    console.warn('[Push] Permiso no concedido:', permission)
    return {
      success: false,
      permission,
      subscription: null
    }
  }
  
  // Inicializar push
  return await initializePushNotifications()
}

/**
 * Verifica si el usuario tiene notificaciones push activas
 */
export async function hasActivePushSubscription(): Promise<boolean> {
  try {
    if (!isPushSupported()) {
      return false
    }
    
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    return subscription !== null
  } catch (error) {
    console.error('[Push] Error verificando suscripción:', error)
    return false
  }
}

/**
 * Envía una notificación de prueba
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: '🧪 Notificación de Prueba',
        body: 'Si ves esto, las notificaciones están funcionando correctamente',
        data: {
          type: 'test',
          url: '/'
        }
      })
    })
    
    if (!response.ok) {
      throw new Error('Error enviando notificación de prueba')
    }
    
    console.log('[Push] Notificación de prueba enviada')
    return true
  } catch (error) {
    console.error('[Push] Error enviando notificación de prueba:', error)
    return false
  }
}

// =====================================================
// TIPOS TYPESCRIPT
// =====================================================

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, any>
  actions?: Array<{ action: string; title: string; icon?: string }>
  requireInteraction?: boolean
  renotify?: boolean
}

export interface PushSubscriptionJSON {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}


