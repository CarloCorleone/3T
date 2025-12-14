# 🚨 Migración Urgente: Google Maps Autocomplete

**Fecha de Creación:** Octubre 9, 2025  
**Prioridad:** 🟡 MEDIA-ALTA  
**Tiempo Estimado:** 1-2 horas  
**Deadline Sugerido:** Próximos 2-4 semanas

---

## 📋 Resumen Ejecutivo

El sistema actualmente usa `google.maps.places.Autocomplete` (API antigua) que **ya no está disponible para nuevas API Keys desde marzo 2025**.

**Impacto:**
- ✅ Tu sistema actual **SÍ funciona** (API Key creada antes de marzo 2025)
- ❌ Nuevos usuarios **NO podrán replicar** el sistema con la documentación actual
- ❌ Si pierdes la API Key actual, tendrás que migrar obligatoriamente

---

## 🎯 El Problema

### Warning Actual en Consola

```
As of March 1st, 2025, google.maps.places.Autocomplete is not available 
to new customers. Please use google.maps.places.PlaceAutocompleteElement 
instead.
```

### ¿Qué Significa?

| Aspecto | Estado |
|---------|--------|
| **Tu sistema actual** | ✅ Funciona perfectamente |
| **Tu API Key actual** | ✅ Sigue teniendo acceso |
| **Nuevas instalaciones** | ❌ NO funcionarán con API Keys nuevas |
| **Documentación INSTALACION-COMPLETA.md** | ❌ Instrucciones obsoletas |
| **Replicabilidad del sistema** | ❌ Imposible para nuevos usuarios |

### Timeline

```
Marzo 1, 2025         Octubre 9, 2025 (HOY)
     │                       │
     ├───────────────────────┤
     │   7 meses después     │
     │                       │
     ↓                       ↓
API Keys nuevas      Documentación creada
ya NO tienen         con instrucciones que
acceso a             NO funcionarán para
Autocomplete         usuarios nuevos
```

---

## 🔧 Qué Hacer

### Migrar de Autocomplete → PlaceAutocompleteElement

**Archivo a modificar:** `/opt/cane/3t/app/clientes/page.tsx`

#### ANTES (Código Actual)

```typescript
// Líneas 96-100
const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
  componentRestrictions: { country: 'cl' },
  fields: ['formatted_address', 'geometry', 'address_components'],
  types: ['address']
})

// Líneas 103-133
autocomplete.addListener('place_changed', () => {
  const place = autocomplete.getPlace()
  // ... procesamiento
})
```

#### DESPUÉS (Nuevo Componente)

**Opción A: Usando el Web Component directamente**

```typescript
// En el JSX, reemplazar el Input actual por:
<gmp-place-autocomplete 
  ref={addressInputRef}
  placeholder="Comienza a escribir la dirección..."
  onPlaceChange={(e: any) => {
    const place = e.target.place
    if (!place || !place.geometry) return
    
    // Extraer comuna
    let commune = ''
    if (place.addressComponents) {
      const communeComponent = place.addressComponents.find((component: any) =>
        component.types.includes('administrative_area_level_3') ||
        component.types.includes('locality')
      )
      commune = communeComponent ? communeComponent.longText : ''
    }
    
    setAddressFormData({
      raw_address: place.formattedAddress || '',
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
      commune: commune,
      directions: addressFormData.directions,
      is_default: addressFormData.is_default
    })
  }}
>
</gmp-place-autocomplete>
```

**Opción B: Wrapper React más controlado**

```typescript
// Crear componente wrapper
const GooglePlaceAutocomplete = ({ value, onChange, onSelect }: any) => {
  const autocompleteRef = useRef<any>(null)
  
  useEffect(() => {
    if (!autocompleteRef.current) return
    
    const handlePlaceChange = (e: any) => {
      const place = e.target.place
      if (onSelect && place) {
        onSelect(place)
      }
    }
    
    autocompleteRef.current.addEventListener('gmp-placeselect', handlePlaceChange)
    
    return () => {
      autocompleteRef.current?.removeEventListener('gmp-placeselect', handlePlaceChange)
    }
  }, [onSelect])
  
  return (
    <gmp-place-autocomplete
      ref={autocompleteRef}
      placeholder="Comienza a escribir la dirección..."
      country="cl"
      type="address"
    />
  )
}
```

---

## 📦 Cambios Necesarios

### 1. Archivo: `/opt/cane/3t/app/clientes/page.tsx`

**Cambios en imports/tipos:**
```typescript
// Ya no necesitas useRef para el input tradicional
// El Web Component se maneja diferente

// Agregar tipos globales (opcional)
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': any
    }
  }
}
```

**Cambios en el useEffect:**
```typescript
// ELIMINAR el useEffect completo actual (líneas 83-145)
// Ya no es necesario porque el Web Component maneja todo
```

**Cambios en el JSX del modal:**
```typescript
// Reemplazar el Input actual (línea ~901-912) por:
<div className="space-y-2">
  <Label htmlFor="raw_address">Dirección Completa *</Label>
  <gmp-place-autocomplete
    id="raw_address"
    placeholder="Comienza a escribir la dirección..."
    onPlaceChange={(e: any) => {
      const place = e.target.place
      if (!place?.geometry) return
      
      let commune = ''
      if (place.addressComponents) {
        const communeComponent = place.addressComponents.find((c: any) =>
          c.types.includes('administrative_area_level_3') ||
          c.types.includes('locality')
        )
        commune = communeComponent?.longText || ''
      }
      
      setAddressFormData({
        ...addressFormData,
        raw_address: place.formattedAddress || '',
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        commune: commune
      })
    }}
  />
</div>
```

### 2. Archivo: `/opt/cane/3t/app/clientes/page.tsx` - Script Loading

**Cambiar la forma de cargar Google Maps:**

```typescript
// ANTES (línea ~989-993)
<Script
  src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
  strategy="afterInteractive"
  onLoad={() => setGoogleMapsLoaded(true)}
/>

// DESPUÉS
<Script
  src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
  strategy="afterInteractive"
  onLoad={() => setGoogleMapsLoaded(true)}
/>
```

### 3. Archivo: `/opt/cane/3t/app/globals.css`

**Los estilos del `.pac-container` ya NO son necesarios** con el nuevo componente, pero puedes mantenerlos por compatibilidad o eliminarlos:

```css
/* Estos estilos pueden eliminarse si solo usas PlaceAutocompleteElement */
/* O mantenerlos por si hay otros usos de Autocomplete en el futuro */
.pac-container { ... }
.pac-item { ... }
```

---

## 🧪 Testing Después de la Migración

### Checklist de Verificación

- [ ] El dropdown de sugerencias aparece al escribir
- [ ] Se pueden hacer clic en las sugerencias
- [ ] La dirección se autocompleta correctamente
- [ ] Las coordenadas (lat/lng) se capturan
- [ ] La comuna se extrae correctamente
- [ ] El modal NO se cierra al seleccionar una dirección
- [ ] Se pueden agregar indicaciones adicionales
- [ ] El checkbox de "predeterminada" funciona
- [ ] Se puede crear la dirección exitosamente
- [ ] No hay errores en la consola (excepto el warning que desaparecerá)

### Comandos para Testing

```bash
# Rebuild y redeploy
cd /opt/cane/3t
docker compose build
docker compose up -d

# Ver logs
docker logs -f 3t-app

# Acceder a la app
# https://3t.loopia.cl/clientes
# → Editar cliente → Agregar dirección → Probar autocompletado
```

---

## 📚 Documentación a Actualizar

Después de la migración, actualizar estos documentos:

### 1. `/opt/cane/3t/README.md`
**Sección:** "Configurar Google Maps API"
- ✅ Ya está actualizada (menciona Places API)
- 🔄 Agregar nota sobre PlaceAutocompleteElement

### 2. `/opt/cane/3t/docs/INSTALACION-COMPLETA.md`
**Sección 4:** "Configuración de Google Maps API"
- 🔄 Actualizar que ahora se usa PlaceAutocompleteElement
- 🔄 Remover nota sobre "Places API (antigua)"

### 3. `/opt/cane/3t/docs/CHANGELOG.md`
- ➕ Agregar entrada: "Migración a PlaceAutocompleteElement"
- ➕ Fecha: Octubre [DÍA], 2025
- ➕ Motivo: Compatibilidad con nuevas API Keys de Google

### 4. `/opt/cane/3t/docs/GETTING-STARTED.md`
**Sección:** "Nueva Funcionalidad: Autocompletado de Direcciones"
- 🔄 Actualizar descripción técnica
- 🔄 Mencionar que usa PlaceAutocompleteElement

---

## 🔗 Referencias Útiles

### Documentación Oficial de Google

1. **Guía de Migración:**
   https://developers.google.com/maps/documentation/javascript/places-migration-overview

2. **PlaceAutocompleteElement - Referencia:**
   https://developers.google.com/maps/documentation/javascript/place-autocomplete

3. **Place Autocomplete Element - Ejemplos:**
   https://developers.google.com/maps/documentation/javascript/examples/place-autocomplete-element

4. **Legacy APIs Info:**
   https://developers.google.com/maps/legacy

### Ejemplos de Código

- **Ejemplo oficial con React:**
  https://github.com/googlemaps/js-samples/tree/main/samples/place-autocomplete-element

- **Comparación Autocomplete vs PlaceAutocompleteElement:**
  https://developers.google.com/maps/documentation/javascript/place-autocomplete#differences

---

## ⏱️ Plan de Trabajo Sugerido

### Sesión de Tarde (2-3 horas)

#### Fase 1: Preparación (15 min)
- [ ] Leer documentación de Google
- [ ] Revisar ejemplos oficiales
- [ ] Backup del código actual

#### Fase 2: Implementación (60 min)
- [ ] Modificar `/app/clientes/page.tsx`
- [ ] Actualizar imports y tipos
- [ ] Reemplazar useEffect de Autocomplete
- [ ] Reemplazar Input por Web Component
- [ ] Ajustar handlers de eventos

#### Fase 3: Testing (30 min)
- [ ] Build local: `npm run build`
- [ ] Probar en desarrollo: `npm run dev`
- [ ] Verificar cada punto del checklist
- [ ] Corregir errores si los hay

#### Fase 4: Deploy (15 min)
- [ ] Build Docker: `docker compose build`
- [ ] Deploy: `docker compose up -d`
- [ ] Verificar en producción
- [ ] Confirmar que funciona correctamente

#### Fase 5: Documentación (30 min)
- [ ] Actualizar README.md
- [ ] Actualizar INSTALACION-COMPLETA.md
- [ ] Actualizar CHANGELOG.md
- [ ] Actualizar GETTING-STARTED.md
- [ ] Eliminar este archivo (ya cumplió su propósito)

---

## 🎯 Criterios de Éxito

La migración será exitosa cuando:

✅ El autocompletado funciona igual que antes  
✅ No hay warnings de Google Maps en consola  
✅ El código usa `PlaceAutocompleteElement`  
✅ La documentación está actualizada  
✅ Nuevos usuarios pueden replicar el sistema con API Keys nuevas  
✅ Todos los tests de funcionalidad pasan  

---

## 💡 Tips y Consideraciones

### Diferencias Clave a Tener en Cuenta

| Aspecto | Autocomplete (viejo) | PlaceAutocompleteElement (nuevo) |
|---------|---------------------|----------------------------------|
| **Inicialización** | Manual con `new Autocomplete()` | Automática con Web Component |
| **Eventos** | `addListener('place_changed')` | `onPlaceChange` prop |
| **Acceso a datos** | `getPlace()` | `e.target.place` |
| **Nombres de campos** | `formatted_address` | `formattedAddress` (camelCase) |
| **Address components** | `address_components` | `addressComponents` |
| **Long name** | `long_name` | `longText` |
| **Limpieza** | Manual con `clearInstanceListeners` | Automática |

### Posibles Issues

1. **TypeScript puede quejarse del Web Component**
   - Solución: Declarar tipos globales (ver arriba)

2. **Estilos pueden verse diferentes**
   - Solución: Agregar CSS personalizado si es necesario

3. **El modal podría seguir cerrándose**
   - Solución: El `onInteractOutside` existente debería seguir funcionando

---

## 📞 Soporte

Si encuentras problemas durante la migración:

1. **Revisar la consola** del navegador para errores específicos
2. **Verificar que la API Key** tenga "Places API" habilitada
3. **Consultar ejemplos oficiales** de Google (enlaces arriba)
4. **Revisar este documento** - tiene toda la info necesaria

---

## ✅ Checklist Final Pre-Migración

Antes de empezar, asegúrate de tener:

- [ ] Acceso al servidor y código
- [ ] Google Cloud Console abierto
- [ ] API Key actual anotada
- [ ] Backup del código actual
- [ ] Tiempo libre de 2-3 horas
- [ ] Este documento a mano como referencia
- [ ] Documentación de Google abierta en tabs
- [ ] Ambiente de desarrollo listo (`npm run dev`)

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Documento de Migración - Google Maps Autocomplete**  
**Fecha:** Octubre 9, 2025  
**Archivo temporal - Eliminar después de migrar**

