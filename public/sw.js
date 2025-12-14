// =====================================================
// SERVICE WORKER - Sistema de Notificaciones Push
// Agua Tres Torres - 3t
// =====================================================

const CACHE_NAME = '3t-v1';
const CACHE_URLS = [
  '/',
  '/manifest.json',
  '/images/logos/logo-cuadrado-250x250.png'
];

// =====================================================
// INSTALACIÓN DEL SERVICE WORKER
// =====================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache abierto, agregando URLs...');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Service Worker instalado correctamente');
        return self.skipWaiting(); // Activar inmediatamente
      })
      .catch((error) => {
        console.error('[SW] Error instalando Service Worker:', error);
      })
  );
});

// =====================================================
// ACTIVACIÓN DEL SERVICE WORKER
// =====================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    // Limpiar caches antiguas
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Eliminando cache antigua:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activado');
        return self.clients.claim(); // Tomar control de todas las páginas
      })
  );
});

// =====================================================
// MANEJO DE NOTIFICACIONES PUSH
// =====================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Notificación Push recibida');
  
  let data = {
    title: 'Agua Tres Torres',
    body: 'Nueva notificación',
    icon: '/images/logos/logo-cuadrado-250x250.png',
    badge: '/images/logos/logo-cuadrado-57x57-iphone.png',
    data: {}
  };
  
  // Parsear datos del push
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Payload recibido:', payload);
      data = { ...data, ...payload };
    } catch (error) {
      console.error('[SW] Error parseando payload:', error);
      data.body = event.data.text();
    }
  }
  
  // Opciones de notificación
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag || 'notification',
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200], // Patrón de vibración
    data: data.data,
    actions: data.actions || [
      {
        action: 'open',
        title: 'Ver Detalles',
        icon: '/images/logos/logo-cuadrado-57x57-iphone.png'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };
  
  // Mostrar notificación
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        console.log('[SW] Notificación mostrada correctamente');
      })
      .catch((error) => {
        console.error('[SW] Error mostrando notificación:', error);
      })
  );
});

// =====================================================
// MANEJO DE CLICKS EN NOTIFICACIONES
// =====================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event.action);
  
  event.notification.close(); // Cerrar la notificación
  
  // Si el usuario cierra la notificación, no hacer nada más
  if (event.action === 'close') {
    console.log('[SW] Usuario cerró la notificación');
    return;
  }
  
  // Obtener la URL a abrir
  const urlToOpen = event.notification.data?.url || '/';
  
  // Abrir o enfocar la aplicación
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        console.log('[SW] Clientes encontrados:', windowClients.length);
        
        // Buscar si ya hay una ventana abierta con la app
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('[SW] Enfocando ventana existente');
            return client.focus().then(() => {
              // Navegar a la URL específica
              if (urlToOpen !== '/') {
                return client.navigate(urlToOpen);
              }
              return client;
            });
          }
        }
        
        // Si no hay ventana abierta, abrir una nueva
        console.log('[SW] Abriendo nueva ventana:', urlToOpen);
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error('[SW] Error manejando click:', error);
      })
  );
});

// =====================================================
// MANEJO DE ERRORES DE NOTIFICACIONES
// =====================================================
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Suscripción push cambió');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'BNXpSg7nSOMhEX5eyvC8rvt76T1RdooU8lLQB2jzJndfMo_heDQWwWmWcsgIhI-ont0HdYFrXnbmTmLpu0Fo6_g'
      )
    })
    .then((subscription) => {
      console.log('[SW] Nueva suscripción creada:', subscription.endpoint);
      
      // Enviar nueva suscripción al servidor
      return fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          action: 'update'
        })
      });
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Error actualizando suscripción en servidor');
      }
      console.log('[SW] Suscripción actualizada en servidor');
    })
    .catch((error) => {
      console.error('[SW] Error renovando suscripción:', error);
    })
  );
});

// =====================================================
// FETCH - Estrategia de Cache
// =====================================================
self.addEventListener('fetch', (event) => {
  // Solo cachear peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Estrategia: Network First, fallback a Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, cachearla
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, usar cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Sirviendo desde cache:', event.request.url);
              return cachedResponse;
            }
            // Si no hay cache, retornar error
            return new Response('Sin conexión', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// =====================================================
// UTILIDADES
// =====================================================

/**
 * Convierte una clave VAPID base64 a Uint8Array
 * @param {string} base64String - Clave VAPID en base64
 * @returns {Uint8Array} - Array de bytes
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
    
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// =====================================================
// LOGGING
// =====================================================
console.log('[SW] Service Worker cargado correctamente');
console.log('[SW] Versión:', CACHE_NAME);
console.log('[SW] Origen:', self.location.origin);


