## 📅 Diciembre 14, 2025 - Incidente Seguridad CVE-2025-55182 + Migración pnpm (v3.5.0)

**Estado:** ✅ Resuelto  
**Tipo:** Seguridad Crítica + Mejora de Infraestructura  
**Severidad:** Crítica  
**Impacto:** Servidor comprometido por cryptominer, resuelto mismo día

### 🚨 Incidente de Seguridad

**Problema:** Cryptominer ejecutándose en container 3t-app
- Proceso malicioso `XXBCKoIh` consumiendo 2.4GB RAM + 357% CPU
- Explotación de CVE-2025-55182 (React2Shell) en Next.js/React
- Conexión C2 activa a 85.239.243.201:19999 (Contabo, Alemania)

**Resolución:**
1. Container comprometido detenido y eliminado
2. Repositorio separado creado: `CarloCorleone/3T`
3. Dependencias actualizadas a versiones parcheadas
4. Migración a pnpm para builds más seguros
5. Deploy limpio en `/opt/cane/3t-new/`

### 📦 Cambios Técnicos

| Componente | Antes | Después |
|------------|-------|---------|
| Next.js | 15.5.4 ❌ | 16.0.10 ✅ |
| React | 19.1.0 ❌ | 19.2.3 ✅ |
| Package Manager | npm | pnpm |
| Ubicación | /opt/cane/3t | /opt/cane/3t-new |
| Repositorio | loopia (subfolder) | CarloCorleone/3T |

### 📊 Resultados

| Métrica | Antes | Después |
|---------|-------|---------|
| RAM 3t-app | 2.4 GB | 53 MB |
| CPU 3t-app | 357% | 0% |
| RAM servidor disponible | 636 MB | 2.9 GB |

### 📚 Documentación

- Nuevo: `docs/security/INCIDENTE-CVE-2025-55182-CRYPTOMINER.md`
- Relacionado: Incidente similar en Paloma (2025-12-05)

---

