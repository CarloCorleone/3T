/**
 * Utilidades de manejo de fechas con soporte para timezone de Chile
 * 
 * Chile usa timezone America/Santiago (UTC-3 o UTC-4 según horario de verano)
 * Este módulo asegura que las fechas se manejen correctamente sin desfases
 * 
 * IMPORTANTE: Usa formatInTimeZone en lugar de toZonedTime para evitar desfases de fechas
 */

import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'

// Timezone de Chile
const CHILE_TZ = 'America/Santiago'

/**
 * Obtiene la fecha actual en Chile como string en formato yyyy-MM-dd
 * Útil para inputs de tipo date
 * @returns String en formato yyyy-MM-dd (ej: "2025-10-27")
 */
export function getChileDateString(): string {
  return formatInTimeZone(new Date(), CHILE_TZ, 'yyyy-MM-dd')
}

/**
 * Formatea una fecha para mostrar en la UI con formato legible
 * @param date - Fecha a formatear (Date, string ISO, o null/undefined)
 * @returns String formateado (ej: "27 oct 2025") o "-" si no hay fecha
 */
export function formatDateForDisplay(date: Date | string | null | undefined): string {
  if (!date) return '-'
  
  // Si es string en formato YYYY-MM-DD (solo fecha, sin hora), tratarlo como fecha local de Chile
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Agregar "T12:00:00" para interpretar como mediodía en timezone local (evita problemas de DST)
    const dateWithTime = `${date}T12:00:00`
    return formatInTimeZone(dateWithTime, CHILE_TZ, 'dd MMM yyyy', { locale: es })
  }
  
  // Para Date objects o strings con hora, formatear normalmente
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(dateObj, CHILE_TZ, 'dd MMM yyyy', { locale: es })
}

/**
 * Formatea una fecha y hora para mostrar en la UI
 * @param date - Fecha a formatear
 * @returns String formateado (ej: "27 oct 2025, 14:30") o "-" si no hay fecha
 */
export function formatDateTimeForDisplay(date: Date | string | null | undefined): string {
  if (!date) return '-'
  
  // Si es string en formato YYYY-MM-DD (solo fecha, sin hora), tratarlo como mediodía
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const dateWithTime = `${date}T12:00:00`
    return formatInTimeZone(dateWithTime, CHILE_TZ, 'dd MMM yyyy, HH:mm', { locale: es })
  }
  
  // Para Date objects o strings con hora completa, formatear normalmente
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(dateObj, CHILE_TZ, 'dd MMM yyyy, HH:mm', { locale: es })
}

/**
 * Obtiene la fecha y hora actual en timezone de Chile
 * @returns Date object representando ahora en Chile
 */
export function getChileDate(): Date {
  return new Date()
}

/**
 * Formatea cualquier fecha en un formato específico usando timezone de Chile
 * @param date - Fecha a formatear
 * @param formatStr - Formato deseado (ej: 'yyyy-MM-dd', 'dd/MM/yyyy')
 * @returns String formateado
 */
export function formatChileDate(date: Date | string, formatStr: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(dateObj, CHILE_TZ, formatStr, { locale: es })
}

