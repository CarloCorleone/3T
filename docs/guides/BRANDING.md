# 🎨 Guía de Branding - Agua Tres Torres

Documentación sobre la identidad visual y branding del sistema.

## 📑 Índice

- [Logos](#logos)
- [Colores Corporativos](#colores-corporativos)
- [Tipografía](#tipografía)
- [Íconos](#íconos)
- [Implementación](#implementación)

---

## 🖼️ Logos

### Ubicación

Todos los logos se encuentran en: `/public/images/logos/`

### Archivos Disponibles

#### Logo Principal (Uso General)

- **`Logo-Tres-Torres-512x512.png`** (512×512px)
  - **Uso**: Hero de página de inicio, PWA icon, redes sociales
  - **Formato**: PNG con transparencia
  - **Tamaño**: 72 KB

#### Logo Cuadrado (Interfaces)

- **`logo-cuadrado-250x250.png`** (250×250px)
  - **Uso**: Sidebar, header, favicon, PDFs, manifest
  - **Formato**: PNG con transparencia
  - **Tamaño**: 19 KB

#### Favicon

- **`favicon.ico`** (Multi-resolución ICO)
  - **Uso**: Pestaña del navegador (legacy)
  - **Formato**: ICO
  
- **`favicon.png`** (PNG)
  - **Uso**: Pestaña del navegador (moderno)
  - **Formato**: PNG

#### Íconos para Dispositivos Móviles

- **`logo-cuadrado-57x57-iphone.png`** (57×57px)
  - **Uso**: iPhone, PWA icon
  
- **`logo-cuadrado-72x72-ipad.png`** (72×72px)
  - **Uso**: iPad, PWA icon

#### Logos Adicionales

- **`Logo-Tres-torres-grande.jpg`** (Alta resolución)
  - **Uso**: Impresión, marketing
  - **Tamaño**: 123 KB

- **`Logo-Tres-Torres-Chico.jpg`** (Versión pequeña)
  - **Uso**: Emails, firmas
  - **Tamaño**: 5.3 KB

- **`Logo-Tres-torres@2x.png`** (Retina display)
  - **Uso**: Pantallas de alta densidad
  - **Tamaño**: 123 KB

- **`logo-tres-torres-b&w.jpg`** (Blanco y negro)
  - **Uso**: Faxes, documentos monocromáticos
  - **Tamaño**: 90 KB

- **`logo-cuadrado-sii.jpg`** (SII)
  - **Uso**: Facturación electrónica, SII
  - **Tamaño**: 8.5 KB

---

## 🎨 Colores Corporativos

### Paleta Principal

```css
/* Azul Turquesa - Color Principal */
--primary: #0891b2       /* oklch(0.5393 0.2713 286.7462) */
--primary-dark: #0e7490  /* Versión oscura */
--primary-light: #06b6d4 /* Cyan brillante - Acento */

/* Colores de Apoyo */
--text: #0f172a         /* Slate oscuro */
--text-light: #64748b   /* Slate medio */
--border: #e2e8f0       /* Slate muy claro */
--background: #f8fafc   /* Casi blanco */
```

### Uso de Colores

| Color | HEX | Uso |
|-------|-----|-----|
| 🔵 Primary | `#0891b2` | Botones principales, links, elementos interactivos |
| 🔷 Primary Dark | `#0e7490` | Hover states, sombras |
| 💠 Accent | `#06b6d4` | Destacados, notificaciones, badges |
| ⚫ Text | `#0f172a` | Texto principal |
| 🔘 Text Light | `#64748b` | Texto secundario, placeholder |

### Colores Semánticos (Stats Cards)

```css
--blue: #0891b2    /* Ingresos */
--green: #10b981   /* Clientes */
--orange: #f97316  /* Pedidos */
--purple: #a855f7  /* Productos */
--indigo: #6366f1  /* Rutas */
--cyan: #06b6d4    /* Presupuestos */
--amber: #f59e0b   /* Reportes */
```

---

## 📝 Tipografía

### Fuentes

```css
--font-sans: 'Plus Jakarta Sans', sans-serif;  /* UI Principal */
--font-serif: 'Lora', serif;                   /* Títulos especiales */
--font-mono: 'IBM Plex Mono', monospace;       /* Código, datos */
```

### Uso de Fuentes

- **Sans-serif (Plus Jakarta Sans)**: Todo el UI, textos generales
- **Serif (Lora)**: No se usa actualmente (reservado)
- **Monospace (IBM Plex Mono)**: Datos numéricos, códigos, IDs

---

## 🔣 Íconos

### Librería

**Lucide React** - https://lucide.dev/

### Íconos Principales por Módulo

```typescript
import {
  Home,           // Inicio
  BarChart3,      // Dashboard
  Users,          // Clientes
  Package,        // Productos
  ClipboardList,  // Pedidos
  Route,          // Rutas
  Map,            // Mapa
  FileText,       // Presupuestos/Reportes
  TrendingUp,     // Estadísticas
  ArrowUpRight    // Links externos
} from 'lucide-react'
```

---

## 🛠️ Implementación

### 1. Logo en Sidebar

```tsx
import Image from 'next/image'

<Image
  src="/images/logos/logo-cuadrado-250x250.png"
  alt="Tres Torres Logo"
  width={32}
  height={32}
  className="rounded-lg object-contain"
  priority
/>
```

### 2. Logo en Header

```tsx
<Image
  src="/images/logos/logo-cuadrado-250x250.png"
  alt="Tres Torres"
  width={28}
  height={28}
  className="rounded object-contain"
/>
```

### 3. Logo en Hero (Página de Inicio)

```tsx
<Image
  src="/images/logos/Logo-Tres-Torres-512x512.png"
  alt="Agua Tres Torres"
  width={128}
  height={128}
  className="drop-shadow-lg"
  priority
/>
```

### 4. Favicon

Ubicación: `/app/favicon.ico`

El favicon se copia automáticamente desde `/public/images/logos/favicon.ico`

### 5. Manifest PWA

Ubicación: `/public/manifest.json`

```json
{
  "name": "Agua Tres Torres - Sistema de Gestión",
  "short_name": "Tres Torres",
  "icons": [
    {
      "src": "/images/logos/Logo-Tres-Torres-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 6. Metadata (Layout)

```tsx
export const metadata: Metadata = {
  title: "Agua Tres Torres - Sistema de Gestión",
  icons: {
    icon: [
      { url: "/images/logos/favicon.ico" },
      { url: "/images/logos/logo-cuadrado-250x250.png" }
    ],
    apple: [
      { url: "/images/logos/logo-cuadrado-57x57-iphone.png" },
      { url: "/images/logos/logo-cuadrado-72x72-ipad.png" }
    ]
  }
}
```

### 7. PDF Generator

```typescript
const COMPANY_INFO = {
  name: 'Agua Purificada Tres Torres Limitada',
  logo: '/images/logos/logo-cuadrado-250x250.png',
}
```

---

## 📱 Progressive Web App (PWA)

### Configuración Completa

La aplicación está configurada como PWA con:

✅ **Manifest JSON** con todos los íconos  
✅ **Favicons multi-dispositivo**  
✅ **Apple Touch Icons** para iOS  
✅ **Theme Color** configurado  
✅ **Shortcuts** para acceso rápido  

### Instalación

Los usuarios pueden instalar la app en:
- 📱 Dispositivos móviles (Android/iOS)
- 💻 Escritorio (Chrome/Edge)

---

## 🎯 Mejores Prácticas

### ✅ Hacer

- Usar siempre `logo-cuadrado-250x250.png` para UI
- Usar `Logo-Tres-Torres-512x512.png` para hero y PWA
- Mantener transparencia en PNGs
- Usar `next/image` para optimización automática
- Añadir `priority` a logos above-the-fold
- Usar `alt` descriptivos para accesibilidad

### ❌ No Hacer

- No usar JPGs para logos en UI (pierden transparencia)
- No hardcodear dimensiones sin `next/image`
- No olvidar el logo blanco y negro para documentos
- No cambiar colores corporativos sin documentar
- No usar logos de baja resolución

---

## 🔄 Actualizaciones Futuras

Si necesitas actualizar el logo:

1. Reemplaza los archivos en `/public/images/logos/`
2. Mantén los mismos nombres de archivo
3. Respeta las dimensiones originales
4. Actualiza el favicon: `cp /public/images/logos/favicon.ico /app/favicon.ico`
5. Limpia la caché: `npm run build`

---

## 📞 Contacto

Para dudas sobre branding o necesidad de nuevos materiales gráficos, contactar al equipo de diseño.

---

**Última actualización**: 10 de Octubre, 2025

