import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_URL,
})

// Uploaded files (profile photos, documents) are served by the API from its own
// root, outside the /api prefix. A stored path like "/uploads/profile-photos/x.jpg"
// only resolves against the frontend origin in local dev, where Vite proxies
// /uploads to the API; in production the SPA and the API live on different
// origins, so the path has to be resolved against the API origin explicitly or
// the browser fetches it from the SPA host and gets index.html back.
export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  const origin = API_URL.replace(/\/api\/?$/, '')
  return origin + (path.startsWith('/') ? path : `/${path}`)
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const isLoginRequest = (url?: string) =>
  !!url && (url.includes('/auth/patient/login') || url.includes('/auth/doctor/login'))

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !isLoginRequest(err.config?.url)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default api
