import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', async () => {
  const mod = await import('../helpers/db')
  return { db: mod.db }
})

vi.mock('next/headers', () => import('../helpers/nextHeaders'))

import { hashPassword } from '@/lib/services/authService'
import { verifyToken } from '@/lib/auth/jwt'
import { findFirst, resetDb } from '../helpers/db'
import { cookieDelete, cookieSet, resetRequestContext } from '../helpers/nextHeaders'
import { NextRequest } from 'next/server'
import { jsonRequest } from '../helpers/http'
import { POST as login } from '@/app/api/auth/login/route'
import { GET as me } from '@/app/api/auth/me/route'
import { POST as logout } from '@/app/api/auth/logout/route'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret'
})

beforeEach(() => {
  resetDb()
  resetRequestContext()
})

function containsString(value: unknown, needle: string): boolean {
  const seen = new Set<unknown>()
  const visit = (current: unknown): boolean => {
    if (typeof current === 'string') return current.includes(needle)
    if (!current || typeof current !== 'object') return false
    if (seen.has(current)) return false
    seen.add(current)
    return Object.values(current as Record<string, unknown>).some(visit)
  }
  return visit(value)
}

describe('POST /api/auth/login', () => {
  it('rejects invalid payloads and unknown or wrong passwords with the same error', async () => {
    const invalid = await login(jsonRequest('http://localhost/api/auth/login', {
      email: 'not-an-email',
      password: '',
    }, { headers: { 'x-forwarded-for': '203.0.113.1' } }))
    expect(invalid.status).toBe(400)
    await expect(invalid.json()).resolves.toMatchObject({ error: 'Datos inválidos' })

    findFirst.usuarios.mockResolvedValue(undefined)
    const missing = await login(jsonRequest('http://localhost/api/auth/login', {
      email: 'ada@example.com',
      password: 'secret123',
    }, { headers: { 'x-forwarded-for': '203.0.113.2' } }))
    expect(missing.status).toBe(401)
    await expect(missing.json()).resolves.toEqual({ error: 'Credenciales inválidas' })

    findFirst.usuarios.mockResolvedValue({
      id: 'u1',
      nombre: 'Ada',
      rol: 'viewer',
      passwordHash: null,
    })
    const noHash = await login(jsonRequest('http://localhost/api/auth/login', {
      email: 'ada@example.com',
      password: 'secret123',
    }, { headers: { 'x-forwarded-for': '203.0.113.3' } }))
    expect(noHash.status).toBe(401)
    expect(cookieSet).not.toHaveBeenCalled()
  })

  it('normalizes the email, sets an httpOnly session, and omits the password hash', async () => {
    const passwordHash = await hashPassword('secret123')
    findFirst.usuarios.mockImplementation(async (query: unknown) => {
      expect(containsString(query, 'ada@example.com')).toBe(true)
      return {
        id: 'u1',
        nombre: 'Ada',
        rol: 'editor',
        email: 'ada@example.com',
        passwordHash,
      }
    })

    const response = await login(jsonRequest('http://localhost/api/auth/login', {
      email: 'Ada@Example.com',
      password: 'secret123',
    }, { headers: { 'x-forwarded-for': '203.0.113.4' } }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ userId: 'u1', nombre: 'Ada', rol: 'editor' })
    expect(cookieSet).toHaveBeenCalledWith('session', expect.any(String), {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    const token = cookieSet.mock.calls[0][1] as string
    await expect(verifyToken(token)).resolves.toMatchObject({
      userId: 'u1',
      rol: 'editor',
      nombre: 'Ada',
    })
  })

  it('marks the session cookie secure in production', async () => {
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      findFirst.usuarios.mockResolvedValue({
        id: 'u1',
        nombre: 'Ada',
        rol: 'admin',
        passwordHash: await hashPassword('secret123'),
      })
      const response = await login(jsonRequest('http://localhost/api/auth/login', {
        email: 'ada@example.com',
        password: 'secret123',
      }, { headers: { 'x-forwarded-for': '203.0.113.5' } }))
      expect(response.status).toBe(200)
      expect(cookieSet.mock.calls.at(-1)?.[2]).toMatchObject({ secure: true })
    } finally {
      process.env.NODE_ENV = previous
    }
  })

  it('rate limits before validating the body', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      findFirst.usuarios.mockResolvedValue(undefined)
      const response = await login(jsonRequest('http://localhost/api/auth/login', {
        email: 'ada@example.com',
        password: 'secret123',
      }, { headers: { 'x-forwarded-for': '203.0.113.6' } }))
      expect(response.status).toBe(401)
    }

    const blocked = await login(jsonRequest('http://localhost/api/auth/login', {
      email: 'not-an-email',
    }, { headers: { 'x-forwarded-for': '203.0.113.6' } }))
    expect(blocked.status).toBe(429)
  })

  it('returns 500 when the body is not JSON', async () => {
    const response = await login(new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.7' },
    }))
    expect(response.status).toBe(500)
  })
})

describe('GET /api/auth/me and POST /api/auth/logout', () => {
  it('requires a user id and never returns the password hash', async () => {
    const anonymous = await me()
    expect(anonymous.status).toBe(401)

    resetRequestContext({ 'x-user-id': 'missing' })
    findFirst.usuarios.mockResolvedValue(undefined)
    const missing = await me()
    expect(missing.status).toBe(404)

    resetRequestContext({ 'x-user-id': 'u1' })
    findFirst.usuarios.mockResolvedValue({
      id: 'u1',
      email: 'ada@example.com',
      nombre: 'Ada',
      rol: 'viewer',
      passwordHash: 'secret-hash',
    })
    const response = await me()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      id: 'u1',
      email: 'ada@example.com',
      nombre: 'Ada',
      rol: 'viewer',
    })
    expect(body.passwordHash).toBeUndefined()
  })

  it('deletes the session cookie on logout', async () => {
    const response = await logout()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(cookieDelete).toHaveBeenCalledWith('session')
  })
})
