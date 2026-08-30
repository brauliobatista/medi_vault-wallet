import { useEffect, useRef, useState } from 'react'
import Layout from '../../components/Layout'
import LanguageSelector from '../../components/LanguageSelector'
import Modal from '../../components/Modal'
import { getProfile, updateProfile, uploadProfilePhoto, deleteProfilePhoto, changePassword } from '../../api/medical'
import { logout } from '../../hooks/useAuth'
import { useTranslation } from '../../i18n/LanguageContext'
import { isLanguage, type Language } from '../../i18n/languages'

const LOGOUT_AFTER_PASSWORD_CHANGE_DELAY_MS = 1200

const CRITICAL_FIELD_WARNINGS: Record<string, string> = {
  acceptsTransfusion: 'Está prestes a alterar a sua preferência sobre a aceitação de transfusões de sangue. Esta informação é usada pelas equipas médicas em situações de emergência.',
  acceptsResuscitation: 'Está prestes a alterar a sua preferência sobre manobras de reanimação. Esta informação é usada pelas equipas médicas em situações de emergência.',
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saved, setSaved] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwOk, setPwOk] = useState(false)
  const [pendingCritical, setPendingCritical] = useState<{ field: string; value: boolean } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p)
      setForm({
        email: p.email,
        phone: p.phone ?? '',
        profession: p.profession ?? '',
        maritalStatus: p.maritalStatus ?? '',
        acceptsTransfusion: p.acceptsTransfusion,
        acceptsResuscitation: p.acceptsResuscitation,
        emergencyAccess: p.emergencyAccess,
        biologicalGender: p.biologicalGender ?? '',
        sexId: p.sexId ?? '',
      })
    })
  }, [])

  const handleSave = async () => {
    await updateProfile(form)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    const p = await getProfile()
    setProfile(p)
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)
    setPhotoUploading(true)
    try {
      await uploadProfilePhoto(file)
      const p = await getProfile()
      setProfile(p)
    } catch {
      setPhotoError(t('profile.photoUploadError'))
    } finally {
      setPhotoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handlePhotoRemove = async () => {
    if (!confirm(t('profile.confirmRemovePhoto'))) return
    await deleteProfilePhoto()
    const p = await getProfile()
    setProfile(p)
  }

  const handleLanguageSave = async (lang: Language) => {
    await updateProfile({ language: lang })
  }

  const handlePassword = async () => {
    setPwError('')
    setPwOk(false)
    if (pwForm.next !== pwForm.confirm) { setPwError(t('profile.passwordMismatch')); return }
    if (pwForm.next.length < 6) { setPwError(t('profile.passwordTooShort')); return }
    try {
      await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next })
      setPwOk(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setShowPw(false)
      setTimeout(logout, LOGOUT_AFTER_PASSWORD_CHANGE_DELAY_MS)
    } catch {
      setPwError(t('profile.currentPasswordWrong'))
    }
  }

  const handleCriticalFieldChange = (field: string, value: boolean) => {
    setPendingCritical({ field, value })
  }

  const confirmCriticalChange = () => {
    if (!pendingCritical) return
    setForm({ ...form, [pendingCritical.field]: pendingCritical.value })
    setPendingCritical(null)
  }

  const cancelCriticalChange = () => {
    setPendingCritical(null)
  }

  if (!profile) return (
    <Layout>
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div style={{ maxWidth: 700 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0 fw-semibold">{t('profile.personalInfo')}</h5>
          <button className="btn btn-outline-primary btn-sm" onClick={() => setEditing(!editing)}>
            <i className={`bi ${editing ? 'bi-x' : 'bi-pencil'} me-1`} />
            {editing ? t('common.cancel') : t('common.edit')}
          </button>
        </div>
        {saved && <div className="alert alert-success py-2">{t('common.savedSuccess')}</div>}
        {pwOk && <div className="alert alert-success py-2">{t('profile.passwordChangedSuccess')}</div>}

        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body d-flex align-items-center gap-3 flex-wrap">
            {profile.photoUrl ? (
              <img
                src={String(profile.photoUrl)}
                alt={t('profile.photoAlt')}
                className="rounded-circle"
                style={{ width: 80, height: 80, objectFit: 'cover' }}
              />
            ) : (
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                style={{ width: 80, height: 80, fontSize: '1.75rem' }}
              >
                {String(profile.firstName ?? 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                className="d-none"
                onChange={handlePhotoSelect}
              />
              <button
                className="btn btn-outline-primary btn-sm me-2"
                disabled={photoUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoUploading
                  ? <span className="spinner-border spinner-border-sm" />
                  : <><i className="bi bi-camera me-1" />{profile.photoUrl ? t('profile.changePhoto') : t('profile.addPhoto')}</>}
              </button>
              {Boolean(profile.photoUrl) && (
                <button className="btn btn-outline-danger btn-sm" onClick={handlePhotoRemove}>
                  <i className="bi bi-trash me-1" />{t('profile.removePhoto')}
                </button>
              )}
              {photoError && <div className="text-danger small mt-1">{photoError}</div>}
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="row g-3">
              <Field label={t('profile.utentNumber')} value={String(profile.utentNumber)} />
              <Field label={t('profile.name')} value={`${profile.firstName} ${profile.lastName}`} />
              <Field label={t('profile.birthday')} value={String(profile.birthday)} />
              <Field label={t('profile.bloodType')} value={String(profile.bloodType ?? t('common.na'))} />
              <Field label={t('profile.nationality')} value={String(profile.nationalityName ?? t('common.na'))} />
              <SelectField
                label={t('profile.biologicalGender')}
                field="biologicalGender"
                form={form}
                setForm={setForm}
                editing={editing}
                naLabel={t('common.na')}
                selectLabel={t('common.select')}
                options={[
                  { value: 'M', label: t('profile.genderMale') },
                  { value: 'F', label: t('profile.genderFemale') },
                ]}
              />
              <SelectField
                label={t('profile.gender')}
                field="sexId"
                form={form}
                setForm={setForm}
                editing={editing}
                numeric
                naLabel={t('common.na')}
                selectLabel={t('common.select')}
                options={[
                  { value: '1', label: t('profile.genderMale') },
                  { value: '2', label: t('profile.genderFemale') },
                  { value: '3', label: t('profile.genderOther') },
                ]}
              />
              <EditableField label={t('profile.email')} field="email" form={form} setForm={setForm} editing={editing} naLabel={t('common.na')} />
              <EditableField label={t('profile.phone')} field="phone" form={form} setForm={setForm} editing={editing} naLabel={t('common.na')} />
              <EditableField label={t('profile.profession')} field="profession" form={form} setForm={setForm} editing={editing} naLabel={t('common.na')} />
              <LanguageSelector value={(isLanguage(String(profile.language)) ? profile.language : 'pt') as Language} onSave={handleLanguageSave} />
              <div className="col-12">
                <div className="row g-2">
                  <CheckField label={t('profile.acceptsTransfusion')} field="acceptsTransfusion" form={form} setForm={setForm} editing={editing} onCriticalChange={handleCriticalFieldChange} />
                  <CheckField label={t('profile.acceptsResuscitation')} field="acceptsResuscitation" form={form} setForm={setForm} editing={editing} onCriticalChange={handleCriticalFieldChange} />
                  <CheckField label={t('profile.emergencyAccess')} field="emergencyAccess" form={form} setForm={setForm} editing={false} />
                </div>
              </div>
            </div>
            {editing && (
              <div className="mt-3">
                <button className="btn btn-primary" onClick={handleSave}>{t('common.save')}</button>
              </div>
            )}
          </div>
        </div>

        <div className="card border-0 shadow-sm mt-3">
          <div
            className="card-header bg-white d-flex justify-content-between align-items-center"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowPw(!showPw)}
          >
            <span><i className="bi bi-lock me-2" />{t('profile.changePassword')}</span>
            <i className={`bi bi-chevron-${showPw ? 'up' : 'down'}`} />
          </div>
          {showPw && (
            <div className="card-body">
              {pwError && <div className="alert alert-danger py-2">{pwError}</div>}
              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label small">{t('profile.currentPassword')}</label>
                  <input type="password" className="form-control form-control-sm" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small">{t('profile.newPassword')}</label>
                  <input type="password" className="form-control form-control-sm" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small">{t('profile.confirmPassword')}</label>
                  <input type="password" className="form-control form-control-sm" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
                </div>
                <div className="col-12 mt-1">
                  <button className="btn btn-primary btn-sm" onClick={handlePassword}>{t('profile.changePassword')}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {pendingCritical && (
          <Modal title="Confirmar alteração" onClose={cancelCriticalChange}>
            <p>{CRITICAL_FIELD_WARNINGS[pendingCritical.field]}</p>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary btn-sm" onClick={cancelCriticalChange}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={confirmCriticalChange}>Confirmar</button>
            </div>
          </Modal>
        )}
      </div>
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

function EditableField({ label, field, form, setForm, editing, naLabel }: {
  label: string; field: string; form: Record<string, unknown>; setForm: (f: Record<string, unknown>) => void; editing: boolean; naLabel: string
}) {
  return (
    <div className="col-sm-6">
      <label className="form-label text-muted small mb-0">{label}</label>
      {editing ? (
        <input
          className="form-control form-control-sm"
          value={String(form[field] ?? '')}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        />
      ) : (
        <div className="fw-semibold">{String(form[field] || naLabel)}</div>
      )}
    </div>
  )
}

function SelectField({ label, field, form, setForm, editing, options, numeric, naLabel, selectLabel }: {
  label: string; field: string; form: Record<string, unknown>; setForm: (f: Record<string, unknown>) => void; editing: boolean
  options: { value: string; label: string }[]; numeric?: boolean; naLabel: string; selectLabel: string
}) {
  const current = options.find((o) => o.value === String(form[field] ?? ''))
  return (
    <div className="col-sm-6">
      <label className="form-label text-muted small mb-0">{label}</label>
      {editing ? (
        <select
          className="form-select form-select-sm"
          value={String(form[field] ?? '')}
          onChange={(e) => setForm({ ...form, [field]: numeric ? Number(e.target.value) : e.target.value })}
        >
          <option value="" disabled>{selectLabel}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <div className="fw-semibold">{current?.label ?? naLabel}</div>
      )}
    </div>
  )
}

function CheckField({ label, field, form, setForm, editing, onCriticalChange }: {
  label: string; field: string; form: Record<string, unknown>; setForm: (f: Record<string, unknown>) => void; editing: boolean
  onCriticalChange?: (field: string, value: boolean) => void
}) {
  return (
    <div className="col-auto">
      <div className="form-check">
        <input
          className="form-check-input"
          type="checkbox"
          checked={Boolean(form[field])}
          onChange={(e) => onCriticalChange ? onCriticalChange(field, e.target.checked) : setForm({ ...form, [field]: e.target.checked })}
          disabled={!editing}
          id={field}
        />
        <label className="form-check-label" htmlFor={field}>{label}</label>
      </div>
    </div>
  )
}
