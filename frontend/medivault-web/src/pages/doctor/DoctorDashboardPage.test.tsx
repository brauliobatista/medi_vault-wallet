import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DoctorDashboardPage from './DoctorDashboardPage'
import { saveUser } from '../../hooks/useAuth'
import { getFinishedConsultations, getDraftConsultations } from '../../api/medical'
import { LanguageProvider } from '../../i18n/LanguageContext'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('../../api/medical', () => ({
  scanQrCode: vi.fn(),
  getAccessStatus: vi.fn(),
  getFinishedConsultations: vi.fn(),
  getDraftConsultations: vi.fn(),
}))

const mockedGetFinished = vi.mocked(getFinishedConsultations)
const mockedGetDrafts = vi.mocked(getDraftConsultations)

function renderPage() {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/doctor']}>
        <Routes>
          <Route path="/doctor" element={<DoctorDashboardPage />} />
          <Route path="/doctor/finished-consultation/:consultationId" element={<div>Página da consulta finalizada</div>} />
          <Route path="/doctor/patient/:patientId" element={<div>Página da consulta ativa</div>} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

describe('DoctorDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    saveUser({ id: 'd1', name: 'Dr. Carlos Rodrigues', role: 'Doctor' }, 'token')
    mockedGetDrafts.mockResolvedValue([])
  })

  it('does not show the Consultas Finalizadas section when there are none', async () => {
    mockedGetFinished.mockResolvedValue([])

    renderPage()

    await waitFor(() => expect(mockedGetFinished).toHaveBeenCalled())
    expect(screen.queryByText('Consultas Finalizadas')).not.toBeInTheDocument()
  })

  it('lists finished consultations with patient name, card and utente numbers, and duration', async () => {
    mockedGetFinished.mockResolvedValue([
      { id: 1, userId: 'u1', patientName: 'João Silva', patientPublicId: 'PUB123', utentNumber: '123456789', startedAt: '2026-08-19T10:00:00Z', finishedAt: '2026-08-19T10:20:00Z', durationMinutes: 20 },
    ])

    renderPage()

    expect(await screen.findByText('Consultas Finalizadas')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText(/PUB123/)).toBeInTheDocument()
    expect(screen.getByText(/123456789/)).toBeInTheDocument()
    expect(screen.getByText(/20 min/)).toBeInTheDocument()
  })

  it('navigates to the finished consultation detail page on "Ver"', async () => {
    mockedGetFinished.mockResolvedValue([
      { id: 1, userId: 'u1', patientName: 'João Silva', patientPublicId: 'PUB123', utentNumber: '123456789', startedAt: '2026-08-19T10:00:00Z', finishedAt: '2026-08-19T10:20:00Z', durationMinutes: 20 },
    ])
    renderPage()
    const viewButton = await screen.findByRole('button', { name: /Ver/ })

    fireEvent.click(viewButton)

    expect(await screen.findByText('Página da consulta finalizada')).toBeInTheDocument()
  })

  it('does not show the Rascunhos section when there are none', async () => {
    mockedGetFinished.mockResolvedValue([])
    mockedGetDrafts.mockResolvedValue([])

    renderPage()

    await waitFor(() => expect(mockedGetDrafts).toHaveBeenCalled())
    expect(screen.queryByText('Rascunhos de Consultas')).not.toBeInTheDocument()
  })

  it('lists draft consultations in standby with patient name and numbers', async () => {
    mockedGetFinished.mockResolvedValue([])
    mockedGetDrafts.mockResolvedValue([
      { id: 5, userId: 'u1', patientName: 'João Silva', patientPublicId: 'PUB123', utentNumber: '123456789', startedAt: '2026-08-19T10:00:00Z', updatedAt: '2026-08-19T10:05:00Z' },
    ])

    renderPage()

    expect(await screen.findByText('Rascunhos de Consultas')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText(/PUB123/)).toBeInTheDocument()
    expect(screen.getByText(/123456789/)).toBeInTheDocument()
  })

  it('resumes a draft consultation on "Retomar", carrying the consultation id and start time', async () => {
    mockedGetFinished.mockResolvedValue([])
    mockedGetDrafts.mockResolvedValue([
      { id: 5, userId: 'u1', patientName: 'João Silva', patientPublicId: 'PUB123', utentNumber: '123456789', startedAt: '2026-08-19T10:00:00Z', updatedAt: '2026-08-19T10:05:00Z' },
    ])
    renderPage()
    const resumeButton = await screen.findByRole('button', { name: /Retomar/ })

    fireEvent.click(resumeButton)

    expect(await screen.findByText('Página da consulta ativa')).toBeInTheDocument()
  })
})
