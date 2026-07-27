import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import ScheduleEventsModal from '../../components/ScheduleEventsModal'
import AppointmentsModal from '../../components/AppointmentsModal'
import ContactsModal from '../../components/ContactsModal'
import {
  getDailyAppointments,
  getInstitutionContacts,
  getScheduleEvents,
  type InstitutionContact,
  type PatientAppointment,
  type ScheduleEvent,
} from '../../api/agenda'

type OpenModal = 'schedule' | 'appointments' | 'contacts' | null

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function formatDatePt(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${MONTHS_PT[m - 1]} ${y}`
}

function formatDateRange(startIso: string, endIso: string) {
  if (startIso === endIso) return formatDatePt(startIso)
  const [, sm, sd] = startIso.split('-').map(Number)
  const [ey, em, ed] = endIso.split('-').map(Number)
  if (sm === em) return `${String(sd).padStart(2, '0')} – ${String(ed).padStart(2, '0')} ${MONTHS_PT[em - 1]} ${ey}`
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

const eventBadge: Record<string, { label: string; badgeClass: string; iconClass: string; icon: string }> = {
  CONGRESS: { label: 'Congresso', badgeClass: 'badge-congresso', iconClass: 'icon-congresso', icon: 'bi-calendar-event' },
  VACATION: { label: 'Férias', badgeClass: 'badge-ferias', iconClass: 'icon-ferias', icon: 'bi-suitcase' },
  TRAINING: { label: 'Formação', badgeClass: 'badge-confirmada', iconClass: 'icon-congresso', icon: 'bi-mortarboard' },
}

const statusBadge: Record<string, { label: string; badgeClass: string }> = {
  em_curso: { label: 'Em curso', badgeClass: 'badge-em-curso' },
  confirmada: { label: 'Confirmada', badgeClass: 'badge-confirmada' },
  pendente: { label: 'Pendente', badgeClass: 'badge-ferias' },
  concluida: { label: 'Concluída', badgeClass: 'badge-em-curso' },
  cancelada: { label: 'Cancelada', badgeClass: 'badge-congresso' },
}

export default function DoctorDashboardPage() {
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([])
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'CONGRESS' | 'VACATION'>('all')

  const [selectedDate, setSelectedDate] = useState(() => todayIso())
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])

  const [contacts, setContacts] = useState<InstitutionContact[]>([])
  const [openModal, setOpenModal] = useState<OpenModal>(null)

  useEffect(() => {
    getScheduleEvents().then(setScheduleEvents).catch(() => setScheduleEvents([]))
    getInstitutionContacts().then(setContacts).catch(() => setContacts([]))
  }, [])

  useEffect(() => {
    getDailyAppointments(selectedDate).then(setAppointments).catch(() => setAppointments([]))
  }, [selectedDate])

  const visibleEvents =
    scheduleFilter === 'all' ? scheduleEvents : scheduleEvents.filter((e) => e.eventTypeCode === scheduleFilter)

  return (
    <Layout>
      <div className="dash-toolbar">
        <span className="dash-toolbar-link">
          <i className="bi bi-sliders" />
          Personalizar Dashboard
        </span>
        <button className="dash-toolbar-btn">
          <i className="bi bi-plus-lg" />
          Adicionar Módulo
        </button>
      </div>

      <div className="dash-grid">
        {/* Agenda Médica Programada */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-heading">
              <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-calendar-event" /></span>
              <span className="dash-card-title">Agenda Médica Programada</span>
            </div>
            <button className="dash-card-menu-btn" aria-label="Mais opções">
              <i className="bi bi-three-dots" />
            </button>
          </div>

          <div className="dash-select">
            <span>Próximos 30 dias</span>
            <i className="bi bi-chevron-down" />
          </div>

          <div className="dash-filter-row">
            <button className={`dash-pill${scheduleFilter === 'all' ? ' active' : ''}`} onClick={() => setScheduleFilter('all')}>Todos</button>
            <button className={`dash-pill${scheduleFilter === 'CONGRESS' ? ' active' : ''}`} onClick={() => setScheduleFilter('CONGRESS')}>Congressos</button>
            <button className={`dash-pill${scheduleFilter === 'VACATION' ? ' active' : ''}`} onClick={() => setScheduleFilter('VACATION')}>Férias</button>
          </div>

          <div className="dash-list">
            {visibleEvents.length === 0 && <p className="dash-item-sub mb-0">Sem eventos agendados.</p>}
            {visibleEvents.map((ev) => {
              const meta = eventBadge[ev.eventTypeCode] ?? eventBadge.TRAINING
              return (
                <div className="dash-item" key={ev.id}>
                  <span className={`dash-item-icon ${meta.iconClass}`}>
                    <i className={`bi ${meta.icon}`} />
                  </span>
                  <div className="dash-item-body">
                    <div className="dash-item-title">{ev.title}</div>
                    {ev.location && <div className="dash-item-sub">{ev.location}</div>}
                    <div className="dash-item-date">{formatDateRange(ev.startDate, ev.endDate)}</div>
                  </div>
                  <span className={`status-badge ${meta.badgeClass}`}>{meta.label}</span>
                </div>
              )
            })}
          </div>

          <button className="dash-card-footer" onClick={() => setOpenModal('schedule')}>
            Ver agenda completa <i className="bi bi-arrow-right" />
          </button>
        </div>

        {/* Agenda Diária */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-heading">
              <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-calendar-event" /></span>
              <span className="dash-card-title">Agenda Diária</span>
            </div>
            <button className="dash-card-menu-btn" aria-label="Mais opções">
              <i className="bi bi-three-dots" />
            </button>
          </div>

          <div className="dash-date-nav">
            <span className="dash-date-label">{formatDatePt(selectedDate)}</span>
            <div className="dash-date-nav-controls">
              <button className="dash-date-nav-btn" aria-label="Dia anterior" onClick={() => setSelectedDate((d) => addDays(d, -1))}>
                <i className="bi bi-chevron-left" />
              </button>
              <button className="dash-today-btn" onClick={() => setSelectedDate(todayIso())}>Hoje</button>
              <button className="dash-date-nav-btn" aria-label="Dia seguinte" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>

          <div className="dash-list">
            {appointments.length === 0 && <p className="dash-item-sub mb-0">Sem consultas agendadas para este dia.</p>}
            {appointments.map((appt) => {
              const time = appt.scheduledAt.slice(11, 16)
              const typeLabel = appt.modality === 'teleconsulta' ? 'Teleconsulta' : appt.appointmentTypeDescription
              const modalityLabel = appt.modality === 'teleconsulta' ? 'Teleconsulta' : 'Presencial'
              const meta = statusBadge[appt.status] ?? statusBadge.confirmada
              return (
                <div className="dash-time-slot" key={appt.id}>
                  <span className="dash-time">{time}</span>
                  <div className="dash-appt-body">
                    <div className="dash-appt-type">{typeLabel}</div>
                    <div className="dash-appt-name">{appt.patientName}</div>
                    <div className="dash-item-sub">Cardiologia • {modalityLabel}</div>
                  </div>
                  <span className={`status-badge ${meta.badgeClass}`}>{meta.label}</span>
                </div>
              )
            })}
          </div>

          <button className="dash-card-footer" onClick={() => setOpenModal('appointments')}>
            Ver toda a agenda <i className="bi bi-arrow-right" />
          </button>
        </div>

        {/* Contactos de Extensão */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-heading">
              <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-telephone" /></span>
              <span className="dash-card-title">Contactos de Extensão</span>
            </div>
            <button className="dash-card-menu-btn" aria-label="Mais opções">
              <i className="bi bi-three-dots" />
            </button>
          </div>

          <p className="dash-card-subtitle">Contactos rápidos da instituição</p>

          <div className="dash-list">
            {contacts.length === 0 && <p className="dash-item-sub mb-0">Sem contactos registados.</p>}
            {contacts.map((c) => (
              <div className="dash-contact-item" key={c.id}>
                <div>
                  <div className="dash-contact-name">{c.serviceName}</div>
                  <div className="dash-contact-phone">{c.extension}</div>
                </div>
                <a className="dash-phone-btn" href={`tel:${c.extension.replace(/\s/g, '')}`} aria-label={`Ligar para ${c.serviceName}`}>
                  <i className="bi bi-telephone-fill" />
                </a>
              </div>
            ))}
          </div>

          <button className="dash-card-footer" onClick={() => setOpenModal('contacts')}>
            Ver todos os contactos <i className="bi bi-arrow-right" />
          </button>
        </div>
      </div>

      {openModal === 'schedule' && <ScheduleEventsModal onClose={() => setOpenModal(null)} />}
      {openModal === 'appointments' && <AppointmentsModal onClose={() => setOpenModal(null)} />}
      {openModal === 'contacts' && <ContactsModal onClose={() => setOpenModal(null)} />}
    </Layout>
  )
}
