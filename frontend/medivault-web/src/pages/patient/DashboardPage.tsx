import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import { getUser } from '../../hooks/useAuth'
import { usePendingAccessRequests } from '../../hooks/usePendingAccessRequests'

const sections = [
  { to: '/profile',         icon: 'bi-person-fill',       label: 'Perfil de Saúde',    color: 'primary' },
  { to: '/medical-history', icon: 'bi-clipboard2-pulse',  label: 'Histórico Médico',   color: 'danger' },
  { to: '/exams',           icon: 'bi-activity',          label: 'Exames (MCDTS)',     color: 'warning' },
  { to: '/habits',          icon: 'bi-heart',             label: 'Hábitos de Saúde',  color: 'success' },
  { to: '/vaccinations',    icon: 'bi-shield-plus',       label: 'Vacinação',          color: 'info' },
  { to: '/access',          icon: 'bi-key',               label: 'Acessos de Médicos', color: 'secondary' },
]

export default function DashboardPage() {
  const user = getUser()
  const { count: pendingCount } = usePendingAccessRequests()

  return (
    <Layout>
      <div className="mb-4">
        <h4 className="fw-bold text-dark mb-1">Olá, {user?.name?.split(' ')[0]} 👋</h4>
        <p className="text-muted mb-0">O que pretende consultar hoje?</p>
      </div>
      {pendingCount > 0 && (
        <div className="alert alert-primary d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4" role="alert">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-bell-fill" />
            <span>
              Tem <strong>{pendingCount}</strong>{' '}
              {pendingCount === 1 ? 'pedido de acesso pendente de um médico' : 'pedidos de acesso pendentes de médicos'}.
            </span>
          </div>
          <Link to="/access" className="btn btn-primary btn-sm">
            Ver pedidos
          </Link>
        </div>
      )}
      <div className="row g-3">
        {sections.map((s) => (
          <div className="col-sm-6 col-lg-4" key={s.to}>
            <Link to={s.to} className="text-decoration-none">
              <div className={`card h-100 border-0 shadow-sm`} style={{ borderLeft: `4px solid var(--bs-${s.color})` }}>
                <div className="card-body d-flex align-items-center gap-3 py-3">
                  <div
                    className={`d-flex align-items-center justify-content-center rounded-3 flex-shrink-0`}
                    style={{ width: 42, height: 42, background: `var(--bs-${s.color}-bg-subtle, #f0f0f0)` }}
                  >
                    <i className={`bi ${s.icon} text-${s.color}`} style={{ fontSize: 20 }} />
                  </div>
                  <span className="fw-semibold text-dark">{s.label}</span>
                  <i className="bi bi-chevron-right ms-auto text-muted" />
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </Layout>
  )
}
