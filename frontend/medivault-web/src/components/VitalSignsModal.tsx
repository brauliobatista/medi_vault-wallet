import { useEffect, useState } from 'react'
import Modal from './Modal'
import { getVitalSigns, addVitalSign, updateVitalSign, deleteVitalSign } from '../api/medical'

interface Props { userId: string; onClose: () => void }

interface VitalSign {
  id: number
  recordedAt: string
  bloodPressureSystolic: number | null
  bloodPressureDiastolic: number | null
  heartRate: number | null
  respiratoryRate: number | null
  temperature: number | null
  spo2: number | null
  weight: number | null
  height: number | null
  notes: string | null
}

const emptyForm = {
  recordedAt: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', heartRate: '',
  respiratoryRate: '', temperature: '', spo2: '', weight: '', height: '', notes: '',
}

function toDateTimeLocal(dt: string) {
  return dt.length >= 16 ? dt.slice(0, 16).replace(' ', 'T') : dt
}
function num(v: string) {
  return v.trim() === '' ? null : Number(v)
}

export default function VitalSignsModal({ userId, onClose }: Props) {
  const [vitals, setVitals] = useState<VitalSign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => { setLoading(true); getVitalSigns(userId).then(setVitals).finally(() => setLoading(false)) }
  useEffect(load, [userId])

  const startCreate = () => {
    setEditingId(null)
    const now = new Date()
    setForm({ ...emptyForm, recordedAt: now.toISOString().slice(0, 16) })
    setShowForm(true)
  }

  const startEdit = (v: VitalSign) => {
    setEditingId(v.id)
    setForm({
      recordedAt: toDateTimeLocal(v.recordedAt),
      bloodPressureSystolic: v.bloodPressureSystolic?.toString() ?? '',
      bloodPressureDiastolic: v.bloodPressureDiastolic?.toString() ?? '',
      heartRate: v.heartRate?.toString() ?? '',
      respiratoryRate: v.respiratoryRate?.toString() ?? '',
      temperature: v.temperature?.toString() ?? '',
      spo2: v.spo2?.toString() ?? '',
      weight: v.weight?.toString() ?? '',
      height: v.height?.toString() ?? '',
      notes: v.notes ?? '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.recordedAt) return
    const payload = {
      recordedAt: form.recordedAt.replace('T', ' ') + ':00',
      bloodPressureSystolic: num(form.bloodPressureSystolic),
      bloodPressureDiastolic: num(form.bloodPressureDiastolic),
      heartRate: num(form.heartRate),
      respiratoryRate: num(form.respiratoryRate),
      temperature: num(form.temperature),
      spo2: num(form.spo2),
      weight: num(form.weight),
      height: num(form.height),
      notes: form.notes.trim() || null,
    }
    if (editingId) await updateVitalSign(userId, editingId, payload)
    else await addVitalSign(userId, payload)
    setShowForm(false)
    setEditingId(null)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este registo de sinais vitais?')) return
    await deleteVitalSign(userId, id)
    load()
  }

  const bmi = (w?: number | null, h?: number | null) => (w && h ? (w / ((h / 100) ** 2)).toFixed(1) : '—')

  return (
    <Modal title="Sinais Vitais" onClose={onClose}>
      <div className="mv-modal-toolbar">
        <button className="consult-finish-btn" onClick={startCreate}><i className="bi bi-plus-lg" /> Novo registo</button>
      </div>

      {showForm && (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">Data/hora</label><input type="datetime-local" className="form-control form-control-sm" value={form.recordedAt} onChange={(e) => setForm({ ...form, recordedAt: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">TA sistólica</label><input type="number" className="form-control form-control-sm" value={form.bloodPressureSystolic} onChange={(e) => setForm({ ...form, bloodPressureSystolic: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">TA diastólica</label><input type="number" className="form-control form-control-sm" value={form.bloodPressureDiastolic} onChange={(e) => setForm({ ...form, bloodPressureDiastolic: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">FC (bpm)</label><input type="number" className="form-control form-control-sm" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">FR (irpm)</label><input type="number" className="form-control form-control-sm" value={form.respiratoryRate} onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Temp. (°C)</label><input type="number" step="0.1" className="form-control form-control-sm" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">SpO2 (%)</label><input type="number" className="form-control form-control-sm" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Peso (kg)</label><input type="number" step="0.1" className="form-control form-control-sm" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Altura (cm)</label><input type="number" step="0.1" className="form-control form-control-sm" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Notas</label><input className="form-control form-control-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleSave}><i className="bi bi-check-lg" /> Guardar</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">A carregar…</p>
      ) : vitals.length === 0 ? (
        <p className="mv-empty-state">Sem registos de sinais vitais.</p>
      ) : (
        <table className="mv-modal-table">
          <thead><tr><th>Data</th><th>TA</th><th>FC</th><th>FR</th><th>Temp.</th><th>SpO2</th><th>Peso</th><th>Altura</th><th>IMC</th><th></th></tr></thead>
          <tbody>
            {vitals.map((v) => (
              <tr key={v.id}>
                <td>{v.recordedAt}</td>
                <td>{v.bloodPressureSystolic && v.bloodPressureDiastolic ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : '—'}</td>
                <td>{v.heartRate ?? '—'}</td>
                <td>{v.respiratoryRate ?? '—'}</td>
                <td>{v.temperature ?? '—'}</td>
                <td>{v.spo2 ?? '—'}</td>
                <td>{v.weight ?? '—'}</td>
                <td>{v.height ?? '—'}</td>
                <td>{bmi(v.weight, v.height)}</td>
                <td>
                  <div className="mv-modal-row-actions">
                    <button className="mv-icon-btn" onClick={() => startEdit(v)}><i className="bi bi-pencil" /></button>
                    <button className="mv-icon-btn danger" onClick={() => handleDelete(v.id)}><i className="bi bi-trash" /></button>
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
