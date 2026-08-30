import { useEffect, useState } from 'react'
import Modal from './Modal'
import { getDoctorNotes, createDoctorNote, updateDoctorNote, deleteDoctorNote, getConsultationActivity } from '../api/medical'

interface Props { userId: string; startedAt: string; onClose: () => void }
interface DoctorNote { id: number; doctorId: string; doctorName: string; section: string; noteText: string; createdAt: string; updatedAt: string }
interface ActivityItem { type: string; label: string; detail: string; doctorId: string; doctorName: string; occurredAt: string }

const SECTIONS = ['Geral', 'Anamnese', 'Exame Objetivo', 'Diagnóstico', 'Plano', 'Prescrição']

const ACTIVITY_ICONS: Record<string, string> = {
  anamnese: 'bi-person-lines-fill',
  vitais: 'bi-heart-pulse',
  avaliacao: 'bi-clipboard2-check',
  prescricao: 'bi-capsule',
  documento: 'bi-file-earmark-text',
}

const emptyForm = { section: SECTIONS[0], noteText: '' }

export default function NotesModal({ userId, startedAt, onClose }: Props) {
  const [notes, setNotes] = useState<DoctorNote[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    getDoctorNotes(userId).then(setNotes).catch(() => setNotes([])).finally(() => setLoading(false))

    setActivityLoading(true)
    getConsultationActivity(userId, startedAt).then(setActivity).catch(() => setActivity([])).finally(() => setActivityLoading(false))
  }
  useEffect(load, [userId])

  const startCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true) }
  const startEdit = (n: DoctorNote) => { setEditingId(n.id); setForm({ section: n.section, noteText: n.noteText }); setShowForm(true) }

  const handleSave = async () => {
    if (!form.noteText.trim()) return
    if (editingId) await updateDoctorNote(editingId, form.noteText)
    else await createDoctorNote({ userId, section: form.section, noteText: form.noteText })
    setShowForm(false)
    setEditingId(null)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover esta nota?')) return
    await deleteDoctorNote(id)
    load()
  }

  return (
    <Modal title="Notas" onClose={onClose}>
      <p className="consult-context-sub mb-3">Notas confidenciais — visíveis apenas para si, nunca para o utente.</p>

      <div className="mv-modal-toolbar">
        <button className="consult-finish-btn" onClick={startCreate}><i className="bi bi-plus-lg" /> Adicionar nota</button>
      </div>

      {showForm && (
        <div className="mv-modal-form">
          <div className="mb-3">
            <label className="mv-modal-form-label">Secção</label>
            <select
              className="form-select form-select-sm"
              value={form.section}
              disabled={!!editingId}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            >
              {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="mv-modal-form-label">Nota</label>
            <textarea className="form-control form-control-sm" rows={3} value={form.noteText} onChange={(e) => setForm({ ...form, noteText: e.target.value })} />
          </div>
          <div className="d-flex gap-2">
            <button className="consult-finish-btn" onClick={handleSave}><i className="bi bi-check-lg" /> Guardar</button>
            <button className="dash-toolbar-btn" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">A carregar…</p>
      ) : notes.length === 0 ? (
        <p className="mv-empty-state">Sem notas registadas.</p>
      ) : (
        notes.map((n, idx) => (
          <div className="consult-avaliacao-card" key={n.id}>
            <div className="consult-avaliacao-header">
              <span className={`consult-avaliacao-dot ${idx % 2 === 0 ? 'dot-blue' : 'dot-purple'}`} />
              <span className="consult-avaliacao-title">{n.section}</span>
              <span className="consult-context-sub ms-auto">{n.doctorName} · {n.updatedAt.slice(0, 16).replace('T', ' ')}</span>
              <button className="consult-link-btn consult-avaliacao-edit" onClick={() => startEdit(n)}>Editar</button>
              <button className="mv-icon-btn danger" onClick={() => handleDelete(n.id)}><i className="bi bi-trash" /></button>
            </div>
            <div className="consult-avaliacao-field">{n.noteText}</div>
          </div>
        ))
      )}

      <div className="dash-card-header mt-4">
        <div className="dash-card-heading">
          <span className="dash-card-title">Atividade da Consulta</span>
        </div>
      </div>
      {activityLoading ? (
        <p className="text-muted">A carregar…</p>
      ) : activity.length === 0 ? (
        <p className="mv-empty-state">Sem atividade registada nesta consulta.</p>
      ) : (
        activity.map((a, idx) => (
          <div className="consult-context-item context-plain" key={`${a.type}-${idx}`}>
            <i className={`bi ${ACTIVITY_ICONS[a.type] ?? 'bi-journal-text'}`} />
            <div className="flex-grow-1">
              <div className="consult-context-title">{a.label}</div>
              <div className="consult-context-value">{a.detail}</div>
              <div className="consult-context-sub">{a.doctorName} · {a.occurredAt.slice(0, 16).replace('T', ' ')}</div>
            </div>
          </div>
        ))
      )}
    </Modal>
  )
}
