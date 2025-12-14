// =====================================================
// API: Enviar Push Notification
// POST: Envía notificación push a usuario(s)
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import webpush from 'web-push'

// =====================================================
// Función helper para configurar VAPID (lazy initialization)
// =====================================================
let vapidConfigured = false

function ensureVapidConfigured() {
  if (!vapidConfigured) {
    const subject = process.env.VAPID_EMAIL || 'mailto:admin@3t.loopia.cl'
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    
    if (!publicKey || !privateKey) {
      throw new Error('VAPID keys no configuradas')
    }
    
    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidConfigured = true
  }
}

// =====================================================
// POST - Enviar notificación push
// =====================================================
export async function POST(request: NextRequest) {
  try {
    // Configurar VAPID en runtime (no en build time)
    ensureVapidConfigured()
    // Obtener usuario autenticado
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }
    
    const session = JSON.parse(sessionCookie.value)
    const currentUserId = session.user?.id
    
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      )
    }
    
    // Obtener datos de la notificación
    const body = await request.json()
    const {
      title,
      body: message,
      data,
      icon,
      badge,
      tag,
      requireInteraction,
      targetUserId, // Opcional: enviar a otro usuario (requiere permisos)
      notificationType // Tipo de notificación
    } = body
    
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Título y mensaje son requeridos' },
        { status: 400 }
      )
    }
    
    // Determinar usuario destinatario
    const userId = targetUserId || currentUserId
    
    // Verificar preferencias de notificaciones del usuario
    const { data: settings, error: settingsError } = await supabase
      .from('3t_notification_settings')
      .select('enabled, channel')
      .eq('user_id', userId)
      .eq('notification_type', notificationType || 'pedido_despachado')
      .single()
    
    // Si no hay configuración o está deshabilitada, no enviar
    if (!settings || !settings.enabled) {
      console.log('[API] Notificaciones deshabilitadas para usuario:', userId)
      return NextResponse.json({
        success: false,
        message: 'Usuario tiene notificaciones deshabilitadas'
      })
    }
    
    // Verificar que el canal incluye push
    if (settings.channel !== 'push' && settings.channel !== 'both') {
      console.log('[API] Push deshabilitado para usuario:', userId)
      return NextResponse.json({
        success: false,
        message: 'Usuario no tiene push habilitado'
      })
    }
    
    // Obtener suscripciones activas del usuario
    const { data: subscriptions, error: subsError } = await supabase
      .from('3t_push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)
    
    if (subsError) {
      throw subsError
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log('[API] Usuario no tiene suscripciones push:', userId)
      return NextResponse.json({
        success: false,
        message: 'Usuario no tiene dispositivos suscritos'
      })
    }
    
    // Preparar payload de notificación
    const payload = JSON.stringify({
      title,
      body: message,
      icon: icon || '/images/logos/logo-cuadrado-250x250.png',
      badge: badge || '/images/logos/logo-cuadrado-57x57-iphone.png',
      tag: tag || 'default',
      requireInteraction: requireInteraction || false,
      data: data || {}
    })
    
    // Enviar a cada suscripción
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          }
          
          await webpush.sendNotification(subscription, payload)
          
          // Actualizar last_used_at
          await supabase
            .from('3t_push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id)
          
          return { success: true, endpoint: sub.endpoint }
        } catch (error: any) {
          console.error('[API] Error enviando a suscripción:', sub.endpoint, error)
          
          // Si el error es 410 (Gone), eliminar suscripción inválida
          if (error.statusCode === 410) {
            await supabase
              .from('3t_push_subscriptions')
              .delete()
              .eq('id', sub.id)
            console.log('[API] Suscripción inválida eliminada:', sub.endpoint)
          }
          
          return { success: false, endpoint: sub.endpoint, error: error.message }
        }
      })
    )
    
    // Contar resultados
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length
    
    // Registrar en log
    await supabase
      .from('3t_notifications_log')
      .insert({
        user_id: userId,
        notification_type: notificationType || 'manual',
        title,
        body: message,
        data: data || {},
        channel: 'push',
        status: successCount > 0 ? 'sent' : 'failed'
      })
    
    console.log(`[API] Push enviado: ${successCount} éxitos, ${failCount} fallos`)
    
    return NextResponse.json({
      success: successCount > 0,
      message: `Enviado a ${successCount} de ${subscriptions.length} dispositivos`,
      details: {
        total: subscriptions.length,
        success: successCount,
        failed: failCount
      }
    })
    
  } catch (error: any) {
    console.error('[API] Error enviando push:', error)
    
    return NextResponse.json(
      {
        error: 'Error enviando notificación push',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// =====================================================
// Función auxiliar: Enviar notificación a usuario específico
// (uso interno, no expuesta como endpoint)
// =====================================================
async function sendPushToUser(
  userId: string,
  notification: {
    title: string
    body: string
    type: string
    data?: Record<string, any>
    icon?: string
    badge?: string
    tag?: string
  }
): Promise<boolean> {
  try {
    // Verificar preferencias
    const { data: settings } = await supabase
      .from('3t_notification_settings')
      .select('enabled, channel')
      .eq('user_id', userId)
      .eq('notification_type', notification.type)
      .single()
    
    if (!settings || !settings.enabled) {
      return false
    }
    
    if (settings.channel !== 'push' && settings.channel !== 'both') {
      return false
    }
    
    // Obtener suscripciones
    const { data: subscriptions } = await supabase
      .from('3t_push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)
    
    if (!subscriptions || subscriptions.length === 0) {
      return false
    }
    
    // Preparar payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/images/logos/logo-cuadrado-250x250.png',
      badge: notification.badge || '/images/logos/logo-cuadrado-57x57-iphone.png',
      tag: notification.tag || 'default',
      data: notification.data || {}
    })
    
    // Enviar
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }
        
        return await webpush.sendNotification(subscription, payload)
      })
    )
    
    const successCount = results.filter(r => r.status === 'fulfilled').length
    
    // Registrar en log
    await supabase
      .from('3t_notifications_log')
      .insert({
        user_id: userId,
        notification_type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        channel: 'push',
        status: successCount > 0 ? 'sent' : 'failed'
      })
    
    return successCount > 0
  } catch (error) {
    console.error('[Push] Error enviando notificación:', error)
    return false
  }
}


