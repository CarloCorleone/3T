'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChatMessage, ChatbotResponse } from '@/types/chatbot'
import { useAuthStore } from '@/lib/auth-store'
import { getUserPermissions } from '@/lib/permissions'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId] = useState(() => crypto.randomUUID())
  
  const user = useAuthStore((state) => state.user)

  // Cargar mensaje de bienvenida personalizado
  useEffect(() => {
    if (messages.length === 0 && user) {
      const firstName = user.nombre?.split(' ')[0] || 'Usuario'
      const hour = new Date().getHours()
      const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
      
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `${greeting}, ${firstName}! 👋\n\nSoy tu asistente virtual de Agua Tres Torres. Puedo ayudarte con:\n\n📦 Consultar pedidos y su estado\n👥 Buscar información de clientes\n📊 Ver métricas y reportes\n📞 Buscar contactos\n\n¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
    }
  }, [user, messages.length])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !user) return

    setError(null)
    setIsLoading(true)

    // Agregar mensaje del usuario
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      // Obtener permisos del usuario
      const userPermissions = await getUserPermissions(user.id)
      
      // Obtener token de la sesión actual
      const { supabase } = await import('@/lib/supabase')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('No estás autenticado. Por favor inicia sesión.')
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: content.trim(),
          userId: user.id,
          sessionId,
          // Contexto del usuario para personalización
          userName: user.nombre,
          userRole: user.rol || user.role_id,
          userPermissions: userPermissions.effectivePermissions,
        }),
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Has alcanzado el límite de mensajes. Por favor espera un momento.')
        }
        throw new Error('Error al procesar tu consulta. Intenta de nuevo.')
      }

      const data: ChatbotResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido')
      }

      // Agregar respuesta del asistente
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        data: data.data,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)

      // Agregar mensaje de error
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ ${errorMessage}`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }, [user, sessionId])

  const clearMessages = useCallback(() => {
    // Mantener solo el mensaje de bienvenida
    setMessages((prev) => prev.slice(0, 1))
    setError(null)
  }, [])

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMessage) {
      sendMessage(lastUserMessage.content)
    }
  }, [messages, sendMessage])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage,
    sessionId,
  }
}

