export async function verifyPassword(password: string, hash: string) {
  // Verify password against bcrypt hash
  return await bcrypt.compare(password, hash);
}

export async function registerUser(nombre: string, email: string, password: string, rol: 'admin' | 'editor' | 'viewer' = 'viewer') {
  try {
    // Check if user already exists
    const existingUser = await db.query.usuarios.findFirst({
      where: eq(usuarios.email, email),
    });

    if (existingUser) {
      return { success: false, error: 'Usuario ya existe' };
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await db.insert(usuarios).values({
      nombre,
      email,
      passwordHash: hashedPassword,
      rol,
    }).returning();

    if (result.length === 0) {
      return { success: false, error: 'Error al crear usuario' };
    }

    return { success: true, user: result[0] };
  } catch (error) {
    console.error('Register error:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}