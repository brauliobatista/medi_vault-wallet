import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Layout from '../../components/Layout'
import { getProfile, getAccessRequests, respondToRequest, deleteRequest, getQrCode, toggleCard, getGoogleWalletUrl } from '../../api/medical'
import { useTranslation } from '../../i18n/LanguageContext'

export default function AccessPage() {
  const { t } = useTranslation()
  const [requests, setRequests] = useState<Record<string, unknown>[]>([])
  const [qrPayload, setQrPayload] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [cardActive, setCardActive] = useState<boolean | null>(null)
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [cardLoading, setCardLoading] = useState(false)
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)

  const refresh = () => getAccessRequests().then(setRequests)

  useEffect(() => {
    refresh()
    getQrCode()
      .then((d) => setQrPayload(d.payload))
      .finally(() => setQrLoading(false))
    getProfile().then((p) => setCardActive(p.cardActive))
  }, [])

  const handleCard = async (activate: boolean) => {
    setCardLoading(true)
    setConfirmSuspend(false)
    setCardActive(activate)
    try {
      await toggleCard(activate)
      setSuccessMsg(activate ? t('access.cardActivated') : t('access.cardSuspended'))
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch {
      setCardActive(!activate)
    } finally {
      setCardLoading(false)
    }
  }

  const handleAddToGoogleWallet = async () => {
    setWalletLoading(true)
    setWalletError(null)
    try {
      const { url } = await getGoogleWalletUrl()
      window.location.href = url
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      setWalletError(
        status === 501
          ? t('access.walletNotConfigured')
          : t('access.walletGenericError')
      )
    } finally {
      setWalletLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    setRequests((prev) => prev.map((r) => Number(r.id) === id ? { ...r, status: 'approved' } : r))
    try {
      await respondToRequest(id, 'approve')
      setSuccessMsg(t('access.approvedSuccess'))
      setTimeout(() => setSuccessMsg(null), 3000)
      refresh()
    } catch {
      refresh()
    }
  }

  const handleDelete = async (id: number, label: string) => {
    setRequests((prev) => prev.filter((r) => Number(r.id) !== id))
    try {
      await deleteRequest(id)
      setSuccessMsg(label)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      refresh()
    }
  }

  const badgeClass: Record<string, string> = {
    pending: 'warning text-dark',
    approved: 'success',
    revoked: 'secondary',
    expired: 'secondary',
  }

  const statusLabel: Record<string, string> = {
    pending: t('access.statusPending'),
    approved: t('access.statusApproved'),
    revoked: t('access.statusRevoked'),
    expired: t('access.statusExpired'),
  }

  return (
    <Layout>
      <div style={{ maxWidth: 700 }}>
        {successMsg && <div className="alert alert-success py-2 mb-3">{successMsg}</div>}

        {/* MediCard status */}
        {cardActive !== null && (
          <div className={`card border-0 shadow-sm mb-4 border-start border-4 ${cardActive ? 'border-success' : 'border-danger'}`}>
            <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <i className={`bi ${cardActive ? 'bi-shield-check text-success' : 'bi-shield-x text-danger'}`} style={{ fontSize: '2rem' }} />
                <div>
                  <div className="fw-semibold">{cardActive ? t('access.cardActiveTitle') : t('access.cardSuspendedTitle')}</div>
                  <small className="text-muted">
                    {cardActive
                      ? t('access.cardActiveDesc')
                      : t('access.cardSuspendedDesc')}
                  </small>
                </div>
              </div>
              <div>
                {cardActive ? (
                  confirmSuspend ? (
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="text-muted small">{t('access.confirmSuspendQuestion')}</span>
                      <button className="btn btn-danger btn-sm" disabled={cardLoading} onClick={() => handleCard(false)}>
                        {t('access.confirmSuspendYes')}
                      </button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => setConfirmSuspend(false)}>
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-outline-danger btn-sm" onClick={() => setConfirmSuspend(true)}>
                      <i className="bi bi-lock me-1" />{t('access.suspendCard')}
                    </button>
                  )
                ) : (
                  <button className="btn btn-success btn-sm" disabled={cardLoading} onClick={() => handleCard(true)}>
                    <i className="bi bi-lock-open me-1" />{t('access.activateCard')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QR Code card */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white fw-semibold border-bottom">
            <i className="bi bi-qr-code me-2 text-primary" />
            {t('access.myQrTitle')}
          </div>
          <div className="card-body text-center">
            {qrLoading ? (
              <div className="spinner-border text-primary my-3" />
            ) : qrPayload ? (
              <>
                <QRCodeSVG value={qrPayload} size={200} className="mb-3" />
                <p className="text-muted small mb-2">
                  {t('access.qrInstructions')} <strong>{t('access.qrExpiryDays')}</strong>.
                </p>
                <div className="d-flex justify-content-center align-items-center gap-2 mb-1">
                  <code className="bg-light border rounded px-3 py-2 fs-6 user-select-all">{qrPayload}</code>
                </div>
                <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {t('access.qrManualCode')}
                </p>
                <button className="btn btn-outline-primary btn-sm" disabled={walletLoading} onClick={handleAddToGoogleWallet}>
                  {walletLoading ? (
                    <span className="spinner-border spinner-border-sm me-2" />
                  ) : (
                    <i className="bi bi-wallet2 me-2" />
                  )}
                  {t('access.addToGoogleWallet')}
                </button>
                {walletError && <p className="text-danger small mt-2 mb-0">{walletError}</p>}
              </>
            ) : (
              <p className="text-danger">{t('access.qrGenerateError')}</p>
            )}
          </div>
        </div>

        {/* Access requests */}
        <h6 className="fw-semibold mb-1">{t('access.requestsTitle')}</h6>
        <p className="text-muted small mb-3">{t('access.requestsSubtitle')}</p>
        {requests.length === 0 ? (
          <p className="text-muted">{t('access.noRequests')}</p>
        ) : (
          <div className="list-group shadow-sm">
            {requests.map((r) => (
              <div key={String(r.id)} className="list-group-item">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <div className="fw-semibold">{String(r.doctorName)}</div>
                    <small className="text-muted">{t('access.requestedOn', { date: String(r.requestedAt).slice(0, 10) })}</small>
                    {Boolean(r.approvedAt) && <small className="text-muted"> · {t('access.approvedOn', { date: String(r.approvedAt).slice(0, 10) })}</small>}
                    {Boolean(r.expiresAt) && <small className="text-muted"> · {t('access.expiresOn', { date: String(r.expiresAt).slice(0, 10) })}</small>}
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge bg-${badgeClass[String(r.status)] ?? 'secondary'}`}>
                      {statusLabel[String(r.status)] ?? String(r.status)}
                    </span>
                    {r.status === 'pending' && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(Number(r.id))}>
                          <i className="bi bi-check me-1" />{t('access.approve')}
                        </button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(Number(r.id), t('access.requestRejected'))}>
                          <i className="bi bi-x me-1" />{t('access.reject')}
                        </button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(Number(r.id), t('access.accessRevoked'))}>
                        <i className="bi bi-x me-1" />{t('access.revoke')}
                      </button>
                    )}
                    {r.status === 'expired' && (
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => handleDelete(Number(r.id), t('access.requestRemoved'))}>
                        <i className="bi bi-trash me-1" />{t('access.remove')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
