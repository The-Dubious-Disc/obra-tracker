import { afterEach, describe, expect, it } from 'vitest'
import { decodeJwt, SignJWT } from 'jose'
import { signToken, verifyToken, type TokenPayload } from '@/lib/auth/jwt'

const payload: TokenPayload = {
  userId: 'user-1',
  rol: 'editor',
  nombre: 'Ada',
}

const originalSecret = process.env.JWT_SECRET

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = originalSecret
})

describe('session JWT', () => {
  it('round-trips a payload and expires in 7 days', async () => {
    process.env.JWT_SECRET = 'test-secret'
    const token = await signToken(payload)
    const verified = await verifyToken(token)

    expect(verified).toMatchObject(payload)
    const decoded = decodeJwt(token)
    expect(decoded.exp! - decoded.iat!).toBe(7 * 24 * 60 * 60)
  })

  it('rejects a tampered token and a token signed with another secret', async () => {
    process.env.JWT_SECRET = 'test-secret'
    const token = await signToken(payload)
    expect(await verifyToken(`${token}x`)).toBeNull()

    const other = await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode('other-secret'))

    expect(await verifyToken(other)).toBeNull()
  })

  it('rejects an expired token', async () => {
    process.env.JWT_SECRET = 'test-secret'
    const expired = await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode('test-secret'))

    expect(await verifyToken(expired)).toBeNull()
  })

  it('falls back to the development secret when JWT_SECRET is unset', async () => {
    delete process.env.JWT_SECRET
    const token = await signToken(payload)
    expect(await verifyToken(token)).toMatchObject(payload)
  })
})
