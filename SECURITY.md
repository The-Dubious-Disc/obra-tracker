# Security Checklist - Obra Tracker

Lista de verificación de seguridad para el proyecto Obra Tracker.

---

## 🔐 1. Autenticación & Autorización

- [x] **JWT/Cookies seguros**: Las cookies de sesión usan `HttpOnly`, `Secure`, `SameSite`?
- [ ] **RBAC enforcement**: Los endpoints verifican el rol (admin/editor/viewer) antes de permitir acciones?
- [ ] **Project access**: Todos los endpoints de proyecto verifican que el usuario sea miembro?
- [ ] **Password hashing**: bcrypt con salt rounds adecuados (≥10)?
- [ ] **Brute force protection**: Rate limiting en login?

### Notas de auditoría

| Estado | Item | Detalle |
|--------|------|---------|
| ✅ | Cookies | `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `maxAge: 7 días` |
| ⚠️ | RBAC | Middleware verifica autenticación pero NO verifica roles. Endpoints no validan si el usuario tiene permiso para la acción |
| ❌ | Project access | **CRÍTICO**: Varios endpoints no verifican membresía: `/payments`, `/budget`, `/budget/history`, `/etapas`, `/planos` |
| ❌ | Password hashing | **CRÍTICO**: Usa `crypto.createHash('sha256')` en lugar de bcrypt/argon2. SHA256 es vulnerable a brute force |
| ❌ | Brute force | No hay rate limiting en login. Vulnerable a ataques de fuerza bruta |

---

## 🛡️ 2. API & Endpoints

- [ ] **Input validation**: Todos los body params validados (Zod o similar)?
- [x] **SQL Injection**: Drizzle ORM protege, pero hay queries raw peligrosas?
- [ ] **IDOR**: Los endpoints verifican ownership antes de devolver datos?
- [x] **Error handling**: No se filtran stack traces ni detalles internos al cliente?

### Notas de auditoría

| Estado | Item | Detalle |
|--------|------|---------|
| ❌ | Input validation | **CRÍTICO**: No se usa Zod ni validación estructurada. Solo validaciones manuales básicas (`if (!campo)`) |
| ✅ | SQL Injection | Drizzle ORM usado correctamente. No hay queries SQL raw peligrosas |
| ❌ | IDOR | **CRÍTICO**: Varios endpoints no verifican que el usuario tenga acceso al proyecto antes de devolver datos sensibles (pagos, presupuesto, etc.) |
| ✅ | Error handling | Mensajes de error genéricos. Stack traces solo en logs del servidor |

### Endpoints vulnerables a IDOR (sin verificación de acceso):

```
GET    /api/projects/[id]/payments      → Expone pagos de cualquier proyecto
GET    /api/projects/[id]/budget        → Expone presupuesto de cualquier proyecto
GET    /api/projects/[id]/budget/history → Expone historial de presupuesto
GET    /api/projects/[id]/etapas        → Expone etapas de cualquier proyecto
GET    /api/projects/[id]/planos        → Expone planos de cualquier proyecto
```

**Impacto**: Un usuario autenticado puede acceder a datos de proyectos a los que no pertenece simplemente cambiando el ID en la URL.

---

## 📁 3. File Uploads (R2)

- [ ] **File type validation**: Solo se permiten extensiones seguras (pdf, png, jpg)?
- [ ] **File size limits**: Límite de tamaño implementado?
- [ ] **Presigned URLs**: URLs de descarga firmadas con expiración corta?
- [ ] **Path traversal**: El `key` en upload sanitizado para evitar `../`?
- [ ] **Malware scan**: (Opcional) ClamAV o similar para uploads?

### Notas de auditoría

*Agregar hallazgos aquí...*

---

## 🗄️ 4. Base de Datos

- [ ] **Migration safety**: Las migraciones tienen `IF NOT EXISTS` y manejo de errores?
- [ ] **Row Level Security**: RLS habilitado en tablas sensibles (si aplica)?
- [ ] **Conexión segura**: DATABASE_URL usa SSL/TLS?
- [ ] **Backup strategy**: Backups automáticos configurados?

### Notas de auditoría

*Agregar hallazgos aquí...*

---

## 🌍 5. Frontend & XSS

- [ ] **Output encoding**: React escapa automáticamente, pero hay `dangerouslySetInnerHTML`?
- [ ] **CSP headers**: Content Security Policy configurada?
- [ ] **CSRF tokens**: Next.js App Router maneja CSRF, pero verificar en API routes?

### Notas de auditoría

*Agregar hallazgos aquí...*

---

## 🔑 6. Secrets & Config

- [ ] **Env vars**: Ningún secreto hardcodeado (R2 keys, DB password, etc.)?
- [ ] **.env.example**: Actualizado con todas las vars necesarias?
- [ ] **Git hygiene**: `.env` en `.gitignore`? No hay commits con secrets?

### Notas de auditoría

*Agregar hallazgos aquí...*

---

## 📊 7. Dependencias

- [ ] **npm audit**: Vulnerabilidades conocidas en dependencias?
- [ ] **Outdated packages**: Dependencias críticas desactualizadas?
- [ ] **Supply chain**: Uso de lockfile (`package-lock.json`) para reproducibilidad?

### Notas de auditoría

*Agregar hallazgos aquí...*

---

## 🚨 8. Observabilidad

- [ ] **Logging**: Logs de accesos/auth failures sin exponer datos sensibles?
- [ ] **Audit trail**: Quién hizo qué y cuándo (quién creó/modificó tareas, pagos, etc.)?

### Notas de auditoría

*Agregar hallazgos aquí...*

---

## Resumen de Acciones

| Prioridad | Item | Estado | Acción Requerida |
|-----------|------|--------|------------------|
| **CRÍTICA** | Password hashing | ❌ | Migrar de SHA256 a bcrypt con salt rounds ≥12 |
| **CRÍTICA** | IDOR en endpoints | ❌ | Agregar `checkProjectAccess()` a todos los endpoints de proyecto |
| **CRÍTICA** | Input validation | ❌ | Implementar Zod para validación de schemas en todos los endpoints |
| Alta | Rate limiting | ❌ | Agregar rate limiting en `/api/auth/login` |
| Alta | RBAC enforcement | ⚠️ | Verificar roles en endpoints sensibles (delete, update, invite) |
| Media | Session duration | ⚠️ | Considerar refresh tokens en lugar de sesiones de 7 días |
| Baja | Cookie SameSite | ⚠️ | Considerar `sameSite: 'strict'` para endpoints sensibles |

### Plan de remediación inmediato

1. **Fix password hashing** (1-2 horas):
   ```bash
   npm install bcrypt
   ```
   - Reemplazar `crypto.createHash('sha256')` con `bcrypt.hash()`
   - Migrar passwords existentes (requiere reseteo o migración gradual)

2. **Fix IDOR vulnerabilities** (2-3 horas):
   - Agregar verificación de `checkProjectAccess()` en todos los endpoints de proyecto
   - Pattern a seguir: `src/app/api/upload/route.ts` (hace esto correctamente)

3. **Add input validation** (3-4 horas):
   ```bash
   npm install zod
   ```
   - Crear schemas para cada endpoint
   - Validar body params antes de procesar

*Última actualización: 2026-02-08*
