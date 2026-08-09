import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getUser, saveUser, logout } from './useAuth'

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getUser returns null when nothing is stored', () => {
    expect(getUser()).toBeNull()
  })

  it('saveUser persists the user and token, and getUser reads it back', () => {
    const user = { id: '1', name: 'Ana Silva', role: 'Patient' as const }

    saveUser(user, 'jwt-token')

    expect(getUser()).toEqual(user)
    expect(localStorage.getItem('token')).toBe('jwt-token')
  })

  describe('logout', () => {
    const originalLocation = window.location

    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, href: '' },
      })
    })

    afterEach(() => {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    })

    it('clears the stored user and token, and redirects to /login', () => {
      saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'jwt-token')

      logout()

      expect(getUser()).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
      expect(window.location.href).toBe('/login')
    })
  })
})
