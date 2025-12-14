// =====================================================
// API: Registrar/Eliminar Push Subscription
// POST: Guardar nueva suscripción
// DELETE: Eliminar suscripción
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

// =====================================================
// POST - Registrar suscripción
// =====================================================
export async function POST(request: NextRequest) {
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
    
    // Obtener datos de la suscripción
    const body = await request.json()
    const { subscription } = body
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Datos de suscripción inválidos' },
        { status: 400 }
      )
    }
    
    // Extraer datos de la suscripción
    const { endpoint, keys } = subscription
    const { p256dh, auth } = keys
    
    // Obtener user agent
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    
    // Verificar si ya existe la suscripción
    const { data: existing, error: checkError } = await supabase
      .from('3t_push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .single()
    
    if (existing) {
      // Actualizar suscripción existente
      const { error: updateError } = await supabase
        .from('3t_push_subscriptions')
        .update({
          user_id: userId,
          p256dh,
          auth,
          user_agent: userAgent,
          last_used_at: new Date().toISOString()
        })
        .eq('endpoint', endpoint)
      
      if (updateError) {
        throw updateError
      }
      
      console.log('[API] Suscripción actualizada:', endpoint)
      
      return NextResponse.json({
        success: true,
        message: 'Suscripción actualizada correctamente'
      })
    }
    
    // Crear nueva suscripción
    const { error: insertError } = await supabase
      .from('3t_push_subscriptions')
      .insert({
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent
      })
    
    if (insertError) {
      throw insertError
    }
    
    console.log('[API] Nueva suscripción registrada:', endpoint)
    
    return NextResponse.json({
      success: true,
      message: 'Suscripción registrada correctamente'
    })
    
  } catch (error: any) {
    console.error('[API] Error registrando suscripción:', error)
    
    return NextResponse.json(
      {
        error: 'Error registrando suscripción',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// =====================================================
// DELETE - Eliminar suscripción
// =====================================================
export async function DELETE(request: NextRequest) {
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
    
    // Obtener endpoint a eliminar
    const body = await request.json()
    const { endpoint } = body
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint no proporcionado' },
        { status: 400 }
      )
    }
    
    // Eliminar suscripción
    const { error } = await supabase
      .from('3t_push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', userId)
    
    if (error) {
      throw error
    }
    
    console.log('[API] Suscripción eliminada:', endpoint)
    
    return NextResponse.json({
      success: true,
      message: 'Suscripción eliminada correctamente'
    })
    
  } catch (error: any) {
    console.error('[API] Error eliminando suscripción:', error)
    
    return NextResponse.json(
      {
        error: 'Error eliminando suscripción',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// =====================================================
// GET - Obtener suscripciones del usuario
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
    
    // Obtener suscripciones del usuario
    const { data, error } = await supabase
      .from('3t_push_subscriptions')
      .select('id, endpoint, user_agent, created_at, last_used_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      subscriptions: data || []
    })
    
  } catch (error: any) {
    console.error('[API] Error obteniendo suscripciones:', error)
    
    return NextResponse.json(
      {
        error: 'Error obteniendo suscripciones',
        details: error.message
      },
      { status: 500 }
    )
  }
}


