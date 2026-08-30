import { useEffect, useState } from 'react'
import Modal from './Modal'
import { getChatMessages, sendChatMessage } from '../api/medical'
import { useTranslation } from '../i18n/LanguageContext'

interface Props { userId: string; onClose: () => void }
interface ChatMessage { id: number; authorDoctorId: string; authorName: string; message: string; createdAt: string }

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()

export default function ChatModal({ userId, onClose }: Props) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const load = () => { setLoading(true); getChatMessages(userId).then(setMessages).finally(() => setLoading(false)) }
  useEffect(load, [userId])

  const handleSend = async () => {
    if (!draft.trim()) return
    setSending(true)
    try {
      await sendChatMessage(userId, draft.trim())
      setDraft('')
      load()
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal title={t('chatModal.title')} onClose={onClose}>
      {loading ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : messages.length === 0 ? (
        <p className="mv-empty-state">{t('chatModal.emptyState')}</p>
      ) : (
        <div className="mb-3">
          {messages.map((m) => (
            <div className="consult-chat-row" key={m.id}>
              <div className="consult-chat-avatar">{initials(m.authorName)}</div>
              <div className="flex-grow-1">
                <div className="consult-context-value">{m.authorName}</div>
                <div className="consult-context-sub">{m.message}</div>
              </div>
              <div className="consult-chat-meta">
                <small className="text-muted">{m.createdAt.slice(0, 16).replace('T', ' ')}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mv-modal-form">
        <div className="input-group">
          <input
            className="form-control"
            placeholder={t('chatModal.messagePlaceholder')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="consult-finish-btn" onClick={handleSend} disabled={sending}>
            {sending ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-send" /></>}
          </button>
        </div>
      </div>
    </Modal>
  )
}
