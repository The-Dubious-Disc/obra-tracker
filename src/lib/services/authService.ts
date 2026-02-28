import { db } from '@/lib/db';
import { usuarios, proyectoMiembros, invitaciones, passwordResetTokens } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

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
    // Check if user with this email is already a member of the project
    const existingUser = await db.query.usuarios.findFirst({
      where: eq(usuarios.email, email),
    });

    if (existingUser) {
      const existingMembership = await db.query.proyectoMiembros.findFirst({
        where: and(
          eq(proyectoMiembros.usuarioId, existingUser.id),
          eq(proyectoMiembros.proyectoId, projectId)
        ),
      });

      if (existingMembership) {
        return { success: false, error: 'Este usuario ya es miembro del proyecto' };
      }
    }

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

    // Ensure the logged-in user matches the invited email
    const user = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, userId),
    });

    if (!user) {
      return { success: false, error: 'Usuario inválido' };
    }

    if (user.email !== invitation.email) {
      return { success: false, error: 'Esta invitación corresponde a otro correo' };
    }

    // Check if user is already a member of this project
    const existingMembership = await db.query.proyectoMiembros.findFirst({
      where: and(
        eq(proyectoMiembros.usuarioId, userId),
        eq(proyectoMiembros.proyectoId, invitation.proyectoId)
      ),
    });

    if (existingMembership) {
      // Mark invitation as accepted anyway, but don't create duplicate membership
      await db.update(invitaciones)
        .set({ aceptada: true })
        .where(eq(invitaciones.id, invitation.id));

      return { success: true, projectId: invitation.proyectoId };
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

export async function createPasswordResetToken(email: string) {
  try {
    const user = await db.query.usuarios.findFirst({
      where: eq(usuarios.email, email),
    });

    if (!user) {
      // For security, don't reveal if user exists
      return { success: true, message: 'Si el correo existe, se enviará un enlace' };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      usuarioId: user.id,
      token,
      expiresAt,
    });

    return { success: true, token };
  } catch (error) {
    console.error('Error creating password reset token:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  try {
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date())
      ),
    });

    if (!resetToken) {
      return { success: false, error: 'Token inválido o expirado' };
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.update(usuarios)
      .set({ passwordHash: hashedPassword })
      .where(eq(usuarios.id, resetToken.usuarioId));

    // Delete token after use
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, resetToken.id));

    return { success: true };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}