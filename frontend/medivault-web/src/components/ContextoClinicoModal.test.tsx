import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import ContextoClinicoModal from './ContextoClinicoModal'
import {
  getAllergies, addAllergy,
  getPathologies, getIcpc2Codes,
  getMedications,
  getPatientSummary, updateBloodType,
} from '../api/medical'
import { LanguageProvider } from '../i18n/LanguageContext'

vi.mock('../api/medical', () => ({
  getAllergies: vi.fn(),
  addAllergy: vi.fn(),
  deleteAllergy: vi.fn(),
  getPathologies: vi.fn(),
  addPathology: vi.fn(),
  deletePathology: vi.fn(),
  getIcpc2Codes: vi.fn(),
  getMedications: vi.fn(),
  addMedication: vi.fn(),
  deleteMedication: vi.fn(),
  getPatientSummary: vi.fn(),
  updateBloodType: vi.fn(),
}))

const mockedGetAllergies = vi.mocked(getAllergies)
const mockedAddAllergy = vi.mocked(addAllergy)
const mockedGetPathologies = vi.mocked(getPathologies)
const mockedGetIcpc2 = vi.mocked(getIcpc2Codes)
const mockedGetMedications = vi.mocked(getMedications)
const mockedGetSummary = vi.mocked(getPatientSummary)
const mockedUpdateBloodType = vi.mocked(updateBloodType)
const fakeAxiosResponse = {} as AxiosResponse

function mockAllEmpty(bloodType: string | null = null) {
  mockedGetAllergies.mockResolvedValue([])
  mockedGetPathologies.mockResolvedValue([])
  mockedGetMedications.mockResolvedValue([])
  mockedGetIcpc2.mockResolvedValue([])
  mockedGetSummary.mockResolvedValue({ bloodType })
}

describe('ContextoClinicoModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state while fetching, then empty states for every section', async () => {
    mockAllEmpty()

    render(<LanguageProvider><ContextoClinicoModal userId="u1" onClose={() => {}} /></LanguageProvider>)

    expect(screen.getByText('A carregar…')).toBeInTheDocument()
    expect(await screen.findByText('Sem alergias registadas.')).toBeInTheDocument()
    expect(screen.getByText('Sem problemas ativos registados.')).toBeInTheDocument()
    expect(screen.getByText('Sem medicação ativa.')).toBeInTheDocument()
    expect(screen.getByText('Não registado')).toBeInTheDocument()
  })

  it('shows the recorded blood type', async () => {
    mockAllEmpty('O+')

    render(<LanguageProvider><ContextoClinicoModal userId="u1" onClose={() => {}} /></LanguageProvider>)

    expect(await screen.findByText('O+')).toBeInTheDocument()
  })

  it('saves an edited blood type', async () => {
    mockAllEmpty('O+')
    mockedUpdateBloodType.mockResolvedValue(fakeAxiosResponse)

    render(<LanguageProvider><ContextoClinicoModal userId="u1" onClose={() => {}} /></LanguageProvider>)
    await screen.findByText('O+')

    fireEvent.click(screen.getByRole('button', { name: '' }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'A+' } })
    fireEvent.click(screen.getByRole('button', { name: /^$/ }))

    await waitFor(() => expect(mockedUpdateBloodType).toHaveBeenCalledWith('u1', 'A+'))
  })

  it('adds a new allergy', async () => {
    mockAllEmpty()
    mockedAddAllergy.mockResolvedValue({})

    render(<LanguageProvider><ContextoClinicoModal userId="u1" onClose={() => {}} /></LanguageProvider>)
    await screen.findByText('Sem alergias registadas.')

    fireEvent.click(screen.getByText('Adicionar alergia'))
    const substanceInput = screen.getByText('Substância').nextElementSibling as HTMLInputElement
    fireEvent.change(substanceInput, { target: { value: 'Penicilina' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() =>
      expect(mockedAddAllergy).toHaveBeenCalledWith('u1', { activeSubstance: 'Penicilina', allergicReaction: '', severity: '' }),
    )
  })

  it('lists allergies, pathologies and medications from the API', async () => {
    mockedGetAllergies.mockResolvedValue([{ id: 1, activeSubstance: 'Penicilina', allergicReaction: 'Urticária', severity: 'moderate' }])
    mockedGetPathologies.mockResolvedValue([{ id: 1, icpc2Description: 'Hipertensão', type: 'chronic', diagnosedAt: '2020-01-01' }])
    mockedGetMedications.mockResolvedValue([{ id: 1, activeSubstance: 'Ibuprofeno', dose: '400mg', posology: '1x/dia', startDate: '2024-01-01' }])
    mockedGetIcpc2.mockResolvedValue([])
    mockedGetSummary.mockResolvedValue({ bloodType: null })

    render(<LanguageProvider><ContextoClinicoModal userId="u1" onClose={() => {}} /></LanguageProvider>)

    expect(await screen.findByText('Penicilina')).toBeInTheDocument()
    expect(screen.getByText('Hipertensão')).toBeInTheDocument()
    expect(screen.getByText('Ibuprofeno 400mg')).toBeInTheDocument()
  })
})
