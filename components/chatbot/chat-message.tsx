'use client'

import { ChatMessage as ChatMessageType } from '@/types/chatbot'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChatMessageProps = {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-cyan-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        )}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Contenido */}
      <div className={cn('flex-1 space-y-1', isUser && 'items-end')}>
        <div
          className={cn(
            'inline-block px-4 py-2 rounded-2xl max-w-[85%]',
            isUser
              ? 'bg-cyan-600 text-white rounded-tr-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
          )}
        >
          <div className="whitespace-pre-wrap break-words text-sm">
            {message.content}
          </div>
        </div>

        {/* Timestamp */}
        <div
          className={cn(
            'text-xs text-gray-500 dark:text-gray-400 px-1',
            isUser && 'text-right'
          )}
        >
          {format(new Date(message.timestamp), 'HH:mm', { locale: es })}
        </div>
      </div>
    </div>
  )
}

