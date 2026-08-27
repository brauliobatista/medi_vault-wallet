import { useEffect, useState } from 'react'
import Modal from './Modal'
import {
  getAllergies, addAllergy, deleteAllergy,
  getPathologies, addPathology, deletePathology, getIcpc2Codes,
  getMedications, addMedication, deleteMedication,
  getPatientSummary, updateBloodType,
} from '../api/medical'
import { useTranslation } from '../i18n/LanguageContext'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

interface Props { userId: string; onClose: () => void }

interface Allergy { id: number; activeSubstance: string; allergicReaction: string | null; severity: string | null }
interface Pathology { id: number; icpc2Description: string; type: string; diagnosedAt: string | null }
interface Medication { id: number; activeSubstance: string; dose: string | null; posology: string | null; startDate: string | null }
interface Icpc2 { id: number; code: string; description: string }

export default function ContextoClinicoModal({ userId, onClose }: Props) {
  const { t } = useTranslation()
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [pathologies, setPathologies] = useState<Pathology[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [icpc2, setIcpc2] = useState<Icpc2[]>([])
  const [bloodType, setBloodType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingBloodType, setEditingBloodType] = useState(false)
  const [bloodTypeDraft, setBloodTypeDraft] = useState('')

  const [allergyForm, setAllergyForm] = useState({ activeSubstance: '', allergicReaction: '', severity: '' })
  const [showAllergyForm, setShowAllergyForm] = useState(false)

  const [pathologyForm, setPathologyForm] = useState({ icpc2Id: '', type: 'chronic', diagnosedAt: '' })
  const [showPathologyForm, setShowPathologyForm] = useState(false)

  const [medForm, setMedForm] = useState({ activeSubstance: '', dose: '', posology: '', startDate: '' })
  const [showMedForm, setShowMedForm] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getAllergies(userId), getPathologies(userId), getMedications(userId), getIcpc2Codes(), getPatientSummary(userId)])
      .then(([a, p, m, i, s]) => { setAllergies(a); setPathologies(p); setMedications(m); setIcpc2(i); setBloodType(s.bloodType) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [userId])

  const handleSaveBloodType = async () => {
    await updateBloodType(userId, bloodTypeDraft || null)
    setEditingBloodType(false)
    load()
  }

  const handleAddAllergy = async () => {
    if (!allergyForm.activeSubstance.trim()) return
    await addAllergy(userId, allergyForm)
    setAllergyForm({ activeSubstance: '', allergicReaction: '', severity: '' })
    setShowAllergyForm(false)
    load()
  }
  const handleDeleteAllergy = async (id: number) => {
    if (!confirm(t('contextoClinicoModal.confirmDeleteAllergy'))) return
    await deleteAllergy(userId, id)
    load()
  }

  const handleAddPathology = async () => {
    if (!pathologyForm.icpc2Id) return
    await addPathology(userId, { icpc2Id: Number(pathologyForm.icpc2Id), type: pathologyForm.type, diagnosedAt: pathologyForm.diagnosedAt || null, notes: null })
    setPathologyForm({ icpc2Id: '', type: 'chronic', diagnosedAt: '' })
    setShowPathologyForm(false)
    load()
  }
  const handleDeletePathology = async (id: number) => {
    if (!confirm(t('contextoClinicoModal.confirmDeletePathology'))) return
    await deletePathology(userId, id)
    load()
  }

  const handleAddMed = async () => {
    if (!medForm.activeSubstance.trim()) return
    await addMedication(userId, medForm)
    setMedForm({ activeSubstance: '', dose: '', posology: '', startDate: '' })
    setShowMedForm(false)
    load()
  }
  const handleDeleteMed = async (id: number) => {
    if (!confirm(t('contextoClinicoModal.confirmDeleteMedication'))) return
    await deleteMedication(userId, id)
    load()
  }

  if (loading) {
    return <Modal title={t('contextoClinicoModal.title')} onClose={onClose}><p className="text-muted">{t('common.loading')}</p></Modal>
  }

  return (
    <Modal title={t('contextoClinicoModal.title')} onClose={onClose}>
      {/* Grupo Sanguíneo */}
      <div className="consult-context-item context-danger mb-3">
        <i className="bi bi-droplet-fill" />
        <div className="flex-grow-1">
          <div className="consult-context-title">{t('contextoClinicoModal.bloodTypeTitle')}</div>
          {editingBloodType ? (
            <div className="d-flex gap-2 align-items-center mt-1">
              <select className="form-select form-select-sm" style={{ maxWidth: 120 }} value={bloodTypeDraft} onChange={(e) => setBloodTypeDraft(e.target.value)}>
                <option value="">{t('contextoClinicoModal.notRecorded')}</option>
                {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
              </select>
              <button className="consult-finish-btn" onClick={handleSaveBloodType}><i className="bi bi-check-lg" /></button>
              <button className="dash-toolbar-btn" onClick={() => setEditingBloodType(false)}>{t('common.cancel')}</button>
            </div>
          ) : (
            <div className="d-flex gap-2 align-items-center">
              <div className="consult-context-value">{bloodType ?? t('contextoClinicoModal.notRecorded')}</div>
              <button className="mv-icon-btn" onClick={() => { setBloodTypeDraft(bloodType ?? ''); setEditingBloodType(true) }}><i className="bi bi-pencil" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Alergias */}
      <h6 className="consult-section-title">{t('contextoClinicoModal.allergiesTitle')}</h6>
      {allergies.map((a) => (
        <div className="consult-context-item context-danger" key={a.id}>
          <i className="bi bi-exclamation-triangle-fill" />
          <div className="flex-grow-1">
            <div className="consult-context-value">{a.activeSubstance}</div>
            {a.allergicReaction && <div className="consult-context-sub">{t('contextoClinicoModal.reactionLabel', { reaction: a.allergicReaction })}{a.severity ? ` · ${a.severity}` : ''}</div>}
          </div>
          <button className="mv-icon-btn danger" onClick={() => handleDeleteAllergy(a.id)}><i className="bi bi-trash" /></button>
        </div>
      ))}
      {allergies.length === 0 && <p className="consult-context-sub">{t('contextoClinicoModal.noAllergies')}</p>}
      {showAllergyForm ? (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">{t('contextoClinicoModal.substanceLabel')}</label><input className="form-control form-control-sm" value={allergyForm.activeSubstance} onChange={(e) => setAllergyForm({ ...allergyForm, activeSubstance: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('contextoClinicoModal.reactionFieldLabel')}</label><input className="form-control form-control-sm" value={allergyForm.allergicReaction} onChange={(e) => setAllergyForm({ ...allergyForm, allergicReaction: e.target.value })} /></div>
            <div>
              <label className="mv-modal-form-label">{t('contextoClinicoModal.severityLabel')}</label>
              <select className="form-select form-select-sm" value={allergyForm.severity} onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value })}>
                <option value="">{t('common.na')}</option><option value="mild">{t('contextoClinicoModal.severityMild')}</option><option value="moderate">{t('contextoClinicoModal.severityModerate')}</option><option value="severe">{t('contextoClinicoModal.severitySevere')}</option>
              </select>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAddAllergy}><i className="bi bi-check-lg" /> {t('common.save')}</button>
            <button className="dash-toolbar-btn" onClick={() => setShowAllergyForm(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      ) : (
        <button className="dash-toolbar-btn mb-4" onClick={() => setShowAllergyForm(true)}><i className="bi bi-plus-lg" /> {t('contextoClinicoModal.addAllergyButton')}</button>
      )}

      {/* Problemas Ativos */}
      <h6 className="consult-section-title mt-2">{t('contextoClinicoModal.activeProblemsTitle')}</h6>
      {pathologies.map((p) => (
        <div className="consult-context-item context-primary" key={p.id}>
          <i className="bi bi-heart-pulse" />
          <div className="flex-grow-1">
            <div className="consult-context-value">{p.icpc2Description}</div>
            {p.diagnosedAt && <div className="consult-context-sub">{t('contextoClinicoModal.sinceLabel', { date: p.diagnosedAt })}</div>}
          </div>
          <button className="mv-icon-btn danger" onClick={() => handleDeletePathology(p.id)}><i className="bi bi-trash" /></button>
        </div>
      ))}
      {pathologies.length === 0 && <p className="consult-context-sub">{t('contextoClinicoModal.noActiveProblems')}</p>}
      {showPathologyForm ? (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div>
              <label className="mv-modal-form-label">{t('contextoClinicoModal.diagnosisLabel')}</label>
              <select className="form-select form-select-sm" value={pathologyForm.icpc2Id} onChange={(e) => setPathologyForm({ ...pathologyForm, icpc2Id: e.target.value })}>
                <option value="">{t('common.select')}</option>
                {icpc2.map((c) => <option key={c.id} value={c.id}>{c.description}</option>)}
              </select>
            </div>
            <div><label className="mv-modal-form-label">{t('contextoClinicoModal.diagnosedAtLabel')}</label><input type="date" className="form-control form-control-sm" value={pathologyForm.diagnosedAt} onChange={(e) => setPathologyForm({ ...pathologyForm, diagnosedAt: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAddPathology}><i className="bi bi-check-lg" /> {t('common.save')}</button>
            <button className="dash-toolbar-btn" onClick={() => setShowPathologyForm(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      ) : (
        <button className="dash-toolbar-btn mb-4" onClick={() => setShowPathologyForm(true)}><i className="bi bi-plus-lg" /> {t('contextoClinicoModal.addProblemButton')}</button>
      )}

      {/* Medicação */}
      <h6 className="consult-section-title mt-2">{t('contextoClinicoModal.activeMedicationTitle')}</h6>
      {medications.map((m) => (
        <div className="consult-context-item context-teal" key={m.id}>
          <i className="bi bi-capsule" />
          <div className="flex-grow-1">
            <div className="consult-context-value">{m.activeSubstance}{m.dose ? ` ${m.dose}` : ''}</div>
            {m.posology && <div className="consult-context-sub">{m.posology}</div>}
          </div>
          <button className="mv-icon-btn danger" onClick={() => handleDeleteMed(m.id)}><i className="bi bi-trash" /></button>
        </div>
      ))}
      {medications.length === 0 && <p className="consult-context-sub">{t('contextoClinicoModal.noActiveMedication')}</p>}
      {showMedForm ? (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">{t('contextoClinicoModal.activeSubstanceLabel')}</label><input className="form-control form-control-sm" value={medForm.activeSubstance} onChange={(e) => setMedForm({ ...medForm, activeSubstance: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('contextoClinicoModal.doseLabel')}</label><input className="form-control form-control-sm" placeholder={t('contextoClinicoModal.dosePlaceholder')} value={medForm.dose} onChange={(e) => setMedForm({ ...medForm, dose: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('contextoClinicoModal.posologyLabel')}</label><input className="form-control form-control-sm" placeholder={t('contextoClinicoModal.posologyPlaceholder')} value={medForm.posology} onChange={(e) => setMedForm({ ...medForm, posology: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('contextoClinicoModal.startDateLabel')}</label><input type="date" className="form-control form-control-sm" value={medForm.startDate} onChange={(e) => setMedForm({ ...medForm, startDate: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAddMed}><i className="bi bi-check-lg" /> {t('common.save')}</button>
            <button className="dash-toolbar-btn" onClick={() => setShowMedForm(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      ) : (
        <button className="dash-toolbar-btn" onClick={() => setShowMedForm(true)}><i className="bi bi-plus-lg" /> {t('contextoClinicoModal.addMedicationButton')}</button>
      )}
    </Modal>
  )
}
