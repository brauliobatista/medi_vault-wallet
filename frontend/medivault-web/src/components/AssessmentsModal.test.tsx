import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import AssessmentsModal from './AssessmentsModal'
import { getAssessments, addAssessment, updateAssessment, deleteAssessment } from '../api/medical'

vi.mock('../api/medical', () => ({
  getAssessments: vi.fn(),
  addAssessment: vi.fn(),
  updateAssessment: vi.fn(),
  deleteAssessment: vi.fn(),
}))

const mockedGet = vi.mocked(getAssessments)
const mockedAdd = vi.mocked(addAssessment)
const mockedUpdate = vi.mocked(updateAssessment)
const mockedDelete = vi.mocked(deleteAssessment)
const fakeAxiosResponse = {} as AxiosResponse

const textareaByLabel = (label: string) =>
  screen.getAllByText(label).map((el) => el.nextElementSibling).find((el) => el?.tagName === 'TEXTAREA') as HTMLTextAreaElement

describe('AssessmentsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when there are no assessments', async () => {
    mockedGet.mockResolvedValue([])

    render(<AssessmentsModal userId="u1" onClose={() => {}} />)

    expect(await screen.findByText('Sem avaliações registadas.')).toBeInTheDocument()
  })

  it('lists assessments with hypothesis and plan', async () => {
    mockedGet.mockResolvedValue([{ id: 1, hypothesis: 'Gripe', plan: 'Repouso', createdAt: '2024-01-01T10:00:00' }])

    render(<AssessmentsModal userId="u1" onClose={() => {}} />)

    expect(await screen.findByText('Gripe')).toBeInTheDocument()
    expect(screen.getByText('Repouso')).toBeInTheDocument()
  })

  it('creates a new assessment through the form', async () => {
    mockedGet.mockResolvedValue([])
    mockedAdd.mockResolvedValue({})

    render(<AssessmentsModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem avaliações registadas.')

    fireEvent.click(screen.getByText('Adicionar avaliação'))
    fireEvent.change(textareaByLabel('Hipótese diagnóstica'), { target: { value: 'Gripe' } })
    fireEvent.change(textareaByLabel('Plano diagnóstico'), { target: { value: 'Repouso' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => expect(mockedAdd).toHaveBeenCalledWith('u1', { hypothesis: 'Gripe', plan: 'Repouso' }))
    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('does not submit when hypothesis or plan is blank', async () => {
    mockedGet.mockResolvedValue([])

    render(<AssessmentsModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem avaliações registadas.')

    fireEvent.click(screen.getByText('Adicionar avaliação'))
    fireEvent.change(textareaByLabel('Hipótese diagnóstica'), { target: { value: 'Gripe' } })
    fireEvent.click(screen.getByText('Guardar'))

    expect(mockedAdd).not.toHaveBeenCalled()
  })

  it('edits an existing assessment via updateAssessment', async () => {
    mockedGet.mockResolvedValue([{ id: 1, hypothesis: 'Gripe', plan: 'Repouso', createdAt: '2024-01-01T10:00:00' }])
    mockedUpdate.mockResolvedValue(fakeAxiosResponse)

    render(<AssessmentsModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Gripe')

    fireEvent.click(screen.getByText('Editar'))
    fireEvent.change(textareaByLabel('Plano diagnóstico'), { target: { value: 'Antibiótico' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith('u1', 1, { hypothesis: 'Gripe', plan: 'Antibiótico' }))
    expect(mockedAdd).not.toHaveBeenCalled()
  })

  it('deletes an assessment after confirming', async () => {
    mockedGet.mockResolvedValue([{ id: 1, hypothesis: 'Gripe', plan: 'Repouso', createdAt: '2024-01-01T10:00:00' }])
    mockedDelete.mockResolvedValue(fakeAxiosResponse)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<AssessmentsModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Gripe')

    fireEvent.click(screen.getByRole('button', { name: '' }))

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('u1', 1))
  })
})
