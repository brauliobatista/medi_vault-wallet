import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import PrescricaoModal from './PrescricaoModal'
import { getMedications, addMedication, deleteMedication } from '../api/medical'

vi.mock('../api/medical', () => ({
  getMedications: vi.fn(),
  addMedication: vi.fn(),
  deleteMedication: vi.fn(),
}))

const mockedGet = vi.mocked(getMedications)
const mockedAdd = vi.mocked(addMedication)
const mockedDelete = vi.mocked(deleteMedication)
const fakeAxiosResponse = {} as AxiosResponse

describe('PrescricaoModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when there is no medication', async () => {
    mockedGet.mockResolvedValue([])

    render(<PrescricaoModal userId="u1" onClose={() => {}} />)

    expect(await screen.findByText('Sem medicação prescrita.')).toBeInTheDocument()
  })

  it('lists medications returned by the API', async () => {
    mockedGet.mockResolvedValue([
      { id: 1, activeSubstance: 'Ibuprofeno', dose: '400mg', posology: '1x/dia', startDate: '2024-01-01', endDate: null },
    ])

    render(<PrescricaoModal userId="u1" onClose={() => {}} />)

    expect(await screen.findByText('Ibuprofeno')).toBeInTheDocument()
    expect(screen.getByText('400mg')).toBeInTheDocument()
  })

  it('adds a medication through the form and reloads the list', async () => {
    mockedGet.mockResolvedValue([])
    mockedAdd.mockResolvedValue({})

    render(<PrescricaoModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem medicação prescrita.')

    fireEvent.click(screen.getByText('Adicionar medicação'))
    const substanceInput = screen.getByText('Substância ativa').nextElementSibling as HTMLInputElement
    fireEvent.change(substanceInput, { target: { value: 'Paracetamol' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() =>
      expect(mockedAdd).toHaveBeenCalledWith('u1', expect.objectContaining({ activeSubstance: 'Paracetamol' })),
    )
    expect(mockedGet).toHaveBeenCalledTimes(2)
  })

  it('does not submit the form when the substance is blank', async () => {
    mockedGet.mockResolvedValue([])

    render(<PrescricaoModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem medicação prescrita.')

    fireEvent.click(screen.getByText('Adicionar medicação'))
    fireEvent.click(screen.getByText('Guardar'))

    expect(mockedAdd).not.toHaveBeenCalled()
  })

  it('deletes a medication after confirming', async () => {
    mockedGet.mockResolvedValue([
      { id: 1, activeSubstance: 'Ibuprofeno', dose: null, posology: null, startDate: null, endDate: null },
    ])
    mockedDelete.mockResolvedValue(fakeAxiosResponse)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<PrescricaoModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Ibuprofeno')

    fireEvent.click(screen.getByRole('button', { name: '' }))

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('u1', 1))
  })
})
