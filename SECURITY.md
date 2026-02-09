# Security Checklist - Obra Tracker

Lista de verificación de seguridad para el proyecto Obra Tracker.

---

## 🔐 1. Autenticación & Autorización

- [x] **JWT/Cookies seguros**: Las cookies de sesión usan `HttpOnly`, `Secure`, `SameSite: 'lax'`.
- [x] **RBAC enforcement**: Los endpoints sensibles (como creación de pagos) verifican roles vía `checkProjectRole`.
- [x] **Project access**: Todos los endpoints de proyecto verifican membresía vía `checkProjectAccess`.
- [x] **Password hashing**: Migrado a **bcrypt** con 12 salt rounds (incluye migración automática de legacy SHA256).
- [x] **Brute force protection**: Rate limiting implementado en endpoints de Auth y API (5 req / 15 min).

### Notas de auditoría

| Estado | Item | Detalle |
|--------|------|---------|
| ✅ | Cookies | `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'`, `maxAge: 7 días` |
| ✅ | RBAC | Implementado `checkProjectRole` para acciones de Editor/Admin. |
| ✅ | Project access | **COMPLETADO**: Todos los endpoints principales verifican acceso al proyecto. |
| ✅ | Password hashing | **COMPLETADO**: bcrypt 12 rounds + migración segura. |
| ✅ | Brute force | **COMPLETADO**: Custom in-memory rate limiter funcional. |

---

## 🛡️ 2. API & Endpoints

- [x] **Input validation**: Implementado **Zod** para validación de schemas en todos los modelos principales.
- [x] **SQL Injection**: Drizzle ORM protege contra inyecciones. No se detectaron queries raw peligrosas.
- [x] **IDOR**: Verificación de pertenencia al proyecto implementada en pagos, presupuestos, etapas y planos.
- [x] **Error handling**: Mensajes genéricos para el cliente; stack traces solo en servidor.

### Notas de auditoría

| Estado | Item | Detalle |
|--------|------|---------|
| ✅ | Input validation | **COMPLETADO**: Schemas de Zod centralizados en `src/lib/schemas/index.ts`. |
| ✅ | SQL Injection | Drizzle ORM usado correctamente. |
| ✅ | IDOR | **COMPLETADO**: Protegidos `/payments`, `/budget`, `/etapas`, `/planos`, `/pendientes`. |
| ✅ | Error handling | Mensajes genéricos implementados. |

---

## 📁 3. File Uploads (R2)

- [x] **Presigned URLs**: URLs firmadas para subida y descarga (R2 Private Bucket).
- [ ] **File type validation**: Pendiente forzar validación estricta de extensiones en el backend (Zod tiene el schema, falta asegurar enforcement).
- [ ] **File size limits**: Implementado en el cliente; pendiente validación estricta en server.

---

## Resumen de Acciones Realizadas

| Prioridad | Item | Estado | Detalle |
|-----------|------|--------|---------|
| **CRÍTICA** | Password hashing | ✅ | Migrado a bcrypt - COMPLETADO |
| **CRÍTICA** | IDOR en endpoints | ✅ | Protegidos todos los endpoints de proyecto - COMPLETADO |
| **CRÍTICA** | Input validation | ✅ | Implementado Zod en endpoints clave - COMPLETADO |
| Alta | Rate limiting | ✅ | Implementado en Auth y API - COMPLETADO |
| Alta | RBAC enforcement | ✅ | Roles Admin/Editor para pagos e invitaciones - COMPLETADO |

### Pendientes de Seguridad (Próximos pasos)

1.  **Cookie SameSite**: Cambiar a `sameSite: 'strict'` para mayor protección CSRF en entornos productivos.
2.  **Session Duration**: Implementar refresh tokens para sesiones más largas pero seguras.
3.  **R2 Enforcement**: Validar tipos de archivos y tamaños en el endpoint de subida de forma estricta.

*Última actualización: 2026-02-09 (Post-restauración)*
