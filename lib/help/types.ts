/**
 * Tipos e interfaces para el sistema de ayudas contextuales
 */

export type HelpKey = 'rutas' | 'pedidos' | 'clientes' | 'productos'

export interface PopoverContent {
  title: string
  description?: string
  steps?: string[]
}

export interface ValidationItem {
  id: string
  label: string
  valid: boolean
  message?: string
}

export interface HelpContents {
  tooltips: Record<string, string>
  popovers: Record<string, PopoverContent>
  disabledReasons: Record<string, string>
  validations: Record<string, ValidationItem>
}

