import api from './client'

export interface ScheduleEvent {
  id: number
  eventTypeCode: string
  eventTypeDescription: string
  title: string
  location: string | null
  startDate: string
  endDate: string
  notes: string | null
}

export interface PatientAppointment {
  id: number
  patientName: string
  appointmentTypeDescription: string
  modality: string
  scheduledAt: string
  status: string
}

export interface InstitutionContact {
  id: number
  serviceName: string
  extension: string
}

export interface RefType { id: number; code: string; description: string }

export interface CreateScheduleEventInput {
  eventTypeCode: string
  title: string
  location: string | null
  startDate: string
  endDate: string
  notes: string | null
}

export interface CreateAppointmentInput {
  userId: string
  appointmentTypeCode: string
  modality: string
  scheduledAt: string
  status: string
  notes: string | null
}

export const getScheduleEvents = (type?: string) =>
  api
    .get<ScheduleEvent[]>('/doctors/me/schedule-events', { params: type ? { type } : {} })
    .then((r) => r.data)

export const createScheduleEvent = (data: CreateScheduleEventInput) =>
  api.post<ScheduleEvent>('/doctors/me/schedule-events', data).then((r) => r.data)
export const updateScheduleEvent = (id: number, data: CreateScheduleEventInput) =>
  api.put(`/doctors/me/schedule-events/${id}`, data)
export const deleteScheduleEvent = (id: number) =>
  api.delete(`/doctors/me/schedule-events/${id}`)

export const getScheduleEventTypes = () =>
  api.get<RefType[]>('/doctors/me/schedule-event-types').then((r) => r.data)

export const getDailyAppointments = (date: string) =>
  api.get<PatientAppointment[]>('/doctors/me/appointments', { params: { date } }).then((r) => r.data)

export const getAllAppointments = () =>
  api.get<PatientAppointment[]>('/doctors/me/appointments/all').then((r) => r.data)

export const createAppointment = (data: CreateAppointmentInput) =>
  api.post<PatientAppointment>('/doctors/me/appointments', data).then((r) => r.data)
export const updateAppointment = (id: number, data: CreateAppointmentInput) =>
  api.put(`/doctors/me/appointments/${id}`, data)
export const deleteAppointment = (id: number) =>
  api.delete(`/doctors/me/appointments/${id}`)

export const getAppointmentTypes = () =>
  api.get<RefType[]>('/doctors/me/appointment-types').then((r) => r.data)

export const getInstitutionContacts = () =>
  api.get<InstitutionContact[]>('/doctors/me/institution-contacts').then((r) => r.data)
