import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { getProfile, updateProfile } from '../../api/medical'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saved, setSaved] = useState(false)

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
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="row g-3">
              <Field label="Nº Utente" value={String(profile.utentNumber)} />
              <Field label="Nome" value={`${profile.firstName} ${profile.lastName}`} />
              <Field label="Data de Nascimento" value={String(profile.birthday)} />
              <Field label="Grupo Sanguíneo" value={String(profile.bloodType ?? '-')} />
              <Field label="Sexo Biológico" value={String(profile.sexGenderDescription ?? '-')} />
              <Field label="Nacionalidade" value={String(profile.nationalityName ?? '-')} />
              <EditableField label="Email" field="email" form={form} setForm={setForm} editing={editing} />
              <EditableField label="Telefone" field="phone" form={form} setForm={setForm} editing={editing} />
              <EditableField label="Profissão" field="profession" form={form} setForm={setForm} editing={editing} />
              <div className="col-12">
                <div className="row g-2">
                  <CheckField label="Aceita transfusão" field="acceptsTransfusion" form={form} setForm={setForm} editing={editing} />
                  <CheckField label="Manobras de reanimação" field="acceptsResuscitation" form={form} setForm={setForm} editing={editing} />
                  <CheckField label="Acesso de emergência" field="emergencyAccess" form={form} setForm={setForm} editing={editing} />
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
