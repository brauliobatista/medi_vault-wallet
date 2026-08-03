import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { getDoctorProfile, updateDoctorProfile, changeDoctorPassword } from '../../api/medical'

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwOk, setPwOk] = useState(false)

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
                <div className="fw-semibold">{String(profile.ordemMedicosId)}</div>
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">Nome</div>
                <div className="fw-semibold">{String(profile.firstName)} {String(profile.lastName)}</div>
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">Instituição</div>
                <div className="fw-semibold">
                  <i className="bi bi-hospital me-1 text-primary" />
                  {String(profile.institutionName)}
                </div>
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">Email</div>
                {editing ? (
                  <input className="form-control form-control-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                ) : (
                  <div className="fw-semibold">{String(profile.email)}</div>
                )}
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">Especialidade</div>
                {editing ? (
                  <input className="form-control form-control-sm" value={form.speciality} onChange={(e) => setForm({ ...form, speciality: e.target.value })} />
                ) : (
                  <div className="fw-semibold">{String(profile.speciality ?? '-')}</div>
                )}
              </div>
              <div className="col-sm-6">
                <div className="text-muted small">Nacionalidade</div>
                <div className="fw-semibold">{String(profile.nationalityName ?? '-')}</div>
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
