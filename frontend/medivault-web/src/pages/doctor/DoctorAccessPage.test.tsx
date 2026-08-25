import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DoctorAccessPage from './DoctorAccessPage'
import { saveUser } from '../../hooks/useAuth'
import { getAccessRequests } from '../../api/medical'

vi.mock('../../api/medical', () => ({
  getAccessRequests: vi.fn(),
}))

const mockedGetAccessRequests = vi.mocked(getAccessRequests)

function renderPage() {
  return render(
    <MemoryRouter>
      <DoctorAccessPage />
    </MemoryRouter>,
  )
}

describe('DoctorAccessPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    saveUser({ id: '1', name: 'Dr. Costa', role: 'Doctor' }, 'token')
  })

  it('shows the empty message when there are no requests for the selected filters', async () => {
    mockedGetAccessRequests.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('Sem pedidos de acesso para os filtros selecionados.')).toBeInTheDocument()
  })

  it('renders matching access requests in a table, defaulting to the "Aprovados" filter', async () => {
    mockedGetAccessRequests.mockResolvedValue([
      {
        id: 1, userId: 'u1', patientName: 'Ana Silva', patientPublicId: 'PT-001', utentNumber: '123',
        status: 'approved', isEmergency: false, requestedAt: '2026-08-01T10:00:00', approvedAt: '2026-08-02T10:00:00', expiresAt: null,
      },
      {
        id: 2, userId: 'u2', patientName: 'Bruno Alves', patientPublicId: 'PT-002', utentNumber: '456',
        status: 'pending', isEmergency: false, requestedAt: '2026-08-03T10:00:00', approvedAt: null, expiresAt: null,
      },
    ])

    renderPage()

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.queryByText('Bruno Alves')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ver dados/ })).toBeInTheDocument()
  })

  it('filters requests by the search box', async () => {
    const user = userEvent.setup()
    mockedGetAccessRequests.mockResolvedValue([
      {
        id: 1, userId: 'u1', patientName: 'Ana Silva', patientPublicId: 'PT-001', utentNumber: '123',
        status: 'approved', isEmergency: false, requestedAt: '2026-08-01T10:00:00', approvedAt: '2026-08-02T10:00:00', expiresAt: null,
      },
      {
        id: 2, userId: 'u2', patientName: 'Bruno Alves', patientPublicId: 'PT-002', utentNumber: '456',
        status: 'approved', isEmergency: false, requestedAt: '2026-08-03T10:00:00', approvedAt: '2026-08-04T10:00:00', expiresAt: null,
      },
    ])

    renderPage()
    await screen.findByText('Ana Silva')

    await user.type(screen.getByPlaceholderText('Pesquisar...'), 'Bruno')

    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument()
    expect(screen.getByText('Bruno Alves')).toBeInTheDocument()
  })
})
