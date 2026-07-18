import { SignJWT, jwtVerify } from 'jose';

export interface TokenPayload {
  userId: string;
  rol: 'admin' | 'editor' | 'viewer' | 'cliente' | 'constructor';
  nombre: string;
}

function getEncodedSecret() {
  const secret = process.env.JWT_SECRET || 'fallback_secret_for_development_only_please_change';
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const encodedSecret = getEncodedSecret();
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedSecret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const encodedSecret = getEncodedSecret();
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
