import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getUser, logout } from '../hooks/useAuth'

interface NavItem {
  path: string
  label: string
  icon: string
  exact?: boolean
}

const patientNav: NavItem[] = [
  { path: '/dashboard',       label: 'Dashboard',        icon: 'bi-grid-1x2',          exact: true },
  { path: '/profile',         label: 'Perfil de Saúde',  icon: 'bi-heart-pulse' },
  { path: '/medical-history', label: 'Histórico Médico', icon: 'bi-clipboard2-pulse' },
  { path: '/exams',           label: 'Exames',           icon: 'bi-activity' },
  { path: '/habits',          label: 'Hábitos de Saúde', icon: 'bi-heart' },
  { path: '/vaccinations',    label: 'Vacinas',          icon: 'bi-shield-plus' },
  { path: '/access',          label: 'Acessos',          icon: 'bi-key' },
]

const doctorNav: NavItem[] = [
  { path: '/doctor',          label: 'Dashboard',        icon: 'bi-house',              exact: true },
  { path: '/doctor/profile',  label: 'Perfil',           icon: 'bi-person-badge' },
  { path: '/doctor/access',   label: 'Pedidos de Acesso', icon: 'bi-key' },
]

const pageInfo: Record<string, { title: string; subtitle: string; icon: string }> = {
  '/dashboard':       { title: 'Dashboard',          subtitle: 'Visão geral da sua saúde',                           icon: 'bi-grid-1x2' },
  '/profile':         { title: 'Perfil de Saúde',    subtitle: 'As suas informações pessoais e médicas',              icon: 'bi-heart-pulse' },
  '/medical-history': { title: 'Histórico Médico',   subtitle: 'Cirurgias, medicação, alergias e historial familiar', icon: 'bi-clipboard2-pulse' },
  '/exams':           { title: 'Exames',              subtitle: 'Consulte e gira os seus exames MCDTS',                icon: 'bi-activity' },
  '/habits':          { title: 'Hábitos de Saúde',   subtitle: 'Estilos de vida e hábitos registados',                icon: 'bi-heart' },
  '/vaccinations':    { title: 'Vacinas',             subtitle: 'Registo do seu plano vacinal',                        icon: 'bi-shield-plus' },
  '/access':          { title: 'Acessos e Partilhas', subtitle: 'Gira quem tem acesso ao seu perfil',                 icon: 'bi-key' },
  '/doctor':          { title: 'Dashboard',           subtitle: 'Leia o QR code ou pesquise um utente por número',    icon: 'bi-house' },
  '/doctor/profile':  { title: 'Perfil do Médico',   subtitle: 'As suas informações profissionais',                   icon: 'bi-person-badge' },
  '/doctor/access':   { title: 'Pedidos de Acesso',  subtitle: 'Consulte e gira pedidos de acesso a utentes',         icon: 'bi-key' },
}

interface Props { children: React.ReactNode }

export default function Layout({ children }: Props) {
  const user = getUser()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const isDoctor = user?.role === 'Doctor'
  const navItems = isDoctor ? doctorNav : patientNav

  const currentPath = location.pathname
  const info =
    pageInfo[currentPath] ??
    pageInfo[Object.keys(pageInfo).find((k) => currentPath.startsWith(k + '/')) ?? ''] ??
    { title: 'MediVault', subtitle: '', icon: 'bi-heart-pulse' }

  const isActive = (item: NavItem) => {
    if (item.exact) return currentPath === item.path
    return currentPath === item.path || currentPath.startsWith(item.path + '/')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeMenu = () => setMenuOpen(false)

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U'
  const avatarContent = isDoctor ? '👩‍⚕️' : initial

  return (
    <div className="mv-wrapper">
      {/* Mobile overlay — click to close sidebar */}
      {menuOpen && <div className="mv-overlay" onClick={closeMenu} />}

      {/* ── Sidebar ── */}
      <aside className={`mv-sidebar${menuOpen ? ' open' : ''}`}>
        <div className="mv-logo">
          <div className="mv-logo-icon">
            <i className="bi bi-heart-pulse-fill" />
          </div>
          <div>
            <div className="mv-logo-name">MediVault</div>
            <div className="mv-logo-sub">O seu espaço de saúde.</div>
          </div>
        </div>

        <nav className="mv-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`mv-nav-item${isActive(item) ? ' active' : ''}`}
              onClick={closeMenu}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mv-sidebar-bottom">
          <div className="mv-user-card">
            <div className="mv-sidebar-avatar">{avatarContent}</div>
            <div>
              <div className="mv-user-name">{user?.name}</div>
              <div className="mv-user-role">{user?.role === 'Doctor' ? 'Médico' : 'Paciente'}</div>
            </div>
          </div>
          <button className="mv-logout-btn" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="mv-main">
        <header className="mv-topbar">
          {/* Hamburger — only visible on mobile */}
          <button className="mv-hamburger" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            <i className="bi bi-list" />
          </button>

          <div className="mv-topbar-left">
            <div className="mv-page-icon">
              <i className={`bi ${info.icon}`} />
            </div>
            <div>
              <h1 className="mv-page-title">{info.title}</h1>
              {info.subtitle && <p className="mv-page-subtitle">{info.subtitle}</p>}
            </div>
          </div>

          <div className="mv-topbar-right">
            <div className="mv-topbar-avatar">{avatarContent}</div>
            <span className="mv-topbar-name">{user?.name}</span>
            <span className={`badge ${isDoctor ? 'bg-success' : 'bg-primary'}`}>
              {user?.role === 'Doctor' ? 'Médico' : 'Paciente'}
            </span>
          </div>
        </header>

        <main className="mv-content">
          {children}
        </main>
      </div>
    </div>
  )
}
