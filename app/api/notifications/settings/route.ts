// =====================================================
// API: Configuración de Notificaciones
// GET: Obtener preferencias del usuario
// PUT: Actualizar preferencias
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

// =====================================================
// GET - Obtener configuración
// =====================================================
export async function GET(request: NextRequest) {
  try {
    // Obtener usuario autenticado
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }
    
    const session = JSON.parse(sessionCookie.value)
    const userId = session.user?.id
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      )
    }
    
    // Obtener configuración del usuario
    const { data, error } = await supabase
      .from('3t_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .order('notification_type')
    
    if (error) {
      throw error
    }
    
    // Si no hay configuración, inicializarla
    if (!data || data.length === 0) {
      const defaultSettings = [
        { notification_type: 'pedido_creado', enabled: false, channel: 'both' },
        { notification_type: 'pedido_ruta', enabled: false, channel: 'both' },
        { notification_type: 'pedido_despachado', enabled: true, channel: 'both' },
        { notification_type: 'compra_completada', enabled: false, channel: 'both' },
        { notification_type: 'cliente_nuevo', enabled: false, channel: 'both' }
      ]
      
      const { data: newSettings, error: insertError } = await supabase
        .from('3t_notification_settings')
        .insert(
          defaultSettings.map(s => ({
            user_id: userId,
            ...s
          }))
        )
        .select()
      
      if (insertError) {
        throw insertError
      }
      
      return NextResponse.json({
        success: true,
        settings: newSettings || []
      })
    }
    
    return NextResponse.json({
      success: true,
      settings: data
    })
    
  } catch (error: any) {
    console.error('[API] Error obteniendo configuración:', error)
    
    return NextResponse.json(
      {
        error: 'Error obteniendo configuración',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// =====================================================
// PUT - Actualizar configuración
// =====================================================
export async function PUT(request: NextRequest) {
  try {
    // Obtener usuario autenticado
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }
    
    const session = JSON.parse(sessionCookie.value)
    const userId = session.user?.id
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      )
    }
    
    // Obtener datos de actualización
    const body = await request.json()
    const { notificationType, enabled, channel } = body
    
    if (!notificationType) {
      return NextResponse.json(
        { error: 'Tipo de notificación requerido' },
        { status: 400 }
      )
    }
    
    // Validar tipo de notificación
    const validTypes = [
      'pedido_creado',
      'pedido_ruta',
      'pedido_despachado',
      'compra_completada',
      'cliente_nuevo'
    ]
    
    if (!validTypes.includes(notificationType)) {
      return NextResponse.json(
        { error: 'Tipo de notificación inválido' },
        { status: 400 }
      )
    }
    
    // Validar canal si se proporciona
    if (channel && !['in_app', 'push', 'both'].includes(channel)) {
      return NextResponse.json(
        { error: 'Canal inválido' },
        { status: 400 }
      )
    }
    
    // Preparar datos de actualización
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (typeof enabled === 'boolean') {
      updateData.enabled = enabled
    }
    
    if (channel) {
      updateData.channel = channel
    }
    
    // Actualizar configuración
    const { data, error } = await supabase
      .from('3t_notification_settings')
      .update(updateData)
      .eq('user_id', userId)
      .eq('notification_type', notificationType)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    console.log(`[API] Configuración actualizada: ${notificationType}`, updateData)
    
    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada correctamente',
      setting: data
    })
    
  } catch (error: any) {
    console.error('[API] Error actualizando configuración:', error)
    
    return NextResponse.json(
      {
        error: 'Error actualizando configuración',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// =====================================================
// PATCH - Actualizar múltiples configuraciones
// =====================================================
export async function PATCH(request: NextRequest) {
  try {
    // Obtener usuario autenticado
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }
    
    const session = JSON.parse(sessionCookie.value)
    const userId = session.user?.id
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      )
    }
    
    // Obtener array de actualizaciones
    const body = await request.json()
    const { updates } = body
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Array de actualizaciones requerido' },
        { status: 400 }
      )
    }
    
    // Ejecutar todas las actualizaciones
    const results = await Promise.allSettled(
      updates.map(async (update) => {
        const { notificationType, enabled, channel } = update
        
        const updateData: any = {
          updated_at: new Date().toISOString()
        }
        
        if (typeof enabled === 'boolean') {
          updateData.enabled = enabled
        }
        
        if (channel) {
          updateData.channel = channel
        }
        
        return await supabase
          .from('3t_notification_settings')
          .update(updateData)
          .eq('user_id', userId)
          .eq('notification_type', notificationType)
      })
    )
    
    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failCount = results.filter(r => r.status === 'rejected').length
    
    console.log(`[API] Actualizaciones masivas: ${successCount} éxitos, ${failCount} fallos`)
    
    return NextResponse.json({
      success: successCount > 0,
      message: `${successCount} configuraciones actualizadas`,
      details: {
        total: updates.length,
        success: successCount,
        failed: failCount
      }
    })
    
  } catch (error: any) {
    console.error('[API] Error en actualización masiva:', error)
    
    return NextResponse.json(
      {
        error: 'Error en actualización masiva',
        details: error.message
      },
      { status: 500 }
    )
  }
}


