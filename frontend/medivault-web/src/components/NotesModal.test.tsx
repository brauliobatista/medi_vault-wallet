import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import NotesModal from './NotesModal'
import { getDoctorNotes, createDoctorNote, updateDoctorNote, deleteDoctorNote, getConsultationActivity } from '../api/medical'

vi.mock('../api/medical', () => ({
  getDoctorNotes: vi.fn(),
  createDoctorNote: vi.fn(),
  updateDoctorNote: vi.fn(),
  deleteDoctorNote: vi.fn(),
  getConsultationActivity: vi.fn(),
}))

const mockedGetNotes = vi.mocked(getDoctorNotes)
const mockedCreate = vi.mocked(createDoctorNote)
const mockedUpdate = vi.mocked(updateDoctorNote)
const mockedDelete = vi.mocked(deleteDoctorNote)
const mockedGetActivity = vi.mocked(getConsultationActivity)
const fakeAxiosResponse = {} as AxiosResponse

const STARTED_AT = '2026-08-19T10:00:00Z'

function renderModal() {
  return render(<NotesModal userId="u1" startedAt={STARTED_AT} onClose={() => {}} />)
}

const fieldByLabel = (label: string) =>
  screen.getAllByText(label).map((el) => el.nextElementSibling).find((el) => el?.tagName === 'SELECT' || el?.tagName === 'TEXTAREA') as HTMLSelectElement | HTMLTextAreaElement

describe('NotesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetActivity.mockResolvedValue([])
  })

  it('shows empty states for both notes and activity when there is none', async () => {
    mockedGetNotes.mockResolvedValue([])

    renderModal()

    expect(await screen.findByText('Sem notas registadas.')).toBeInTheDocument()
    expect(await screen.findByText('Sem atividade registada nesta consulta.')).toBeInTheDocument()
  })

  it('lists notes with section, doctor name and date', async () => {
    mockedGetNotes.mockResolvedValue([
      { id: 1, doctorId: 'd1', doctorName: 'Dr. Carlos Rodrigues', section: 'Diagnóstico', noteText: 'Suspeita de hipertensão', createdAt: '2026-08-19T10:05:00Z', updatedAt: '2026-08-19T10:05:00Z' },
    ])

    renderModal()

    expect(await screen.findByText('Suspeita de hipertensão')).toBeInTheDocument()
    expect(screen.getByText('Diagnóstico')).toBeInTheDocument()
    expect(screen.getByText(/Dr\. Carlos Rodrigues/)).toBeInTheDocument()
  })

  it('creates a new note through the form, tagged to the current section', async () => {
    mockedGetNotes.mockResolvedValue([])
    mockedCreate.mockResolvedValue({})

    renderModal()
    await screen.findByText('Sem notas registadas.')

    fireEvent.click(screen.getByText('Adicionar nota'))
    fireEvent.change(fieldByLabel('Secção'), { target: { value: 'Diagnóstico' } })
    fireEvent.change(fieldByLabel('Nota'), { target: { value: 'Suspeita de hipertensão' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith({ userId: 'u1', section: 'Diagnóstico', noteText: 'Suspeita de hipertensão' }))
    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('does not submit when the note text is blank', async () => {
    mockedGetNotes.mockResolvedValue([])

    renderModal()
    await screen.findByText('Sem notas registadas.')

    fireEvent.click(screen.getByText('Adicionar nota'))
    fireEvent.click(screen.getByText('Guardar'))

    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('edits an existing note via updateDoctorNote, keeping the section fixed', async () => {
    mockedGetNotes.mockResolvedValue([
      { id: 1, doctorId: 'd1', doctorName: 'Dr. Carlos Rodrigues', section: 'Geral', noteText: 'Original', createdAt: '2026-08-19T10:05:00Z', updatedAt: '2026-08-19T10:05:00Z' },
    ])
    mockedUpdate.mockResolvedValue(fakeAxiosResponse)

    renderModal()
    await screen.findByText('Original')

    fireEvent.click(screen.getByText('Editar'))
    expect(fieldByLabel('Secção')).toBeDisabled()
    fireEvent.change(fieldByLabel('Nota'), { target: { value: 'Atualizada' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith(1, 'Atualizada'))
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('deletes a note after confirming', async () => {
    mockedGetNotes.mockResolvedValue([
      { id: 1, doctorId: 'd1', doctorName: 'Dr. Carlos Rodrigues', section: 'Geral', noteText: 'Original', createdAt: '2026-08-19T10:05:00Z', updatedAt: '2026-08-19T10:05:00Z' },
    ])
    mockedDelete.mockResolvedValue(fakeAxiosResponse)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderModal()
    await screen.findByText('Original')

    fireEvent.click(screen.getByRole('button', { name: '' }))

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(1))
  })

  it('fetches consultation activity scoped to the consultation start time', async () => {
    mockedGetNotes.mockResolvedValue([])

    renderModal()

    await waitFor(() => expect(mockedGetActivity).toHaveBeenCalledWith('u1', STARTED_AT))
  })

  it('lists consultation activity items below the notes, with doctor name and date', async () => {
    mockedGetNotes.mockResolvedValue([])
    mockedGetActivity.mockResolvedValue([
      { type: 'avaliacao', label: 'Avaliação', detail: 'Hipertensão essencial', doctorId: 'd1', doctorName: 'Dr. Carlos Rodrigues', occurredAt: '2026-08-19T10:10:00Z' },
    ])

    renderModal()

    expect(await screen.findByText('Hipertensão essencial')).toBeInTheDocument()
    expect(screen.getByText('Avaliação')).toBeInTheDocument()
    expect(screen.getByText(/Dr\. Carlos Rodrigues/)).toBeInTheDocument()
  })

  it('keeps the notes section usable even when the activity fetch fails', async () => {
    mockedGetNotes.mockResolvedValue([
      { id: 1, doctorId: 'd1', doctorName: 'Dr. Carlos Rodrigues', section: 'Geral', noteText: 'Nota válida', createdAt: '2026-08-19T10:05:00Z', updatedAt: '2026-08-19T10:05:00Z' },
    ])
    mockedGetActivity.mockRejectedValue(new Error('network error'))

    renderModal()

    expect(await screen.findByText('Nota válida')).toBeInTheDocument()
  })
})
