import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { getAccessRequests } from '../../api/medical'

interface AccessRequest {
  id: number
  userId: string
  patientName: string
  patientPublicId: string
  utentNumber: string
  status: string
  isEmergency: boolean
  requestedAt: string
  approvedAt: string | null
  expiresAt: string | null
}

type StatusFilter = 'approved' | 'rejected' | 'expired' | 'pending' | 'revoked' | 'all'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: 'expired', label: 'Expirados' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'revoked', label: 'Revogados' },
  { value: 'all', label: 'Todos os estados' },
]

export default function DoctorAccessPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('approved')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const navigate = useNavigate()

  const refresh = useCallback(() => { getAccessRequests().then(setRequests) }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [refresh])

  const badgeClass: Record<string, string> = {
    pending: 'warning text-dark',
    approved: 'success',
    rejected: 'danger',
    expired: 'dark',
    revoked: 'secondary',
  }

  const statusLabel: Record<string, string> = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    expired: 'Expirado',
    revoked: 'Revogado',
  }

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase()
    return requests.filter((r) => {
      const statusMatch = statusFilter === 'all' ? true : r.status === statusFilter
      if (!statusMatch) return false

      if (query) {
        const haystack = `${r.patientName} ${r.patientPublicId} ${r.utentNumber ?? ''}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }

      const requestedDate = r.requestedAt.slice(0, 10)
      if (dateFrom && requestedDate < dateFrom) return false
      if (dateTo && requestedDate > dateTo) return false

      return true
    })
  }, [requests, statusFilter, search, dateFrom, dateTo])

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="fw-semibold mb-0">Pedidos de Acesso</h6>
        <button className="btn btn-outline-secondary btn-sm" onClick={refresh}>
          <i className="bi bi-arrow-clockwise me-1" />Atualizar
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted mb-1">Estado</label>
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-5">
              <label className="form-label small text-muted mb-1">Nome, nº de cartão ou nº de utente</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small text-muted mb-1">De</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small text-muted mb-1">Até</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <p className="text-muted">Sem pedidos de acesso para os filtros selecionados.</p>
      ) : (
        <div className="list-group shadow-sm">
          {filteredRequests.map((r) => (
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
