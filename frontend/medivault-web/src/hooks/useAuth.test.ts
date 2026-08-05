import { describe, it, expect, beforeEach } from 'vitest'
import { getUser, saveUser } from './useAuth'

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
})
