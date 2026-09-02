import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Layout from '../../components/Layout'
import {
  getSurgeries,
  getMedications,
  getAllergies,
  getAnalyticalExams,
  getVaccinations,
  getHabits,
  getProfileFor, getQrCodeFor, toggleCardFor,
  getAccessRequestsFor, respondToRequestFor, deleteRequestFor,
} from '../../api/medical'
import { mediaUrl } from '../../api/client'
import { useTranslation } from '../../i18n/LanguageContext'
import type { AccessRequest } from '../../types/access'

type TabKey = 'profile' | 'history' | 'medications' | 'allergies' | 'exams' | 'vaccinations' | 'habits' | 'access'

const badgeClass: Record<string, string> = { pending: 'warning text-dark', approved: 'success', revoked: 'secondary' }

export default function DependentViewPage() {
  const { t } = useTranslation()
  const { dependentId } = useParams<{ dependentId: string }>()
  const uid = dependentId!

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [tab, setTab] = useState<TabKey>('profile')
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [qrPayload, setQrPayload] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [cardActive, setCardActive] = useState<boolean | null>(null)
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [cardLoading, setCardLoading] = useState(false)

  const flash = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  useEffect(() => {
    getProfileFor(uid)
      .then((p) => { setProfile(p); setCardActive(Boolean(p.cardActive)) })
      .catch(() => setAccessDenied(true))
  }, [uid])

  const refreshAccess = () => {
    getAccessRequestsFor(uid).then(setRequests)
    getQrCodeFor(uid).then((d) => setQrPayload(d.payload)).finally(() => setQrLoading(false))
  }

  const loadTab = async (t: TabKey) => {
    setTab(t)
    if (t === 'history') setData(await getSurgeries(uid))
    else if (t === 'medications') setData(await getMedications(uid))
    else if (t === 'allergies') setData(await getAllergies(uid))
    else if (t === 'exams') setData(await getAnalyticalExams(uid))
    else if (t === 'vaccinations') setData(await getVaccinations(uid))
    else if (t === 'habits') setData(await getHabits(uid))
    else if (t === 'access') refreshAccess()
  }

  const handleCard = async (activate: boolean) => {
    setCardLoading(true)
    setConfirmSuspend(false)
    setCardActive(activate)
    try {
      await toggleCardFor(uid, activate)
      flash(activate ? t('access.cardActivated') : t('access.cardSuspended'))
    } catch {
      setCardActive(!activate)
    } finally {
      setCardLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    setRequests((prev) => prev.map((r) => Number(r.id) === id ? { ...r, status: 'approved' } : r))
    try {
      await respondToRequestFor(uid, id, 'approve')
      flash(t('access.approvedSuccess'))
      refreshAccess()
    } catch {
      refreshAccess()
    }
  }

  const handleRevoke = async (id: number, label: string) => {
    setRequests((prev) => prev.filter((r) => Number(r.id) !== id))
    try {
      await deleteRequestFor(uid, id)
      flash(label)
    } catch {
      refreshAccess()
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'profile',      label: t('dependentView.tabProfile') },
    { key: 'history',      label: t('medicalHistory.tabSurgeries') },
    { key: 'medications',  label: t('medicalHistory.tabMedications') },
    { key: 'allergies',    label: t('medicalHistory.tabAllergies') },
    { key: 'exams',        label: t('exams.tabAnalytical') },
    { key: 'vaccinations', label: t('dashboard.vaccinationLabel') },
    { key: 'habits',       label: t('dependentView.tabHabits') },
    { key: 'access',       label: t('dependentView.tabAccess') },
  ]

  if (accessDenied) return (
    <Layout>
      <div className="d-flex flex-column align-items-center py-5 text-center">
        <i className="bi bi-lock-fill text-danger mb-3" style={{ fontSize: '2.5rem' }} />
        <h5 className="fw-bold mb-2">{t('dependentView.noAccess')}</h5>
        <p className="text-muted mb-3">{t('dependentView.noAccessDesc')}</p>
        <Link to="/family" className="btn btn-primary btn-sm">{t('dependentView.backToFamily')}</Link>
      </div>
    </Layout>
  )

  if (!profile) return (
    <Layout>
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <Link to="/family" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1" />{t('dependentView.back')}
        </Link>
        {profile.photoUrl ? (
          <img
            src={mediaUrl(String(profile.photoUrl))}
            alt={String(profile.firstName ?? t('dependentView.familyMemberAlt'))}
            className="rounded-circle"
            style={{ width: 44, height: 44, objectFit: 'cover' }}
          />
        ) : (
          <i className="bi bi-person-vcard text-primary" style={{ fontSize: '1.75rem' }} />
        )}
        <div>
          <h5 className="mb-0 fw-semibold">
            {String(profile.firstName)} {String(profile.lastName)}
            {Boolean(profile.isDependent) && <span className="badge bg-light text-muted border ms-2">{t('family.noOwnLogin')}</span>}
          </h5>
          <small className="text-muted font-monospace">{uid}</small>
        </div>
      </div>

      {successMsg && <div className="alert alert-success py-2 mb-3">{successMsg}</div>}

      <ul className="nav nav-tabs mb-3 flex-wrap">
        {tabs.map((tabItem) => (
          <li className="nav-item" key={tabItem.key}>
            <button className={`nav-link ${tab === tabItem.key ? 'active' : ''}`} onClick={() => loadTab(tabItem.key)}>
              {tabItem.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'profile' && (
        <div className="card border-0 shadow-sm" style={{ maxWidth: 700 }}>
          <div className="card-body">
            <div className="row g-3">
              <Field label={t('profile.utentNumber')} value={String(profile.utentNumber)} />
              <Field label={t('profile.birthday')} value={String(profile.birthday)} />
              <Field label={t('profile.bloodType')} value={String(profile.bloodType ?? t('common.na'))} />
              <Field label={t('profile.email')} value={String(profile.email ?? t('common.na'))} />
              <Field label={t('profile.phone')} value={String(profile.phone ?? t('common.na'))} />
              <Field label={t('profile.profession')} value={String(profile.profession ?? t('common.na'))} />
              <Field label={t('profile.acceptsTransfusion')} value={profile.acceptsTransfusion ? t('common.yes') : t('common.no')} />
              <Field label={t('profile.acceptsResuscitation')} value={profile.acceptsResuscitation ? t('common.yes') : t('common.no')} />
            </div>
          </div>
        </div>
      )}

      {tab === 'access' && (
        <div style={{ maxWidth: 700 }}>
          {cardActive !== null && (
            <div className={`card border-0 shadow-sm mb-4 border-start border-4 ${cardActive ? 'border-success' : 'border-danger'}`}>
              <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <i className={`bi ${cardActive ? 'bi-shield-check text-success' : 'bi-shield-x text-danger'}`} style={{ fontSize: '2rem' }} />
                  <div>
                    <div className="fw-semibold">{cardActive ? t('access.cardActiveTitle') : t('access.cardSuspendedTitle')}</div>
                    <small className="text-muted">
                      {cardActive
                        ? t('dependentView.cardActiveDesc')
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

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white fw-semibold border-bottom">
              <i className="bi bi-qr-code me-2 text-primary" />
              {t('dependentView.qrTitle')}
            </div>
            <div className="card-body text-center">
              {qrLoading ? (
                <div className="spinner-border text-primary my-3" />
              ) : qrPayload ? (
                <>
                  <QRCodeSVG value={qrPayload} size={200} className="mb-3" />
                  <p className="text-muted small mb-2">
                    {t('dependentView.qrInstructions')} <strong>{t('access.qrExpiryDays')}</strong>.
                  </p>
                  <div className="d-flex justify-content-center align-items-center gap-2 mb-1">
                    <code className="bg-light border rounded px-3 py-2 fs-6 user-select-all">{qrPayload}</code>
                  </div>
                </>
              ) : (
                <p className="text-danger">{t('access.qrGenerateError')}</p>
              )}
            </div>
          </div>

          <h6 className="fw-semibold mb-1">{t('access.requestsTitle')}</h6>
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
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge bg-${badgeClass[String(r.status)] ?? 'secondary'}`}>{String(r.status)}</span>
                      {r.status === 'pending' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(Number(r.id))}>
                            <i className="bi bi-check me-1" />{t('access.approve')}
                          </button>
                          <button className="btn btn-outline-danger btn-sm" onClick={() => handleRevoke(Number(r.id), t('access.requestRejected'))}>
                            <i className="bi bi-x me-1" />{t('access.reject')}
                          </button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleRevoke(Number(r.id), t('access.accessRevoked'))}>
                          <i className="bi bi-x me-1" />{t('access.revoke')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!['profile', 'access'].includes(tab) && (
        <>
          <p className="text-muted small mb-3">
            <i className="bi bi-info-circle me-1" />{t('dependentView.infoManagedByDoctor')}
          </p>

          {data.length === 0 ? (
            <p className="text-muted">{t('patient.noRecords')}</p>
          ) : (
            <div className="list-group shadow-sm">
              {data.map((item) => (
                <div key={String(item.id)} className="list-group-item">
                  <div className="fw-semibold">
                    {tab === 'history'      && String(item.surgeryName ?? '-')}
                    {tab === 'medications'  && String(item.activeSubstance ?? '-')}
                    {tab === 'allergies'    && String(item.activeSubstance ?? '-')}
                    {tab === 'exams'        && `${String(item.examDate ?? '-')}${item.laboratory ? ' · ' + item.laboratory : ''}`}
                    {tab === 'vaccinations' && String(item.vaccineName ?? '-')}
                    {tab === 'habits'       && `${String(item.type ?? '-')}${item.name ? ' · ' + item.name : ''}`}
                  </div>
                  <small className="text-muted">
                    {tab === 'history'      && [item.surgeryDate, item.location ? '· ' + item.location : ''].filter(Boolean).join(' ')}
                    {tab === 'medications'  && [item.dose, item.posology ? '· ' + item.posology : '', item.startDate ? `· ${t('dependentView.since')} ` + item.startDate : ''].filter(Boolean).join(' ')}
                    {tab === 'allergies'    && [item.allergicReaction, item.severity ? '· ' + item.severity : ''].filter(Boolean).join(' ')}
                    {tab === 'exams'        && String(item.notes ?? '')}
                    {tab === 'vaccinations' && [item.doseNumber, item.administeredAt ? '· ' + item.administeredAt : '', item.institution ? '· ' + item.institution : ''].filter(Boolean).join(' ')}
                    {tab === 'habits'       && [item.frequency, item.quantity ? '· ' + item.quantity : ''].filter(Boolean).join(' ')}
                  </small>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-sm-6">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{value}</div>
    </div>
  )
}
