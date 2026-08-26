export interface AccessRequest {
  id: number
  userId?: string
  doctorName?: string
  patientName?: string
  patientPublicId?: string
  utentNumber?: string
  status: string
  isEmergency?: boolean
  requestedAt: string
  approvedAt?: string | null
  expiresAt?: string | null
}
