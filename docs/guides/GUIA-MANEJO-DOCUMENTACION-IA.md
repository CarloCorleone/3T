# 🤖 Guía de Manejo de Documentación para IA

**Para que las IAs sepan qué leer, actualizar o crear al iniciar una tarea**

---

## 📚 Estructura de Documentación del Proyecto 3t

### 🎯 Punto de Entrada Principal
**SIEMPRE empezar leyendo:**
1. **`/opt/cane/3t/.cursorrules`** - Reglas del proyecto (se lee automáticamente)
2. **`/opt/cane/3t/docs/INDEX.md`** - Índice maestro de toda la documentación
3. **`/opt/cane/3t/README.md`** - Documentación principal del proyecto

---

## 🗂️ Categorías de Documentación

### 📖 Documentación de Referencia (Siempre Leer)
```
/opt/cane/3t/
├── .cursorrules                    # 🤖 Reglas para IA (auto-cargado)
├── README.md                       # 📘 Documentación principal
└── docs/
    ├── INDEX.md                    # 📑 Índice maestro
    ├── GETTING-STARTED.md          # 🚀 Guía de inicio
    └── GUIA-RAPIDA.md              # ⚡ Comandos rápidos
```

### 🏗️ Documentación Técnica
```
docs/
├── ARQUITECTURA.md                 # 🏗️ Arquitectura técnica
├── DEPLOYMENT.md                   # 🐳 Guía de deployment
├── INSTALACION-COMPLETA.md         # 🆕 Instalación paso a paso
├── CONFIGURACION-PRODUCCION.md     # ⚙️ Configuración actual
└── BRANDING.md                     # 🎨 Identidad visual
```

### 🧩 Documentación de Módulos
```
docs/modules/
├── HOME.md                         # Página de inicio
├── DASHBOARD.md                    # Análisis de ventas
├── CLIENTES.md                     # Gestión de clientes (Google Maps)
├── PRODUCTOS.md                    # Catálogo de productos
├── PEDIDOS.md                      # Gestión de pedidos
├── RUTAS.md                        # Gestión de rutas
├── MAPA.md                         # Visualización geográfica
├── OPTIMIZADOR-RUTAS.md           # Optimizador de rutas
├── PRESUPUESTOS.md                 # Generación PDF
├── COMPRAS.md                      # Gestión de compras
└── PROVEEDORES.md                  # Gestión de proveedores
```

### 📝 Historial y Cambios
```
docs/
├── CHANGELOG.md                    # Historial completo de cambios
├── SISTEMA-PERMISOS-IMPLEMENTADO.md # Sistema de usuarios
├── RESUMEN-REPARACION-PROVEEDORES.md # Reparaciones específicas
└── BUSQUEDA-SIN-LIMITES.md         # Features implementadas
```

### 🔧 Troubleshooting
```
docs/troubleshooting/
└── SOLUCION-CORS-SUPABASE.md      # Soluciones técnicas
```

---

## 🎯 Qué Leer Según la Tarea

### 🆕 Nueva Feature o Módulo
**Leer en orden:**
1. `docs/INDEX.md` - Entender estructura general
2. `docs/ARQUITECTURA.md` - Arquitectura técnica
3. `docs/modules/[MODULO_RELACIONADO].md` - Módulos similares
4. `docs/CHANGELOG.md` - Ver implementaciones recientes
5. `README.md` - Stack tecnológico y convenciones

### 🔧 Bug Fix o Problema Técnico
**Leer en orden:**
1. `docs/GUIA-RAPIDA.md` - Troubleshooting rápido
2. `docs/troubleshooting/` - Soluciones específicas
3. `docs/CHANGELOG.md` - Ver si ya se resolvió antes
4. `docs/ARQUITECTURA.md` - Entender el sistema

### 🚀 Deployment o Configuración
**Leer en orden:**
1. `docs/DEPLOYMENT.md` - Guía de deployment
2. `docs/CONFIGURACION-PRODUCCION.md` - Configuración actual
3. `docs/INSTALACION-COMPLETA.md` - Si es instalación nueva
4. `docs/GUIA-RAPIDA.md` - Comandos esenciales

### 🎨 Cambios de UI/UX
**Leer en orden:**
1. `docs/BRANDING.md` - Identidad visual
2. `docs/modules/[MODULO].md` - Funcionalidad actual
3. `docs/CHANGELOG.md` - Cambios recientes de UI
4. `README.md` - Stack de UI (shadcn/ui, Tailwind)

### 🗄️ Cambios de Base de Datos
**Leer en orden:**
1. `README.md` - Sección "Base de Datos"
2. `docs/CHANGELOG.md` - Migraciones recientes
3. `docs/ARQUITECTURA.md` - Estructura de datos
4. `docs/modules/[MODULO].md` - Uso de datos

---

## 📝 Qué Actualizar Según el Cambio

### ✅ Al Agregar Nueva Feature
**Actualizar:**
- `docs/CHANGELOG.md` - Nueva entrada con fecha
- `docs/modules/[NUEVO_MODULO].md` - Crear documentación del módulo
- `README.md` - Actualizar sección de módulos
- `docs/INDEX.md` - Agregar nuevo módulo al índice

### ✅ Al Modificar Módulo Existente
**Actualizar:**
- `docs/modules/[MODULO].md` - Actualizar funcionalidad
- `docs/CHANGELOG.md` - Nueva entrada
- `README.md` - Si cambia la descripción del módulo

### ✅ Al Resolver Bug
**Actualizar:**
- `docs/CHANGELOG.md` - Entrada en sección "Bug Fixes"
- `docs/troubleshooting/[PROBLEMA].md` - Crear si es recurrente
- `docs/GUIA-RAPIDA.md` - Agregar comando de solución

### ✅ Al Cambiar Configuración
**Actualizar:**
- `docs/CONFIGURACION-PRODUCCION.md` - Nueva configuración
- `docs/DEPLOYMENT.md` - Si afecta deployment
- `docs/CHANGELOG.md` - Documentar cambio

### ✅ Al Cambiar Arquitectura
**Actualizar:**
- `docs/ARQUITECTURA.md` - Nueva arquitectura
- `README.md` - Stack tecnológico
- `docs/CHANGELOG.md` - Cambio importante

---

## 🚫 Qué NO Crear (Reglas Estrictas)

### ❌ REGLA DE ORO: NO Documentar DURANTE el Desarrollo

**⚠️ CRÍTICO:** La documentación se crea **DESPUÉS** de completar la tarea, NO durante o antes.

```
❌ INCORRECTO: Crear doc → Implementar feature → Actualizar doc
✅ CORRECTO:   Implementar feature → Probar → ENTONCES crear doc
```

**Razones:**
- Evita documentación especulativa o incorrecta
- Previene documentación abandonada a medio hacer
- La implementación real puede diferir del plan inicial
- Reduce "documentación basura" temporal

**Única Excepción:** 
- ✅ Crear nota temporal SOLO si necesitas recordar algo crítico para después
- ⚠️ Estas notas deben ser eliminadas o consolidadas al terminar

### ❌ NO Crear Documentación Innecesaria
- **NO** crear docs para cambios menores (ej: fix typo, ajuste CSS)
- **NO** duplicar información existente
- **NO** crear docs sin estructura clara
- **NO** crear docs que no se van a mantener
- **NO** crear "resúmenes" de implementación en progreso
- **NO** crear docs de "testing" o "debugging" temporales

### ❌ NO Crear en Raíz del Proyecto
- **NO** crear archivos `.md` en `/opt/cane/3t/` (solo README.md existe ahí)
- **NO** crear documentación fuera de `docs/`
- **NO** crear archivos temporales de documentación
- **NO** crear "RESUMEN-XXX.md", "IMPLEMENTACION-XXX.md" en raíz

### ❌ NO Crear Documentación Redundante
- **NO** crear docs que ya existen
- **NO** crear resúmenes de docs existentes
- **NO** crear documentación obsoleta
- **NO** crear múltiples docs sobre el mismo tema

---

## ✅ Cuándo SÍ Crear Documentación

### ⏰ MOMENTO CORRECTO: Después de Completar

**Documentar SOLO cuando:**
- ✅ La tarea está **completamente terminada**
- ✅ El código está **funcionando** y probado
- ✅ Los cambios están **aplicados** en producción/desarrollo
- ✅ Sabes **exactamente** qué se implementó (no especulación)

**Flujo correcto:**
```
1. Implementar feature/fix
2. Probar que funciona
3. Verificar que está completo
4. ENTONCES documentar lo que SE HIZO (no lo que SE VA a hacer)
```

### 🆕 Crear Documentación Nueva Cuando:
1. **Nuevo módulo completo** → Crear `docs/modules/[MODULO].md` (DESPUÉS de implementar)
2. **Problema técnico recurrente** → Crear `docs/troubleshooting/[PROBLEMA].md` (DESPUÉS de resolver)
3. **Feature importante terminada** → Documentar en `docs/CHANGELOG.md` (DESPUÉS de implementar)
4. **Arquitectura nueva implementada** → Actualizar `docs/ARQUITECTURA.md` (DESPUÉS de cambiar)

**⚠️ Importante:** Si la tarea no está terminada, NO crear documentación. Esperar a completarla.

---

## 📚 Ejemplos Prácticos

### ✅ CORRECTO: Documentar Después

**Escenario:** Implementar búsqueda avanzada en pedidos

```
1. Implementar código de búsqueda
2. Probar que funciona
3. Deployar a dev/prod
4. ✅ ENTONCES crear entrada en CHANGELOG.md
5. ✅ ENTONCES actualizar docs/modules/PEDIDOS.md

Resultado: 0 archivos temporales, info precisa
```

### ❌ INCORRECTO: Documentar Durante

**Escenario:** Implementar búsqueda avanzada en pedidos

```
1. Crear "IMPLEMENTACION-BUSQUEDA.md"
2. Escribir "voy a hacer X, Y, Z"
3. Empezar a implementar
4. Descubrir que X no funciona, hacer W en su lugar
5. Terminar implementación
6. Documentación quedó desactualizada y abandonada

Resultado: 1 archivo basura, info incorrecta
```

### ✅ CORRECTO: Nota Temporal

**Escenario:** Debugging complejo, necesitas recordar hallazgo importante

```
1. Encontrar bug crítico: "RLS bloquea tabla X"
2. Crear nota: "TEMP-RLS-ISSUE.md" (marcada como TEMPORAL)
3. Resolver el problema
4. Documentar solución en docs/troubleshooting/
5. ✅ ELIMINAR TEMP-RLS-ISSUE.md

Resultado: Documentación limpia y consolidada
```

### ❌ INCORRECTO: Múltiples Docs Temporales

```
/opt/cane/3t/
├── RESUMEN-IMPLEMENTACION.md
├── ESTADO-ACTUAL.md
├── TESTING-RESULTS.md
├── NOTAS-DESARROLLO.md
├── PENDIENTE-RESOLVER.md
└── TODO-FEATURES.md

❌ 6 archivos que nunca se eliminan
❌ Información duplicada y desactualizada
❌ Imposible saber cuál es la fuente de verdad
```

---

### 📝 Estructura Obligatoria para Nuevos Docs
```markdown
# Título del Documento

**Fecha:** [Fecha actual]
**Estado:** [Implementado/En desarrollo/Planificado]
**Módulo:** [Módulo afectado]

---

## 📖 Resumen Ejecutivo
[Descripción breve del problema/solución]

## 🎯 Problema/Objetivo
[Qué se quiere resolver]

## 🔧 Solución Implementada
[Cómo se resolvió]

## 📊 Resultados
[Qué se logró]

## 🚀 Próximos Pasos
[Qué sigue]

---
```

---

## 🔄 Flujo de Trabajo para IA

### 1. 🎯 Al Iniciar Tarea
```bash
# 1. Leer reglas del proyecto
cat /opt/cane/3t/.cursorrules

# 2. Leer índice maestro
cat /opt/cane/3t/docs/INDEX.md

# 3. Identificar qué tipo de tarea es
# 4. Leer documentación relevante según la tarea
```

### 2. 🔍 Durante el Desarrollo
```bash
# 1. Consultar documentación existente
# 2. Seguir convenciones establecidas
# 3. Usar herramientas MCP disponibles
# 4. ⚠️ NO CREAR DOCUMENTACIÓN (esperar a terminar)
# 5. Si necesitas recordar algo crítico:
#    - Crear nota temporal simple
#    - Marcarla como TEMPORAL
#    - Planear eliminarla al terminar
```

### 3. ✅ Al Finalizar Tarea (AQUÍ SE DOCUMENTA)
```bash
# 1. ✅ Verificar que la tarea está 100% completa
# 2. ✅ Verificar que todo funciona correctamente
# 3. ✅ ENTONCES actualizar CHANGELOG.md
# 4. ✅ Actualizar documentación de módulos afectados
# 5. ✅ Crear documentación nueva SOLO si es necesaria
# 6. ✅ Seguir estructura establecida
# 7. ✅ Eliminar notas temporales si las había
```

---

## 📋 Checklist para IA

### ✅ Antes de Empezar
- [ ] Leer `.cursorrules` (reglas del proyecto)
- [ ] Leer `docs/INDEX.md` (índice maestro)
- [ ] Identificar tipo de tarea
- [ ] Leer documentación relevante
- [ ] Entender arquitectura del proyecto

### ✅ Durante el Desarrollo
- [ ] Seguir convenciones establecidas
- [ ] Usar herramientas MCP (shadcn-ui, supabase)
- [ ] Consultar docs existentes
- [ ] ⚠️ **NO crear documentación** (esperar a terminar)
- [ ] Si necesitas recordar algo, crear nota temporal simple

### ✅ Al Finalizar (MOMENTO DE DOCUMENTAR)
- [ ] ✅ Verificar que la tarea está 100% completa
- [ ] ✅ Verificar que todo funciona
- [ ] ✅ Actualizar `docs/CHANGELOG.md` SIEMPRE
- [ ] ✅ Actualizar docs de módulos afectados
- [ ] ✅ Crear docs nuevas SOLO si es necesario
- [ ] ✅ Seguir estructura establecida
- [ ] ✅ Verificar que no se duplica información
- [ ] ✅ Eliminar notas temporales

---

## 🎯 Reglas de Oro para IA

### 1. 📚 **SIEMPRE Leer Primero**
- `.cursorrules` - Reglas del proyecto
- `docs/INDEX.md` - Índice maestro
- Documentación relevante según la tarea

### 2. 🔍 **Consultar Antes de Crear**
- Buscar si ya existe documentación similar
- No duplicar información existente
- Consolidar en lugar de crear nuevo

### 3. 📝 **Actualizar, No Duplicar**
- Actualizar docs existentes
- Agregar a `CHANGELOG.md`
- No crear archivos innecesarios

### 4. 🏗️ **Seguir Estructura Establecida**
- Usar categorías existentes
- Seguir formato establecido
- Mantener consistencia

### 5. ⏰ **Documentar al Final, NO Durante**
- ⚠️ **REGLA CRÍTICA:** Documentar DESPUÉS de terminar, no durante
- Solo cuando la tarea esté 100% completa y funcionando
- No crear "documentación en progreso"
- No documentar cambios menores
- Excepción: nota temporal si necesitas recordar algo crítico (luego eliminar)

---

## 📊 Resumen de Documentación por Tipo de Tarea

| Tipo de Tarea | Leer | Actualizar | Crear |
|----------------|------|------------|-------|
| **Nueva Feature** | INDEX.md, ARQUITECTURA.md, módulos relacionados | CHANGELOG.md, README.md | docs/modules/[MODULO].md |
| **Bug Fix** | GUIA-RAPIDA.md, troubleshooting/ | CHANGELOG.md | docs/troubleshooting/[PROBLEMA].md (si es recurrente) |
| **Deployment** | DEPLOYMENT.md, CONFIGURACION-PRODUCCION.md | CONFIGURACION-PRODUCCION.md | - |
| **UI/UX** | BRANDING.md, módulo afectado | CHANGELOG.md, módulo | - |
| **Base de Datos** | README.md, CHANGELOG.md | CHANGELOG.md | - |
| **Configuración** | CONFIGURACION-PRODUCCION.md | CONFIGURACION-PRODUCCION.md | - |

---

## 🎯 Conclusión

**La documentación del proyecto 3t está perfectamente estructurada y organizada. Como IA, debes:**

1. **Leer primero** la documentación existente
2. **Consultar** antes de crear
3. **Actualizar** en lugar de duplicar
4. **Crear solo** cuando sea absolutamente necesario
5. **Seguir** la estructura establecida

**Recuerda: La documentación existe para ser consultada, no para ser recreada.**

---

**💧 Agua Tres Torres - Sistema de Gestión**  
**Guía de Manejo de Documentación para IA v2.0**  
**Última actualización:** Octubre 28, 2025

**⚠️ IMPORTANTE:** Esta guía debe ser leída por cualquier IA antes de trabajar en el proyecto 3t.

**Cambios v2.0 (Oct 28, 2025):**
- ⚠️ **Regla crítica agregada:** NO documentar durante el desarrollo, solo DESPUÉS de terminar
- ✅ Ejemplos prácticos de correcto vs incorrecto
- ✅ Única excepción: notas temporales (que deben eliminarse)
- ✅ Reforzado: documentación especulativa genera "archivos basura"
