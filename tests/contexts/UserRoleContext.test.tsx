// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRoleProvider, useUserRole } from '@/contexts/UserRoleContext'

const selection = vi.hoisted(() => ({
  selectedProjectId: null as string | null,
  isInitialized: false,
}))

vi.mock('@/contexts/ProjectContext', () => ({
  useProjectSelection: () => selection,
}))

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function Probe() {
  const { role } = useUserRole()
  return <span data-testid="role">{role}</span>
}

beforeEach(() => {
  selection.selectedProjectId = null
  selection.isInitialized = false
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('UserRoleProvider', () => {
  it('stays on viewer until a project is selected and initialized', async () => {
    const { rerender } = render(<UserRoleProvider><Probe /></UserRoleProvider>)
    expect(screen.getByTestId('role')).toHaveTextContent('viewer')
    expect(fetchMock).not.toHaveBeenCalled()

    selection.isInitialized = true
    rerender(<UserRoleProvider><Probe /></UserRoleProvider>)
    expect(screen.getByTestId('role')).toHaveTextContent('viewer')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads the membership role and falls back to viewer', async () => {
    selection.isInitialized = true
    selection.selectedProjectId = 'p1'
    fetchMock.mockResolvedValue(jsonResponse({ rol: 'editor' }))

    const { rerender } = render(<UserRoleProvider><Probe /></UserRoleProvider>)
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('editor'))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/membership')

    fetchMock.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 403))
    selection.selectedProjectId = 'p2'
    rerender(<UserRoleProvider><Probe /></UserRoleProvider>)
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('viewer'))

    fetchMock.mockRejectedValue(new Error('network'))
    selection.selectedProjectId = 'p3'
    rerender(<UserRoleProvider><Probe /></UserRoleProvider>)
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('viewer'))
  })

  it('ignores a response that arrives after the project changes', async () => {
    selection.isInitialized = true
    selection.selectedProjectId = 'p1'
    let resolveFirst: (response: Response) => void = () => {}
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/p1/membership')) {
        return new Promise<Response>((resolve) => {
          resolveFirst = resolve
        })
      }
      return Promise.resolve(jsonResponse({ rol: 'admin' }))
    })

    const { rerender } = render(<UserRoleProvider><Probe /></UserRoleProvider>)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/membership'))

    selection.selectedProjectId = 'p2'
    rerender(<UserRoleProvider><Probe /></UserRoleProvider>)
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('admin'))

    resolveFirst(jsonResponse({ rol: 'editor' }))
    await Promise.resolve()
    expect(screen.getByTestId('role')).toHaveTextContent('admin')
  })
})

describe('useUserRole', () => {
  it('throws outside the provider', () => {
    expect(() => render(<Probe />)).toThrow('useUserRole must be used within a UserRoleProvider')
  })
})
