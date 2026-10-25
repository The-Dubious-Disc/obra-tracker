// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectProvider, useProjectSelection } from '@/contexts/ProjectContext'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function Probe() {
  const ctx = useProjectSelection()
  return (
    <div>
      <span data-testid="ready">{String(ctx.isInitialized)}</span>
      <span data-testid="id">{ctx.selectedProjectId ?? ''}</span>
      <span data-testid="names">{ctx.projects.map((project) => project.nombre).join(',')}</span>
      <span data-testid="error">{ctx.error ?? ''}</span>
      <button type="button" onClick={() => ctx.setSelectedProjectId('p2')}>select</button>
      <button type="button" onClick={() => ctx.setSelectedProjectId(null)}>clear</button>
    </div>
  )
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  localStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('ProjectProvider', () => {
  it('does not load projects on public routes', async () => {
    window.history.pushState({}, '', '/invitations/token-1')
    render(<ProjectProvider><Probe /></ProjectProvider>)

    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('id')).toHaveTextContent('')
  })

  it('keeps a stored project when it is still in the list and drops duplicates', async () => {
    localStorage.setItem('obra_tracker_selected_project_id', 'p2')
    fetchMock.mockResolvedValue(jsonResponse([
      { id: 'p1', nombre: 'Primero' },
      { id: 'p2', nombre: 'Segundo' },
      { id: 'p2', nombre: 'Segundo actualizado' },
    ]))

    render(<ProjectProvider><Probe /></ProjectProvider>)

    await waitFor(() => expect(screen.getByTestId('id')).toHaveTextContent('p2'))
    expect(screen.getByTestId('names')).toHaveTextContent('Primero,Segundo actualizado')
    expect(fetchMock).toHaveBeenCalledWith('/api/projects')
  })

  it('falls back to the first project when the stored id is gone', async () => {
    localStorage.setItem('obra_tracker_selected_project_id', 'missing')
    fetchMock.mockResolvedValue(jsonResponse([
      { id: 'p1', nombre: 'Primero' },
      { id: 'p2', nombre: 'Segundo' },
    ]))

    render(<ProjectProvider><Probe /></ProjectProvider>)

    await waitFor(() => expect(screen.getByTestId('id')).toHaveTextContent('p1'))
    expect(localStorage.getItem('obra_tracker_selected_project_id')).toBe('p1')
  })

  it('clears the selection when the account has no projects', async () => {
    localStorage.setItem('obra_tracker_selected_project_id', 'p1')
    fetchMock.mockResolvedValue(jsonResponse([]))

    render(<ProjectProvider><Probe /></ProjectProvider>)

    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'))
    expect(screen.getByTestId('id')).toHaveTextContent('')
    expect(localStorage.getItem('obra_tracker_selected_project_id')).toBeNull()
  })

  it('stops initialization on 401 without clearing a previously stored id', async () => {
    localStorage.setItem('obra_tracker_selected_project_id', 'p1')
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Not authenticated' }, 401))

    render(<ProjectProvider><Probe /></ProjectProvider>)

    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'))
    expect(screen.getByTestId('id')).toHaveTextContent('')
    expect(localStorage.getItem('obra_tracker_selected_project_id')).toBe('p1')
    expect(screen.getByTestId('error')).toHaveTextContent('')
  })

  it('records a failed load', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }))
    render(<ProjectProvider><Probe /></ProjectProvider>)

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch projects'))
  })

  it('persists manual selection', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(jsonResponse([{ id: 'p1', nombre: 'Primero' }]))
    render(<ProjectProvider><Probe /></ProjectProvider>)
    await waitFor(() => expect(screen.getByTestId('id')).toHaveTextContent('p1'))

    await user.click(screen.getByRole('button', { name: 'select' }))
    expect(screen.getByTestId('id')).toHaveTextContent('p2')
    expect(localStorage.getItem('obra_tracker_selected_project_id')).toBe('p2')

    await user.click(screen.getByRole('button', { name: 'clear' }))
    expect(screen.getByTestId('id')).toHaveTextContent('')
    expect(localStorage.getItem('obra_tracker_selected_project_id')).toBeNull()
  })
})

describe('useProjectSelection', () => {
  it('throws outside the provider', () => {
    expect(() => render(<Probe />)).toThrow('useProjectSelection must be used within ProjectProvider')
  })
})
