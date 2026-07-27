import { useEffect, useState } from 'react'
import Modal from './Modal'
import {
  getAllergies, addAllergy, deleteAllergy,
  getPathologies, addPathology, deletePathology, getIcpc2Codes,
  getMedications, addMedication, deleteMedication,
} from '../api/medical'

interface Props { userId: string; onClose: () => void }

interface Allergy { id: number; activeSubstance: string; allergicReaction: string | null; severity: string | null }
interface Pathology { id: number; icpc2Description: string; type: string; diagnosedAt: string | null }
interface Medication { id: number; activeSubstance: string; dose: string | null; posology: string | null; startDate: string | null }
interface Icpc2 { id: number; code: string; description: string }

export default function ContextoClinicoModal({ userId, onClose }: Props) {
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [pathologies, setPathologies] = useState<Pathology[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [icpc2, setIcpc2] = useState<Icpc2[]>([])
  const [loading, setLoading] = useState(true)

  const [allergyForm, setAllergyForm] = useState({ activeSubstance: '', allergicReaction: '', severity: '' })
  const [showAllergyForm, setShowAllergyForm] = useState(false)

  const [pathologyForm, setPathologyForm] = useState({ icpc2Id: '', type: 'chronic', diagnosedAt: '' })
  const [showPathologyForm, setShowPathologyForm] = useState(false)

  const [medForm, setMedForm] = useState({ activeSubstance: '', dose: '', posology: '', startDate: '' })
  const [showMedForm, setShowMedForm] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getAllergies(userId), getPathologies(userId), getMedications(userId), getIcpc2Codes()])
      .then(([a, p, m, i]) => { setAllergies(a); setPathologies(p); setMedications(m); setIcpc2(i) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [userId])

  const handleAddAllergy = async () => {
    if (!allergyForm.activeSubstance.trim()) return
    await addAllergy(userId, allergyForm)
    setAllergyForm({ activeSubstance: '', allergicReaction: '', severity: '' })
    setShowAllergyForm(false)
    load()
  }
  const handleDeleteAllergy = async (id: number) => {
    if (!confirm('Remover esta alergia?')) return
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
    if (!confirm('Remover este problema ativo?')) return
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
    if (!confirm('Remover esta medicação?')) return
    await deleteMedication(userId, id)
    load()
  }

  if (loading) {
    return <Modal title="Contexto Clínico" onClose={onClose}><p className="text-muted">A carregar…</p></Modal>
  }

  return (
    <Modal title="Contexto Clínico" onClose={onClose}>
      {/* Alergias */}
      <h6 className="consult-section-title">Alergias</h6>
      {allergies.map((a) => (
        <div className="consult-context-item context-danger" key={a.id}>
          <i className="bi bi-exclamation-triangle-fill" />
          <div className="flex-grow-1">
            <div className="consult-context-value">{a.activeSubstance}</div>
            {a.allergicReaction && <div className="consult-context-sub">Reação: {a.allergicReaction}{a.severity ? ` · ${a.severity}` : ''}</div>}
          </div>
          <button className="mv-icon-btn danger" onClick={() => handleDeleteAllergy(a.id)}><i className="bi bi-trash" /></button>
        </div>
      ))}
      {allergies.length === 0 && <p className="consult-context-sub">Sem alergias registadas.</p>}
      {showAllergyForm ? (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">Substância</label><input className="form-control form-control-sm" value={allergyForm.activeSubstance} onChange={(e) => setAllergyForm({ ...allergyForm, activeSubstance: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Reação</label><input className="form-control form-control-sm" value={allergyForm.allergicReaction} onChange={(e) => setAllergyForm({ ...allergyForm, allergicReaction: e.target.value })} /></div>
            <div>
              <label className="mv-modal-form-label">Severidade</label>
              <select className="form-select form-select-sm" value={allergyForm.severity} onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value })}>
                <option value="">—</option><option value="mild">Leve</option><option value="moderate">Moderada</option><option value="severe">Grave</option>
              </select>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAddAllergy}><i className="bi bi-check-lg" /> Guardar</button>
            <button className="dash-toolbar-btn" onClick={() => setShowAllergyForm(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button className="dash-toolbar-btn mb-4" onClick={() => setShowAllergyForm(true)}><i className="bi bi-plus-lg" /> Adicionar alergia</button>
      )}

      {/* Problemas Ativos */}
      <h6 className="consult-section-title mt-2">Problemas Ativos</h6>
      {pathologies.map((p) => (
        <div className="consult-context-item context-primary" key={p.id}>
          <i className="bi bi-heart-pulse" />
          <div className="flex-grow-1">
            <div className="consult-context-value">{p.icpc2Description}</div>
            {p.diagnosedAt && <div className="consult-context-sub">Desde {p.diagnosedAt}</div>}
          </div>
          <button className="mv-icon-btn danger" onClick={() => handleDeletePathology(p.id)}><i className="bi bi-trash" /></button>
        </div>
      ))}
      {pathologies.length === 0 && <p className="consult-context-sub">Sem problemas ativos registados.</p>}
      {showPathologyForm ? (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div>
              <label className="mv-modal-form-label">Diagnóstico (ICPC-2)</label>
              <select className="form-select form-select-sm" value={pathologyForm.icpc2Id} onChange={(e) => setPathologyForm({ ...pathologyForm, icpc2Id: e.target.value })}>
                <option value="">Selecionar…</option>
                {icpc2.map((c) => <option key={c.id} value={c.id}>{c.description}</option>)}
              </select>
            </div>
            <div><label className="mv-modal-form-label">Diagnosticado em</label><input type="date" className="form-control form-control-sm" value={pathologyForm.diagnosedAt} onChange={(e) => setPathologyForm({ ...pathologyForm, diagnosedAt: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAddPathology}><i className="bi bi-check-lg" /> Guardar</button>
            <button className="dash-toolbar-btn" onClick={() => setShowPathologyForm(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button className="dash-toolbar-btn mb-4" onClick={() => setShowPathologyForm(true)}><i className="bi bi-plus-lg" /> Adicionar problema ativo</button>
      )}

      {/* Medicação */}
      <h6 className="consult-section-title mt-2">Medicação Ativa</h6>
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
      {medications.length === 0 && <p className="consult-context-sub">Sem medicação ativa.</p>}
      {showMedForm ? (
        <div className="mv-modal-form">
          <div className="mv-modal-form-grid">
            <div><label className="mv-modal-form-label">Substância ativa</label><input className="form-control form-control-sm" value={medForm.activeSubstance} onChange={(e) => setMedForm({ ...medForm, activeSubstance: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Dose</label><input className="form-control form-control-sm" placeholder="ex: 500mg" value={medForm.dose} onChange={(e) => setMedForm({ ...medForm, dose: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Posologia</label><input className="form-control form-control-sm" placeholder="ex: 2x/dia" value={medForm.posology} onChange={(e) => setMedForm({ ...medForm, posology: e.target.value })} /></div>
            <div><label className="mv-modal-form-label">Início</label><input type="date" className="form-control form-control-sm" value={medForm.startDate} onChange={(e) => setMedForm({ ...medForm, startDate: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleAddMed}><i className="bi bi-check-lg" /> Guardar</button>
            <button className="dash-toolbar-btn" onClick={() => setShowMedForm(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button className="dash-toolbar-btn" onClick={() => setShowMedForm(true)}><i className="bi bi-plus-lg" /> Adicionar medicação</button>
      )}
    </Modal>
  )
}
