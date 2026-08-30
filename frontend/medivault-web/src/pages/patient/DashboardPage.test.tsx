import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import { saveUser } from '../../hooks/useAuth'
import { getAccessRequests } from '../../api/medical'
import { LanguageProvider } from '../../i18n/LanguageContext'

vi.mock('../../api/medical', () => ({
  getAccessRequests: vi.fn(),
}))

const mockedGet = vi.mocked(getAccessRequests)

function renderPage() {
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </LanguageProvider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')
  })

  it('does not show the pending access requests banner when there are none', async () => {
    mockedGet.mockResolvedValue([])

    renderPage()

    await waitFor(() => expect(mockedGet).toHaveBeenCalled())
    expect(screen.queryByText(/pedido de acesso pendente/)).not.toBeInTheDocument()
  })

  it('shows a banner linking to /access when there are pending requests', async () => {
    mockedGet.mockResolvedValue([
      { id: 1, doctorName: 'Dr. João Costa', requestedAt: '2026-08-01T10:00:00', status: 'pending' },
      { id: 2, doctorName: 'Dr. Maria Costa', requestedAt: '2026-08-02T10:00:00', status: 'pending' },
    ])

    renderPage()

    expect(await screen.findByText(/pedidos de acesso pendentes/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver pedidos' })).toHaveAttribute('href', '/access')
  })
})
