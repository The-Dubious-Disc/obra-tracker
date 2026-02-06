import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Checks if a user has a specific role.
 * @param userId - The UUID of the user.
 * @param role - The role to check ('admin', 'constructor', 'cliente').
 * @returns Promise<boolean>
 */
export async function userHasRole(userId: string, role: 'admin' | 'constructor' | 'cliente'): Promise<boolean> {
  const user = await db.query.usuarios.findFirst({
    where: eq(usuarios.id, userId),
  });

  return user?.rol === role;
}

/**
 * Gets the role of a user.
 * @param userId - The UUID of the user.
 * @returns Promise<string | null>
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const user = await db.query.usuarios.findFirst({
    where: eq(usuarios.id, userId),
  });

  return user?.rol || null;
}
