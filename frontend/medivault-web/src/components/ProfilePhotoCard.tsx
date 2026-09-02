import { useRef, useState } from 'react'
import CameraCaptureModal from './CameraCaptureModal'
import { mediaUrl } from '../api/client'
import { cropToSquare } from '../utils/image'
import { useTranslation } from '../i18n/LanguageContext'

interface Props {
  photoUrl: string | null
  fallbackInitial: string
  uploadPhoto: (file: File) => Promise<{ photoUrl: string }>
  deletePhoto: () => Promise<unknown>
  // Called with the new photo path after a successful upload, or null after a
  // removal, so the parent can refresh its own state and sync the stored user.
  onPhotoChange: (photoUrl: string | null) => void
}

// Profile photo picker shared by the patient and doctor profile pages: shows the
// current avatar, lets the user pick a file or use the camera, centre-crops the
// image to a square before uploading, and offers removal.
export default function ProfilePhotoCard({ photoUrl, fallbackInitial, uploadPhoto, deletePhoto, onPhotoChange }: Props) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const square = await cropToSquare(file)
      const { photoUrl: newUrl } = await uploadPhoto(square)
      onPhotoChange(newUrl)
    } catch {
      setError(t('profile.photoUploadError'))
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await handleFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCameraCapture = async (file: File) => {
    setShowCamera(false)
    await handleFile(file)
  }

  const handleRemove = async () => {
    if (!confirm(t('profile.confirmRemovePhoto'))) return
    await deletePhoto()
    onPhotoChange(null)
  }

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body d-flex align-items-center gap-3 flex-wrap">
        {photoUrl ? (
          <img
            src={mediaUrl(photoUrl)}
            alt={t('profile.photoAlt')}
            className="rounded-circle"
            style={{ width: 80, height: 80, objectFit: 'cover' }}
          />
        ) : (
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
            style={{ width: 80, height: 80, fontSize: '1.75rem' }}
          >
            {fallbackInitial}
          </div>
        )}
        <div className="d-flex flex-column gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            className="d-none"
            onChange={handleFileSelect}
          />
          <div className="d-flex flex-wrap gap-2">
            <button
              className="btn btn-outline-primary btn-sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading
                ? <span className="spinner-border spinner-border-sm" />
                : <><i className="bi bi-upload me-1" />{t('profile.uploadFromDevice')}</>}
            </button>
            <button
              className="btn btn-outline-primary btn-sm"
              disabled={uploading}
              onClick={() => setShowCamera(true)}
            >
              <i className="bi bi-camera me-1" />{t('profile.useCamera')}
            </button>
            {photoUrl && (
              <button className="btn btn-outline-danger btn-sm" onClick={handleRemove}>
                <i className="bi bi-trash me-1" />{t('profile.removePhoto')}
              </button>
            )}
          </div>
          {error && <div className="text-danger small">{error}</div>}
        </div>
      </div>

      {showCamera && (
        <CameraCaptureModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}
    </div>
  )
}
