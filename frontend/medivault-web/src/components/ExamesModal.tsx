import { useEffect, useState } from 'react'
import Modal from './Modal'
import {
  getAnalyticalExams, addAnalyticalExam,
  getImagingExams, addImagingExam,
  getOptometryExams, addOptometryExam,
} from '../api/medical'

interface Props { userId: string; onClose: () => void }

type ExamTab = 'analytical' | 'imaging' | 'optometry'

interface AnalyticalExam { id: number; examDate: string; laboratory: string | null; notes: string | null }
interface ImagingExam { id: number; examType: string; bodyArea: string | null; examDate: string; institution: string | null }
interface OptometryExam { id: number; examDate: string; rightSphere: number | null; leftSphere: number | null }

export default function ExamesModal({ userId, onClose }: Props) {
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
    <Modal title="Todos os Exames" onClose={onClose}>
      <div className="consult-tabs">
        <button className={`consult-tab${tab === 'analytical' ? ' active' : ''}`} onClick={() => { setTab('analytical'); setShowForm(false) }}>
          <i className="bi bi-droplet" /> Analíticos
        </button>
        <button className={`consult-tab${tab === 'imaging' ? ' active' : ''}`} onClick={() => { setTab('imaging'); setShowForm(false) }}>
          <i className="bi bi-file-medical" /> Imagem
        </button>
        <button className={`consult-tab${tab === 'optometry' ? ' active' : ''}`} onClick={() => { setTab('optometry'); setShowForm(false) }}>
          <i className="bi bi-eye" /> Optometria
        </button>
      </div>

      <div className="mv-modal-toolbar">
        <button className="consult-finish-btn" onClick={() => setShowForm(!showForm)}>
          <i className="bi bi-plus-lg" /> Adicionar exame
        </button>
      </div>

      {showForm && tab === 'analytical' && (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">Data</label><input type="date" className="form-control form-control-sm" value={analyticalForm.examDate} onChange={(e) => setAnalyticalForm({ ...analyticalForm, examDate: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Laboratório</label><input className="form-control form-control-sm" value={analyticalForm.laboratory} onChange={(e) => setAnalyticalForm({ ...analyticalForm, laboratory: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Notas</label><input className="form-control form-control-sm" value={analyticalForm.notes} onChange={(e) => setAnalyticalForm({ ...analyticalForm, notes: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAdd}><i className="bi bi-check-lg" /> Guardar</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {showForm && tab === 'imaging' && (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">Tipo de exame</label><input className="form-control form-control-sm" placeholder="ex: Ecocardiograma" value={imagingForm.examType} onChange={(e) => setImagingForm({ ...imagingForm, examType: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Área</label><input className="form-control form-control-sm" value={imagingForm.bodyArea} onChange={(e) => setImagingForm({ ...imagingForm, bodyArea: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Data</label><input type="date" className="form-control form-control-sm" value={imagingForm.examDate} onChange={(e) => setImagingForm({ ...imagingForm, examDate: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Instituição</label><input className="form-control form-control-sm" value={imagingForm.institution} onChange={(e) => setImagingForm({ ...imagingForm, institution: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Relatório</label><input className="form-control form-control-sm" value={imagingForm.reportText} onChange={(e) => setImagingForm({ ...imagingForm, reportText: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAdd}><i className="bi bi-check-lg" /> Guardar</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {showForm && tab === 'optometry' && (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">Data</label><input type="date" className="form-control form-control-sm" value={optometryForm.examDate} onChange={(e) => setOptometryForm({ ...optometryForm, examDate: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Esfera direita</label><input type="number" step="0.25" className="form-control form-control-sm" value={optometryForm.rightSphere} onChange={(e) => setOptometryForm({ ...optometryForm, rightSphere: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Esfera esquerda</label><input type="number" step="0.25" className="form-control form-control-sm" value={optometryForm.leftSphere} onChange={(e) => setOptometryForm({ ...optometryForm, leftSphere: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Relatório</label><input className="form-control form-control-sm" value={optometryForm.diseaseReport} onChange={(e) => setOptometryForm({ ...optometryForm, diseaseReport: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAdd}><i className="bi bi-check-lg" /> Guardar</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">A carregar…</p>
      ) : tab === 'analytical' ? (
        analytical.length === 0 ? <p className="mv-empty-state">Sem exames analíticos.</p> : (
          <table className="mv-modal-table">
            <thead><tr><th>Data</th><th>Laboratório</th><th>Notas</th></tr></thead>
            <tbody>{analytical.map((e) => <tr key={e.id}><td>{e.examDate}</td><td>{e.laboratory ?? '—'}</td><td>{e.notes ?? '—'}</td></tr>)}</tbody>
          </table>
        )
      ) : tab === 'imaging' ? (
        imaging.length === 0 ? <p className="mv-empty-state">Sem exames de imagem.</p> : (
          <table className="mv-modal-table">
            <thead><tr><th>Tipo</th><th>Área</th><th>Data</th><th>Instituição</th></tr></thead>
            <tbody>{imaging.map((e) => <tr key={e.id}><td>{e.examType}</td><td>{e.bodyArea ?? '—'}</td><td>{e.examDate}</td><td>{e.institution ?? '—'}</td></tr>)}</tbody>
          </table>
        )
      ) : (
        optometry.length === 0 ? <p className="mv-empty-state">Sem exames de optometria.</p> : (
          <table className="mv-modal-table">
            <thead><tr><th>Data</th><th>Esfera D</th><th>Esfera E</th></tr></thead>
            <tbody>{optometry.map((e) => <tr key={e.id}><td>{e.examDate}</td><td>{e.rightSphere ?? '—'}</td><td>{e.leftSphere ?? '—'}</td></tr>)}</tbody>
          </table>
        )
      )}
    </Modal>
  )
}
