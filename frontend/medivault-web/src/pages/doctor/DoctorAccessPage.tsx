import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { getAccessRequests } from '../../api/medical'

export default function DoctorAccessPage() {
  const [requests, setRequests] = useState<Record<string, unknown>[]>([])
  const navigate = useNavigate()

  useEffect(() => { getAccessRequests().then(setRequests) }, [])

  const badgeClass: Record<string, string> = {
    pending: 'warning text-dark',
    approved: 'success',
    revoked: 'secondary',
  }

  const statusLabel: Record<string, string> = {
    pending: 'Pendente',
    approved: 'Aprovado',
    revoked: 'Revogado',
  }

  return (
    <Layout>
      {requests.length === 0 ? (
        <p className="text-muted">Sem pedidos de acesso.</p>
      ) : (
        <div className="list-group shadow-sm">
          {requests.map((r) => (
            <div key={String(r.id)} className="list-group-item">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <div className="fw-semibold">
                    <i className="bi bi-person me-1" />
                    {String(r.patientName)} <span className="text-muted small font-monospace">{String(r.patientPublicId ?? '')}</span>
                  </div>
                  <small className="text-muted">
                    Pedido: {String(r.requestedAt).slice(0, 10)}
                    {r.approvedAt ? ` · Aprovado: ${String(r.approvedAt).slice(0, 10)}` : ''}
                    {r.expiresAt ? ` · Expira: ${String(r.expiresAt).slice(0, 10)}` : ''}
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge bg-${badgeClass[String(r.status)] ?? 'secondary'}`}>
                    {statusLabel[String(r.status)] ?? String(r.status)}
                  </span>
                  {r.status === 'approved' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/doctor/patient/${r.userId}`, { state: { publicId: r.patientPublicId, patientName: r.patientName } })}
                    >
                      <i className="bi bi-eye me-1" />Ver dados
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
