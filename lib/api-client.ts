import { supabase } from './supabase'

/**
 * Cliente HTTP para llamadas a API routes con autenticación automática
 * 
 * Agrega automáticamente el token JWT en el header Authorization
 */

/**
 * Obtiene el token JWT actual del usuario autenticado
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

/**
 * Realiza una petición HTTP autenticada
 * 
 * @param endpoint - URL del endpoint (ej: '/api/admin/users')
 * @param options - Opciones de fetch
 * @returns Response de fetch
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken()
  
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('Content-Type', 'application/json')

  return fetch(endpoint, {
    ...options,
    headers
  })
}

/**
 * Helper para peticiones POST autenticadas
 */
export async function authenticatedPost<T = any>(
  endpoint: string,
  body: any
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const response = await authenticatedFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        error: result.error || 'Error en la petición',
        status: response.status
      }
    }

    return {
      data: result.data,
      status: response.status
    }
  } catch (error: any) {
    console.error('Error en authenticatedPost:', error)
    return {
      error: error.message || 'Error de red',
      status: 500
    }
  }
}

/**
 * Helper para peticiones PATCH autenticadas
 */
export async function authenticatedPatch<T = any>(
  endpoint: string,
  body: any
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const response = await authenticatedFetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        error: result.error || 'Error en la petición',
        status: response.status
      }
    }

    return {
      data: result.data,
      status: response.status
    }
  } catch (error: any) {
    console.error('Error en authenticatedPatch:', error)
    return {
      error: error.message || 'Error de red',
      status: 500
    }
  }
}

/**
 * Helper para peticiones DELETE autenticadas
 */
export async function authenticatedDelete(
  endpoint: string
): Promise<{ data?: any; error?: string; status: number }> {
  try {
    const response = await authenticatedFetch(endpoint, {
      method: 'DELETE'
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        error: result.error || 'Error en la petición',
        status: response.status
      }
    }

    return {
      data: result.data,
      status: response.status
    }
  } catch (error: any) {
    console.error('Error en authenticatedDelete:', error)
    return {
      error: error.message || 'Error de red',
      status: 500
    }
  }
}

