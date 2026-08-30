import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import AnamneseModal from './AnamneseModal'
import { getAnamneses, addAnamnesis, updateAnamnesis } from '../api/medical'
import { LanguageProvider } from '../i18n/LanguageContext'

vi.mock('../api/medical', () => ({
  getAnamneses: vi.fn(),
  addAnamnesis: vi.fn(),
  updateAnamnesis: vi.fn(),
}))

const mockedGet = vi.mocked(getAnamneses)
const mockedAdd = vi.mocked(addAnamnesis)
const mockedUpdate = vi.mocked(updateAnamnesis)
const fakeAxiosResponse = {} as AxiosResponse

const textareaByLabel = (label: string) =>
  screen.getAllByText(label).map((el) => el.nextElementSibling).find((el) => el?.tagName === 'TEXTAREA') as HTMLTextAreaElement

const currentAnamnesis = {
  id: 1, doctorId: 'd1', doctorName: 'Dr. João Costa',
  chiefComplaint: 'Dor de cabeça', illnessHistory: 'Há 3 dias', personalHistory: null,
  createdAt: '2024-01-01T10:00:00', canEdit: true,
}

describe('AnamneseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when there are no records', async () => {
    mockedGet.mockResolvedValue([])

    render(<LanguageProvider><AnamneseModal userId="u1" onClose={() => {}} /></LanguageProvider>)

    expect(await screen.findByText('Sem registos de anamnese.')).toBeInTheDocument()
  })

  it('lists the current record with the authoring doctor', async () => {
    mockedGet.mockResolvedValue([currentAnamnesis])

    render(<LanguageProvider><AnamneseModal userId="u1" onClose={() => {}} /></LanguageProvider>)

    expect(await screen.findByText(/Atual — Dr\. João Costa/)).toBeInTheDocument()
    expect(screen.getByText('Dor de cabeça')).toBeInTheDocument()
  })

  it('disables editing the current record when canEdit is false', async () => {
    mockedGet.mockResolvedValue([{ ...currentAnamnesis, canEdit: false }])

    render(<LanguageProvider><AnamneseModal userId="u1" onClose={() => {}} /></LanguageProvider>)
    await screen.findByText(/Atual/)

    expect(screen.getByRole('button', { name: /Editar atual/ })).toBeDisabled()
  })

  it('creates a new anamnesis via addAnamnesis', async () => {
    mockedGet.mockResolvedValue([])
    mockedAdd.mockResolvedValue({})

    render(<LanguageProvider><AnamneseModal userId="u1" onClose={() => {}} /></LanguageProvider>)
    await screen.findByText('Sem registos de anamnese.')

    fireEvent.click(screen.getByText('Nova anamnese'))
    fireEvent.change(textareaByLabel('Queixa principal'), { target: { value: 'Febre' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() =>
      expect(mockedAdd).toHaveBeenCalledWith('u1', { chiefComplaint: 'Febre', illnessHistory: '', personalHistory: '' }),
    )
  })

  it('edits the current anamnesis via updateAnamnesis, pre-filled with its values', async () => {
    mockedGet.mockResolvedValue([currentAnamnesis])
    mockedUpdate.mockResolvedValue(fakeAxiosResponse)

    render(<LanguageProvider><AnamneseModal userId="u1" onClose={() => {}} /></LanguageProvider>)
    await screen.findByText(/Atual/)

    fireEvent.click(screen.getByRole('button', { name: /Editar atual/ }))
    expect(textareaByLabel('Queixa principal').value).toBe('Dor de cabeça')

    fireEvent.change(textareaByLabel('Queixa principal'), { target: { value: 'Dor de cabeça forte' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('u1', 1, {
        chiefComplaint: 'Dor de cabeça forte', illnessHistory: 'Há 3 dias', personalHistory: '',
      }),
    )
  })

  it('shows an error message when saving fails', async () => {
    mockedGet.mockResolvedValue([])
    mockedAdd.mockRejectedValue({ response: { data: { message: 'Prazo de edição expirado.' } } })

    render(<LanguageProvider><AnamneseModal userId="u1" onClose={() => {}} /></LanguageProvider>)
    await screen.findByText('Sem registos de anamnese.')

    fireEvent.click(screen.getByText('Nova anamnese'))
    fireEvent.click(screen.getByText('Guardar'))

    expect(await screen.findByText('Prazo de edição expirado.')).toBeInTheDocument()
  })
})
