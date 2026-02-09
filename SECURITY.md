### Notas de auditoría

| Estado | Item | Detalle |
|--------|------|---------|
| ✅ | Cookies | `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `maxAge: 7 días` |
| ⚠️ | RBAC | Middleware verifica autenticación pero NO verifica roles. Endpoints no validan si el usuario tiene permiso para la acción |
| ✅ | Project access | **COMPLETADO**: Todos los endpoints principales verifican `checkProjectAccess()` - pendiente completar endpoints secundarios |
| ✅ | Password hashing | Migrado a bcrypt con 12 salt rounds. Login endpoint actualizado para verificación segura |
| ❌ | Brute force | No hay rate limiting en login. Vulnerable a ataques de fuerza bruta |