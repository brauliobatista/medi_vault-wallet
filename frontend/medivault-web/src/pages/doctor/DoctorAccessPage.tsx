import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import AccessRequestsTable, { type AccessRequestsColumn } from '../../components/AccessRequestsTable'
import { getAccessRequests } from '../../api/medical'
import { useTranslation } from '../../i18n/LanguageContext'
import type { AccessRequest } from '../../types/access'

type StatusFilter = 'approved' | 'rejected' | 'expired' | 'pending' | 'revoked' | 'finished' | 'all'

export default function DoctorAccessPage() {
  const { t } = useTranslation()
  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'approved', label: t('doctorAccess.filterApproved') },
    { value: 'rejected', label: t('doctorAccess.filterRejected') },
    { value: 'expired', label: t('doctorAccess.filterExpired') },
    { value: 'pending', label: t('doctorAccess.filterPending') },
    { value: 'revoked', label: t('doctorAccess.filterRevoked') },
    { value: 'finished', label: t('doctorAccess.filterFinished') },
    { value: 'all', label: t('doctorAccess.filterAll') },
  ]
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
    finished: 'info text-dark',
  }

  const statusLabel: Record<string, string> = {
    pending: t('doctorAccess.statusPending'),
    approved: t('doctorAccess.statusApproved'),
    rejected: t('doctorAccess.statusRejected'),
    expired: t('doctorAccess.statusExpired'),
    revoked: t('doctorAccess.statusRevoked'),
    finished: t('doctorAccess.statusFinished'),
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

  const formatDate = (value: string | null | undefined) => (value ? value.slice(0, 10) : '—')

  const columns: AccessRequestsColumn[] = [
    {
      key: 'patientName',
      label: t('doctorAccess.patientLabel'),
      sortable: true,
      sortValue: (r) => r.patientName ?? '',
      render: (r) => (
        <>
          <i className="bi bi-person me-1" />
          {r.patientName} <span className="text-muted small font-monospace">{r.patientPublicId ?? ''}</span>
        </>
      ),
    },
    {
      key: 'status',
      label: t('doctorAccess.statusLabel'),
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => <span className={`badge bg-${badgeClass[r.status] ?? 'secondary'}`}>{statusLabel[r.status] ?? r.status}</span>,
    },
    { key: 'requestedAt', label: t('doctorAccess.requestedAtLabel'), sortable: true, sortValue: (r) => r.requestedAt, render: (r) => formatDate(r.requestedAt) },
    { key: 'approvedAt', label: t('doctorAccess.approvedAtLabel'), sortable: true, sortValue: (r) => r.approvedAt ?? '', render: (r) => formatDate(r.approvedAt) },
    { key: 'expiresAt', label: t('doctorAccess.expiresAtLabel'), sortable: true, sortValue: (r) => r.expiresAt ?? '', render: (r) => formatDate(r.expiresAt) },
  ]

  const renderActions = (r: AccessRequest) =>
    r.status === 'approved' ? (
      <button
        className="btn btn-sm btn-primary"
        onClick={() => navigate(`/doctor/patient/${r.userId}`, { state: { publicId: r.patientPublicId, patientName: r.patientName } })}
      >
        <i className="bi bi-eye me-1" />{t('doctorAccess.viewData')}
      </button>
    ) : null

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="fw-semibold mb-0">{t('doctorAccess.title')}</h6>
        <button className="btn btn-outline-secondary btn-sm" onClick={refresh}>
          <i className="bi bi-arrow-clockwise me-1" />{t('doctorAccess.refresh')}
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted mb-1">{t('doctorAccess.statusLabel')}</label>
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
              <label className="form-label small text-muted mb-1">{t('doctorAccess.searchLabel')}</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={`${t('common.search')}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small text-muted mb-1">{t('doctorAccess.dateFrom')}</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small text-muted mb-1">{t('doctorAccess.dateTo')}</label>
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

      <AccessRequestsTable
        requests={filteredRequests}
        columns={columns}
        renderActions={renderActions}
        emptyMessage={t('doctorAccess.noRequests')}
      />
    </Layout>
  )
}
