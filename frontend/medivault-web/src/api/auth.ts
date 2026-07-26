import api from './client'

export interface LoginResponse {
  token: string
  role: 'Patient' | 'Doctor'
  id: number
  name: string
}

export const patientLogin = (utentNumber: string, password: string) =>
  api.post<LoginResponse>('/auth/patient/login', { utentNumber, password }).then((r) => r.data)

export const doctorLogin = (ordemMedicosId: string, password: string) =>
  api.post<LoginResponse>('/auth/doctor/login', { ordemMedicosId, password }).then((r) => r.data)
