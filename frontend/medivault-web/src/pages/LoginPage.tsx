import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { patientLogin, doctorLogin } from '../api/auth'
import { saveUser } from '../hooks/useAuth'

export default function LoginPage() {
  const [tab, setTab] = useState<'patient' | 'doctor'>('patient')
  const [utentNumber, setUtentNumber] = useState('')
  const [ordemId, setOrdemId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const switchTab = (next: 'patient' | 'doctor') => {
    setTab(next)
    setUtentNumber('')
    setOrdemId('')
    setPassword('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = tab === 'patient'
        ? await patientLogin(utentNumber, password)
        : await doctorLogin(ordemId, password)
      saveUser({ id: result.id, name: result.name, role: result.role }, result.token)
      navigate(result.role === 'Doctor' ? '/doctor' : '/dashboard')
    } catch {
      setError('Credenciais inválidas. Verifique e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <div className="text-center mb-4">
              <i className="bi bi-heart-pulse text-primary" style={{ fontSize: 48 }} />
              <h2 className="fw-bold text-primary mt-2">MediVault</h2>
              <p className="text-muted">A sua carteira de saúde digital</p>
            </div>
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <ul className="nav nav-tabs mb-4">
                  <li className="nav-item w-50">
                    <button
                      className={`nav-link w-100 ${tab === 'patient' ? 'active' : ''}`}
                      onClick={() => switchTab('patient')}
                    >
                      <i className="bi bi-person me-1" />Paciente
                    </button>
                  </li>
                  <li className="nav-item w-50">
                    <button
                      className={`nav-link w-100 ${tab === 'doctor' ? 'active' : ''}`}
                      onClick={() => switchTab('doctor')}
                    >
                      <i className="bi bi-hospital me-1" />Médico
                    </button>
                  </li>
                </ul>

                {error && <div className="alert alert-danger py-2">{error}</div>}

                <form onSubmit={handleSubmit}>
                  {tab === 'patient' ? (
                    <div className="mb-3">
                      <label className="form-label">Número de Utente</label>
                      <input
                        className="form-control"
                        value={utentNumber}
                        onChange={(e) => setUtentNumber(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="mb-3">
                      <label className="form-label">Nº Ordem dos Médicos</label>
                      <input
                        className="form-control"
                        value={ordemId}
                        onChange={(e) => setOrdemId(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                    {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                    Entrar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
