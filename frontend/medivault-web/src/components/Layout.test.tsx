import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from './Layout'
import { saveUser } from '../hooks/useAuth'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Layout>
        <div>conteúdo da página</div>
      </Layout>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the patient nav items and page title for a patient route', () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')

    renderAt('/exams')

    expect(screen.getByRole('heading', { name: 'Exames' })).toBeInTheDocument()
    expect(screen.getByText('Agregado Familiar')).toBeInTheDocument()
    expect(screen.queryByText('Pedidos de Acesso')).not.toBeInTheDocument()
  })

  it('shows the doctor nav items for a doctor route', () => {
    saveUser({ id: '1', name: 'Dr. João Costa', role: 'Doctor' }, 'token')

    renderAt('/doctor/access')

    expect(screen.getByRole('heading', { name: 'Pedidos de Acesso' })).toBeInTheDocument()
    expect(screen.getByText('Consulta')).toBeInTheDocument()
    expect(screen.queryByText('Agregado Familiar')).not.toBeInTheDocument()
  })

  it('marks the nav item matching the current path as active', () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')

    renderAt('/habits')

    expect(screen.getByRole('link', { name: /Hábitos de Saúde/ })).toHaveClass('active')
    expect(screen.getByRole('link', { name: /Exames/ })).not.toHaveClass('active')
  })

  it('renders children inside the main content area', () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')

    renderAt('/dashboard')

    expect(screen.getByText('conteúdo da página')).toBeInTheDocument()
  })

  it('logs out and navigates to /login when the sidebar logout button is clicked', () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')
    const originalLocation = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, href: '' } })

    renderAt('/dashboard')
    fireEvent.click(screen.getByRole('button', { name: /Sair/ }))

    expect(localStorage.getItem('token')).toBeNull()
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })
})
