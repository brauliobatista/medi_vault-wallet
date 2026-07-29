import { useEffect, useState } from 'react'
import Modal from './Modal'
import { getAssessments, addAssessment, updateAssessment, deleteAssessment } from '../api/medical'

interface Props { userId: string; onClose: () => void }
interface Assessment { id: number; hypothesis: string; plan: string; createdAt: string }

const emptyForm = { hypothesis: '', plan: '' }

export default function AssessmentsModal({ userId, onClose }: Props) {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => { setLoading(true); getAssessments(userId).then(setAssessments).finally(() => setLoading(false)) }
  useEffect(load, [userId])

  const startCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true) }
  const startEdit = (a: Assessment) => { setEditingId(a.id); setForm({ hypothesis: a.hypothesis, plan: a.plan }); setShowForm(true) }

  const handleSave = async () => {
    if (!form.hypothesis.trim() || !form.plan.trim()) return
    if (editingId) await updateAssessment(userId, editingId, form)
    else await addAssessment(userId, form)
    setShowForm(false)
    setEditingId(null)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover esta avaliação?')) return
    await deleteAssessment(userId, id)
    load()
  }

  return (
    <Modal title="Avaliações" onClose={onClose}>
      <div className="mv-modal-toolbar">
        <button className="consult-finish-btn" onClick={startCreate}><i className="bi bi-plus-lg" /> Adicionar avaliação</button>
      </div>

      {showForm && (
        <div className="mv-modal-form">
          <div className="mb-3">
            <label className="mv-modal-form-label">Hipótese diagnóstica</label>
            <textarea className="form-control form-control-sm" rows={2} value={form.hypothesis} onChange={(e) => setForm({ ...form, hypothesis: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="mv-modal-form-label">Plano diagnóstico</label>
            <textarea className="form-control form-control-sm" rows={2} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleSave}><i className="bi bi-check-lg" /> Guardar</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">A carregar…</p>
      ) : assessments.length === 0 ? (
        <p className="mv-empty-state">Sem avaliações registadas.</p>
      ) : (
        assessments.map((a, idx) => (
          <div className="consult-avaliacao-card" key={a.id}>
            <div className="consult-avaliacao-header">
              <span className={`consult-avaliacao-dot ${idx % 2 === 0 ? 'dot-blue' : 'dot-purple'}`} />
              <span className="consult-avaliacao-title">Avaliação {assessments.length - idx}</span>
              <button className="consult-link-btn consult-avaliacao-edit" onClick={() => startEdit(a)}>Editar</button>
              <button className="mv-icon-btn danger" onClick={() => handleDelete(a.id)}><i className="bi bi-trash" /></button>
            </div>
            <div className="consult-avaliacao-field">
              <div className="consult-field-label">Hipótese diagnóstica</div>
              <div>{a.hypothesis}</div>
            </div>
            <div className="consult-avaliacao-field">
              <div className="consult-field-label">Plano diagnóstico</div>
              <div>{a.plan}</div>
            </div>
          </div>
        ))
      )}
    </Modal>
  )
}
