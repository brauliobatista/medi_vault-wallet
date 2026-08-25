import { useEffect, useRef, useState } from 'react'
import Layout from '../../components/Layout'
import LanguageSelector from '../../components/LanguageSelector'
import CameraCaptureModal from '../../components/CameraCaptureModal'
import { getDoctorProfile, updateDoctorProfile, changeDoctorPassword, uploadDoctorPhoto, deleteDoctorPhoto } from '../../api/medical'
import { updateUserPhoto } from '../../hooks/useAuth'
import { useTranslation } from '../../i18n/LanguageContext'
import { isLanguage, type Language } from '../../i18n/languages'

export default function DoctorProfilePage() {
  const { t } = useTranslation()
  const institutionTypeLabels: Record<string, string> = {
    hospital: t('doctorProfile.institutionTypeHospital'),
    clinic: t('doctorProfile.institutionTypeClinic'),
    lab: t('doctorProfile.institutionTypeLab'),
    pharmacy: t('doctorProfile.institutionTypePharmacy'),
    other: t('doctorProfile.institutionTypeOther'),
  }

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwOk, setPwOk] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getDoctorProfile().then((p) => {
      setProfile(p)
      setForm({ email: p.email, speciality: p.speciality ?? '' })
    })
  }, [])

  const handleSave = async () => {
    await updateDoctorProfile(form)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    const p = await getDoctorProfile()
    setProfile(p)
    setForm({ email: p.email, speciality: p.speciality ?? '' })
  }

  const handleLanguageSave = async (lang: Language) => {
    await updateDoctorProfile({ language: lang })
  }

  const uploadPhoto = async (file: File) => {
    setPhotoError(null)
    setPhotoUploading(true)
    try {
      const { photoUrl } = await uploadDoctorPhoto(file)
      const p = await getDoctorProfile()
      setProfile(p)
      updateUserPhoto(photoUrl)
    } catch {
      setPhotoError(t('profile.photoUploadError'))
    } finally {
      setPhotoUploading(false)
    }
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await uploadPhoto(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCameraCapture = async (file: File) => {
    setShowCamera(false)
    await uploadPhoto(file)
  }

  const handlePhotoRemove = async () => {
    if (!confirm(t('profile.confirmRemovePhoto'))) return
    await deleteDoctorPhoto()
    const p = await getDoctorProfile()
    setProfile(p)
    updateUserPhoto(null)
  }

  const handlePassword = async () => {
    setPwError('')
    setPwOk(false)
    if (pwForm.next !== pwForm.confirm) { setPwError(t('doctorProfile.passwordMismatch')); return }
    if (pwForm.next.length < 6) { setPwError(t('doctorProfile.passwordTooShort')); return }
    try {
      await changeDoctorPassword({ currentPassword: pwForm.current, newPassword: pwForm.next })
      setPwOk(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setShowPw(false)
    } catch {
      setPwError(t('doctorProfile.currentPasswordWrong'))
    }
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
      <div style={{ maxWidth: 680 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0 fw-semibold">{t('doctorProfile.professionalInfo')}</h5>
          <button className="btn btn-outline-primary btn-sm" onClick={() => setEditing(!editing)}>
            <i className={`bi ${editing ? 'bi-x' : 'bi-pencil'} me-1`} />
            {editing ? t('common.cancel') : t('common.edit')}
          </button>
        </div>

        {saved && <div className="alert alert-success py-2">{t('common.savedSuccess')}</div>}
        {pwOk && <div className="alert alert-success py-2">{t('doctorProfile.passwordChangedSuccess')}</div>}

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
            <div className="d-flex flex-column gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="d-none"
                onChange={handlePhotoSelect}
              />
              <div className="d-flex flex-wrap gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  disabled={photoUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoUploading
                    ? <span className="spinner-border spinner-border-sm" />
                    : <><i className="bi bi-upload me-1" />{t('profile.uploadFromDevice')}</>}
                </button>
                <button
                  className="btn btn-outline-primary btn-sm"
                  disabled={photoUploading}
                  onClick={() => setShowCamera(true)}
                >
                  <i className="bi bi-camera me-1" />{t('profile.useCamera')}
                </button>
                {Boolean(profile.photoUrl) && (
                  <button className="btn btn-outline-danger btn-sm" onClick={handlePhotoRemove}>
                    <i className="bi bi-trash me-1" />{t('profile.removePhoto')}
                  </button>
                )}
              </div>
              {photoError && <div className="text-danger small">{photoError}</div>}
            </div>
          </div>
        </div>

        {showCamera && (
          <CameraCaptureModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
        )}

        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-sm-6">
                <div className="text-muted small">{t('doctorProfile.ordemMedicosId')}</div>
                <div className="fw-semibold">{String(profile.ordemMedicosId)}</div>
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">{t('profile.name')}</div>
                <div className="fw-semibold">{String(profile.firstName)} {String(profile.lastName)}</div>
              </div>
              <div className="col-12">
                <div className="text-muted small">{t('doctorProfile.healthInstitution')}</div>
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <span className="fw-semibold">
                    <i className="bi bi-hospital me-1 text-primary" />
                    {String(profile.institutionName)}
                  </span>
                  {Boolean(profile.institutionType) && (
                    <span className="badge bg-light text-dark border">
                      {institutionTypeLabels[String(profile.institutionType)] ?? String(profile.institutionType)}
                    </span>
                  )}
                </div>
                {(Boolean(profile.institutionAddress) || Boolean(profile.institutionPhone)) && (
                  <div className="small text-muted mt-1">
                    {Boolean(profile.institutionAddress) && (
                      <span className="me-3">
                        <i className="bi bi-geo-alt me-1" />
                        {String(profile.institutionAddress)}
                      </span>
                    )}
                    {Boolean(profile.institutionPhone) && (
                      <span>
                        <i className="bi bi-telephone me-1" />
                        {String(profile.institutionPhone)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">{t('profile.email')}</div>
                {editing ? (
                  <input className="form-control form-control-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                ) : (
                  <div className="fw-semibold">{String(profile.email)}</div>
                )}
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">{t('doctorProfile.speciality')}</div>
                {editing ? (
                  <input className="form-control form-control-sm" value={form.speciality} onChange={(e) => setForm({ ...form, speciality: e.target.value })} />
                ) : (
                  <div className="fw-semibold">{String(profile.speciality ?? t('common.na'))}</div>
                )}
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">{t('profile.nationality')}</div>
                <div className="fw-semibold">{String(profile.nationalityName ?? t('common.na'))}</div>
              </div>
              <LanguageSelector value={(isLanguage(String(profile.language)) ? profile.language : 'pt') as Language} onSave={handleLanguageSave} />
            </div>
            {editing && (
              <div className="mt-3">
                <button className="btn btn-primary btn-sm" onClick={handleSave}>{t('common.save')}</button>
              </div>
            )}
          </div>
        </div>

        {/* Change password */}
        <div className="card border-0 shadow-sm">
          <div
            className="card-header bg-white d-flex justify-content-between align-items-center"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowPw(!showPw)}
          >
            <span><i className="bi bi-lock me-2" />{t('doctorProfile.changePassword')}</span>
            <i className={`bi bi-chevron-${showPw ? 'up' : 'down'}`} />
          </div>
          {showPw && (
            <div className="card-body">
              {pwError && <div className="alert alert-danger py-2">{pwError}</div>}
              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label small">{t('doctorProfile.currentPassword')}</label>
                  <input type="password" className="form-control form-control-sm" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small">{t('doctorProfile.newPassword')}</label>
                  <input type="password" className="form-control form-control-sm" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small">{t('doctorProfile.confirmPassword')}</label>
                  <input type="password" className="form-control form-control-sm" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
                </div>
                <div className="col-12 mt-1">
                  <button className="btn btn-primary btn-sm" onClick={handlePassword}>{t('doctorProfile.changePassword')}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
