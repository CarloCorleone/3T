// =====================================================
// NOTIFICATION CONTEXT
// Provider global para sistema de notificaciones
// =====================================================

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNotifications, type Notification } from '@/hooks/use-notifications'
import {
  initializePushNotifications,
  requestAndInitializePush,
  hasActivePushSubscription
} from '@/lib/push-notifications'

// =====================================================
// TIPOS
// =====================================================
interface NotificationContextType {
  // Estado de notificaciones
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  
  // Acciones
  markAsRead: (id: string) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
  clearAll: () => Promise<boolean>
  refresh: () => Promise<void>
  
  // Push notifications
  pushEnabled: boolean
  pushPermission: NotificationPermission
  requestPushPermission: () => Promise<boolean>
  initializePush: () => Promise<boolean>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// =====================================================
// PROVIDER
// =====================================================
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  // Hook de notificaciones
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh
  } = useNotifications()
  
  // Estado de push
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')
  
  // Verificar estado de push al montar
  useEffect(() => {
    const checkPushStatus = async () => {
      // Verificar permiso
      if ('Notification' in window) {
        setPushPermission(Notification.permission)
      }
      
      // Verificar suscripción activa
      const hasPush = await hasActivePushSubscription()
      setPushEnabled(hasPush)
      
      // Si tiene permiso pero no suscripción, intentar inicializar
      if (Notification.permission === 'granted' && !hasPush) {
        console.log('[NotificationContext] Inicializando push automáticamente...')
        const result = await initializePushNotifications()
        setPushEnabled(result.success)
      }
    }
    
    checkPushStatus()
  }, [])
  
  // Solicitar permiso de push
  const requestPushPermission = async (): Promise<boolean> => {
    try {
      console.log('[NotificationContext] Solicitando permiso de push...')
      
      const result = await requestAndInitializePush()
      
      setPushPermission(result.permission)
      setPushEnabled(result.success)
      
      if (result.success) {
        console.log('[NotificationContext] Push habilitado correctamente')
      } else {
        console.warn('[NotificationContext] No se pudo habilitar push:', result.permission)
      }
      
      return result.success
    } catch (error) {
      console.error('[NotificationContext] Error solicitando push:', error)
      return false
    }
  }
  
  // Inicializar push (sin solicitar permiso)
  const initializePush = async (): Promise<boolean> => {
    try {
      const result = await initializePushNotifications()
      setPushEnabled(result.success)
      return result.success
    } catch (error) {
      console.error('[NotificationContext] Error inicializando push:', error)
      return false
    }
  }
  
  // Escuchar cambios en el permiso de notificaciones
  useEffect(() => {
    if (!('Notification' in window)) {
      return
    }
    
    const checkPermission = () => {
      setPushPermission(Notification.permission)
    }
    
    // Revisar cada 5 segundos (el usuario puede cambiar desde settings del navegador)
    const interval = setInterval(checkPermission, 5000)
    
    return () => clearInterval(interval)
  }, [])
  
  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh,
    pushEnabled,
    pushPermission,
    requestPushPermission,
    initializePush
  }
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

// =====================================================
// HOOK DE CONTEXTO
// =====================================================
export function useNotificationContext() {
  const context = useContext(NotificationContext)
  
  if (context === undefined) {
    throw new Error('useNotificationContext debe usarse dentro de NotificationProvider')
  }
  
  return context
}

// =====================================================
// COMPONENTE DE INICIALIZACIÓN (opcional)
// =====================================================
export function NotificationInitializer() {
  const { initializePush, pushPermission } = useNotificationContext()
  
  useEffect(() => {
    // Si ya tiene permiso, inicializar automáticamente
    if (pushPermission === 'granted') {
      initializePush()
    }
  }, [pushPermission, initializePush])
  
  return null
}


