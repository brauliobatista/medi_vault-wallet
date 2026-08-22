import { useEffect, useState } from 'react'
import Modal from './Modal'
import {
  getAnalyticalExams, addAnalyticalExam,
  getImagingExams, addImagingExam,
  getOptometryExams, addOptometryExam,
} from '../api/medical'
import { useTranslation } from '../i18n/LanguageContext'

interface Props { userId: string; onClose: () => void }

type ExamTab = 'analytical' | 'imaging' | 'optometry'

interface AnalyticalExam { id: number; examDate: string; laboratory: string | null; notes: string | null }
interface ImagingExam { id: number; examType: string; bodyArea: string | null; examDate: string; institution: string | null }
interface OptometryExam { id: number; examDate: string; rightSphere: number | null; leftSphere: number | null }

export default function ExamesModal({ userId, onClose }: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ExamTab>('analytical')
  const [analytical, setAnalytical] = useState<AnalyticalExam[]>([])
  const [imaging, setImaging] = useState<ImagingExam[]>([])
  const [optometry, setOptometry] = useState<OptometryExam[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [analyticalForm, setAnalyticalForm] = useState({ examDate: '', laboratory: '', notes: '' })
  const [imagingForm, setImagingForm] = useState({ examType: '', bodyArea: '', examDate: '', institution: '', reportText: '' })
  const [optometryForm, setOptometryForm] = useState({ examDate: '', rightSphere: '', leftSphere: '', diseaseReport: '' })

  const load = () => {
    setLoading(true)
    Promise.all([getAnalyticalExams(userId), getImagingExams(userId), getOptometryExams(userId)])
      .then(([a, i, o]) => { setAnalytical(a); setImaging(i); setOptometry(o) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [userId])

  const handleAdd = async () => {
    if (tab === 'analytical') {
      if (!analyticalForm.examDate) return
      await addAnalyticalExam(userId, { ...analyticalForm, parameters: [] })
      setAnalyticalForm({ examDate: '', laboratory: '', notes: '' })
    } else if (tab === 'imaging') {
      if (!imagingForm.examType.trim() || !imagingForm.examDate) return
      await addImagingExam(userId, imagingForm)
      setImagingForm({ examType: '', bodyArea: '', examDate: '', institution: '', reportText: '' })
    } else {
      if (!optometryForm.examDate) return
      await addOptometryExam(userId, {
        ...optometryForm,
        rightSphere: optometryForm.rightSphere ? Number(optometryForm.rightSphere) : null,
        leftSphere: optometryForm.leftSphere ? Number(optometryForm.leftSphere) : null,
      })
      setOptometryForm({ examDate: '', rightSphere: '', leftSphere: '', diseaseReport: '' })
    }
    setShowForm(false)
    load()
  }

  return (
    <Modal title={t('examesModal.title')} onClose={onClose}>
      <div className="consult-tabs">
        <button className={`consult-tab${tab === 'analytical' ? ' active' : ''}`} onClick={() => { setTab('analytical'); setShowForm(false) }}>
          <i className="bi bi-droplet" /> {t('examesModal.analyticalTab')}
        </button>
        <button className={`consult-tab${tab === 'imaging' ? ' active' : ''}`} onClick={() => { setTab('imaging'); setShowForm(false) }}>
          <i className="bi bi-file-medical" /> {t('examesModal.imagingTab')}
        </button>
        <button className={`consult-tab${tab === 'optometry' ? ' active' : ''}`} onClick={() => { setTab('optometry'); setShowForm(false) }}>
          <i className="bi bi-eye" /> {t('examesModal.optometryTab')}
        </button>
      </div>

      <div className="mv-modal-toolbar">
        <button className="consult-finish-btn" onClick={() => setShowForm(!showForm)}>
          <i className="bi bi-plus-lg" /> {t('examesModal.addButton')}
        </button>
      </div>

      {showForm && tab === 'analytical' && (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">{t('examesModal.dateLabel')}</label><input type="date" className="form-control form-control-sm" value={analyticalForm.examDate} onChange={(e) => setAnalyticalForm({ ...analyticalForm, examDate: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('examesModal.laboratoryLabel')}</label><input className="form-control form-control-sm" value={analyticalForm.laboratory} onChange={(e) => setAnalyticalForm({ ...analyticalForm, laboratory: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('examesModal.notesLabel')}</label><input className="form-control form-control-sm" value={analyticalForm.notes} onChange={(e) => setAnalyticalForm({ ...analyticalForm, notes: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAdd}><i className="bi bi-check-lg" /> {t('common.save')}</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
      {showForm && tab === 'imaging' && (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">{t('examesModal.examTypeLabel')}</label><input className="form-control form-control-sm" placeholder={t('examesModal.examTypePlaceholder')} value={imagingForm.examType} onChange={(e) => setImagingForm({ ...imagingForm, examType: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('examesModal.bodyAreaLabel')}</label><input className="form-control form-control-sm" value={imagingForm.bodyArea} onChange={(e) => setImagingForm({ ...imagingForm, bodyArea: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('examesModal.dateLabel')}</label><input type="date" className="form-control form-control-sm" value={imagingForm.examDate} onChange={(e) => setImagingForm({ ...imagingForm, examDate: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('examesModal.institutionLabel')}</label><input className="form-control form-control-sm" value={imagingForm.institution} onChange={(e) => setImagingForm({ ...imagingForm, institution: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('examesModal.reportLabel')}</label><input className="form-control form-control-sm" value={imagingForm.reportText} onChange={(e) => setImagingForm({ ...imagingForm, reportText: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAdd}><i className="bi bi-check-lg" /> {t('common.save')}</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
      {showForm && tab === 'optometry' && (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">{t('examesModal.dateLabel')}</label><input type="date" className="form-control form-control-sm" value={optometryForm.examDate} onChange={(e) => setOptometryForm({ ...optometryForm, examDate: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('examesModal.rightSphereLabel')}</label><input type="number" step="0.25" className="form-control form-control-sm" value={optometryForm.rightSphere} onChange={(e) => setOptometryForm({ ...optometryForm, rightSphere: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('examesModal.leftSphereLabel')}</label><input type="number" step="0.25" className="form-control form-control-sm" value={optometryForm.leftSphere} onChange={(e) => setOptometryForm({ ...optometryForm, leftSphere: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">{t('examesModal.reportLabel')}</label><input className="form-control form-control-sm" value={optometryForm.diseaseReport} onChange={(e) => setOptometryForm({ ...optometryForm, diseaseReport: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAdd}><i className="bi bi-check-lg" /> {t('common.save')}</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : tab === 'analytical' ? (
        analytical.length === 0 ? <p className="mv-empty-state">{t('examesModal.emptyAnalytical')}</p> : (
          <table className="mv-modal-table">
            <thead><tr><th>{t('examesModal.dateLabel')}</th><th>{t('examesModal.laboratoryLabel')}</th><th>{t('examesModal.notesLabel')}</th></tr></thead>
            <tbody>{analytical.map((e) => <tr key={e.id}><td>{e.examDate}</td><td>{e.laboratory ?? t('common.na')}</td><td>{e.notes ?? t('common.na')}</td></tr>)}</tbody>
          </table>
        )
      ) : tab === 'imaging' ? (
        imaging.length === 0 ? <p className="mv-empty-state">{t('examesModal.emptyImaging')}</p> : (
          <table className="mv-modal-table">
            <thead><tr><th>{t('examesModal.typeColumnLabel')}</th><th>{t('examesModal.bodyAreaLabel')}</th><th>{t('examesModal.dateLabel')}</th><th>{t('examesModal.institutionLabel')}</th></tr></thead>
            <tbody>{imaging.map((e) => <tr key={e.id}><td>{e.examType}</td><td>{e.bodyArea ?? t('common.na')}</td><td>{e.examDate}</td><td>{e.institution ?? t('common.na')}</td></tr>)}</tbody>
          </table>
        )
      ) : (
        optometry.length === 0 ? <p className="mv-empty-state">{t('examesModal.emptyOptometry')}</p> : (
          <table className="mv-modal-table">
            <thead><tr><th>{t('examesModal.dateLabel')}</th><th>{t('examesModal.rightSphereShort')}</th><th>{t('examesModal.leftSphereShort')}</th></tr></thead>
            <tbody>{optometry.map((e) => <tr key={e.id}><td>{e.examDate}</td><td>{e.rightSphere ?? t('common.na')}</td><td>{e.leftSphere ?? t('common.na')}</td></tr>)}</tbody>
          </table>
        )
      )}
    </Modal>
  )
}
