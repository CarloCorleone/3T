import { create } from 'zustand'
import { supabase, type Usuario } from './supabase'

// Interface del store de autenticación
interface AuthStore {
  user: Usuario | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  checkAuth: () => Promise<void>
}

// Crear store de autenticación con Zustand
export const useAuthStore = create<AuthStore>((set) => ({
  // Estado inicial
  user: null,
  loading: true,
  
  // ==========================================
  // SIGN IN - Iniciar sesión
  // ==========================================
  signIn: async (email: string, password: string) => {
    set({ loading: true })
    
    try {
      // PASO 0: Limpiar cualquier sesión anterior antes de intentar login
      await supabase.auth.signOut({ scope: 'local' }) // Limpieza local sin invalidar el token en el servidor
      
      // PASO 1: Autenticar con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        throw error
      }
      
      if (!data.user) {
        throw new Error('No se recibió información del usuario')
      }
      
      // PASO 2: Obtener datos extendidos desde tabla 3t_users
      const { data: userData, error: userError } = await supabase
        .from('3t_users')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      if (userError) {
        throw userError
      }
      
      if (!userData) {
        throw new Error('No se encontró el perfil del usuario')
      }
      
      // PASO 3: Actualizar estado global
      set({ 
        user: {
          id: userData.id,
          email: userData.email,
          nombre: userData.nombre,
          rol: userData.rol as 'admin' | 'operador' | 'repartidor',
          role_id: userData.role_id,
          activo: userData.activo,
          last_login_at: userData.last_login_at,
          login_count: userData.login_count,
          created_at: userData.created_at,
          updated_at: userData.updated_at,
        }, 
        loading: false 
      })
      
      console.log('✅ Login exitoso:', userData.nombre, '-', userData.rol)
    } catch (error) {
      set({ loading: false, user: null })
      console.error('❌ Error en login:', error)
      throw error
    }
  },
  
  // ==========================================
  // SIGN OUT - Cerrar sesión
  // ==========================================
  signOut: async () => {
    try {
      // PASO 1: Cerrar sesión en Supabase
      await supabase.auth.signOut()
      
      // PASO 2: Limpiar TODOS los datos de autenticación en localStorage
      if (typeof window !== 'undefined') {
        // Limpiar todas las claves relacionadas con Supabase
        const keysToRemove = []
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key && key.includes('supabase')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => window.localStorage.removeItem(key))
        
        // Forzar limpieza de cookies de sesión
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
      }
      
      // PASO 3: Limpiar estado global
      set({ user: null, loading: false })
      
      console.log('✅ Logout exitoso - Sesión completamente limpiada')
    } catch (error) {
      console.error('❌ Error en logout:', error)
      // Incluso si hay error, limpiar el estado local
      set({ user: null, loading: false })
      throw error
    }
  },
  
  // ==========================================
  // CHECK AUTH - Verificar autenticación
  // ==========================================
  checkAuth: async () => {
    try {
      set({ loading: true })
      
      // PASO 1: Verificar si hay sesión activa
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        throw error
      }
      
      // PASO 2: Si no hay sesión, limpiar estado
      if (!session?.user) {
        set({ user: null, loading: false })
        return
      }
      
      // PASO 3: Obtener datos del usuario desde tabla 3t_users
      const { data: userData, error: userError } = await supabase
        .from('3t_users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (userError) {
        console.error('Error obteniendo datos del usuario:', userError)
        set({ user: null, loading: false })
        return
      }
      
      if (!userData) {
        set({ user: null, loading: false })
        return
      }
      
      // PASO 4: Actualizar estado global
      set({ 
        user: {
          id: userData.id,
          email: userData.email,
          nombre: userData.nombre,
          rol: userData.rol as 'admin' | 'operador' | 'repartidor',
          role_id: userData.role_id,
          activo: userData.activo,
          last_login_at: userData.last_login_at,
          login_count: userData.login_count,
          created_at: userData.created_at,
          updated_at: userData.updated_at,
        }, 
        loading: false 
      })
      
      console.log('✅ Sesión verificada:', userData.nombre, '-', userData.rol)
    } catch (error) {
      console.error('❌ Error verificando sesión:', error)
      set({ user: null, loading: false })
    }
  }
}))


