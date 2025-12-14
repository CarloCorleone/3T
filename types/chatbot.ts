// Tipos para el sistema de chatbot

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  data?: any // Datos estructurados de la respuesta
}

export type ChatSession = {
  sessionId: string
  userId: string
  messages: ChatMessage[]
  createdAt: Date
}

export type ChatbotResponse = {
  success: boolean
  message: string
  data?: any
  error?: string
}

export type QuickAction = {
  id: string
  label: string
  icon: string
  query: string
}

// Funciones disponibles en el chatbot
export type ChatFunction = 
  | 'get_orders_by_status'
  | 'get_pending_orders_by_supplier'
  | 'get_customer_contact'
  | 'get_pending_payments'
  | 'get_sales_summary'
  | 'update_order_status'

export type ChatFunctionResult = {
  function_name: ChatFunction
  result: any
}

// Rate limiting
export type RateLimitInfo = {
  remaining: number
  resetAt: Date
  limit: number
}

