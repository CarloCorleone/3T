/**
 * Helper para tracking de interacciones con ayudas
 * Opcional - puede integrarse con Supabase o n8n webhook
 */

type HelpEvent = 'open' | 'disabled_view' | 'validation_view'

interface TrackingData {
  module: string
  key?: string
  place?: string
  reasons?: string[]
  timestamp?: string
}

export function trackHelp(event: HelpEvent, data: TrackingData) {
  const payload = {
    event,
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  }
  
  // Log en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('[HELP]', payload)
  }
  
  // TODO: Integrar con Supabase o webhook n8n para analytics
  // Ejemplo:
  // await supabase.from('help_events').insert(payload)
  // o
  // await fetch('https://n8n.loopia.cl/webhook/help-tracking', {
  //   method: 'POST',
  //   body: JSON.stringify(payload)
  // })
}

