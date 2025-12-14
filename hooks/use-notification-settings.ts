// =====================================================
// HOOK: useNotificationSettings
// Gestión de preferencias de notificaciones
// =====================================================

import { useState, useEffect, useCallback } from 'react'

// =====================================================
// TIPOS
// =====================================================
export interface NotificationSetting {
  id: string
  user_id: string
  notification_type: 'pedido_creado' | 'pedido_ruta' | 'pedido_despachado' | 'compra_completada' | 'cliente_nuevo'
  enabled: boolean
  channel: 'in_app' | 'push' | 'both'
  created_at: string
  updated_at: string
}

export interface UseNotificationSettingsReturn {
  settings: NotificationSetting[]
  loading: boolean
  error: string | null
  updateSetting: (
    notificationType: NotificationSetting['notification_type'],
    enabled?: boolean,
    channel?: NotificationSetting['channel']
  ) => Promise<boolean>
  updateMultiple: (
    updates: Array<{
      notificationType: NotificationSetting['notification_type']
      enabled?: boolean
      channel?: NotificationSetting['channel']
    }>
  ) => Promise<boolean>
  refresh: () => Promise<void>
  getSetting: (notificationType: NotificationSetting['notification_type']) => NotificationSetting | undefined
}

// =====================================================
// HOOK
// =====================================================
export function useNotificationSettings(): UseNotificationSettingsReturn {
  const [settings, setSettings] = useState<NotificationSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Cargar configuración
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/notifications/settings')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error cargando configuración')
      }
      
      const data = await response.json()
      setSettings(data.settings || [])
      
      console.log('[useNotificationSettings] Configuración cargada:', data.settings?.length)
    } catch (err: any) {
      console.error('[useNotificationSettings] Error cargando:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Actualizar configuración individual
  const updateSetting = useCallback(async (
    notificationType: NotificationSetting['notification_type'],
    enabled?: boolean,
    channel?: NotificationSetting['channel']
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationType,
          enabled,
          channel
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error actualizando configuración')
      }
      
      const data = await response.json()
      
      // Actualizar estado local
      setSettings(prev =>
        prev.map(s =>
          s.notification_type === notificationType
            ? data.setting
            : s
        )
      )
      
      console.log('[useNotificationSettings] Configuración actualizada:', notificationType)
      return true
    } catch (err: any) {
      console.error('[useNotificationSettings] Error actualizando:', err)
      setError(err.message)
      return false
    }
  }, [])
  
  // Actualizar múltiples configuraciones
  const updateMultiple = useCallback(async (
    updates: Array<{
      notificationType: NotificationSetting['notification_type']
      enabled?: boolean
      channel?: NotificationSetting['channel']
    }>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en actualización masiva')
      }
      
      // Recargar configuración completa
      await loadSettings()
      
      console.log('[useNotificationSettings] Actualización masiva completada')
      return true
    } catch (err: any) {
      console.error('[useNotificationSettings] Error en actualización masiva:', err)
      setError(err.message)
      return false
    }
  }, [loadSettings])
  
  // Refresh manual
  const refresh = useCallback(async () => {
    await loadSettings()
  }, [loadSettings])
  
  // Obtener configuración específica
  const getSetting = useCallback((
    notificationType: NotificationSetting['notification_type']
  ): NotificationSetting | undefined => {
    return settings.find(s => s.notification_type === notificationType)
  }, [settings])
  
  // Cargar al montar
  useEffect(() => {
    loadSettings()
  }, [loadSettings])
  
  return {
    settings,
    loading,
    error,
    updateSetting,
    updateMultiple,
    refresh,
    getSetting
  }
}

// =====================================================
// HOOK: useHasPushSubscription
// Verifica si el usuario tiene push activo
// =====================================================
export function useHasPushSubscription() {
  const [hasPush, setHasPush] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const checkPushSubscription = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          setHasPush(false)
          return
        }
        
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        
        setHasPush(subscription !== null)
      } catch (error) {
        console.error('[useHasPushSubscription] Error:', error)
        setHasPush(false)
      } finally {
        setLoading(false)
      }
    }
    
    checkPushSubscription()
  }, [])
  
  return { hasPush, loading }
}


