import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Navbar from '../../components/Navbar'
import { getAccessRequests, respondToRequest, getQrCode } from '../../api/medical'

export default function AccessPage() {
  const [requests, setRequests] = useState<Record<string, unknown>[]>([])
  const [qrPayload, setQrPayload] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(true)

  const refresh = () => getAccessRequests().then(setRequests)

  useEffect(() => {
    refresh()
    getQrCode()
      .then((d) => setQrPayload(d.payload))
      .finally(() => setQrLoading(false))
  }, [])

  const handle = async (id: number, action: 'approve' | 'revoke') => {
    await respondToRequest(id, action)
    refresh()
  }

  const badgeClass: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    revoked: 'secondary',
  }

  return (
    <>
      <Navbar />
      <div className="container mt-4" style={{ maxWidth: 700 }}>

        {/* QR Code card */}
        <div className="card mb-4 border-primary">
          <div className="card-header fw-semibold">
            <i className="bi bi-qr-code me-2 text-primary" />
            O meu QR Code de Acesso
          </div>
          <div className="card-body text-center">
            {qrLoading ? (
              <div className="spinner-border text-primary my-3" />
            ) : qrPayload ? (
              <>
                <QRCodeSVG value={qrPayload} size={200} className="mb-3" />
                <p className="text-muted small mb-2">
                  Mostre este código ao seu médico para partilhar o acesso imediatamente.
                  O acesso expira após <strong>7 dias</strong>.
                </p>
                <div className="d-flex justify-content-center align-items-center gap-2 mb-1">
                  <code className="bg-light border rounded px-3 py-2 fs-6 user-select-all">{qrPayload}</code>
                </div>
                <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                  Se o médico não conseguir ler o QR, pode introduzir o código acima manualmente.
                </p>
              </>
            ) : (
              <p className="text-danger">Não foi possível gerar o QR Code.</p>
            )}
          </div>
        </div>

        {/* Pending requests */}
        <h5 className="mb-3"><i className="bi bi-key me-2 text-secondary" />Pedidos de Acesso de Médicos</h5>
        <p className="text-muted small">Os médicos que pediram acesso via formulário aparecem aqui.</p>
        {requests.length === 0 ? (
          <p className="text-muted">Sem pedidos de acesso.</p>
        ) : (
          <div className="list-group">
            {requests.map((r) => (
              <div key={String(r.id)} className="list-group-item">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <div className="fw-semibold">{String(r.doctorName)}</div>
                    <small className="text-muted">Pedido em: {String(r.requestedAt).slice(0, 10)}</small>
                    {r.approvedAt && <small className="text-muted"> · Aprovado: {String(r.approvedAt).slice(0, 10)}</small>}
                    {r.expiresAt && <small className="text-muted"> · Expira: {String(r.expiresAt).slice(0, 10)}</small>}
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge bg-${badgeClass[String(r.status)] ?? 'secondary'}`}>
                      {String(r.status)}
                    </span>
                    {r.status === 'pending' && (
                      <button className="btn btn-success btn-sm" onClick={() => handle(Number(r.id), 'approve')}>
                        <i className="bi bi-check me-1" />Aprovar
                      </button>
                    )}
                    {r.status === 'approved' && (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handle(Number(r.id), 'revoke')}>
                        <i className="bi bi-x me-1" />Revogar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
