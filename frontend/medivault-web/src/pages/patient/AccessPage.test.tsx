import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { AxiosResponse } from 'axios'
import AccessPage from './AccessPage'
import { saveUser } from '../../hooks/useAuth'
import { getProfile, getAccessRequests, getQrCode, respondToRequest, deleteRequest } from '../../api/medical'

const fakeAxiosResponse = {} as AxiosResponse

vi.mock('../../api/medical', () => ({
  getProfile: vi.fn(),
  getAccessRequests: vi.fn(),
  getQrCode: vi.fn(),
  respondToRequest: vi.fn(),
  deleteRequest: vi.fn(),
  toggleCard: vi.fn(),
  getGoogleWalletUrl: vi.fn(),
}))

const mockedGetProfile = vi.mocked(getProfile)
const mockedGetAccessRequests = vi.mocked(getAccessRequests)
const mockedGetQrCode = vi.mocked(getQrCode)
const mockedRespondToRequest = vi.mocked(respondToRequest)
const mockedDeleteRequest = vi.mocked(deleteRequest)

function renderPage() {
  return render(
    <MemoryRouter>
      <AccessPage />
    </MemoryRouter>,
  )
}

describe('AccessPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')
    mockedGetProfile.mockResolvedValue({ cardActive: true })
    mockedGetQrCode.mockResolvedValue({ payload: 'QR123' })
    mockedRespondToRequest.mockResolvedValue(fakeAxiosResponse)
    mockedDeleteRequest.mockResolvedValue(fakeAxiosResponse)
  })

  it('shows the empty message when there are no access requests', async () => {
    mockedGetAccessRequests.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('Sem pedidos de acesso.')).toBeInTheDocument()
  })

  it('renders access requests in a table', async () => {
    mockedGetAccessRequests.mockResolvedValue([
      { id: 1, doctorName: 'Dr. João Costa', status: 'pending', requestedAt: '2026-08-01T10:00:00', approvedAt: null, expiresAt: null },
    ])

    renderPage()

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Dr. João Costa')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })

  it('approves a pending request', async () => {
    const user = userEvent.setup()
    mockedGetAccessRequests.mockResolvedValue([
      { id: 1, doctorName: 'Dr. João Costa', status: 'pending', requestedAt: '2026-08-01T10:00:00', approvedAt: null, expiresAt: null },
    ])

    renderPage()

    const approveButton = await screen.findByRole('button', { name: /Aprovar/ })
    await user.click(approveButton)

    await waitFor(() => expect(mockedRespondToRequest).toHaveBeenCalledWith(1, 'approve'))
    expect(await screen.findByText('Acesso aprovado com sucesso.')).toBeInTheDocument()
  })

  it('revokes an approved request', async () => {
    const user = userEvent.setup()
    mockedGetAccessRequests.mockResolvedValue([
      { id: 2, doctorName: 'Dr. Maria Costa', status: 'approved', requestedAt: '2026-08-01T10:00:00', approvedAt: '2026-08-02T10:00:00', expiresAt: null },
    ])

    renderPage()

    const revokeButton = await screen.findByRole('button', { name: /Revogar/ })
    await user.click(revokeButton)

    await waitFor(() => expect(mockedDeleteRequest).toHaveBeenCalledWith(2))
    expect(await screen.findByText('Acesso revogado com sucesso.')).toBeInTheDocument()
  })
})
