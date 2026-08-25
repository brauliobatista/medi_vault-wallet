import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { useTranslation } from '../i18n/LanguageContext'

interface Props {
  onCapture: (file: File) => void
  onClose: () => void
}

// Live webcam/phone-camera capture via getUserMedia, used as the alternative
// to picking a file from disk when setting a profile photo.
export default function CameraCaptureModal({ onCapture, onClose }: Props) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setReady(true)
      })
      .catch(() => setError(t('profile.cameraError')))

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [t])

  const handleCapture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.9)
  }

  return (
    <Modal title={t('profile.useCamera')} onClose={onClose}>
      <div className="text-center">
        {error ? (
          <div className="alert alert-danger py-2">{error}</div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="rounded"
            style={{ width: '100%', maxHeight: '55vh', objectFit: 'cover', background: '#000' }}
          />
        )}
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleCapture} disabled={!ready || !!error}>
            <i className="bi bi-camera-fill me-1" />{t('profile.capturePhoto')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
