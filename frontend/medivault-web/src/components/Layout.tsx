import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AUTH_USER_UPDATED_EVENT, getUser, logout } from '../hooks/useAuth'
import { usePendingAccessRequests } from '../hooks/usePendingAccessRequests'
import { useTranslation } from '../i18n/LanguageContext'

interface NavItem {
  path: string
  label: string
  icon: string
  exact?: boolean
}

function getPatientNav(t: (key: string) => string): NavItem[] {
  return [
    { path: '/dashboard',       label: t('nav.dashboard'),       icon: 'bi-grid-1x2',        exact: true },
    { path: '/medical-history', label: t('nav.medicalHistory'),  icon: 'bi-clipboard2-pulse' },
    { path: '/exams',           label: t('nav.exams'),           icon: 'bi-activity' },
    { path: '/habits',          label: t('nav.habits'),          icon: 'bi-heart' },
    { path: '/vaccinations',    label: t('nav.vaccinations'),    icon: 'bi-shield-plus' },
    { path: '/access',          label: t('nav.access'),          icon: 'bi-key' },
    { path: '/family',          label: t('nav.family'),          icon: 'bi-people' },
    { path: '/profile',         label: t('nav.profile'),         icon: 'bi-heart-pulse' },
  ]
}

function getDoctorNav(t: (key: string) => string): NavItem[] {
  return [
    { path: '/doctor',          label: t('nav.consultation'),    icon: 'bi-qr-code-scan',    exact: true },
    { path: '/doctor/agendas',  label: t('nav.agendas'),         icon: 'bi-calendar-week' },
    { path: '/doctor/access',   label: t('nav.accessRequests'),  icon: 'bi-key' },
    { path: '/doctor/profile',  label: t('nav.doctorProfile'),   icon: 'bi-person-badge' },
  ]
}

function getPageInfo(t: (key: string) => string): Record<string, { title: string; subtitle: string; icon: string }> {
  return {
    '/dashboard':       { title: t('nav.dashboard'),      subtitle: t('page.dashboard.subtitle'),      icon: 'bi-grid-1x2' },
    '/profile':         { title: t('nav.profile'),        subtitle: t('page.profile.subtitle'),        icon: 'bi-heart-pulse' },
    '/medical-history': { title: t('nav.medicalHistory'), subtitle: t('page.medicalHistory.subtitle'), icon: 'bi-clipboard2-pulse' },
    '/exams':           { title: t('nav.exams'),          subtitle: t('page.exams.subtitle'),          icon: 'bi-activity' },
    '/habits':          { title: t('nav.habits'),         subtitle: t('page.habits.subtitle'),         icon: 'bi-heart' },
    '/vaccinations':    { title: t('nav.vaccinations'),   subtitle: t('page.vaccinations.subtitle'),   icon: 'bi-shield-plus' },
    '/access':          { title: t('nav.access'),         subtitle: t('page.access.subtitle'),         icon: 'bi-key' },
    '/family':          { title: t('nav.family'),         subtitle: t('page.family.subtitle'),         icon: 'bi-people' },
    '/doctor':          { title: t('nav.consultation'),   subtitle: t('page.consultation.subtitle'),   icon: 'bi-qr-code-scan' },
    '/doctor/agendas':  { title: t('nav.agendas'),        subtitle: t('page.agendas.subtitle'),        icon: 'bi-calendar-week' },
    '/doctor/patient':  { title: t('page.patientRecord.title'), subtitle: t('page.patientRecord.subtitle'), icon: 'bi-qr-code-scan' },
    '/doctor/profile':  { title: t('page.doctorProfile.title'), subtitle: t('page.doctorProfile.subtitle'), icon: 'bi-person-badge' },
    '/doctor/access':   { title: t('page.doctorAccess.title'),  subtitle: t('page.doctorAccess.subtitle'),  icon: 'bi-key' },
  }
}

interface Props { children: React.ReactNode }

export default function Layout({ children }: Props) {
  const { t } = useTranslation()
  const [user, setUser] = useState(getUser)
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const isDoctor = user?.role === 'Doctor'
  const navItems = isDoctor ? getDoctorNav(t) : getPatientNav(t)
  const pageInfo = getPageInfo(t)
  const { pendingRequests, count: pendingCount } = usePendingAccessRequests()

  useEffect(() => {
    const handleUserUpdated = () => setUser(getUser())
    window.addEventListener(AUTH_USER_UPDATED_EVENT, handleUserUpdated)
    return () => window.removeEventListener(AUTH_USER_UPDATED_EVENT, handleUserUpdated)
  }, [])

  const currentPath = location.pathname
  const info =
    pageInfo[currentPath] ??
    pageInfo[
      Object.keys(pageInfo)
        .filter((k) => currentPath.startsWith(k + '/'))
        .sort((a, b) => b.length - a.length)[0] ?? ''
    ] ??
    { title: t('app.name'), subtitle: '', icon: 'bi-heart-pulse' }

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
  const fallbackAvatarContent = isDoctor ? '👩‍⚕️' : initial
  const avatar = user?.photoUrl
    ? <img src={user.photoUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    : fallbackAvatarContent

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
            <div className="mv-logo-name">{t('app.name')}</div>
            <div className="mv-logo-sub">{t('app.tagline')}</div>
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
            <div className="mv-sidebar-avatar">{avatar}</div>
            <div>
              <div className="mv-user-name">{user?.name}</div>
              <div className="mv-user-role">{user?.role === 'Doctor' ? t('role.doctor') : t('role.patient')}</div>
            </div>
          </div>
          <button className="mv-logout-btn" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right" />
            <span>{t('sidebar.logout')}</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="mv-main">
        <header className="mv-topbar">
          {/* Hamburger — only visible on mobile */}
          <button className="mv-hamburger" onClick={() => setMenuOpen(true)} aria-label={t('sidebar.openMenu')}>
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
            {!isDoctor && (
              <div className="mv-notif">
                <button
                  className="mv-notif-btn"
                  onClick={() => setNotifOpen((o) => !o)}
                  aria-label={t('notif.aria')}
                >
                  <i className="bi bi-bell" />
                  {pendingCount > 0 && (
                    <span className="mv-notif-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div className="mv-notif-backdrop" onClick={() => setNotifOpen(false)} />
                    <div className="mv-notif-dropdown">
                      <div className="mv-notif-dropdown-header">{t('notif.title')}</div>
                      {pendingRequests.length === 0 ? (
                        <div className="mv-notif-empty">{t('notif.empty')}</div>
                      ) : (
                        pendingRequests.map((r) => (
                          <Link
                            key={r.id}
                            to="/access"
                            className="mv-notif-item"
                            onClick={() => setNotifOpen(false)}
                          >
                            <i className="bi bi-person-badge" />
                            <div>
                              <div className="mv-notif-item-title">{r.doctorName}</div>
                              <div className="mv-notif-item-sub">{t('notif.requestedOn', { date: r.requestedAt.slice(0, 10) })}</div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="mv-topbar-avatar">{avatar}</div>
            <span className="mv-topbar-name">{user?.name}</span>
            <span className={`badge ${isDoctor ? 'bg-success' : 'bg-primary'}`}>
              {user?.role === 'Doctor' ? t('role.doctor') : t('role.patient')}
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
