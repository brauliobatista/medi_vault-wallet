import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import {
  getDoctorProfile, updateDoctorProfile, changeDoctorPassword,
  getInstitutionOptions, getSpecialtyOptions,
} from '../../api/medical'

interface InstitutionOption { id: string; name: string }
interface SpecialtyOption { id: number; name: string }
interface DoctorProfile {
  ordemMedicosId: string
  firstName: string
  lastName: string
  email: string
  speciality: string | null
  institutions: InstitutionOption[]
}

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [institutionOptions, setInstitutionOptions] = useState<InstitutionOption[]>([])
  const [specialtyOptions, setSpecialtyOptions] = useState<SpecialtyOption[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ email: '', speciality: '', institutionIds: [] as string[] })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwOk, setPwOk] = useState(false)

  const load = () => {
    Promise.all([getDoctorProfile(), getInstitutionOptions(), getSpecialtyOptions()])
      .then(([p, institutions, specialties]) => {
        setProfile(p)
        setInstitutionOptions(institutions)
        setSpecialtyOptions(specialties)
        setForm({
          email: p.email,
          speciality: p.speciality ?? '',
          institutionIds: (p.institutions as InstitutionOption[]).map((i) => i.id),
        })
      })
  }

  useEffect(load, [])

  const handleSave = async () => {
    await updateDoctorProfile({ email: form.email, speciality: form.speciality, institutionIds: form.institutionIds })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    load()
  }

  const handleInstitutionsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ids = Array.from(e.target.selectedOptions).map((o) => o.value)
    setForm({ ...form, institutionIds: ids })
  }

  const handlePassword = async () => {
    setPwError('')
    setPwOk(false)
    if (pwForm.next !== pwForm.confirm) { setPwError('As passwords não coincidem.'); return }
    if (pwForm.next.length < 6) { setPwError('A nova password deve ter pelo menos 6 caracteres.'); return }
    try {
      await changeDoctorPassword({ currentPassword: pwForm.current, newPassword: pwForm.next })
      setPwOk(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setShowPw(false)
    } catch {
      setPwError('Password atual incorreta.')
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
          <h5 className="mb-0 fw-semibold">Informações profissionais</h5>
          <button className="btn btn-outline-primary btn-sm" onClick={() => setEditing(!editing)}>
            <i className={`bi ${editing ? 'bi-x' : 'bi-pencil'} me-1`} />
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {saved && <div className="alert alert-success py-2">Guardado com sucesso.</div>}
        {pwOk && <div className="alert alert-success py-2">Password alterada com sucesso.</div>}

        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-sm-6">
                <div className="text-muted small">Nº Ordem dos Médicos</div>
                <div className="fw-semibold">{profile.ordemMedicosId}</div>
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">Nome</div>
                <div className="fw-semibold">{profile.firstName} {profile.lastName}</div>
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">Instituição</div>
                {editing ? (
                  <>
                    <select
                      multiple
                      className="form-select form-select-sm"
                      style={{ height: `${Math.min(institutionOptions.length, 5) * 28 + 8}px` }}
                      value={form.institutionIds}
                      onChange={handleInstitutionsChange}
                    >
                      {institutionOptions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <div className="form-text">Ctrl/Cmd + clique para selecionar mais do que uma.</div>
                  </>
                ) : profile.institutions.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {profile.institutions.map((i) => (
                      <span className="badge text-bg-light border" key={i.id}>
                        <i className="bi bi-hospital me-1 text-primary" />{i.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="fw-semibold">-</div>
                )}
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">Email</div>
                {editing ? (
                  <input className="form-control form-control-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                ) : (
                  <div className="fw-semibold">{profile.email}</div>
                )}
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">Especialidade</div>
                {editing ? (
                  <select className="form-select form-select-sm" value={form.speciality} onChange={(e) => setForm({ ...form, speciality: e.target.value })}>
                    <option value="">Selecionar…</option>
                    {specialtyOptions.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                ) : (
                  <div className="fw-semibold">{profile.speciality ?? '-'}</div>
                )}
              </div>
            </div>
            {editing && (
              <div className="mt-3">
                <button className="btn btn-primary btn-sm" onClick={handleSave}>Guardar</button>
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
            <span><i className="bi bi-lock me-2" />Alterar password</span>
            <i className={`bi bi-chevron-${showPw ? 'up' : 'down'}`} />
          </div>
          {showPw && (
            <div className="card-body">
              {pwError && <div className="alert alert-danger py-2">{pwError}</div>}
              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label small">Password atual</label>
                  <input type="password" className="form-control form-control-sm" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small">Nova password</label>
                  <input type="password" className="form-control form-control-sm" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small">Confirmar password</label>
                  <input type="password" className="form-control form-control-sm" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
                </div>
                <div className="col-12 mt-1">
                  <button className="btn btn-primary btn-sm" onClick={handlePassword}>Alterar password</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
