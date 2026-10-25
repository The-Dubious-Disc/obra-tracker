import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/middleware/rateLimit'

function request(ip?: string) {
  return new NextRequest('http://localhost/api/auth/login', {
    headers: ip ? { 'x-forwarded-for': ip } : undefined,
  })
}

describe('checkRateLimit', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows five calls in a window and blocks the sixth', async () => {
    const req = request('203.0.113.10')

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(checkRateLimit(req)).toBeNull()
    }

    const blocked = checkRateLimit(req)
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
    expect(blocked!.headers.get('X-RateLimit-Limit')).toBe('5')
    expect(blocked!.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(Number(blocked!.headers.get('Retry-After'))).toBeGreaterThan(0)
    await expect(blocked!.json()).resolves.toMatchObject({
      error: 'Demasiados intentos. Intente nuevamente más tarde.',
    })
  })

  it('tracks the first forwarded IP and keeps other clients independent', () => {
    const shared = request('198.51.100.8, 10.0.0.1')
    for (let attempt = 0; attempt < 5; attempt += 1) checkRateLimit(shared)
    expect(checkRateLimit(shared)?.status).toBe(429)

    expect(checkRateLimit(request('198.51.100.9'))).toBeNull()
    expect(checkRateLimit(request('203.0.113.20'), 'user-a')).toBeNull()
  })

  it('resets the counter after the 15 minute window', () => {
    vi.useFakeTimers()
    const req = request('203.0.113.30')

    for (let attempt = 0; attempt < 5; attempt += 1) expect(checkRateLimit(req)).toBeNull()
    expect(checkRateLimit(req)?.status).toBe(429)

    vi.advanceTimersByTime(15 * 60 * 1000 + 1)
    expect(checkRateLimit(req)).toBeNull()
  })

  it('shares one bucket when the client has no address', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) expect(checkRateLimit(request())).toBeNull()
    expect(checkRateLimit(request())?.status).toBe(429)
  })
})
