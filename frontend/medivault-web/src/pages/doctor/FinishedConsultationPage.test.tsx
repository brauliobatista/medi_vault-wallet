import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import FinishedConsultationPage from './FinishedConsultationPage'
import { getDoctorNotes, getChatMessages } from '../../api/medical'

vi.mock('../../api/medical', () => ({
  getDoctorNotes: vi.fn(),
  getChatMessages: vi.fn(),
}))

const mockedGetNotes = vi.mocked(getDoctorNotes)
const mockedGetChat = vi.mocked(getChatMessages)

const navState = {
  patientName: 'João Silva', userId: 'u1', patientPublicId: 'PUB123', utentNumber: '123456789',
  durationMinutes: 20, finishedAt: '2026-08-19T10:20:00Z',
}

function renderPage(state: object | null = navState) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/doctor/finished-consultation/1', state }]}>
      <Routes>
        <Route path="/doctor/finished-consultation/:consultationId" element={<FinishedConsultationPage />} />
        <Route path="/doctor" element={<div>Dashboard do médico</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('FinishedConsultationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a not-found message and a link back when there is no navigation state', () => {
    renderPage(null)

    expect(screen.getByText(/Consulta não encontrada/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar ao dashboard/ })).toHaveAttribute('href', '/doctor')
  })

  it('renders patient info, card/utente number and duration', async () => {
    mockedGetNotes.mockResolvedValue([])
    mockedGetChat.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText(/PUB123/)).toBeInTheDocument()
    expect(screen.getByText(/123456789/)).toBeInTheDocument()
    expect(screen.getByText(/Duração: 20 min/)).toBeInTheDocument()
  })

  it('renders loaded notes and chat messages', async () => {
    mockedGetNotes.mockResolvedValue([
      { id: 1, doctorId: 'd1', doctorName: 'Dr. Carlos Rodrigues', section: 'anamnese', noteText: 'Nota confidencial', createdAt: '2026-08-19T10:05:00Z', updatedAt: '2026-08-19T10:05:00Z' },
    ])
    mockedGetChat.mockResolvedValue([
      { id: 1, authorDoctorId: 'd2', authorName: 'Dra. Sofia Martins', message: 'Reveja os resultados.', createdAt: '2026-08-19T10:10:00Z' },
    ])

    renderPage()

    expect(await screen.findByText('Nota confidencial')).toBeInTheDocument()
    expect(screen.getByText('Reveja os resultados.')).toBeInTheDocument()
    expect(screen.getByText('Dra. Sofia Martins')).toBeInTheDocument()
  })

  it('shows empty states when there are no notes or chat messages', async () => {
    mockedGetNotes.mockResolvedValue([])
    mockedGetChat.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('Sem notas registadas.')).toBeInTheDocument()
    expect(screen.getByText('Sem mensagens.')).toBeInTheDocument()
  })
})
