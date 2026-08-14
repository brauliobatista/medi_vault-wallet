import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import api from './client'

// axios doesn't expose interceptors for direct invocation, but each registered
// interceptor is reachable via the (undocumented but stable) `.handlers` array,
// so we can exercise the real fulfilled/rejected logic without a live server.
function getRequestInterceptor() {
  return (api.interceptors.request as unknown as { handlers: Array<{ fulfilled: (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig }> }).handlers[0]
}
function getResponseInterceptor() {
  return (api.interceptors.response as unknown as {
    handlers: Array<{ fulfilled: (r: unknown) => unknown; rejected: (e: AxiosError) => Promise<never> }>
  }).handlers[0]
}

describe('api client', () => {
  const originalLocation = window.location

  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('adds an Authorization header when a token is stored', () => {
    localStorage.setItem('token', 'my-jwt')
    const config = getRequestInterceptor().fulfilled({ headers: {} } as InternalAxiosRequestConfig)

    expect(config.headers.Authorization).toBe('Bearer my-jwt')
  })

  it('does not add an Authorization header when there is no token', () => {
    const config = getRequestInterceptor().fulfilled({ headers: {} } as InternalAxiosRequestConfig)

    expect(config.headers.Authorization).toBeUndefined()
  })

  it('clears session and redirects to /login on a 401 from a non-login request', async () => {
    localStorage.setItem('token', 'stale-token')
    localStorage.setItem('user', '{"id":"1"}')
    const error = {
      response: { status: 401 },
      config: { url: '/users/me' },
    } as AxiosError

    await expect(getResponseInterceptor().rejected(error)).rejects.toBe(error)

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('does not clear session on a 401 from the login endpoint itself', async () => {
    localStorage.setItem('token', 'stale-token')
    const error = {
      response: { status: 401 },
      config: { url: '/auth/patient/login' },
    } as AxiosError

    await expect(getResponseInterceptor().rejected(error)).rejects.toBe(error)

    expect(localStorage.getItem('token')).toBe('stale-token')
    expect(window.location.href).toBe('')
  })

  it('does not touch session state for non-401 errors', async () => {
    localStorage.setItem('token', 'valid-token')
    const error = {
      response: { status: 500 },
      config: { url: '/users/me' },
    } as AxiosError

    await expect(getResponseInterceptor().rejected(error)).rejects.toBe(error)

    expect(localStorage.getItem('token')).toBe('valid-token')
    expect(window.location.href).toBe('')
  })
})
