import { NextRequest } from 'next/server'

export function jsonRequest(
  url: string,
  body: unknown,
  init?: { method?: string; headers?: Record<string, string> },
) {
  return new NextRequest(url, {
    method: init?.method ?? 'POST',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  })
}

export async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}
