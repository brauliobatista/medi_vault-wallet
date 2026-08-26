import { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import { getDoctorNotes, getChatMessages, getConsultationActivity } from '../../api/medical'

interface DoctorNote { id: number; doctorId: string; doctorName: string; section: string; noteText: string; createdAt: string; updatedAt: string }
interface ChatMessage { id: number; authorDoctorId: string; authorName: string; message: string; createdAt: string }
interface ActivityItem { type: string; label: string; detail: string; doctorId: string; doctorName: string; occurredAt: string }

const ACTIVITY_ICONS: Record<string, string> = {
  anamnese: 'bi-person-lines-fill',
  vitais: 'bi-heart-pulse',
  avaliacao: 'bi-clipboard2-check',
  prescricao: 'bi-capsule',
  documento: 'bi-file-earmark-text',
}

export default function FinishedConsultationPage() {
  useParams<{ consultationId: string }>()
  const location = useLocation()
  const navState = location.state as {
    patientName?: string; userId?: string; patientPublicId?: string; utentNumber?: string
    durationMinutes?: number; startedAt?: string; finishedAt?: string
  } | null

  const [notes, setNotes] = useState<DoctorNote[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navState?.userId) { setLoading(false); return }
    Promise.all([
      getDoctorNotes(navState.userId),
      getChatMessages(navState.userId),
      navState.startedAt
        ? getConsultationActivity(navState.userId, navState.startedAt, navState.finishedAt)
        : Promise.resolve([]),
    ])
      .then(([notesRes, chatRes, activityRes]) => { setNotes(notesRes); setChatMessages(chatRes); setActivity(activityRes) })
      .finally(() => setLoading(false))
  }, [navState?.userId, navState?.startedAt, navState?.finishedAt])

  if (!navState?.userId) {
    return (
      <Layout>
        <p className="text-muted">Consulta não encontrada. <Link to="/doctor">Voltar ao dashboard</Link></p>
      </Layout>
    )
  }

  return (
    <Layout>
      <Link to="/doctor" className="consult-back mb-3 d-inline-block">
        <i className="bi bi-arrow-left" /> Voltar
      </Link>

      <div className="dash-card mb-4">
        <div className="dash-card-header">
          <div className="dash-card-heading">
            <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-clipboard2-check" /></span>
            <span className="dash-card-title">{navState.patientName}</span>
          </div>
        </div>
        <div className="consult-context-sub font-monospace">{navState.patientPublicId} · Nº utente: {navState.utentNumber}</div>
        <div className="consult-context-sub">
          Consulta finalizada em {navState.finishedAt?.slice(0, 10)} · Duração: {navState.durationMinutes} min
        </div>
        <div className="consult-context-sub mt-1">
          O acesso aos dados clínicos completos deste utente terminou. Só tens acesso de leitura às tuas notas e ao chat da equipa abaixo.
        </div>
      </div>

      {loading ? (
        <p className="text-muted">A carregar…</p>
      ) : (
        <>
          <div className="dash-card mb-4">
            <div className="dash-card-header">
              <div className="dash-card-heading">
                <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-journal-text" /></span>
                <span className="dash-card-title">Notas</span>
              </div>
            </div>
            {notes.length === 0 ? (
              <p className="mv-empty-state">Sem notas registadas.</p>
            ) : (
              notes.map((n) => (
                <div className="consult-context-item context-plain" key={n.id}>
                  <i className="bi bi-sticky" />
                  <div className="flex-grow-1">
                    <div className="consult-context-title">{n.section}</div>
                    <div className="consult-context-value">{n.noteText}</div>
                    <div className="consult-context-sub">{n.doctorName} · {n.updatedAt.slice(0, 16).replace('T', ' ')}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="dash-card mb-4">
            <div className="dash-card-header">
              <div className="dash-card-heading">
                <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-list-check" /></span>
                <span className="dash-card-title">Atividade da Consulta</span>
              </div>
            </div>
            {activity.length === 0 ? (
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
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-heading">
                <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-chat-dots" /></span>
                <span className="dash-card-title">Chat da Equipa</span>
              </div>
            </div>
            {chatMessages.length === 0 ? (
              <p className="mv-empty-state">Sem mensagens.</p>
            ) : (
              chatMessages.map((m) => (
                <div className="consult-context-item context-plain" key={m.id}>
                  <i className="bi bi-person-circle" />
                  <div className="flex-grow-1">
                    <div className="consult-context-value">{m.authorName}</div>
                    <div className="consult-context-sub">{m.message}</div>
                    <div className="consult-context-sub">{m.createdAt.slice(0, 16).replace('T', ' ')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
