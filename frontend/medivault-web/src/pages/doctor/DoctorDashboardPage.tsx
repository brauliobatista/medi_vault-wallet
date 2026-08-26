import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { scanQrCode, getAccessStatus, getFinishedConsultations, getDraftConsultations } from '../../api/medical'

interface FinishedConsultation {
  id: number
  userId: string
  patientName: string
  patientPublicId: string
  utentNumber: string
  startedAt: string
  finishedAt: string
  durationMinutes: number
}

interface DraftConsultation {
  id: number
  userId: string
  patientName: string
  patientPublicId: string
  utentNumber: string
  startedAt: string
  updatedAt: string
}

export default function DoctorDashboardPage() {
  const [utentNumber, setUtentNumber] = useState('')
  const [found, setFound] = useState<{ userId: string; name: string; publicId: string } | null>(null)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // QR scan state
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState<{ patientName: string; userId: string; publicId: string; expiresAt: string } | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanCardSuspended, setScanCardSuspended] = useState(false)
  const [foundCardSuspended, setFoundCardSuspended] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)

  const navigate = useNavigate()

  const [finishedConsultations, setFinishedConsultations] = useState<FinishedConsultation[]>([])
  useEffect(() => { getFinishedConsultations().then(setFinishedConsultations).catch(() => {}) }, [])

  const [draftConsultations, setDraftConsultations] = useState<DraftConsultation[]>([])
  useEffect(() => { getDraftConsultations().then(setDraftConsultations).catch(() => {}) }, [])

  // ── Patient search ────────────────────────────────────────────
  const handleSearch = async () => {
    if (!utentNumber.trim()) return
    setLoading(true)
    setStatus(null)
    setFound(null)
    setFoundCardSuspended(false)
    try {
      const r = await api.get(`/access-requests/search?utentNumber=${utentNumber}`)
      setFound(r.data)
      const s = await getAccessStatus(r.data.userId).catch(() => ({ reason: 'granted' }))
      setFoundCardSuspended(s.reason === 'card_suspended')
    } catch {
      setStatus({ type: 'error', msg: 'Utente não encontrado. Verifique o número.' })
    } finally {
      setLoading(false)
    }
  }

  const handleRequestAccess = async () => {
    if (!found) return
    try {
      await api.post(`/access-requests/${found.userId}`)
      setStatus({ type: 'success', msg: `Pedido enviado a ${found.name}. Aguarde aprovação.` })
    } catch {
      setStatus({ type: 'error', msg: 'Não foi possível enviar o pedido.' })
    }
  }

  const handleViewData = () => {
    if (!found) return
    navigate(`/doctor/patient/${found.userId}`, { state: { publicId: found.publicId, patientName: found.name } })
  }

  // ── QR scan (camera) ──────────────────────────────────────────
  const startCamera = async () => {
    setScanResult(null)
    setScanError(null)
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        rafRef.current = requestAnimationFrame(tick)
      }
    } catch {
      setScanError('Não foi possível aceder à câmara.')
      setScanning(false)
    }
  }

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  const tick = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(img.data, img.width, img.height)
    if (code) {
      stopCamera()
      submitQrCode(code.data)
    } else {
      rafRef.current = requestAnimationFrame(tick)
    }
  }

  const submitQrCode = async (code: string) => {
    setScanError(null)
    setScanCardSuspended(false)
    try {
      const r = await scanQrCode(code)
      setScanResult({ patientName: r.patientName, userId: r.userId, publicId: r.publicId ?? '', expiresAt: r.expiresAt })
    } catch (err: unknown) {
      const httpStatus = (err as { response?: { status?: number } })?.response?.status
      if (httpStatus === 423) {
        setScanCardSuspended(true)
      } else {
        setScanError('QR Code inválido ou sem correspondência.')
      }
    }
  }

  const handleManualScan = () => {
    if (!manualCode.trim()) return
    submitQrCode(manualCode.trim())
  }

  return (
    <Layout>
      <div style={{ maxWidth: 720 }}>
        {/* QR Code scanner */}
        <div className="dash-card mb-4">
          <div className="dash-card-header">
            <div className="dash-card-heading">
              <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-qr-code-scan" /></span>
              <span className="dash-card-title">Ler QR Code do Utente</span>
            </div>
          </div>

          {scanResult ? (
            <div className="consult-context-item context-teal">
              <i className="bi bi-check-circle-fill" />
              <div className="flex-grow-1">
                <div className="consult-context-title">Acesso concedido</div>
                <div className="consult-context-value">{scanResult.patientName}</div>
                <div className="consult-context-sub">Expira: {scanResult.expiresAt.slice(0, 10)}</div>
                <div className="mt-2 d-flex gap-2">
                  <button
                    className="consult-finish-btn"
                    onClick={() => navigate(`/doctor/patient/${scanResult.userId}`, { state: { publicId: scanResult.publicId, patientName: scanResult.patientName } })}
                  >
                    <i className="bi bi-eye" />Ver dados
                  </button>
                  <button className="dash-toolbar-btn" onClick={() => { setScanResult(null); setManualCode('') }}>
                    Novo scan
                  </button>
                </div>
              </div>
            </div>
          ) : scanCardSuspended ? (
            <div className="consult-context-item context-danger">
              <i className="bi bi-shield-x" />
              <div className="flex-grow-1">
                <div className="consult-context-title">MediCard suspenso</div>
                <div className="consult-context-value">O utente suspendeu o seu cartão.</div>
                <div className="consult-context-sub">Não é possível aceder aos dados enquanto o cartão estiver inativo.</div>
                <div className="mt-2">
                  <button className="dash-toolbar-btn" onClick={() => { setScanCardSuspended(false); setManualCode('') }}>
                    Novo scan
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {scanError && (
                <div className="consult-context-item context-danger mb-3">
                  <i className="bi bi-exclamation-triangle-fill" />
                  <div className="consult-context-value">{scanError}</div>
                </div>
              )}
              {scanning ? (
                <div className="text-center">
                  <video ref={videoRef} className="w-100 rounded mb-2" style={{ maxHeight: 260 }} muted playsInline />
                  <canvas ref={canvasRef} className="d-none" />
                  <p className="consult-context-sub mb-2">A detetar QR code…</p>
                  <button className="dash-toolbar-btn" onClick={stopCamera}>
                    <i className="bi bi-x-circle" />Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <canvas ref={canvasRef} className="d-none" />
                  <button className="consult-finish-btn mb-3" onClick={startCamera}>
                    <i className="bi bi-camera-video" />Abrir câmara
                  </button>
                  <div className="consult-context-sub mb-2">ou introduza o código manualmente:</div>
                  <div className="input-group">
                    <input
                      className="form-control font-monospace"
                      placeholder="MV:uuid:ABCDEF123456"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                    />
                    <button className="dash-toolbar-btn" onClick={handleManualScan}>
                      <i className="bi bi-check-lg" />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Search by utent number */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-heading">
              <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-search" /></span>
              <span className="dash-card-title">Pesquisar utente por número</span>
            </div>
          </div>

          <div className="input-group mb-3">
            <input
              className="form-control"
              placeholder="Número de utente (ex: 100000001)"
              value={utentNumber}
              onChange={(e) => { setUtentNumber(e.target.value); setFound(null); setStatus(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="consult-finish-btn" onClick={handleSearch} disabled={loading}>
              {loading
                ? <span className="spinner-border spinner-border-sm" />
                : <><i className="bi bi-search" />Pesquisar</>}
            </button>
          </div>

          {status && (
            <div className={`consult-context-item ${status.type === 'success' ? 'context-teal' : status.type === 'info' ? 'context-primary' : 'context-danger'}`}>
              <i className={`bi ${status.type === 'success' ? 'bi-check-circle-fill' : status.type === 'info' ? 'bi-info-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
              <div className="consult-context-value">{status.msg}</div>
            </div>
          )}

          {found && (
            <>
              {foundCardSuspended && (
                <div className="consult-context-item context-danger mb-2">
                  <i className="bi bi-shield-x" />
                  <div className="consult-context-value">
                    <strong>MediCard suspenso.</strong> O utente suspendeu o seu cartão — não é possível aceder aos dados enquanto estiver inativo.
                  </div>
                </div>
              )}
              <div className="consult-context-item context-plain">
                <i className="bi bi-person-circle" />
                <div className="flex-grow-1 d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <div className="consult-context-value fw-semibold">{found.name}</div>
                    <div className="consult-context-sub font-monospace">{found.publicId}</div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="dash-toolbar-btn" onClick={handleRequestAccess}>
                      <i className="bi bi-send" />Pedir acesso
                    </button>
                    {!foundCardSuspended && (
                      <button className="consult-finish-btn" onClick={handleViewData}>
                        <i className="bi bi-eye" />Ver dados
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Draft consultations (standby) */}
        {draftConsultations.length > 0 && (
          <div className="dash-card mt-4">
            <div className="dash-card-header">
              <div className="dash-card-heading">
                <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-hourglass-split" /></span>
                <span className="dash-card-title">Rascunhos de Consultas</span>
              </div>
            </div>

            {draftConsultations.map((c) => (
              <div className="consult-context-item context-plain" key={c.id}>
                <i className="bi bi-person-circle" />
                <div className="flex-grow-1 d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <div className="consult-context-value fw-semibold">{c.patientName}</div>
                    <div className="consult-context-sub font-monospace">{c.patientPublicId} · Nº utente: {c.utentNumber}</div>
                    <div className="consult-context-sub">
                      Em standby desde {c.updatedAt.slice(0, 10)}
                    </div>
                  </div>
                  <button
                    className="consult-finish-btn"
                    onClick={() => navigate(`/doctor/patient/${c.userId}`, {
                      state: {
                        publicId: c.patientPublicId, patientName: c.patientName,
                        consultationId: c.id, startedAt: c.startedAt,
                      },
                    })}
                  >
                    <i className="bi bi-play-fill" />Retomar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Finished consultations */}
        {finishedConsultations.length > 0 && (
          <div className="dash-card mt-4">
            <div className="dash-card-header">
              <div className="dash-card-heading">
                <span className="dash-card-icon dash-card-icon-blue"><i className="bi bi-clipboard2-check" /></span>
                <span className="dash-card-title">Consultas Finalizadas</span>
              </div>
            </div>

            {finishedConsultations.map((c) => (
              <div className="consult-context-item context-plain" key={c.id}>
                <i className="bi bi-person-circle" />
                <div className="flex-grow-1 d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <div className="consult-context-value fw-semibold">{c.patientName}</div>
                    <div className="consult-context-sub font-monospace">{c.patientPublicId} · Nº utente: {c.utentNumber}</div>
                    <div className="consult-context-sub">
                      {c.finishedAt.slice(0, 10)} · {c.durationMinutes} min
                    </div>
                  </div>
                  <button
                    className="dash-toolbar-btn"
                    onClick={() => navigate(`/doctor/finished-consultation/${c.id}`, {
                      state: {
                        patientName: c.patientName, userId: c.userId, patientPublicId: c.patientPublicId,
                        utentNumber: c.utentNumber, durationMinutes: c.durationMinutes,
                        startedAt: c.startedAt, finishedAt: c.finishedAt,
                      },
                    })}
                  >
                    <i className="bi bi-eye" />Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
