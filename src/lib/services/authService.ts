import { db } from '@/lib/db';
import { usuarios, proyectoMiembros, invitaciones } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export async function hashPassword(password: string) {
  // Use bcrypt with 12 salt rounds for production security
  return await bcrypt.hash(password, 12);
}

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

export async function getProjectMembership(userId: string, projectId: string) {
  try {
    const membership = await db.query.proyectoMiembros.findFirst({
      where: and(
        eq(proyectoMiembros.usuarioId, userId),
        eq(proyectoMiembros.proyectoId, projectId)
      ),
    });

    return membership;
  } catch (error) {
    console.error('Error getting project membership:', error);
    return null;
  }
}

export async function checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
  try {
    const membership = await db.query.proyectoMiembros.findFirst({
      where: and(
        eq(proyectoMiembros.usuarioId, userId),
        eq(proyectoMiembros.proyectoId, projectId)
      ),
    });

    return !!membership;
  } catch (error) {
    console.error('Error checking project access:', error);
    return false;
  }
}

export async function checkProjectRole(userId: string, projectId: string, requiredRoles: ('admin' | 'editor' | 'viewer')[] = ['admin', 'editor']): Promise<boolean> {
  try {
    const membership = await db.query.proyectoMiembros.findFirst({
      where: and(
        eq(proyectoMiembros.usuarioId, userId),
        eq(proyectoMiembros.proyectoId, projectId)
      ),
    });

    if (!membership) {
      return false;
    }

    return requiredRoles.includes(membership.rol);
  } catch (error) {
    console.error('Error checking project role:', error);
    return false;
  }
}

export async function createInvitation(projectId: string, email: string, rol: 'admin' | 'editor' | 'viewer', invitedBy: string) {
  try {
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await db.insert(invitaciones).values({
      proyectoId: projectId,
      email,
      rol,
      token,
      invitadoPor: invitedBy,
      expiresAt,
    }).returning();

    return { success: true, invitation: result[0] };
  } catch (error) {
    console.error('Error creating invitation:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

export async function getInvitationByToken(token: string) {
  try {
    const invitation = await db.query.invitaciones.findFirst({
      where: and(
        eq(invitaciones.token, token),
        eq(invitaciones.aceptada, false)
      ),
      with: {
        proyecto: true,
      },
    });

    if (!invitation || invitation.expiresAt < new Date()) {
      return null;
    }

    return invitation;
  } catch (error) {
    console.error('Error getting invitation by token:', error);
    return null;
  }
}

export async function acceptInvitation(token: string, userId: string) {
  try {
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return { success: false, error: 'Invitación inválida o expirada' };
    }

    // Check if user already exists
    const existingUser = await db.query.usuarios.findFirst({
      where: eq(usuarios.email, invitation.email),
    });

    if (existingUser && existingUser.id !== userId) {
      return { success: false, error: 'Email ya registrado con otro usuario' };
    }

    // Add user to project
    await db.insert(proyectoMiembros).values({
      proyectoId: invitation.proyectoId,
      usuarioId: userId,
      rol: invitation.rol,
    });

    // Mark invitation as accepted
    await db.update(invitaciones)
      .set({ aceptada: true })
      .where(eq(invitaciones.id, invitation.id));

    return { success: true, projectId: invitation.proyectoId };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}