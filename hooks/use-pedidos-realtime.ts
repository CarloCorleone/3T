// =====================================================
// HOOK: usePedidosRealtime
// Suscripción a cambios en tiempo real de pedidos
// =====================================================

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// =====================================================
// TIPOS
// =====================================================
interface UsePedidosRealtimeProps {
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

interface UsePedidosRealtimeReturn {
  isConnected: boolean
}

// =====================================================
// HOOK
// =====================================================
export function usePedidosRealtime({
  onInsert,
  onUpdate,
  onDelete
}: UsePedidosRealtimeProps): UsePedidosRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false)
  
  // Usar useRef para mantener referencias actuales de los callbacks
  // sin causar re-suscripciones innecesarias
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)
  
  // Actualizar refs cuando cambien los callbacks
  useEffect(() => {
    onInsertRef.current = onInsert
    onUpdateRef.current = onUpdate
    onDeleteRef.current = onDelete
  }, [onInsert, onUpdate, onDelete])
  
  useEffect(() => {
    let channel: RealtimeChannel | null = null
    
    try {
      console.log('[Realtime] Iniciando suscripción a cambios de pedidos...')
      
      channel = supabase
        .channel('pedidos-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: '3t_orders'
          },
          (payload) => {
            console.log('[Realtime] Cambio detectado en pedidos:', payload.eventType, payload)
            
            if (payload.eventType === 'INSERT' && onInsertRef.current) {
              onInsertRef.current(payload.new)
            } else if (payload.eventType === 'UPDATE' && onUpdateRef.current) {
              onUpdateRef.current(payload.new)
            } else if (payload.eventType === 'DELETE' && onDeleteRef.current) {
              onDeleteRef.current(payload.old)
            }
          }
        )
        .subscribe((status, err) => {
          console.log('[Realtime] Estado de suscripción:', status)
          
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] ✅ Suscrito a cambios de pedidos')
            setIsConnected(true)
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[Realtime] ❌ Error en canal:', err)
            setIsConnected(false)
          } else if (status === 'TIMED_OUT') {
            console.warn('[Realtime] ⏱️ Timeout de conexión')
            setIsConnected(false)
          } else if (status === 'CLOSED') {
            console.warn('[Realtime] 🔴 Conexión cerrada')
            setIsConnected(false)
          }
        })
    } catch (error) {
      console.error('[Realtime] Error configurando suscripción:', error)
      setIsConnected(false)
    }
    
    // Cleanup al desmontar
    return () => {
      if (channel) {
        console.log('[Realtime] Desuscribiendo canal de pedidos...')
        channel.unsubscribe()
        setIsConnected(false)
      }
    }
  }, []) // ← Sin dependencias: solo se suscribe UNA vez
  
  return {
    isConnected
  }
}

