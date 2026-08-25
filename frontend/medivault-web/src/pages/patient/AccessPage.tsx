import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Layout from '../../components/Layout'
import AccessRequestsTable, { type AccessRequestsColumn } from '../../components/AccessRequestsTable'
import { getProfile, getAccessRequests, respondToRequest, deleteRequest, getQrCode, toggleCard, getGoogleWalletUrl } from '../../api/medical'
import type { AccessRequest } from '../../types/access'

export default function AccessPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
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
      setSuccessMsg(activate ? 'MediCard ativado. Os médicos aprovados voltaram a ter acesso.' : 'MediCard suspenso. Todos os médicos perderam acesso.')
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
          ? 'A Google Wallet ainda não está configurada neste servidor.'
          : 'Não foi possível gerar o cartão para a Google Wallet.'
      )
    } finally {
      setWalletLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'approved' } : r))
    try {
      await respondToRequest(id, 'approve')
      setSuccessMsg('Acesso aprovado com sucesso.')
      setTimeout(() => setSuccessMsg(null), 3000)
      refresh()
    } catch {
      refresh()
    }
  }

  const handleDelete = async (id: number, label: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id))
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
    pending: 'Pendente',
    approved: 'Aprovado',
    revoked: 'Revogado',
    expired: 'Expirado',
  }

  const formatDate = (value: string | null | undefined) => (value ? value.slice(0, 10) : '—')

  const columns: AccessRequestsColumn[] = [
    { key: 'doctorName', label: 'Médico', sortable: true, sortValue: (r) => r.doctorName ?? '', render: (r) => <span className="fw-semibold">{r.doctorName}</span> },
    {
      key: 'status',
      label: 'Estado',
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => <span className={`badge bg-${badgeClass[r.status] ?? 'secondary'}`}>{statusLabel[r.status] ?? r.status}</span>,
    },
    { key: 'requestedAt', label: 'Pedido em', sortable: true, sortValue: (r) => r.requestedAt, render: (r) => formatDate(r.requestedAt) },
    { key: 'approvedAt', label: 'Aprovado em', sortable: true, sortValue: (r) => r.approvedAt ?? '', render: (r) => formatDate(r.approvedAt) },
    { key: 'expiresAt', label: 'Expira em', sortable: true, sortValue: (r) => r.expiresAt ?? '', render: (r) => formatDate(r.expiresAt) },
  ]

  const renderActions = (r: AccessRequest) => (
    <>
      {r.status === 'pending' && (
        <>
          <button className="btn btn-success btn-sm" onClick={() => handleApprove(r.id)}>
            <i className="bi bi-check me-1" />Aprovar
          </button>
          <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(r.id, 'Pedido rejeitado.')}>
            <i className="bi bi-x me-1" />Rejeitar
          </button>
        </>
      )}
      {r.status === 'approved' && (
        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(r.id, 'Acesso revogado com sucesso.')}>
          <i className="bi bi-x me-1" />Revogar
        </button>
      )}
      {r.status === 'expired' && (
        <button className="btn btn-outline-secondary btn-sm" onClick={() => handleDelete(r.id, 'Pedido removido.')}>
          <i className="bi bi-trash me-1" />Remover
        </button>
      )}
    </>
  )

  return (
    <Layout>
      <div style={{ maxWidth: 900 }}>
        {successMsg && <div className="alert alert-success py-2 mb-3">{successMsg}</div>}

        {/* MediCard status */}
        {cardActive !== null && (
          <div className={`card border-0 shadow-sm mb-4 border-start border-4 ${cardActive ? 'border-success' : 'border-danger'}`}>
            <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <i className={`bi ${cardActive ? 'bi-shield-check text-success' : 'bi-shield-x text-danger'}`} style={{ fontSize: '2rem' }} />
                <div>
                  <div className="fw-semibold">{cardActive ? 'MediCard Ativo' : 'MediCard Suspenso'}</div>
                  <small className="text-muted">
                    {cardActive
                      ? 'Os médicos aprovados podem aceder aos seus dados.'
                      : 'Nenhum médico tem acesso enquanto o cartão estiver suspenso.'}
                  </small>
                </div>
              </div>
              <div>
                {cardActive ? (
                  confirmSuspend ? (
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="text-muted small">Confirmar suspensão?</span>
                      <button className="btn btn-danger btn-sm" disabled={cardLoading} onClick={() => handleCard(false)}>
                        Sim, suspender
                      </button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => setConfirmSuspend(false)}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-outline-danger btn-sm" onClick={() => setConfirmSuspend(true)}>
                      <i className="bi bi-lock me-1" />Suspender cartão
                    </button>
                  )
                ) : (
                  <button className="btn btn-success btn-sm" disabled={cardLoading} onClick={() => handleCard(true)}>
                    <i className="bi bi-lock-open me-1" />Ativar cartão
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
                <button className="btn btn-outline-primary btn-sm" disabled={walletLoading} onClick={handleAddToGoogleWallet}>
                  {walletLoading ? (
                    <span className="spinner-border spinner-border-sm me-2" />
                  ) : (
                    <i className="bi bi-wallet2 me-2" />
                  )}
                  Adicionar à Google Wallet
                </button>
                {walletError && <p className="text-danger small mt-2 mb-0">{walletError}</p>}
              </>
            ) : (
              <p className="text-danger">Não foi possível gerar o QR Code.</p>
            )}
          </div>
        </div>

        {/* Access requests */}
        <h6 className="fw-semibold mb-1">Pedidos de Acesso de Médicos</h6>
        <p className="text-muted small mb-3">Os médicos que pediram acesso via formulário aparecem aqui.</p>
        <AccessRequestsTable
          requests={requests}
          columns={columns}
          renderActions={renderActions}
          emptyMessage="Sem pedidos de acesso."
        />
      </div>
    </Layout>
  )
}
