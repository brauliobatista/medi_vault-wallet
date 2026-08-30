import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import {
  getFamily, getPendingInvitations, getRelationshipTypes, getGenders,
  searchUserByEmail, inviteByEmail, createDependent,
  respondToGuardianship, removeGuardianship,
} from '../../api/family'
import { useTranslation } from '../../i18n/LanguageContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RelationshipType = { id: number; code: string; description: string | null }
type Gender = { id: number; code: string; description: string | null }

export default function FamilyPage() {
  const { t } = useTranslation()

  const relationshipLabels: Record<string, string> = {
    parent: t('family.relationshipParent'),
    legal_guardian: t('family.relationshipLegalGuardian'),
    tutor: t('family.relationshipTutor'),
    other: t('family.relationshipOther'),
  }

  const biologicalGenderLabels: Record<string, string> = { M: t('profile.genderMale'), F: t('profile.genderFemale') }

  const [family, setFamily] = useState<Record<string, unknown>[]>([])
  const [invitations, setInvitations] = useState<Record<string, unknown>[]>([])
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([])
  const [genders, setGenders] = useState<Gender[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)

  const [email, setEmail] = useState('')
  const [relationshipTypeId, setRelationshipTypeId] = useState<number | ''>('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [foundUser, setFoundUser] = useState<{ userId: string; name: string } | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ firstName: '', lastName: '', birthday: '', biologicalGender: 'M', sex: 'M' })

  const refresh = () => {
    getFamily().then(setFamily)
    getPendingInvitations().then(setInvitations)
  }

  useEffect(() => {
    refresh()
    getRelationshipTypes().then(setRelationshipTypes)
    getGenders().then(setGenders)
  }, [])

  const flash = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const resetAddForm = () => {
    setEmail('')
    setRelationshipTypeId('')
    setSearchError(null)
    setFoundUser(null)
    setShowCreateForm(false)
    setCreateForm({ firstName: '', lastName: '', birthday: '', biologicalGender: 'M', sex: 'M' })
  }

  const handleCreateDirectly = () => {
    setSearchError(null)
    setFoundUser(null)
    setShowCreateForm(true)
  }

  const handleSearch = async () => {
    setSearchError(null)
    setFoundUser(null)
    setShowCreateForm(false)
    if (!EMAIL_RE.test(email.trim())) {
      setSearchError(t('family.invalidEmail'))
      return
    }
    if (relationshipTypeId === '') {
      setSearchError(t('family.selectRelationshipType'))
      return
    }
    setSearching(true)
    try {
      const result = await searchUserByEmail(email.trim())
      setFoundUser(result)
    } catch {
      setShowCreateForm(true)
    } finally {
      setSearching(false)
    }
  }

  const handleInvite = async () => {
    if (relationshipTypeId === '') return
    try {
      await inviteByEmail(email.trim(), Number(relationshipTypeId))
      flash(t('family.inviteSent'))
      resetAddForm()
      refresh()
    } catch {
      setSearchError(t('family.inviteError'))
    }
  }

  const handleCreateDependent = async () => {
    if (relationshipTypeId === '') {
      setSearchError(t('family.selectRelationshipType'))
      return
    }
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.birthday) {
      setSearchError(t('family.fillRequiredFields'))
      return
    }
    try {
      await createDependent({ ...createForm, relationshipTypeId: Number(relationshipTypeId) })
      flash(t('family.profileCreated'))
      resetAddForm()
      refresh()
    } catch {
      setSearchError(t('family.createProfileError'))
    }
  }

  const handleRespond = async (id: number, action: 'approve' | 'decline') => {
    setInvitations((prev) => prev.filter((i) => Number(i.guardianshipId) !== id))
    try {
      await respondToGuardianship(id, action)
      flash(action === 'approve' ? t('family.inviteAccepted') : t('family.inviteDeclined'))
      refresh()
    } catch {
      refresh()
    }
  }

  const handleRemove = async (id: number) => {
    setConfirmRemove(null)
    setFamily((prev) => prev.filter((f) => Number(f.guardianshipId) !== id))
    try {
      await removeGuardianship(id)
      flash(t('family.removedFromHousehold'))
    } catch {
      refresh()
    }
  }

  const badgeClass: Record<string, string> = { pending: 'warning text-dark', approved: 'success' }

  return (
    <Layout>
      <div style={{ maxWidth: 700 }}>
        {successMsg && <div className="alert alert-success py-2 mb-3">{successMsg}</div>}

        {invitations.length > 0 && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white fw-semibold border-bottom">
              <i className="bi bi-envelope-paper me-2 text-primary" />
              {t('family.invitationsReceived')}
            </div>
            <div className="list-group list-group-flush">
              {invitations.map((i) => (
                <div key={String(i.guardianshipId)} className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <div className="fw-semibold">{String(i.name)}</div>
                    <small className="text-muted">
                      {t('family.wantsToAddAs', { relationship: relationshipLabels[String(i.relationshipCode)] ?? String(i.relationshipCode) })}
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-success btn-sm" onClick={() => handleRespond(Number(i.guardianshipId), 'approve')}>
                      <i className="bi bi-check me-1" />{t('family.accept')}
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => handleRespond(Number(i.guardianshipId), 'decline')}>
                      <i className="bi bi-x me-1" />{t('family.decline')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white fw-semibold border-bottom">
            <i className="bi bi-people me-2 text-primary" />
            {t('family.myHousehold')}
          </div>
          {family.length === 0 ? (
            <div className="card-body">
              <p className="text-muted mb-0">{t('family.emptyHousehold')}</p>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {family.map((f) => (
                <div key={String(f.guardianshipId)} className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <div className="fw-semibold">
                      {String(f.name)}
                      {Boolean(f.isDependent) && <span className="badge bg-light text-muted border ms-2">{t('family.noOwnLogin')}</span>}
                    </div>
                    <small className="text-muted">{relationshipLabels[String(f.relationshipCode)] ?? String(f.relationshipCode)}</small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge bg-${badgeClass[String(f.status)] ?? 'secondary'}`}>{String(f.status)}</span>
                    {String(f.status) === 'approved' && (
                      <Link to={`/family/${String(f.userId)}`} className="btn btn-outline-primary btn-sm">
                        <i className="bi bi-eye me-1" />{t('family.access')}
                      </Link>
                    )}
                    {confirmRemove === Number(f.guardianshipId) ? (
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small">{t('family.removeConfirm')}</span>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRemove(Number(f.guardianshipId))}>{t('common.yes')}</button>
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => setConfirmRemove(null)}>{t('common.cancel')}</button>
                      </div>
                    ) : (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => setConfirmRemove(Number(f.guardianshipId))}>
                        <i className="bi bi-x me-1" />{t('family.remove')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white fw-semibold border-bottom">
            <i className="bi bi-person-plus me-2 text-primary" />
            {t('family.addFamilyMember')}
          </div>
          <div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-md-6">
                <label className="form-label small text-muted">{t('family.emailLabel')}</label>
                <input
                  type="email"
                  className="form-control form-control-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('family.emailPlaceholder')}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small text-muted">{t('family.relationshipLabel')}</label>
                <select
                  className="form-select form-select-sm"
                  value={relationshipTypeId}
                  onChange={(e) => setRelationshipTypeId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">{t('family.selectPlaceholder')}</option>
                  {relationshipTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{relationshipLabels[rt.code] ?? rt.code}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <button className="btn btn-primary btn-sm w-100" disabled={searching} onClick={handleSearch}>
                  {searching ? <span className="spinner-border spinner-border-sm" /> : t('common.search')}
                </button>
              </div>
            </div>

            <button className="btn btn-link btn-sm ps-0 mt-2" onClick={handleCreateDirectly}>
              <i className="bi bi-person-plus me-1" />{t('family.noEmailCreateProfile')}
            </button>

            {searchError && <div className="alert alert-danger py-2 mt-2 mb-0">{searchError}</div>}

            {foundUser && (
              <div className="alert alert-light border d-flex justify-content-between align-items-center mt-3 mb-0">
                <span><i className="bi bi-person-check me-2 text-success" />{foundUser.name}</span>
                <button className="btn btn-success btn-sm" onClick={handleInvite}>
                  <i className="bi bi-send me-1" />{t('family.invite')}
                </button>
              </div>
            )}

            {showCreateForm && (
              <div className="border rounded p-3 mt-3">
                <p className="text-muted small mb-3">
                  {email.trim()
                    ? t('family.noEmailFoundCreatePrompt')
                    : t('family.createProfilePrompt')}
                </p>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label small text-muted">{t('family.firstName')}</label>
                    <input className="form-control form-control-sm" value={createForm.firstName}
                      onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small text-muted">{t('family.lastName')}</label>
                    <input className="form-control form-control-sm" value={createForm.lastName}
                      onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">{t('family.birthdayLabel')}</label>
                    <input type="date" className="form-control form-control-sm" value={createForm.birthday}
                      onChange={(e) => setCreateForm({ ...createForm, birthday: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">{t('family.biologicalGenderLabel')}</label>
                    <select className="form-select form-select-sm" value={createForm.biologicalGender}
                      onChange={(e) => setCreateForm({ ...createForm, biologicalGender: e.target.value })}>
                      {Object.entries(biologicalGenderLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">{t('family.sexLabel')}</label>
                    <select className="form-select form-select-sm" value={createForm.sex}
                      onChange={(e) => setCreateForm({ ...createForm, sex: e.target.value })}>
                      {genders.map((g) => (
                        <option key={g.id} value={g.code}>{g.description ?? g.code}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">{t('family.relationshipTypeRequired')}</label>
                    <select
                      className="form-select form-select-sm"
                      value={relationshipTypeId}
                      onChange={(e) => setRelationshipTypeId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">{t('family.selectPlaceholder')}</option>
                      {relationshipTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>{relationshipLabels[rt.code] ?? rt.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm mt-3" onClick={handleCreateDependent}>
                  <i className="bi bi-plus-lg me-1" />{t('family.createAndAdd')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
