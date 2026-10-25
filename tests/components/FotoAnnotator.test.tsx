// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FotoAnnotator } from '@/components/pendientes/FotoAnnotator'

describe('FotoAnnotator', () => {
  it('ofrece lápiz, círculo, flecha, deshacer y cancelar', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onSave = vi.fn()
    render(
      <FotoAnnotator
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
        nombre="frente.jpg"
        onCancel={onCancel}
        onSave={onSave}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Marcar frente.jpg' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lápiz' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Círculo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flecha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rojo' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Círculo' }))
    expect(screen.getByRole('button', { name: 'Círculo' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })
})
