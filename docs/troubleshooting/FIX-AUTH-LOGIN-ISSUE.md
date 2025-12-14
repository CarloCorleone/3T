# 🔐 Fix: Problema de Autenticación después de Logout

## Problema Identificado

**Fecha**: Octubre 16, 2025  
**Reportado por**: Usuario  
**Síntomas**:
- Usuario puede iniciar sesión correctamente la primera vez
- Después de hacer logout, no puede volver a iniciar sesión
- Error: "Invalid login credentials" a pesar de tener las credenciales correctas
- Error HTTP 400 en `POST https://api.loopia.cl/auth/v1/token?grant_type=password`

## Causa Raíz

Después de hacer logout, quedaban datos residuales en `localStorage` y cookies del navegador que causaban conflictos con nuevos intentos de login. Específicamente:

1. **Tokens viejos en localStorage**: Las claves que comienzan con `supabase.*` no se limpiaban completamente
2. **Cookies de sesión persistentes**: Quedaban cookies activas que interferían con la nueva autenticación
3. **Estado corrupto**: El cliente de Supabase intentaba reutilizar tokens inválidos

## Solución Implementada

### 1. Mejora del método `signOut()` en `/lib/auth-store.ts`

**Antes**:
```typescript
signOut: async () => {
  await supabase.auth.signOut()
  set({ user: null })
}
```

**Después**:
```typescript
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
}
```

### 2. Mejora del método `signIn()` en `/lib/auth-store.ts`

Agregamos una limpieza preventiva antes de iniciar sesión:

```typescript
signIn: async (email: string, password: string) => {
  set({ loading: true })
  
  try {
    // PASO 0: Limpiar cualquier sesión anterior antes de intentar login
    await supabase.auth.signOut({ scope: 'local' }) // Limpieza local sin invalidar el token en el servidor
    
    // ... resto del código de login
  }
}
```

## Cómo Probar el Fix

### Prueba 1: Login → Logout → Login
```
1. Abrir https://3t.loopia.cl
2. Iniciar sesión con credenciales válidas (ej: admin@trestorres.cl)
3. Hacer logout
4. Volver a iniciar sesión con las mismas credenciales
5. ✅ Debe funcionar sin problemas
```

### Prueba 2: Verificar Limpieza de localStorage
```
1. Abrir DevTools → Application → Local Storage
2. Antes de logout: Debería haber claves como "supabase.auth.token"
3. Después de logout: TODAS las claves de Supabase deben estar eliminadas
4. ✅ No debe quedar ninguna clave que contenga "supabase"
```

## Si el Problema Persiste

### Opción 1: Limpiar localStorage Manualmente (Navegador)

Abrir DevTools (F12) y ejecutar en la consola:

```javascript
// Limpiar todo el localStorage relacionado con Supabase
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase')) {
    localStorage.removeItem(key)
  }
})

// Limpiar todas las cookies
document.cookie.split(";").forEach((c) => {
  document.cookie = c
    .replace(/^ +/, "")
    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
})

// Recargar la página
location.reload()
```

### Opción 2: Limpiar Cache del Navegador

**Chrome/Edge:**
1. Ctrl + Shift + Delete (Windows) o Cmd + Shift + Delete (Mac)
2. Seleccionar "Cookies y otros datos de sitios" y "Archivos e imágenes almacenados en caché"
3. Seleccionar "Desde siempre"
4. Hacer clic en "Borrar datos"

**Firefox:**
1. Ctrl + Shift + Delete
2. Seleccionar "Cookies" y "Caché"
3. Hacer clic en "Limpiar ahora"

### Opción 3: Modo Incógnito

Probar iniciar sesión en una ventana de incógnito/privada:
- Chrome: Ctrl + Shift + N
- Firefox: Ctrl + Shift + P
- Edge: Ctrl + Shift + N

Si funciona en modo incógnito, el problema es definitivamente el cache local.

## Usuarios Válidos para Pruebas

Según la base de datos, estos usuarios pueden iniciar sesión:

| Email | Nombre | Rol | Estado |
|-------|--------|-----|--------|
| admin@trestorres.cl | Carlo Espinoza | admin | ✅ Activo |
| operador@trestorres.cl | Operador Sistema | operador | ✅ Activo |
| repartidor@trestorres.cl | Repartidor Sistema | repartidor | ✅ Activo |

**Nota**: El usuario `prueba@trestorres.cl` existe en la tabla `3t_users` pero **NO** existe en Supabase Auth, por lo que no puede iniciar sesión.

## Verificación del Deployment

El fix fue desplegado en producción el 16 de Octubre de 2025:

```bash
✅ Build exitoso
✅ Contenedor reiniciado
✅ Health check OK
🌐 Disponible en: https://3t.loopia.cl
```

## Logs de Referencia

**Antes del fix**:
```
✅ Sesión verificada: Carlo Espinoza - admin
✅ Logout exitoso
POST https://api.loopia.cl/auth/v1/token?grant_type=password 400 (Bad Request)
❌ Error en login: AuthApiError: Invalid login credentials
```

**Después del fix** (esperado):
```
✅ Sesión verificada: Carlo Espinoza - admin
✅ Logout exitoso - Sesión completamente limpiada
✅ Login exitoso: Carlo Espinoza - admin
```

## Prevención de Problemas Futuros

### Recomendaciones:
1. ✅ Siempre limpiar localStorage completamente en logout
2. ✅ Hacer una limpieza preventiva antes de login
3. ✅ Manejar errores de autenticación con mensajes claros
4. ✅ Incluir logs detallados para debugging
5. ✅ Probar el flujo completo: login → logout → login

### Checklist para Nuevas Funcionalidades de Auth:
- [ ] ¿Limpia localStorage al cerrar sesión?
- [ ] ¿Limpia cookies al cerrar sesión?
- [ ] ¿Maneja errores de token expirado?
- [ ] ¿Incluye logs para debugging?
- [ ] ¿Funciona el flujo login → logout → login?

## Referencias

- **Archivo modificado**: `/lib/auth-store.ts`
- **Líneas**: 22-118
- **Método principal**: `signOut()` y `signIn()`
- **Configuración de Supabase**: `/lib/supabase.ts`

## Contacto

Si el problema persiste después de aplicar estas soluciones, contactar al administrador del sistema con:
- Captura de pantalla del error
- Logs de la consola del navegador (F12 → Console)
- Navegador y versión utilizada

