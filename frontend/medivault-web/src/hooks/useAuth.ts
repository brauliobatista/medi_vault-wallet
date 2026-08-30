export interface AuthUser {
  id: string
  name: string
  role: 'Patient' | 'Doctor'
  photoUrl?: string | null
}

// Fired whenever the stored user (e.g. its photo) changes, so components
// like Layout that read it outside of React state can re-render.
export const AUTH_USER_UPDATED_EVENT = 'auth-user-updated'

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}

export function saveUser(user: AuthUser, token: string) {
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('token', token)
  window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT))
}

export function updateUserPhoto(photoUrl: string | null) {
  const current = getUser()
  if (!current) return
  localStorage.setItem('user', JSON.stringify({ ...current, photoUrl }))
  window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT))
}

export function logout() {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  window.location.href = '/login'
}
