import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con permisos administrativos (service_role)
 * SOLO usar para operaciones administrativas que requieren bypass de RLS
 * NO exponer este cliente en el navegador
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}

// Cliente con permisos de service_role para operaciones administrativas
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

