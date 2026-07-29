import { useEffect, useState } from 'react'
import Modal from './Modal'
import api from '../api/client'
import {
  getAllAppointments,
  getAppointmentTypes,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  type PatientAppointment,
  type RefType,
} from '../api/agenda'

interface Props { onClose: () => void; initialDate?: string }

const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'em_curso', label: 'Em curso' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
]

interface FormState {
  utentNumber: string
  userId: string
  patientName: string
  appointmentTypeCode: string
  modality: string
  scheduledAt: string
  status: string
  notes: string
}

const emptyForm: FormState = {
  utentNumber: '', userId: '', patientName: '', appointmentTypeCode: '',
  modality: 'presencial', scheduledAt: '', status: 'confirmada', notes: '',
}

function toDateTimeLocal(scheduledAt: string) {
  return scheduledAt.replace(' ', 'T').slice(0, 16)
}
function toApiDateTime(local: string) {
  return local.replace('T', ' ') + ':00'
}

export default function AppointmentsModal({ onClose, initialDate }: Props) {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [types, setTypes] = useState<RefType[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [patientSearchStatus, setPatientSearchStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([getAllAppointments(), getAppointmentTypes()])
      .then(([a, t]) => {
        setAppointments(a)
        setTypes(t)
        if (initialDate) {
          setForm({ ...emptyForm, appointmentTypeCode: t[0]?.code ?? '', scheduledAt: `${initialDate}T09:00` })
          setShowForm(true)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, appointmentTypeCode: types[0]?.code ?? '' })
    setError(null)
    setPatientSearchStatus(null)
    setShowForm(true)
  }

  const startEdit = (a: PatientAppointment) => {
    setEditingId(a.id)
    setForm({
      utentNumber: '', userId: '', patientName: a.patientName,
      appointmentTypeCode: types.find((t) => t.description === a.appointmentTypeDescription)?.code ?? types[0]?.code ?? '',
      modality: a.modality, scheduledAt: toDateTimeLocal(a.scheduledAt), status: a.status, notes: '',
    })
    setError(null)
    setPatientSearchStatus(null)
    setShowForm(true)
  }

  const handlePatientSearch = async () => {
    if (!form.utentNumber.trim()) return
    setPatientSearchStatus(null)
    try {
      const r = await api.get(`/access-requests/search?utentNumber=${form.utentNumber}`)
      setForm((f) => ({ ...f, userId: r.data.userId, patientName: r.data.name }))
    } catch {
      setPatientSearchStatus('Utente não encontrado.')
    }
  }

  const handleSave = async () => {
    if (!editingId && !form.userId) {
      setError('Pesquise e selecione um utente.')
      return
    }
    if (!form.appointmentTypeCode || !form.scheduledAt) {
      setError('Preencha o tipo e a data/hora.')
      return
    }
    setError(null)
    const payload = {
      userId: form.userId, appointmentTypeCode: form.appointmentTypeCode, modality: form.modality,
      scheduledAt: toApiDateTime(form.scheduledAt), status: form.status, notes: form.notes.trim() || null,
    }
    try {
      if (editingId) await updateAppointment(editingId, payload)
      else await createAppointment(payload)
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Não foi possível guardar a consulta.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover esta consulta da agenda?')) return
    await deleteAppointment(id)
    load()
  }

  return (
    <Modal title="Agenda Diária" onClose={onClose}>
      <div className="mv-modal-toolbar">
        <button className="consult-finish-btn" onClick={startCreate}>
          <i className="bi bi-plus-lg" /> Adicionar consulta
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

          {!editingId && (
            <div className="mb-3">
              <label className="mv-modal-form-label">Utente</label>
              {form.userId ? (
                <div className="consult-context-item context-plain">
                  <i className="bi bi-person-circle" />
                  <div className="consult-context-value">{form.patientName}</div>
                  <button className="mv-icon-btn ms-auto" onClick={() => setForm({ ...form, userId: '', patientName: '' })}><i className="bi bi-x" /></button>
                </div>
              ) : (
                <div className="input-group input-group-sm">
                  <input
                    className="form-control"
                    placeholder="Número de utente (ex: 100000001)"
                    value={form.utentNumber}
                    onChange={(e) => setForm({ ...form, utentNumber: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handlePatientSearch()}
                  />
                  <button className="dash-toolbar-btn" onClick={handlePatientSearch}><i className="bi bi-search" /></button>
                </div>
              )}
              {patientSearchStatus && <div className="consult-context-sub mt-1">{patientSearchStatus}</div>}
            </div>
          )}

          <div className="mv-modal-form-grid">
            <div>
              <label className="mv-modal-form-label">Tipo</label>
              <select className="form-select form-select-sm" value={form.appointmentTypeCode} onChange={(e) => setForm({ ...form, appointmentTypeCode: e.target.value })}>
                {types.map((t) => <option key={t.code} value={t.code}>{t.description}</option>)}
              </select>
            </div>
            <div>
              <label className="mv-modal-form-label">Modalidade</label>
              <select className="form-select form-select-sm" value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })}>
                <option value="presencial">Presencial</option>
                <option value="teleconsulta">Teleconsulta</option>
              </select>
            </div>
            <div>
              <label className="mv-modal-form-label">Data e hora</label>
              <input type="datetime-local" className="form-control form-control-sm" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            </div>
            <div>
              <label className="mv-modal-form-label">Estado</label>
              <select className="form-select form-select-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
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
      ) : appointments.length === 0 ? (
        <p className="mv-empty-state">Sem consultas na agenda.</p>
      ) : (
        <table className="mv-modal-table">
          <thead>
            <tr>
              <th>Data/Hora</th><th>Paciente</th><th>Tipo</th><th>Modalidade</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id}>
                <td>{a.scheduledAt}</td>
                <td>{a.patientName}</td>
                <td>{a.appointmentTypeDescription}</td>
                <td>{a.modality === 'teleconsulta' ? 'Teleconsulta' : 'Presencial'}</td>
                <td>{statusOptions.find((s) => s.value === a.status)?.label ?? a.status}</td>
                <td>
                  <div className="mv-modal-row-actions">
                    <button className="mv-icon-btn" onClick={() => startEdit(a)} aria-label="Editar"><i className="bi bi-pencil" /></button>
                    <button className="mv-icon-btn danger" onClick={() => handleDelete(a.id)} aria-label="Eliminar"><i className="bi bi-trash" /></button>
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
