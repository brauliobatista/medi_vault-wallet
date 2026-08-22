import { useEffect, useRef, useState } from 'react'
import Layout from '../../components/Layout'
import { getProfile, updateProfile, uploadProfilePhoto, deleteProfilePhoto } from '../../api/medical'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saved, setSaved] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
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
      setPhotoError('Não foi possível carregar a imagem. Use JPG, PNG ou WEBP até 5MB.')
    } finally {
      setPhotoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handlePhotoRemove = async () => {
    if (!confirm('Remover a foto de perfil?')) return
    await deleteProfilePhoto()
    const p = await getProfile()
    setProfile(p)
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
          <h5 className="mb-0 fw-semibold">Informações pessoais</h5>
          <button className="btn btn-outline-primary btn-sm" onClick={() => setEditing(!editing)}>
            <i className={`bi ${editing ? 'bi-x' : 'bi-pencil'} me-1`} />
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        </div>
        {saved && <div className="alert alert-success py-2">Guardado com sucesso.</div>}

        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body d-flex align-items-center gap-3 flex-wrap">
            {profile.photoUrl ? (
              <img
                src={String(profile.photoUrl)}
                alt="Foto de perfil"
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
                  : <><i className="bi bi-camera me-1" />{profile.photoUrl ? 'Alterar foto' : 'Adicionar foto'}</>}
              </button>
              {Boolean(profile.photoUrl) && (
                <button className="btn btn-outline-danger btn-sm" onClick={handlePhotoRemove}>
                  <i className="bi bi-trash me-1" />Remover
                </button>
              )}
              {photoError && <div className="text-danger small mt-1">{photoError}</div>}
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="row g-3">
              <Field label="Nº Utente" value={String(profile.utentNumber)} />
              <Field label="Nome" value={`${profile.firstName} ${profile.lastName}`} />
              <Field label="Data de Nascimento" value={String(profile.birthday)} />
              <Field label="Grupo Sanguíneo" value={String(profile.bloodType ?? '-')} />
              <Field label="Nacionalidade" value={String(profile.nationalityName ?? '-')} />
              <SelectField
                label="Sexo Biológico"
                field="biologicalGender"
                form={form}
                setForm={setForm}
                editing={editing}
                options={[
                  { value: 'M', label: 'Masculino' },
                  { value: 'F', label: 'Feminino' },
                ]}
              />
              <SelectField
                label="Género"
                field="sexId"
                form={form}
                setForm={setForm}
                editing={editing}
                numeric
                options={[
                  { value: '1', label: 'Masculino' },
                  { value: '2', label: 'Feminino' },
                  { value: '3', label: 'Outro' },
                ]}
              />
              <EditableField label="Email" field="email" form={form} setForm={setForm} editing={editing} />
              <EditableField label="Telefone" field="phone" form={form} setForm={setForm} editing={editing} />
              <EditableField label="Profissão" field="profession" form={form} setForm={setForm} editing={editing} />
              <div className="col-12">
                <div className="row g-2">
                  <CheckField label="Aceita transfusão" field="acceptsTransfusion" form={form} setForm={setForm} editing={editing} />
                  <CheckField label="Manobras de reanimação" field="acceptsResuscitation" form={form} setForm={setForm} editing={editing} />
                  <CheckField label="Acesso de emergência" field="emergencyAccess" form={form} setForm={setForm} editing={false} />
                </div>
              </div>
            </div>
            {editing && (
              <div className="mt-3">
                <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
              </div>
            )}
          </div>
        </div>
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

function EditableField({ label, field, form, setForm, editing }: {
  label: string; field: string; form: Record<string, unknown>; setForm: (f: Record<string, unknown>) => void; editing: boolean
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
        <div className="fw-semibold">{String(form[field] || '-')}</div>
      )}
    </div>
  )
}

function SelectField({ label, field, form, setForm, editing, options, numeric }: {
  label: string; field: string; form: Record<string, unknown>; setForm: (f: Record<string, unknown>) => void; editing: boolean
  options: { value: string; label: string }[]; numeric?: boolean
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
          <option value="" disabled>Selecionar…</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <div className="fw-semibold">{current?.label ?? '-'}</div>
      )}
    </div>
  )
}

function CheckField({ label, field, form, setForm, editing }: {
  label: string; field: string; form: Record<string, unknown>; setForm: (f: Record<string, unknown>) => void; editing: boolean
}) {
  return (
    <div className="col-auto">
      <div className="form-check">
        <input
          className="form-check-input"
          type="checkbox"
          checked={Boolean(form[field])}
          onChange={(e) => setForm({ ...form, [field]: e.target.checked })}
          disabled={!editing}
          id={field}
        />
        <label className="form-check-label" htmlFor={field}>{label}</label>
      </div>
    </div>
  )
}
