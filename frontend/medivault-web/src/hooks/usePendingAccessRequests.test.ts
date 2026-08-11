import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePendingAccessRequests } from './usePendingAccessRequests'
import { getAccessRequests } from '../api/medical'
import { saveUser } from './useAuth'

vi.mock('../api/medical', () => ({
  getAccessRequests: vi.fn(),
}))

const mockedGet = vi.mocked(getAccessRequests)

describe('usePendingAccessRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns only the pending requests for a patient', async () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')
    mockedGet.mockResolvedValue([
      { id: 1, doctorName: 'Dr. João Costa', requestedAt: '2026-08-01T10:00:00', status: 'pending' },
      { id: 2, doctorName: 'Dr. Maria Costa', requestedAt: '2026-08-02T10:00:00', status: 'approved' },
    ])

    const { result } = renderHook(() => usePendingAccessRequests())

    await waitFor(() => expect(result.current.count).toBe(1))
    expect(result.current.pendingRequests[0]).toEqual({
      id: 1,
      doctorName: 'Dr. João Costa',
      requestedAt: '2026-08-01T10:00:00',
    })
  })

  it('does not fetch anything for a doctor', () => {
    saveUser({ id: '1', name: 'Dr. João Costa', role: 'Doctor' }, 'token')

    const { result } = renderHook(() => usePendingAccessRequests())

    expect(mockedGet).not.toHaveBeenCalled()
    expect(result.current.count).toBe(0)
  })

  it('polls again after the interval elapses', async () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')
    mockedGet.mockResolvedValue([])
    vi.useFakeTimers({ shouldAdvanceTime: true })

    renderHook(() => usePendingAccessRequests())
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })

    expect(mockedGet).toHaveBeenCalledTimes(2)
  })
})
