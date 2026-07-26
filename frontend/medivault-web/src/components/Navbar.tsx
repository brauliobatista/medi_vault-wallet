import { getUser, logout } from '../hooks/useAuth'

export default function Navbar() {
  const user = getUser()

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <a className="navbar-brand fw-bold" href={user?.role === 'Doctor' ? '/doctor' : '/dashboard'}>
          <i className="bi bi-heart-pulse me-2" />
          MediVault
        </a>
        {user && (
          <div className="d-flex align-items-center gap-3 ms-auto">
            <span className="text-white">
              <i className="bi bi-person-circle me-1" />
              {user.name}
              <span className="badge bg-light text-primary ms-2">{user.role}</span>
            </span>
            <button className="btn btn-outline-light btn-sm" onClick={logout}>
              <i className="bi bi-box-arrow-right me-1" />
              Sair
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
