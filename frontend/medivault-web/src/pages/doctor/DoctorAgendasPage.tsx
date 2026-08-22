import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import ScheduleEventsModal from '../../components/ScheduleEventsModal'
import AppointmentsModal from '../../components/AppointmentsModal'
import ContactsModal from '../../components/ContactsModal'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  getAllAppointments,
  getScheduleEvents,
  type PatientAppointment,
  type ScheduleEvent,
} from '../../api/agenda'

type OpenModal = 'schedule' | 'appointments' | 'contacts' | null
type AgendaView = 'diaria' | 'programada'
type TFunc = (key: string, vars?: Record<string, string | number>) => string

function formatDatePt(iso: string, t: TFunc) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${t(`common.month${m}`)} ${y}`
}

function formatDateRange(startIso: string, endIso: string, t: TFunc) {
  if (startIso === endIso) return formatDatePt(startIso, t)
  const [sy, sm, sd] = startIso.split('-').map(Number)
  const [ey, em, ed] = endIso.split('-').map(Number)
  if (sy === ey && sm === em) return `${String(sd).padStart(2, '0')} – ${String(ed).padStart(2, '0')} ${t(`common.month${em}`)} ${ey}`
  if (sy === ey) return `${String(sd).padStart(2, '0')} ${t(`common.month${sm}`)} – ${String(ed).padStart(2, '0')} ${t(`common.month${em}`)} ${ey}`
  return `${formatDatePt(startIso, t)} – ${formatDatePt(endIso, t)}`
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

function eventBadgeMeta(code: string, t: TFunc): { label: string; badgeClass: string; icon: string } {
  switch (code) {
    case 'CONGRESS': return { label: t('agendas.eventCongress'), badgeClass: 'badge-congresso', icon: 'bi-calendar-event' }
    case 'VACATION': return { label: t('agendas.eventVacation'), badgeClass: 'badge-ferias', icon: 'bi-suitcase' }
    default: return { label: t('agendas.eventTraining'), badgeClass: 'badge-confirmada', icon: 'bi-mortarboard' }
  }
}

function statusBadgeMeta(status: string, t: TFunc): { label: string; badgeClass: string } {
  switch (status) {
    case 'em_curso': return { label: t('agendas.statusInProgress'), badgeClass: 'badge-em-curso' }
    case 'pendente': return { label: t('agendas.statusPending'), badgeClass: 'badge-ferias' }
    case 'concluida': return { label: t('agendas.statusCompleted'), badgeClass: 'badge-em-curso' }
    case 'cancelada': return { label: t('agendas.statusCancelled'), badgeClass: 'badge-congresso' }
    default: return { label: t('agendas.statusConfirmed'), badgeClass: 'badge-confirmada' }
  }
}

export default function DoctorAgendasPage() {
  const { t } = useTranslation()
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([])
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'CONGRESS' | 'VACATION'>('all')
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [openModal, setOpenModal] = useState<OpenModal>(null)
  const [modalDate, setModalDate] = useState<string | undefined>(undefined)
  const [modalEventId, setModalEventId] = useState<number | undefined>(undefined)
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
    setModalEventId(undefined)
    setModalAppointmentId(undefined)
    loadAgenda()
  }

  const openAdd = (view: AgendaView, date: string) => {
    setModalDate(date)
    setModalEventId(undefined)
    setModalAppointmentId(undefined)
    setOpenModal(view === 'diaria' ? 'appointments' : 'schedule')
  }

  const openEventDetails = (eventId: number) => {
    setModalEventId(eventId)
    setOpenModal('schedule')
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
            <span className="dash-card-title">{t('agendas.title')}</span>
          </div>
          <button
            className="dash-card-footer"
            onClick={() => { setModalEventId(undefined); setModalAppointmentId(undefined); setOpenModal(agendaView === 'diaria' ? 'appointments' : 'schedule') }}
          >
            {t('agendas.manageFullAgenda')} <i className="bi bi-arrow-right" />
          </button>
        </div>

        <div className="agenda-toggle">
          <button className={`agenda-toggle-btn${agendaView === 'diaria' ? ' active' : ''}`} onClick={() => setAgendaView('diaria')}>
            <i className="bi bi-calendar-event" /> {t('agendas.dailyAgenda')}
          </button>
          <button className={`agenda-toggle-btn${agendaView === 'programada' ? ' active' : ''}`} onClick={() => setAgendaView('programada')}>
            <i className="bi bi-calendar-range" /> {t('agendas.scheduledAgenda')}
          </button>
        </div>

        {agendaView === 'programada' && (
          <div className="dash-filter-row">
            <button className={`dash-pill${scheduleFilter === 'all' ? ' active' : ''}`} onClick={() => setScheduleFilter('all')}>{t('agendas.filterAll')}</button>
            <button className={`dash-pill${scheduleFilter === 'CONGRESS' ? ' active' : ''}`} onClick={() => setScheduleFilter('CONGRESS')}>{t('agendas.filterCongresses')}</button>
            <button className={`dash-pill${scheduleFilter === 'VACATION' ? ' active' : ''}`} onClick={() => setScheduleFilter('VACATION')}>{t('agendas.filterVacations')}</button>
          </div>
        )}

        <div className="dash-date-nav">
          <span className="dash-date-label">{formatDateRange(weekDates[0], weekDates[6], t)}</span>
          <div className="dash-date-nav-controls">
            <button className="dash-date-nav-btn" aria-label={t('agendas.previousWeek')} onClick={() => setWeekStart((d) => addDays(d, -7))}>
              <i className="bi bi-chevron-left" />
            </button>
            <button className="dash-today-btn" onClick={() => setWeekStart(mondayOf(today))}>{t('agendas.today')}</button>
            <button className="dash-date-nav-btn" aria-label={t('agendas.nextWeek')} onClick={() => setWeekStart((d) => addDays(d, 7))}>
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
                  <div className="agenda-week-col-weekday">{t(`common.weekday${idx + 1}`)}</div>
                  <div className="agenda-week-col-daynum">{dayNum}</div>
                </div>
                <div className="agenda-week-col-body">
                  {agendaView === 'diaria' ? (
                    dayAppointments(dayIso).length === 0 ? (
                      <p className="agenda-week-empty">{t('agendas.noAppointments')}</p>
                    ) : (
                      dayAppointments(dayIso).map((appt) => {
                        const meta = statusBadgeMeta(appt.status, t)
                        const modalityLabel = appt.modality === 'teleconsulta' ? t('agendas.modalityTeleconsultation') : t('agendas.modalityInPerson')
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
                    <p className="agenda-week-empty">{t('agendas.noEvents')}</p>
                  ) : (
                    dayEvents(dayIso).map((ev) => {
                      const meta = eventBadgeMeta(ev.eventTypeCode, t)
                      return (
                        <button className="agenda-week-chip" key={ev.id} onClick={() => openEventDetails(ev.id)}>
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

      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-heading">
            <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-telephone" /></span>
            <span className="dash-card-title">{t('agendas.extensionContactsTitle')}</span>
          </div>
        </div>
        <p className="dash-card-subtitle">{t('agendas.extensionContactsSubtitle')}</p>
        <button className="dash-card-footer" onClick={() => setOpenModal('contacts')}>
          {t('agendas.viewAllContacts')} <i className="bi bi-arrow-right" />
        </button>
      </div>

      {openModal === 'schedule' && (
        <ScheduleEventsModal onClose={closeModal} initialDate={modalDate} initialEventId={modalEventId} />
      )}
      {openModal === 'appointments' && (
        <AppointmentsModal onClose={closeModal} initialDate={modalDate} initialAppointmentId={modalAppointmentId} />
      )}
      {openModal === 'contacts' && <ContactsModal onClose={closeModal} />}
    </Layout>
  )
}
