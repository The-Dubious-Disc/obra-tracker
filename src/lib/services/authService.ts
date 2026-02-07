import { db } from '@/lib/db';
import { usuarios, proyectoMiembros, invitaciones } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export async function hashPassword(password: string) {
  // Simple hash for this example
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function registerUser(nombre: string, email: string, password: string) {
  try {
    const passwordHash = await hashPassword(password);
    const [newUser] = await db.insert(usuarios).values({
      nombre,
      email,
      passwordHash,
      rol: 'viewer',
    }).returning();
    
    return { success: true, user: newUser };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return { success: false, error: 'Email already registered' };
    }
    return { success: false, error: 'Database error' };
  }
}

export async function createInvitation(proyectoId: string, email: string, rol: 'admin' | 'editor' | 'viewer', invitadoPor: string) {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const [invitation] = await db.insert(invitaciones).values({
      proyectoId,
      email,
      rol,
      token,
      invitadoPor,
      expiresAt,
    }).returning();

    return { success: true, token: invitation.token };
  } catch {
    return { success: false, error: 'Failed to create invitation' };
  }
}

export async function getInvitationByToken(token: string) {
  try {
    const invitation = await db.query.invitaciones.findFirst({
      where: and(eq(invitaciones.token, token), eq(invitaciones.aceptada, false)),
      with: {
        proyecto: true
      }
    });
    return invitation;
  } catch {
    return null;
  }
}

export async function acceptInvitation(token: string, usuarioId: string) {
  try {
    const invitation = await db.query.invitaciones.findFirst({
      where: and(eq(invitaciones.token, token), eq(invitaciones.aceptada, false)),
    });

    if (!invitation) return { success: false, error: 'Invalid or already accepted invitation' };
    if (new Date() > invitation.expiresAt) return { success: false, error: 'Invitation expired' };

    await db.transaction(async (tx) => {
      await tx.update(invitaciones).set({ aceptada: true }).where(eq(invitaciones.id, invitation.id));
      await tx.insert(proyectoMiembros).values({
        proyectoId: invitation.proyectoId,
        usuarioId,
        rol: invitation.rol,
      });
    });

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to accept invitation' };
  }
}

export async function checkProjectAccess(usuarioId: string, proyectoId: string) {
  const member = await db.query.proyectoMiembros.findFirst({
    where: and(eq(proyectoMiembros.usuarioId, usuarioId), eq(proyectoMiembros.proyectoId, proyectoId)),
  });
  return member;
}
