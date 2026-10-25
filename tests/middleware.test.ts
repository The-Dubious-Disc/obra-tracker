import { beforeAll, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { signToken } from '@/lib/auth/jwt'
import { middleware } from '@/middleware'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret'
})

function call(path: string, cookie?: string) {
  return middleware(new NextRequest(`http://localhost${path}`, {
    headers: cookie ? { cookie } : undefined,
  }))
}

describe('auth middleware', () => {
  it('lets public auth pages, invitation routes, and static assets through', async () => {
    for (const path of [
      '/login',
      '/register',
      '/recover-password',
      '/reset-password',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/logout',
      '/api/auth/recover-password',
      '/api/auth/reset-password',
      '/invitations/token-1',
      '/api/invitations/token-1',
      '/_next/static/chunk.js',
      '/favicon.ico',
    ]) {
      const response = await call(path)
      expect(response.headers.get('location'), path).toBeNull()
      expect(response.status, path).toBe(200)
    }
  })

  it('redirects anonymous pages to login and rejects anonymous API calls', async () => {
    const page = await call('/presupuesto')
    expect(page.status).toBe(307)
    const location = page.headers.get('location') ?? ''
    expect(location).toContain('/login')
    expect(location).toContain('redirect=%2Fpresupuesto')

    const api = await call('/api/projects')
    expect(api.status).toBe(401)
    await expect(api.json()).resolves.toEqual({ error: 'Not authenticated' })
  })

  it('clears an invalid session cookie', async () => {
    const api = await call('/api/projects', 'session=not-a-jwt')
    expect(api.status).toBe(401)
    expect(api.headers.get('set-cookie') ?? '').toContain('session=')

    const page = await call('/planos', 'session=not-a-jwt')
    expect(page.status).toBe(307)
    expect(page.headers.get('location')).toContain('/login')
    expect(page.headers.get('set-cookie') ?? '').toContain('session=')
  })

  it('forwards the user id and role from a valid session', async () => {
    const token = await signToken({ userId: 'user-1', rol: 'editor', nombre: 'Ada' })
    const response = await call('/presupuesto', `session=${token}`)

    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-request-x-user-id')).toBe('user-1')
    expect(response.headers.get('x-middleware-request-x-user-role')).toBe('editor')
  })

  it('keeps /admin available only to admins', async () => {
    const editor = await signToken({ userId: 'user-2', rol: 'editor', nombre: 'Bob' })
    const denied = await call('/admin', `session=${editor}`)
    expect(denied.status).toBe(307)
    expect(denied.headers.get('location')).toBe('http://localhost/')

    const admin = await signToken({ userId: 'user-1', rol: 'admin', nombre: 'Ada' })
    const allowed = await call('/admin', `session=${admin}`)
    expect(allowed.headers.get('location')).toBeNull()
    expect(allowed.headers.get('x-middleware-request-x-user-role')).toBe('admin')
  })
})
