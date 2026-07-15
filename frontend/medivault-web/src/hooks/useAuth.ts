export interface AuthUser {
  id: number
  name: string
  role: 'Patient' | 'Doctor'
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}

export function saveUser(user: AuthUser, token: string) {
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('token', token)
}

export function logout() {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  window.location.href = '/login'
}
