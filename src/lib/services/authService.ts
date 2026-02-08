export async function hashPassword(password: string) {
  // Use bcrypt with 12 salt rounds for production security
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  // Verify password against bcrypt hash
  return await bcrypt.compare(password, hash);
}