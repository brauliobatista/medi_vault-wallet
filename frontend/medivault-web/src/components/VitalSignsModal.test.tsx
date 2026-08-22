import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import VitalSignsModal from './VitalSignsModal'
import { getVitalSigns, addVitalSign, updateVitalSign, deleteVitalSign } from '../api/medical'

interface VitalSignPayload {
  recordedAt: string
  heartRate: number | null
}

const fakeAxiosResponse = {} as AxiosResponse

vi.mock('../api/medical', () => ({
  getVitalSigns: vi.fn(),
  addVitalSign: vi.fn(),
  updateVitalSign: vi.fn(),
  deleteVitalSign: vi.fn(),
}))

const mockedGet = vi.mocked(getVitalSigns)
const mockedAdd = vi.mocked(addVitalSign)
const mockedUpdate = vi.mocked(updateVitalSign)
const mockedDelete = vi.mocked(deleteVitalSign)

const inputByLabel = (label: string) => screen.getByText(label).nextElementSibling as HTMLInputElement

const vital = {
  id: 1, recordedAt: '2024-01-01 10:00:00',
  bloodPressureSystolic: 120, bloodPressureDiastolic: 80, heartRate: 70,
  respiratoryRate: 16, temperature: 36.5, spo2: 98, weight: 70, height: 175, notes: 'ok',
}

describe('VitalSignsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when there are no records', async () => {
    mockedGet.mockResolvedValue([])

    render(<VitalSignsModal userId="u1" onClose={() => {}} />)

    expect(await screen.findByText('Sem registos de sinais vitais.')).toBeInTheDocument()
  })

  it('lists a record and computes its BMI', async () => {
    mockedGet.mockResolvedValue([vital])

    render(<VitalSignsModal userId="u1" onClose={() => {}} />)

    expect(await screen.findByText('120/80')).toBeInTheDocument()
    expect(screen.getByText('22.9')).toBeInTheDocument() // 70 / (1.75^2)
  })

  it('shows a dash for BMI when weight or height is missing', async () => {
    mockedGet.mockResolvedValue([{ ...vital, weight: null }])

    render(<VitalSignsModal userId="u1" onClose={() => {}} />)
    await screen.findByText('120/80')

    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('creates a new record, converting numeric fields and appending seconds to the timestamp', async () => {
    mockedGet.mockResolvedValue([])
    mockedAdd.mockResolvedValue({})

    render(<VitalSignsModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem registos de sinais vitais.')

    fireEvent.click(screen.getByText('Novo registo'))
    fireEvent.change(inputByLabel('FC (bpm)'), { target: { value: '72' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => expect(mockedAdd).toHaveBeenCalled())
    const [userId, payload] = mockedAdd.mock.calls[0] as [string, VitalSignPayload]
    expect(userId).toBe('u1')
    expect(payload.heartRate).toBe(72)
    expect(payload.recordedAt.endsWith(':00')).toBe(true)
  })

  it('does not submit without a recordedAt value', async () => {
    mockedGet.mockResolvedValue([])

    render(<VitalSignsModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem registos de sinais vitais.')

    fireEvent.click(screen.getByText('Novo registo'))
    fireEvent.change(inputByLabel('Data/hora'), { target: { value: '' } })
    fireEvent.click(screen.getByText('Guardar'))

    expect(mockedAdd).not.toHaveBeenCalled()
  })

  it('edits an existing record via updateVitalSign, pre-filled with its values', async () => {
    mockedGet.mockResolvedValue([vital])
    mockedUpdate.mockResolvedValue(fakeAxiosResponse)

    render(<VitalSignsModal userId="u1" onClose={() => {}} />)
    await screen.findByText('120/80')

    const [editButton] = screen.getAllByRole('button', { name: '' })
    fireEvent.click(editButton)
    expect(inputByLabel('FC (bpm)').value).toBe('70')

    fireEvent.change(inputByLabel('FC (bpm)'), { target: { value: '75' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalled())
    const [userId, id, payload] = mockedUpdate.mock.calls[0] as [string, number, VitalSignPayload]
    expect(userId).toBe('u1')
    expect(id).toBe(1)
    expect(payload.heartRate).toBe(75)
  })

  it('deletes a record after confirming', async () => {
    mockedGet.mockResolvedValue([vital])
    mockedDelete.mockResolvedValue(fakeAxiosResponse)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<VitalSignsModal userId="u1" onClose={() => {}} />)
    await screen.findByText('120/80')

    const buttons = screen.getAllByRole('button', { name: '' })
    fireEvent.click(buttons[buttons.length - 1])

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('u1', 1))
  })
})
