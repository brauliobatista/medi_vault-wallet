import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from './Layout'
import { saveUser } from '../hooks/useAuth'
import { getAccessRequests } from '../api/medical'

vi.mock('../api/medical', () => ({
  getAccessRequests: vi.fn(),
}))

const mockedGet = vi.mocked(getAccessRequests)

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
    vi.clearAllMocks()
    mockedGet.mockResolvedValue([])
  })

  it('shows the patient nav items and page title for a patient route', async () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')

    renderAt('/exams')
    await waitFor(() => expect(mockedGet).toHaveBeenCalled())

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

  it('marks the nav item matching the current path as active', async () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')

    renderAt('/habits')
    await waitFor(() => expect(mockedGet).toHaveBeenCalled())

    expect(screen.getByRole('link', { name: /Hábitos de Saúde/ })).toHaveClass('active')
    expect(screen.getByRole('link', { name: /Exames/ })).not.toHaveClass('active')
  })

  it('renders children inside the main content area', async () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')

    renderAt('/dashboard')
    await waitFor(() => expect(mockedGet).toHaveBeenCalled())

    expect(screen.getByText('conteúdo da página')).toBeInTheDocument()
  })

  it('logs out and navigates to /login when the sidebar logout button is clicked', async () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')
    const originalLocation = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, href: '' } })

    renderAt('/dashboard')
    await waitFor(() => expect(mockedGet).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /Sair/ }))

    expect(localStorage.getItem('token')).toBeNull()
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('shows a badge with the pending access request count for a patient', async () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')
    mockedGet.mockResolvedValue([
      { id: 1, doctorName: 'Dr. João Costa', requestedAt: '2026-08-01T10:00:00', status: 'pending' },
      { id: 2, doctorName: 'Dr. Maria Costa', requestedAt: '2026-08-02T10:00:00', status: 'approved' },
    ])

    renderAt('/dashboard')

    expect(await screen.findByText('1')).toBeInTheDocument()
  })

  it('lists pending requests in the notification dropdown when the bell is clicked', async () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')
    mockedGet.mockResolvedValue([
      { id: 1, doctorName: 'Dr. João Costa', requestedAt: '2026-08-01T10:00:00', status: 'pending' },
    ])

    renderAt('/dashboard')
    await waitFor(() => expect(mockedGet).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Notificações' }))

    expect(await screen.findByText('Dr. João Costa')).toBeInTheDocument()
  })

  it('does not show the notification bell for a doctor', async () => {
    saveUser({ id: '1', name: 'Dr. João Costa', role: 'Doctor' }, 'token')

    renderAt('/doctor')

    expect(screen.queryByRole('button', { name: 'Notificações' })).not.toBeInTheDocument()
    expect(mockedGet).not.toHaveBeenCalled()
  })
})
