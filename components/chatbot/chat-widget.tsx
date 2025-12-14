'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useChat } from '@/hooks/use-chat'
import { ChatMessage } from './chat-message'
import { ChatSuggestions } from './chat-suggestions'
import { useAuthStore } from '@/lib/auth-store'

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const user = useAuthStore((state) => state.user)
  const { messages, isLoading, sendMessage, clearMessages, retryLastMessage } = useChat()

  // Auto-scroll al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  // Focus en el textarea cuando se abre
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    await sendMessage(inputValue)
    setInputValue('')
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestionClick = (query: string) => {
    setInputValue(query)
    textareaRef.current?.focus()
  }

  const handleClearChat = () => {
    if (confirm('¿Estás seguro de que quieres limpiar el historial del chat?')) {
      clearMessages()
    }
  }

  // Keyboard shortcut: Ctrl+K para abrir/cerrar
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen])

  // No mostrar si no hay usuario autenticado
  if (!user) {
    return null
  }

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'w-14 h-14 rounded-full',
            'bg-cyan-600 hover:bg-cyan-700 text-white',
            'shadow-lg hover:shadow-xl',
            'flex items-center justify-center',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2'
          )}
          aria-label="Abrir chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Panel del chat */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'w-[400px] h-[600px]',
            'bg-white dark:bg-gray-900',
            'rounded-2xl shadow-2xl',
            'flex flex-col',
            'border border-gray-200 dark:border-gray-800',
            'animate-in slide-in-from-bottom-4 duration-300'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center">
                <MessageCircle size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Asistente 3T</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isLoading ? 'Escribiendo...' : 'En línea'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="h-8 w-8 p-0"
                title="Limpiar chat"
              >
                <Trash2 size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Mensajes */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <MessageCircle size={16} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="inline-block px-4 py-2 rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-800">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias (solo cuando no hay mensajes del usuario) */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <ChatSuggestions onSelectSuggestion={handleSuggestionClick} />
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta... (Shift+Enter para nueva línea)"
                className="min-h-[44px] max-h-[120px] resize-none"
                disabled={isLoading}
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="h-[44px] w-[44px] flex-shrink-0"
              >
                <Send size={18} />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Presiona <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+K</kbd> para abrir/cerrar
            </p>
          </div>
        </div>
      )}
    </>
  )
}

