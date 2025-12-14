/**
 * Tokens de diseño consistentes para el sistema de ayudas
 * Evita variaciones en estilos entre módulos
 */
export const HELP_TOKENS = {
  delays: {
    open: 200,
    close: 100,
  },
  maxWidths: {
    tooltip: 320,
    popover: 480,
  },
  spacing: {
    gap: 8,
    padding: 12,
  },
  zIndex: {
    tooltip: 50,
    popover: 100,
    panel: 40,
  },
  mobile: {
    autoCloseDelay: 3000, // 3 segundos para tooltips en mobile
  },
} as const

