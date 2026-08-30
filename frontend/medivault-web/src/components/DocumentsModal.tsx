import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { getDocuments, uploadDocument, deleteDocument } from '../api/medical'
import { useTranslation } from '../i18n/LanguageContext'

interface Props { userId: string; onClose: () => void }
interface MedicalFile { id: number; fileName: string; fileType: string | null; fileUrl: string; uploadedAt: string; uploadedByName: string | null }

export default function DocumentsModal({ userId, onClose }: Props) {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState<MedicalFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = () => { setLoading(true); getDocuments(userId).then(setDocuments).finally(() => setLoading(false)) }
  useEffect(load, [userId])

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      await uploadDocument(userId, file)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? t('documentsModal.uploadError'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('documentsModal.confirmDelete'))) return
    await deleteDocument(userId, id)
    load()
  }

  return (
    <Modal title={t('documentsModal.title')} onClose={onClose}>
      <div className="mv-modal-toolbar">
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="d-none" onChange={handleFileSelected} />
        <button className="consult-finish-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-upload" /> {t('documentsModal.addButton')}</>}
        </button>
      </div>

      {error && (
        <div className="consult-context-item context-danger mb-3">
          <i className="bi bi-exclamation-triangle-fill" />
          <div className="consult-context-value">{error}</div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : documents.length === 0 ? (
        <p className="mv-empty-state">{t('documentsModal.emptyState')}</p>
      ) : (
        documents.map((d) => (
          <div className="consult-doc-row" key={d.id}>
            <i className="bi bi-file-earmark-text consult-doc-icon" />
            <div className="flex-grow-1">
              <div className="consult-context-value">{d.fileName}</div>
              <div className="consult-context-sub">
                {d.uploadedAt.slice(0, 10)}{d.uploadedByName ? ` · ${d.uploadedByName}` : ''}
              </div>
            </div>
            <a className="dash-toolbar-btn" href={d.fileUrl} target="_blank" rel="noreferrer">
              <i className="bi bi-eye" /> {t('documentsModal.openLink')}
            </a>
            <button className="mv-icon-btn danger" onClick={() => handleDelete(d.id)}><i className="bi bi-trash" /></button>
          </div>
        ))
      )}
    </Modal>
  )
}
