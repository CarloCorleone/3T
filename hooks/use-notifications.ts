// =====================================================
// HOOK: useNotifications
// Gestión de notificaciones in-app y estado
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// =====================================================
// TIPOS
// =====================================================
export interface Notification {
  id: string
  user_id: string | null
  notification_type: string
  title: string
  body: string
  data: Record<string, any>
  channel: 'in_app' | 'push'
  status: 'sent' | 'read' | 'failed'
  created_at: string
}

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (id: string) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
  clearAll: () => Promise<boolean>
  refresh: () => Promise<void>
}

// =====================================================
// HOOK
// =====================================================
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Cargar notificaciones
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Obtener últimas 50 notificaciones del usuario
      const { data, error: fetchError } = await supabase
        .from('3t_notifications_log')
        .select('*')
        .eq('channel', 'in_app')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (fetchError) {
        throw fetchError
      }
      
      setNotifications(data || [])
    } catch (err: any) {
      console.error('[useNotifications] Error cargando:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Calcular no leídas
  const unreadCount = notifications.filter(n => n.status === 'sent').length
  
  // Marcar como leída
  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('3t_notifications_log')
        .update({ status: 'read' })
        .eq('id', id)
      
      if (updateError) {
        throw updateError
      }
      
      // Actualizar estado local
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n)
      )
      
      console.log('[useNotifications] Notificación marcada como leída:', id)
      return true
    } catch (err: any) {
      console.error('[useNotifications] Error marcando como leída:', err)
      return false
    }
  }, [])
  
  // Marcar todas como leídas
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const unreadIds = notifications
        .filter(n => n.status === 'sent')
        .map(n => n.id)
      
      if (unreadIds.length === 0) {
        return true
      }
      
      const { error: updateError } = await supabase
        .from('3t_notifications_log')
        .update({ status: 'read' })
        .in('id', unreadIds)
      
      if (updateError) {
        throw updateError
      }
      
      // Actualizar estado local
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'read' as const }))
      )
      
      console.log('[useNotifications] Todas marcadas como leídas')
      return true
    } catch (err: any) {
      console.error('[useNotifications] Error marcando todas:', err)
      return false
    }
  }, [notifications])
  
  // Limpiar todas
  const clearAll = useCallback(async (): Promise<boolean> => {
    try {
      const ids = notifications.map(n => n.id)
      
      if (ids.length === 0) {
        return true
      }
      
      const { error: deleteError } = await supabase
        .from('3t_notifications_log')
        .delete()
        .in('id', ids)
      
      if (deleteError) {
        throw deleteError
      }
      
      setNotifications([])
      console.log('[useNotifications] Todas las notificaciones eliminadas')
      return true
    } catch (err: any) {
      console.error('[useNotifications] Error limpiando:', err)
      return false
    }
  }, [notifications])
  
  // Refresh manual
  const refresh = useCallback(async () => {
    await loadNotifications()
  }, [loadNotifications])
  
  // Cargar al montar
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])
  
  // ⚠️ REALTIME DESHABILITADO
  // La instancia de Supabase self-hosted no tiene el servicio Realtime configurado.
  // Las notificaciones se actualizan mediante refresh manual o al recargar la página.
  // 
  // Para habilitar Realtime en el futuro:
  // 1. Configurar servicio Realtime en Supabase self-hosted
  // 2. Exponer puerto WebSocket en Kong
  // 3. Actualizar CORS para WebSocket
  // 4. Descomentar el código siguiente y comentar este mensaje
  
  /* CÓDIGO DE REALTIME (DESHABILITADO)
  useEffect(() => {
    let channel: any = null
    
    try {
      channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: '3t_notifications_log',
            filter: `channel=eq.in_app`
          },
          (payload) => {
            console.log('[useNotifications] Nueva notificación:', payload.new)
            
            // Agregar al inicio
            setNotifications(prev => [payload.new as Notification, ...prev])
            
            // Mostrar notificación del navegador si tiene permiso
            if ('Notification' in window && Notification.permission === 'granted') {
              const notification = payload.new as Notification
              new Notification(notification.title, {
                body: notification.body,
                icon: '/images/logos/logo-cuadrado-250x250.png',
                tag: notification.id
              })
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[useNotifications] ⚠️ Error en canal realtime:', err)
          } else if (status === 'SUBSCRIBED') {
            console.log('[useNotifications] ✅ Suscrito a notificaciones en tiempo real')
          }
        })
    } catch (error) {
      console.warn('[useNotifications] ⚠️ Error configurando realtime:', error)
    }
    
    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [])
  */
  
  // Log informativo (solo en desarrollo)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useNotifications] ℹ️ Realtime deshabilitado. Las notificaciones se actualizan con refresh manual.')
    }
  }, [])
  
  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh
  }
}


