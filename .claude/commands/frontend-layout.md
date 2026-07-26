# MediVault Frontend Layout Template

## Descrição
Layout padrão do MediVault: sidebar azul-marinho fixo + topbar branca + área de conteúdo cinzento claro. Suporta dois roles: `Patient` (7 itens de nav) e `Doctor` (3 itens de nav), detetados automaticamente pelo JWT.

---

## Ficheiros do template

### `src/components/Layout.tsx`

```tsx
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
  { path: '/doctor',          label: 'Dashboard',        icon: 'bi-house',             exact: true },
  { path: '/doctor/profile',  label: 'Perfil',           icon: 'bi-person-badge' },
  { path: '/doctor/access',   label: 'Pedidos de Acesso', icon: 'bi-key' },
]

const pageInfo: Record<string, { title: string; subtitle: string; icon: string }> = {
  '/dashboard':       { title: 'Dashboard',          subtitle: 'Visão geral da sua saúde',                          icon: 'bi-grid-1x2' },
  '/profile':         { title: 'Perfil de Saúde',    subtitle: 'As suas informações pessoais e médicas',             icon: 'bi-heart-pulse' },
  '/medical-history': { title: 'Histórico Médico',   subtitle: 'Cirurgias, medicação, alergias e historial familiar', icon: 'bi-clipboard2-pulse' },
  '/exams':           { title: 'Exames',              subtitle: 'Consulte e gira os seus exames MCDTS',               icon: 'bi-activity' },
  '/habits':          { title: 'Hábitos de Saúde',   subtitle: 'Estilos de vida e hábitos registados',               icon: 'bi-heart' },
  '/vaccinations':    { title: 'Vacinas',             subtitle: 'Registo do seu plano vacinal',                       icon: 'bi-shield-plus' },
  '/access':          { title: 'Acessos e Partilhas', subtitle: 'Gira quem tem acesso ao seu perfil',                icon: 'bi-key' },
  '/doctor':          { title: 'Dashboard',           subtitle: 'Visão geral e pesquisa de utentes',                  icon: 'bi-house' },
  '/doctor/profile':  { title: 'Perfil do Médico',   subtitle: 'As suas informações profissionais',                  icon: 'bi-person-badge' },
  '/doctor/access':   { title: 'Pedidos de Acesso',  subtitle: 'Consulte e gira pedidos de acesso a utentes',        icon: 'bi-key' },
}

interface Props { children: React.ReactNode }

export default function Layout({ children }: Props) {
  const user = getUser()
  const location = useLocation()
  const navigate = useNavigate()
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

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U'

  return (
    <div className="mv-wrapper">
      <aside className="mv-sidebar">
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
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mv-sidebar-bottom">
          <div className="mv-user-card">
            <div className="mv-sidebar-avatar">{initial}</div>
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

      <div className="mv-main">
        <header className="mv-topbar">
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
            <div className="mv-topbar-avatar">{initial}</div>
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
```

---

### `src/index.css` — classes do layout (adicionar ao ficheiro existente)

```css
body {
  margin: 0;
  background-color: #f1f5f9;
  font-family: system-ui, -apple-system, sans-serif;
}

.mv-wrapper {
  display: flex;
  min-height: 100vh;
}

.mv-sidebar {
  width: 220px;
  background: #0d1b2e;
  color: #c9d4e4;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 200;
  overflow-y: auto;
}

.mv-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}

.mv-logo-icon {
  width: 36px; height: 36px;
  background: #1d4ed8;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 1.1rem; flex-shrink: 0;
}

.mv-logo-name { font-size: 0.95rem; font-weight: 700; color: white; line-height: 1.2; }
.mv-logo-sub  { font-size: 0.68rem; color: #516480; line-height: 1.3; }

.mv-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex; flex-direction: column; gap: 1px;
}

.mv-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  color: #7d96b8;
  text-decoration: none;
  font-size: 0.83rem; font-weight: 500;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.mv-nav-item i { font-size: 1rem; width: 18px; text-align: center; flex-shrink: 0; }
.mv-nav-item:hover { background: rgba(255,255,255,0.07); color: #c9d4e4; text-decoration: none; }
.mv-nav-item.active { background: #1d4ed8; color: white; }

.mv-sidebar-bottom {
  padding: 14px 12px;
  border-top: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}

.mv-user-card { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }

.mv-sidebar-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: #1d4ed8; color: white;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 0.88rem; flex-shrink: 0;
}

.mv-user-name  { font-size: 0.82rem; font-weight: 600; color: white; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mv-user-role  { font-size: 0.68rem; color: #516480; }

.mv-logout-btn {
  width: 100%;
  background: rgba(255,255,255,0.05); border: none; color: #7d96b8;
  padding: 7px 12px; border-radius: 6px; font-size: 0.81rem;
  cursor: pointer; display: flex; align-items: center; gap: 8px;
  transition: background 0.12s, color 0.12s;
}
.mv-logout-btn:hover { background: rgba(239,68,68,0.15); color: #f87171; }

.mv-main {
  margin-left: 220px;
  min-height: 100vh;
  background: #f1f5f9;
  display: flex; flex-direction: column; flex: 1; min-width: 0;
}

.mv-topbar {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 14px 28px;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 100; flex-shrink: 0;
}

.mv-topbar-left  { display: flex; align-items: center; gap: 14px; }
.mv-topbar-right { display: flex; align-items: center; gap: 10px; }

.mv-page-icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: #eff6ff; color: #1d4ed8;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.25rem; flex-shrink: 0;
}

.mv-page-title    { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; line-height: 1.25; }
.mv-page-subtitle { font-size: 0.78rem; color: #64748b; margin: 0; }

.mv-topbar-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: #1d4ed8; color: white;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 0.88rem; flex-shrink: 0;
}

.mv-topbar-name { font-size: 0.88rem; font-weight: 500; color: #1e293b; }

.mv-content { padding: 24px 28px; flex: 1; }
```

---

## Como usar numa nova página

```tsx
import Layout from '../../components/Layout'

export default function MinhaPage() {
  return (
    <Layout>
      {/* conteúdo da página aqui */}
    </Layout>
  )
}
```

## Para adicionar uma nova rota ao sidebar

1. Adicionar o item a `patientNav` ou `doctorNav` em `Layout.tsx`
2. Adicionar a entrada correspondente em `pageInfo` (title, subtitle, icon)
3. Usar um ícone do Bootstrap Icons (`bi-*`)

## Dependências necessárias

```bash
npm install bootstrap bootstrap-icons react-router-dom
```

Em `main.tsx`:
```ts
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
```

## Design tokens

| Token | Valor |
|---|---|
| Sidebar background | `#0d1b2e` |
| Sidebar active item | `#1d4ed8` |
| Sidebar text inactive | `#7d96b8` |
| Topbar background | `white` |
| Content background | `#f1f5f9` |
| Sidebar width | `220px` |

---

## Responsivo — Mobile (< 768px)

- Sidebar escondida por defeito (`translateX(-100%)`)
- Botão hamburger (`bi-list`) aparece na topbar
- Ao clicar: sidebar desliza para dentro + overlay escuro cobre o fundo
- Clicar no overlay ou num item de navegação fecha o menu
- `.mv-overlay` só é renderizado no DOM quando `menuOpen === true`
- `margin-left: 0` no `.mv-main` em mobile
- Subtitle da página e nome do utilizador na topbar são ocultados em mobile para poupar espaço

```css
@media (max-width: 767px) {
  .mv-sidebar { transform: translateX(-100%); transition: transform 0.25s ease; }
  .mv-sidebar.open { transform: translateX(0); }
  .mv-overlay { display: block; }
  .mv-main { margin-left: 0; }
  .mv-hamburger { display: block; }
  .mv-page-subtitle { display: none; }
  .mv-topbar-name { display: none; }
  .mv-content { padding: 16px; }
}
```
