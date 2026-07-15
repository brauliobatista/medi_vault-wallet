import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { getUser } from '../../hooks/useAuth'

const sections = [
  { to: '/profile', icon: 'bi-person-fill', label: 'Perfil', color: 'primary' },
  { to: '/medical-history', icon: 'bi-clipboard2-pulse', label: 'Histórico Médico', color: 'danger' },
  { to: '/exams', icon: 'bi-activity', label: 'Exames (MCDTS)', color: 'warning' },
  { to: '/habits', icon: 'bi-heart', label: 'Hábitos de Saúde', color: 'success' },
  { to: '/vaccinations', icon: 'bi-shield-plus', label: 'Vacinação', color: 'info' },
  { to: '/access', icon: 'bi-key', label: 'Acessos de Médicos', color: 'secondary' },
]

export default function DashboardPage() {
  const user = getUser()

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h4 className="mb-1">Olá, {user?.name?.split(' ')[0]}</h4>
        <p className="text-muted mb-4">O que pretende consultar hoje?</p>
        <div className="row g-3">
          {sections.map((s) => (
            <div className="col-sm-6 col-md-4" key={s.to}>
              <Link to={s.to} className="text-decoration-none">
                <div className={`card h-100 border-${s.color} border-2`}>
                  <div className="card-body d-flex align-items-center gap-3">
                    <i className={`bi ${s.icon} text-${s.color}`} style={{ fontSize: 32 }} />
                    <span className="fw-semibold">{s.label}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
