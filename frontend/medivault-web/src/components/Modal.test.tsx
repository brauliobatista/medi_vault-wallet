import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from './Modal'

describe('Modal', () => {
  it('renders the title and children', () => {
    render(
      <Modal title="Detalhes" onClose={() => {}}>
        <p>Conteúdo do modal</p>
      </Modal>
    )

    expect(screen.getByText('Detalhes')).toBeInTheDocument()
    expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Detalhes" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>
    )

    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when clicking inside the panel content', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Detalhes" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>
    )

    fireEvent.click(screen.getByText('Conteúdo'))

    expect(onClose).not.toHaveBeenCalled()
  })
})
