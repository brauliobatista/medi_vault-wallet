import { useEffect, useState } from 'react'
import Modal from './Modal'
import {
  getScheduleEvents,
  getScheduleEventTypes,
  createScheduleEvent,
  updateScheduleEvent,
  deleteScheduleEvent,
  type ScheduleEvent,
  type RefType,
} from '../api/agenda'

interface Props { onClose: () => void }

interface FormState {
  eventTypeCode: string
  title: string
  location: string
  startDate: string
  endDate: string
  notes: string
}

const emptyForm: FormState = { eventTypeCode: '', title: '', location: '', startDate: '', endDate: '', notes: '' }

export default function ScheduleEventsModal({ onClose }: Props) {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [types, setTypes] = useState<RefType[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([getScheduleEvents(), getScheduleEventTypes()])
      .then(([ev, ty]) => { setEvents(ev); setTypes(ty) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, eventTypeCode: types[0]?.code ?? '' })
    setError(null)
    setShowForm(true)
  }

  const startEdit = (ev: ScheduleEvent) => {
    setEditingId(ev.id)
    setForm({
      eventTypeCode: ev.eventTypeCode, title: ev.title, location: ev.location ?? '',
      startDate: ev.startDate, endDate: ev.endDate, notes: ev.notes ?? '',
    })
    setError(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.eventTypeCode || !form.startDate || !form.endDate) {
      setError('Preencha o tipo, título e as datas.')
      return
    }
    setError(null)
    const payload = {
      eventTypeCode: form.eventTypeCode, title: form.title,
      location: form.location.trim() || null, startDate: form.startDate, endDate: form.endDate,
      notes: form.notes.trim() || null,
    }
    try {
      if (editingId) await updateScheduleEvent(editingId, payload)
      else await createScheduleEvent(payload)
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Não foi possível guardar o evento.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este evento da agenda?')) return
    await deleteScheduleEvent(id)
    load()
  }

  return (
    <Modal title="Agenda Médica Programada" onClose={onClose}>
      <div className="mv-modal-toolbar">
        <button className="consult-finish-btn" onClick={startCreate}>
          <i className="bi bi-plus-lg" /> Adicionar evento
        </button>
      </div>

      {showForm && (
        <div className="mv-modal-form">
          {error && (
            <div className="consult-context-item context-danger mb-3">
              <i className="bi bi-exclamation-triangle-fill" />
              <div className="consult-context-value">{error}</div>
            </div>
          )}
          <div className="mv-modal-form-grid">
            <div>
              <label className="mv-modal-form-label">Tipo</label>
              <select className="form-select form-select-sm" value={form.eventTypeCode} onChange={(e) => setForm({ ...form, eventTypeCode: e.target.value })}>
                {types.map((t) => <option key={t.code} value={t.code}>{t.description}</option>)}
              </select>
            </div>
            <div>
              <label className="mv-modal-form-label">Título</label>
              <input className="form-control form-control-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="mv-modal-form-label">Local</label>
              <input className="form-control form-control-sm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="mv-modal-form-label">Data início</label>
              <input type="date" className="form-control form-control-sm" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="mv-modal-form-label">Data fim</label>
              <input type="date" className="form-control form-control-sm" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div>
              <label className="mv-modal-form-label">Notas</label>
              <input className="form-control form-control-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleSave}><i className="bi bi-check-lg" /> Guardar</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">A carregar…</p>
      ) : events.length === 0 ? (
        <p className="mv-empty-state">Sem eventos na agenda.</p>
      ) : (
        <table className="mv-modal-table">
          <thead>
            <tr>
              <th>Tipo</th><th>Título</th><th>Local</th><th>Datas</th><th>Notas</th><th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.eventTypeDescription}</td>
                <td>{ev.title}</td>
                <td>{ev.location ?? '—'}</td>
                <td>{ev.startDate} – {ev.endDate}</td>
                <td>{ev.notes ?? '—'}</td>
                <td>
                  <div className="mv-modal-row-actions">
                    <button className="mv-icon-btn" onClick={() => startEdit(ev)} aria-label="Editar"><i className="bi bi-pencil" /></button>
                    <button className="mv-icon-btn danger" onClick={() => handleDelete(ev.id)} aria-label="Eliminar"><i className="bi bi-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}
