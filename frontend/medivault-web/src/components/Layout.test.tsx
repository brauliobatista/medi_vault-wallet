import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from './Layout'
import { saveUser, updateUserPhoto } from '../hooks/useAuth'
import { getAccessRequests, getDraftConsultations } from '../api/medical'
import { setActiveConsultation } from '../hooks/useActiveConsultation'
import { LanguageProvider } from '../i18n/LanguageContext'

vi.mock('../api/medical', () => ({
  getAccessRequests: vi.fn(),
  getDraftConsultations: vi.fn(),
}))

const mockedGet = vi.mocked(getAccessRequests)
const mockedGetDrafts = vi.mocked(getDraftConsultations)

function renderAt(path: string) {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[path]}>
        <Layout>
          <div>conteúdo da página</div>
        </Layout>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockedGet.mockResolvedValue([])
    mockedGetDrafts.mockResolvedValue([])
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

  it('shows the fallback avatar when no photo is set', async () => {
    saveUser({ id: '1', name: 'Dr. João Costa', role: 'Doctor' }, 'token')

    renderAt('/doctor')

    expect(screen.getAllByText('👩‍⚕️').length).toBeGreaterThan(0)
    expect(screen.queryByAltText('Dr. João Costa')).not.toBeInTheDocument()
  })

  it('shows the profile photo in both avatars once one is set', async () => {
    saveUser({ id: '1', name: 'Dr. João Costa', role: 'Doctor', photoUrl: '/uploads/doctor-photos/joao.jpg' }, 'token')

    renderAt('/doctor')

    const images = screen.getAllByAltText('Dr. João Costa')
    expect(images).toHaveLength(2)
    images.forEach((img) => expect(img).toHaveAttribute('src', '/uploads/doctor-photos/joao.jpg'))
  })

  it('picks up a newly uploaded photo without a full page reload', async () => {
    saveUser({ id: '1', name: 'Dr. João Costa', role: 'Doctor' }, 'token')

    renderAt('/doctor')
    expect(screen.queryByAltText('Dr. João Costa')).not.toBeInTheDocument()

    act(() => updateUserPhoto('/uploads/doctor-photos/joao.jpg'))

    expect(await screen.findAllByAltText('Dr. João Costa')).toHaveLength(2)
  })

  // ── KAN-85: quick access back to an ongoing / draft consultation ──
  it('shows a sidebar link back to the active consultation for a doctor', async () => {
    saveUser({ id: 'd1', name: 'Dr. João Costa', role: 'Doctor' }, 'token')
    setActiveConsultation({
      userId: 'u7',
      patientName: 'João Silva',
      publicId: 'PUB123',
      consultationId: 9,
      startedAt: '2026-08-19T10:00:00.000Z',
    })

    renderAt('/doctor/profile')

    const link = await screen.findByRole('link', { name: /João Silva/ })
    expect(link).toHaveAttribute('href', '/doctor/patient/u7')
    expect(screen.getByText('Em curso')).toBeInTheDocument()
  })

  it('lists draft consultations in the sidebar and links each one back to the patient', async () => {
    saveUser({ id: 'd1', name: 'Dr. João Costa', role: 'Doctor' }, 'token')
    mockedGetDrafts.mockResolvedValue([
      { id: 5, userId: 'u9', patientName: 'Maria Fonseca', patientPublicId: 'PUB999', utentNumber: '999', startedAt: 's', updatedAt: 'u' },
    ])

    renderAt('/doctor')

    const link = await screen.findByRole('link', { name: /Maria Fonseca/ })
    expect(link).toHaveAttribute('href', '/doctor/patient/u9')
    expect(screen.getByText('Rascunho')).toBeInTheDocument()
  })

  it('caps the sidebar consultations at 3 and links to the dashboard for the rest', async () => {
    saveUser({ id: 'd1', name: 'Dr. João Costa', role: 'Doctor' }, 'token')
    setActiveConsultation({
      userId: 'u0', patientName: 'Ativa Zero', publicId: 'PUB0', consultationId: 1,
      startedAt: '2026-08-19T10:00:00.000Z',
    })
    mockedGetDrafts.mockResolvedValue([
      { id: 1, userId: 'u1', patientName: 'Rascunho Um', patientPublicId: 'P1', utentNumber: '1', startedAt: 's', updatedAt: 'u' },
      { id: 2, userId: 'u2', patientName: 'Rascunho Dois', patientPublicId: 'P2', utentNumber: '2', startedAt: 's', updatedAt: 'u' },
      { id: 3, userId: 'u3', patientName: 'Rascunho Tres', patientPublicId: 'P3', utentNumber: '3', startedAt: 's', updatedAt: 'u' },
      { id: 4, userId: 'u4', patientName: 'Rascunho Quatro', patientPublicId: 'P4', utentNumber: '4', startedAt: 's', updatedAt: 'u' },
    ])

    renderAt('/doctor/profile')

    expect(await screen.findByRole('link', { name: /Ativa Zero/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Rascunho Um/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Rascunho Dois/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Rascunho Tres/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Rascunho Quatro/ })).not.toBeInTheDocument()

    const seeAll = screen.getByRole('link', { name: 'Ver todas (5)' })
    expect(seeAll).toHaveAttribute('href', '/doctor')
  })

  it('does not duplicate a draft in the sidebar when it is already the active consultation', async () => {
    saveUser({ id: 'd1', name: 'Dr. João Costa', role: 'Doctor' }, 'token')
    setActiveConsultation({
      userId: 'u9',
      patientName: 'Maria Fonseca',
      publicId: 'PUB999',
      consultationId: 5,
      startedAt: '2026-08-19T10:00:00.000Z',
    })
    mockedGetDrafts.mockResolvedValue([
      { id: 5, userId: 'u9', patientName: 'Maria Fonseca', patientPublicId: 'PUB999', utentNumber: '999', startedAt: 's', updatedAt: 'u' },
    ])

    renderAt('/doctor')

    await waitFor(() => expect(mockedGetDrafts).toHaveBeenCalled())
    expect(screen.getAllByRole('link', { name: /Maria Fonseca/ })).toHaveLength(1)
  })

  it('does not show the consultations section for a patient', async () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')
    setActiveConsultation({
      userId: 'u7', patientName: 'João Silva', publicId: 'PUB123', consultationId: 9,
      startedAt: '2026-08-19T10:00:00.000Z',
    })

    renderAt('/dashboard')
    await waitFor(() => expect(mockedGet).toHaveBeenCalled())

    expect(screen.queryByText('Consultas em curso')).not.toBeInTheDocument()
    expect(mockedGetDrafts).not.toHaveBeenCalled()
  })
})
