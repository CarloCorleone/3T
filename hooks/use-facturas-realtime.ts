// =====================================================
// HOOK: useFacturasRealtime
// Suscripción a cambios en tiempo real de facturas
// =====================================================

'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// =====================================================
// TIPOS
// =====================================================
interface UseFacturasRealtimeProps {
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

interface UseFacturasRealtimeReturn {
  isConnected: boolean
}

// =====================================================
// HOOK
// =====================================================
export function useFacturasRealtime({
  onInsert,
  onUpdate,
  onDelete
}: UseFacturasRealtimeProps): UseFacturasRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false)
  
  // Usar useRef para mantener referencias actuales de los callbacks
  // sin causar re-suscripciones innecesarias (CRÍTICO)
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
      console.log('[Realtime Facturas] Iniciando suscripción...')
      
      channel = supabase
        .channel('facturas-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: '3t_invoices'
          },
          (payload) => {
            console.log('[Realtime Facturas] Cambio detectado:', payload.eventType, payload)
            
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
          console.log('[Realtime Facturas] Estado:', status)
          
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime Facturas] ✅ Suscrito')
            setIsConnected(true)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('[Realtime Facturas] ❌ Error:', status, err)
            setIsConnected(false)
          }
        })
    } catch (error) {
      console.error('[Realtime Facturas] Error:', error)
      setIsConnected(false)
    }
    
    // Cleanup al desmontar
    return () => {
      if (channel) {
        console.log('[Realtime Facturas] Desuscribiendo...')
        channel.unsubscribe()
        setIsConnected(false)
      }
    }
  }, []) // ⚠️ IMPORTANTE: Array vacío para suscribir solo 1 vez
  
  return {
    isConnected
  }
}











