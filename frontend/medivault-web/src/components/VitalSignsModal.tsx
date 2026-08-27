import { useEffect, useState } from 'react'
import Modal from './Modal'
import { getVitalSigns, addVitalSign, updateVitalSign, deleteVitalSign } from '../api/medical'
import { useTranslation } from '../i18n/LanguageContext'

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
  const { t } = useTranslation()
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
    if (!confirm(t('vitalSignsModal.confirmDelete'))) return
    await deleteVitalSign(userId, id)
    load()
  }

  const bmi = (w?: number | null, h?: number | null) => (w && h ? (w / ((h / 100) ** 2)).toFixed(1) : t('common.na'))

  return (
    <Modal title={t('vitalSignsModal.title')} onClose={onClose}>
      <div className="mv-modal-toolbar">
        <button className="consult-finish-btn" onClick={startCreate}><i className="bi bi-plus-lg" /> {t('vitalSignsModal.newButton')}</button>
      </div>

      {showForm && (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">{t('vitalSignsModal.dateTimeLabel')}</label><input type="datetime-local" className="form-control form-control-sm" value={form.recordedAt} onChange={(e) => setForm({ ...form, recordedAt: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('vitalSignsModal.systolicLabel')}</label><input type="number" className="form-control form-control-sm" value={form.bloodPressureSystolic} onChange={(e) => setForm({ ...form, bloodPressureSystolic: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('vitalSignsModal.diastolicLabel')}</label><input type="number" className="form-control form-control-sm" value={form.bloodPressureDiastolic} onChange={(e) => setForm({ ...form, bloodPressureDiastolic: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('vitalSignsModal.heartRateLabel')}</label><input type="number" className="form-control form-control-sm" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('vitalSignsModal.respiratoryRateLabel')}</label><input type="number" className="form-control form-control-sm" value={form.respiratoryRate} onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('vitalSignsModal.temperatureLabel')}</label><input type="number" step="0.1" className="form-control form-control-sm" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('vitalSignsModal.spo2Label')}</label><input type="number" className="form-control form-control-sm" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('vitalSignsModal.weightLabel')}</label><input type="number" step="0.1" className="form-control form-control-sm" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('vitalSignsModal.heightLabel')}</label><input type="number" step="0.1" className="form-control form-control-sm" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('vitalSignsModal.notesLabel')}</label><input className="form-control form-control-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleSave}><i className="bi bi-check-lg" /> {t('common.save')}</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : vitals.length === 0 ? (
        <p className="mv-empty-state">{t('vitalSignsModal.emptyState')}</p>
      ) : (
        <table className="mv-modal-table">
          <thead><tr><th>{t('vitalSignsModal.dateColumnLabel')}</th><th>{t('vitalSignsModal.bpColumnLabel')}</th><th>{t('vitalSignsModal.hrColumnLabel')}</th><th>{t('vitalSignsModal.rrColumnLabel')}</th><th>{t('vitalSignsModal.tempColumnLabel')}</th><th>{t('vitalSignsModal.spo2ColumnLabel')}</th><th>{t('vitalSignsModal.weightColumnLabel')}</th><th>{t('vitalSignsModal.heightColumnLabel')}</th><th>{t('vitalSignsModal.bmiColumnLabel')}</th><th></th></tr></thead>
          <tbody>
            {vitals.map((v) => (
              <tr key={v.id}>
                <td>{v.recordedAt}</td>
                <td>{v.bloodPressureSystolic && v.bloodPressureDiastolic ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : t('common.na')}</td>
                <td>{v.heartRate ?? t('common.na')}</td>
                <td>{v.respiratoryRate ?? t('common.na')}</td>
                <td>{v.temperature ?? t('common.na')}</td>
                <td>{v.spo2 ?? t('common.na')}</td>
                <td>{v.weight ?? t('common.na')}</td>
                <td>{v.height ?? t('common.na')}</td>
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
