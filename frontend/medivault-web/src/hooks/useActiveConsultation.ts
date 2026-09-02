import { useCallback, useEffect, useState } from 'react'
import { getUser } from './useAuth'
import { getDraftConsultations } from '../api/medical'

const STORAGE_KEY = 'activeConsultation'

// Fired whenever the stored active consultation changes, so Layout (which reads
// it outside of React state) re-renders without a full navigation.
export const ACTIVE_CONSULTATION_UPDATED_EVENT = 'active-consultation-updated'

export interface ActiveConsultation {
  userId: string
  patientName: string
  publicId: string
  consultationId: number | null
  startedAt: string
}

export interface DraftConsultationSummary {
  id: number
  userId: string
  patientName: string
  patientPublicId: string
  utentNumber: string
  startedAt: string
  updatedAt: string
}

export function getActiveConsultation(): ActiveConsultation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ActiveConsultation) : null
  } catch {
    return null
  }
}

export function setActiveConsultation(consultation: ActiveConsultation) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consultation))
  window.dispatchEvent(new Event(ACTIVE_CONSULTATION_UPDATED_EVENT))
}

export function clearActiveConsultation() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(ACTIVE_CONSULTATION_UPDATED_EVENT))
}

/**
 * Tracks the consultation the doctor currently has open (kept in localStorage so
 * it survives navigating away from the patient record) plus the server-side
 * draft consultations. Used by Layout to offer a quick way back into a
 * consultation from anywhere in the app.
 */
export function useActiveConsultation() {
  const isDoctor = getUser()?.role === 'Doctor'
  const [active, setActive] = useState<ActiveConsultation | null>(() =>
    isDoctor ? getActiveConsultation() : null,
  )
  const [drafts, setDrafts] = useState<DraftConsultationSummary[]>([])

  const refreshDrafts = useCallback(() => {
    if (!isDoctor) return
    getDraftConsultations()
      .then((list: DraftConsultationSummary[]) => setDrafts(Array.isArray(list) ? list : []))
      .catch(() => {})
  }, [isDoctor])

  useEffect(() => {
    if (!isDoctor) return
    const sync = () => {
      setActive(getActiveConsultation())
      refreshDrafts()
    }
    sync()
    window.addEventListener(ACTIVE_CONSULTATION_UPDATED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(ACTIVE_CONSULTATION_UPDATED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [isDoctor, refreshDrafts])

  return { active: isDoctor ? active : null, drafts, refreshDrafts }
}
