import { ChatMessage } from '@/types/chatbot'

/**
 * Formatea un número como moneda chilena
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formatea una fecha de manera legible
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Extrae datos estructurados de una respuesta del chatbot
 */
export function extractStructuredData(message: ChatMessage): any {
  return message.data || null
}

/**
 * Verifica si un mensaje contiene un error
 */
export function isErrorMessage(message: ChatMessage): boolean {
  return message.content.startsWith('❌') || message.content.includes('Error')
}

/**
 * Genera un resumen del historial de chat para el contexto
 */
export function generateChatContext(messages: ChatMessage[]): string {
  const recentMessages = messages.slice(-5) // Últimos 5 mensajes
  return recentMessages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n')
}

/**
 * Sanitiza la entrada del usuario antes de enviar
 */
export function sanitizeUserInput(input: string): string {
  return input.trim().substring(0, 500) // Máximo 500 caracteres
}

/**
 * Determina el tipo de consulta basado en palabras clave
 */
export function detectQueryType(input: string): string {
  const lowerInput = input.toLowerCase()

  if (lowerInput.includes('pedido') || lowerInput.includes('ruta')) {
    return 'orders'
  }
  if (lowerInput.includes('deuda') || lowerInput.includes('pago') || lowerInput.includes('cobrar')) {
    return 'payments'
  }
  if (lowerInput.includes('teléfono') || lowerInput.includes('contacto') || lowerInput.includes('dirección')) {
    return 'contact'
  }
  if (lowerInput.includes('venta') || lowerInput.includes('vendí')) {
    return 'sales'
  }
  if (lowerInput.includes('proveedor') || lowerInput.includes('compra')) {
    return 'supplier'
  }

  return 'general'
}

