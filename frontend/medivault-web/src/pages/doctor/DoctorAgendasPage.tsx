import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import ScheduleEventsModal from '../../components/ScheduleEventsModal'
import AppointmentsModal from '../../components/AppointmentsModal'
import {
  getAllAppointments,
  getScheduleEvents,
  type PatientAppointment,
  type ScheduleEvent,
} from '../../api/agenda'

type OpenModal = 'schedule' | 'appointments' | null
type AgendaView = 'diaria' | 'programada'

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const WEEKDAY_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function formatDatePt(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${MONTHS_PT[m - 1]} ${y}`
}

function formatDateRange(startIso: string, endIso: string) {
  if (startIso === endIso) return formatDatePt(startIso)
  const [sy, sm, sd] = startIso.split('-').map(Number)
  const [ey, em, ed] = endIso.split('-').map(Number)
  if (sy === ey && sm === em) return `${String(sd).padStart(2, '0')} – ${String(ed).padStart(2, '0')} ${MONTHS_PT[em - 1]} ${ey}`
  if (sy === ey) return `${String(sd).padStart(2, '0')} ${MONTHS_PT[sm - 1]} – ${String(ed).padStart(2, '0')} ${MONTHS_PT[em - 1]} ${ey}`
  return `${formatDatePt(startIso)} – ${formatDatePt(endIso)}`
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Monday of the week containing the given date (weeks start on Monday).
function mondayOf(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const day = dt.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setUTCDate(dt.getUTCDate() + diff)
  return dt.toISOString().slice(0, 10)
}

const eventBadge: Record<string, { label: string; badgeClass: string; icon: string }> = {
  CONGRESS: { label: 'Congresso', badgeClass: 'badge-congresso', icon: 'bi-calendar-event' },
  VACATION: { label: 'Férias', badgeClass: 'badge-ferias', icon: 'bi-suitcase' },
  TRAINING: { label: 'Formação', badgeClass: 'badge-confirmada', icon: 'bi-mortarboard' },
}

const statusBadge: Record<string, { label: string; badgeClass: string }> = {
  em_curso: { label: 'Em curso', badgeClass: 'badge-em-curso' },
  confirmada: { label: 'Confirmada', badgeClass: 'badge-confirmada' },
  pendente: { label: 'Pendente', badgeClass: 'badge-ferias' },
  concluida: { label: 'Concluída', badgeClass: 'badge-em-curso' },
  cancelada: { label: 'Cancelada', badgeClass: 'badge-congresso' },
}

export default function DoctorAgendasPage() {
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([])
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'CONGRESS' | 'VACATION'>('all')
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [openModal, setOpenModal] = useState<OpenModal>(null)
  const [modalDate, setModalDate] = useState<string | undefined>(undefined)
  const [modalAppointmentId, setModalAppointmentId] = useState<number | undefined>(undefined)

  const [agendaView, setAgendaView] = useState<AgendaView>('diaria')
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayIso()))

  const loadAgenda = () => {
    getScheduleEvents().then(setScheduleEvents).catch(() => setScheduleEvents([]))
    getAllAppointments().then(setAppointments).catch(() => setAppointments([]))
  }

  useEffect(loadAgenda, [])

  const closeModal = () => {
    setOpenModal(null)
    setModalDate(undefined)
    setModalAppointmentId(undefined)
    loadAgenda()
  }

  const openAdd = (view: AgendaView, date: string) => {
    setModalDate(date)
    setModalAppointmentId(undefined)
    setOpenModal(view === 'diaria' ? 'appointments' : 'schedule')
  }

  const openAppointmentDetails = (appointmentId: number) => {
    setModalAppointmentId(appointmentId)
    setOpenModal('appointments')
  }

  const visibleEvents =
    scheduleFilter === 'all' ? scheduleEvents : scheduleEvents.filter((e) => e.eventTypeCode === scheduleFilter)

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = todayIso()

  const dayAppointments = (dayIso: string) =>
    appointments.filter((a) => a.scheduledAt.slice(0, 10) === dayIso).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))

  const dayEvents = (dayIso: string) =>
    visibleEvents.filter((e) => e.startDate <= dayIso && e.endDate >= dayIso)

  return (
    <Layout>
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-heading">
            <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-calendar-week" /></span>
            <span className="dash-card-title">Agenda</span>
          </div>
          <button
            className="dash-card-footer"
            onClick={() => { setModalAppointmentId(undefined); setOpenModal(agendaView === 'diaria' ? 'appointments' : 'schedule') }}
          >
            Gerir agenda completa <i className="bi bi-arrow-right" />
          </button>
        </div>

        <div className="agenda-toggle">
          <button className={`agenda-toggle-btn${agendaView === 'diaria' ? ' active' : ''}`} onClick={() => setAgendaView('diaria')}>
            <i className="bi bi-calendar-event" /> Agenda Diária
          </button>
          <button className={`agenda-toggle-btn${agendaView === 'programada' ? ' active' : ''}`} onClick={() => setAgendaView('programada')}>
            <i className="bi bi-calendar-range" /> Agenda Médica Programada
          </button>
        </div>

        {agendaView === 'programada' && (
          <div className="dash-filter-row">
            <button className={`dash-pill${scheduleFilter === 'all' ? ' active' : ''}`} onClick={() => setScheduleFilter('all')}>Todos</button>
            <button className={`dash-pill${scheduleFilter === 'CONGRESS' ? ' active' : ''}`} onClick={() => setScheduleFilter('CONGRESS')}>Congressos</button>
            <button className={`dash-pill${scheduleFilter === 'VACATION' ? ' active' : ''}`} onClick={() => setScheduleFilter('VACATION')}>Férias</button>
          </div>
        )}

        <div className="dash-date-nav">
          <span className="dash-date-label">{formatDateRange(weekDates[0], weekDates[6])}</span>
          <div className="dash-date-nav-controls">
            <button className="dash-date-nav-btn" aria-label="Semana anterior" onClick={() => setWeekStart((d) => addDays(d, -7))}>
              <i className="bi bi-chevron-left" />
            </button>
            <button className="dash-today-btn" onClick={() => setWeekStart(mondayOf(today))}>Hoje</button>
            <button className="dash-date-nav-btn" aria-label="Semana seguinte" onClick={() => setWeekStart((d) => addDays(d, 7))}>
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>

        <div className="agenda-week-grid">
          {weekDates.map((dayIso, idx) => {
            const isToday = dayIso === today
            const dayNum = Number(dayIso.slice(8, 10))
            return (
              <div className={`agenda-week-col${isToday ? ' is-today' : ''}`} key={dayIso}>
                <div className="agenda-week-col-header">
                  <div className="agenda-week-col-weekday">{WEEKDAY_LABELS[idx].slice(0, 3)}</div>
                  <div className="agenda-week-col-daynum">{dayNum}</div>
                </div>
                <div className="agenda-week-col-body">
                  {agendaView === 'diaria' ? (
                    dayAppointments(dayIso).length === 0 ? (
                      <p className="agenda-week-empty">Sem consultas</p>
                    ) : (
                      dayAppointments(dayIso).map((appt) => {
                        const meta = statusBadge[appt.status] ?? statusBadge.confirmada
                        const modalityLabel = appt.modality === 'teleconsulta' ? 'Teleconsulta' : 'Presencial'
                        return (
                          <button className="agenda-week-chip" key={appt.id} onClick={() => openAppointmentDetails(appt.id)}>
                            <div className="agenda-week-chip-time">{appt.scheduledAt.slice(11, 16)}</div>
                            <div className="agenda-week-chip-title">{appt.patientName}</div>
                            <div className="agenda-week-chip-sub">{appt.appointmentTypeDescription} · {modalityLabel}</div>
                            <span className={`status-badge ${meta.badgeClass}`}>{meta.label}</span>
                          </button>
                        )
                      })
                    )
                  ) : dayEvents(dayIso).length === 0 ? (
                    <p className="agenda-week-empty">Sem eventos</p>
                  ) : (
                    dayEvents(dayIso).map((ev) => {
                      const meta = eventBadge[ev.eventTypeCode] ?? eventBadge.TRAINING
                      return (
                        <button className="agenda-week-chip" key={ev.id} onClick={() => setOpenModal('schedule')}>
                          <div className="agenda-week-chip-title"><i className={`bi ${meta.icon} me-1`} />{ev.title}</div>
                          {ev.location && <div className="agenda-week-chip-sub">{ev.location}</div>}
                          <span className={`status-badge ${meta.badgeClass}`}>{meta.label}</span>
                        </button>
                      )
                    })
                  )}
                </div>
                <button className="agenda-week-col-add" onClick={() => openAdd(agendaView, dayIso)}>
                  <i className="bi bi-plus-lg" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {openModal === 'schedule' && <ScheduleEventsModal onClose={closeModal} initialDate={modalDate} />}
      {openModal === 'appointments' && (
        <AppointmentsModal onClose={closeModal} initialDate={modalDate} initialAppointmentId={modalAppointmentId} />
      )}
    </Layout>
  )
}
