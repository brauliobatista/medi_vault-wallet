import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { scanQrCode, getAccessStatus } from '../../api/medical'

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
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 423) {
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
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white fw-semibold border-bottom">
            <i className="bi bi-qr-code-scan me-2 text-success" />
            Ler QR Code do Utente
          </div>
          <div className="card-body">
            {scanResult ? (
              <div className="alert alert-success mb-0">
                <i className="bi bi-check-circle me-2" />
                <strong>Acesso concedido!</strong> Utente: <strong>{scanResult.patientName}</strong>
                <br />
                <small className="text-muted">Expira: {scanResult.expiresAt.slice(0, 10)}</small>
                <div className="mt-2 d-flex gap-2">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => navigate(`/doctor/patient/${scanResult.userId}`, { state: { publicId: scanResult.publicId, patientName: scanResult.patientName } })}
                  >
                    <i className="bi bi-eye me-1" />Ver dados
                  </button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => { setScanResult(null); setManualCode('') }}>
                    Novo scan
                  </button>
                </div>
              </div>
            ) : scanCardSuspended ? (
              <div className="alert alert-warning mb-0">
                <i className="bi bi-shield-x me-2" />
                <strong>MediCard suspenso.</strong> O utente suspendeu o seu cartão.
                <br />
                <small>Não é possível aceder aos dados enquanto o cartão estiver inativo.</small>
                <div className="mt-2">
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => { setScanCardSuspended(false); setManualCode('') }}>
                    Novo scan
                  </button>
                </div>
              </div>
            ) : (
              <>
                {scanError && <div className="alert alert-danger py-2 mb-3">{scanError}</div>}
                {scanning ? (
                  <div className="text-center">
                    <video ref={videoRef} className="w-100 rounded mb-2" style={{ maxHeight: 260 }} muted playsInline />
                    <canvas ref={canvasRef} className="d-none" />
                    <p className="text-muted small mb-2">A detetar QR code…</p>
                    <button className="btn btn-outline-secondary btn-sm" onClick={stopCamera}>
                      <i className="bi bi-x-circle me-1" />Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <canvas ref={canvasRef} className="d-none" />
                    <button className="btn btn-success mb-3" onClick={startCamera}>
                      <i className="bi bi-camera-video me-2" />Abrir câmara
                    </button>
                    <div className="text-muted small mb-2">ou introduza o código manualmente:</div>
                    <div className="input-group">
                      <input
                        className="form-control font-monospace"
                        placeholder="MV:uuid:ABCDEF123456"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                      />
                      <button className="btn btn-outline-success" onClick={handleManualScan}>
                        <i className="bi bi-check-lg" />
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Search by utent number */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white fw-semibold border-bottom">
            <i className="bi bi-search me-2" />Pesquisar utente por número
          </div>
          <div className="card-body">
            <div className="input-group mb-3">
              <input
                className="form-control"
                placeholder="Número de utente (ex: 100000001)"
                value={utentNumber}
                onChange={(e) => { setUtentNumber(e.target.value); setFound(null); setStatus(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn btn-outline-primary" onClick={handleSearch} disabled={loading}>
                {loading
                  ? <span className="spinner-border spinner-border-sm" />
                  : <><i className="bi bi-search me-1" />Pesquisar</>}
              </button>
            </div>

            {status && (
              <div className={`alert alert-${status.type === 'success' ? 'success' : status.type === 'info' ? 'info' : 'danger'} py-2`}>
                {status.msg}
              </div>
            )}

            {found && (
              <>
                {foundCardSuspended && (
                  <div className="alert alert-warning py-2 mb-2">
                    <i className="bi bi-shield-x me-2" />
                    <strong>MediCard suspenso.</strong> O utente suspendeu o seu cartão — não é possível aceder aos dados enquanto estiver inativo.
                  </div>
                )}
                <div className="alert alert-light border d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <i className="bi bi-person-circle me-2 text-primary" />
                    <strong>{found.name}</strong>
                    <span className="text-muted ms-2 small font-monospace">{found.publicId}</span>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary btn-sm" onClick={handleRequestAccess}>
                      <i className="bi bi-send me-1" />Pedir acesso
                    </button>
                    {!foundCardSuspended && (
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/doctor/patient/${found!.userId}`, { state: { publicId: found!.publicId, patientName: found!.name } })}>
                        <i className="bi bi-eye me-1" />Ver dados
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
