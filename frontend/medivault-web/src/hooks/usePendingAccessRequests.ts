import { useCallback, useEffect, useState } from 'react'
import { getUser } from './useAuth'
import { getAccessRequests } from '../api/medical'

export interface PendingAccessRequest {
  id: number
  doctorName: string
  requestedAt: string
}

const POLL_INTERVAL_MS = 30000

export function usePendingAccessRequests() {
  const [pendingRequests, setPendingRequests] = useState<PendingAccessRequest[]>([])
  const isPatient = getUser()?.role === 'Patient'

  const refresh = useCallback(() => {
    if (!isPatient) return
    getAccessRequests().then((requests: Record<string, unknown>[]) => {
      setPendingRequests(
        requests
          .filter((r) => r.status === 'pending')
          .map((r) => ({
            id: Number(r.id),
            doctorName: String(r.doctorName),
            requestedAt: String(r.requestedAt),
          })),
      )
    })
  }, [isPatient])

  useEffect(() => {
    if (!isPatient) return
    refresh()
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isPatient, refresh])

  return { pendingRequests, count: pendingRequests.length }
}
