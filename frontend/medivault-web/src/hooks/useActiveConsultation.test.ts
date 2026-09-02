import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import {
  useActiveConsultation,
  setActiveConsultation,
  clearActiveConsultation,
  getActiveConsultation,
} from './useActiveConsultation'
import { getDraftConsultations } from '../api/medical'
import { saveUser } from './useAuth'

vi.mock('../api/medical', () => ({
  getDraftConsultations: vi.fn(),
}))

const mockedGetDrafts = vi.mocked(getDraftConsultations)

const consultation = {
  userId: 'u1',
  patientName: 'João Silva',
  publicId: 'PUB123',
  consultationId: null,
  startedAt: '2026-08-19T10:00:00.000Z',
}

describe('useActiveConsultation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockedGetDrafts.mockResolvedValue([])
  })

  it('does nothing for a patient', () => {
    saveUser({ id: '1', name: 'Ana', role: 'Patient' }, 'token')
    setActiveConsultation(consultation)

    const { result } = renderHook(() => useActiveConsultation())

    expect(mockedGetDrafts).not.toHaveBeenCalled()
    expect(result.current.active).toBeNull()
  })

  it('exposes the stored active consultation and the drafts for a doctor', async () => {
    saveUser({ id: 'd1', name: 'Dr. Carlos', role: 'Doctor' }, 'token')
    mockedGetDrafts.mockResolvedValue([
      { id: 5, userId: 'u9', patientName: 'Maria', patientPublicId: 'PUB999', utentNumber: '999', startedAt: 's', updatedAt: 'u' },
    ])
    setActiveConsultation(consultation)

    const { result } = renderHook(() => useActiveConsultation())

    expect(result.current.active).toEqual(consultation)
    await waitFor(() => expect(result.current.drafts).toHaveLength(1))
    expect(result.current.drafts[0].patientName).toBe('Maria')
  })

  it('reacts to the active consultation being set and cleared', async () => {
    saveUser({ id: 'd1', name: 'Dr. Carlos', role: 'Doctor' }, 'token')

    const { result } = renderHook(() => useActiveConsultation())
    expect(result.current.active).toBeNull()

    act(() => setActiveConsultation(consultation))
    await waitFor(() => expect(result.current.active).toEqual(consultation))

    act(() => clearActiveConsultation())
    await waitFor(() => expect(result.current.active).toBeNull())
    expect(getActiveConsultation()).toBeNull()
  })
})
