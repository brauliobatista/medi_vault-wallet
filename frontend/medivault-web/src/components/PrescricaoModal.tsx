import { useEffect, useState } from 'react'
import Modal from './Modal'
import { getMedications, addMedication, deleteMedication } from '../api/medical'
import { useTranslation } from '../i18n/LanguageContext'

interface Props { userId: string; onClose: () => void }
interface Medication { id: number; activeSubstance: string; dose: string | null; posology: string | null; startDate: string | null; endDate: string | null }

const emptyForm = { activeSubstance: '', dose: '', posology: '', startDate: '' }

export default function PrescricaoModal({ userId, onClose }: Props) {
  const { t } = useTranslation()
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = () => { setLoading(true); getMedications(userId).then(setMedications).finally(() => setLoading(false)) }
  useEffect(load, [userId])

  const handleAdd = async () => {
    if (!form.activeSubstance.trim()) return
    await addMedication(userId, form)
    setForm(emptyForm)
    setShowForm(false)
    load()
  }
  const handleDelete = async (id: number) => {
    if (!confirm(t('prescricaoModal.confirmDelete'))) return
    await deleteMedication(userId, id)
    load()
  }

  return (
    <Modal title={t('prescricaoModal.title')} onClose={onClose}>
      <div className="mv-modal-toolbar">
        <button className="consult-finish-btn" onClick={() => setShowForm(!showForm)}>
          <i className="bi bi-plus-lg" /> {t('prescricaoModal.addButton')}
        </button>
      </div>

      {showForm && (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">{t('prescricaoModal.activeSubstanceLabel')}</label><input className="form-control form-control-sm" value={form.activeSubstance} onChange={(e) => setForm({ ...form, activeSubstance: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('prescricaoModal.doseLabel')}</label><input className="form-control form-control-sm" placeholder={t('prescricaoModal.dosePlaceholder')} value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('prescricaoModal.posologyLabel')}</label><input className="form-control form-control-sm" placeholder={t('prescricaoModal.posologyPlaceholder')} value={form.posology} onChange={(e) => setForm({ ...form, posology: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('prescricaoModal.startDateLabel')}</label><input type="date" className="form-control form-control-sm" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAdd}><i className="bi bi-check-lg" /> {t('common.save')}</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : medications.length === 0 ? (
        <p className="mv-empty-state">{t('prescricaoModal.emptyState')}</p>
      ) : (
        <table className="mv-modal-table">
          <thead><tr><th>{t('prescricaoModal.substanceColumnLabel')}</th><th>{t('prescricaoModal.doseLabel')}</th><th>{t('prescricaoModal.posologyLabel')}</th><th>{t('prescricaoModal.startDateLabel')}</th><th></th></tr></thead>
          <tbody>
            {medications.map((m) => (
              <tr key={m.id}>
                <td>{m.activeSubstance}</td>
                <td>{m.dose ?? t('common.na')}</td>
                <td>{m.posology ?? t('common.na')}</td>
                <td>{m.startDate ?? t('common.na')}</td>
                <td><button className="mv-icon-btn danger" onClick={() => handleDelete(m.id)}><i className="bi bi-trash" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}
