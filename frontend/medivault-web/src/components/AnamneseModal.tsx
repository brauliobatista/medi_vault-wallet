import { useEffect, useState } from 'react'
import Modal from './Modal'
import { getAnamneses, addAnamnesis, updateAnamnesis } from '../api/medical'

interface Props { userId: string; onClose: () => void }

interface Anamnesis {
  id: number
  doctorId: string
  doctorName: string
  chiefComplaint: string | null
  illnessHistory: string | null
  personalHistory: string | null
  createdAt: string
  canEdit: boolean
}

const emptyForm = { chiefComplaint: '', illnessHistory: '', personalHistory: '' }

export default function AnamneseModal({ userId, onClose }: Props) {
  const [anamneses, setAnamneses] = useState<Anamnesis[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'none' | 'new' | 'edit'>('none')
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const load = () => { setLoading(true); getAnamneses(userId).then(setAnamneses).finally(() => setLoading(false)) }
  useEffect(load, [userId])

  const current = anamneses[0]

  const startNew = () => { setMode('new'); setForm(emptyForm); setError(null) }
  const startEdit = () => {
    if (!current) return
    setMode('edit')
    setForm({ chiefComplaint: current.chiefComplaint ?? '', illnessHistory: current.illnessHistory ?? '', personalHistory: current.personalHistory ?? '' })
    setError(null)
  }

  const handleSave = async () => {
    setError(null)
    try {
      if (mode === 'edit' && current) await updateAnamnesis(userId, current.id, form)
      else await addAnamnesis(userId, form)
      setMode('none')
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Não foi possível guardar.')
    }
  }

  return (
    <Modal title="Anamnese" onClose={onClose}>
      {loading ? (
        <p className="text-muted">A carregar…</p>
      ) : (
        <>
          <div className="mv-modal-toolbar" style={{ justifyContent: 'space-between' }}>
            <div>
              {current && (
                <button className="dash-toolbar-btn" onClick={startEdit} disabled={!current.canEdit} title={!current.canEdit ? 'Só o médico que criou este registo o pode editar, e só nas primeiras 24h' : ''}>
                  <i className="bi bi-pencil" /> Editar atual
                </button>
              )}
            </div>
            <button className="consult-finish-btn" onClick={startNew}>
              <i className="bi bi-plus-lg" /> Nova anamnese
            </button>
          </div>

          {mode !== 'none' && (
            <div className="mv-modal-form">
              {error && (
                <div className="consult-context-item context-danger mb-3">
                  <i className="bi bi-exclamation-triangle-fill" />
                  <div className="consult-context-value">{error}</div>
                </div>
              )}
              <div className="mb-3">
                <label className="mv-modal-form-label">Queixa principal</label>
                <textarea className="form-control form-control-sm" rows={2} value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="mv-modal-form-label">História da doença atual</label>
                <textarea className="form-control form-control-sm" rows={2} value={form.illnessHistory} onChange={(e) => setForm({ ...form, illnessHistory: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="mv-modal-form-label">História pessoal relevante</label>
                <textarea className="form-control form-control-sm" rows={2} value={form.personalHistory} onChange={(e) => setForm({ ...form, personalHistory: e.target.value })} />
              </div>
              <div className="d-flex gap-2">
                <button className="consult-finish-btn" onClick={handleSave}><i className="bi bi-check-lg" /> Guardar</button>
                <button className="dash-toolbar-btn" onClick={() => setMode('none')}>Cancelar</button>
              </div>
            </div>
          )}

          {!current && mode === 'none' && <p className="mv-empty-state">Sem registos de anamnese.</p>}

          {anamneses.map((a, idx) => (
            <div className="consult-avaliacao-card" key={a.id}>
              <div className="consult-avaliacao-header">
                <span className={`consult-avaliacao-dot ${idx === 0 ? 'dot-blue' : 'dot-purple'}`} />
                <span className="consult-avaliacao-title">{idx === 0 ? 'Atual' : 'Anterior'} — {a.doctorName}</span>
                <span className="consult-context-sub ms-auto">{a.createdAt.slice(0, 16).replace('T', ' ')}</span>
              </div>
              {a.chiefComplaint && <div className="consult-avaliacao-field"><div className="consult-field-label">Queixa principal</div><div>{a.chiefComplaint}</div></div>}
              {a.illnessHistory && <div className="consult-avaliacao-field"><div className="consult-field-label">História da doença atual</div><div>{a.illnessHistory}</div></div>}
              {a.personalHistory && <div className="consult-avaliacao-field"><div className="consult-field-label">História pessoal relevante</div><div>{a.personalHistory}</div></div>}
            </div>
          ))}
        </>
      )}
    </Modal>
  )
}
