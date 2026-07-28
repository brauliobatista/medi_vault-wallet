import api from './client'

export const getProfile = () => api.get('/users/me').then((r) => r.data)
export const updateProfile = (data: object) => api.put('/users/me', data).then((r) => r.data)

export const getDoctorProfile = () => api.get('/doctors/me').then((r) => r.data)
export const updateDoctorProfile = (data: object) => api.put('/doctors/me', data).then((r) => r.data)
export const changeDoctorPassword = (data: object) => api.put('/doctors/me/password', data)

export const getAccessStatus = (userId: string) =>
  api.get(`/patients/${userId}/access-status`).then((r) => r.data as { hasAccess: boolean; reason: string })

export const getSurgeries = (userId: string) =>
  api.get(`/patients/${userId}/surgeries`).then((r) => r.data)
export const addSurgery = (userId: string, data: object) =>
  api.post(`/patients/${userId}/surgeries`, data).then((r) => r.data)
export const deleteSurgery = (userId: string, id: number) =>
  api.delete(`/patients/${userId}/surgeries/${id}`)

export const getMedications = (userId: string) =>
  api.get(`/patients/${userId}/medications`).then((r) => r.data)
export const addMedication = (userId: string, data: object) =>
  api.post(`/patients/${userId}/medications`, data).then((r) => r.data)
export const deleteMedication = (userId: string, id: number) =>
  api.delete(`/patients/${userId}/medications/${id}`)

export const getAllergies = (userId: string) =>
  api.get(`/patients/${userId}/allergies`).then((r) => r.data)
export const addAllergy = (userId: string, data: object) =>
  api.post(`/patients/${userId}/allergies`, data).then((r) => r.data)
export const deleteAllergy = (userId: string, id: number) =>
  api.delete(`/patients/${userId}/allergies/${id}`)

export const getFamilyHistory = (userId: string) =>
  api.get(`/patients/${userId}/family-history`).then((r) => r.data)
export const upsertFamilyHistory = (userId: string, data: object) =>
  api.post(`/patients/${userId}/family-history`, data).then((r) => r.data)

export const getHabits = (userId: string) =>
  api.get(`/patients/${userId}/habits`).then((r) => r.data)
export const upsertHabit = (userId: string, data: object) =>
  api.post(`/patients/${userId}/habits`, data).then((r) => r.data)

export const getAnalyticalExams = (userId: string) =>
  api.get(`/patients/${userId}/exams/analytical`).then((r) => r.data)
export const addAnalyticalExam = (userId: string, data: object) =>
  api.post(`/patients/${userId}/exams/analytical`, data).then((r) => r.data)

export const getImagingExams = (userId: string) =>
  api.get(`/patients/${userId}/exams/imaging`).then((r) => r.data)
export const addImagingExam = (userId: string, data: object) =>
  api.post(`/patients/${userId}/exams/imaging`, data).then((r) => r.data)

export const getOptometryExams = (userId: string) =>
  api.get(`/patients/${userId}/exams/optometry`).then((r) => r.data)
export const addOptometryExam = (userId: string, data: object) =>
  api.post(`/patients/${userId}/exams/optometry`, data).then((r) => r.data)

export const getVaccinations = (userId: string) =>
  api.get(`/patients/${userId}/vaccinations`).then((r) => r.data)
export const addVaccination = (userId: string, data: object) =>
  api.post(`/patients/${userId}/vaccinations`, data).then((r) => r.data)
export const deleteVaccination = (userId: string, id: number) =>
  api.delete(`/patients/${userId}/vaccinations/${id}`)

export const toggleCard = (active: boolean) => api.put('/users/me/card', { active })

export const getQrCode = () => api.get('/users/me/qr').then((r) => r.data as { payload: string })
export const scanQrCode = (qrCode: string) =>
  api.post('/access-requests/qr', { qrCode }).then((r) => r.data)

export const getAccessRequests = () => api.get('/access-requests').then((r) => r.data)
export const requestAccess = (userId: string) =>
  api.post(`/access-requests/${userId}`).then((r) => r.data)
export const respondToRequest = (requestId: number, action: 'approve' | 'revoke') =>
  api.put(`/access-requests/${requestId}/respond`, { action })
export const deleteRequest = (requestId: number) =>
  api.delete(`/access-requests/${requestId}`)

export const getDoctorNotes = (userId: string) =>
  api.get(`/doctor-notes/${userId}`).then((r) => r.data)
export const createDoctorNote = (data: object) =>
  api.post('/doctor-notes', data).then((r) => r.data)
export const updateDoctorNote = (noteId: number, noteText: string) =>
  api.put(`/doctor-notes/${noteId}`, JSON.stringify(noteText), {
    headers: { 'Content-Type': 'application/json' },
  })
export const deleteDoctorNote = (noteId: number) => api.delete(`/doctor-notes/${noteId}`)

export const getFlags = (userId: string) =>
  api.get(`/doctor-notes/flags/${userId}`).then((r) => r.data)
export const markFlagReviewed = (flagId: number) =>
  api.put(`/doctor-notes/flags/${flagId}/review`)

