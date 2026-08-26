import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PatientViewPage from './PatientViewPage'
import { saveUser } from '../../hooks/useAuth'
import api from '../../api/client'
import {
  getPatientSummary,
  getPathologies,
  getAllergies,
  getMedications,
  getAnalyticalExams,
  getImagingExams,
  getOptometryExams,
  getDoctorProfile,
  getAnamneses,
  getAssessments,
  getVitalSigns,
  getAccessStatus,
  getDocuments,
  getChatMessages,
  getFamilyCircle,
  getDoctorNotes,
  saveConsultationDraft,
  finishConsultation,
} from '../../api/medical'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('../../api/medical', () => ({
  getPatientSummary: vi.fn(),
  getPathologies: vi.fn(),
  getAllergies: vi.fn(),
  getMedications: vi.fn(),
  getAnalyticalExams: vi.fn(),
  getImagingExams: vi.fn(),
  getOptometryExams: vi.fn(),
  getDoctorProfile: vi.fn(),
  getAnamneses: vi.fn(),
  getAssessments: vi.fn(),
  getVitalSigns: vi.fn(),
  getAccessStatus: vi.fn(),
  getDocuments: vi.fn(),
  getChatMessages: vi.fn(),
  getFamilyCircle: vi.fn(),
  getDoctorNotes: vi.fn(),
  saveConsultationDraft: vi.fn(),
  finishConsultation: vi.fn(),
}))

const mockedApiGet = vi.mocked(api.get)
const mockedGetPatientSummary = vi.mocked(getPatientSummary)
const mockedGetDoctorProfile = vi.mocked(getDoctorProfile)
const mockedGetAccessStatus = vi.mocked(getAccessStatus)
const mockedSaveDraft = vi.mocked(saveConsultationDraft)
const mockedFinish = vi.mocked(finishConsultation)

const summary = {
  userId: 'u1', firstName: 'João', lastName: 'Silva', biologicalGender: 'M',
  bloodType: 'A+', acceptsTransfusion: true, sex: 'M', birthday: '1985-03-12',
  utentNumber: '123456789', photoUrl: null,
}

function renderPage(state?: object) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/doctor/patient/u1', state }]}>
      <Routes>
        <Route path="/doctor/patient/:patientId" element={<PatientViewPage />} />
        <Route path="/doctor" element={<div>Dashboard do médico</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PatientViewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    saveUser({ id: 'd1', name: 'Dr. Carlos Rodrigues', role: 'Doctor' }, 'token')

    mockedApiGet.mockResolvedValue({ data: { name: 'João Silva', publicId: 'PUB123', nationalityName: 'Portuguesa' } })
    mockedGetPatientSummary.mockResolvedValue(summary)
    mockedGetDoctorProfile.mockResolvedValue({ speciality: 'Cardiologia' })
    mockedGetAccessStatus.mockResolvedValue({ hasAccess: true, reason: 'granted' })
    vi.mocked(getPathologies).mockResolvedValue([])
    vi.mocked(getAllergies).mockResolvedValue([])
    vi.mocked(getMedications).mockResolvedValue([])
    vi.mocked(getAnalyticalExams).mockResolvedValue([])
    vi.mocked(getImagingExams).mockResolvedValue([])
    vi.mocked(getOptometryExams).mockResolvedValue([])
    vi.mocked(getAnamneses).mockResolvedValue([])
    vi.mocked(getAssessments).mockResolvedValue([])
    vi.mocked(getVitalSigns).mockResolvedValue([])
    vi.mocked(getDocuments).mockResolvedValue([])
    vi.mocked(getChatMessages).mockResolvedValue([])
    vi.mocked(getFamilyCircle).mockResolvedValue([])
    vi.mocked(getDoctorNotes).mockResolvedValue([])
  })

  it('renders the draft and finish buttons once the patient loads', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: /Guardar rascunho/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Finalizar consulta/ })).toBeInTheDocument()
  })

  it('saves a draft and shows a confirmation message without navigating away', async () => {
    mockedSaveDraft.mockResolvedValue({ id: 7, status: 'draft', startedAt: '2026-08-19T10:00:00Z', finishedAt: null, updatedAt: '2026-08-19T10:00:00Z' })
    renderPage()
    const draftButton = await screen.findByRole('button', { name: /Guardar rascunho/ })

    fireEvent.click(draftButton)

    await waitFor(() => expect(mockedSaveDraft).toHaveBeenCalledWith('u1', expect.objectContaining({ consultationId: null })))
    expect(await screen.findByText('Rascunho guardado')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard do médico')).not.toBeInTheDocument()
  })

  it('finishes the consultation and navigates to the doctor dashboard', async () => {
    mockedFinish.mockResolvedValue({ id: 7, status: 'finished', startedAt: '2026-08-19T10:00:00Z', finishedAt: '2026-08-19T10:20:00Z', updatedAt: '2026-08-19T10:20:00Z' })
    renderPage()
    const finishButton = await screen.findByRole('button', { name: /Finalizar consulta/ })

    fireEvent.click(finishButton)

    await waitFor(() => expect(mockedFinish).toHaveBeenCalledWith('u1', expect.objectContaining({ consultationId: null })))
    expect(await screen.findByText('Dashboard do médico')).toBeInTheDocument()
  })

  it('resumes a draft: pre-fills the consultation id from navigation state instead of creating a new one', async () => {
    mockedSaveDraft.mockResolvedValue({ id: 5, status: 'draft', startedAt: '2026-08-19T10:00:00Z', finishedAt: null, updatedAt: '2026-08-19T10:05:00Z' })
    renderPage({ patientName: 'João Silva', publicId: 'PUB123', consultationId: 5, startedAt: '2026-08-19T10:00:00Z' })
    const draftButton = await screen.findByRole('button', { name: /Guardar rascunho/ })

    fireEvent.click(draftButton)

    await waitFor(() => expect(mockedSaveDraft).toHaveBeenCalledWith('u1', expect.objectContaining({ consultationId: 5 })))
  })

  it('shows an empty state in the Notas panel when there are no notes', async () => {
    renderPage()

    expect(await screen.findByText('Notas')).toBeInTheDocument()
    expect(screen.getByText('Sem notas registadas.')).toBeInTheDocument()
  })

  it('previews the most recent note in the Notas panel', async () => {
    vi.mocked(getDoctorNotes).mockResolvedValue([
      { id: 1, doctorId: 'd1', doctorName: 'Dr. Carlos Rodrigues', section: 'Diagnóstico', noteText: 'Suspeita de hipertensão', createdAt: '2026-08-19T10:05:00Z', updatedAt: '2026-08-19T10:05:00Z' },
    ])

    renderPage()

    expect(await screen.findByText('Suspeita de hipertensão')).toBeInTheDocument()
    expect(screen.getByText('Suspeita de hipertensão').previousElementSibling).toHaveTextContent('Diagnóstico')
  })
})
