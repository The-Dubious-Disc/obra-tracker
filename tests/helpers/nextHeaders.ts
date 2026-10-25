import { vi } from 'vitest'

export const headerBag = { current: new Headers() }
export const cookieSet = vi.fn()
export const cookieDelete = vi.fn()

export function resetRequestContext(init?: Record<string, string>) {
  headerBag.current = new Headers(init)
  cookieSet.mockReset()
  cookieDelete.mockReset()
}

export async function cookies() {
  return { set: cookieSet, delete: cookieDelete }
}

export async function headers() {
  return headerBag.current
}
